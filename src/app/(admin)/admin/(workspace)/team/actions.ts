'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ADJUSTABLE, isModule, roleDefault } from '@/lib/admin/access';
import { canDeleteStaff, revokeAllSessions, type StaffRole } from '@/lib/admin/auth';
import { requireModule } from '@/lib/admin/guard';
import { describePasswordProblem } from '@/lib/admin/password';
import {
  createStaffAccount,
  setStaffActive,
  setStaffModules,
  setStaffPassword,
  setStaffRole,
} from '@/lib/admin/staff';

/**
 * Staff account mutations.
 *
 * Every one re-checks access. The sidebar hides the Team link from anyone
 * without the module, but hiding a link is not a permission — a server
 * action is a public endpoint, and a staff member who knows the action exists
 * can post to it directly. This is the check that actually holds.
 */

const ROLES = new Set<string>(['owner', 'admin', 'staff']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The Team module is owner/admin by role and never granted by exception. */
const requireManager = () => requireModule('team');

function back(message: string, kind: 'error' | 'ok' = 'error'): never {
  redirect(`/admin/team?${kind}=${encodeURIComponent(message)}`);
}

export async function createStaffAction(formData: FormData): Promise<void> {
  const actor = await requireManager();

  const email = String(formData.get('email') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const role = String(formData.get('role') ?? 'staff');
  const password = String(formData.get('password') ?? '');

  if (name.length < 2) {
    back('Give the account a name.');
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    back('That does not look like an email address.');
  }

  if (!ROLES.has(role)) {
    back('Unknown role.');
  }

  // Only an owner may create another owner. An admin promoting themselves via
  // a colleague's account would otherwise be a one-step privilege escalation.
  if (role === 'owner' && !canDeleteStaff(actor.role)) {
    back('Only an owner can create another owner.');
  }

  const problem = describePasswordProblem(password);
  if (problem) {
    back(problem);
  }

  const result = await createStaffAccount({
    email,
    name,
    role: role as StaffRole,
    password,
    actor,
  });

  if (!result.ok) {
    back(result.reason);
  }

  revalidatePath('/admin/team');
  back(`${name} can now sign in.`, 'ok');
}

export async function setActiveAction(formData: FormData): Promise<void> {
  const actor = await requireManager();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  const isActive = formData.get('isActive') === 'true';

  if (!UUID.test(staffUserId)) {
    back('Unknown account.');
  }

  const result = await setStaffActive({ staffUserId, isActive, actor });

  if (!result.ok) {
    back(result.reason);
  }

  revalidatePath('/admin/team');
  back(isActive ? 'Account reactivated.' : 'Account deactivated and signed out.', 'ok');
}

export async function setRoleAction(formData: FormData): Promise<void> {
  const actor = await requireManager();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  const role = String(formData.get('role') ?? '');

  if (!UUID.test(staffUserId) || !ROLES.has(role)) {
    back('Unknown account or role.');
  }

  if (role === 'owner' && !canDeleteStaff(actor.role)) {
    back('Only an owner can grant the owner role.');
  }

  const result = await setStaffRole({ staffUserId, role: role as StaffRole, actor });

  if (!result.ok) {
    back(result.reason);
  }

  revalidatePath('/admin/team');
  back('Role changed. That person has been signed out.', 'ok');
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  await requireManager();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!UUID.test(staffUserId)) {
    back('Unknown account.');
  }

  const problem = describePasswordProblem(password);
  if (problem) {
    back(problem);
  }

  await setStaffPassword({ staffUserId, password });

  revalidatePath('/admin/team');
  back('Password set. Every session for that account is closed.', 'ok');
}

/** Which modules one person may open. Checkboxes; unchecked means no. */
export async function setModuleAccessAction(formData: FormData): Promise<void> {
  const manager = await requireManager();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  if (!UUID.test(staffUserId)) back('Invalid account.');
  if (staffUserId === manager.id) back('Ask another administrator to change your own access.');

  const role = String(formData.get('role') ?? '');
  if (!ROLES.has(role)) back('Invalid role.');

  const modules = formData
    .getAll('modules')
    .map(String)
    .filter((m) => isModule(m) && (ADJUSTABLE as readonly string[]).includes(m));

  await setStaffModules(
    staffUserId,
    modules,
    roleDefault(role as StaffRole),
    ADJUSTABLE,
    manager.id
  );
  // A narrowed set must take effect now, not when the session next reloads.
  await revokeAllSessions(staffUserId);
  revalidatePath('/admin/team');
  back('Access updated.', 'ok');
}
