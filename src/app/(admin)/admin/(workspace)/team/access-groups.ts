import {
  ADJUSTABLE,
  hasLevel,
  LEVEL_LABELS,
  MODULE_LABELS,
  resolveAccess,
  roleDefault,
  type WorkspaceModule,
} from '@/lib/admin/access';
import type { StaffRole } from '@/lib/admin/auth';
import { pick, type Bilingual, type WsLang } from '@/lib/admin/i18n';

/**
 * The adjustable modules, grouped and named the way the sidebar shows them, so
 * a colleague granting "Offers" finds it where they would click it.
 *
 * Every adjustable module must appear: `setModuleAccessAction` reads one field
 * per module and refuses the whole form when one is missing. A module added to
 * `access.ts` and not listed here therefore lands in a trailing group rather
 * than silently breaking the save.
 */
const SIDEBAR: readonly { label: Bilingual; modules: readonly WorkspaceModule[] }[] = [
  { label: { de: 'Posteingang', en: 'Inbox' }, modules: ['enquiries', 'registrations'] },
  { label: { de: 'Schule', en: 'School' }, modules: ['people', 'private_data', 'placement', 'bookings', 'offers', 'organisations', 'catalogue'] },
  { label: { de: 'Verwaltung', en: 'Management' }, modules: ['applications', 'staff', 'staff_private', 'kursplanung', 'website', 'activity'] },
  { label: { de: 'Einstellungen', en: 'Settings' }, modules: ['prices', 'rooms'] },
];

const listed = new Set(SIDEBAR.flatMap((group) => group.modules));
const unlisted = ADJUSTABLE.filter((module) => !listed.has(module));

/** Each group's `label` is read with `pick(lang, group.label)`. */
export const ACCESS_GROUPS: readonly { label: Bilingual; modules: readonly WorkspaceModule[] }[] = [
  ...SIDEBAR.map((group) => ({
    label: group.label,
    modules: group.modules.filter((module) => ADJUSTABLE.includes(module)),
  })).filter((group) => group.modules.length > 0),
  ...(unlisted.length ? [{ label: { de: 'Weitere', en: 'Other' }, modules: unlisted }] : []),
];

const ORDERED = ACCESS_GROUPS.flatMap((group) => group.modules);

/** The rail says Students; the module is `people`. A label and its page agree. */
export const moduleLabel = (module: WorkspaceModule, lang: WsLang): string =>
  module === 'people' ? pick(lang, { de: 'Teilnehmende', en: 'Students' }) : pick(lang, MODULE_LABELS[module]);

/** Where a person's access differs from their role's default, in sidebar order. */
export function accessChanges(
  role: StaffRole,
  exceptions: readonly { module: string; level: string }[],
  lang: WsLang
): { module: WorkspaceModule; label: string; raised: boolean }[] {
  const held = resolveAccess(role, exceptions);
  const base = roleDefault(role);
  return ORDERED.filter((module) => held[module] !== base[module]).map((module) => ({
    module,
    label: `${moduleLabel(module, lang)} · ${pick(lang, LEVEL_LABELS[held[module]])}`,
    raised: hasLevel(held[module], base[module]),
  }));
}
