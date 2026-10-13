import { describe, expect, it } from 'vitest';

import {
  accommodationWeeks,
  buildCourse,
  closuresIn,
  courseFacts,
  courseLines,
  courseTitle,
  daysLabel,
  examsAfter,
  extraNights,
  levelsBetween,
  slotLabel,
  stayAround,
  teachingWeeks,
  termLessons,
  type CatalogueBook,
  type CatalogueCourse,
  type CatalogueExam,
} from '../course';
import { listsFromRates, type RateRow } from '../../prices/price-list';
import { offerChecks } from '../checks';
import { buildLines } from '../engine';
import { DEFAULT_STAY, type OfferDraft } from '../types';

const MORNING = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '09:00-12:30' };
const AFTERNOON = { days: ['Mon', 'Tue', 'Wed', 'Thu'], time: '13:00-17:30' };

const intensive: CatalogueCourse = {
  slug: 'intensive-german',
  name: { de: 'Intensivkurs', en: 'Intensive German' },
  lessonsPerWeek: 20,
  levels: levelsBetween('A1', 'C1'),
  listPrice: 520,
  terms: [
    { id: '00000000-0000-4000-8000-000000000001', startDate: '2026-10-26', endDate: '2026-12-18', slot: MORNING, lessons: null },
    { id: '00000000-0000-4000-8000-000000000002', startDate: '2027-01-04', endDate: '2027-02-26', slot: MORNING, lessons: null },
    { id: '00000000-0000-4000-8000-000000000003', startDate: '2026-10-26', endDate: '2026-12-17', slot: AFTERNOON, lessons: null },
  ],
};

const evening: CatalogueCourse = {
  slug: 'evening-german',
  name: { de: 'Abendkurs', en: 'German in the Evening' },
  lessonsPerWeek: 4,
  levels: levelsBetween('A1', 'C1'),
  listPrice: 378,
  terms: [
    { id: '00000000-0000-4000-8000-000000000004', startDate: '2027-01-04', endDate: '2027-04-14', slot: { days: ['Mon', 'Wed'], time: '18:30-20:00' }, lessons: 54 },
    { id: '00000000-0000-4000-8000-000000000005', startDate: '2026-08-24', endDate: '2026-12-16', slot: { days: ['Mon', 'Wed'], time: '18:30-20:00' }, lessons: null },
  ],
};

const books: CatalogueBook[] = [
  { key: 'b21', title: 'Kontext B2.1', level: 'B2.1', part: 1 },
  { key: 'b22', title: 'Kontext B2.2', level: 'B2.2', part: 2 },
  { key: 'fokus', title: 'Fokus Deutsch B1/B2', level: 'B2.1', part: 3 },
  { key: 'c11', title: 'Kontext C1.1', level: 'C1.1', part: 1 },
  { key: 'c12', title: 'Kontext C1.2', level: 'C1.2', part: 2 },
  { key: 'a11', title: 'Netzwerk neu A1.1', level: 'A1.1', part: 1 },
];

/** The 2026 list as seed 0007 and 0004 bring it, and a 2027 list where only the 8-week intensive price changed. */
let n = 0;
const row = (r: Partial<RateRow> & Pick<RateRow, 'scope' | 'amount'>): RateRow => ({
  id: `r${++n}`,
  courseSlug: null,
  examCode: null,
  materialId: null,
  chargeType: null,
  parts: null,
  minQuantity: null,
  maxQuantity: null,
  unit: 'item',
  validFrom: '2026-01-01',
  ...r,
});
const weeks = (slug: string | null, table: number[], from = '2026-01-01') =>
  table.map((amount, i) =>
    row({ scope: slug ? 'course_type' : 'charge_type', courseSlug: slug, chargeType: slug ? null : 'accommodation_rent', minQuantity: i + 1, maxQuantity: i + 1, amount, validFrom: from })
  );
const y2026: RateRow[] = [
  ...weeks('intensive-german', [145, 280, 405, 520, 625, 730, 835, 940, 1057.5, 1175]),
  row({ scope: 'course_type', courseSlug: 'intensive-german', unit: 'week', amount: 117.5 }),
  row({ scope: 'course_type', courseSlug: 'evening-german', unit: 'lesson', amount: 7 }),
  ...weeks(null, [200, 340, 460]),
  row({ scope: 'charge_type', chargeType: 'accommodation_rent', unit: 'week', amount: 145 }),
  row({ scope: 'charge_type', chargeType: 'enrolment_fee', amount: 50 }),
  row({ scope: 'charge_type', chargeType: 'accommodation_placement_fee', amount: 50 }),
  row({ scope: 'charge_type', chargeType: 'deposit', amount: 580 }),
  ...books.map((b) => row({ scope: 'material', materialId: b.key, amount: b.level.startsWith('A') ? 23.99 : b.key === 'fokus' ? 30.75 : 26.99 })),
];
const prices = listsFromRates([
  ...y2026,
  ...y2026.map((r) => ({ ...r, id: `${r.id}-2027`, validFrom: '2027-01-01', amount: r.courseSlug === 'intensive-german' && r.minQuantity === 8 ? 990 : r.amount })),
]);

