import { describe, expect, it } from 'vitest';

import { bzFree, bzRun, bzSegments, classesFor, type BzStart, type BzWeek } from '../bildungszeit-rules';

// The 2026/27 intensive starts: eight weeks each, morning and afternoon taking turns.
const starts: BzStart[] = [
  { id: 'aug03', startDate: '2026-08-03', endDate: '2026-09-24', shift: 'afternoon' },
  { id: 'aug31', startDate: '2026-08-31', endDate: '2026-10-23', shift: 'morning' },
  { id: 'sep28', startDate: '2026-09-28', endDate: '2026-11-19', shift: 'afternoon' },
  { id: 'oct26', startDate: '2026-10-26', endDate: '2026-12-18', shift: 'morning' },
];

describe('classesFor', () => {
  it('pairs the newest start with the one before it', () => {
    expect(classesFor(starts, '2026-09-14')).toMatchObject({ start: { id: 'aug31' }, previous: { id: 'aug03' } });
    expect(classesFor(starts, '2026-10-19')).toMatchObject({ start: { id: 'sep28' }, previous: { id: 'aug31' } });
    // A new start on the Monday is already the newest.
    expect(classesFor(starts, '2026-10-26')).toMatchObject({ start: { id: 'oct26' }, previous: { id: 'sep28' } });
  });

  it('has nothing before the second start, or once the previous course has ended', () => {
    expect(classesFor(starts, '2026-08-10')).toBeNull();
    expect(classesFor(starts.slice(0, 2), '2026-09-28')).toBeNull();
  });

  it('refuses two classes in the same shift', () => {
    expect(classesFor([{ ...starts[0], shift: 'morning' }, starts[1]], '2026-09-14')).toBeNull();
  });
});

const week = (monday: string, start: string, booked = 0): BzWeek => ({
  monday,
  friday: monday,
  kw: 0,
  start: { id: start, startDate: '', endDate: '', shift: 'morning' },
  previous: { id: 'p', startDate: '', endDate: '', shift: 'afternoon' },
  first: { 'B1.1': { places: 14, booked, offered: 1 } },
  second: {},
});

describe('bzRun and bzFree', () => {
  const weeks = [week('2026-09-14', 'aug31', 10), week('2026-09-21', 'aug31', 13), week('2026-09-28', 'sep28')];

  it('takes consecutive weeks, across a new start, never across a gap', () => {
    expect(bzRun(weeks, '2026-09-14', 2)?.map((w) => w.monday)).toEqual(['2026-09-14', '2026-09-21']);
    expect(bzRun(weeks, '2026-09-21', 2)?.map((w) => w.start.id)).toEqual(['aug31', 'sep28']);
    expect(bzRun(weeks, '2026-10-05', 1)).toBeNull();
    expect(bzRun(weeks, '2026-09-28', 2)).toBeNull();
  });

  it('cuts a run where a new course starts', () => {
    expect(bzSegments(bzRun(weeks, '2026-09-14', 3)!).map((s) => [s.from, s.start.id])).toEqual([
      ['2026-09-14', 'aug31'],
      ['2026-09-28', 'sep28'],
    ]);
    expect(bzSegments(bzRun(weeks, '2026-09-14', 2)!)).toHaveLength(1);
  });

  it('frees what the tightest week leaves', () => {
    expect(bzFree(bzRun(weeks, '2026-09-14', 1)!, 'first', 'B1.1')).toBe(3);
    expect(bzFree(bzRun(weeks, '2026-09-14', 2)!, 'first', 'B1.1')).toBe(0);
    expect(bzFree(bzRun(weeks, '2026-09-14', 1)!, 'second', 'B1.2')).toBe(14);
  });

  it('has no place in a course closed for booking', () => {
    const closed = weeks.map((w) => ({ ...w, first: { 'B1.1': { places: 14, booked: 0, offered: 0, closed: true } } }));
    expect(bzFree(bzRun(closed, '2026-09-14', 1)!, 'first', 'B1.1')).toBe(0);
  });
});
