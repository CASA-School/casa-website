import { describe, expect, it } from 'vitest';

import { courseDays, fit, inCourse, span } from '../fit';
import { assignmentsFromPairs } from '../pairs';
import { analysePlan } from '../rules';
import { validateWeekAssignments } from '../week';
import { planningWeeks } from '../weeks';
import { assignment, context, group, teacher } from './fixtures';

/**
 * A start on Monday 6 March 2028: its planning month March opens on Monday 28 February (KW 9), five
 * days before the start (the audit of 2026-10-17 found a teacher saved there). Its course runs to
 * 28 April; the board offers no slot outside it and the server takes none.
 */
const weeks = planningWeeks('2028-03');
const kw9 = weeks[0];
const anna = teacher({ id: 'anna' });
const start = group({ id: 'b1', month: '2028-03-01', phase: '1', courseStart: '2028-03-06', courseEnd: '2028-04-28' });
const free = group({ id: 'free', month: '2028-03-01', phase: '1', level: 'A2' });

describe('a board group inside its course', () => {
  it('has no day of the planning month before the start', () => {
    expect(kw9.start).toBe('2028-02-28');
    expect(courseDays(start, kw9)).toEqual([]);
    expect(courseDays(start, weeks[1])).toEqual(['2028-03-06', '2028-03-07', '2028-03-08', '2028-03-09', '2028-03-10']);
    // A group of no course keeps every day of its month.
    expect(courseDays(free, kw9)).toHaveLength(5);
  });

  it('ends with its course', () => {
    const end = group({ id: 'b1', month: '2028-03-01', courseStart: '2028-01-31', courseEnd: '2028-03-02' });
    expect(courseDays(end, kw9)).toEqual(['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02']);
    expect(inCourse(end, '2028-03-03')).toBe(false);
  });

  it('does not fit a teacher outside it, and a piece stops at its edge', () => {
    const ctx = context({ teachers: [anna], groups: [start], weeks });
    const f = fit(ctx, 'anna', start, '2028-03-03');
    expect(f.ok).toBe(false);
    expect(fit(ctx, 'anna', start, '2028-03-06').ok).toBe(true);
    expect(span(ctx, 'anna', start, '2028-03-03')).toEqual([]);
  });

  it('is not filled from its pair, and shows no open day, before the start', () => {
    const paired = { ...start, teacherFirst: 'anna', teacherSecond: 'anna' };
    const ctx = context({ teachers: [anna], groups: [paired], weeks });
    expect(assignmentsFromPairs(ctx).every((a) => a.onDate >= '2028-03-06')).toBe(true);
    expect(analysePlan(ctx).issues.filter((i) => i.code === 'offen' && i.weekStart === kw9.start)).toEqual([]);
  });

  it('is refused by the server outside it', () => {
    const errors = validateWeekAssignments(
      { month: '2028-03', shift: 'morning', weekStart: kw9.start, assignments: [assignment('b1', '2028-03-01', 'anna')] },
      [start],
      [anna],
      weeks
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^outside the course/);
    expect(
      validateWeekAssignments({ month: '2028-03', shift: 'morning', weekStart: weeks[1].start, assignments: [assignment('b1', '2028-03-06', 'anna')] }, [start], [anna], weeks)
    ).toEqual([]);
  });
});
