import { describe, expect, it } from 'vitest';

import { levelCodeOf, levelPlace, planMonthOfStart, startMonths } from '../course-link';
import { monthStart } from '../weeks';

describe('planMonthOfStart', () => {
  it('maps the 2026/27 intensive starts to their planning months', () => {
    expect(planMonthOfStart('2026-08-03')).toBe('2026-08');
    expect(planMonthOfStart('2026-08-31')).toBe('2026-09');
    expect(planMonthOfStart('2026-09-28')).toBe('2026-10');
    // October runs five weeks on the board (November starts on the 2nd); the 26 Oct start is November's.
    expect(planMonthOfStart('2026-10-26')).toBe('2026-11');
    expect(planMonthOfStart('2026-11-23')).toBe('2026-12');
    expect(planMonthOfStart('2027-01-04')).toBe('2027-01');
  });

  it('lands on the month whose planning start is within a week of the start', () => {
    for (const start of ['2026-08-03', '2026-08-31', '2026-09-28', '2026-10-26', '2026-11-23', '2027-01-04']) {
      const gap = Math.abs(Date.parse(monthStart(planMonthOfStart(start))) - Date.parse(start)) / 86_400_000;
      expect(gap).toBeLessThanOrEqual(7);
    }
  });

  it('accepts a timestamp string', () => {
    expect(planMonthOfStart('2026-08-31T00:00:00.000Z')).toBe('2026-09');
  });
});

describe('levelPlace', () => {
  it('splits a level code into the board level and phase', () => {
    expect(levelPlace('A1.1')).toEqual({ level: 'A1', phase: '1' });
    expect(levelPlace('B1.2')).toEqual({ level: 'B1', phase: '2' });
    expect(levelPlace('B1+.1')).toEqual({ level: 'B1+', phase: '1' });
    expect(levelPlace('B1+.2')).toEqual({ level: 'B1+', phase: '2' });
    expect(levelPlace('B1+')).toEqual({ level: 'B1+', phase: '1' });
    expect(levelPlace('C1.2')).toEqual({ level: 'C1', phase: '2' });
  });

  it('refuses what the board does not plan', () => {
    expect(levelPlace('C2.1')).toBeNull();
    expect(levelPlace('')).toBeNull();
  });

  it('round-trips through levelCodeOf', () => {
    for (const code of ['A1.1', 'A2.2', 'B1+.1', 'C1.2']) {
      const place = levelPlace(code)!;
      expect(levelCodeOf(place.level, place.phase)).toBe(code);
    }
    expect(levelCodeOf('C1H', '1')).toBeNull();
  });
});

describe('startMonths', () => {
  it('gives the start month and its continuation', () => {
    expect(startMonths('2026-11-23')).toEqual({ first: '2026-12', second: '2027-01' });
  });
});
