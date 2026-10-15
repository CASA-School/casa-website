/**
 * Signing in without a password, for looking at the workspace on one's own
 * laptop (Rahman, 2026-10-15: "for my testing, remove the password barrier so
 * i can quickly check and see how things look").
 *
 * Every condition is required, so it cannot reach a deployment:
 *
 * 1. `next dev` — `NODE_ENV` is `development`. `next start` and the container
 *    always run `production`.
 * 2. `ADMIN_DEV_LOGIN` is set, in the git-ignored `.env.local`: `1` signs in as
 *    the first active owner, an address as that account.
 * 3. The browser asked for `localhost`. `127.0.0.1` keeps the real sign-in, so
 *    the e2e suite (which uses it) still proves an anonymous request is turned
 *    away. The host is read from `x-forwarded-host` first: when a server action
 *    redirects, Next renders the target through an internal request addressed
 *    to localhost, and only that header still carries the browser's host.
 * 4. The connection came from this machine (`x-forwarded-for`, which Next sets
 *    from the socket when a request does not bring its own).
 *
 * What remains: `next dev` listens on the local network, and a client can write
 * both headers itself, so someone on the same network who knows this could sign
 * in to the LOCAL workspace and its test data while the dev server runs. Binding
 * the dev server to 127.0.0.1 (`-H`) would close that, but in Next 16 it breaks
 * server actions in development (the dev runtime crashes with "Map maximum size
 * exceeded"), so the rule is the switch: off on a shared network.
 *
 * It opens an ordinary session for a real account, so every check behind the
 * sign-in — the layout gate, `requireModule()` in each action, the CV route —
 * runs exactly as it does for a password.
 */

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const first = (value: string | null | undefined) => (value ?? '').split(',')[0].trim();

export function devLoginAllowed({
  nodeEnv,
  flag,
  host,
  forwardedFor,
}: {
  nodeEnv: string | undefined;
  flag: string | undefined;
  /** The host the browser asked for: `x-forwarded-host`, else `host`. */
  host: string | null | undefined;
  /** Where the connection came from: `x-forwarded-for`. */
  forwardedFor: string | null | undefined;
}): boolean {
  if (nodeEnv !== 'development') return false;
  if (!flag || flag === '0' || flag.toLowerCase() === 'false') return false;
  const hostname = first(host).replace(/:\d+$/, '').toLowerCase();
  return hostname === 'localhost' && LOOPBACK.has(first(forwardedFor));
}

/** This request, with this process's settings. */
export const devLoginAllowedHere = (headers: Headers): boolean =>
  devLoginAllowed({
    nodeEnv: process.env.NODE_ENV,
    flag: process.env.ADMIN_DEV_LOGIN,
    host: headers.get('x-forwarded-host') ?? headers.get('host'),
    forwardedFor: headers.get('x-forwarded-for'),
  });
