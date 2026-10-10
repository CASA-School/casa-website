import { randomBytes } from 'node:crypto';

import type { AccessLevel } from './access';
import { query, queryFirst } from './db';
import { logActivity } from './activity';
import { revokeAllSessions, type StaffRole, type StaffUser } from './auth';
import { hashPassword } from './password';
import { cleanUsername, usernameKey } from './sign-in-names';

/** Staff account administration. Reachable only by an owner or an admin. */

export type StaffAccount = {
  id: string;
  email: string;
  name: string;
  /** What they type to sign in, besides their address. */
  username: string | null;
  /** Signed in with Microsoft at least once, which linked the account. */
  microsoftLinkedAt: Date | null;
  /** False for an account created without a password: Microsoft only, until an owner sets one. */
  hasPassword: boolean;
  role: StaffRole;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  activeSessions: number;
  /** Per-person module exceptions; absent modules follow the role default. */
  moduleExceptions: { module: string; level: string }[];
};

export async function listStaff(): Promise<StaffAccount[]> {
  const rows = await query<{
    id: string;
    email: string;
    name: string;
    username: string | null;
    microsoft_linked_at: Date | null;
    password_set_at: Date | null;
    role: StaffRole;
    is_active: boolean;
    last_seen_at: Date | null;
    created_at: Date;
    active_sessions: string;
    exceptions: { module: string; level: string }[] | null;
  }>(
    `SELECT u.id,
            u.email,
            u.name,
            u.username,
            u.microsoft_linked_at,
            u.password_set_at,
            u.role,
            u.is_active,
            u.last_seen_at,
            u.created_at,
            (SELECT count(*) FROM staff_sessions s
              WHERE s.staff_user_id = u.id AND s.expires_at > now())
              AS active_sessions,
            (SELECT json_agg(json_build_object('module', a.module, 'level', a.level))
               FROM staff_module_access a WHERE a.staff_user_id = u.id) AS exceptions
       FROM staff_users u
      ORDER BY u.is_active DESC, u.name ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    username: row.username,
    microsoftLinkedAt: row.microsoft_linked_at,
    hasPassword: row.password_set_at !== null,
    role: row.role,
    isActive: row.is_active,
    moduleExceptions: row.exceptions ?? [],
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    activeSessions: Number(row.active_sessions),
  }));
}

/** Everyone a record can be assigned to. */
export async function listAssignableStaff(): Promise<{ id: string; name: string }[]> {
  return query<{ id: string; name: string }>(
    `SELECT id, name FROM staff_users WHERE is_active ORDER BY name ASC`
  );
}

/** Why a name or address cannot be used for another account, or null. */
async function identityTaken(email: string, username: string, exceptId: string | null): Promise<string | null> {
  const clash = await queryFirst<{ email_taken: boolean; username_taken: boolean }>(
    `SELECT bool_or(lower(email) = $1) AS email_taken, bool_or(username_key = $2) AS username_taken
       FROM staff_users
      WHERE (lower(email) = $1 OR username_key = $2) AND ($3::uuid IS NULL OR id <> $3)`,
    [email, usernameKey(username), exceptId]
  );
  if (clash?.email_taken) return 'An account with that email already exists.';
  if (clash?.username_taken) return 'Someone already signs in with that name. Add a middle name or initial.';
  return null;
}

/**
 * A new account. Without a password it signs in with Microsoft only, until an
 * owner sets one (the office team's FileMaker password, 2026-10-10). The
 * website editor's level is set here too, the module the office team gets first.
 */
export async function createStaffAccount({
  email,
  name,
  username,
  role,
  password,
  website,
  actor,
}: {
  email: string;
  name: string;
  username?: string;
  role: StaffRole;
  password: string | null;
  website?: AccessLevel;
  actor: StaffUser;
}): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const normalised = email.trim().toLowerCase();
  const login = cleanUsername(username || name);

  const taken = await identityTaken(normalised, login, null);
  if (taken) return { ok: false, reason: taken };

  // No password yet: a random one nobody knows, and `password_set_at` null, so
  // a password sign-in is refused outright rather than merely failing.
  const created = await queryFirst<{ id: string }>(
    `INSERT INTO staff_users (email, name, username, username_key, role, password_hash, password_set_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      normalised,
      name.trim(),
      login,
      usernameKey(login),
      role,
      await hashPassword(password ?? randomBytes(32).toString('base64url')),
      password ? new Date() : null,
    ]
  );
  if (!created) return { ok: false, reason: 'The account could not be created.' };

  if (website && website !== 'none' && role === 'staff') {
    await query(
      `INSERT INTO staff_module_access (staff_user_id, module, level, granted_by) VALUES ($1, 'website', $2, $3)
       ON CONFLICT (staff_user_id, module) DO UPDATE SET level = EXCLUDED.level`,
      [created.id, website, actor.id]
    );
  }

  await logActivity({
    actor,
    entity: 'staff_user',
    entityId: created.id,
    action: 'staff_invited',
    detail: { email: normalised, role },
  });

  return { ok: true, id: created.id };
}

