/**
 * Date-only values, without the timezone shift.
 *
 * A Postgres `date` comes back from `pg` as a JavaScript `Date` at LOCAL
 * midnight. `toISOString()` then converts to UTC, and for any positive offset
 * — Germany is +1 or +2 — that lands on the previous day. A birth date stored
 * as 1998-03-14 rendered as "13 March 1998", and a cohort starting 28.09
 * prefilled an accommodation form with 27.09.
 *
 * So a date-only value is formatted from its LOCAL components, never through
 * UTC. No db import here, so client components may use it.
 */

/** `YYYY-MM-DD` from local components, for a `<input type="date">`. */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    // Already date-only, or a timestamp whose date part is what we want.
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
  }
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/** Today, as the person in front of the screen would write it. */
export const todayInputValue = (): string => toDateInputValue(new Date());

const pad = (n: number) => String(n).padStart(2, '0');
