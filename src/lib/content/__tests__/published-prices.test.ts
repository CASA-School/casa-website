import { describe, expect, it } from 'vitest';

import { CASA_CALCULATOR_PRICING } from '@/config/calculator/pricing';
import { fallbackCourseTypes, fallbackExamTypes } from '@/config/content/public-fixtures';
import { SPECIAL_COURSE_CONSTANTS } from '@/config/courses/special-course-modules';
import { listOn, listsFromRates, parseSlot, type RateRow } from '@/lib/admin/prices/price-list';

import { DEFAULT_PUBLISHED_PRICES, PUBLISHED_SLOTS, calculatorPricing, publishedCourseFrom, publishedFromList } from '../published-prices';

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
const table = (r: Partial<RateRow>, amounts: number[]) => amounts.map((amount, i) => row({ scope: 'course_type', ...r, minQuantity: i + 1, maxQuantity: i + 1, amount }));

/** The 2026 list as seeds 0004 and 0007 bring it. */
const y2026: RateRow[] = [
  ...table({ courseSlug: 'intensive-german' }, [145, 280, 405, 520, 625, 730, 835, 940, 1057.5, 1175]),
  row({ scope: 'course_type', courseSlug: 'intensive-german', unit: 'week', amount: 117.5 }),
  row({ scope: 'course_type', courseSlug: 'evening-german', unit: 'lesson', amount: 7 }),
  row({ scope: 'course_type', courseSlug: 'special-courses', unit: 'lesson', amount: 8 }),
  ...table({ scope: 'charge_type', chargeType: 'accommodation_rent' }, [200, 340, 460]),
  row({ scope: 'charge_type', chargeType: 'accommodation_rent', unit: 'week', amount: 145 }),
  row({ scope: 'charge_type', chargeType: 'enrolment_fee', amount: 50 }),
  row({ scope: 'charge_type', chargeType: 'accommodation_placement_fee', amount: 50 }),
  row({ scope: 'charge_type', chargeType: 'deposit', amount: 580 }),
  row({ scope: 'exam_type', examCode: 'telc_b2', parts: 2, amount: 190 }),
  row({ scope: 'exam_type', examCode: 'telc_b2', parts: 1, amount: 160 }),
  row({ scope: 'exam_type', examCode: 'telc_c1_hochschule', parts: 2, amount: 210 }),
  row({ scope: 'exam_type', examCode: 'telc_c1_hochschule', parts: 1, amount: 185 }),
  row({ scope: 'material', materialId: 'netzwerk', amount: 23.99 }),
  row({ scope: 'material', materialId: 'kontext', amount: 26.99 }),
  row({ scope: 'material', materialId: 'grammar', amount: 15.99 }),
];
const extra = { eveningTerms: [378, 476], courseBooks: ['netzwerk', 'kontext'] };

describe('the website’s prices', () => {
  it('are the published figures without a price list', () => {
    expect(publishedFromList(null, extra)).toBe(DEFAULT_PUBLISHED_PRICES);
  });

  it('are the same from the 2026 list as the published figures, so both modes show one price', () => {
    const [list] = listsFromRates(y2026);
    expect(publishedFromList(list, extra)).toEqual(DEFAULT_PUBLISHED_PRICES);
  });

  it('follow the list in force: a price changed for next year shows from 1 January', () => {
    const lists = listsFromRates([
      ...y2026,
      ...y2026.map((r) => ({
        ...r,
        id: `${r.id}-2027`,
        validFrom: '2027-01-01',
        amount: r.chargeType === 'enrolment_fee' ? 60 : r.courseSlug === 'intensive-german' && r.minQuantity === 8 ? 990 : r.amount,
      })),
    ]);
    expect(publishedFromList(listOn(lists, '2026-12-31'), extra).enrolmentFee).toBe(50);
    const next = publishedFromList(listOn(lists, '2027-01-01'), extra);
    expect([next.enrolmentFee, next.intensive8Weeks, next.intensive4Weeks]).toEqual([60, 990, 520]);
  });

  it('keep a published figure the list does not hold', () => {
    const [list] = listsFromRates(y2026.filter((r) => r.chargeType !== 'deposit' && r.courseSlug !== 'special-courses'));
    const prices = publishedFromList(list, { eveningTerms: [], courseBooks: [] });
    expect(prices.deposit).toBe(DEFAULT_PUBLISHED_PRICES.deposit);
    expect(prices.specialModule).toBe(DEFAULT_PUBLISHED_PRICES.specialModule);
    expect(prices.eveningFrom).toBe(DEFAULT_PUBLISHED_PRICES.eveningFrom);
    expect(prices.exams.telc_b2.prep).toBe(DEFAULT_PUBLISHED_PRICES.exams.telc_b2.prep);
  });

  it('agree with the fixtures a site without a database shows', () => {
    for (const course of fallbackCourseTypes) {
      const from = publishedCourseFrom(DEFAULT_PUBLISHED_PRICES, course.slug);
      if (from !== undefined) expect(Number(course.default_price), course.slug).toBe(from);
    }
    for (const exam of fallbackExamTypes) {
      const listed = DEFAULT_PUBLISHED_PRICES.exams[exam.code as keyof typeof DEFAULT_PUBLISHED_PRICES.exams];
      if (listed) expect(Number(exam.default_fee), exam.code).toBe(listed.full);
    }
    expect(calculatorPricing(DEFAULT_PUBLISHED_PRICES)).toEqual(CASA_CALCULATOR_PRICING);
    expect(DEFAULT_PUBLISHED_PRICES.specialPerEvening).toBe(SPECIAL_COURSE_CONSTANTS.pricePerSessionEur);
  });

  it('name real price-list entries as the ones on the website', () => {
    for (const slot of PUBLISHED_SLOTS) expect(parseSlot(slot), slot).not.toBeNull();
  });
});
