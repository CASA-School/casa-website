import type { WsLang } from '../i18n';

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

/**
 * The calendar rule's weeks of a month. The board's months are CASA's course blocks, read from the
 * database (`planWeeks` in repo.ts, `planning_month_start` 0079); this rule is the one the database
 * falls back to for a month no intensive start opens yet.
 */
export function planningWeeks(month: string): PlanningWeek[] {
  return weeksBetween(monthStart(month), monthStart(nextMonth(month.slice(0, 7))));
}

/** The weeks from one Monday up to (not including) another. */
export function weeksBetween(start: string, end: string): PlanningWeek[] {
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

const MONTHS: Record<WsLang, readonly string[]> = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const WEEKDAY_NAMES: Record<WsLang, readonly string[]> = {
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/**
 * Two days as one range, the year once: „Montag, 19. – Freitag, 23. Oktober 2026", „Monday 30 November –
 * Friday 4 December 2026"; `short`: „19.10.–23.10.2026". Built by hand: Intl's ranges differ between the
 * server's ICU and the browser's by a space, which broke the board's hydration (2026-10-22).
 */
export function rangeLabel(from: string, to: string, lang: WsLang, style: 'long' | 'short' = 'long'): string {
  const [fy, fm, fd] = from.split('-').map(Number), [ty, tm, td] = to.split('-').map(Number);
  const sameYear = fy === ty, sameMonth = sameYear && fm === tm;
  if (style === 'short') {
    const p = (d: number, m: number) => (lang === 'de' ? `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.` : `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`);
    const year = (y: number) => (lang === 'de' ? `${y}` : `/${y}`);
    return `${p(fd, fm)}${sameYear ? '' : year(fy)}–${p(td, tm)}${year(ty)}`;
  }
  const part = (iso: string, d: number, m: number, y: number, month: boolean, year: boolean) => {
    const wd = WEEKDAY_NAMES[lang][parseIso(iso).getUTCDay()];
    return lang === 'de'
      ? `${wd}, ${d}.${month ? ` ${MONTHS.de[m - 1]}` : ''}${year ? ` ${y}` : ''}`
      : `${wd} ${d}${month ? ` ${MONTHS.en[m - 1]}` : ''}${year ? ` ${y}` : ''}`;
  };
  return `${part(from, fd, fm, fy, !sameMonth, !sameYear)} – ${part(to, td, tm, ty, true, true)}`;
}

/** `2026-10` or `2026-10-01` → `Oktober 2026` / `October 2026`. */
export function monthLabel(month: string, lang: WsLang): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[lang][m - 1]} ${y}`;
}
