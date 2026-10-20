import { describe, expect, it } from 'vitest';

import { isSecondHalf, secondHalfStart } from '../halves';
import { offeredLevels } from '../levels';

const MON_FRI = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MON_THU = ['Mon', 'Tue', 'Wed', 'Thu'];

describe('the second half of an intensive term', () => {
  it('begins in the fifth teaching week', () => {
    expect(secondHalfStart('2026-10-26', '2026-12-18', MON_FRI)).toBe('2026-11-23');
    expect(secondHalfStart('2026-09-28', '2026-11-19', MON_THU)).toBe('2026-10-26');
  });

  it('does not count a week the school is closed', () => {
    // Christmas 21.12.2026–01.01.2027: two weeks out of a ten-week span.
    expect(secondHalfStart('2026-11-23', '2027-01-28', MON_THU)).toBe('2027-01-04');
  });

  it('gives no date where the term does not have exactly eight teaching weeks', () => {
    expect(secondHalfStart('2027-06-28', '2027-08-27', MON_FRI)).toBeNull();
  });

  it('knows a second half by its code', () => {
    expect(isSecondHalf('A2.2')).toBe(true);
    expect(isSecondHalf('B1+.2')).toBe(true);
    expect(isSecondHalf('A2.1')).toBe(false);
    expect(isSecondHalf('B1')).toBe(false);
  });
});

describe('the levels a start offers (from what it runs)', () => {
  const generic = ['A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B1+.1', 'B1+.2', 'B2.1', 'B2.2', 'C1.1', 'C1.2'];

  it('offers both halves of each level an intensive start runs', () => {
    expect(offeredLevels('intensive-german', ['A2.1', 'B1+.1'], [], generic)).toEqual(['A2.1', 'A2.2', 'B1+.1', 'B1+.2']);
  });

  it('offers an evening start exactly its halves, and never B1+ it does not run', () => {
    expect(offeredLevels('evening-german', ['A1.2', 'A1.1', 'B1.1', 'C1.2'], [], generic)).toEqual(['A1.1', 'A1.2', 'B1.1', 'C1.2']);
  });

  it('falls back to what the format runs, then to its range, where a start has nothing planned', () => {
    expect(offeredLevels('evening-german', [], ['A2.2', 'B2.1'], generic)).toEqual(['A2.2', 'B2.1']);
    expect(offeredLevels('evening-german', undefined, [], generic)).toEqual(generic);
  });
});
