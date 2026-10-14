import { translator, wsLocale, type WsLang } from '@/lib/admin/i18n';
import { compactDays, compactTime } from '@/lib/registration/term-format';

/**
 * A registration's dated option, read back out of the label it was stored as.
 *
 * The queues keep what the learner saw, verbatim: the public form writes
 * "26. Okt. 2026 - 18. Dez. 2026 | Mo, Di, Mi, Do, Fr • 09:00-12:30 | CASA
 * Bremen - Am Dobben" in German or English, an exam sitting as "13. Nov. 2026,
 * 09:00 - 17:00 | CASA Bremen Prüfungszentrum", a level path's later step as
 * "Termin wird noch festgelegt", and older rows "Starts 03/08/2026". Staff
 * read every row the same way, so the workspace takes the parts out — the
 * dates, the days, the time, the place — and formats them itself. Whatever
 * does not parse is shown as it was written; nothing is guessed.
 */

export type ParsedOption = {
  start: Date | null;
  end: Date | null;
  /** English, compacted: "Mon–Fri", "Mon, Wed". */
  days: string | null;
  /** "09:00–12:30", or a single "09:00". */
  time: string | null;
  location: string | null;
  /** True for "Termin wird noch festgelegt" / "Date to be arranged". */
  toBeArranged: boolean;
  raw: string;
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mär: 2, mar: 2, mrz: 2, apr: 3, mai: 4, may: 4, jun: 5, jul: 6,
  aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, dez: 11, dec: 11,
};

const GERMAN_DAYS: Record<string, string> = { Mo: 'Mon', Di: 'Tue', Mi: 'Wed', Do: 'Thu', Fr: 'Fri', Sa: 'Sat', So: 'Sun' };
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const IN_GERMAN: Record<string, string> = Object.fromEntries(Object.entries(GERMAN_DAYS).map(([de, en]) => [en, de]));

/** A parsed day list in the workspace's language: "Mon–Fri" stays, or becomes "Mo–Fr". */
export const localDays = (days: string | null, lang: WsLang): string | null =>
  days && lang === 'de' ? days.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g, (day) => IN_GERMAN[day] ?? day) : days;

const TO_BE_ARRANGED = /termin wird noch festgelegt|date to be arranged|to be confirmed|wird bestätigt/i;

/** Noon UTC on a calendar day: the same day in every time zone it is formatted in. */
const day = (year: number, month: number, date: number) => {
  const value = new Date(Date.UTC(year, month, date, 12));
  return value.getUTCMonth() === month && value.getUTCDate() === date ? value : null;
};

/** Every date in a piece of text, in the order written. */
function datesIn(text: string): Date[] {
  const found: { at: number; date: Date }[] = [];
  const add = (at: number, date: Date | null) => {
    if (date) found.push({ at, date });
  };

  // "26. Okt. 2026", "26 Oct 2026", "13. November 2026"
  for (const m of text.matchAll(/(\d{1,2})\.?\s+([A-Za-zÄÖÜäöü]{3,})\.?\s+(\d{4})/g)) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (month !== undefined) add(m.index ?? 0, day(Number(m[3]), month, Number(m[1])));
  }
  // "03/08/2026", "03.08.2026"
  for (const m of text.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g)) {
    add(m.index ?? 0, day(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  }
  // "2026-08-03"
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    add(m.index ?? 0, day(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  return found.sort((a, b) => a.at - b.at).map((entry) => entry.date);
}

function timeIn(text: string): string | null {
  const span = /(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/.exec(text);
  if (span) return compactTime(`${span[1].replace('.', ':')}-${span[2].replace('.', ':')}`);
  const single = /\b(\d{1,2}:\d{2})\b/.exec(text);
  return single ? single[1] : null;
}

/** "Mo, Di, Mi, Do, Fr" or "Mo–Fr" or "Mon, Wed" as English and compact; null when it is not a day list. */
function daysIn(text: string): string | null {
  const cleaned = text
    .replace(/(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/g, '')
    .replace(/[•·]/g, ' ')
    .trim();
  if (!cleaned) return null;

  const english = (token: string) => {
    const t = token.trim().replace(/\.$/, '');
    if (GERMAN_DAYS[t]) return GERMAN_DAYS[t];
    const short = t.slice(0, 3);
    return WEEK.includes(short) ? short : null;
  };

  const range = /^([A-Za-z]{2,3})\.?\s*[–-]\s*([A-Za-z]{2,3})\.?$/.exec(cleaned);
  if (range) {
    const from = english(range[1]);
    const to = english(range[2]);
    return from && to ? `${from}–${to}` : null;
  }

  const tokens = cleaned.split(/\s*,\s*/).map(english);
  if (tokens.length === 0 || tokens.some((t) => t === null)) return null;
  return compactDays(tokens as string[], 'en');
}

export function parseOptionLabel(label: string | null | undefined): ParsedOption | null {
  const raw = (label ?? '').trim();
  if (!raw) return null;

  const empty: ParsedOption = {
    start: null,
    end: null,
    days: null,
    time: null,
    location: null,
    toBeArranged: false,
    raw,
  };

  if (TO_BE_ARRANGED.test(raw)) return { ...empty, toBeArranged: true };

  const parts = raw.split(/\s+\|\s+/);
  const [first, ...rest] = parts;
  const dates = datesIn(first);
  if (dates.length === 0) return empty;

  // The schedule is the part with a time or a day list; the place is the last
  // part that is neither.
  let days: string | null = null;
  let time = timeIn(first);
  let location: string | null = null;
  for (const part of rest) {
    const partTime = timeIn(part);
    const partDays = daysIn(part);
    if (partTime || partDays) {
      time = time ?? partTime;
      days = days ?? partDays;
    } else {
      location = part.trim() || location;
    }
  }

  return {
    ...empty,
    start: dates[0],
    end: dates.length > 1 ? dates[dates.length - 1] : null,
    days,
    time,
    location,
  };
}

/** "26 Oct" / "26. Okt.", or with the year outside the current one; `full` always has the year. */
export function formatDay(value: Date, lang: WsLang, full = false): string {
  const sameYear = value.getUTCFullYear() === new Date().getFullYear();
  return value.toLocaleDateString(wsLocale(lang), {
    day: 'numeric',
    month: 'short',
    ...(full || !sameYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/** "26 Oct – 18 Dec 2026" / "26. Okt. – 18. Dez. 2026": the year once, at the end, when both share it. */
export function formatRange(start: Date, end: Date | null, lang: WsLang): string {
  if (!end || end.getTime() === start.getTime()) return formatDay(start, lang, true);
  const shared = start.getUTCFullYear() === end.getUTCFullYear();
  const from = start.toLocaleDateString(wsLocale(lang), {
    day: 'numeric',
    month: 'short',
    ...(shared ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
  return `${from} – ${formatDay(end, lang, true)}`;
}

/**
 * The option on one line for a queue's list: "Starts 26 Oct · 09:00–12:30" for
 * a course, "13 Nov · 09:00–17:00" for an exam sitting; in German
 * "Beginn 26. Okt. · 09:00–12:30".
 */
export function optionLine(label: string | null | undefined, kind: 'course' | 'exam', lang: WsLang): string | null {
  const t = translator(lang);
  const parsed = parseOptionLabel(label);
  if (!parsed) return null;
  if (parsed.toBeArranged) return t('Termin wird noch festgelegt', 'Date to be arranged');
  if (!parsed.start) return parsed.raw;
  const date = formatDay(parsed.start, lang);
  return [kind === 'course' ? t(`Beginn ${date}`, `Starts ${date}`) : date, parsed.time].filter(Boolean).join(' · ');
}
