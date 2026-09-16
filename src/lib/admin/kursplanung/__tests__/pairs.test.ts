import { describe, expect, it } from 'vitest';

import { assignmentsFromPairs } from '../pairs';
import { context, group, KW40, teacher } from './fixtures';

describe('assignmentsFromPairs', () => {
  const first = teacher({ id: 'first' });
  const second = teacher({ id: 'second' });

  it('lays the pair on its halves for every week of the month', () => {
    const g = group({ id: 'a1', teacherFirst: 'first', teacherSecond: 'second' });
    const out = assignmentsFromPairs(context({ teachers: [first, second], groups: [g] }));
    expect(out).toHaveLength(25);
    expect(out.filter((a) => a.onDate === KW40[2])[0].teacherId).toBe('first');
    expect(out.filter((a) => a.onDate === KW40[3])[0].teacherId).toBe('second');
  });

  it('leaves absent days open instead of forcing them', () => {
    const g = group({ id: 'a1', teacherFirst: 'first', teacherSecond: 'second' });
    const out = assignmentsFromPairs(
      context({ teachers: [first, second], groups: [g], absences: [{ teacherId: 'first', onDate: KW40[0], reason: 'Freistellung' }] })
    );
    expect(out).toHaveLength(24);
    expect(out.some((a) => a.onDate === KW40[0])).toBe(false);
  });

  it('does not put one teacher on two courses of a shift on the same day', () => {
    const g1 = group({ id: 'a1', teacherFirst: 'first', teacherSecond: 'second' });
    const g2 = group({ id: 'a2', level: 'A2', teacherFirst: 'first', teacherSecond: 'second' });
    const out = assignmentsFromPairs(context({ teachers: [first, second], groups: [g1, g2] }));
    expect(out.filter((a) => a.groupId === 'a2')).toHaveLength(0);
  });
});
