import { describe, expect, it } from 'vitest';

import { parseGroupForm, parseTeacherForm, type FormReader } from '../forms';
import { planningWeeks } from '../weeks';

const reader = (fields: Record<string, string | string[]>): FormReader => ({
  get: (n) => { const v = fields[n]; return Array.isArray(v) ? v[0] ?? null : v ?? null; },
  getAll: (n) => { const v = fields[n]; return Array.isArray(v) ? v : v === undefined ? [] : [v]; },
});
const weeks = planningWeeks('2026-10');
const U1 = '11111111-1111-4111-8111-111111111111', U2 = '22222222-2222-4222-8222-222222222222';

describe('parseTeacherForm', () => {
  it('reads rules and absences per week into dates', () => {
    const r = parseTeacherForm(reader({
      shortName: ' Claudia G ', shifts: ['morning', 'afternoon'], daysPerWeek: '4', weekdays: ['Mo', 'Di', 'Mi', 'Do'],
      levels: ['C1', 'C1H', 'nope'], contract: 'freelance', note: 'ab Oktober nur vier Tage',
      'abs_2026-10-05': ['Mo', 'Di'], 'reason_2026-10-05': 'Krank',
    }), 't1', weeks);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rules).toEqual({ shortName: 'Claudia G', contract: 'freelance', shifts: ['morning', 'afternoon'], daysPerWeek: 4, weekdays: ['Mo', 'Di', 'Mi', 'Do'], levels: ['C1', 'C1H'], note: 'ab Oktober nur vier Tage' });
    expect(r.absences).toEqual([
      { teacherId: 't1', onDate: '2026-10-05', reason: 'Krank' },
      { teacherId: 't1', onDate: '2026-10-06', reason: 'Krank' },
    ]);
  });

  it('refuses an empty name, no shift, no weekday and an impossible quota', () => {
    const base = { shortName: 'X', shifts: ['morning'], daysPerWeek: '5', weekdays: ['Mo'] };
    expect(parseTeacherForm(reader({ ...base, shortName: '  ' }), 't', weeks).ok).toBe(false);
    expect(parseTeacherForm(reader({ ...base, shifts: [] }), 't', weeks).ok).toBe(false);
    expect(parseTeacherForm(reader({ ...base, weekdays: [] }), 't', weeks).ok).toBe(false);
    expect(parseTeacherForm(reader({ ...base, daysPerWeek: '6' }), 't', weeks).ok).toBe(false);
  });

  it('falls back to Urlaub for an unknown reason', () => {
    const r = parseTeacherForm(reader({ shortName: 'X', shifts: ['morning'], daysPerWeek: '5', weekdays: ['Mo'], 'abs_2026-09-28': ['Fr'], 'reason_2026-09-28': 'Mondurlaub' }), 't', weeks);
    expect(r.ok && r.absences[0]).toEqual({ teacherId: 't', onDate: '2026-10-02', reason: 'Urlaub' });
  });
});

describe('parseGroupForm', () => {
  it('reads a pair, registrations and the FileMaker id', () => {
    expect(parseGroupForm(reader({ registrations: '14', teacherFirst: U1, teacherSecond: U2, filemakerCourseId: ' 4744 ' })))
      .toEqual({ ok: true, registrations: 14, teacherFirst: U1, teacherSecond: U2, filemakerCourseId: '4744' });
  });
  it('allows an empty half and refuses the same teacher twice or garbage ids', () => {
    expect(parseGroupForm(reader({ registrations: '0', teacherFirst: U1, teacherSecond: '' })).ok).toBe(true);
    expect(parseGroupForm(reader({ registrations: '0', teacherFirst: U1, teacherSecond: U1 })).ok).toBe(false);
    expect(parseGroupForm(reader({ registrations: '0', teacherFirst: 'abc' })).ok).toBe(false);
    expect(parseGroupForm(reader({ registrations: '-1' })).ok).toBe(false);
  });
});
