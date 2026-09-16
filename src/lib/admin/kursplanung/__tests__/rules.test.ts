import { describe, expect, it } from 'vitest';

import { analysePlan } from '../rules';
import { assignment, context, group, KW40, teacher } from './fixtures';

const codes = (ctx: ReturnType<typeof context>) => analysePlan(ctx).issues.map((i) => i.code);

describe('analysePlan', () => {
  it('lists every unplanned course day as open', () => {
    const ctx = context({ groups: [group({ id: 'a1' })] });
    // 5 planning weeks in October 2026 × 5 morning days.
    expect(codes(ctx).filter((c) => c === 'offen')).toHaveLength(25);
  });

  it('flags a double booking on both tiles', () => {
    const anna = teacher({ id: 'anna' });
    const ctx = context({
      teachers: [anna],
      groups: [group({ id: 'a1' }), group({ id: 'a2', level: 'A2' })],
      assignments: [assignment('a1', KW40[0], 'anna'), assignment('a2', KW40[0], 'anna')],
    });
    const doubles = analysePlan(ctx).issues.filter((i) => i.code === 'doppelt');
    expect(doubles.map((i) => i.groupId).sort()).toEqual(['a1', 'a2']);
    expect(doubles[0].severity).toBe('hard');
  });

  it('flags an assignment on an absent day and on a weekday not worked', () => {
    const anna = teacher({ id: 'anna', weekdays: ['Mo', 'Di', 'Mi', 'Do'] });
    const ctx = context({
      teachers: [anna],
      groups: [group({ id: 'a1' })],
      assignments: [assignment('a1', KW40[0], 'anna'), assignment('a1', KW40[4], 'anna')],
      absences: [{ teacherId: 'anna', onDate: KW40[0], reason: 'Krank' }],
    });
    const byKey = analysePlan(ctx).byKey;
    expect(byKey.get(`a1|${KW40[0]}`)?.map((i) => i.code)).toEqual(['abwesend']);
    expect(byKey.get(`a1|${KW40[4]}`)?.map((i) => i.code)).toEqual(['wochentag']);
  });

  it('flags more days than the contract allows, on every day of that week', () => {
    const two = teacher({ id: 'two', daysPerWeek: 2 });
    const ctx = context({
      teachers: [two],
      groups: [group({ id: 'a1' })],
      assignments: KW40.slice(0, 3).map((d) => assignment('a1', d, 'two')),
    });
    expect(codes(ctx).filter((c) => c === 'kontingent')).toHaveLength(3);
  });

  it('warns about the other shift without the substitute mark, and about a missing level', () => {
    const pm = teacher({ id: 'pm', shifts: ['afternoon'], levels: ['B1'] });
    const ctx = context({ teachers: [pm], groups: [group({ id: 'a1' })], assignments: [assignment('a1', KW40[0], 'pm')] });
    expect(analysePlan(ctx).byKey.get(`a1|${KW40[0]}`)?.map((i) => i.code).sort()).toEqual(['niveau', 'schicht']);

    const marked = context({ ...ctx, assignments: [assignment('a1', KW40[0], 'pm', { isSubstitute: true })] });
    expect(analysePlan(marked).byKey.get(`a1|${KW40[0]}`)?.map((i) => i.code)).toEqual(['niveau']);
  });

  it('warns when a course sees more than two faces in a week', () => {
    const ts = ['a', 'b', 'c'].map((id) => teacher({ id }));
    const ctx = context({
      teachers: ts,
      groups: [group({ id: 'a1' })],
      assignments: [assignment('a1', KW40[0], 'a'), assignment('a1', KW40[1], 'b'), assignment('a1', KW40[2], 'c')],
    });
    expect(codes(ctx)).toContain('wechsel');
  });

  it('records who is used on which days per week', () => {
    const anna = teacher({ id: 'anna' });
    const ctx = context({ teachers: [anna], groups: [group({ id: 'a1' })], assignments: [assignment('a1', KW40[0], 'anna')] });
    expect(analysePlan(ctx).usage.get(KW40[0])?.get('anna')).toEqual(new Set([KW40[0]]));
  });
});
