import { describe, expect, it } from 'vitest';

import { isoWeek, monthLabel, monthStart, planningWeeks, weekStartOf, weekdayOf } from '../weeks';

describe('planning weeks', () => {
  it('starts a month on the Monday the sheet uses', () => {
    // Weekday 1st → Monday of that week; weekend 1st → the following Monday.
    expect(monthStart('2026-07')).toBe('2026-06-29');
    expect(monthStart('2026-08')).toBe('2026-08-03');
    expect(monthStart('2026-09')).toBe('2026-08-31');
    expect(monthStart('2026-10')).toBe('2026-09-28');
  });

  it('runs until the next month starts — usually four weeks, five when the next 1st is a weekend day', () => {
    expect(planningWeeks('2026-09').map((w) => w.start)).toEqual([
      '2026-08-31',
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
    ]);
    // 1 November 2026 is a Sunday, so November starts on the 2nd and October
    // keeps the week of the 26th — the same way July 2026 got its fifth week.
    expect(planningWeeks('2026-10').map((w) => w.start)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
    expect(planningWeeks('2026-07')).toHaveLength(5);
  });

  it('labels weeks the way planners quote them', () => {
    const [first] = planningWeeks('2026-10');
    expect(first.kw).toBe(40);
    expect(first.label).toBe('28.09.–02.10.');
    expect(first.days).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(isoWeek('2026-01-01')).toBe(1);
  });

  it('knows weekdays and week starts', () => {
    expect(weekdayOf('2026-10-01')).toBe('Do');
    expect(weekdayOf('2026-10-03')).toBeNull();
    expect(weekStartOf('2026-10-01')).toBe('2026-09-28');
    expect(monthLabel('2026-10')).toBe('Oktober 2026');
  });
});
