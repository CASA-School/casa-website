// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * `next/server` reads the AsyncLocalStorage global that Next's own server
 * installs at boot; outside it, the first NextResponse throws an invariant.
 */
await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import('node:async_hooks');
  (globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage = AsyncLocalStorage;
});

import { NextRequest, NextResponse } from 'next/server';
import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination';

/*
 * next-intl's ESM build imports `next/server` without an extension, which
 * Node's resolver refuses outside Next's bundler. The language step is not
 * what this file tests, so it hands every request straight on.
 */
vi.mock('next-intl/middleware', () => ({ default: () => () => NextResponse.next() }));

import { config, proxy } from '@/proxy';

import nextConfig from '../../../../next.config';

/**
 * The rule that keeps the workspace off the marketing domain, and the checks
 * behind it.
 *
 * `proxy()` is called directly with a NextRequest carrying a Host header, and
 * the matcher is compiled the way Next compiles it — so a path the proxy never
 * sees fails here, not only on a deployed revision. Two properties are also
 * asserted against the source, because they would be dangerous to lose:
 *
 * 1. The public-host block exists and is closed in production. Without it,
 *    `casa-bremen.de/admin/sign-in` is a login form on the domain every
 *    prospective learner visits.
 * 2. It fails CLOSED. The flag that reopens it must be opt-in, so a missing or
 *    misspelled environment variable leaves the workspace hidden rather than
 *    exposed.
 */
function readProxy() {
  return readFileSync(path.resolve(process.cwd(), 'src/proxy.ts'), 'utf8');
}

const request = (url: string, host = new URL(url).host) =>
  proxy(new NextRequest(url, { headers: { host } }));

/** The matcher as Next compiles it, so the test sees what the build sees. */
async function compiledMatchers(): Promise<RegExp[]> {
  const { getMiddlewareMatchers } = (await import(
    'next/dist/build/analysis/get-page-static-info'
  )) as unknown as {
    getMiddlewareMatchers: (matcher: unknown, nextConfig: object) => { regexp: string }[];
  };
  return getMiddlewareMatchers(config.matcher, {}).map((m) => new RegExp(m.regexp));
}

describe('workspace host routing', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CASA_ALLOW_ADMIN_ON_PUBLIC_HOST', '');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('still guards /admin on a non-admin host', () => {
    const source = readProxy();

    expect(source).toContain('allowWorkspaceOnPublicHost');
    expect(source).toContain('WORKSPACE_PREFIX');
    // A 404, not a 403: a 403 confirms something is there.
    expect(source).toMatch(/status:\s*404/);
  });

  it('fails closed in production', () => {
    const source = readProxy();

    // The default branch must test for production and deny, not allow.
    expect(source).toMatch(/return process\.env\.NODE_ENV !== 'production';/);
  });

  it('answers the workspace with a 404 on the public host, dotted paths included', () => {
    for (const pathname of ['/admin', '/admin/sign-in', '/admin/enquiries/x.y', '/admin/people/a.b']) {
      const response = request(`https://casa-bremen.de${pathname}`);
      expect(response.status, pathname).toBe(404);
      // The path under /de, as for any unknown German path: a fixed target
      // would be a marker in the header that only the hidden workspace carries.
      const target = response.headers.get('x-middleware-rewrite');
      expect(target, pathname).toBe(`https://casa-bremen.de/de${pathname}`);
      expect(target, pathname).not.toContain('_casa-not-found');
    }
    expect(readProxy()).not.toContain('_casa-not-found');
  });

  it('runs for every /admin path, including one whose last segment has a dot', async () => {
    // The file exclusion in the first matcher entry skipped these, so the
    // proxy never saw them and the workspace answered on the public host.
    const matchers = await compiledMatchers();
    const runs = (pathname: string) => matchers.some((matcher) => matcher.test(pathname));

    for (const pathname of ['/admin', '/admin/sign-in', '/admin/enquiries/foo.x', '/admin/applications/x.y/cv']) {
      expect(runs(pathname), pathname).toBe(true);
    }
    // And still not for the marketing site's static files.
    for (const pathname of ['/_next/static/chunks/app.js', '/robots.txt', '/favicon.ico']) {
      expect(runs(pathname), pathname).toBe(false);
    }
  });

  it('rewrites the admin host onto the workspace tree rather than redirecting', () => {
    const source = readProxy();

    // A redirect would put `/admin` in the address bar of every workspace page
    // on admin.casa-bremen.de.
    expect(source).toContain('NextResponse.rewrite');
    expect(source).toContain('admin.casa-bremen.de');

    const response = request('https://admin.casa-bremen.de/enquiries');
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://admin.casa-bremen.de/admin/enquiries'
    );
  });

  it('sends www to the apex, permanently, with path and query', () => {
    for (const [url, location] of [
      ['https://www.casa-bremen.de/', 'https://casa-bremen.de/'],
      ['https://www.casa-bremen.de/kontakt?utm_source=ads', 'https://casa-bremen.de/kontakt?utm_source=ads'],
      ['https://www.casa-bremen.de/en/courses', 'https://casa-bremen.de/en/courses'],
      // Before the workspace rule: the apex then answers /admin with its 404.
      ['https://www.casa-bremen.de/admin/sign-in', 'https://casa-bremen.de/admin/sign-in'],
    ]) {
      const response = request(url, 'WWW.casa-bremen.de:443');
      expect(response.status, url).toBe(308);
      expect(response.headers.get('location'), url).toBe(location);
    }

    expect(request('https://casa-bremen.de/').status).not.toBe(308);
    expect(request('https://admin.casa-bremen.de/').status).not.toBe(308);
  });

  it('gives the health probe no language', () => {
    const response = request('https://casa-bremen.de/api/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('exports `proxy`, the convention Next 16.3 expects', () => {
    // `middleware` still works but warns on every dev boot, and the warning
    // trains people to ignore boot output.
    expect(readProxy()).toContain('export function proxy(');
  });
});