/** Name, sign-in name and Outlook address. A changed address keeps the Microsoft link. */
export async function updateStaffProfile({
  staffUserId,
  name,
  username,
  email,
  actor,
}: {
  staffUserId: string;
  name: string;
  username: string;
  email: string;
  actor: StaffUser;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const normalised = email.trim().toLowerCase();
  const login = cleanUsername(username || name);
  const taken = await identityTaken(normalised, login, staffUserId);
  if (taken) return { ok: false, reason: taken };

  const updated = await queryFirst<{ id: string }>(
    `UPDATE staff_users SET name = $2, username = $3, username_key = $4, email = $5 WHERE id = $1 RETURNING id`,
    [staffUserId, name.trim(), login, usernameKey(login), normalised]
  );
  if (!updated) return { ok: false, reason: 'That account no longer exists.' };

  await logActivity({
    actor,
    entity: 'staff_user',
    entityId: staffUserId,
    action: 'staff_updated',
    detail: { email: normalised },
  });
  return { ok: true };
}

/** Undoes the Microsoft link; the next Microsoft sign-in under the account's address links it again. */
export async function unlinkMicrosoft({ staffUserId, actor }: { staffUserId: string; actor: StaffUser }): Promise<void> {
  await query(`UPDATE staff_users SET microsoft_oid = NULL, microsoft_linked_at = NULL WHERE id = $1`, [staffUserId]);
  await revokeAllSessions(staffUserId);
  await logActivity({ actor, entity: 'staff_user', entityId: staffUserId, action: 'staff_microsoft_unlinked' });
}

/**
 * Deactivation, not deletion.
 *
 * A deleted account takes its name out of every `assigned_to` and leaves the
 * activity trail pointing at nobody. Deactivating revokes access immediately —
 * every live session is closed here, not left to expire — and keeps the history
 * readable.
 */
export async function setStaffActive({
  staffUserId,
  isActive,
  actor,
}: {
  staffUserId: string;
  isActive: boolean;
  actor: StaffUser;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (staffUserId === actor.id && !isActive) {
    return { ok: false, reason: 'You cannot deactivate your own account.' };
  }

  const target = await queryFirst<{ email: string; role: StaffRole }>(
    `SELECT email, role FROM staff_users WHERE id = $1`,
    [staffUserId]
  );

  if (!target) {
    return { ok: false, reason: 'That account no longer exists.' };
  }

  // Locking out the last owner leaves nobody who can create accounts.
  if (!isActive && target.role === 'owner') {
    const remaining = await queryFirst<{ n: string }>(
      `SELECT count(*) AS n FROM staff_users WHERE role = 'owner' AND is_active AND id <> $1`,
      [staffUserId]
    );

    if (Number(remaining?.n ?? 0) === 0) {
      return { ok: false, reason: 'This is the last active owner account.' };
    }
  }

  await query(`UPDATE staff_users SET is_active = $2 WHERE id = $1`, [staffUserId, isActive]);

  if (!isActive) {
    await revokeAllSessions(staffUserId);
  }

  await logActivity({
    actor,
    entity: 'staff_user',
    entityId: staffUserId,
    action: isActive ? 'staff_reactivated' : 'staff_deactivated',
    detail: { email: target.email },
  });

  return { ok: true };
}

export async function setStaffRole({
  staffUserId,
  role,
  actor,
}: {
  staffUserId: string;
  role: StaffRole;
  actor: StaffUser;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (staffUserId === actor.id) {
    return { ok: false, reason: 'You cannot change your own role.' };
  }

  const target = await queryFirst<{ email: string; role: StaffRole }>(
    `SELECT email, role FROM staff_users WHERE id = $1`,
    [staffUserId]
  );

  if (!target) {
    return { ok: false, reason: 'That account no longer exists.' };
  }

  if (target.role === 'owner' && role !== 'owner') {
    const remaining = await queryFirst<{ n: string }>(
      `SELECT count(*) AS n FROM staff_users WHERE role = 'owner' AND is_active AND id <> $1`,
      [staffUserId]
    );

    if (Number(remaining?.n ?? 0) === 0) {
      return { ok: false, reason: 'This is the last owner account.' };
    }
  }

  await query(`UPDATE staff_users SET role = $2 WHERE id = $1`, [staffUserId, role]);

  // A role change must take effect now, not at the next sign-in.
  await revokeAllSessions(staffUserId);

  await logActivity({
    actor,
    entity: 'staff_user',
    entityId: staffUserId,
    action: 'staff_role_changed',
    detail: { email: target.email, from: target.role, to: role },
  });

  return { ok: true };
}

/** Sets a new password and closes every other session for that account. */
export async function setStaffPassword({
  staffUserId,
  password,
}: {
  staffUserId: string;
  password: string;
}): Promise<void> {
  await query(`UPDATE staff_users SET password_hash = $2, password_set_at = now() WHERE id = $1`, [
    staffUserId,
    await hashPassword(password),
  ]);

  await revokeAllSessions(staffUserId);
}

/**
 * Sets what one person may do per module, as exceptions to their role default.
 * Levels equal to the default are not stored, so a later change to the default
 * reaches everyone who was never given an exception.
 */
export async function setStaffAccess(
  staffUserId: string,
  levels: Readonly<Record<string, string>>,
  roleDefault: Readonly<Record<string, string>>,
  grantedBy: string
): Promise<void> {
  await query(`DELETE FROM staff_module_access WHERE staff_user_id = $1`, [staffUserId]);
  for (const [module, level] of Object.entries(levels)) {
    if (roleDefault[module] === level) continue;
    await query(
      `INSERT INTO staff_module_access (staff_user_id, module, level, granted_by) VALUES ($1, $2, $3, $4)`,
      [staffUserId, module, level, grantedBy]
    );
  }
}
