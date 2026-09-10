import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from './icons';
import { NavGroup, NavLink } from './nav-link';
import { TopBar } from './top-bar';
import { Logo } from '@/components/ui/logo';
import { canAccess } from '@/lib/admin/access';
import type { StaffRole, StaffUser } from '@/lib/admin/auth';

/**
 * The workspace frame.
 *
 * WHY A PERSISTENT SIDEBAR AND NOT A TOP BAR
 *
 * The workspace has nine destinations and staff move between them constantly —
 * an enquiry becomes a registration, a registration sends you to the cohort it
 * belongs to. A top bar with nine items either wraps or turns into a "More"
 * menu, and either way it costs a click and a guess on every hop. A rail costs
 * neither. What the rail does NOT carry is anything that is not navigation:
 * identity, sign-out and the collapse control live in the sticky top bar
 * (`top-bar.tsx`), and there are no queue counts beside the labels — those
 * were backlogs dressed as notifications, and a number that never goes away
 * reads as nagging.
 *
 * On desktop the rail collapses to a column of icons (`SidebarToggle`, CSS in
 * globals.css). On a phone it becomes a horizontal scroller at the top. Not a
 * hamburger: a drawer needs client JavaScript, a focus trap and an escape key,
 * and the whole nav is a dozen short labels that fit in a swipe.
 */

export function WorkspaceShell({
  user,
  signOutAction,
  children,
}: {
  user: StaffUser;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="casa-workspace-panel w-full shrink-0 self-start border-b border-ws-panel-line bg-ws-panel text-ws-on-panel lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:border-r lg:border-b-0 lg:transition-[width] lg:duration-200 lg:ease-out motion-reduce:transition-none">
        <div className="flex h-full flex-col gap-7 overflow-x-hidden overflow-y-auto px-4 py-4 lg:py-6">
          {/*
            The logo carries the CASA wordmark itself, so nothing here sets the
            name in type beside it — two "CASA"s in two different typefaces is
            what made the first version of this look wrong. "Workspace" sits
            under the mark as an eyebrow, naming which CASA product this is.

            `crop="mark"` drops the "Internationale Sprachschule" line, which
            at this width would render about four pixels tall.
          */}
          {/*
            Hidden when the rail is collapsed: the wordmark is nearly six times
            as wide as it is tall, so at icon width it would be a sliver of the
            letter C, and CASA has no separate emblem to put there instead.
          */}
          <Link
            href="/admin"
            data-nav-label
            className="block rounded-lg px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-marker)]/70"
          >
            <Logo className="h-[1.35rem] w-auto" variant="white" crop="mark" />
            <span
              data-nav-label
              className="mt-2 block text-[0.58rem] font-semibold tracking-[0.24em] uppercase text-ws-on-panel-muted"
            >
              Workspace
            </span>
          </Link>

          <nav
            aria-label="Workspace"
            className="-mx-1 flex snap-x gap-1 overflow-x-auto px-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0"
          >
            <NavLink href="/admin" icon={Icon.calendar} title="Today">
              Today
            </NavLink>

            {canAccess(user, 'enquiries') || canAccess(user, 'registrations') ? (
              <NavGroup
                id="inbox"
                label="Inbox"
                hrefs={['/admin/enquiries', '/admin/registrations']}
              >
                {canAccess(user, 'enquiries') ? (
                  <NavLink href="/admin/enquiries" icon={Icon.enquiries} title="Enquiries">
                    Enquiries
                  </NavLink>
                ) : null}
                {canAccess(user, 'registrations') ? (
                  <NavLink
                    href="/admin/registrations"
                    title="Registrations"
                    icon={Icon.registrations}
                    items={[
                      {
                        href: '/admin/registrations/course',
                        label: 'Courses',
                      },
                      {
                        href: '/admin/registrations/exam',
                        label: 'Exams',
                      },
                    ]}
                  >
                    Registrations
                  </NavLink>
                ) : null}
              </NavGroup>
            ) : null}

            {canAccess(user, 'people') ||
            canAccess(user, 'bookings') ||
            canAccess(user, 'catalogue') ? (
              <NavGroup
                id="school"
                label="School"
                hrefs={['/admin/people', '/admin/placement', '/admin/bookings', '/admin/catalogue']}
              >
                {/*
                  Placement is nested under Students, not a queue of its own. A
                  learner who wants B1 sits the A1 and A2 test on the way there,
                  so the result belongs to their profile; the list is where a
                  teacher goes to confirm one, which is a step in that story
                  rather than a separate area of the school.
                */}
                {canAccess(user, 'people') ? (
                  <NavLink
                    href="/admin/people"
                    title="Students"
                    icon={Icon.people}
                    items={
                      canAccess(user, 'placement')
                        ? [
                            {
                              href: '/admin/placement',
                              label: 'Placement tests',
                            },
                          ]
                        : []
                    }
                  >
                    Students
                  </NavLink>
                ) : null}
                {canAccess(user, 'bookings') ? (
                  <NavLink href="/admin/bookings" icon={Icon.bookings} title="Bookings">
                    Bookings
                  </NavLink>
                ) : null}
                {/* Courses and exams are two areas of work, not one screen with
                    a tab strip: a term of courses and a telc sitting share a
                    catalogue table and almost nothing else. */}
                {canAccess(user, 'catalogue') ? (
                  <>
                    <NavLink href="/admin/catalogue" icon={Icon.catalogue} title="Courses">
                      Courses
                    </NavLink>
                    <NavLink href="/admin/catalogue/exams" icon={Icon.placement} title="Exams">
                      Exams
                    </NavLink>
                  </>
                ) : null}
              </NavGroup>
            ) : null}

            <NavGroup
              id="admin"
              label="Management"
              hrefs={['/admin/applications', '/admin/activity', '/admin/team', '/admin/settings']}
            >
              {canAccess(user, 'applications') ? (
                <NavLink href="/admin/applications" title="Applications" icon={Icon.applications}>
                  Applications
                </NavLink>
              ) : null}
              {canAccess(user, 'activity') ? (
                <NavLink href="/admin/activity" icon={Icon.note} title="Activity">
                  Activity
                </NavLink>
              ) : null}
              {canAccess(user, 'team') ? (
                <NavLink href="/admin/team" icon={Icon.team} title="Team">
                  Team
                </NavLink>
              ) : null}
              {/* Rooms, the type lists and the price list all live here: they
                  are defined once and then left alone for a season. */}
              <NavLink
                href="/admin/settings"
                title="Settings"
                icon={Icon.settings}
                items={[
                  { href: '/admin/settings/setup', label: 'Types & prices' },
                  ...(canAccess(user, 'rooms')
                    ? [{ href: '/admin/settings/rooms', label: 'Rooms' }]
                    : []),
                ]}
              >
                Settings
              </NavLink>
            </NavGroup>
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} signOutAction={signOutAction} />
        <main className="flex-1 bg-ws-canvas px-5 py-7 lg:px-10 lg:py-10">
          {/* 1180px, not the public site's wider shells. A workspace table read
              edge to edge on a 27-inch monitor forces the eye across half a metre
              to match a name to a date. */}
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
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
 *
 * Painted in the rail's dark ink: it sits on the white top bar now, and the
 * translucent-white version it used to be was invisible there.
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
      className="flex shrink-0 items-center justify-center rounded-full bg-ws-panel font-bold text-ws-on-panel"
    >
      {initials}
    </span>
  );
}
