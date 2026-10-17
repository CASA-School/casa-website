import { describe, expect, it } from 'vitest';

import { overallOutcome, partsSat, ratedParts } from '../exam-parts';

describe('an exam candidate’s result (0038)', () => {
  it('counts only the parts sat', () => {
    expect(partsSat('full')).toEqual(['written', 'oral']);
    expect(partsSat('oral')).toEqual(['oral']);
    expect(ratedParts('written')).toBe(1);
  });

  it('is worked out from the parts, and waits until every part sat has one', () => {
    expect(overallOutcome('full', { written: 'passed', oral: null })).toBeNull();
    expect(overallOutcome('full', { written: 'passed', oral: 'passed' })).toBe('passed');
    expect(overallOutcome('full', { written: 'passed', oral: 'failed' })).toBe('partial');
    expect(overallOutcome('full', { written: 'passed', oral: 'absent' })).toBe('partial');
    expect(overallOutcome('full', { written: 'failed', oral: 'absent' })).toBe('failed');
    expect(overallOutcome('full', { written: 'absent', oral: 'absent' })).toBe('absent');
    // A part not sat does not count, whatever is stored for it.
    expect(overallOutcome('written', { written: 'passed', oral: 'failed' })).toBe('passed');
  });
});
