import { describe, expect, it } from 'vitest';

import { validateWeekAssignments, weekSlice } from '../week';
import { planningWeeks } from '../weeks';
import { assignment, group, KW40, teacher } from './fixtures';

const weeks = planningWeeks('2026-10');
const anna = teacher({ id: 'anna' });
const a1 = group({ id: 'a1' });
const pm = group({ id: 'pm', shift: 'afternoon' });

describe('validateWeekAssignments', () => {
  const base = { month: '2026-10', shift: 'morning' as const, weekStart: KW40[0] };

  it('accepts a clean week', () => {
    expect(validateWeekAssignments({ ...base, assignments: [assignment('a1', KW40[0], 'anna')] }, [a1, pm], [anna], weeks)).toEqual([]);
  });

  it('rejects a group of the other shift, a foreign date, an unknown teacher and a double cell', () => {
    const errors = validateWeekAssignments(
      {
        ...base,
        assignments: [
          assignment('pm', KW40[0], 'anna'),
          assignment('a1', '2026-10-05', 'anna'),
          assignment('a1', KW40[1], 'ghost'),
          assignment('a1', KW40[2], 'anna'),
          assignment('a1', KW40[2], 'anna'),
        ],
      },
      [a1, pm],
      [anna],
      weeks
    );
    expect(errors).toHaveLength(4);
    expect(errors.join(' ')).toMatch(/afternoon|not a morning/);
    expect(errors.join(' ')).toContain('2026-10-05');
    expect(errors.join(' ')).toContain('ghost');
    expect(errors.join(' ')).toContain('two teachers');
  });

  it('rejects a week that is not in the month', () => {
    expect(validateWeekAssignments({ ...base, weekStart: '2026-11-02', assignments: [] }, [a1], [anna], weeks)).toHaveLength(1);
  });
});

describe('weekSlice', () => {
  it('keeps only this shift and this week', () => {
    const all = [assignment('a1', KW40[0], 'anna'), assignment('a1', '2026-10-05', 'anna'), assignment('pm', KW40[0], 'anna')];
    expect(weekSlice(all, [a1, pm], 'morning', weeks[0])).toEqual([all[0]]);
  });
});
