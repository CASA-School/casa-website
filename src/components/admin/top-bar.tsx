import { canAccess } from '@/lib/admin/access';
import type { StaffUser } from '@/lib/admin/auth';
import { getI18n } from '@/lib/admin/i18n.server';
import { cn } from '@/lib/utils';

import { CommandSearch } from './command-search';
import { Icon } from './icons';
import { LangSwitch } from './lang-switch';
import { AccountMenu, CreateMenu, type CreateItem } from './top-bar-menus';

/**
 * The top bar (Rahman, 2026-10-14: "a top nav but very sleek and elegant for
 * some of the functionalities"). Desktop only — on a phone the navy band is
 * already the top bar. What a colleague reaches for from any page: search on
 * the left, then "Neu", the language, and who is signed in. The navigation
 * stays in the sidebar; there is no notification bell until something real
 * would ring it (CLAUDE.md, workspace design standards).
 *
 * Glass over the canvas: it takes the page's own ground, a fine line under it,
 * and the page scrolls softly beneath.
 */
export async function TopBar({
  user,
  roleText,
  siteHref,
  signOutAction,
  focus = false,
}: {
  user: StaffUser;
  /** The role in this language; the shell owns the role names. */
  roleText: string;
  /** The public website, from the admin host too. */
  siteHref: string;
  signOutAction: () => Promise<void>;
  focus?: boolean;
}) {
  const { t } = await getI18n();

  const creates: CreateItem[] = [
    // A walk-in: the person, then straight on into the booking wizard.
    ...(canAccess(user, 'people', 'edit') && canAccess(user, 'bookings', 'edit')
      ? [{ href: '/admin/people?new=1&then=book', label: t('Buchung', 'Booking'), icon: Icon.bookings }]
      : []),
    ...(canAccess(user, 'offers', 'edit') ? [{ href: '/admin/offers/new', label: t('Angebot', 'Offer'), icon: Icon.offers }] : []),
    ...(canAccess(user, 'people', 'edit') ? [{ href: '/admin/people?new=1', label: t('Person', 'Person'), icon: Icon.people }] : []),
    ...(canAccess(user, 'catalogue') && canAccess(user, 'rooms', 'edit')
      ? [{ href: '/admin/catalogue?new=1', label: t('Kurstermin', 'Cohort'), icon: Icon.catalogue }]
      : []),
    ...(canAccess(user, 'groups', 'edit') ? [{ href: '/admin/groups?new=1', label: t('Gruppe', 'Group'), icon: Icon.group }] : []),
    ...(canAccess(user, 'organisations', 'edit') ? [{ href: '/admin/organisations?new=1', label: t('Organisation', 'Organisation'), icon: Icon.globe }] : []),
    ...(canAccess(user, 'accommodation', 'edit') ? [{ href: '/admin/accommodation?new=1', label: t('Unterkunft', 'Place to stay'), icon: Icon.home }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 hidden border-b border-ws-line/70 bg-[color-mix(in_srgb,var(--ws-canvas)_80%,transparent)] backdrop-blur-xl backdrop-saturate-150 lg:block">
      <div className={cn('flex h-14 items-center gap-3', focus ? 'px-6' : 'mx-auto max-w-[calc(1180px+4.5rem)] px-9')}>
        <CommandSearch variant="bar" />
        <div className="ml-auto flex items-center gap-1.5">
          {creates.length ? <CreateMenu items={creates} /> : null}
          <span className="mx-1.5">
            <LangSwitch tone="page" />
          </span>
          <span aria-hidden="true" className="mr-1 h-5 w-px bg-ws-line" />
          <AccountMenu
            name={user.name}
            role={roleText}
            email={user.email}
            siteHref={siteHref}
            signOutAction={signOutAction}
          />
        </div>
      </div>
    </header>
  );
}
