import { redirect } from 'next/navigation';

import { WorkspaceShell, type NavBadges } from '@/components/admin/shell';
import { getStaffUser, signOut } from '@/lib/admin/auth';
import { bookingCounts } from '@/lib/admin/bookings';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { openFlagTotal } from '@/lib/admin/flags';
import { placementReviewBacklog } from '@/lib/admin/placement';
import { unhandledCount } from '@/lib/admin/queues';
import { DatabaseUnavailable } from '@/components/admin/database-unavailable';

/**
 * The auth gate, and the only place it lives.
 *
 * Every workspace screen is a child of this layout, so a page cannot forget to
 * check — the pattern the removed portal got wrong, and the reason the guard is
 * here rather than repeated per route. Pages still call `requireStaff()` when
 * they need the actor for a mutation, but they are never the thing standing
 * between an anonymous request and a record.
 *
 * The sign-in page sits OUTSIDE this layout, in `admin/sign-in` rather than in
 * the `(workspace)` group, for the obvious reason: a gate that also guards the
 * gate redirects to itself forever. Both resolve under `/admin` because a route
 * group is not a URL segment.
 *
 * `force-dynamic` because every screen is a live queue. A cached overview that
 * says "no new enquiries" while three are waiting is worse than a slow one.
 */
export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // Unlike the public site, the workspace has no fixture fallback and must not
  // pretend to have one: an empty queue and an unreachable database look
  // identical, and one of them means a lead is being lost right now.
  if (!isWorkspaceDatabaseConfigured()) {
    return <DatabaseUnavailable />;
  }

  const user = await getStaffUser();

  if (!user) {
    redirect('/admin/sign-in');
  }

  const [
    enquiries,
    courseRegistrations,
    examRegistrations,
    applications,
    placement,
    flags,
    bookings,
  ] = await Promise.all([
    unhandledCount('enquiry'),
    unhandledCount('course_registration'),
    unhandledCount('exam_registration'),
    unhandledCount('career_application'),
    placementReviewBacklog(),
    openFlagTotal(),
    bookingCounts(),
  ]);

  const badges: NavBadges = {
    enquiries,
    courseRegistrations,
    examRegistrations,
    applications,
    placement,
    flags,
    reserved: bookings.reserved,
  };

  async function handleSignOut() {
    'use server';
    await signOut();
    redirect('/admin/sign-in');
  }

  return (
    <WorkspaceShell user={user} badges={badges} signOutAction={handleSignOut}>
      {children}
    </WorkspaceShell>
  );
}
