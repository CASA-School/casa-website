/**
 * The telc preparation courses.
 *
 * Booked online since 2026-10-31 (Rahman: „build it"): the registration form offers
 * „Prüfungsvorbereitung" with its terms grouped by exam, and each exam page lists the
 * next ones with a button into the form. The terms are SchoolMan's (`Course`, type
 * Prüfungsvorbereitung), which the bridge brings across and puts on the website
 * (scripts/filemaker/import-courses.mjs); nothing tells a term's exam but its title,
 * so `preparationExamOf` reads it there, as `is_c1h_course` does in the database (0079).
 *
 * `PREPARATION_COURSES` are the fixtures a site without a database offers, as
 * SchoolMan had them on 2026-10-09: each four-week morning course ends just before a
 * telc Deutsch C1 Hochschule exam day, and the B2 preparation runs on two evenings
 * a week.
 */
import type { ContentLocale, PreparationExam, TermSchedule } from '@/lib/content/types';
import { say } from '@/lib/cms/copy';
import { scheduleLine } from '@/lib/registration/term-format';

type Schedule = 'mornings' | 'afternoons' | 'evenings';
type PreparationCourse = { exam: PreparationExam; from: string; to: string; schedule: Schedule };

const c1 = (from: string, to: string, schedule: Schedule = 'mornings'): PreparationCourse => ({ exam: 'telc_c1_hochschule', from, to, schedule });

export const PREPARATION_COURSES: PreparationCourse[] = [
  c1('2026-09-28', '2026-10-23', 'afternoons'),
  c1('2026-10-26', '2026-11-20'),
  c1('2027-01-04', '2027-01-29'),
  c1('2027-02-01', '2027-02-26'),
  c1('2027-03-01', '2027-04-02'),
  c1('2027-04-05', '2027-04-30'),
  c1('2027-05-03', '2027-05-28'),
  c1('2027-05-31', '2027-06-25'),
  c1('2027-08-02', '2027-08-27'),
  c1('2027-08-30', '2027-09-24'),
  c1('2027-09-27', '2027-10-22'),
  c1('2027-10-25', '2027-11-19'),
  { exam: 'telc_b2', from: '2026-10-05', to: '2026-11-09', schedule: 'evenings' },
];

/** The weeks as a stored start holds them. */
export const PREPARATION_SCHEDULES: Record<Schedule, { days: string[]; time: string }> = {
  mornings: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '09:00-12:30' },
  afternoons: { days: ['Mon', 'Tue', 'Wed', 'Thu'], time: '13:00-17:30' },
  evenings: { days: ['Mon', 'Wed'], time: '18:30-20:00' },
};

/** The exam's name, a proper name in both languages. */
export const PREPARATION_EXAM_NAMES: Record<PreparationExam, string> = {
  telc_b2: 'telc Deutsch B2',
  telc_c1_hochschule: 'telc Deutsch C1 Hochschule',
};

/** SchoolMan's title for a preparation: „telc Deutsch C1 Hochschule – Prüfungsvorbereitung". */
export const preparationTitle = (exam: PreparationExam) => `${PREPARATION_EXAM_NAMES[exam]} – Prüfungsvorbereitung`;

/**
 * The exam a preparation term is for, from its title: „telc Deutsch C1 Hochschule – Prüfungsvorbereitung",
 * „C1H …", „B2 Vorbereitungskurs". Null for anything else (TestDaF), which the website does not offer.
 */
export function preparationExamOf(title: string | null | undefined): PreparationExam | null {
  if (!title) return null;
  if (/C1\s*(Hochschule|H\b)/i.test(title)) return 'telc_c1_hochschule';
  if (/\bB2\b/.test(title)) return 'telc_b2';
  return null;
}

type PreparationTerm = { startDate: string; endDate: string; schedule?: TermSchedule | null };

function range(term: PreparationTerm, locale: ContentLocale) {
  const [fy, fm, fd] = term.startDate.split('-');
  const [ty, tm, td] = term.endDate.split('-');
  if (locale === 'de') return `${fd}.${fm}.${fy === ty ? '' : fy}–${td}.${tm}.${ty}`;
  const day = (date: string, withYear: boolean) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' })
      .format(new Date(`${date}T12:00:00Z`));
  return `${day(term.startDate, fy !== ty)} – ${day(term.endDate, true)}`;
}

/** „Mo–Fr, 09:00–12:30 Uhr": the form's schedule line, as a sentence says it. */
const when = (term: PreparationTerm, locale: ContentLocale) => scheduleLine(term.schedule, locale).replace(' · ', ', ');

/**
 * „Die nächsten Vorbereitungskurse, jeweils Mo–Fr, 09:00–12:30 Uhr: 04.01.–29.01.2027,
 * 01.02.–26.02.2027 und 01.03.–02.04.2027." The schedule is said once when the
 * terms share it, after each date when they do not. Null when none is planned.
 */
export function preparationCoursesSentence(terms: PreparationTerm[], locale: ContentLocale) {
  if (!terms.length) return null;
  const shared = terms.every((term) => when(term, locale) === when(terms[0], locale));
  const items = terms.map((term) => (shared ? range(term, locale) : `${range(term, locale)} (${when(term, locale)})`));
  const and = say(locale, ' und ', ' and ');
  const list = items.length > 1 ? `${items.slice(0, -1).join(', ')}${and}${items[items.length - 1]}` : items[0];
  const lead = say(locale, 'Die nächsten Vorbereitungskurse', 'The next preparation courses');
  const each = say(locale, 'jeweils', 'each');
  return shared ? `${lead}, ${each} ${when(terms[0], locale)}: ${list}.` : `${lead}: ${list}.`;
}
