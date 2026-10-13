/**
 * A learner's course, as an offer builds it. Pure.
 *
 * What CASA writes to a learner (or an agency, for one) is the course, its
 * dates and its time of day, the books, the enrolment fee on a first
 * registration, and the accommodation if they need it (docs/OFFERS.md §A
 * learner's course). The choice is kept on the offer (`stay.choices.course`)
 * with the cohort dates and times copied in, so the offer reads the same after
 * the catalogue moves on; the prices come from the same published figures the
 * website shows (src/config/calculator/pricing.ts, checked against
 * casa-bremen.de in docs/COURSE_FACTS_SOURCE_OF_TRUTH.md), the books' from
 * the price list.
 *
 *   Intensive — a whole level (8 weeks, both halves) €940, a half level or
 *               B1+ €520 (B1+ runs a whole term at the half-level rate).
 *   Evening   — per term: €378 from January, €476 from August.
 *   Special   — €192 a module.
 *   Others    — the catalogue's own price, to be typed over where it is a
 *               "from" price.
 *   Accommodation — whole weeks, Sunday to Saturday: €580 for four weeks,
 *               €145 each further week, €200 / €340 / €460 for one to three
 *               weeks; on a learner's first stay the €50 placement fee and
 *               the €580 refundable deposit.
 *   Exam      — a telc exam after a path that ends at its level, at the
 *               price list's rate for the full exam on that date.
 *
 * These are the lines FileMaker's own learner offers carry (CostDetailSample,
 * 2026: Einschreibegebühr 50, Kurspreis 940, Bücher 2 × 23,99, Miete
 * Unterkunft 1160 for 8 weeks, Vermittlungsgebühr 50, Examensgebühr 210) and
 * the rules its booking scripts price by (WriteAccommodationPrice: whole weeks,
 * deposit and placement fee on the first stay; the enrolment fee once per
 * learner, ever). docs/OFFERS.md §A learner's course.
 */

import {
  ACCOMMODATION_FEES,
  ACCOMMODATION_SHORT_STAY,
  CASA_LEVEL_SEQUENCE,
  ENROLLMENT_FEE,
  EVENING_TRIMESTER_PRICES,
  INTENSIVE_FULL_LEVEL_8_WEEKS,
  INTENSIVE_HALF_LEVEL_4_WEEKS,
  SPECIAL_COURSE_DEFAULT_PRICE,
} from '@/config/calculator/pricing';

import { SCHOOL_CLOSURES } from '@/config/school-closures';
import { buildLevelPath } from '@/lib/registration/level-path';

import { addDays, daysBetween } from './stay';
import type { OfferLanguage } from './types';

export type Session = 'morning' | 'afternoon' | 'evening';

/** When a course meets: the weekdays (Mon … Sun) and the time, "09:00-12:30". */
export type CourseSlot = { days: string[]; time: string };

export type CourseStep = {
  /** 'B2' for a whole level, 'B2.1' or 'B1+' for one step, '' for a course without levels. */
  level: string;
  /** Weeks of teaching. */
  weeks: number;
  /** Both halves of a level. */
  complete: boolean;
  termId: string | null;
  /** Null when no term is planned yet: CASA plans it with the learner. */
  start: string | null;
  end: string | null;
};

export type CourseBook = { key: string; title: string; price: number | null };

/** A telc exam after the course, on a planned date (null: the date is agreed later). */
export type CourseExam = { code: string; name: string; date: string | null; fee: number | null };

export type AccommodationKind = 'host_family' | 'shared_flat';
export type AccommodationChoice = { kind: AccommodationKind; from: string | null; to: string | null };

