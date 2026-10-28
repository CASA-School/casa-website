import { describe, expect, it } from 'vitest';

import { isBookablePlacementTime, isPlacementDate, PLACEMENT_TIMES, placementDays } from './placement-schedule';

// Tuesday 27 October 2026, 09:00 in Bremen (CET).
const now = new Date('2026-10-27T08:00:00Z');

describe('placement appointments', () => {
  it('offers Tuesday to Thursday only, at the twelve agreed times', () => {
    const days = placementDays(new Map(), now);
    for (const day of days) expect([2, 3, 4]).toContain(new Date(`${day.date}T12:00Z`).getUTCDay());
    expect(days.find((day) => day.date === '2026-10-28')?.times).toEqual([...PLACEMENT_TIMES]);
    expect(PLACEMENT_TIMES).not.toContain('10:30');
    expect(PLACEMENT_TIMES).not.toContain('14:30');
  });

  it('closes a time two hours before it starts, so today begins at 11:00', () => {
    const today = placementDays(new Map(), now).find((day) => day.date === '2026-10-27');
    expect(today?.times[0]).toBe('11:00');
    expect(isBookablePlacementTime('2026-10-27', '10:00', now)).toBe(false);
    expect(isBookablePlacementTime('2026-10-27', '11:00', now)).toBe(true);
  });

  it('counts two places per time and says how many are left', () => {
    const booked = new Map([['2026-10-28T09:30', 2], ['2026-10-28T10:00', 1]]);
    const day = placementDays(booked, now).find((item) => item.date === '2026-10-28')!;
    expect(day.times).not.toContain('09:30');
    expect(day.left['10:00']).toBe(1);
    expect(day.left['11:00']).toBe(2);
  });

  it('refuses Mondays, Fridays, holidays, the Christmas closure and the past', () => {
    for (const date of ['2026-10-26', '2026-10-30', '2026-12-22', '2026-10-20', '2027-03-30x']) {
      expect(isPlacementDate(date, now)).toBe(false);
    }
    expect(isBookablePlacementTime('2026-10-28', '10:30', now)).toBe(false);
  });
});
