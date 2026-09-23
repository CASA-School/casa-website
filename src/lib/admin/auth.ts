import { createHash, randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';

import { resolveAccess, type Access } from './access';
import { query, queryFirst } from './db';
import { verifyPassword } from './password';

/**
 * Staff sessions.
 *
 * Server-side, in `staff_sessions`, rather than a self-contained signed cookie.
 * A signed cookie cannot be revoked before it expires — signing out would be
 * cosmetic, and a laptop left on a train would stay logged in for the life of
 * the token. The cost is one indexed lookup per request, which is cheaper than
 * the alternative of a short expiry and a re-login every hour.
 *
 * Only the SHA-256 of the token is stored. The token is 32 random bytes with no
 * structure, so a plain hash is right here: there is nothing to brute-force
 * offline, unlike a password.
 */

export const SESSION_COOKIE = 'casa_workspace_session';

/**
 * Twelve hours from sign-in, and no longer: one working day, not one week.
 *
 * Fixed at sign-in, not refreshed on use. The cookie gets this maxAge once,
 * so a browser already dropped it after twelve hours; `expires_at` used to
 * slide on every request, though, so a token copied off a shared machine and
 * replayed at least twice a day never expired. Now the server ends it when the
 * cookie does.
 */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** How stale `last_used_at` / `last_seen_at` may get before a write. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * The sign-in throttle, counted in `staff_sign_in_failures` (0016) before any
 * password is verified. Per address typed: ten wrong passwords in a quarter of
 * an hour is not a colleague mistyping. Per client address: higher, because
 * the whole office signs in from one. Over either, the attempt is refused with
 * the ordinary sign-in error and costs no scrypt.
 */
export const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
export const SIGN_IN_MAX_FAILURES_PER_EMAIL = 10;
export const SIGN_IN_MAX_FAILURES_PER_ADDRESS = 30;

/**
 * Password checks running at once on this replica. Each is a 64 MiB scrypt on
 * one of libuv's four threadpool workers, on the replica that also serves the
 * public site, and the throttle does not bound a burst spread over many
 * addresses typed. Beyond this, a sign-in is refused with the ordinary error
 * at once rather than queued.
 */
export const SIGN_IN_MAX_CONCURRENT_VERIFICATIONS = 2;
let verificationsRunning = 0;

/** No account has a longer address; nothing longer is looked up or stored. */
const MAX_EMAIL_LENGTH = 254;

export type StaffRole = 'owner' | 'admin' | 'staff';

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  /** What this person may do in each module — role default plus exceptions. */
  access: Access;
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

type StaffRow = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  password_hash: string;
  is_active: boolean;
};

/**
 * Verifies credentials and opens a session.
 *
 * Returns null for every failure — unknown address, wrong password, deactivated
 * account — and says nothing about which. A sign-in form that distinguishes
 * them is an account enumeration oracle.
 *
 * The password is verified even when no account matched, against a throwaway
 * hash, so a request for an unknown address costs the same ~100 ms as a request
 * for a real one and the response time leaks nothing.
 *
 * Throttled first (SIGN_IN_MAX_FAILURES_*): a refused attempt is answered
 * before the account lookup, so it says nothing about whether the account
 * exists — the limit applies to any address typed. A refusal because this
 * replica is already running SIGN_IN_MAX_CONCURRENT_VERIFICATIONS password
 * checks comes whether or not the account exists, too.
 */
