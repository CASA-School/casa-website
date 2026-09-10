import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { isNonLocalizedPath, toInternalPath, toPublicPath } from '@/i18n/pathnames';
import { defaultLocale, locales } from '@/i18n/routing';

/**
 * Host routing for the staff workspace, then language routing for the site.
 *
 * The workspace answers on `admin.casa-bremen.de`; the marketing site answers
 * on `casa-bremen.de`. They are one Next application and one container — one
 * build, one image, one set of design tokens — so the split is made here
 * rather than by deploying twice.
 *
 * TWO RULES, AND THE SECOND IS THE IMPORTANT ONE.
 *
 * 1. On the admin host, `/` maps to `/admin` and every path is served from the
 *    workspace tree. A rewrite, not a redirect: the browser stays on
 *    `admin.casa-bremen.de/enquiries` and never sees `/admin` in the URL.
 *
 * 2. On the public host, `/admin/*` does not exist in production. This is the
 *    rule that matters — without it, `casa-bremen.de/admin/sign-in` is a login
 *    form on the marketing domain, and the workspace's whole attack surface is
 *    reachable from the site every prospective learner visits. It 404s, exactly
 *    as it would if the routes were not in the build.
 *
 * Local development is exempt from rule 2, because there is no
 * `admin.localhost` to develop against by default and requiring one would mean
 * editing /etc/hosts to open the dashboard. `localhost:3000/admin` works.
 *
 * NOT AUTHENTICATION. This decides which host serves which tree. The auth gate
 * is `src/app/(admin)/admin/(workspace)/layout.tsx`, plus the check at the top
 * of every server action — this file runs before a request reaches the app,
 * with no database connection, and cannot verify a session against
 * `staff_sessions`.
 *
 * THE LANGUAGE IS IN THE URL (2026-09-10). German is the language of the
 * domain and lives at the root under the paths casa-bremen.de has always used;
 * English lives under /en. src/i18n/pathnames.ts is the map. This function
 * turns the public path into the internal English path the route tree under
 * src/app/(site)/[locale] is named after, redirects non-canonical forms
 * (/de/…, an English path at the German root, an English slug under a German
 * segment) to the one public URL, and hands next-intl the result so the
 * language reaches every server component. Detection by cookie or
 * Accept-Language is deliberately off: a crawler must see German at the root
 * and English under /en, never a redirect that depends on its headers.
 *
 * FILE NAME: `proxy.ts`, not `middleware.ts`. Next 16.3 deprecated the
 * middleware convention and warns on every dev boot while it is in use. The
 * exported function is named `proxy` for the same reason.
 */

/** Subdomains that serve the workspace. */
const ADMIN_HOSTS = ['admin.casa-bremen.de', 'admin.localhost'];

/** Prefix on the admin host that would otherwise be served twice. */
const WORKSPACE_PREFIX = '/admin';

const localeMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
});

function isAdminHost(host: string): boolean {
  const bare = host.split(':')[0].toLowerCase();

  if (ADMIN_HOSTS.includes(bare)) {
    return true;
  }

  // Preview and staging deployments, e.g. `admin.test.casa-bremen.de` or a
  // Container Apps FQDN prefixed with `admin-`.
  return bare.startsWith('admin.') || bare.startsWith('admin-');
}

/**
 * Whether the workspace may be reached on a non-admin host.
 *
 * Open in development so `localhost:3000/admin` works with no DNS setup. Closed
 * on a production deployment, where the workspace has its own hostname.
 * `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST=true` reopens it for the window between
 * deploying the container and pointing the admin DNS record at it.
 */
function allowWorkspaceOnPublicHost(): boolean {
  const flag = process.env.CASA_ALLOW_ADMIN_ON_PUBLIC_HOST?.trim().toLowerCase();

  if (flag) {
    return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on';
  }

  return process.env.NODE_ENV !== 'production';
}

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname, search } = request.nextUrl;

  if (isAdminHost(host)) {
    // Already inside the tree — `/admin/...` on the admin host would rewrite to
    // `/admin/admin/...`, so it is served as-is. It stays reachable rather than
    // 404ing, because internal links and `redirect()` calls in the workspace
    // are all absolute `/admin/...` paths.
    if (pathname === WORKSPACE_PREFIX || pathname.startsWith(`${WORKSPACE_PREFIX}/`)) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? WORKSPACE_PREFIX : `${WORKSPACE_PREFIX}${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (
    (pathname === WORKSPACE_PREFIX || pathname.startsWith(`${WORKSPACE_PREFIX}/`)) &&
    !allowWorkspaceOnPublicHost()
  ) {
    // `rewrite` to a path with no route, so Next renders its own 404 — which is
    // indistinguishable from the routes not existing. A 403 would confirm that
    // something is there.
    const url = request.nextUrl.clone();
    url.pathname = '/_casa-not-found';
    url.search = search;
    return NextResponse.rewrite(url, { status: 404 });
  }

  // Route handlers, the workspace in development, files: no language.
  if (isNonLocalizedPath(pathname)) {
    return NextResponse.next();
  }

  // Which language, and which internal route. One public URL per page and
  // language: anything else is redirected to it, permanently.
  const resolved = toInternalPath(pathname);
  const canonical = toPublicPath(resolved.internalPath, resolved.locale);

  if (canonical !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = canonical;
    return NextResponse.redirect(url, 308);
  }

  if (resolved.locale === defaultLocale && resolved.internalPath !== pathname) {
    // A German public path. next-intl gets the internal path and does the
    // `/de/...` rewrite onto the route tree; the browser keeps the German URL.
    const url = request.nextUrl.clone();
    url.pathname = resolved.internalPath;
    return localeMiddleware(new NextRequest(url, { headers: request.headers, method: request.method }));
  }

  return localeMiddleware(request);
}

export const config = {
  /*
   * Everything except Next's own asset routes and the static files served from
   * `public/`. The negative lookahead is cheaper than matching and returning
   * early inside the middleware, which would run this function on every chunk
   * and every image on the marketing site.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|media|.*\\.[\\w]+$).*)'],
};
