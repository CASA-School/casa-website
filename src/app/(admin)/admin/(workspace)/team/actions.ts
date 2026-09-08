'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { canDeleteStaff, canManageStaff, getStaffUser, type StaffRole } from '@/lib/admin/auth';
import { describePasswordProblem } from '@/lib/admin/password';
import {
  createStaffAccount,
  setStaffActive,
  setStaffPassword,
  setStaffRole,
} from '@/lib/admin/staff';

/**
 * Staff account mutations.
 *
 * Every one re-checks the role. `canManageStaff` is already used to hide the
 * Team link from the sidebar, but hiding a link is not a permission — a server
 * action is a public endpoint, and a staff member who knows the action exists
 * can post to it directly. This is the check that actually holds.
 */

const ROLES = new Set<string>(['owner', 'admin', 'staff']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireManager() {
  const user = await getStaffUser();

  if (!user) {
    redirect('/admin/sign-in');
  }

  if (!canManageStaff(user.role)) {
    // Not a 403 page: a staff member who reaches this did not follow a link,
    // and there is nothing useful to say to them about a screen they may not
    // see. The workspace behaves as though it does not exist.
    redirect('/admin');
  }

  return user;
}

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
