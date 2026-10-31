import { describe, expect, it } from 'vitest';

import { examAfterPreparation } from '../preparation';

// C1 Hochschule days as the exam catalogue holds them: instants, the winter ones at 08:30 Bremen time.
const sittings = [
  { id: 'nov', startsAt: '2026-11-27T07:30:00.000Z' },
  { id: 'feb', startsAt: '2027-02-05T07:30:00.000Z' },
  { id: 'mar', startsAt: '2027-03-05T07:30:00.000Z' },
  { id: 'may', startsAt: '2027-05-14T06:30:00.000Z' },
];
const at = (sitting: { startsAt: string }) => sitting.startsAt;

describe('the exam day a preparation course leads to', () => {
  it('is the first sitting after the course ends', () => {
    expect(examAfterPreparation(sittings, '2027-01-29', at)?.id).toBe('feb');
    expect(examAfterPreparation(sittings, '2027-02-26', at)?.id).toBe('mar');
  });

  it('may be two weeks on, as in April 2027, but not a later course\'s', () => {
    expect(examAfterPreparation(sittings, '2027-04-30', at)?.id).toBe('may');
    // The November course's exam is gone from the list: January's is not offered in its place.
    expect(examAfterPreparation(sittings.slice(1), '2026-11-20', at)).toBeNull();
  });

  it('is never the course\'s own last day or earlier', () => {
    expect(examAfterPreparation([{ startsAt: '2027-01-29T07:30:00.000Z' }], '2027-01-29', at)).toBeNull();
  });
});
