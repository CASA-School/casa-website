import { query, queryFirst } from './db';
import { logActivity } from './activity';
import { revokeAllSessions, type StaffRole, type StaffUser } from './auth';
import { hashPassword } from './password';

/** Staff account administration. Reachable only by an owner or an admin. */

export type StaffAccount = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  activeSessions: number;
  /** Per-person module exceptions; absent modules follow the role default. */
  moduleExceptions: { module: string; allowed: boolean }[];
};

export async function listStaff(): Promise<StaffAccount[]> {
  const rows = await query<{
    id: string;
    email: string;
    name: string;
    role: StaffRole;
    is_active: boolean;
    last_seen_at: Date | null;
    created_at: Date;
    active_sessions: string;
    exceptions: { module: string; allowed: boolean }[] | null;
  }>(
    `SELECT u.id,
            u.email,
            u.name,
            u.role,
            u.is_active,
            u.last_seen_at,
            u.created_at,
            (SELECT count(*) FROM staff_sessions s
              WHERE s.staff_user_id = u.id AND s.expires_at > now())
              AS active_sessions,
            (SELECT json_agg(json_build_object('module', a.module, 'allowed', a.allowed))
               FROM staff_module_access a WHERE a.staff_user_id = u.id) AS exceptions
       FROM staff_users u
      ORDER BY u.is_active DESC, u.name ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
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

export async function createStaffAccount({
  email,
  name,
  role,
  password,
  actor,
}: {
  email: string;
  name: string;
  role: StaffRole;
  password: string;
  actor: StaffUser;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const normalised = email.trim().toLowerCase();

  const existing = await queryFirst<{ id: string }>(
    `SELECT id FROM staff_users WHERE lower(email) = $1`,
    [normalised]
  );

  if (existing) {
    return { ok: false, reason: 'An account with that email already exists.' };
  }

  await query(
    `INSERT INTO staff_users (email, name, role, password_hash)
     VALUES ($1, $2, $3, $4)`,
    [normalised, name.trim(), role, await hashPassword(password)]
  );

  await logActivity({
    actor,
    entity: 'staff_user',
    entityId: null,
    action: 'staff_invited',
    detail: { email: normalised, role },
  });

  return { ok: true };
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
  await query(`UPDATE staff_users SET password_hash = $2 WHERE id = $1`, [
    staffUserId,
    await hashPassword(password),
  ]);

  await revokeAllSessions(staffUserId);
}

/**
 * Sets the modules one person may open, as exceptions to their role default.
 * Modules that match the default are not stored, so a later change to the
 * default reaches everyone who was never given an exception.
 */
export async function setStaffModules(
  staffUserId: string,
  modules: readonly string[],
  roleDefault: readonly string[],
  adjustable: readonly string[],
  grantedBy: string
): Promise<void> {
  const wanted = new Set(modules);
  const rows: [string, boolean][] = [];
  for (const m of adjustable) {
    const byDefault = roleDefault.includes(m);
    const now = wanted.has(m);
    if (now !== byDefault) rows.push([m, now]);
  }
  await query(`DELETE FROM staff_module_access WHERE staff_user_id = $1`, [staffUserId]);
  for (const [module, allowed] of rows) {
    await query(
      `INSERT INTO staff_module_access (staff_user_id, module, allowed, granted_by) VALUES ($1, $2, $3, $4)`,
      [staffUserId, module, allowed, grantedBy]
    );
  }
}
