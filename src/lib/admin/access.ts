import type { StaffRole, StaffUser } from './auth';

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
  'bookings',
  'planning',
  'catalogue',
  'activity',
  'team',
  'settings',
] as const;

export type WorkspaceModule = (typeof MODULES)[number];

export const LEVELS = ['none', 'view', 'edit', 'full'] as const;
export type AccessLevel = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<AccessLevel, string> = {
  none: 'No access',
  view: 'View',
  edit: 'Edit',
  full: 'Full',
};

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };

export const MODULE_LABELS: Record<WorkspaceModule, string> = {
  overview: 'Overview',
  enquiries: 'Enquiries',
  registrations: 'Registrations',
  placement: 'Placement',
  applications: 'Applications',
  people: 'People',
  bookings: 'Bookings',
  planning: 'Rooms',
  catalogue: 'Courses & exams',
  activity: 'Activity',
  team: 'Team',
  settings: 'Settings',
};

export const MODULE_HREFS: Record<WorkspaceModule, string> = {
  overview: '/admin',
  enquiries: '/admin/enquiries',
  registrations: '/admin/registrations',
  placement: '/admin/placement',
  applications: '/admin/applications',
  people: '/admin/people',
  bookings: '/admin/bookings',
  planning: '/admin/planning',
  catalogue: '/admin/catalogue',
  activity: '/admin/activity',
  team: '/admin/team',
  settings: '/admin/settings',
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
 * per person on the Team screen. `planning` (rooms) is absent for the same
 * reason — one or two people schedule, everyone else reads the cohort.
 */
const STAFF_MODULES: readonly WorkspaceModule[] = [
  'enquiries',
  'registrations',
  'placement',
  'people',
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
  // Overview is `edit` for everyone: it carries the shared day board, which
  // the whole administration team writes on. Settings stays read-only —
  // prices and vocabularies are the super admin's.
  staff: { ...fill('edit', STAFF_MODULES), overview: 'edit', settings: 'view' },
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
