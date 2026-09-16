import { redirect } from 'next/navigation';

import { DatabaseUnavailable } from '@/components/admin/database-unavailable';
import { WorkspaceShell } from '@/components/admin/shell';
import { signOut } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/guard';

/**
 * The workspace gate, in focus mode.
 *
 * Same session check as `(workspace)/layout.tsx` — both call the one
 * `requireStaff()` in `lib/admin/guard.ts`, so there is still a single
 * definition of "signed in". What differs is the chrome: the shell's focus
 * variant, for a module that is a board rather than a queue and needs the
 * width the 1180px measure would take from it. Route groups are not URL
 * segments, so everything here still answers under `/admin/...`, on the admin
 * host, behind `src/proxy.ts` like the rest.
 *
 * `force-dynamic` for the same reason as the workspace layout: the board is a
 * live plan, and a cached one that still shows yesterday's cover is worse than
 * a slow one.
 */
export const dynamic = 'force-dynamic';

export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  if (!isWorkspaceDatabaseConfigured()) {
    return <DatabaseUnavailable />;
  }

  const user = await requireStaff();

  async function handleSignOut() {
    'use server';
    await signOut();
    redirect('/admin/sign-in');
  }

  return (
    <WorkspaceShell user={user} signOutAction={handleSignOut} variant="focus">
      {children}
    </WorkspaceShell>
  );
}
