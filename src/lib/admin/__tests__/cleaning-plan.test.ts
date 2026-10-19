import { describe, expect, it } from 'vitest';

import { dutyIndex, mondayOf, weekPlan, weeksSince } from '../cleaning-plan';

describe('the Putzplan rotation (0072)', () => {
  it('counts whole weeks from the plan’s Monday, whatever day is asked', () => {
    expect(mondayOf('2026-10-22')).toBe('2026-10-19');
    expect(weeksSince('2026-01-05', '2026-01-11')).toBe(0);
    expect(weeksSince('2026-01-05', '2026-01-12')).toBe(1);
    expect(weeksSince('2026-01-07', '2026-10-21')).toBe(41);
    expect(weeksSince('2026-01-05', '2025-12-31')).toBe(-1);
  });

  it('moves every room one duty on each week, and gives each duty to exactly one room', () => {
    for (let week = 0; week < 6; week++) {
      const duties = [0, 1, 2, 3, 4].map((room) => dutyIndex(room, 5, 5, week));
      expect([...duties].sort()).toEqual([0, 1, 2, 3, 4]);
      expect(dutyIndex(0, 5, 5, week + 1)).toBe(((duties[0] ?? 0) + 1) % 5);
    }
  });

  it('gives a room a free week in turn when there are more rooms than duties', () => {
    const plan = [0, 1, 2, 3].map((room) => [0, 1, 2, 3].map((week) => dutyIndex(room, 4, 3, week)));
    // Each room is free once in four weeks; each week one room is free.
    for (const room of plan) expect(room.filter((d) => d === null)).toHaveLength(1);
    for (let week = 0; week < 4; week++) expect(plan.filter((room) => room[week] === null)).toHaveLength(1);
  });

  it('has no duty without any duties, and still turns before the first week', () => {
    expect(dutyIndex(0, 3, 0, 2)).toBeNull();
    expect(dutyIndex(0, 3, 3, -1)).toBe(2);
  });

  it('lays a week out over the rooms in their order', () => {
    expect(weekPlan(['a', 'b', 'c'], ['Bad', 'Küche', 'Flur'], '2026-01-05', '2026-01-14')).toEqual(['Küche', 'Flur', 'Bad']);
  });
});
