import { describe, expect, it } from 'vitest';

import { parseGroupForm, type FormReader } from '../forms';

const reader = (fields: Record<string, string | string[]>): FormReader => ({
  get: (n) => { const v = fields[n]; return Array.isArray(v) ? v[0] ?? null : v ?? null; },
  getAll: (n) => { const v = fields[n]; return Array.isArray(v) ? v : v === undefined ? [] : [v]; },
});
const U1 = '11111111-1111-4111-8111-111111111111', U2 = '22222222-2222-4222-8222-222222222222';

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
