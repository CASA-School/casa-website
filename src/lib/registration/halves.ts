/**
 * THE SECOND HALF OF AN INTENSIVE TERM (Rahman, 2026-10-20: „what if someone wants to start from the
 * second half of a course").
 *
 * An intensive term is one level in eight teaching weeks: the first half (A2.1) in weeks one to four,
 * the second (A2.2) from the fifth. The registration offered the halves but dated a second half from
 * the term's first day. The rule is the workspace's (`halfLevelEnd`, lib/admin/booking-levels): a
 * teaching week is a week with a class day on which the school is open (config/school-closures), so
 * the Christmas break moves the 23 Nov afternoon term's second half to 4 January.
 *
 * A date is given only where the term has exactly eight teaching weeks. A term with more (the nine-week
 * summer term, a term over Easter 2027 before CASA has set that closure) does not say which week is the
 * fifth, so the site says „ab der 5. Kurswoche" rather than guess. Client-safe.
 */
import { isSchoolClosed } from '@/config/school-closures';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TEACHING_WEEKS = 8;
const HALF = 4;

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** The first class day of the fifth teaching week, or null where the term does not have exactly eight. */
export function secondHalfStart(start: string, end: string, days?: readonly string[] | null): string | null {
  const classDays = days?.length ? days : WEEKDAYS.slice(0, 5);
  const monday = addDays(start, -((new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7));
  const weekStarts: string[] = [];
  for (let week = monday; week <= end; week = addDays(week, 7)) {
    for (let i = 0; i < 7; i++) {
      const day = addDays(week, i);
      if (day >= start && day <= end && classDays.includes(WEEKDAYS[i]) && !isSchoolClosed(day)) {
        weekStarts.push(day);
        break;
      }
    }
  }
  return weekStarts.length === TEACHING_WEEKS ? weekStarts[HALF] : null;
}

/** A level code that is a second half: 'A2.2', 'B1+.2'. */
export const isSecondHalf = (level: string | null | undefined) => Boolean(level && /\.2$/.test(level));
