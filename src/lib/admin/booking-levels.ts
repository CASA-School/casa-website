import { CASA_LEVEL_SEQUENCE } from '@/config/calculator/pricing';
import { isSchoolClosed } from '@/config/school-closures';

import type { Bilingual } from './i18n';
import { stayAround, teachingWeeks } from './offers/course';
import { addDays } from './offers/stay';

/**
 * How much of a level a booking teaches, and the stay around it. Pure and client-safe: the wizard,
 * the server action, the booking page and its letters read one rule.
 *
 * The intensive course is sold by the half level (four weeks) or the whole level (eight weeks, one
 * start: `src/lib/registration/levels.ts`). A booking stores the step it starts at (`A2.1`) and its
 * dates, so the dates say how much: an intensive period at a first half that runs past four teaching
 * weeks teaches both halves, „A2.1–A2.2". A second half joined at a start runs in the course of the
 * start before, to its end (`resolveCourse`). Every other course teaches the step it is.
 */

/** Teaching weeks of a half level in the intensive course. */
export const HALF_LEVEL_WEEKS = 4;

const ORDER = CASA_LEVEL_SEQUENCE as readonly string[];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type LevelPeriod = { format: string | null; levelCode: string | null; startDate: string; endDate: string };

/** An intensive period at a first half that runs past the half: it teaches the whole level. */
export function coversWholeLevel(p: LevelPeriod): boolean {
  return p.format === 'intensive' && Boolean(p.levelCode && /\.1$/.test(p.levelCode)) && teachingWeeks(p.startDate, p.endDate) > HALF_LEVEL_WEEKS;
}

