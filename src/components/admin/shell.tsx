import Link from 'next/link';
import type { ReactNode } from 'react';

import { CommandSearch } from './command-search';
import { LangSwitch } from './lang-switch';
import { Icon } from './icons';
import { NavGroup, NavLink } from './nav-link';
import { SidebarToggle } from './sidebar-toggle';
import { TopBar } from './top-bar';
import { AccountMenu } from './top-bar-menus';
import { canAccess } from '@/lib/admin/access';
import type { StaffRole, StaffUser } from '@/lib/admin/auth';
import { pick, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { publicSiteOrigin } from '@/lib/cms/origins';
import { placementTestSwitchedOn } from '@/lib/placement/availability';
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
 * type, the navigation in its groups, Settings at the foot. What a colleague
 * reaches for from any page — search (⌘K), "Neu", the language, who is signed
 * in — sits in a slim glass top bar over the page (`TopBar`, 2026-10-14), so
 * the sidebar is navigation and nothing else.
 *
 * Navigation and nothing it does not need: no queue counts beside the labels
 * (backlogs, not notifications), one fine marker for "you are here".
 *
 * On desktop the sidebar collapses to icons (`SidebarToggle`, CSS in
 * globals.css). On a phone it is a navy band at the top: the logo, the
 * language, search and the account, then the destinations as a horizontal
 * scroller; the top bar is desktop only.
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
  const [{ t, lang }, site] = await Promise.all([getI18n(), publicSiteOrigin()]);
  const siteHref = `${site}/`;
  const roleText = roleLabel(user.role, lang);
  // Rooms, the type lists and the price list: defined once and left alone for a season.
  // The price list is finance's and management's (module `prices`).
  const settingsItems = [
    ...(canAccess(user, 'prices') ? [{ href: '/admin/settings/prices', label: t('Preise', 'Prices') }] : []),
    { href: '/admin/settings/setup', label: t('Listen', 'Lists') },
    ...(canAccess(user, 'rooms') ? [{ href: '/admin/settings/rooms', label: t('Räume', 'Rooms') }] : []),
  ];
  const placementReview = canAccess(user, 'placement') && placementTestSwitchedOn();

  return (
    <div className={cn('casa-workspace-shell flex min-h-dvh flex-col lg:flex-row', focus && 'casa-workspace-focus')}>
      <aside className="casa-workspace-rail w-full shrink-0 self-start bg-[linear-gradient(180deg,var(--ws-rail-top)_0%,var(--ws-rail)_45%)] text-white lg:sticky lg:top-0 lg:h-dvh lg:w-[15.5rem] lg:transition-[width] lg:duration-200 lg:ease-out motion-reduce:transition-none">
        <div className="flex h-full flex-col overflow-x-hidden">
          <div data-rail-head className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
            {/* The name in type, nothing else (Rahman, 2026-10-14): set in the workspace's display serif, as the logo's lettering is. */}
            <Link
              href="/admin"
              aria-label={t('CASA, Übersicht', 'CASA, Overview')}
              data-rail-brand
              className="rounded-md px-1 font-[family-name:var(--font-display)] text-[1.4rem] leading-none font-semibold tracking-[0.06em] text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              CASA
            </Link>
            <span className="flex items-center gap-1 lg:hidden">
              <LangSwitch />
              <CommandSearch variant="rail-icon" />
              <AccountMenu
                tone="rail"
                name={user.name}
                role={roleText}
                email={user.email}
                siteHref={siteHref}
                signOutAction={signOutAction}
              />
            </span>
            {focus ? null : <SidebarToggle />}
          </div>

          <nav
            aria-label={t('Arbeitsbereich', 'Workspace')}
            className="flex snap-x gap-1 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-x-hidden lg:overflow-y-auto lg:pb-6 lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]"
          >
            <NavLink href="/admin" icon={Icon.overview} title={t('Übersicht', 'Overview')}>
              {t('Übersicht', 'Overview')}
            </NavLink>

            {canAccess(user, 'enquiries') || canAccess(user, 'registrations') || placementReview ? (
              <NavGroup
                id="inbox"
                label={t('Posteingang', 'Inbox')}
                hrefs={['/admin/enquiries', '/admin/registrations', '/admin/placement']}
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
                {/* CASA's own online placement test: its results come in from the website and wait
                    for a teacher, like an enquiry. Shown only where the test is switched on — on the
                    live site it is closed and the Klett tests are used. */}
                {placementReview ? (
                  <NavLink href="/admin/placement" icon={Icon.placement} title={t('Einstufungstests', 'Placement tests')}>
                    {t('Einstufungstests', 'Placement tests')}
                  </NavLink>
                ) : null}
              </NavGroup>
            ) : null}

            {canAccess(user, 'people') ||
            canAccess(user, 'bookings') ||
            canAccess(user, 'offers') ||
            canAccess(user, 'groups') ||
            canAccess(user, 'organisations') ||
            canAccess(user, 'catalogue') ? (
              <NavGroup
                id="school"
                label={t('Schule', 'School')}
                hrefs={['/admin/people', '/admin/bookings', '/admin/offers', '/admin/groups', '/admin/organisations', '/admin/catalogue']}
              >
                {canAccess(user, 'people') ? (
                  <NavLink href="/admin/people" title={t('Teilnehmende', 'Students')} icon={Icon.people}>
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
                {/* Group visits follow the offers they grow out of: a class or a team that comes together. */}
                {canAccess(user, 'groups') ? (
                  <NavLink href="/admin/groups" icon={Icon.group} title={t('Gruppen', 'Groups')}>
                    {t('Gruppen', 'Groups')}
                  </NavLink>
                ) : null}
                {/* The agencies, companies, schools and offices CASA works with: who pays a booking,
                    whom an offer is for, an agency's commission. */}
                {canAccess(user, 'organisations') ? (
                  <NavLink href="/admin/organisations" icon={Icon.globe} title={t('Organisationen', 'Organisations')}>
                    {t('Organisationen', 'Organisations')}
                  </NavLink>
                ) : null}
                {/* Courses and exams are two areas of work, not one screen with
                    a tab strip: a term of courses and a telc sitting share a
                    catalogue table and almost nothing else. */}
                {canAccess(user, 'catalogue') ? (
                  <>
                    {/* Courses stand alone (a start's and a course's pages are under it); the waiting lists,
                        of courses and exams alike, are their own item (Rahman, 2026-10-17). */}
                    <NavLink
                      href="/admin/catalogue"
                      icon={Icon.catalogue}
                      title={t('Kurse', 'Courses')}
                      exclude={['/admin/catalogue/exams', '/admin/catalogue/waitlist']}
                    >
                      {t('Kurse', 'Courses')}
                    </NavLink>
                    <NavLink href="/admin/catalogue/waitlist" icon={Icon.clock} title={t('Wartelisten', 'Waiting lists')}>
                      {t('Wartelisten', 'Waiting lists')}
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
                '/admin/staff',
                '/admin/applications',
                '/admin/kursplanung',
                '/admin/website',
                '/admin/activity',
                '/admin/team',
              ]}
            >
              {/* Everyone who works at CASA (0039): teachers, office, management. */}
              {canAccess(user, 'staff') ? (
                <NavLink href="/admin/staff" title={t('Mitarbeitende', 'Staff')} icon={Icon.team}>
                  {t('Mitarbeitende', 'Staff')}
                </NavLink>
              ) : null}
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
                // Who signs in, and with which rights: the accounts, apart from the register of staff.
                <NavLink href="/admin/team" icon={Icon.lock} title={t('Zugänge', 'Accounts')}>
                  {t('Zugänge', 'Accounts')}
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
          <nav aria-label={t('Einstellungen', 'Settings')} className="hidden shrink-0 px-3 pt-2 pb-4 lg:block">
            <NavLink href="/admin/settings" title={t('Einstellungen', 'Settings')} icon={Icon.settings} items={settingsItems}>
              {t('Einstellungen', 'Settings')}
            </NavLink>
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} roleText={roleText} siteHref={siteHref} signOutAction={signOutAction} focus={focus} />
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
