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

/**
 * What a teacher teaches: SchoolMan's course types on the staff record (`_ID_CourseTypeReference`, 0083).
 * Kursplanung plans those who teach intensive courses.
 */
export const COURSE_KINDS = ['intensive', 'evening', 'special', 'company', 'online', 'exam_prep', 'single', 'closed_group', 'junior', 'summer', 'superintensive', 'extra'] as const;
export type CourseKind = (typeof COURSE_KINDS)[number];
export const COURSE_KIND_LABELS: Record<CourseKind, Bilingual> = {
  intensive: { de: 'Intensivkurs', en: 'Intensive' },
  evening: { de: 'Abendkurs', en: 'Evening' },
  special: { de: 'Spezialkurs', en: 'Special' },
  company: { de: 'Firmenunterricht', en: 'In-company' },
  online: { de: 'Online-Kurs', en: 'Online' },
  exam_prep: { de: 'Prüfungsvorbereitung', en: 'Exam preparation' },
  single: { de: 'Einzelunterricht', en: 'One-to-one' },
  closed_group: { de: 'Geschlossene Gruppe', en: 'Closed group' },
  junior: { de: 'Juniorkurs', en: 'Junior' },
  summer: { de: 'Sommerkurs', en: 'Summer' },
  superintensive: { de: 'Superintensivkurs', en: 'Super-intensive' },
  extra: { de: 'Zusatzkurs', en: 'Extra course' },
};
export const isCourseKind = (value: unknown): value is CourseKind => (COURSE_KINDS as readonly unknown[]).includes(value);

/** SchoolMan's kinds of training (`TrainingReference`, 0092). */
export const TRAINING_KINDS = ['didactics', 'examiner', 'it', 'first_aid', 'data_protection', 'fire_safety', 'quality'] as const;
export type TrainingKind = (typeof TRAINING_KINDS)[number];
export const TRAINING_KIND_LABELS: Record<TrainingKind, Bilingual> = {
  didactics: { de: 'Didaktik', en: 'Teaching methods' },
  examiner: { de: 'Prüferschulung', en: 'Examiner training' },
  it: { de: 'EDV', en: 'IT' },
  first_aid: { de: 'Erste Hilfe', en: 'First aid' },
  data_protection: { de: 'Datenschutz', en: 'Data protection' },
  fire_safety: { de: 'Brandschutz', en: 'Fire safety' },
  quality: { de: 'Qualitätsmanagement', en: 'Quality management' },
};

/** SchoolMan's kinds of leave (`HolidayReference`, 0092). */
export const LEAVE_KINDS = ['holiday', 'special', 'unpaid', 'overtime', 'closure', 'maternity', 'parental'] as const;
export type LeaveKind = (typeof LEAVE_KINDS)[number];
export const LEAVE_KIND_LABELS: Record<LeaveKind, Bilingual> = {
  holiday: { de: 'Urlaub', en: 'Holiday' },
  special: { de: 'Sonderurlaub', en: 'Special leave' },
  unpaid: { de: 'Unbezahlter Urlaub', en: 'Unpaid leave' },
  overtime: { de: 'Ausgleich Überstunden', en: 'Time off in lieu' },
  closure: { de: 'Schließzeit', en: 'Closure' },
  maternity: { de: 'Mutterschutz', en: 'Maternity leave' },
  parental: { de: 'Elternzeit', en: 'Parental leave' },
};

export const STAFF_VIEWS = ['active', 'teaching', 'office', 'former'] as const;
export type StaffView = (typeof STAFF_VIEWS)[number];
export const STAFF_VIEW_LABELS: Record<StaffView, Bilingual> = {
  active: { de: 'Aktiv', en: 'Active' },
  teaching: { de: 'Unterricht', en: 'Teaching' },
  office: { de: 'Büro', en: 'Office' },
  former: { de: 'Ehemalige', en: 'Former' },
};

/** „Vorname N.": the first first name, the last name's initial and a dot (Rahman, 2026-10-22; migration 0081). */
export const suggestShortName = (firstName: string, lastName: string | null) =>
  [firstName.trim().split(/\s+/)[0], lastName?.trim() ? `${lastName.trim()[0]}.` : null].filter(Boolean).join(' ');
