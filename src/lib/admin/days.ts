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

/** Records in runs of one day each, in the order they came (newest first, as lists are sorted). */
export function groupByDay<T>(items: readonly T[], at: (item: T) => Date): { day: string; rows: T[] }[] {
  const groups: { day: string; rows: T[] }[] = [];
  for (const item of items) {
    const day = berlinDay(at(item));
    const last = groups.at(-1);
    if (last?.day === day) last.rows.push(item);
    else groups.push({ day, rows: [item] });
  }
  return groups;
}

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
