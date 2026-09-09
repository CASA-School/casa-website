import type { StaffRole, StaffUser } from './auth';

/**
 * Modules, and who may open them.
 *
 * The workspace is a set of modules. Each has one entry here — its route
 * prefix, its label, and the roles that get it by default — and every screen
 * in it sits under a layout that calls `requireModule`. A person's effective
 * set is the role default plus or minus the exceptions in
 * `staff_module_access`, resolved once per request in `getStaffUser`.
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
  'planning',
  'catalogue',
  'activity',
  'team',
  'settings',
] as const;

export type WorkspaceModule = (typeof MODULES)[number];

export const MODULE_LABELS: Record<WorkspaceModule, string> = {
  overview: 'Overview',
  enquiries: 'Enquiries',
  registrations: 'Registrations',
  placement: 'Placement',
  applications: 'Applications',
  people: 'People',
  planning: 'Planning',
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
  planning: '/admin/planning',
  catalogue: '/admin/catalogue',
  activity: '/admin/activity',
  team: '/admin/team',
  settings: '/admin/settings',
};

/** Modules that cannot be taken away: the frame the rest hangs on. */
export const ALWAYS_ON: readonly WorkspaceModule[] = ['overview', 'settings'];

/** Modules a per-person exception may switch. */
export const ADJUSTABLE: readonly WorkspaceModule[] = MODULES.filter(
  (m) => !ALWAYS_ON.includes(m) && m !== 'team'
);

const ROLE_DEFAULTS: Record<StaffRole, readonly WorkspaceModule[]> = {
  owner: MODULES,
  admin: MODULES,
  staff: [
    'overview',
    'enquiries',
    'registrations',
    'placement',
    'applications',
    'people',
    'catalogue',
    'activity',
    'settings',
  ],
};

export const isModule = (value: string): value is WorkspaceModule =>
  (MODULES as readonly string[]).includes(value);

/** Role default combined with a person's exceptions. */
export function resolveModules(
  role: StaffRole,
  exceptions: readonly { module: string; allowed: boolean }[]
): WorkspaceModule[] {
  const set = new Set<WorkspaceModule>(ROLE_DEFAULTS[role]);
  for (const e of exceptions) {
    if (!isModule(e.module) || !ADJUSTABLE.includes(e.module)) continue;
    // Team is owner/admin only and is never granted by exception.
    if (e.allowed) set.add(e.module);
    else set.delete(e.module);
  }
  for (const m of ALWAYS_ON) set.add(m);
  return MODULES.filter((m) => set.has(m));
}

export const canAccess = (user: StaffUser, module: WorkspaceModule): boolean =>
  user.modules.includes(module);

export const roleDefault = (role: StaffRole): readonly WorkspaceModule[] => ROLE_DEFAULTS[role];
