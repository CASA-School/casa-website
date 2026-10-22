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

  it('takes two groups taught together (a Zusammenlegung) as one class, not a double booking', () => {
    const anna = teacher({ id: 'anna' });
    const merged = context({
      teachers: [anna],
      groups: [group({ id: 'a1' }), group({ id: 'a2', level: 'A2' })],
      assignments: [assignment('a1', KW40[0], 'anna', { merged: true }), assignment('a2', KW40[0], 'anna', { merged: true })],
    });
    expect(codes(merged)).not.toContain('doppelt');

    // A third group the same day is still one too many.
    const third = context({
      ...merged,
      groups: [...merged.groups, group({ id: 'b1', level: 'B1' })],
      assignments: [...merged.assignments, assignment('b1', KW40[0], 'anna')],
    });
    expect(codes(third)).toContain('doppelt');
  });

  it('flags an assignment on an absent day and on a weekday not worked', () => {
    const anna = teacher({ id: 'anna', days: { morning: ['Mo', 'Di', 'Mi', 'Do'], afternoon: [] } });
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
    const pm = teacher({ id: 'pm', days: { morning: [], afternoon: ['Mo', 'Di', 'Mi', 'Do'] }, shifts: ['afternoon'], levels: ['B1'] });
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

  it('warns when a teacher would keep a class for a fourth level running', () => {
    const anna = teacher({ id: 'anna', levels: ['A1', 'A2', 'B1', 'B1+', 'B2'] });
    const b2 = group({ id: 'b2', level: 'B2' });
    const history = { b2: [{ level: 'B1+', teachers: ['anna'] }, { level: 'B1', teachers: ['anna', 'ben'] }, { level: 'A2', teachers: ['anna'] }] };
    const ctx = context({ teachers: [anna], groups: [b2], assignments: [assignment('b2', KW40[0], 'anna')], history });
    const serie = analysePlan(ctx).issues.find((i) => i.code === 'serie');
    expect(serie?.text.de).toBe('4. Niveau in Folge');
    expect(serie?.detail?.de).toBe('dieselbe Gruppe schon in A2 · B1 · B1+');

    // A break in the run — someone else had the class in B1 — and it is no fourth level.
    const broken = context({ ...ctx, history: { b2: [history.b2[0], { level: 'B1', teachers: ['ben'] }, history.b2[2]] } });
    expect(codes(broken)).not.toContain('serie');
  });

  it('warns about more teaching units in a week than the contract holds', () => {
    const part = teacher({ id: 'part', weeklyUnits: 8 });
    const ctx = context({ teachers: [part], groups: [group({ id: 'a1' })], assignments: KW40.slice(0, 2).map((d) => assignment('a1', d, 'part')) });
    // Two mornings are 8 units: within the contract.
    expect(codes(ctx)).not.toContain('stunden');
    // An evening course outside the board adds to them.
    const evening = context({ ...ctx, otherUnits: { part: { [KW40[0]]: 2 } } });
    expect(analysePlan(evening).issues.find((i) => i.code === 'stunden')?.text.de).toBe('10 von 8 UE');
  });

  it('records who is used on which days per week', () => {
    const anna = teacher({ id: 'anna' });
    const ctx = context({ teachers: [anna], groups: [group({ id: 'a1' })], assignments: [assignment('a1', KW40[0], 'anna')] });
    expect(analysePlan(ctx).usage.get(KW40[0])?.get('anna')).toEqual(new Set([KW40[0]]));
  });
});
