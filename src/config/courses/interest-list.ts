import type { ContentLocale } from '@/lib/content/types';
import { pick } from '@/lib/cms/copy';

/**
 * The interest list (Rahman, 2026-10-09): for a course CASA runs without set
 * dates, people say they want to take part, with their level and when they are
 * free, and CASA forms the group once enough have signed up. Until now those
 * people emailed, rang or came by, and nothing kept the list.
 *
 * Client-safe on purpose: the popup, the API route and the notification mail
 * all read these options, and a client component must not import server code.
 */
export type InterestCourseSlug = 'medical-german';

/** Courses with an interest list instead of a registration, and their names in the form and the mails. */
export const INTEREST_COURSES: Record<InterestCourseSlug, Record<ContentLocale, string>> = {
  'medical-german': { de: 'Deutsch für Pflege und Medizin', en: 'German for nursing and medicine' },
};

export function hasInterestList(slug: string): slug is InterestCourseSlug {
  return slug in INTEREST_COURSES;
}

/** The anchor every "register your interest" link on the course page points at; it opens the popup. */
export const INTEREST_ANCHOR = 'interesse';

type Options<K extends string> = readonly { value: K; label: Record<ContentLocale, string> }[];

export const INTEREST_LEVELS = [
  { value: 'B1', label: { de: 'B1', en: 'B1' } },
  { value: 'B2', label: { de: 'B2', en: 'B2' } },
  { value: 'C1', label: { de: 'C1', en: 'C1' } },
  { value: 'unsure', label: { de: 'Weiß ich nicht', en: 'Not sure' } },
] as const satisfies Options<string>;

export const INTEREST_PROFESSIONS = [
  { value: 'doctor', label: { de: 'Ärztin oder Arzt', en: 'Doctor' } },
  { value: 'nursing', label: { de: 'Pflege', en: 'Nursing' } },
  { value: 'other', label: { de: 'Anderer Gesundheitsberuf', en: 'Other healthcare job' } },
] as const satisfies Options<string>;

export const INTEREST_DAYS = [
  { value: 'mon', label: { de: 'Montag', en: 'Monday' } },
  { value: 'tue', label: { de: 'Dienstag', en: 'Tuesday' } },
  { value: 'wed', label: { de: 'Mittwoch', en: 'Wednesday' } },
  { value: 'thu', label: { de: 'Donnerstag', en: 'Thursday' } },
  { value: 'fri', label: { de: 'Freitag', en: 'Friday' } },
  { value: 'sat', label: { de: 'Samstag', en: 'Saturday' } },
] as const satisfies Options<string>;

export const INTEREST_TIMES = [
  { value: 'morning', label: { de: 'Vormittags', en: 'Mornings' } },
  { value: 'afternoon', label: { de: 'Nachmittags', en: 'Afternoons' } },
  { value: 'evening', label: { de: 'Abends', en: 'Evenings' } },
] as const satisfies Options<string>;

export type InterestLevel = (typeof INTEREST_LEVELS)[number]['value'];
export type InterestProfession = (typeof INTEREST_PROFESSIONS)[number]['value'];
export type InterestDay = (typeof INTEREST_DAYS)[number]['value'];
export type InterestTime = (typeof INTEREST_TIMES)[number]['value'];

/** The labels for a list of option values, in order, joined for a mail or a record. */
export function interestLabels(options: Options<string>, values: readonly string[], locale: ContentLocale) {
  return options.filter((option) => values.includes(option.value)).map((option) => pick(locale, option.label)).join(', ');
}
