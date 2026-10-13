import { describe, expect, it } from 'vitest';

import { resolveAccess } from '../../access';
import {
  coursePrice,
  feePrice,
  listOn,
  listStatus,
  listsFromRates,
  nextYearStart,
  parseAmount,
  parseSlot,
  priceAt,
  rentPrice,
  slotKey,
  tariffPrice,
  type RateRow,
} from '../price-list';

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

const rows: RateRow[] = [
  row({ scope: 'course_type', courseSlug: 'intensive-german', minQuantity: 4, maxQuantity: 4, amount: 520 }),
  row({ scope: 'course_type', courseSlug: 'intensive-german', minQuantity: 8, maxQuantity: 8, amount: 940 }),
  row({ scope: 'course_type', courseSlug: 'intensive-german', unit: 'week', amount: 117.5 }),
  row({ scope: 'course_type', courseSlug: 'evening-german', unit: 'lesson', amount: 7 }),
  row({ scope: 'course_type', courseSlug: 'bildungszeit', unit: 'item', amount: 280 }),
  row({ scope: 'charge_type', chargeType: 'accommodation_rent', minQuantity: 1, maxQuantity: 1, amount: 200 }),
  row({ scope: 'charge_type', chargeType: 'accommodation_rent', unit: 'week', amount: 145 }),
  row({ scope: 'charge_type', chargeType: 'enrolment_fee', amount: 50 }),
  row({ scope: 'exam_type', examCode: 'telc_b2', parts: 2, amount: 190 }),
  row({ scope: 'exam_type', examCode: 'telc_b2', parts: 1, amount: 160 }),
  row({ scope: 'material', materialId: 'm1', amount: 26.99 }),
  // Next year: the enrolment fee goes up.
  row({ scope: 'charge_type', chargeType: 'enrolment_fee', amount: 60, validFrom: '2027-01-01' }),
  row({ scope: 'course_type', courseSlug: 'intensive-german', minQuantity: 8, maxQuantity: 8, amount: 990, validFrom: '2027-01-01' }),
];

const lists = listsFromRates(rows);

describe('price lists', () => {
  it('are the rows sharing a date, each closed the day before the next starts', () => {
    expect(lists.map((l) => [l.validFrom, l.validTo])).toEqual([
      ['2026-01-01', '2026-12-31'],
      ['2027-01-01', null],
    ]);
    expect(lists[0].courses['intensive-german'].table[8].amount).toBe(940);
    expect(lists[0].exams.telc_b2).toEqual({ full: { id: expect.any(String), amount: 190 }, part: { id: expect.any(String), amount: 160 } });
    expect(lists[0].books.m1.amount).toBe(26.99);
  });

  it('price each thing from the list in force on its day', () => {
    expect(listOn(lists, '2026-10-13')?.validFrom).toBe('2026-01-01');
    expect(listOn(lists, '2027-01-01')?.validFrom).toBe('2027-01-01');
    expect(listOn(lists, '2025-06-01')?.validFrom).toBe('2026-01-01');
    expect(feePrice(lists, '2026-12-31', 'enrolment_fee')?.amount).toBe(50);
    expect(feePrice(lists, '2027-01-04', 'enrolment_fee')?.amount).toBe(60);
    expect(coursePrice(lists, 'intensive-german', '2027-01-04', { weeks: 8 })?.amount).toBe(990);
  });

  it('say whether a list has ended, is in force or is still to come', () => {
    expect(listStatus(lists[0], '2026-10-13')).toBe('current');
    expect(listStatus(lists[1], '2026-10-13')).toBe('future');
    expect(listStatus(lists[0], '2027-02-01')).toBe('past');
    expect(nextYearStart('2026-10-13')).toBe('2027-01-01');
  });
});

describe('tariffs', () => {
  const list = lists[0];

  it('take the table’s price for that many weeks, else the rate', () => {
    expect(tariffPrice(list.courses['intensive-german'], { weeks: 4 })?.amount).toBe(520);
    expect(tariffPrice(list.courses['intensive-german'], { weeks: 12 })?.amount).toBe(1410);
    expect(tariffPrice(list.courses['evening-german'], { weeks: 15, lessons: 54 })?.amount).toBe(378);
    expect(tariffPrice(list.courses['evening-german'], { weeks: 15 })).toBeNull();
    expect(tariffPrice(list.courses.bildungszeit, { weeks: 8 })?.amount).toBe(280);
    expect(tariffPrice(list.courses['special-courses'], { weeks: 8 })).toBeNull();
  });

  it('price rent for whole weeks', () => {
    expect(rentPrice(lists, '2026-10-25', 1)?.amount).toBe(200);
    expect(rentPrice(lists, '2026-10-25', 8)?.amount).toBe(1160);
    expect(rentPrice(lists, '2026-10-25', 0)).toBeNull();
  });
});

describe('slots and amounts', () => {
  it('name every price the screen edits, and only those', () => {
    for (const key of ['course:intensive-german:8', 'course:evening-german:rate', 'rent:2', 'rent:rate', 'fee:deposit', 'exam:telc_b2:1', 'book:7f0f2a3e-5b9c-4d1e-8f3a-2b6c9d0e1f2a']) {
      expect(slotKey(parseSlot(key)!)).toBe(key);
    }
    for (const bad of ['course:Intensive:8', 'course:intensive-german:99', 'fee:tuition', 'exam:telc_b2:3', 'book:m1', 'rent', 'other:x']) {
      expect(parseSlot(bad)).toBeNull();
    }
    expect(priceAt(lists[0], parseSlot('course:evening-german:rate')!)).toEqual({ id: expect.any(String), amount: 7, unit: 'lesson' });
  });

  it('read German and English amounts, and refuse anything else', () => {
    expect(parseAmount('1.057,50')).toBe(1057.5);
    expect(parseAmount('1057,5')).toBe(1057.5);
    expect(parseAmount('117.50')).toBe(117.5);
    expect(parseAmount(' 50 € ')).toBe(50);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('-5')).toBeUndefined();
    expect(parseAmount('abc')).toBeUndefined();
    expect(parseAmount('1000000')).toBeUndefined();
  });
});

describe('who works on the price list', () => {
  it('is management by role, and a colleague only when the Team screen gives it', () => {
    expect(resolveAccess('owner', []).prices).toBe('full');
    expect(resolveAccess('admin', []).prices).toBe('full');
    expect(resolveAccess('staff', []).prices).toBe('none');
    expect(resolveAccess('staff', [{ module: 'prices', level: 'edit' }]).prices).toBe('edit');
  });
});