const exams: CatalogueExam[] = [
  { code: 'telc_b2', name: 'telc Deutsch B2', level: 'B2', sessions: [{ date: '2026-10-16', fee: 190 }, { date: '2026-12-11', fee: 190 }, { date: '2027-01-22', fee: 190 }] },
  { code: 'telc_c1_hochschule', name: 'telc Deutsch C1 Hochschule', level: 'C1', sessions: [{ date: '2027-03-05', fee: 210 }] },
];

const b2 = (more: Partial<Parameters<typeof buildCourse>[0]> = {}) =>
  buildCourse({ course: intensive, termId: intensive.terms[0].id, level: 'B2', pathTo: '', books, withBooks: true, newStudent: true, accommodation: null, exams, prices, ...more })!;

const amounts = (lines: ReturnType<typeof courseLines>) => Object.fromEntries(lines.map((l) => [l.key, l.unitAmount]));

describe('a learner’s course', () => {
  it('prices B2 complete for a first registration the way FileMaker’s offers do: 940, both books, the enrolment fee', () => {
    const course = b2();
    expect(course.steps).toEqual([
      { level: 'B2', weeks: 8, complete: true, termId: intensive.terms[0].id, start: '2026-10-26', end: '2026-12-18', lessons: null, price: 940 },
    ]);
    expect(amounts(courseLines(course, 'de'))).toEqual({ 'course:0': 940, 'book:b21': 26.99, 'book:b22': 26.99, enrolment: 50 });
    expect(courseTitle(course, 'de')).toBe('Intensivkurs B2 komplett');
  });

  it('charges a half level 520 and only its own book; no enrolment fee for someone who has studied at CASA', () => {
    const course = b2({ level: 'B2.1', newStudent: false });
    expect(amounts(courseLines(course, 'en'))).toEqual({ 'course:0': 520, 'book:b21': 26.99 });
  });

  it('climbs a path through the next term at the same time of day, each level at the price list of its start', () => {
    const course = b2({ pathTo: 'C1' });
    expect(course.steps.map((s) => [s.level, s.start, s.price])).toEqual([
      ['B2', '2026-10-26', 940],
      ['C1', '2027-01-04', 990],
    ]);
    expect(course.books.map((b) => b.key)).toEqual(['b21', 'b22', 'c11', 'c12']);
    expect(courseTitle(course, 'de')).toBe('Intensivkurs B2 bis C1');
  });

  it('needs a level for a course that has levels, and a term', () => {
    expect(buildCourse({ course: intensive, termId: intensive.terms[0].id, level: '', pathTo: '', books, withBooks: true, newStudent: true, accommodation: null, prices })).toBeNull();
    expect(buildCourse({ course: intensive, termId: 'nope', level: 'B2', pathTo: '', books, withBooks: true, newStudent: true, accommodation: null, prices })).toBeNull();
  });

  it('prices the evening course per lesson: the term’s lessons as FileMaker counted them, else its class days', () => {
    const spring = buildCourse({ course: evening, termId: evening.terms[0].id, level: 'A1.1', pathTo: '', books, withBooks: true, newStudent: false, accommodation: null, prices })!;
    expect(amounts(courseLines(spring, 'de'))).toEqual({ 'course:0': 378, 'book:a11': 23.99 });
    expect(courseLines(spring, 'de')[0].description).toBe('Abendkurs A1.1 · 04.01.–14.04.2027 (15 Wochen, 54 UE)');
    expect(slotLabel(spring.slot, 'de')).toBe('Abends, Mo + Mi 18:30–20:00');
    // 24.08.–16.12.2026, Monday and Wednesday, no closure: 34 evenings, 68 lessons — 476 €, as on the website.
    const autumn = buildCourse({ course: evening, termId: evening.terms[1].id, level: 'A1.1', pathTo: '', books, withBooks: false, newStudent: false, accommodation: null, prices })!;
    expect(autumn.steps[0].price).toBe(476);
  });

  it('counts a term’s weeks and lessons around the school’s closures', () => {
    expect(teachingWeeks('2026-03-02', '2026-05-01')).toBe(8);
    expect(teachingWeeks('2026-10-26', '2026-12-18')).toBe(8);
    expect(termLessons({ startDate: '2026-08-24', endDate: '2026-12-16', slot: { days: ['Mon', 'Wed'], time: '18:30-20:00' }, lessons: null }, 4)).toBe(68);
    expect(termLessons({ startDate: '2027-01-04', endDate: '2027-04-14', slot: null, lessons: 54 }, 4)).toBe(54);
  });

  it('says when the course meets, and the holidays inside it', () => {
    expect(slotLabel(MORNING, 'de')).toBe('Vormittags, Mo–Fr 09:00–12:30');
    expect(slotLabel(AFTERNOON, 'en')).toBe('Afternoons, Mon–Thu 13:00–17:30');
    expect(daysLabel(['Wed', 'Mon'], 'en')).toBe('Mon & Wed');
    const path = b2({ pathTo: 'C1' });
    expect(closuresIn(path).map((c) => c.label.en)).toEqual(['Christmas']);
    expect(courseFacts(path, 'de')).toBe(
      'Vormittags, Mo–Fr 09:00–12:30 · 26.10.2026–26.02.2027 · 16 Wochen · 320 UE · unterrichtsfrei 21.12.2026–01.01.2027 (Weihnachten)'
    );
    expect(closuresIn(b2())).toEqual([]);
  });
});

