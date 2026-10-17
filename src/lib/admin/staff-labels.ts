import type { Bilingual } from './i18n';

/**
 * The staff register's words (0039), client-safe: the kinds of contract, and the views of the list.
 * Roles are a table (`staff_roles`), read with their names in both languages.
 */

/** SchoolMan's `StatusSalaryReference` — Angestellt, Honorar, Aushilfe, Bufdi, Praktikum — and a minijob. */
export const CONTRACT_KINDS = ['employed', 'freelance', 'minijob', 'temporary', 'federal_volunteer', 'intern'] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];
export const CONTRACT_KIND_LABELS: Record<ContractKind, Bilingual> = {
  employed: { de: 'Angestellt', en: 'Employed' },
  freelance: { de: 'Honorarkraft', en: 'Freelance' },
  minijob: { de: 'Minijob', en: 'Mini-job' },
  temporary: { de: 'Aushilfe', en: 'Temporary' },
  federal_volunteer: { de: 'Bundesfreiwilligendienst', en: 'Federal volunteer' },
  intern: { de: 'Praktikum', en: 'Internship' },
};
export const isContractKind = (value: unknown): value is ContractKind => (CONTRACT_KINDS as readonly unknown[]).includes(value);

export const STAFF_VIEWS = ['active', 'teaching', 'office', 'former'] as const;
export type StaffView = (typeof STAFF_VIEWS)[number];
export const STAFF_VIEW_LABELS: Record<StaffView, Bilingual> = {
  active: { de: 'Aktiv', en: 'Active' },
  teaching: { de: 'Unterricht', en: 'Teaching' },
  office: { de: 'Büro', en: 'Office' },
  former: { de: 'Ehemalige', en: 'Former' },
};

/** "Claudia G": first name and the surname's initial, the board's way, when nothing else is given. */
export const suggestShortName = (firstName: string, lastName: string | null) =>
  [firstName.trim().split(/\s+/)[0], lastName?.trim() ? lastName.trim()[0] : null].filter(Boolean).join(' ');
