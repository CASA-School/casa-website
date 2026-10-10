/**
 * The telc preparation courses, from FileMaker (`Course`, type
 * Prüfungsvorbereitung), read 2026-10-09.
 *
 * Each four-week morning course ends just before a telc Deutsch C1 Hochschule
 * exam day, and casa-bremen.de listed the next ones on its C1 page; the move
 * had lost them. The B2 preparation runs on two evenings a week; its only
 * course in FileMaker began on 05.10.2026, so the B2 page lists none yet.
 * Add new courses here when CASA plans them in FileMaker.
 */
import type { ContentLocale } from '@/lib/content/types';
import { pick, say } from '@/lib/cms/copy';

type Schedule = 'mornings' | 'afternoons' | 'evenings';
export type PreparationCourse = { exam: 'telc_b2' | 'telc_c1_hochschule'; from: string; to: string; schedule: Schedule };

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

const SCHEDULE: Record<Schedule, Record<ContentLocale, string>> = {
  mornings: { de: 'Mo–Fr, 9–12:30 Uhr', en: 'Mon–Fri, 9:00–12:30' },
  afternoons: { de: 'Mo–Do, 13–17:30 Uhr', en: 'Mon–Thu, 13:00–17:30' },
  evenings: { de: 'Mo und Mi, 18:30–20 Uhr', en: 'Mon and Wed, 18:30–20:00' },
};

/** The next courses that have not started by `today` (YYYY-MM-DD). */
export function nextPreparationCourses(exam: PreparationCourse['exam'], today: string, count = 3) {
  return PREPARATION_COURSES.filter((course) => course.exam === exam && course.from > today).slice(0, count);
}

function range(course: PreparationCourse, locale: ContentLocale) {
  const [fy, fm, fd] = course.from.split('-');
  const [ty, tm, td] = course.to.split('-');
  if (locale === 'de') return `${fd}.${fm}.${fy === ty ? '' : fy}–${td}.${tm}.${ty}`;
  const day = (date: string, withYear: boolean) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' })
      .format(new Date(`${date}T12:00:00Z`));
  return `${day(course.from, fy !== ty)} – ${day(course.to, true)}`;
}

/**
 * „Die nächsten Vorbereitungskurse, jeweils Mo–Fr, 9–12:30 Uhr: 26.10.–20.11.2026,
 * 04.01.–29.01.2027 und 01.02.–26.02.2027." The schedule is said once when the
 * courses share it, after each date when they do not. Empty when none is planned.
 */
export function preparationCoursesSentence(courses: PreparationCourse[], locale: ContentLocale) {
  if (!courses.length) return null;
  const shared = courses.every((course) => course.schedule === courses[0].schedule);
  const items = courses.map((course) => (shared ? range(course, locale) : `${range(course, locale)} (${pick(locale, SCHEDULE[course.schedule])})`));
  const and = say(locale, ' und ', ' and ');
  const list = items.length > 1 ? `${items.slice(0, -1).join(', ')}${and}${items[items.length - 1]}` : items[0];
  const lead = say(locale, 'Die nächsten Vorbereitungskurse', 'The next preparation courses');
  const each = say(locale, 'jeweils', 'each');
  return shared ? `${lead}, ${each} ${pick(locale, SCHEDULE[courses[0].schedule])}: ${list}.` : `${lead}: ${list}.`;
}
