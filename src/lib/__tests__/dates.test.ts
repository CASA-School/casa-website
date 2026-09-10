import { describe, expect, it } from 'vitest';

import { toDateInputValue } from '@/lib/dates';

/**
 * The regression these exist for: a Postgres `date` arrives as a `Date` at
 * LOCAL midnight, and `toISOString()` shifts it back a day for any positive
 * UTC offset. A birth date stored as 1998-03-14 rendered as "13 March 1998",
 * and a cohort starting on the 28th prefilled a form with the 27th.
 */
describe('toDateInputValue', () => {
  it('keeps the local calendar day for a positive UTC offset', () => {
    // Berlin summer time: local midnight is 22:00 UTC the day before.
    const localMidnight = new Date('1998-03-14T00:00:00+02:00');
    expect(localMidnight.toISOString().slice(0, 10)).toBe('1998-03-13');
    // The whole point: the local day survives.
    expect(toDateInputValue(localMidnight)).toBe(
      `${localMidnight.getFullYear()}-${String(localMidnight.getMonth() + 1).padStart(2, '0')}-${String(
        localMidnight.getDate()
      ).padStart(2, '0')}`
    );
  });

  it('pads single-digit months and days', () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateInputValue(new Date(2026, 10, 30))).toBe('2026-11-30');
  });

  it('passes a date-only string through and trims a timestamp to its date', () => {
    expect(toDateInputValue('2026-09-28')).toBe('2026-09-28');
    expect(toDateInputValue('2026-09-28T22:15:00Z')).toBe('2026-09-28');
  });

  it('is empty for nothing, and for a date that is not one', () => {
    expect(toDateInputValue(null)).toBe('');
    expect(toDateInputValue(undefined)).toBe('');
    expect(toDateInputValue('')).toBe('');
    expect(toDateInputValue('not a date')).toBe('');
    expect(toDateInputValue(new Date('nonsense'))).toBe('');
  });
});