describe('accommodation', () => {
  it('runs from the Sunday before to the Saturday after, in whole weeks', () => {
    const stay = stayAround(b2().steps);
    expect(stay).toEqual({ from: '2026-10-25', to: '2026-12-19' });
    expect(accommodationWeeks({ kind: 'host_family', ...stay })).toBe(8);
    expect(extraNights({ kind: 'host_family', ...stay })).toBe(0);
    expect(extraNights({ kind: 'host_family', from: '2026-10-25', to: '2026-12-20' })).toBe(1);
  });

  it('charges the list’s rent: 200 / 340 / 460 for one to three weeks, 145 a week from four', () => {
    const rentFor = (to: string) => b2({ accommodation: { kind: 'host_family', from: '2026-10-25', to } }).prices.rent;
    expect(['2026-10-31', '2026-11-07', '2026-11-14', '2026-11-21', '2026-12-19'].map(rentFor)).toEqual([200, 340, 460, 580, 1160]);
  });

  it('adds the placement fee and the refundable deposit on a first stay only', () => {
    const accommodation = { kind: 'host_family' as const, from: '2026-10-25', to: '2026-12-19' };
    expect(amounts(courseLines(b2({ newStudent: false, withBooks: false, accommodation }), 'de'))).toEqual({ 'course:0': 940, accommodation: 1160, placement: 50, deposit: 580 });
    expect(amounts(courseLines(b2({ newStudent: false, withBooks: false, accommodation, firstStay: false }), 'de'))).toEqual({ 'course:0': 940, accommodation: 1160 });
  });
});

describe('the exam', () => {
  it('is offered when the path ends at its level, on its dates from the course’s last week', () => {
    expect(examsAfter(b2(), exams)).toEqual([{ code: 'telc_b2', name: 'telc Deutsch B2', sessions: [{ date: '2026-12-11', fee: 190 }, { date: '2027-01-22', fee: 190 }] }]);
    expect(examsAfter(b2({ level: 'B2.1' }), exams)).toEqual([]);
    expect(examsAfter(b2({ pathTo: 'C1' }), exams).map((e) => e.code)).toEqual(['telc_c1_hochschule']);
  });

  it('goes on the offer, and leaves it when the path no longer leads there', () => {
    const exam = { code: 'telc_b2', name: 'telc Deutsch B2', date: '2026-12-11', fee: 190 };
    expect(courseLines(b2({ exam, newStudent: false, withBooks: false }), 'de').at(-1)).toEqual({
      key: 'exam',
      chargeType: 'exam_fee',
      description: 'Prüfung telc Deutsch B2 · am 11.12.2026',
      unitAmount: 190,
    });
    expect(b2({ exam, pathTo: 'C1' }).exam).toBeNull();
  });
});

describe('on the offer', () => {
  const draft = (course: ReturnType<typeof b2>, more: Partial<OfferDraft> = {}): OfferDraft =>
    ({
      kind: 'individual',
      language: 'de',
      presentation: 'lines',
      recipientName: 'Marta Kowalska',
      contactEmail: 'marta@example.com',
      title: courseTitle(course, 'de'),
      groupName: '',
      arrival: null,
      departure: null,
      participants: null,
      escorts: 0,
      validUntil: '2026-10-19',
      stay: { choices: { ...DEFAULT_STAY, course }, overrides: {}, manual: [] },
      ...more,
    }) as OfferDraft;

  it('becomes the offer’s lines, each with its level and dates', () => {
    const course = b2();
    const lines = buildLines(draft(course));
    expect(lines.map((l) => l.key)).toEqual(['course:0', 'book:b21', 'book:b22', 'enrolment']);
    expect(lines[0].description).toBe('Intensivkurs B2 komplett · 26.10.–18.12.2026 (8 Wochen, 160 UE)');
  });

  it('is checked: a validity after the start, accommodation without dates, nights beyond whole weeks', () => {
    const course = b2({ accommodation: { kind: 'host_family', from: '2026-10-25', to: '2026-12-20' } });
    const checks = (d: OfferDraft) => offerChecks(d, buildLines(d), '2026-10-13').map((c) => c.message);
    expect(checks(draft(course, { validUntil: '2026-11-01' }))).toEqual(
      expect.arrayContaining(['Valid until after the course starts', '1 night of the stay beyond whole weeks, not priced'])
    );
    expect(checks(draft(b2({ accommodation: { kind: 'host_family', from: null, to: null } })))).toContain('Accommodation without dates');
    expect(checks(draft(course))).not.toContain('Valid until after the course starts');
  });
});
