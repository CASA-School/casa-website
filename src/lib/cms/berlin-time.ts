/**
 * Bremen wall-clock time for scheduled publishing.
 *
 * A colleague who schedules a price change for "1 January, 00:00" means
 * midnight in Bremen, whatever zone the server or their laptop runs in. The
 * form sends the local value of a `datetime-local` input; this turns it into
 * the instant, across summer and winter time.
 */

function berlinOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** `2027-01-01T00:00` in Bremen, as an instant; null for anything else. */
export function berlinLocalToDate(local: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wall;
  for (let pass = 0; pass < 2; pass += 1) instant = wall - berlinOffsetMinutes(new Date(instant)) * 60_000;
  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result;
}

/** "1. Jan. 2027, 00:00" style, in Bremen time, for the editor's lists. */
export function formatBerlin(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
