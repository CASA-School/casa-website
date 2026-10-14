import { relativeDays, translator, wsLocale, type WsLang } from './i18n';

/**
 * Lists read by day ("Heute", "Gestern", "Montag, 12. Oktober"), on Bremen's
 * calendar: the server's clock may run on UTC, and an enquiry sent at 00:30 in
 * Bremen belongs to that morning, not to the evening before. Pure, so client
 * code and tests can use it.
 */

const ZONE = 'Europe/Berlin';

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** The calendar day in Bremen, `YYYY-MM-DD`. */
export const berlinDay = (value: Date): string => dayFormat.format(value);

/** The time in Bremen, "09:42". */
export const berlinTime = (value: Date, lang: WsLang): string =>
  value.toLocaleTimeString(wsLocale(lang), { hour: '2-digit', minute: '2-digit', timeZone: ZONE });

/** Whole days since a moment: how long something has waited. */
export const daysSince = (value: Date, now = new Date()): number => Math.floor((now.getTime() - value.getTime()) / 86_400_000);

/** Records in runs that share a key, in the order they came (newest first, as lists are sorted). */
function runs<T>(items: readonly T[], key: (item: T) => string): { key: string; rows: T[] }[] {
  const groups: { key: string; rows: T[] }[] = [];
  for (const item of items) {
    const k = key(item);
    const last = groups.at(-1);
    if (last?.key === k) last.rows.push(item);
    else groups.push({ key: k, rows: [item] });
  }
  return groups;
}

/** Records in runs of one day each. */
export const groupByDay = <T,>(items: readonly T[], at: (item: T) => Date) =>
  runs(items, (item) => berlinDay(at(item))).map(({ key, rows }) => ({ day: key, rows }));

/** Records in runs of one month each (`YYYY-MM`), for a history. */
export const groupByMonth = <T,>(items: readonly T[], at: (item: T) => Date) =>
  runs(items, (item) => berlinDay(at(item)).slice(0, 7)).map(({ key, rows }) => ({ month: key, rows }));

/** "September 2026". */
export const monthHeading = (month: string, lang: WsLang): string =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString(wsLocale(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** A short date for a history row: "Di., 8. Sept." / "Tue 8 Sept". */
export const shortDay = (value: Date, lang: WsLang): string =>
  value.toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', timeZone: ZONE });

/**
 * A day's heading: "Heute" or "Gestern" with the date beside it; an older day
 * is its date, with how long ago beside it. The year only when it is not this one.
 */
export function dayHeading(day: string, lang: WsLang, today = berlinDay(new Date())): { title: string; aside: string } {
  const t = translator(lang);
  const noon = (key: string) => Date.parse(`${key}T12:00:00Z`);
  const ago = Math.round((noon(today) - noon(day)) / 86_400_000);
  const date = new Date(noon(day)).toLocaleDateString(wsLocale(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(day.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });

  if (ago === 0) return { title: t('Heute', 'Today'), aside: date };
  if (ago === 1) return { title: t('Gestern', 'Yesterday'), aside: date };
  return { title: date, aside: ago > 1 ? relativeDays(new Date(`${day}T12:00:00`), lang) : '' };
}
