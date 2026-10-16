import type { StaffRole, StaffUser } from './auth';
import type { Bilingual } from './i18n';

/**
 * Modules, and how much of each a person may do.
 *
 * The workspace is a set of modules. Each has one entry here — its label, its
 * route, the level each role gets by default — and every screen in it sits
 * under a layout that calls `requireModule`. A person's effective access is
 * the role default overlaid with the exceptions in `staff_module_access`,
 * resolved once per request in `getStaffUser`.
 *
 * Levels are ordered. `view` reads, `edit` creates and changes, `full` also
 * deletes and does the irreversible things. An action asks for the level it
 * needs; a screen asks for `view`.
 *
 * Three places read this and nowhere else decides access: the sidebar (what
 * to show), the module layouts (what to serve), and the server actions (what
 * to execute). Hiding a link is not access control; the layout and the action
 * are.
 */

export const MODULES = [
  'overview',
  'enquiries',
  'registrations',
  'placement',
  'applications',
  'people',
  'private_data',
  'bookings',
  'offers',
  'rooms',
  'prices',
  'catalogue',
  'kursplanung',
  'website',
  'activity',
  'team',
  'settings',
] as const;

export type WorkspaceModule = (typeof MODULES)[number];

export const LEVELS = ['none', 'view', 'edit', 'full'] as const;
export type AccessLevel = (typeof LEVELS)[number];

/** Read with `pick(lang, LEVEL_LABELS[level])` (docs/ADMIN_I18N.md). */
export const LEVEL_LABELS: Record<AccessLevel, Bilingual> = {
  none: { de: 'Kein Zugriff', en: 'No access' },
  view: { de: 'Ansehen', en: 'View' },
  edit: { de: 'Bearbeiten', en: 'Edit' },
  full: { de: 'Vollzugriff', en: 'Full' },
};

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };

/** Read with `pick(lang, MODULE_LABELS[module])`. */
export const MODULE_LABELS: Record<WorkspaceModule, Bilingual> = {
  overview: { de: 'Übersicht', en: 'Overview' },
  enquiries: { de: 'Anfragen', en: 'Enquiries' },
  registrations: { de: 'Anmeldungen', en: 'Registrations' },
  placement: { de: 'Einstufungstests', en: 'Placement' },
  applications: { de: 'Bewerbungen', en: 'Applications' },
  people: { de: 'Teilnehmende', en: 'People' },
  private_data: { de: 'Bankverbindungen', en: 'Bank details' },
  bookings: { de: 'Buchungen', en: 'Bookings' },
  offers: { de: 'Angebote', en: 'Offers' },
  rooms: { de: 'Räume', en: 'Rooms' },
  prices: { de: 'Preise', en: 'Prices' },
  catalogue: { de: 'Kurse & Prüfungen', en: 'Courses & exams' },
  kursplanung: { de: 'Kursplanung', en: 'Kursplanung' },
  website: { de: 'Website', en: 'Website' },
  activity: { de: 'Aktivität', en: 'Activity' },
  team: { de: 'Team', en: 'Team' },
  settings: { de: 'Einstellungen', en: 'Settings' },
};

/** Modules that cannot be taken away: the frame the rest hangs on. */
export const ALWAYS_ON: readonly WorkspaceModule[] = ['overview', 'settings'];

/** Modules a per-person exception may change. Team is owner/admin by role only. */
export const ADJUSTABLE: readonly WorkspaceModule[] = MODULES.filter(
  (m) => !ALWAYS_ON.includes(m) && m !== 'team'
);

export type Access = Record<WorkspaceModule, AccessLevel>;

/**
 * What a `staff` account gets by default.
 *
 * `applications` is deliberately absent: job applications are management's, not
 * the administration team's daily work, so an administrator grants that module
 * per person on the Team screen. `rooms` is absent for the same reason — a room
 * and its capacity are defined once and change rarely, so one or two people
 * maintain them and everyone else just reads the cohort they are attached to.
 * `kursplanung` is absent because who teaches which course is management's
 * decision; the board is opened per person, like Applications. `website` is
 * absent too: what the public site says is opened per person on the Team
 * screen — `edit` drafts and asks for approval, `full` also publishes.
 * `offers` is absent for the same reason: offers are made by the people who
 * make them — the group coordinator, and whoever answers learners and
 * companies — so the module is opened per person (`edit` writes and sends,
 * `full` also deletes). `prices` is absent because the price list is finance's
 * and management's: owners and administrators hold it, and a colleague in
 * finance is given it on the Team screen (`edit` changes prices and prepares
 * next year's list, `full` also deletes a list that has not started).
 * `private_data` — a learner's bank details — is the team's (Rahman, 2026-10-16:
 * "the staff should be able to write the information of the students like bank
 * details"): `edit` adds and corrects an account, removing one is `full`. It stays
 * its own module, so it is checked on the server like every other and can be
 * withdrawn from one person on the Team screen.
 */
const STAFF_MODULES: readonly WorkspaceModule[] = [
  'enquiries',
  'registrations',
  'placement',
  'people',
  'private_data',
  'bookings',
  'catalogue',
  'activity',
];

function fill(level: AccessLevel, only?: readonly WorkspaceModule[]): Access {
  const out = {} as Access;
  for (const m of MODULES) out[m] = only && !only.includes(m) ? 'none' : level;
  return out;
}

const ROLE_DEFAULTS: Record<StaffRole, Access> = {
  owner: fill('full'),
  admin: fill('full'),
  // Overview is the start page and only reads. Settings stays read-only —
  // the vocabularies are the super admin's, the prices finance's (`prices`).
  staff: { ...fill('edit', STAFF_MODULES), overview: 'view', settings: 'view' },
};

export const isModule = (value: string): value is WorkspaceModule =>
  (MODULES as readonly string[]).includes(value);

export const isLevel = (value: string): value is AccessLevel =>
  (LEVELS as readonly string[]).includes(value);

/** Role default overlaid with a person's exceptions. */
export function resolveAccess(
  role: StaffRole,
  exceptions: readonly { module: string; level: string }[]
): Access {
  const access: Access = { ...ROLE_DEFAULTS[role] };
  for (const e of exceptions) {
    if (!isModule(e.module) || !isLevel(e.level) || !ADJUSTABLE.includes(e.module)) continue;
    access[e.module] = e.level;
  }
  for (const m of ALWAYS_ON) if (access[m] === 'none') access[m] = 'view';
  return access;
}

export const roleDefault = (role: StaffRole): Access => ROLE_DEFAULTS[role];

export const hasLevel = (held: AccessLevel, needed: AccessLevel): boolean =>
  RANK[held] >= RANK[needed];

/** May this person do `level` in `module`? Defaults to opening it. */
export const canAccess = (
  user: StaffUser,
  module: WorkspaceModule,
  level: AccessLevel = 'view'
): boolean => hasLevel(user.access[module], level);
