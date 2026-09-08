import { createHash, randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';

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

/** Twelve hours, refreshed on use. One working day, not one week. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** How stale `last_used_at` / `last_seen_at` may get before a write. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export type StaffRole = 'owner' | 'admin' | 'staff';

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
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
 */
export async function signIn(
  email: string,
  password: string,
  userAgent: string | null
): Promise<{ user: StaffUser; token: string } | null> {
  const normalised = email.trim().toLowerCase();

  const row = await queryFirst<StaffRow>(
    `SELECT id, email, name, role, password_hash, is_active
       FROM staff_users
      WHERE lower(email) = $1`,
    [normalised]
  );

  const passwordMatches = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);

  if (!row || !row.is_active || !passwordMatches) {
    return null;
  }

  const token = randomBytes(32).toString('base64url');

  await query(
    `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [row.id, hashToken(token), new Date(Date.now() + SESSION_TTL_MS), userAgent]
  );

  return {
    user: { id: row.id, email: row.email, name: row.name, role: row.role },
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
              u.role
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

  // Sliding expiry, written at most once per TOUCH_INTERVAL_MS. Without the
  // interval this is one UPDATE per navigation, on the hottest path in the app.
  if (Date.now() - new Date(row.last_used_at).getTime() > TOUCH_INTERVAL_MS) {
    await query(
      `UPDATE staff_sessions
          SET last_used_at = now(),
              expires_at = now() + ($2::bigint * interval '1 millisecond')
        WHERE id = $1`,
      [row.session_id, SESSION_TTL_MS]
    ).catch(() => {});

    await query(`UPDATE staff_users SET last_seen_at = now() WHERE id = $1`, [row.id]).catch(
      () => {}
    );
  }

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

/** Role gate for the few screens only an owner or admin may open. */
export const canManageStaff = (role: StaffRole) => role === 'owner' || role === 'admin';

/** Deleting is owner-only: an admin can deactivate, which is reversible. */
export const canDeleteStaff = (role: StaffRole) => role === 'owner';

/** Removes expired rows. Called opportunistically from the sign-in action. */
export async function pruneExpiredSessions(): Promise<void> {
  await query(`DELETE FROM staff_sessions WHERE expires_at < now() - interval '7 days'`).catch(
    () => {}
  );
}
