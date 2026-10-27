import { canAccess } from '@/lib/admin/access';
import type { StaffUser } from '@/lib/admin/auth';
import type { T } from '@/lib/admin/i18n';
import { placementTestSwitchedOn } from '@/lib/placement/availability';

import { Icon } from './icons';
import type { CreateItem } from './top-bar-menus';

/**
 * What the search palette (⌘K) and „Neu" offer besides records: the pages this colleague may open and
 * what they may create. Built once on the server from their access, so a page they do not hold is
 * never offered. `keywords` hold the other language's name and the team's other words for it, so
 * „teachers" finds Mitarbeitende in German too.
 */
export type Shortcut = CreateItem & { keywords: string };

/** „Neu": what this colleague may create, wherever they are (the top bar's menu and the palette). */
export function createItems(user: StaffUser, t: T): Shortcut[] {
  return [
    // A walk-in: the person, then straight on into the booking wizard.
    ...(canAccess(user, 'people', 'edit') && canAccess(user, 'bookings', 'edit')
      ? [{ href: '/admin/people?new=1&then=book', label: t('Buchung', 'Booking'), icon: Icon.bookings, keywords: 'neu new buchung booking anmelden' }]
      : []),
    ...(canAccess(user, 'offers', 'edit') ? [{ href: '/admin/offers/new', label: t('Angebot', 'Offer'), icon: Icon.offers, keywords: 'neu new angebot offer' }] : []),
    ...(canAccess(user, 'people', 'edit')
      ? [{ href: '/admin/people?new=1', label: t('Person', 'Person'), icon: Icon.people, keywords: 'neu new person teilnehmende student lernende' }]
      : []),
    ...(canAccess(user, 'catalogue') && canAccess(user, 'rooms', 'edit')
      ? [{ href: '/admin/catalogue?new=1', label: t('Kurstermin', 'Cohort'), icon: Icon.catalogue, keywords: 'neu new kurstermin cohort kurs course start' }]
      : []),
    ...(canAccess(user, 'groups', 'edit') ? [{ href: '/admin/groups?new=1', label: t('Gruppe', 'Group'), icon: Icon.group, keywords: 'neu new gruppe group' }] : []),
    ...(canAccess(user, 'organisations', 'edit')
      ? [{ href: '/admin/organisations?new=1', label: t('Organisation', 'Organisation'), icon: Icon.globe, keywords: 'neu new organisation agentur agency firma company' }]
      : []),
    ...(canAccess(user, 'accommodation', 'edit')
      ? [{ href: '/admin/accommodation?new=1', label: t('Unterkunft', 'Place to stay'), icon: Icon.home, keywords: 'neu new unterkunft accommodation gastfamilie host family wg flat' }]
      : []),
  ];
}

/** Every page of the navigation this colleague may open, with the words it is found by. */
export function pageShortcuts(user: StaffUser, t: T): Shortcut[] {
  const page = (module: Parameters<typeof canAccess>[1] | null, href: string, de: string, en: string, icon: CreateItem['icon'], more = ''): Shortcut[] =>
    module === null || canAccess(user, module) ? [{ href, label: t(de, en), icon, keywords: `${de} ${en} ${more}` }] : [];
  return [
    ...page(null, '/admin', 'Übersicht', 'Overview', Icon.overview, 'start home dashboard'),
    ...page('day', '/admin/day', 'Tagesplan', 'Day plan', Icon.calendar, 'heute today kalender calendar raumplan'),
    ...page('enquiries', '/admin/enquiries', 'Anfragen', 'Enquiries', Icon.enquiries, 'posteingang inbox'),
    ...page('registrations', '/admin/registrations', 'Anmeldungen', 'Registrations', Icon.registrations, 'kursanmeldungen prüfungsanmeldungen course exam registrations posteingang inbox telc'),
    ...(canAccess(user, 'placement') && placementTestSwitchedOn() ? page('placement', '/admin/placement', 'Einstufungstests', 'Placement tests', Icon.placement) : []),
    ...page('people', '/admin/people', 'Teilnehmende', 'Students', Icon.people, 'lernende learners kartei personen people'),
    ...page('bookings', '/admin/bookings', 'Buchungen', 'Bookings', Icon.bookings),
    ...page('offers', '/admin/offers', 'Angebote', 'Offers', Icon.offers),
    ...page('groups', '/admin/groups', 'Gruppen', 'Groups', Icon.group, 'gruppenbesuche visits'),
    ...page('accommodation', '/admin/accommodation', 'Unterkünfte', 'Accommodation', Icon.home, 'gastfamilien host families wg flats'),
    ...page('accommodation', '/admin/accommodation/stays', 'Aufenthalte', 'Stays', Icon.calendar, 'unterkunft accommodation'),
    ...page('accommodation', '/admin/accommodation/occupancy', 'WG-Belegung', 'Flat occupancy', Icon.home, 'wg flats belegung'),
    ...page('organisations', '/admin/organisations', 'Organisationen', 'Organisations', Icon.globe, 'agenturen agencies firmen companies schulen schools'),
    ...page('catalogue', '/admin/catalogue', 'Kurse', 'Courses', Icon.catalogue, 'kurstermine cohorts katalog'),
    ...page('catalogue', '/admin/catalogue/waitlist', 'Wartelisten', 'Waiting lists', Icon.clock, 'warteliste waitlist'),
    ...page('catalogue', '/admin/catalogue/exams', 'Prüfungen', 'Exams', Icon.placement, 'prüfungstermine sittings telc'),
    ...page('staff', '/admin/staff', 'Mitarbeitende', 'Staff', Icon.team, 'lehrkräfte teachers team kollegen'),
    ...page('applications', '/admin/applications', 'Bewerbungen', 'Applications', Icon.applications, 'jobs karriere careers'),
    ...page('kursplanung', '/admin/kursplanung', 'Kursplanung', 'Course planning', Icon.kursplanung, 'planung planning besetzung staffing'),
    ...page('website', '/admin/website', 'Website', 'Website', Icon.website, 'webseite editor texte'),
    ...page('activity', '/admin/activity', 'Aktivität', 'Activity', Icon.note, 'verlauf history protokoll log'),
    ...page('team', '/admin/team', 'Zugänge', 'Accounts', Icon.lock, 'team rechte access konten'),
    ...page(null, '/admin/settings', 'Einstellungen', 'Settings', Icon.settings),
    ...page('prices', '/admin/settings/prices', 'Preise', 'Prices', Icon.money, 'preisliste price list'),
    ...page(null, '/admin/settings/setup', 'Listen', 'Lists', Icon.settings, 'typen types'),
    ...page('rooms', '/admin/settings/rooms', 'Räume', 'Rooms', Icon.rooms),
    ...page(null, '/admin/account', 'Dein Konto', 'Your account', Icon.person, 'passwort password konto account profil'),
  ];
}
