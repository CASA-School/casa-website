import { describe, expect, it } from 'vitest';

import { addMonths, formatDay, monthGrid, parseTypedDate, weekday } from '../calendar';

const TODAY = '2026-10-13';

describe('the calendar', () => {
  it('starts weeks on Monday and pads the month with empty days', () => {
    const april = monthGrid(2027, 4);
    // 1 April 2027 is a Thursday.
    expect(april[0]).toEqual([null, null, null, '2027-04-01', '2027-04-02', '2027-04-03', '2027-04-04']);
    expect(april.every((w) => w.length === 7)).toBe(true);
    expect(april.flat().filter(Boolean)).toHaveLength(30);
  });

  it('knows a Sunday from a Saturday, and moves across years', () => {
    expect(weekday('2027-04-11')).toBe(6);
    expect(weekday('2027-04-24')).toBe(5);
    expect(addMonths(2026, 12, 1)).toEqual({ y: 2027, m: 1 });
    expect(addMonths(2027, 1, -1)).toEqual({ y: 2026, m: 12 });
    expect(formatDay('2027-04-11')).toBe('Sun 11 Apr 2027');
  });
});

describe('a date as it is typed', () => {
  it('reads the German and the ISO way of writing it', () => {
    expect(parseTypedDate('11.04.2027', TODAY)).toBe('2027-04-11');
    expect(parseTypedDate('11.4.27', TODAY)).toBe('2027-04-11');
    expect(parseTypedDate('11/04/2027', TODAY)).toBe('2027-04-11');
    expect(parseTypedDate('2027-04-11', TODAY)).toBe('2027-04-11');
  });

  it('takes a day and a month as the next time it comes round', () => {
    expect(parseTypedDate('11.4.', TODAY)).toBe('2027-04-11');
    expect(parseTypedDate('20.10', TODAY)).toBe('2026-10-20');
    expect(parseTypedDate('11 April', TODAY)).toBe('2027-04-11');
    expect(parseTypedDate('11. März 2027', TODAY)).toBe('2027-03-11');
    expect(parseTypedDate('Apr 11, 2027', TODAY)).toBe('2027-04-11');
    expect(parseTypedDate('Sun 11 Apr 2027', TODAY)).toBe('2027-04-11');
  });

  it('counts from today', () => {
    expect(parseTypedDate('today', TODAY)).toBe(TODAY);
    expect(parseTypedDate('+14', TODAY)).toBe('2026-10-27');
    expect(parseTypedDate('+6w', TODAY)).toBe('2026-11-24');
  });

  it('refuses what is not a date', () => {
    expect(parseTypedDate('31.02.2027', TODAY)).toBeNull();
    expect(parseTypedDate('soon', TODAY)).toBeNull();
    expect(parseTypedDate('', TODAY)).toBeNull();
  });
});
