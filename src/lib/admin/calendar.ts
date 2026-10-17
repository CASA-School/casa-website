/**
 * The workspace's date picker, as arithmetic. Pure.
 *
 * Dates are `YYYY-MM-DD` strings and every step is done on UTC midnights, like
 * src/lib/admin/offers/stay.ts, so nothing shifts across a clock change. Weeks
 * start on Monday, as they do on every calendar CASA's office uses.
 *
 * `parseTypedDate` is what lets a colleague type a date instead of clicking
 * through months: "11.4.27", "11/04/2027", "2027-04-11", "11 April",
 * "today", "+14", "+6w".
 */

import { monthShort, type WsLang } from './i18n';
import { addDays, isIsoDate } from './offers/stay';

const pad = (n: number) => String(n).padStart(2, '0');

export const toIso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export function isoParts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 0 for Monday … 6 for Sunday. */
export function weekday(iso: string): number {
  const { y, m, d } = isoParts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function addMonths(y: number, m: number, n: number): { y: number; m: number } {
  const index = y * 12 + (m - 1) + n;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

/** The month as weeks of seven, Monday first; days of the months around it are null. */
export function monthGrid(y: number, m: number): (string | null)[][] {
  const first = weekday(toIso(y, m, 1));
  const cells: (string | null)[] = [...Array(first).fill(null)];
  for (let d = 1; d <= daysInMonth(y, m); d += 1) cells.push(toIso(y, m, d));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** The calendar's column heads, Monday first. */
export const WEEKDAYS: Record<WsLang, readonly string[]> = {
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};
export const MONTHS: Record<WsLang, readonly string[]> = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const DAYS: Record<WsLang, readonly string[]> = {
  de: ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.', 'So.'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

export const monthTitle = (y: number, m: number, lang: WsLang) => `${MONTHS[lang][m - 1]} ${y}`;

/** "Sun 11 Apr 2027" / "So. 11. Apr. 2027" — the weekday matters: groups arrive on a Sunday. */
export function formatDay(iso: string, lang: WsLang): string {
  const { y, m, d } = isoParts(iso);
  if (lang === 'de') return `${DAYS.de[weekday(iso)]} ${d}. ${monthShort('de', m)} ${y}`;
  return `${DAYS.en[weekday(iso)]} ${d} ${MONTHS.en[m - 1].slice(0, 3)} ${y}`;
}

const MONTH_WORDS: Record<string, number> = {};
[
  ['jan', 'januar', 'january', 'jän'],
  ['feb', 'februar', 'february'],
  ['mar', 'mär', 'märz', 'maerz', 'march'],
  ['apr', 'april'],
  ['may', 'mai'],
  ['jun', 'juni', 'june'],
  ['jul', 'juli', 'july'],
  ['aug', 'august'],
  ['sep', 'sept', 'september'],
  ['oct', 'okt', 'oktober', 'october'],
  ['nov', 'november'],
  ['dec', 'dez', 'dezember', 'december'],
].forEach((words, i) => words.forEach((w) => (MONTH_WORDS[w] = i + 1)));

const year = (text: string) => {
  const n = Number(text);
  return text.length <= 2 ? 2000 + n : n;
};

/** The day and month, in the year given, or else the next time it comes round from today. */
function resolve(d: number, m: number, y: number | null, today: string): string | null {
  if (y != null) {
    const iso = toIso(y, m, d);
    return isIsoDate(iso) ? iso : null;
  }
  const thisYear = isoParts(today).y;
  for (const candidate of [thisYear, thisYear + 1]) {
    const iso = toIso(candidate, m, d);
    if (isIsoDate(iso) && iso >= today) return iso;
  }
  return null;
}

/** A date as a colleague types it, or null when it is not one. */
export function parseTypedDate(input: string, today: string): string | null {
  const text = input.trim().toLowerCase().replace(/^(mon|tue|wed|thu|fri|sat|sun|mo|di|mi|do|fr|sa|so)[a-z]*\.?,?\s+/, '');
  if (!text) return null;
  if (text === 'today' || text === 'heute') return today;
  if (text === 'tomorrow' || text === 'morgen') return addDays(today, 1);

  let m = /^\+(\d{1,3})\s*(d|days?|w|weeks?|wochen?)?$/.exec(text);
  if (m) return addDays(today, Number(m[1]) * (m[2] && m[2].startsWith('w') ? 7 : 1));

  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (m) return resolve(Number(m[3]), Number(m[2]), Number(m[1]), today);

  m = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2}|\d{4}))?\.?$/.exec(text);
  if (m) return resolve(Number(m[1]), Number(m[2]), m[3] ? year(m[3]) : null, today);

  m = /^(\d{1,2})\.?\s+([a-zäö]+)\.?(?:\s+(\d{2}|\d{4}))?$/.exec(text);
  if (m && MONTH_WORDS[m[2]]) return resolve(Number(m[1]), MONTH_WORDS[m[2]], m[3] ? year(m[3]) : null, today);

  m = /^([a-zäö]+)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(text);
  if (m && MONTH_WORDS[m[1]]) return resolve(Number(m[2]), MONTH_WORDS[m[1]], m[3] ? year(m[3]) : null, today);

  return null;
}
