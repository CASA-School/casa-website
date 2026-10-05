import { describe, expect, it } from 'vitest';

import type { CourseRegistrationOption } from '@/lib/content/types';
import { buildLevelPath, continuationLevels, pathWeeks } from '../level-path';

const LEVELS = ['A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B1+', 'B2.1', 'B2.2', 'C1.1', 'C1.2'];

// The intensive terms the local database lists: monthly starts, eight weeks each.
const term = (id: string, startDate: string, endDate: string) =>
  ({ id, startDate, endDate, dateRangeLabel: `${startDate} – ${endDate}`, scheduleLabel: 'Mo–Fr', availableLevels: LEVELS }) as unknown as CourseRegistrationOption;
const terms = [
  term('oct', '2026-10-26', '2026-12-18'),
  term('nov', '2026-11-23', '2027-01-28'),
  term('jan', '2027-01-04', '2027-02-26'),
  term('feb', '2027-02-01', '2027-04-01'),
  term('mar', '2027-03-01', '2027-04-30'),
];

const path = (value: string, pathTo: string, start = terms[0]) =>
  buildLevelPath({ slug: 'intensive-german', value, option: start, options: terms, availableLevels: LEVELS, pathTo, locale: 'de' });

describe('a learning path through the levels', () => {
  it('runs A2 to B2 as three whole levels, each in the first term after the last', () => {
    const steps = path('A2', 'B2');
    expect(steps.map((step) => [step.level, step.option?.id])).toEqual([['A2', 'oct'], ['B1', 'jan'], ['B2', 'mar']]);
    expect(steps[1].label).toBe('B1 komplett (B1.1 + B1.2) · 8 Wochen');
    expect(steps.map((step) => step.startCode)).toEqual(['A2.1', 'B1.1', 'B2.1']);
    expect(pathWeeks(steps)).toBe(24);
  });

  it('finishes a level it starts at its first half, and runs a second half as its four weeks first', () => {
    expect(path('A2.1', 'B1').map((step) => step.level)).toEqual(['A2', 'B1']);
    const fromSecondHalf = path('A2.2', 'B1');
    expect(fromSecondHalf.map((step) => [step.level, step.option?.id])).toEqual([['A2.2', 'oct'], ['B1', 'nov']]);
    expect(pathWeeks(fromSecondHalf)).toBe(12);
  });

  it('leaves a step without a date when the catalogue lists no term for it yet', () => {
    const steps = path('A2', 'C1');
    expect(steps.map((step) => step.level)).toEqual(['A2', 'B1', 'B2', 'C1']);
    expect(steps[3].option).toBeNull();
    expect(steps[3].start).toBeNull();
  });

  it('is the chosen level alone without a target, and offers only whole levels above it', () => {
    expect(path('A2', '')).toHaveLength(1);
    expect(continuationLevels('intensive-german', 'A2', LEVELS)).toEqual(['B1', 'B2', 'C1']);
    expect(continuationLevels('intensive-german', 'B1+', LEVELS)).toEqual(['B2', 'C1']);
    expect(continuationLevels('evening-german', 'A2.1', LEVELS)).toEqual([]);
  });
});
