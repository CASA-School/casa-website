import Link from 'next/link';
import type { ReactNode } from 'react';

import { CasaMark } from './casa-mark';
import { Icon } from './icons';
import { NavLink } from './nav-link';
import type { StaffRole, StaffUser } from '@/lib/admin/auth';
import { canManageStaff } from '@/lib/admin/auth';

/**
 * The workspace frame.
 *
 * WHY A PERSISTENT SIDEBAR AND NOT A TOP BAR
 *
 * The workspace has nine destinations and staff move between them constantly —
 * an enquiry becomes a registration, a registration sends you to the cohort it
 * belongs to. A top bar with nine items either wraps or turns into a "More"
 * menu, and either way it costs a click and a guess on every hop. A rail costs
 * neither, and it is the one place a backlog count can sit where it will
 * actually be seen.
 *
 * On a phone the rail becomes a horizontal scroller at the top. Not a hamburger:
 * a drawer needs client JavaScript, a focus trap and an escape key, and the
 * whole nav is nine short labels that fit in a swipe.
 */

export type NavBadges = {
  enquiries: number;
  courseRegistrations: number;
  examRegistrations: number;
  applications: number;
  placement: number;
};

export function WorkspaceShell({
  user,
  badges,
  signOutAction,
  children,
}: {
  user: StaffUser;
  badges: NavBadges;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="casa-workspace-panel w-full shrink-0 self-start border-b border-ws-panel-line bg-ws-panel text-ws-on-panel lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-7 overflow-y-auto px-4 py-4 lg:py-6">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-marker)]/70"
          >
            <CasaMark className="h-5 w-auto shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm leading-none font-bold tracking-tight">CASA</span>
              <span className="mt-1 block text-[0.58rem] font-semibold tracking-[0.24em] uppercase text-ws-on-panel-muted">
                Workspace
              </span>
            </span>
          </Link>

          <nav
            aria-label="Workspace"
            className="-mx-1 flex snap-x gap-1 overflow-x-auto px-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0"
          >
            <NavLink href="/admin" icon={Icon.overview}>
              Overview
            </NavLink>
            <NavLink href="/admin/enquiries" icon={Icon.enquiries} badge={badges.enquiries}>
              Enquiries
            </NavLink>
            <NavLink
              href="/admin/registrations"
              icon={Icon.registrations}
              badge={badges.courseRegistrations + badges.examRegistrations}
            >
              Registrations
            </NavLink>
            <NavLink href="/admin/placement" icon={Icon.placement} badge={badges.placement}>
              Placement
            </NavLink>
            <NavLink
              href="/admin/applications"
              icon={Icon.applications}
              badge={badges.applications}
            >
              Applications
            </NavLink>

            <NavGroupLabel>Reference</NavGroupLabel>
            <NavLink href="/admin/catalogue" icon={Icon.catalogue}>
              Courses &amp; exams
            </NavLink>
            <NavLink href="/admin/activity" icon={Icon.note}>
              Activity
            </NavLink>

            <NavGroupLabel>Administration</NavGroupLabel>
            {canManageStaff(user.role) ? (
              <NavLink href="/admin/team" icon={Icon.team}>
                Team
              </NavLink>
            ) : null}
            <NavLink href="/admin/settings" icon={Icon.settings}>
              Settings
            </NavLink>
          </nav>

          {/* Phone: identity and the two exits belong at the top, because the
              desktop footer block below is off-screen there — which would leave
              no way to sign out or get back to the website. */}
          <div className="flex items-center gap-2 border-t border-ws-panel-line pt-3 lg:hidden">
            <Avatar name={user.name} size={26} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{user.name}</span>
            <Link
              href="/"
              className="rounded-lg px-2 py-1.5 text-xs text-ws-on-panel-muted hover:text-ws-on-panel"
            >
              Website
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1.5 text-xs text-ws-on-panel-muted hover:text-ws-on-panel"
              >
                Sign out
              </button>
            </form>
          </div>

          <div className="mt-auto hidden space-y-3 border-t border-ws-panel-line pt-4 lg:block">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ws-on-panel-muted transition-colors hover:text-ws-on-panel"
            >
              <span aria-hidden="true" className="shrink-0">
                {Icon.back}
              </span>
              Back to website
            </Link>

            <div className="flex items-center gap-2.5 px-2.5">
              <Avatar name={user.name} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{user.name}</span>
                <span className="block text-[0.7rem] text-ws-on-panel-muted">
                  {roleLabel(user.role)}
                </span>
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  title="Sign out"
                  aria-label="Sign out"
                  className="rounded-lg p-1.5 text-ws-on-panel-muted transition-colors hover:bg-white/8 hover:text-ws-on-panel"
                >
                  {Icon.signOut}
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-ws-canvas px-5 py-7 lg:px-10 lg:py-10">
        {/* 1180px, not the public site's wider shells. A workspace table read
            edge to edge on a 27-inch monitor forces the eye across half a metre
            to match a name to a date. */}
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}

function NavGroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 mb-1.5 hidden px-2.5 text-[0.56rem] font-bold tracking-[0.2em] uppercase text-ws-on-panel-muted/70 lg:block">
      {children}
    </p>
  );
}

const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  staff: 'Staff',
};

export const roleLabel = (role: StaffRole) => ROLE_LABELS[role];

/**
 * Initials, not a photograph.
 *
 * CLAUDE.md rule 3: the portraits in `public/media/casa/team/` are synthetic
 * placeholders and must not be presented as real staff. An avatar slot filled
 * with one of them would do exactly that, on the account menu of the person
 * looking at it.
 */
export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className="flex shrink-0 items-center justify-center rounded-full bg-white/12 font-bold text-ws-on-panel"
    >
      {initials}
    </span>
  );
}
