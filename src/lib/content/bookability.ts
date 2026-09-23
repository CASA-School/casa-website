import { addDays, bremenDate } from '@/lib/appointments/schedule';
import { toDateInputValue } from '@/lib/dates';

/**
 * Which published terms and exam sittings a learner can still book.
 *
 * The fixture tables are CASA's real published dates, not dates generated
 * relative to today, so they age: by late September the homepage said "Nächster
 * Start: 3. Aug. 2026", every course page said "Anmeldung geschlossen", and the
 * registration form pre-selected a term that had already begun. Every public
 * surface now asks these functions, with the request's own date, rather than
 * taking the first row of a list.
 *
 * Dates are `YYYY-MM-DD` strings compared as strings, and "today" is Bremen's
 * calendar day whatever zone the server runs in. No db import here, so a client
 * component may use it.
 */

type CourseTerm = { start_date: string; end_date: string; status: string };

type ExamSitting = { starts_at: string; registration_deadline: string | null; status: string };

/** Bremen's calendar day, `YYYY-MM-DD`. */
export const bremenToday = (now: Date = new Date()): string => bremenDate(now);

type CourseEntryRule = 'term-start' | 'any-day' | 'mondays';

/*
 * How a learner joins a term, per format, as CASA publishes it.
 *
 * - Evening German: „Mit Vorkenntnissen ist der Einstieg in einen laufenden Kurs
 *   jederzeit möglich, solange Plätze frei sind" (course-practical-facts.ts), so
 *   a term stays on offer until its last day. Beginners at A1.1 must start on the
 *   first day; the placement decides that, not the term list.
 * - Bildungszeit: joins on any Monday of a term ("join any Monday",
 *   docs/COURSE_FACTS_SOURCE_OF_TRUTH.md), so a term stays on offer until its
 *   last Monday.
 * - Everything else, Intensive German included: from the first day only. CASA
 *   publishes monthly starts across the two cohorts, not entry into a term
 *   already under way, so a term that has begun is no longer offered.
 *
 * Widen a format here only once CASA publishes that it may be joined late.
 */
const entryRuleBySlug: Partial<Record<string, CourseEntryRule>> = {
  'evening-german': 'any-day',
  bildungszeit: 'mondays',
};

/** Monday = 1 ... Sunday = 7, for a `YYYY-MM-DD` date. */
function isoWeekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
}

/** The last day of a term on which a learner can still join it. */
export function lastCourseEntryDate(term: CourseTerm, slug: string): string {
  const rule = entryRuleBySlug[slug] ?? 'term-start';

  if (rule === 'any-day') {
    return term.end_date;
  }

  if (rule === 'mondays') {
    const lastMonday = addDays(term.end_date, 1 - isoWeekday(term.end_date));
    return lastMonday > term.start_date ? lastMonday : term.start_date;
  }

  return term.start_date;
}

export function isCourseTermBookable(term: CourseTerm, slug: string, today: string): boolean {
  return term.status === 'scheduled' && today <= lastCourseEntryDate(term, slug);
}

/**
 * The next day a learner can start in this term: its first day, or for
 * Bildungszeit the coming Monday. Null when the term is no longer bookable, and
 * for an evening term already under way — that is joined, it has no start date.
 */
export function nextCourseStartDate(term: CourseTerm, slug: string, today: string): string | null {
  if (!isCourseTermBookable(term, slug, today)) {
    return null;
  }

  if (today <= term.start_date) {
    return term.start_date;
  }

  if (entryRuleBySlug[slug] === 'mondays') {
    return addDays(today, (8 - isoWeekday(today)) % 7);
  }

  return null;
}

/**
 * A sitting is bookable until its registration deadline has passed — the
 * deadline day itself included — and never once it has started.
 *
 * The deadline goes through `toDateInputValue`, because with a database attached
 * `pg` hands a `date` column over as a JS Date at local midnight. Pasted into a
 * `${value}T00:00:00Z` string that became an Invalid Date, which no comparison
 * ever rejects, so every past deadline read as open.
 */
export function isExamSittingBookable(sitting: ExamSitting, now: Date = new Date()): boolean {
  if (sitting.status !== 'scheduled') {
    return false;
  }

  if (!(new Date(sitting.starts_at).getTime() > now.getTime())) {
    return false;
  }

  const deadline = toDateInputValue(sitting.registration_deadline);
  return !deadline || bremenToday(now) <= deadline;
}
