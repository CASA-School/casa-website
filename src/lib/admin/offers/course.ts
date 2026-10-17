/**
 * A learner's course, as an offer builds it. Pure.
 *
 * What CASA writes to a learner (or an agency, for one) is the course, its
 * dates and its time of day, the books, the enrolment fee on a first
 * registration, and the accommodation if they need it (docs/OFFERS.md §A
 * learner's course). The choice is kept on the offer (`stay.choices.course`)
 * with the cohort dates, times and prices copied in, so the offer reads the
 * same after the catalogue or the price list moves on.
 *
 * Every amount comes from the price list in force on its day (Settings →
 * Prices, src/lib/admin/prices): the course on its first day, the room on
 * arrival, the exam on its date.
 *
 *   Intensive — the price for the level's weeks: a whole level 8 weeks, a
 *               half level 4 weeks; B1+ like any other (B1+.1, B1+.2).
 *   Evening, special courses — per lesson, times the term's lessons.
 *   Others    — the list's rate, else the catalogue's own price.
 *   Accommodation — whole weeks, Sunday to Saturday, at the rent for that
 *               many weeks; on a learner's first stay the placement fee and
 *               the refundable deposit.
 *   Exam      — a telc exam after a path that ends at its level.
 *
 * These are the lines FileMaker's own learner offers carry (CostDetailSample,
 * 2026: Einschreibegebühr 50, Kurspreis 940, Bücher 2 × 23,99, Miete
 * Unterkunft 1160 for 8 weeks, Vermittlungsgebühr 50, Examensgebühr 210) and
 * the rules its booking scripts price by (WriteAccommodationPrice: whole weeks,
 * deposit and placement fee on the first stay; the enrolment fee once per
 * learner, ever). docs/OFFERS.md §A learner's course.
 */

import { CASA_LEVEL_SEQUENCE } from '@/config/calculator/pricing';
import { SCHOOL_CLOSURES, isSchoolClosed } from '@/config/school-closures';
import { buildLevelPath } from '@/lib/registration/level-path';
import { levelOf } from '@/lib/registration/levels';

import { coursePrice, feePrice, listOn, rentPrice, type PriceList } from '../prices/price-list';

import { addDays, daysBetween } from './stay';
import type { OfferLanguage } from './types';

export type Session = 'morning' | 'afternoon' | 'evening';

/** When a course meets: the weekdays (Mon … Sun) and the time, "09:00-12:30". */
export type CourseSlot = { days: string[]; time: string };

export type CourseStep = {
  /** 'B2' or 'B1+' for a whole level, 'B2.1' or 'B1+.1' for a half, '' for a course without levels. */
  level: string;
  /** Weeks of teaching. */
  weeks: number;
  /** Both halves of a level. */
  complete: boolean;
  termId: string | null;
  /** Null when no term is planned yet: CASA plans it with the learner. */
  start: string | null;
  end: string | null;
  /** The lessons it teaches; null: its weeks times the lessons a week. */
  lessons: number | null;
  /** From the price list in force on its first day. */
  price: number | null;
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
  /** The fees and the rent, from the price list when the choice was made. */
  prices: CoursePrices;
};

export type CoursePrices = { enrolment: number | null; rent: number | null; placement: number | null; deposit: number | null };

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

