/**
 * A stay's length, from its dates.
 *
 * Dates are `YYYY-MM-DD` strings and the arithmetic is done on UTC midnights,
 * so a stay across the October clock change is still 13 nights and not
 * 12.96. (A Postgres `date` read through `pg` is a LOCAL midnight — see
 * src/lib/dates.ts — which is why nothing here takes a `Date`.)
 */

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function utc(value: string): number {
  const [y, m, d] = value.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function addDays(value: string, days: number): string {
  return new Date(utc(value) + days * 86_400_000).toISOString().slice(0, 10);
}

export type StayLength = { nights: number; weeks: number };

/**
 * Nights, and the weeks the stay is priced as. A group arrives on a Sunday and
 * leaves on the Saturday — "1 week (7 days/6 nights)" in CASA's offers — so a
 * week is up to seven nights, and 13 nights are two weeks, not one and six
 * sevenths.
 */
export function stayLength(arrival: string | null, departure: string | null): StayLength | null {
  if (!isIsoDate(arrival) || !isIsoDate(departure)) return null;
  const nights = daysBetween(arrival, departure);
  if (nights <= 0) return null;
  return { nights, weeks: Math.ceil(nights / 7) };
}
