import { describe, expect, it } from 'vitest';

import { fit, remainingDays, span } from '../fit';
import { assignment, context, group, KW40, teacher } from './fixtures';

const anna = teacher({ id: 'anna', levels: ['A1'] });
const a1 = group({ id: 'a1' });
const a2 = group({ id: 'a2', level: 'A2' });

describe('fit', () => {
  it('lets a free, present teacher onto a course day', () => {
    const ctx = context({ teachers: [anna], groups: [a1] });
    expect(fit(ctx, 'anna', a1, KW40[0])).toEqual({ ok: true, substitute: false, levelMatch: true });
  });

  it('blocks an absent day with its reason', () => {
    const ctx = context({ teachers: [anna], groups: [a1], absences: [{ teacherId: 'anna', onDate: KW40[0], reason: 'Krank' }] });
    expect(fit(ctx, 'anna', a1, KW40[0])).toEqual({ ok: false, reason: 'Krank' });
  });

  it('blocks a weekday the person does not work', () => {
    const noFriday = teacher({ id: 'nf', weekdays: ['Mo', 'Di', 'Mi', 'Do'] });
    const ctx = context({ teachers: [noFriday], groups: [a1] });
    expect(fit(ctx, 'nf', a1, KW40[4])).toEqual({ ok: false, reason: 'nicht am Fr' });
  });

  it('blocks a second course of the same shift on the same day', () => {
    const ctx = context({ teachers: [anna], groups: [a1, a2], assignments: [assignment('a2', KW40[0], 'anna')] });
    expect(fit(ctx, 'anna', a1, KW40[0])).toEqual({ ok: false, reason: 'schon verplant' });
  });

  it('blocks when the week is full, but not the day already held', () => {
    const two = teacher({ id: 'two', daysPerWeek: 2 });
    const ctx = context({
      teachers: [two],
      groups: [a1],
      assignments: [assignment('a1', KW40[0], 'two'), assignment('a1', KW40[1], 'two')],
    });
    expect(fit(ctx, 'two', a1, KW40[2])).toEqual({ ok: false, reason: 'Woche voll' });
    expect(fit(ctx, 'two', a1, KW40[0]).ok).toBe(true);
  });

  it('marks the other shift as a substitution and a missing level as a warning', () => {
    const pm = teacher({ id: 'pm', shifts: ['afternoon'], levels: ['B1'] });
    const ctx = context({ teachers: [pm], groups: [a1] });
    expect(fit(ctx, 'pm', a1, KW40[0])).toEqual({ ok: true, substitute: true, levelMatch: false });
  });
});

describe('remaining days', () => {
  it('counts the piece: contract minus absences minus days used', () => {
    const ctx = context({
      teachers: [anna],
      groups: [a1],
      assignments: [assignment('a1', KW40[0], 'anna'), assignment('a1', KW40[1], 'anna')],
      absences: [{ teacherId: 'anna', onDate: KW40[4], reason: 'Urlaub' }],
    });
    expect(remainingDays(ctx, anna, KW40[0])).toEqual({ rest: 2, used: 2, max: 5, awayAll: false });
  });

  it('recognises a whole week away', () => {
    const ctx = context({ teachers: [anna], groups: [a1], absences: KW40.map((d) => ({ teacherId: 'anna', onDate: d, reason: 'Freistellung' as const })) });
    expect(remainingDays(ctx, anna, KW40[0]).awayAll).toBe(true);
  });
});

describe('span', () => {
  it('lays down as many consecutive days as the piece has left', () => {
    const three = teacher({ id: 'three', daysPerWeek: 3 });
    const ctx = context({ teachers: [three], groups: [a1] });
    expect(span(ctx, 'three', a1, KW40[0])).toEqual(KW40.slice(0, 3));
    expect(span(ctx, 'three', a1, KW40[3])).toEqual(KW40.slice(3));
  });

  it('stops at another teacher and skips nothing', () => {
    const ctx = context({ teachers: [anna, teacher({ id: 'bo' })], groups: [a1], assignments: [assignment('a1', KW40[2], 'bo')] });
    expect(span(ctx, 'anna', a1, KW40[0])).toEqual(KW40.slice(0, 2));
  });

  it('honours an explicit limit', () => {
    const ctx = context({ teachers: [anna], groups: [a1] });
    expect(span(ctx, 'anna', a1, KW40[0], 2)).toEqual(KW40.slice(0, 2));
  });
});
