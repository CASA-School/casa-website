import { NextResponse, type NextRequest } from 'next/server';

/**
 * Host routing for the staff workspace.
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
 * FILE NAME: `proxy.ts`, not `middleware.ts`. Next 16.3 deprecated the
 * middleware convention and warns on every dev boot while it is in use. The
 * exported function is named `proxy` for the same reason; the behaviour and the
 * `config.matcher` are unchanged.
 */

/** Subdomains that serve the workspace. */
const ADMIN_HOSTS = ['admin.casa-bremen.de', 'admin.localhost'];

/** Prefix on the admin host that would otherwise be served twice. */
const WORKSPACE_PREFIX = '/admin';

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

  return NextResponse.next();
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
