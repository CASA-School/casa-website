import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The rule that keeps the workspace off the marketing domain.
 *
 * `src/proxy.ts` cannot be imported here — it pulls in `next/server`, which
 * needs a request context this environment does not have. So this asserts the
 * two properties that would actually be dangerous to lose, against the source:
 *
 * 1. The public-host block exists and is closed in production. Without it,
 *    `casa-bremen.de/admin/sign-in` is a login form on the domain every
 *    prospective learner visits.
 * 2. It fails CLOSED. The flag that reopens it must be opt-in, so a missing or
 *    misspelled environment variable leaves the workspace hidden rather than
 *    exposed.
 *
 * A behavioural test would be better and belongs in `e2e/`, where a real
 * request with a Host header can be made against a production build.
 */
function readProxy() {
  return readFileSync(path.resolve(process.cwd(), 'src/proxy.ts'), 'utf8');
}

describe('workspace host routing', () => {
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

  it('rewrites the admin host onto the workspace tree rather than redirecting', () => {
    const source = readProxy();

    // A redirect would put `/admin` in the address bar of every workspace page
    // on admin.casa-bremen.de.
    expect(source).toContain('NextResponse.rewrite');
    expect(source).toContain('admin.casa-bremen.de');
  });

  it('exports `proxy`, the convention Next 16.3 expects', () => {
    // `middleware` still works but warns on every dev boot, and the warning
    // trains people to ignore boot output.
    expect(readProxy()).toContain('export function proxy(');
  });
});

describe('workspace auth gate', () => {
  const gate = () =>
    readFileSync(
      path.resolve(process.cwd(), 'src/app/(admin)/admin/(workspace)/layout.tsx'),
      'utf8'
    );

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

  it('checks access inside every mutation, not only in the layout', () => {
    // A server action is a public endpoint; the layout that rendered the form
    // is not in its request path. Every action file in the workspace is held
    // to the same rule: each exported action resolves the actor through the
    // module guard before it does anything else.
    const files = [
      'src/app/(admin)/admin/(workspace)/actions.ts',
      'src/app/(admin)/admin/(workspace)/team/actions.ts',
      'src/app/(admin)/admin/(workspace)/planning/actions.ts',
      'src/app/(admin)/admin/(workspace)/people/actions.ts',
      'src/app/(admin)/admin/(workspace)/bookings/actions.ts',
      'src/app/(admin)/admin/(workspace)/day-board/actions.ts',
      'src/app/(admin)/admin/(workspace)/settings/setup/actions.ts',
    ];

    for (const file of files) {
      const actions = readFileSync(path.resolve(process.cwd(), file), 'utf8');
      const exported = actions.match(/export async function \w+Action/g) ?? [];
      expect(exported.length, file).toBeGreaterThan(0);

      for (const declaration of exported) {
        const start = actions.indexOf(declaration);
        const body = actions.slice(start, start + 500);
        expect(
          body,
          `${file}: ${declaration} must call requireModule() or requireManager()`
        ).toMatch(/requireModule\(|requireManager\(/);
      }
    }
  });

  it('gates every module directory with a layout', () => {
    // The sidebar hides links; the layout is what refuses the request.
    const modules = [
      'enquiries',
      'registrations',
      'placement',
      'applications',
      'people',
      'bookings',
      'planning',
      'catalogue',
      'activity',
      'team',
    ];
    for (const name of modules) {
      const layout = readFileSync(
        path.resolve(process.cwd(), `src/app/(admin)/admin/(workspace)/${name}/layout.tsx`),
        'utf8'
      );
      expect(layout, name).toContain(`requireModule('${name}')`);
    }
  });

  it('checks the session in the CV download route', () => {
    // A route handler is not a child of the layout, so the gate does not apply
    // to it — without its own check the URL serves strangers' CVs.
    const route = readFileSync(
      path.resolve(
        process.cwd(),
        'src/app/(admin)/admin/(workspace)/applications/[id]/cv/route.ts'
      ),
      'utf8'
    );

    expect(route).toContain('getStaffUser');
    expect(route).toContain("redirect('/admin/sign-in')");
    // And must never honour the uploader's own MIME type.
    expect(route).toContain('application/octet-stream');
    expect(route).toContain('attachment;');
    expect(route).toContain('nosniff');
  });
});