const WORDS = {
  de: {
    complete: 'komplett',
    weeks: (n: number) => `${n} ${n === 1 ? 'Woche' : 'Wochen'}`,
    lessons: (n: number) => `${n} UE`,
    noDate: 'Termin nach Absprache',
    book: (title: string) => `Lehrbuch ${title}`,
    enrolment: 'Einschreibegebühr (einmalig bei der ersten Anmeldung)',
    accommodation: { host_family: 'Unterkunft in einer Gastfamilie', shared_flat: 'Zimmer in der CASA-WG' },
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


/** CASA's steps between a course's lowest and highest level: A1–C1 is A1.1 … C1.2, B1+.1 and B1+.2 included. */
export function levelsBetween(min: string | null, max: string | null): string[] {
  const all = [...CASA_LEVEL_SEQUENCE] as string[];
  const isOf = (step: string, level: string) => step === level || levelOf(step) === level;
  const from = min ? all.findIndex((l) => isOf(l, min)) : 0;
  const lastOf = max ? all.map((l, i) => (isOf(l, max) ? i : -1)).filter((i) => i >= 0).pop() : all.length - 1;
  if (from < 0 || lastOf == null || lastOf < from) return [];
  return all.slice(from, lastOf + 1);
}

/** The half levels a step teaches, whose books it needs: 'B2' is B2.1 and B2.2, 'B1+' is B1+.1 and B1+.2. */
export function halvesOf(step: Pick<CourseStep, 'level' | 'complete'>): string[] {
  return step.complete ? [`${step.level}.1`, `${step.level}.2`] : step.level ? [step.level] : [];
}

// ------------------------------------------------------------------ time

/**
 * The weeks a term teaches: its calendar weeks, less the ones the school is
 * closed all week (Easter 2026 takes 30.03.–03.04. out of the spring term).
 */
export function teachingWeeks(start: string, end: string): number {
  let weeks = 0;
  const monday = addDays(start, -((new Date(`${start}T00:00:00Z`).getUTCDay() + 6) % 7));
  for (let week = monday; week <= end; week = addDays(week, 7)) {
    for (let i = 0; i < 5; i++) {
      const d = addDays(week, i);
      if (d >= start && d <= end && !isSchoolClosed(d)) {
        weeks++;
        break;
      }
    }
  }
  return Math.max(1, weeks);
}

/**
 * A term's lessons: what FileMaker counted (`course_instances.lessons`), else
 * its class days outside the school's closures times the lessons a day.
 */
export function termLessons(term: Pick<CatalogueTerm, 'startDate' | 'endDate' | 'slot' | 'lessons'>, lessonsPerWeek: number): number {
  if (term.lessons) return term.lessons;
  const days = term.slot?.days.length ? term.slot.days : null;
  if (!days) return teachingWeeks(term.startDate, term.endDate) * lessonsPerWeek;
  let count = 0;
  for (let d = term.startDate; d <= term.endDate; d = addDays(d, 1)) {
    if (days.includes(ORDER[(new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7]) && !isSchoolClosed(d)) count++;
  }
  return Math.round((count * lessonsPerWeek) / days.length);
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

/**
 * A stay around the course: arrive the day before it starts, leave on the
 * Saturday after it ends.
 */
export function stayAround(steps: readonly Pick<CourseStep, 'start' | 'end'>[]): { from: string | null; to: string | null } {
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
  return {
    start: dated[0]?.start ?? null,
    end: dated[dated.length - 1]?.end ?? null,
    weeks: choice.steps.reduce((sum, s) => sum + s.weeks, 0),
    lessons: choice.steps.reduce((sum, s) => sum + stepLessons(s, choice.lessonsPerWeek), 0),
  };
}

const stepLessons = (step: Pick<CourseStep, 'weeks' | 'lessons'>, lessonsPerWeek: number) => step.lessons ?? step.weeks * lessonsPerWeek;

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
    const lessons = stepLessons(step, choice.lessonsPerWeek);
    const amount = [w.weeks(step.weeks), lessons ? w.lessons(lessons) : ''].filter(Boolean).join(', ');
    return {
      key: `course:${i}`,
      chargeType: 'tuition',
      description: [`${name}${step.level ? ` ${levelLabel(step, language)}` : ''}`, `${when} (${amount})`].join(' · '),
      unitAmount: step.price,
    };
  });
  for (const book of choice.books) {
    out.push({ key: `book:${book.key}`, chargeType: 'books', description: w.book(book.title), unitAmount: book.price });
  }
  if (choice.newStudent) out.push({ key: 'enrolment', chargeType: 'enrolment_fee', description: w.enrolment, unitAmount: choice.prices.enrolment });
  const a = choice.accommodation;
  const weeks = accommodationWeeks(a);
  if (a) {
    const when = a.from && a.to ? `${range(a.from, a.to, language)}, ${w.weeks(weeks)}` : w.noDate;
    out.push({ key: 'accommodation', chargeType: 'accommodation_rent', description: `${w.accommodation[a.kind]} · ${when}`, unitAmount: choice.prices.rent });
    if (choice.firstStay) {
      out.push({ key: 'placement', chargeType: 'accommodation_placement_fee', description: w.placement, unitAmount: choice.prices.placement });
      out.push({ key: 'deposit', chargeType: 'deposit', description: w.deposit, unitAmount: choice.prices.deposit });
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

/** A planned term of a course, as the catalogue lists it; `lessons` as FileMaker counted them, when it did. */
export type CatalogueTerm = { id: string; startDate: string; endDate: string; slot: CourseSlot | null; lessons: number | null };

export type CatalogueCourse = {
  slug: string;
  name: { de: string; en: string };
  lessonsPerWeek: number;
  /** The steps it teaches (A1.1 … C1.2); empty for a course without levels. */
  levels: string[];
  listPrice: number | null;
  terms: CatalogueTerm[];
};

export type CatalogueBook = { key: string; title: string; level: string; part: number | null };

/** A telc exam CASA holds, with its dates still to come and the fee on each. */
export type CatalogueExam = { code: string; name: string; level: string; sessions: { date: string; fee: number | null }[] };

export type CourseCatalogue = { courses: CatalogueCourse[]; books: CatalogueBook[]; exams: CatalogueExam[]; prices: PriceList[] };

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
 * the term it is. The books are each half level's. Every amount is the price
 * list's in force on its day; a course the list has no price for keeps the
 * catalogue's own.
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
  prices: readonly PriceList[];
}): CourseChoice | null {
  const { course } = input;
  const term = course.terms.find((t) => t.id === input.termId);
  if (!term || (course.levels.length > 0 && !input.level)) return null;
  const sameSlot = course.terms.filter((t) => slotKey(t.slot) === slotKey(term.slot));

  type Unpriced = Omit<CourseStep, 'price'>;
  let unpriced: Unpriced[];
  if (course.slug === 'intensive-german' && input.level) {
    unpriced = buildLevelPath({ slug: course.slug, value: input.level, option: term, options: sameSlot, availableLevels: course.levels, pathTo: input.pathTo, locale: 'de' }).map(
      (step) => ({ level: step.level, weeks: step.weeks, complete: step.complete, termId: step.option?.id ?? null, start: step.start, end: step.end, lessons: null })
    );
  } else {
    const weeks = teachingWeeks(term.startDate, term.endDate);
    const lessons = termLessons(term, course.lessonsPerWeek);
    unpriced = [{ level: input.level, weeks, complete: false, termId: term.id, start: term.startDate, end: term.endDate, lessons: lessons === weeks * course.lessonsPerWeek ? null : lessons }];
  }
  if (!unpriced.length) return null;
  const steps: CourseStep[] = unpriced.map((step) => ({
    ...step,
    price: coursePrice(input.prices, course.slug, step.start, { weeks: step.weeks, lessons: stepLessons(step, course.lessonsPerWeek) })?.amount ?? course.listPrice,
  }));
  const start = steps.find((s) => s.start)?.start ?? null;
  const list = listOn(input.prices, start);

  const halves = new Set(steps.flatMap(halvesOf));
  const books = input.withBooks
    ? input.books
        .filter((b) => halves.has(b.level) && (b.part === 1 || b.part === 2))
        .map((b) => ({ key: b.key, title: b.title, price: list?.books[b.key]?.amount ?? null }))
    : [];

  const a = input.accommodation;
  const arrival = a?.from ?? start;
  const prices: CoursePrices = {
    enrolment: feePrice(input.prices, start, 'enrolment_fee')?.amount ?? null,
    rent: rentPrice(input.prices, arrival, accommodationWeeks(a))?.amount ?? null,
    placement: feePrice(input.prices, arrival, 'accommodation_placement_fee')?.amount ?? null,
    deposit: feePrice(input.prices, arrival, 'deposit')?.amount ?? null,
  };

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
    prices,
  };
}
