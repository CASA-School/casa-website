/**
 * A TERM IN AS FEW WORDS AS IT TAKES (2026-10-05).
 *
 * The registration form printed every term as "26. Okt. 2026 · Mo, Di, Mi, Do,
 * Fr • 09:00-12:30", in the date list and again in a summary card under it, so
 * one schedule was read five times and its day list ran longer than the date.
 * A schedule now has parts: the days as a range where they run in a row
 * ("Mo–Fr"), the time with a dash, and the part of the day it falls in, so the
 * picker shows a schedule once over the dates that share it. The repository
 * builds its labels here and the wizard formats its dates here. Client-safe.
 */
import type { ContentLocale, TermDaytime, TermSchedule } from '@/lib/content/types';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// The schedule column stores English abbreviations.
const GERMAN_DAYS: Record<string, string> = { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' };

const dayName = (day: string, locale: ContentLocale) => (locale === 'de' ? GERMAN_DAYS[day] ?? day : day);

/** Three or more days in a row read as a range ("Mo–Fr"); the rest are listed ("Mo, Mi"). */
export function compactDays(days: readonly string[], locale: ContentLocale): string {
  const known = days.map((day) => day.trim()).filter(Boolean);
  const order = (day: string) => {
    const index = WEEK.indexOf(day);
    return index < 0 ? WEEK.length : index;
  };
  const sorted = [...known].sort((a, b) => order(a) - order(b));
  const inARow = sorted.every((day, index) => order(day) < WEEK.length && (index === 0 || order(day) === order(sorted[index - 1]) + 1));

  if (sorted.length >= 3 && inARow) {
    return `${dayName(sorted[0], locale)}–${dayName(sorted[sorted.length - 1], locale)}`;
  }
  return sorted.map((day) => dayName(day, locale)).join(', ');
}

/** "09:00-12:30" as "09:00–12:30". */
export const compactTime = (time: string) => time.trim().replace(/\s*[-–]\s*/, '–');

function hourOf(clock: string | undefined) {
  const match = clock ? /^(\d{1,2})(?::(\d{2}))?/.exec(clock.trim()) : null;
  return match ? Number(match[1]) + Number(match[2] ?? 0) / 60 : null;
}

/** The part of the day a time falls in. A span from the morning past two is a full day. */
export function daytimeOf(time: string): TermDaytime | null {
  const [from, to] = time.split(/[-–]/);
  const start = hourOf(from);
  const end = hourOf(to);
  if (start === null) return null;
  if (start < 12) return end !== null && end > 14 ? 'fullDay' : 'morning';
  if (start < 17) return 'afternoon';
  return 'evening';
}

/** A stored schedule (`{ days: ['Mon', …], time: '09:00-12:30' }`) in parts; null when it has neither. */
export function parseSchedule(schedule: unknown, locale: ContentLocale): TermSchedule | null {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return null;

  const rawDays = (schedule as { days?: unknown }).days;
  const rawTime = (schedule as { time?: unknown }).time;
  const days = Array.isArray(rawDays) ? compactDays(rawDays.filter((day): day is string => typeof day === 'string'), locale) : '';
  const time = typeof rawTime === 'string' ? compactTime(rawTime) : '';

  if (!days && !time) return null;
  return { days, time, daytime: time ? daytimeOf(time) : null };
}

/** One line, for mails, the review and the workspace: "Mo–Fr · 09:00–12:30". */
export function scheduleLine(schedule: TermSchedule | null | undefined, locale: ContentLocale): string {
  if (!schedule) return locale === 'de' ? 'Zeitplan wird bestätigt' : 'Schedule to be confirmed';
  const days = schedule.days || (locale === 'de' ? 'Tage werden noch festgelegt' : 'Days to be confirmed');
  return schedule.time ? `${days} · ${schedule.time}` : days;
}

const DAYTIME_LABELS: Record<TermDaytime, Record<ContentLocale, string>> = {
  morning: { de: 'Vormittags', en: 'Mornings' },
  afternoon: { de: 'Nachmittags', en: 'Afternoons' },
  evening: { de: 'Abends', en: 'Evenings' },
  fullDay: { de: 'Ganztags', en: 'Full days' },
};

export const daytimeLabel = (daytime: TermDaytime, locale: ContentLocale) => DAYTIME_LABELS[daytime][locale];

const TIME_ZONE = 'Europe/Berlin';
const localeTag = (locale: ContentLocale) => (locale === 'de' ? 'de-DE' : 'en-GB');

/** A `YYYY-MM-DD` day at noon UTC, the same calendar day in Bremen; a timestamp as it is. */
const instant = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value));

const format = (value: string, locale: ContentLocale, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(localeTag(locale), { ...options, timeZone: TIME_ZONE }).format(instant(value));

/** A date tile: "26" over "Okt. 2026", and the whole date for a screen reader. */
export function dateTileParts(value: string, locale: ContentLocale) {
  return {
    day: format(value, locale, { day: 'numeric' }),
    monthYear: format(value, locale, { month: 'short', year: 'numeric' }),
    full: format(value, locale, { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

/** "26. Okt. 2026". */
export const formatDay = (value: string, locale: ContentLocale) => format(value, locale, { day: 'numeric', month: 'short', year: 'numeric' });

/** "26. Okt. – 18. Dez. 2026", "23. Nov. 2026 – 28. Jan. 2027": the year once where it is one. */
export function termRange(start: string, end: string, locale: ContentLocale) {
  return new Intl.DateTimeFormat(localeTag(locale), { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE })
    .formatRange(instant(start), instant(end));
}

/** "09:00–17:00", a sitting's hours in Bremen. */
export function clockRange(startsAt: string, endsAt: string, locale: ContentLocale) {
  const clock = (value: string) => format(value, locale, { hour: '2-digit', minute: '2-digit' });
  return `${clock(startsAt)}–${clock(endsAt)}`;
}

export const weeksLabel = (weeks: number, locale: ContentLocale) =>
  locale === 'de' ? `${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}` : `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
