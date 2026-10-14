import { WEEKDAYS, type Weekday } from './types';

/**
 * Planning weeks.
 *
 * A course month is not a calendar month. It starts on a Monday: the Monday of
 * the week the 1st falls in, or the following Monday when the 1st is a
 * weekend day — which is how the sheet has always done it (June 29 for July
 * 2026, August 3 for August, August 31 for September, September 28 for
 * October). It runs until the next month's start, so it has four weeks and
 * occasionally five (July 2026).
 *
 * Everything is computed in UTC on `yyyy-mm-dd` strings. A local-time Date at
 * midnight is the classic way to lose a day at the DST boundary.
 */

export type PlanningWeek = {
  /** Monday, `yyyy-mm-dd`. */
  start: string;
  /** ISO week number, the KW the planners quote. */
  kw: number;
  /** `28.09.–02.10.` */
  label: string;
  /** The five weekdays as dates, Monday first. */
  days: readonly string[];
};

const DAY_MS = 86_400_000;

export function parseIso(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return toIso(new Date(parseIso(date).getTime() + days * DAY_MS));
}

/** `yyyy-mm` → the Monday the planning month starts on. */
export function monthStart(month: string): string {
  const first = parseIso(`${month.slice(0, 7)}-01`);
  const dow = first.getUTCDay(); // 0 Sunday … 6 Saturday
  const shift = dow === 0 ? 1 : dow === 6 ? 2 : -(dow - 1);
  return toIso(new Date(first.getTime() + shift * DAY_MS));
}

export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function isoWeek(date: string): number {
  const d = parseIso(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
}

const ddmm = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}.`;

export function planningWeeks(month: string): PlanningWeek[] {
  const start = monthStart(month);
  const end = monthStart(nextMonth(month.slice(0, 7)));
  const weeks: PlanningWeek[] = [];
  for (let monday = start; monday < end; monday = addDays(monday, 7)) {
    const days = WEEKDAYS.map((_, i) => addDays(monday, i));
    weeks.push({
      start: monday,
      kw: isoWeek(monday),
      label: `${ddmm(days[0])}–${ddmm(days[4])}`,
      days,
    });
  }
  return weeks;
}

/** `Mo`…`Fr` for a date, or null on a weekend. */
export function weekdayOf(date: string): Weekday | null {
  const dow = parseIso(date).getUTCDay();
  return dow >= 1 && dow <= 5 ? WEEKDAYS[dow - 1] : null;
}

/** The Monday of the week a date falls in. */
export function weekStartOf(date: string): string {
  const dow = parseIso(date).getUTCDay() || 7;
  return addDays(date, -(dow - 1));
}

const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** `2026-10` or `2026-10-01` → `Oktober 2026`. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_DE[m - 1]} ${y}`;
}