describe('response headers', () => {
  const rules = async () => (await nextConfig.headers?.()) ?? [];

  it('sends the security headers on every path', async () => {
    const all = (await rules()).find((rule) => rule.source === '/:path*' && !rule.missing);
    const headers = Object.fromEntries((all?.headers ?? []).map((h) => [h.key, h.value]));

    expect(headers).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'",
      'Strict-Transport-Security': 'max-age=31536000',
    });
    // Not until every casa-bremen.de subdomain is known to serve HTTPS.
    expect(headers['Strict-Transport-Security']).not.toContain('includeSubDomains');
    expect(headers['Permissions-Policy']).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\).*payment=\(\)/);
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('marks every host but the production site noindex, the way Next matches hosts', async () => {
    const noindex = (await rules()).find((rule) =>
      rule.headers.some((h) => h.key === 'X-Robots-Tag')
    );
    expect(noindex?.headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]);

    // matchHas is what Next's router runs for a `has`/`missing` condition: it
    // strips the port, lower-cases, and anchors the value as ^(…)$.
    const applies = (host: string) =>
      matchHas({ headers: { host } } as never, {}, noindex?.has, noindex?.missing) !== false;

    for (const host of ['casa-bremen.de', 'www.casa-bremen.de', 'CASA-Bremen.de:443']) {
      expect(applies(host), host).toBe(false);
    }
    for (const host of [
      'admin.casa-bremen.de',
      'ca-casa-website.livelycliff-6187a034.germanywestcentral.azurecontainerapps.io',
      'localhost:3000',
      'test.casa-bremen.de',
      'casa-bremen.de.example.com',
      'xcasa-bremen.de',
    ]) {
      expect(applies(host), host).toBe(true);
    }
  });
});