export async function signIn(
  email: string,
  password: string,
  userAgent: string | null,
  clientAddress: string
): Promise<{ user: StaffUser; token: string } | null> {
  const normalised = email.trim().toLowerCase();
  const address = clientAddress.slice(0, 64);

  if (normalised.length > MAX_EMAIL_LENGTH) {
    return null;
  }

  const attempt = await claimSignInAttempt(normalised, address);

  if (attempt === null) {
    return null;
  }

  const row = await queryFirst<StaffRow>(
    `SELECT id, email, name, role, password_hash, is_active
       FROM staff_users
      WHERE lower(email) = $1`,
    [normalised]
  );

  if (verificationsRunning >= SIGN_IN_MAX_CONCURRENT_VERIFICATIONS) {
    await releaseSignInAttempt(attempt);
    return null;
  }

  verificationsRunning += 1;
  let passwordMatches: boolean;

  try {
    passwordMatches = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  } finally {
    verificationsRunning -= 1;
  }

  if (!row || !row.is_active || !passwordMatches) {
    // The attempt's row stays: it is the failure.
    return null;
  }

  // A colleague who got there in the end starts again with a full budget; this
  // attempt's own row goes with the rest.
  await query(`DELETE FROM staff_sign_in_failures WHERE email = $1`, [normalised]).catch(
    (error) => console.error('[workspace-auth] sign-in failures not cleared', error)
  );

  const token = randomBytes(32).toString('base64url');

  await query(
    `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [row.id, hashToken(token), new Date(Date.now() + SESSION_TTL_MS), userAgent]
  );

  return {
    // Exceptions are resolved on the next request by getStaffUser; the sign-in
    // result only needs the role default to redirect correctly.
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      access: resolveAccess(row.role, []),
    },
    token,
  };
}

/**
 * A real scrypt hash of a random string, used only to make the no-such-account
 * path do the same work as the account-exists path. Generated at module load,
 * never compared for a truthful answer.
 */
const DUMMY_HASH =
  'scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

/**
 * Records this attempt as a failure, then counts, and returns the row's id —
 * or null, having deleted the row again, when the address typed or this client
 * is over its limit for the window.
 *
 * RECORD FIRST, THEN COUNT, as two statements. Counting first and recording
 * after the ~100 ms scrypt let every attempt that arrived meanwhile read the
 * same old count: a hundred parallel guesses for one address all got through.
 * Now each attempt's row is committed before it counts, so every attempt that
 * gets past has counted its own row and those of all that got past before it,
 * and no more than the limit get past however many arrive at once. One
 * statement would not do: a CTE's count cannot see a concurrent insert. Under
 * contention this errs towards refusing.
 *
 * A refused attempt deletes its own row (`releaseSignInAttempt`), so it leaves
 * nothing behind and a flood does not extend the lock. The row of an attempt
 * that goes on to the password check stays unless the password is right.
 *
 * Fails CLOSED, like the session lookup: if the row cannot be written or the
 * count cannot be read — the database is down, or 0016 was not applied — the
 * attempt is refused and the log says why, rather than the throttle silently
 * switching itself off.
 */
async function claimSignInAttempt(email: string, clientAddress: string): Promise<string | null> {
  let id: string | undefined;

  try {
    // The address typed and where from; never what was typed as the password.
    const inserted = await queryFirst<{ id: string }>(
      `INSERT INTO staff_sign_in_failures (email, client_address) VALUES ($1, $2) RETURNING id`,
      [email, clientAddress]
    );
    id = inserted?.id;

    const counts = await queryFirst<{ by_email: string; by_address: string }>(
      `SELECT count(*) FILTER (WHERE email = $1)          AS by_email,
              count(*) FILTER (WHERE client_address = $2) AS by_address
         FROM staff_sign_in_failures
        WHERE attempted_at > now() - ($3::bigint * interval '1 millisecond')
          AND (email = $1 OR client_address = $2)`,
      [email, clientAddress, SIGN_IN_WINDOW_MS]
    );

    if (
      id !== undefined &&
      counts !== undefined &&
      Number(counts.by_email) <= SIGN_IN_MAX_FAILURES_PER_EMAIL &&
      Number(counts.by_address) <= SIGN_IN_MAX_FAILURES_PER_ADDRESS
    ) {
      return id;
    }
  } catch (error) {
    console.error('[workspace-auth] sign-in throttle check failed', error);
  }

  if (id !== undefined) {
    await releaseSignInAttempt(id);
  }

  return null;
}

/** Takes back an attempt refused before its password was checked. */
async function releaseSignInAttempt(id: string): Promise<void> {
  await query(`DELETE FROM staff_sign_in_failures WHERE id = $1`, [id]).catch((error) =>
    console.error('[workspace-auth] refused sign-in not cleared', error)
  );
}

export async function writeSessionCookie(token: string): Promise<void> {
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/** Closes the current session server-side and clears the cookie. */
export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [hashToken(token)]).catch(
      () => {}
    );
  }

  store.delete(SESSION_COOKIE);
}

/** Ends every session for one account. Used when a role or password changes. */
export async function revokeAllSessions(staffUserId: string): Promise<void> {
  await query(`DELETE FROM staff_sessions WHERE staff_user_id = $1`, [staffUserId]);
}

type SessionRow = {
  session_id: string;
  last_used_at: Date;
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  exceptions: { module: string; level: string }[] | null;
};

/**
 * The signed-in staff member, or null.
 *
 * Deliberately does not redirect: the sign-in page and the layout both call it,
 * and a redirect here would make the sign-in page bounce off itself.
 */
export async function getStaffUser(): Promise<StaffUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  let row: SessionRow | undefined;

  try {
    row = await queryFirst<SessionRow>(
      `SELECT s.id  AS session_id,
              s.last_used_at,
              u.id,
              u.email,
              u.name,
              u.role,
              (SELECT json_agg(json_build_object('module', a.module, 'level', a.level))
                 FROM staff_module_access a WHERE a.staff_user_id = u.id) AS exceptions
         FROM staff_sessions s
         JOIN staff_users u ON u.id = s.staff_user_id
        WHERE s.token_hash = $1
          AND s.expires_at > now()
          AND u.is_active`,
      [hashToken(token)]
    );
  } catch (error) {
    // An unreachable database must not be indistinguishable from a valid
    // session. Failing closed logs the cause and shows the sign-in page.
    console.error('[workspace-auth] session lookup failed', error);
    return null;
  }

  if (!row) {
    return null;
  }

  // Last use, written at most once per TOUCH_INTERVAL_MS. Without the interval
  // this is one UPDATE per navigation, on the hottest path in the app. It does
  // not move `expires_at`: when a session ends was decided at sign-in.
  if (Date.now() - new Date(row.last_used_at).getTime() > TOUCH_INTERVAL_MS) {
    await query(`UPDATE staff_sessions SET last_used_at = now() WHERE id = $1`, [
      row.session_id,
    ]).catch(() => {});

    await query(`UPDATE staff_users SET last_seen_at = now() WHERE id = $1`, [row.id]).catch(
      () => {}
    );
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    access: resolveAccess(row.role, row.exceptions ?? []),
  };
}

/** Role gate for the few screens only an owner or admin may open. */
export const canManageStaff = (role: StaffRole) => role === 'owner' || role === 'admin';

/** Deleting is owner-only: an admin can deactivate, which is reversible. */
export const canDeleteStaff = (role: StaffRole) => role === 'owner';

/**
 * Removes expired rows, and sign-in failures too old to count towards any
 * limit. Called opportunistically from the sign-in action, after a success.
 */
export async function pruneExpiredSessions(): Promise<void> {
  await query(`DELETE FROM staff_sessions WHERE expires_at < now() - interval '7 days'`).catch(
    () => {}
  );
  await query(
    `DELETE FROM staff_sign_in_failures WHERE attempted_at < now() - interval '1 day'`
  ).catch(() => {});
}
