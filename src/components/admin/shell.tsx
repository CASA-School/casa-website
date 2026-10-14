import Link from 'next/link';
import type { ReactNode } from 'react';

import { CommandSearch } from './command-search';
import { LangSwitch } from './lang-switch';
import { Icon } from './icons';
import { NavGroup, NavLink } from './nav-link';
import { SidebarToggle } from './sidebar-toggle';
import { canAccess } from '@/lib/admin/access';
import type { StaffRole, StaffUser } from '@/lib/admin/auth';
import { pick, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { cn } from '@/lib/utils';

/**
 * The workspace frame: a navy sidebar and the page.
 *
 * THE SIDEBAR IS THE PRODUCT'S FRAME, as in every professional tool people
 * already use (2026-10-13, Rahman, on the white one with the big logo and
 * "Workspace" under it: "do you think professional saas dashboards sidebar
 * looks like this"). Deep navy — FileMaker's structural colour, which the team
 * knows, on the surface every modern product darkens — so the white pages read
 * as the lit work area and the frame recedes. From the top: the name "CASA" in
 * type, search (⌘K), the navigation in its groups, Settings at the foot,
 * and at the foot who is signed in, the way to the website and sign-out. There
 * is no top bar on a desktop: everything it held lives in the sidebar, and the
 * page gets the height.
 *
 * Navigation and nothing it does not need: no queue counts beside the labels
 * (backlogs, not notifications), one fine marker for "you are here".
 *
 * On desktop the sidebar collapses to icons (`SidebarToggle`, CSS in
 * globals.css). On a phone it is a navy band at the top: the logo, search and
 * the account, then the destinations as a horizontal scroller.
 *
 * FOCUS MODE (`variant="focus"`) is the same frame at a different density, for
 * the one module that is a board rather than a queue: the sidebar is fixed at
 * icon width and the page drops the 1180px measure.
 */

export async function WorkspaceShell({
  user,
  signOutAction,
  variant = 'default',
  children,
}: {
  user: StaffUser;
  signOutAction: () => Promise<void>;
  variant?: 'default' | 'focus';
  children: ReactNode;
}) {
  const focus = variant === 'focus';
  const { t, lang } = await getI18n();
  // Rooms, the type lists and the price list: defined once and left alone for a season.
  // The price list is finance's and management's (module `prices`).
  const settingsItems = [
    ...(canAccess(user, 'prices') ? [{ href: '/admin/settings/prices', label: t('Preise', 'Prices') }] : []),
    { href: '/admin/settings/setup', label: t('Listen', 'Lists') },
    ...(canAccess(user, 'rooms') ? [{ href: '/admin/settings/rooms', label: t('Räume', 'Rooms') }] : []),
  ];

  return (
    <div className={cn('casa-workspace-shell flex min-h-dvh flex-col lg:flex-row', focus && 'casa-workspace-focus')}>
      <aside className="casa-workspace-rail w-full shrink-0 self-start bg-[linear-gradient(180deg,var(--ws-rail-top)_0%,var(--ws-rail)_45%)] text-white lg:sticky lg:top-0 lg:h-dvh lg:w-[15.5rem] lg:transition-[width] lg:duration-200 lg:ease-out motion-reduce:transition-none">
        <div className="flex h-full flex-col overflow-x-hidden">
          <div data-rail-head className="flex h-14 shrink-0 items-center justify-between gap-2 px-4 lg:h-16">
            {/* The name in type, nothing else (Rahman, 2026-10-14): set in the workspace's display serif, as the logo's lettering is. */}
            <Link
              href="/admin"
              aria-label={t('CASA, Übersicht', 'CASA, Overview')}
              data-rail-brand
              className="rounded-md px-1 font-[family-name:var(--font-display)] text-[1.4rem] leading-none font-semibold tracking-[0.06em] text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              CASA
            </Link>
            <span className="ml-auto hidden lg:inline-flex">
              <LangSwitch />
            </span>
            <span className="flex items-center gap-1 lg:hidden">
              <LangSwitch />
              <CommandSearch variant="rail-icon" />
              <Link href="/admin/account" title={t('Dein Konto', 'Your account')} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                <Avatar name={user.name} size={28} tone="rail" />
              </Link>
            </span>
            {focus ? null : <SidebarToggle />}
          </div>

          <div className="hidden px-3 pb-3 lg:block">
            <CommandSearch variant="rail" />
          </div>

          <nav
            aria-label={t('Arbeitsbereich', 'Workspace')}
            className="flex snap-x gap-1 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-x-hidden lg:overflow-y-auto lg:pb-6 lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]"
          >
            <NavLink href="/admin" icon={Icon.overview} title={t('Übersicht', 'Overview')}>
              {t('Übersicht', 'Overview')}
            </NavLink>

            {canAccess(user, 'enquiries') || canAccess(user, 'registrations') ? (
              <NavGroup
                id="inbox"
                label={t('Posteingang', 'Inbox')}
                hrefs={['/admin/enquiries', '/admin/registrations']}
              >
                {canAccess(user, 'enquiries') ? (
                  <NavLink href="/admin/enquiries" icon={Icon.enquiries} title={t('Anfragen', 'Enquiries')}>
                    {t('Anfragen', 'Enquiries')}
                  </NavLink>
                ) : null}
                {canAccess(user, 'registrations') ? (
                  <NavLink
                    href="/admin/registrations"
                    title={t('Anmeldungen', 'Registrations')}
                    icon={Icon.registrations}
                    items={[
                      {
                        href: '/admin/registrations/course',
                        label: t('Kurse', 'Courses'),
                      },
                      {
                        href: '/admin/registrations/exam',
                        label: t('Prüfungen', 'Exams'),
                      },
                    ]}
                  >
                    {t('Anmeldungen', 'Registrations')}
                  </NavLink>
                ) : null}
              </NavGroup>
            ) : null}

            {canAccess(user, 'people') ||
            canAccess(user, 'bookings') ||
            canAccess(user, 'offers') ||
            canAccess(user, 'catalogue') ? (
              <NavGroup
                id="school"
                label={t('Schule', 'School')}
                hrefs={['/admin/people', '/admin/placement', '/admin/bookings', '/admin/offers', '/admin/catalogue']}
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
                    title={t('Teilnehmende', 'Students')}
                    icon={Icon.people}
                    items={
                      canAccess(user, 'placement')
                        ? [
                            {
                              href: '/admin/placement',
                              label: t('Einstufungstests', 'Placement tests'),
                            },
                          ]
                        : []
                    }
                  >
                    {t('Teilnehmende', 'Students')}
                  </NavLink>
                ) : null}
                {canAccess(user, 'bookings') ? (
                  <NavLink href="/admin/bookings" icon={Icon.bookings} title={t('Buchungen', 'Bookings')}>
                    {t('Buchungen', 'Bookings')}
                  </NavLink>
                ) : null}
                {/* Offers sit beside Bookings: an accepted offer is the
                    booking that has not happened yet. Opened per person. */}
                {canAccess(user, 'offers') ? (
                  <NavLink href="/admin/offers" icon={Icon.offers} title={t('Angebote', 'Offers')}>
                    {t('Angebote', 'Offers')}
                  </NavLink>
                ) : null}
                {/* Courses and exams are two areas of work, not one screen with
                    a tab strip: a term of courses and a telc sitting share a
                    catalogue table and almost nothing else. */}
                {canAccess(user, 'catalogue') ? (
                  <>
                    <NavLink href="/admin/catalogue" icon={Icon.catalogue} title={t('Kurse', 'Courses')} exact>
                      {t('Kurse', 'Courses')}
                    </NavLink>
                    <NavLink href="/admin/catalogue/exams" icon={Icon.placement} title={t('Prüfungen', 'Exams')}>
                      {t('Prüfungen', 'Exams')}
                    </NavLink>
                  </>
                ) : null}
              </NavGroup>
            ) : null}

            <NavGroup
              id="admin"
              label={t('Verwaltung', 'Management')}
              hrefs={[
                '/admin/applications',
                '/admin/kursplanung',
                '/admin/website',
                '/admin/activity',
                '/admin/team',
              ]}
            >
              {canAccess(user, 'applications') ? (
                <NavLink href="/admin/applications" title={t('Bewerbungen', 'Applications')} icon={Icon.applications}>
                  {t('Bewerbungen', 'Applications')}
                </NavLink>
              ) : null}
              {canAccess(user, 'kursplanung') ? (
                <NavLink
                  href="/admin/kursplanung"
                  icon={Icon.kursplanung}
                  title="Kursplanung"
                  items={[
                    { href: '/admin/kursplanung/kurse', label: t('Kurse', 'Courses') },
                    { href: '/admin/kursplanung/lehrkraefte', label: t('Lehrkräfte', 'Teachers') },
                  ]}
                >
                  Kursplanung
                </NavLink>
              ) : null}
              {/* What the public site says. Opens the editor full screen, outside the shell. */}
              {canAccess(user, 'website') ? (
                <NavLink href="/admin/website" icon={Icon.website} title={t('Website', 'Website')}>
                  Website
                </NavLink>
              ) : null}
              {canAccess(user, 'activity') ? (
                <NavLink href="/admin/activity" icon={Icon.note} title={t('Aktivität', 'Activity')}>
                  {t('Aktivität', 'Activity')}
                </NavLink>
              ) : null}
              {canAccess(user, 'team') ? (
                <NavLink href="/admin/team" icon={Icon.team} title={t('Team', 'Team')}>
                  Team
                </NavLink>
              ) : null}
              {/* On a phone Settings stays in the strip; on a desktop it sits at the foot, beside the person. */}
              <div className="lg:hidden">
                <NavLink href="/admin/settings" title={t('Einstellungen', 'Settings')} icon={Icon.settings} items={settingsItems}>
                  {t('Einstellungen', 'Settings')}
                </NavLink>
              </div>
            </NavGroup>
          </nav>

          {/* Settings — rooms, the lists, the prices: set up once a season, so at the foot, as in every tool. */}
          <nav aria-label={t('Einstellungen', 'Settings')} className="hidden shrink-0 px-3 pt-2 lg:block">
            <NavLink href="/admin/settings" title={t('Einstellungen', 'Settings')} icon={Icon.settings} items={settingsItems}>
              {t('Einstellungen', 'Settings')}
            </NavLink>
          </nav>

          {/* Who is signed in, the way to the website, and out. */}
          <div className="hidden shrink-0 p-2.5 lg:block">
            <div data-rail-foot className="flex items-center gap-0.5 rounded-xl bg-white/[0.045] p-1 ring-1 ring-white/[0.07] ring-inset">
              <Link
                href="/admin/account"
                title={t('Dein Konto', 'Your account')}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors outline-none hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Avatar name={user.name} size={30} tone="rail" />
                <span data-rail-hide className="min-w-0">
                  <span className="block truncate text-[0.82rem] leading-tight font-semibold text-white">{user.name}</span>
                  <span className="block text-[0.7rem] leading-tight text-white/50">{roleLabel(user.role, lang)}</span>
                </span>
              </Link>
              <Link
                href="/"
                title={t('Zur Website', 'The website')}
                aria-label={t('Zur Website', 'The website')}
                data-rail-hide
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors outline-none hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
              >
                {Icon.website}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  title={t('Abmelden', 'Sign out')}
                  aria-label={t('Abmelden', 'Sign out')}
                  className="flex size-7 items-center justify-center rounded-lg text-white/50 transition-colors outline-none hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {Icon.signOut}
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main
          className={cn(
            'flex-1 bg-ws-canvas',
            focus ? 'px-4 py-5 lg:px-6 lg:py-6' : 'px-4 py-5 sm:px-6 lg:px-9 lg:py-8'
          )}
        >
          {/* 1180px, not the public site's wider shells. A workspace table read
              edge to edge on a 27-inch monitor forces the eye across half a metre
              to match a name to a date. A board is the exception: its columns
              are the measure, so focus mode lets it have the width. */}
          <div className={focus ? 'min-w-0' : 'mx-auto max-w-[1180px]'}>{children}</div>
        </main>
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<StaffRole, Bilingual> = {
  owner: { de: 'Inhaber', en: 'Owner' },
  admin: { de: 'Administrator', en: 'Administrator' },
  staff: { de: 'Mitarbeitende', en: 'Staff' },
};

export const roleLabel = (role: StaffRole, lang: WsLang) => pick(lang, ROLE_LABELS[role]);

/**
 * Initials, not a photograph.
 *
 * CLAUDE.md rule 3: the portraits in `public/media/casa/team/` are synthetic
 * placeholders and must not be presented as real staff. An avatar slot filled
 * with one of them would do exactly that, on the account menu of the person
 * looking at it.
 *
 * `rail` on the navy sidebar (a lighter navy disc), `ink` on a white page.
 */
function Avatar({ name, size = 34, tone = 'ink' }: { name: string; size?: number; tone?: 'ink' | 'rail' }) {
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
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        tone === 'rail' ? 'bg-[#2e5288] text-white ring-1 ring-white/15' : 'bg-ws-panel text-ws-on-panel'
      )}
    >
      {initials}
    </span>
  );
}