describe('workspace auth gate', () => {
  const ADMIN_APP = path.resolve(process.cwd(), 'src/app/(admin)/admin');

  const gate = () => readFileSync(path.join(ADMIN_APP, '(workspace)/layout.tsx'), 'utf8');

  /** Every source file under the workspace tree, relative to src/app/(admin)/admin. */
  const workspaceFiles = () =>
    (readdirSync(ADMIN_APP, { recursive: true }) as string[])
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
      .sort();

  it('redirects an unauthenticated request from the layout every screen shares', () => {
    const source = gate();

    expect(source).toContain('getStaffUser');
    expect(source).toMatch(/if\s*\(!user\)\s*\{\s*redirect\('\/admin\/sign-in'\)/);
  });

  it('refuses to run against fixtures', () => {
    // An empty queue and an unreachable database look identical, and one of
    // them means a lead is being lost right now.
    expect(gate()).toContain('isWorkspaceDatabaseConfigured');
  });

  it('answers an unknown screen behind the gate, not from the public site', () => {
    // Without a workspace catch-all, the site's [locale]/[...rest] took
    // `admin` for a language. The only catch-all sits in (workspace), so the
    // layout redirects a signed-out request before anything 404s.
    const catchAlls = workspaceFiles().filter((file) => file.includes('[...'));
    expect(catchAlls).toEqual([path.join('(workspace)', '[...rest]', 'page.tsx')]);
    expect(readFileSync(path.join(ADMIN_APP, catchAlls[0]), 'utf8')).toMatch(/notFound\(\);/);
  });

  it('checks access inside every mutation, first, at the level it needs', () => {
    // A server action is a public endpoint; the layout that rendered the form
    // is not in its request path. Every action file in the workspace is found
    // by its directive, not listed by hand, so a new one cannot be missed.
    // Each exported action resolves the actor through the module guard before
    // it awaits anything else, and one that destroys asks for `full`.
    const files = workspaceFiles().filter((file) =>
      /^['"]use server['"];?\s*$/m.test(readFileSync(path.join(ADMIN_APP, file), 'utf8'))
    );

    expect(files).toContain(path.join('(focus)', 'kursplanung', 'actions.ts'));
    expect(files).toContain(path.join('(workspace)', 'actions.ts'));

    /*
     * Deleting a day-board task needs only `edit`: the board is the team's
     * shared surface (day-board/actions.ts), and the delete still goes
     * through the confirmation.
     */
    const DESTRUCTIVE_AT_EDIT = new Set(['deleteDayTaskAction']);

    for (const file of files) {
      const source = readFileSync(path.join(ADMIN_APP, file), 'utf8');
      const declarations = [...source.matchAll(/export async function (\w+)\(/g)];
      expect(declarations.length, file).toBeGreaterThan(0);

      for (const [index, declaration] of declarations.entries()) {
        const name = declaration[1];
        const body = source.slice(declaration.index, declarations[index + 1]?.index ?? source.length);
        const firstAwait = /await\s+([\w.]+)\(\s*([^)]*)\)/.exec(body);

        expect(
          firstAwait?.[1],
          `${file}: ${name} must await requireModule() or requireManager() before anything else`
        ).toMatch(/^(requireModule|requireManager)$/);

        if (/^(delete|remove|void|cancel)/.test(name) && !DESTRUCTIVE_AT_EDIT.has(name)) {
          const level = firstAwait?.[1] === 'requireManager' ? "'full'" : firstAwait?.[2].split(',')[1]?.trim();
          expect(level, `${file}: ${name} destroys, so it must ask for 'full'`).toBe("'full'");
        }
      }
    }
  });

  it('holds the Team actions to the owner/admin module', () => {
    const team = readFileSync(path.join(ADMIN_APP, '(workspace)/team/actions.ts'), 'utf8');
    expect(team).toContain("const requireManager = () => requireModule('team', 'full');");
  });

  it('keeps inline actions to signing in and out', () => {
    // An action declared inside a component is as public as one in an action
    // file. The only three are the sign-in form, which must be reachable
    // signed out, and the two shells' sign-out buttons.
    const inline = workspaceFiles().filter((file) =>
      /^\s+['"]use server['"];?\s*$/m.test(readFileSync(path.join(ADMIN_APP, file), 'utf8'))
    );

    expect(inline).toEqual(
      [
        path.join('(focus)', 'layout.tsx'),
        path.join('(workspace)', 'layout.tsx'),
        path.join('sign-in', 'page.tsx'),
      ].sort()
    );
  });

  it('gates every module directory with a layout', () => {
    // The sidebar hides links; the layout is what refuses the request. Paths
    // are listed explicitly because a module's directory is not always its
    // name — `rooms` lives under Settings, since it is setup rather than
    // daily work, and Kursplanung has its own focus-mode shell.
    const gates: readonly [string, string][] = [
      ['enquiries', '(workspace)/enquiries'],
      ['registrations', '(workspace)/registrations'],
      ['placement', '(workspace)/placement'],
      ['applications', '(workspace)/applications'],
      ['people', '(workspace)/people'],
      ['bookings', '(workspace)/bookings'],
      ['rooms', '(workspace)/settings/rooms'],
      ['catalogue', '(workspace)/catalogue'],
      ['activity', '(workspace)/activity'],
      ['team', '(workspace)/team'],
      ['kursplanung', '(focus)/kursplanung'],
    ];

    for (const [module, dir] of gates) {
      const layout = readFileSync(path.join(ADMIN_APP, dir, 'layout.tsx'), 'utf8');
      expect(layout, dir).toContain(`requireModule('${module}')`);
    }
  });

  it('checks the session and the Applications module in the CV download route', () => {
    // A route handler is not a child of any layout, so neither gate applies
    // to it — without its own checks the URL serves CVs to strangers, or to
    // colleagues who do not hold the module (route.test.ts next to it runs it).
    const route = readFileSync(
      path.join(ADMIN_APP, '(workspace)/applications/[id]/cv/route.ts'),
      'utf8'
    );

    expect(route).toContain('getStaffUser');
    expect(route).toContain("redirect('/admin/sign-in')");
    expect(route).toMatch(/if \(!canAccess\(user, 'applications', 'view'\)\) \{\s*return new Response\('Not found', \{ status: 404 \}\);/);
    // The module check comes before the file is read.
    expect(route.indexOf("canAccess(user, 'applications'")).toBeLessThan(
      route.indexOf('getApplicationFile(id)')
    );
    // And must never honour the uploader's own MIME type.
    expect(route).toContain('application/octet-stream');
    expect(route).toContain('attachment;');
    expect(route).toContain('nosniff');
  });
});