/** The steps a booking teaches, in teaching order, without repeats. */
function bookedSteps(periods: readonly LevelPeriod[]): string[] {
  const steps = new Set<string>();
  for (const p of periods) {
    if (!p.levelCode) continue;
    steps.add(p.levelCode);
    if (coversWholeLevel(p)) steps.add(`${p.levelCode.slice(0, -2)}.2`);
  }
  const rank = (code: string) => (ORDER.includes(code) ? ORDER.indexOf(code) : ORDER.length);
  return [...steps].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** „A2.1", or „A2.1–A2.2" for a whole level, „A2.1–B1.2" across periods: what a visa letter needs. */
export function bookedLevelLabel(periods: readonly LevelPeriod[]): string | null {
  const steps = bookedSteps(periods);
  if (steps.length === 0) return null;
  return steps.length === 1 ? steps[0] : `${steps[0]}–${steps[steps.length - 1]}`;
}

/** Whether a start offers the whole level from this step: an intensive start, at a first half whose second half exists. */
export function offersWholeLevel(format: string | null, levelCode: string | null, codes: readonly string[]): boolean {
  if (format !== 'intensive' || !levelCode || !/\.1$/.test(levelCode)) return false;
  return codes.includes(`${levelCode.slice(0, -2)}.2`);
}

/**
 * The last class day of a first half: the end of its fourth teaching week (a week the school is closed
 * all week does not count), on the course's own days. A course shorter than that ends where it ends.
 */
export function halfLevelEnd(start: string, end: string, days: readonly string[] | null): string {
  const classDays = days?.length ? days : WEEKDAYS.slice(0, 5);
  const monday = addDays(start, -((new Date(`${start}T00:00:00Z`).getUTCDay() + 6) % 7));
  let weeks = 0;
  for (let week = monday; week <= end; week = addDays(week, 7)) {
    let last: string | null = null;
    for (let i = 0; i < 7; i++) {
      const d = addDays(week, i);
      if (d >= start && d <= end && classDays.includes(WEEKDAYS[i]) && !isSchoolClosed(d)) last = d;
    }
    if (last && ++weeks === HALF_LEVEL_WEEKS) return last;
  }
  return end;
}

/** The stay around a course: arrive the day before it starts, leave on the Saturday after it ends (FileMaker's rule). */
export function stayFor(start: string | null, end: string | null): { from: string; to: string } | null {
  if (!start || !end) return null;
  const stay = stayAround([{ start, end }]);
  return stay.from && stay.to ? { from: stay.from, to: stay.to } : null;
}

/**
 * The website registration's accommodation, as the workspace's type: a host family is SchoolMan's
 * „bei Deutschen" (`with_germans`, bookable; „Familie mit Kindern" is not), a WG the shared flat.
 */
export const REGISTRATION_ACCOMMODATION: Record<string, string> = { host: 'with_germans', flat: 'shared_flat' };

/** A registration's level wish: „A2 komplett (A2.1 + A2.2) · 8 Wochen" is the whole level. */
export const wishesWholeLevel = (raw: string | null | undefined) => Boolean(raw && /\b(komplett|complete)\b/i.test(raw));

// ------------------------------------------------------------------ words on a booking

/** The words the workspace writes on a booking's lines and payments, in German, and their English. */
export const ENROLMENT_FEE: Bilingual = { de: 'Einschreibegebühr', en: 'Enrolment fee' };

/** What a payment is for: the choices of „Wofür", stored in German. */
export const PAYMENT_SUBJECTS: readonly Bilingual[] = [
  { de: 'Anzahlung', en: 'Down payment' },
  { de: 'Restzahlung', en: 'Balance payment' },
  { de: 'Kurspreis', en: 'Course fee' },
  { de: 'Unterkunft', en: 'Accommodation' },
];

/** A stored payment subject in a language, when it is one of the choices; else as written. */
export function paymentSubject(subject: string, lang: 'de' | 'en'): string {
  const known = PAYMENT_SUBJECTS.find((s) => s.de === subject || s.en === subject);
  return known ? known[lang] : subject;
}

export type LineFacts = {
  /** The booking's course type, both names. */
  course: Bilingual | null;
  /** The stay as booked, each name in both languages. */
  accommodation: { type: Bilingual; room: Bilingual | null; catering: Bilingual | null; from: string | null; to: string | null } | null;
};

const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}`;

/** „Wohngemeinschaft (Einzelzimmer, mit Küchenbenutzung) · 25.10.26 – 19.12.26 · 8 Wochen". */
export function accommodationLine(a: NonNullable<LineFacts['accommodation']>, weeks: number, lang: 'de' | 'en'): string {
  const extras = [a.room?.[lang], a.catering?.[lang]].filter(Boolean);
  const when = a.from && a.to ? ` · ${shortDate(a.from)} – ${shortDate(a.to)}` : '';
  const span = weeks > 0 ? ` · ${weeks} ${lang === 'de' ? (weeks === 1 ? 'Woche' : 'Wochen') : weeks === 1 ? 'week' : 'weeks'}` : '';
  return `${a.type[lang]}${extras.length ? ` (${extras.join(', ')})` : ''}${when}${span}`;
}

/**
 * A cost line's text in both languages, where the line can be traced to what it is: the enrolment fee
 * by its kind, the rent from the stay booked, the course fee by its course's name (written in either
 * language). Anything else — a line a colleague typed — has only its own words: null.
 */
export function chargeLineNames(
  c: { kind: string; chargeTypeCode: string | null; description: string },
  facts: LineFacts,
  rentWeeks: number
): Bilingual | null {
  if (c.kind === 'enrolment_fee') return ENROLMENT_FEE;
  if (c.chargeTypeCode === 'accommodation_rent' && facts.accommodation) {
    return { de: accommodationLine(facts.accommodation, rentWeeks, 'de'), en: accommodationLine(facts.accommodation, rentWeeks, 'en') };
  }
  if (c.chargeTypeCode === 'tuition' && facts.course) {
    for (const from of [facts.course.de, facts.course.en]) {
      if (from && (c.description === from || c.description.startsWith(`${from} `))) {
        const rest = c.description.slice(from.length);
        return { de: `${facts.course.de}${rest}`, en: `${facts.course.en}${rest}` };
      }
    }
  }
  return null;
}
