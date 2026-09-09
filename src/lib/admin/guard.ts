import 'server-only';

import { redirect } from 'next/navigation';

import { canAccess, type AccessLevel, type WorkspaceModule } from './access';
import { getStaffUser, type StaffUser } from './auth';

/**
 * The two guards every workspace screen and action use.
 *
 * `requireStaff` answers "is anyone signed in"; `requireModule` answers "may
 * this person do this much in this module" — `view` to open a screen, `edit`
 * to create or change, `full` to delete. A module's layout calls it with
 * `view`, so no page inside it can forget; each server action calls it with
 * the level the mutation needs, because an action is a public HTTP endpoint
 * that never passes through the layout that rendered its form (CLAUDE.md
 * rule 7).
 */
export async function requireStaff(): Promise<StaffUser> {
  const user = await getStaffUser();
  if (!user) redirect('/admin/sign-in');
  return user;
}

export async function requireModule(
  module: WorkspaceModule,
  level: AccessLevel = 'view'
): Promise<StaffUser> {
  const user = await requireStaff();
  if (!canAccess(user, module, level)) redirect(`/admin?denied=${module}`);
  return user;
}