export type CourseChoice = {
  slug: string;
  name: { de: string; en: string };
  lessonsPerWeek: number;
  slot: CourseSlot | null;
  steps: CourseStep[];
  books: CourseBook[];
  /** A first registration at CASA: the enrolment fee is due. */
  newStudent: boolean;
  accommodation: AccommodationChoice | null;
  /** The learner's first stay with CASA: the placement fee and the deposit are due. */
  firstStay: boolean;
  exam: CourseExam | null;
  /** The catalogue's price, for a course without a published one. */
  listPrice: number | null;
};

/** What CASA knows of the learner: decides the enrolment fee, and the placement fee and deposit. */
export type LearnerHistory = { studiedBefore: boolean; stayedBefore: boolean };

// ------------------------------------------------------------------ words

const DAY = {
  de: { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' },
  en: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' },
} as const;
const ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Morning, afternoon or evening, from when the lessons start. */
export function sessionOf(slot: CourseSlot | null): Session | null {
  const hour = slot ? Number(/^(\d{1,2})/.exec(slot.time)?.[1]) : NaN;
  if (!Number.isFinite(hour)) return null;
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

const SESSION_WORD = {
  de: { morning: 'Vormittags', afternoon: 'Nachmittags', evening: 'Abends' },
  en: { morning: 'Mornings', afternoon: 'Afternoons', evening: 'Evenings' },
} as const;

/** "Mo–Fr", "Mo–Do", "Mo + Mi": a run of days with a dash, two apart with a plus. */
export function daysLabel(days: string[], language: OfferLanguage): string {
  const sorted = [...days].filter((d) => ORDER.includes(d)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  if (!sorted.length) return '';
  const word = (d: string) => DAY[language][d as keyof (typeof DAY)['de']];
  const run = sorted.every((d, i) => i === 0 || ORDER.indexOf(d) === ORDER.indexOf(sorted[i - 1]) + 1);
  if (run && sorted.length > 2) return `${word(sorted[0])}–${word(sorted[sorted.length - 1])}`;
  return sorted.map(word).join(language === 'de' ? ' + ' : ' & ');
}

/** "Vormittags, Mo–Fr 09:00–12:30" — the line a learner plans a day around. */
export function slotLabel(slot: CourseSlot | null, language: OfferLanguage): string {
  if (!slot) return '';
  const session = sessionOf(slot);
  const time = slot.time.replace('-', '–');
  return [session ? SESSION_WORD[language][session] : '', `${daysLabel(slot.days, language)} ${time}`.trim()].filter(Boolean).join(', ');
}

const pad = (n: number) => String(n).padStart(2, '0');
function range(from: string, to: string, language: OfferLanguage) {
  const [ay, am, ad] = from.split('-').map(Number);
  const [by, bm, bd] = to.split('-').map(Number);
  if (language === 'de') return ay === by ? `${pad(ad)}.${pad(am)}.–${pad(bd)}.${pad(bm)}.${by}` : `${pad(ad)}.${pad(am)}.${ay}–${pad(bd)}.${pad(bm)}.${by}`;
  const m = (n: number) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][n - 1];
  return ay === by ? `${ad} ${m(am)} – ${bd} ${m(bm)} ${by}` : `${ad} ${m(am)} ${ay} – ${bd} ${m(bm)} ${by}`;
}

function day(iso: string, language: OfferLanguage) {
  const [y, m, d] = iso.split('-').map(Number);
  if (language === 'de') return `${pad(d)}.${pad(m)}.${y}`;
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
}

const BASE = ACCOMMODATION_FEES.base4Weeks;
const WEEK = ACCOMMODATION_FEES.perAdditionalWeek;

const WORDS = {
  de: {
    complete: 'komplett',
    weeks: (n: number) => `${n} ${n === 1 ? 'Woche' : 'Wochen'}`,
    lessons: (n: number) => `${n} UE`,
    noDate: 'Termin nach Absprache',
    book: (title: string) => `Lehrbuch ${title}`,
    enrolment: 'Einschreibegebühr (einmalig bei der ersten Anmeldung)',
    accommodation: { host_family: 'Unterkunft in einer Gastfamilie', shared_flat: 'Zimmer in der CASA-WG' },
    rent: (weeks: number) =>
      weeks > 4 ? `${BASE} € für 4 Wochen, ${weeks - 4} × ${WEEK} € für jede weitere Woche` : weeks === 4 ? `${BASE} € für 4 Wochen` : '',
    placement: 'Vermittlungsgebühr Unterkunft (einmalig)',
    deposit: 'Kaution Unterkunft (rückerstattbar)',
    closed: (label: string, range: string) => `unterrichtsfrei ${range} (${label})`,
    exam: (name: string, date: string | null) => `Prüfung ${name} · ${date ? `am ${day(date, 'de')}` : 'Termin nach Absprache'}`,
  },
  en: {
    complete: 'complete',
    weeks: (n: number) => `${n} ${n === 1 ? 'week' : 'weeks'}`,
    lessons: (n: number) => `${n} lessons`,
    noDate: 'dates by arrangement',
    book: (title: string) => `Textbook ${title}`,
    enrolment: 'Enrolment fee (once, on a first registration)',
    accommodation: { host_family: 'Host family', shared_flat: 'Room in the CASA shared flat' },
    rent: (weeks: number) => (weeks > 4 ? `€${BASE} for 4 weeks, ${weeks - 4} × €${WEEK} for each further week` : weeks === 4 ? `€${BASE} for 4 weeks` : ''),
    placement: 'Accommodation placement fee (once)',
    deposit: 'Accommodation deposit (refundable)',
    closed: (label: string, range: string) => `no lessons ${range} (${label})`,
    exam: (name: string, date: string | null) => `Exam ${name} · ${date ? `on ${day(date, 'en')}` : 'date by arrangement'}`,
  },
} as const;

/** "B2 komplett", "B2.1", "B1+". */
export function levelLabel(step: Pick<CourseStep, 'level' | 'complete'>, language: OfferLanguage): string {
  return step.complete ? `${step.level} ${WORDS[language].complete}` : step.level;
}

// ------------------------------------------------------------------ levels

/** CASA's steps between a course's lowest and highest level: A1–C1 is A1.1 … C1.2, B1+ included. */
export function levelsBetween(min: string | null, max: string | null): string[] {
  const all = [...CASA_LEVEL_SEQUENCE] as string[];
  const from = min ? all.findIndex((l) => l.startsWith(min)) : 0;
  const lastOf = max ? all.map((l, i) => (l.startsWith(max) ? i : -1)).filter((i) => i >= 0).pop() : all.length - 1;
  if (from < 0 || lastOf == null || lastOf < from) return [];
  return all.slice(from, lastOf + 1);
}

/** The half levels a step teaches, whose books it needs: 'B2' is B2.1 and B2.2; 'B1+' is itself. */
export function halvesOf(step: Pick<CourseStep, 'level' | 'complete'>): string[] {
  return step.complete ? [`${step.level}.1`, `${step.level}.2`] : step.level ? [step.level] : [];
}

// ------------------------------------------------------------------ prices

export function stepPrice(choice: Pick<CourseChoice, 'slug' | 'listPrice'>, step: CourseStep): number | null {
  switch (choice.slug) {
    case 'intensive-german':
      return step.complete ? INTENSIVE_FULL_LEVEL_8_WEEKS : INTENSIVE_HALF_LEVEL_4_WEEKS;
    case 'evening-german':
      return EVENING_TRIMESTER_PRICES[step.start && Number(step.start.slice(5, 7)) >= 8 ? 'autumn' : 'spring'];
    case 'special-courses':
      return SPECIAL_COURSE_DEFAULT_PRICE;
    default:
      return choice.listPrice;
  }
}

const stayDays = (a: AccommodationChoice | null) => (a?.from && a.to && a.to >= a.from ? daysBetween(a.from, a.to) + 1 : 0);

/**
 * Weeks of rent: whole weeks, a week being Sunday to Saturday — seven days
 * counted inclusively, as FileMaker's `WriteAccommodationPrice` counts them.
 * A stay shorter than a week is one week.
 */
export function accommodationWeeks(a: AccommodationChoice | null): number {
  const days = stayDays(a);
  return days > 0 ? Math.max(1, Math.floor(days / 7)) : 0;
}

/** Nights beyond the whole weeks, which the rent does not cover (FileMaker computed them and charged nothing). */
export function extraNights(a: AccommodationChoice | null): number {
  const days = stayDays(a);
  return days > 7 ? days - accommodationWeeks(a) * 7 : 0;
}

/** €200 / €340 / €460 for one to three weeks, €580 for four, €145 each week after. */
export function rent(weeks: number): number {
  if (weeks <= 0) return 0;
  if (weeks < 4) return ACCOMMODATION_SHORT_STAY[weeks - 1];
  return ACCOMMODATION_FEES.base4Weeks + (weeks - 4) * ACCOMMODATION_FEES.perAdditionalWeek;
}

/**
 * A stay around the course: arrive the day before it starts, leave on the
 * Saturday after it ends.
 */
export function stayAround(steps: readonly CourseStep[]): { from: string | null; to: string | null } {
  const dated = steps.filter((s) => s.start && s.end);
  if (!dated.length) return { from: null, to: null };
  const start = dated[0].start!;
  const end = dated[dated.length - 1].end!;
  const weekday = (new Date(`${end}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon 0 … Sun 6
  return { from: addDays(start, -1), to: weekday <= 5 ? addDays(end, 5 - weekday) : end };
}

/** The whole course: first day, last day, weeks, lessons. */
export function courseSpan(choice: Pick<CourseChoice, 'steps' | 'lessonsPerWeek'>) {
  const dated = choice.steps.filter((s) => s.start && s.end);
  const weeks = choice.steps.reduce((sum, s) => sum + s.weeks, 0);
  return {
    start: dated[0]?.start ?? null,
    end: dated[dated.length - 1]?.end ?? null,
    weeks,
    lessons: weeks * choice.lessonsPerWeek,
  };
}

// ------------------------------------------------------------------ lines

export type CourseLine = {
  key: string;
  chargeType: string;
  description: string;
  unitAmount: number | null;
};

/** The lines a learner's course puts on the offer, in the order a letter lists them. */
export function courseLines(choice: CourseChoice, language: OfferLanguage): CourseLine[] {
  const w = WORDS[language];
  const name = choice.name[language];
  // The time of day is in the heading above the lines (courseFacts); each line is its level and its dates.
  const out: CourseLine[] = choice.steps.map((step, i) => {
    const when = step.start && step.end ? range(step.start, step.end, language) : w.noDate;
    const amount = [w.weeks(step.weeks), choice.lessonsPerWeek ? w.lessons(step.weeks * choice.lessonsPerWeek) : ''].filter(Boolean).join(', ');
    return {
      key: `course:${i}`,
      chargeType: 'tuition',
      description: [`${name}${step.level ? ` ${levelLabel(step, language)}` : ''}`, `${when} (${amount})`].join(' · '),
      unitAmount: stepPrice(choice, step),
    };
  });
  for (const book of choice.books) {
    out.push({ key: `book:${book.key}`, chargeType: 'books', description: w.book(book.title), unitAmount: book.price });
  }
  if (choice.newStudent) out.push({ key: 'enrolment', chargeType: 'enrolment_fee', description: w.enrolment, unitAmount: ENROLLMENT_FEE });
  const a = choice.accommodation;
  const weeks = accommodationWeeks(a);
  if (a) {
    const when = a.from && a.to ? `${range(a.from, a.to, language)}, ${w.weeks(weeks)}` : w.noDate;
    const basis = weeks ? w.rent(weeks) : '';
    out.push({
      key: 'accommodation',
      chargeType: 'accommodation_rent',
      description: `${w.accommodation[a.kind]} · ${when}${basis ? ` (${basis})` : ''}`,
      unitAmount: weeks ? rent(weeks) : null,
    });
    if (choice.firstStay) {
      out.push({ key: 'placement', chargeType: 'accommodation_placement_fee', description: w.placement, unitAmount: ACCOMMODATION_FEES.commissionFee });
      out.push({ key: 'deposit', chargeType: 'deposit', description: w.deposit, unitAmount: ACCOMMODATION_FEES.deposit });
    }
  }
  if (choice.exam) out.push({ key: 'exam', chargeType: 'exam_fee', description: w.exam(choice.exam.name, choice.exam.date), unitAmount: choice.exam.fee });
  return out;
}

/** "Intensivkurs B2 komplett", or for a path "Intensivkurs A2 bis B2": what the offer is called. */
export function courseTitle(choice: Pick<CourseChoice, 'name' | 'steps'>, language: OfferLanguage): string {
  const name = choice.name[language];
  const first = choice.steps[0];
  const last = choice.steps[choice.steps.length - 1];
  if (!first?.level) return name;
  if (choice.steps.length === 1) return `${name} ${levelLabel(first, language)}`;
  return `${name} ${first.level} ${language === 'de' ? 'bis' : 'to'} ${last.level}`;
}

/** "Vormittags, Mo–Fr 09:00–12:30 · 26.10.2026–26.02.2027 · 16 Wochen · 320 UE": the course at a glance. */
export function courseFacts(choice: CourseChoice, language: OfferLanguage): string {
  const w = WORDS[language];
  const span = courseSpan(choice);
  return [
    slotLabel(choice.slot, language),
    span.start && span.end ? range(span.start, span.end, language) : null,
    span.weeks ? w.weeks(span.weeks) : null,
    span.lessons ? w.lessons(span.lessons) : null,
    ...closuresIn(choice).map((c) => w.closed(c.label[language], range(c.from, c.to, language))),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The school's closures inside the course — the holidays a learner plans around, as FileMaker's confirmation listed them. */
export function closuresIn(choice: Pick<CourseChoice, 'steps' | 'lessonsPerWeek'>) {
  const { start, end } = courseSpan(choice);
  return start && end ? SCHOOL_CLOSURES.filter((c) => c.from <= end && c.to >= start) : [];
}

// ------------------------------------------------------------- the catalogue

/** A planned term of a course, as the catalogue lists it. */
export type CatalogueTerm = { id: string; startDate: string; endDate: string; slot: CourseSlot | null };

export type CatalogueCourse = {
  slug: string;
  name: { de: string; en: string };
  lessonsPerWeek: number;
  /** The steps it teaches (A1.1 … C1.2); empty for a course without levels. */
  levels: string[];
  listPrice: number | null;
  terms: CatalogueTerm[];
};

export type CatalogueBook = { key: string; title: string; level: string; part: number | null; price: number | null };

/** A telc exam CASA holds, with its dates still to come and the fee on each. */
export type CatalogueExam = { code: string; name: string; level: string; sessions: { date: string; fee: number | null }[] };

export type CourseCatalogue = { courses: CatalogueCourse[]; books: CatalogueBook[]; exams: CatalogueExam[] };

export const slotKey = (slot: CourseSlot | null) => (slot ? `${slot.days.join(',')}|${slot.time}` : '');

/** The times a course runs at — mornings and afternoons for the intensive course — each with its terms. */
export function slotsOf(course: CatalogueCourse): { key: string; slot: CourseSlot | null; terms: CatalogueTerm[] }[] {
  const groups = new Map<string, { key: string; slot: CourseSlot | null; terms: CatalogueTerm[] }>();
  for (const term of course.terms) {
    const key = slotKey(term.slot);
    const group = groups.get(key) ?? { key, slot: term.slot, terms: [] };
    group.terms.push(term);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (sessionRank(a.slot) - sessionRank(b.slot)) || a.key.localeCompare(b.key));
}

const sessionRank = (slot: CourseSlot | null) => ({ morning: 0, afternoon: 1, evening: 2 } as const)[sessionOf(slot) ?? 'evening'];

const termWeeks = (term: CatalogueTerm) => Math.max(1, Math.round((daysBetween(term.startDate, term.endDate) + 1) / 7));

/**
 * The exams a course leads to: the ones at the level its last step finishes
 * (B2, or B2.2), with their dates from the course's last week on. A path that
 * stops halfway through a level leads to none.
 */
export function examsAfter(choice: Pick<CourseChoice, 'steps'>, exams: readonly CatalogueExam[]): { code: string; name: string; sessions: { date: string; fee: number | null }[] }[] {
  const last = choice.steps[choice.steps.length - 1];
  if (!last?.level) return [];
  const [base, half] = last.level.split('.');
  if (half === '1') return [];
  const from = last.end ? addDays(last.end, -7) : null;
  return exams
    .filter((e) => e.level === base)
    .map((e) => ({ code: e.code, name: e.name, sessions: e.sessions.filter((s) => !from || s.date >= from).slice(0, 4) }))
    .filter((e) => e.sessions.length > 0);
}

/**
 * A learner's course from what was picked: the course, a term, a level and
 * where to go on to. The intensive course climbs level by level through the
 * terms that follow (src/lib/registration/level-path.ts, the public
 * registration's own path), in the same time of day; every other course is
 * the term it is. The books are the price list's for each half level taught.
 */
export function buildCourse(input: {
  course: CatalogueCourse;
  termId: string;
  level: string;
  pathTo: string;
  books: readonly CatalogueBook[];
  withBooks: boolean;
  newStudent: boolean;
  accommodation: AccommodationChoice | null;
  firstStay?: boolean;
  exams?: readonly CatalogueExam[];
  exam?: CourseExam | null;
}): CourseChoice | null {
  const { course } = input;
  const term = course.terms.find((t) => t.id === input.termId);
  if (!term || (course.levels.length > 0 && !input.level)) return null;
  const sameSlot = course.terms.filter((t) => slotKey(t.slot) === slotKey(term.slot));

  let steps: CourseStep[];
  if (course.slug === 'intensive-german' && input.level) {
    steps = buildLevelPath({ slug: course.slug, value: input.level, option: term, options: sameSlot, availableLevels: course.levels, pathTo: input.pathTo, locale: 'de' }).map(
      (step) => ({ level: step.level, weeks: step.weeks, complete: step.complete, termId: step.option?.id ?? null, start: step.start, end: step.end })
    );
  } else {
    steps = [{ level: input.level, weeks: termWeeks(term), complete: false, termId: term.id, start: term.startDate, end: term.endDate }];
  }
  if (!steps.length) return null;

  const halves = new Set(steps.flatMap(halvesOf));
  const books = input.withBooks
    ? input.books
        .filter((b) => halves.has(b.level) && (b.part === 1 || b.part === 2))
        .map((b) => ({ key: b.key, title: b.title, price: b.price }))
    : [];

  // An exam stays only while the path still leads to it, on a date it still offers.
  const fits = input.exam ? examsAfter({ steps }, input.exams ?? []).find((e) => e.code === input.exam!.code) : null;
  const exam = fits && input.exam && (input.exam.date == null || fits.sessions.some((s) => s.date === input.exam!.date)) ? input.exam : null;

  return {
    slug: course.slug,
    name: course.name,
    lessonsPerWeek: course.lessonsPerWeek,
    slot: term.slot,
    steps,
    books,
    newStudent: input.newStudent,
    accommodation: input.accommodation,
    firstStay: input.firstStay ?? true,
    exam,
    listPrice: course.listPrice,
  };
}
