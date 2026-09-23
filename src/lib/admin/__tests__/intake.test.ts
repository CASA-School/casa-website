import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * INF-06: nothing seeds exam_sessions, so a database-backed form still offers
 * fixture sessions — uuid-shaped ids with no row. Storing one as a plain FK
 * aborted the transaction and lost the registration. These tests pin that the
 * insert resolves each FK through its table and keeps the label regardless.
 */

const calls: { sql: string; params: unknown[] }[] = [];
const client = {
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (/INSERT INTO people/.test(sql)) return { rows: [{ id: 'person-1' }] };
    if (/INSERT INTO (course|exam)_registrations/.test(sql)) return { rows: [{ id: 'registration-1' }] };
    return { rows: [] };
  }),
};

vi.mock('../db', () => ({
  isWorkspaceDatabaseConfigured: () => true,
  withTransaction: (work: (c: typeof client) => Promise<unknown>) => work(client),
}));
vi.mock('../flags', () => ({ raiseFlag: vi.fn(async () => undefined) }));

import { storeCourseRegistration, storeExamRegistration } from '../intake';

const FIXTURE_TYPE_ID = '40000000-0000-4000-8000-000000010003';
const FIXTURE_SESSION_ID = '20000000-0000-4000-8000-000000000001';

const person = {
  requestId: '00000000-0000-4000-8000-00000000abcd',
  salutation: 'ms',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '+49 421 000000',
  nationality: 'Germany',
  birthDate: '1990-01-01',
  locale: 'de' as const,
};

afterEach(() => {
  calls.length = 0;
  client.query.mockClear();
});

describe('registration intake foreign keys', () => {
  it('resolves exam type and session through their tables and keeps the labels', async () => {
    const stored = await storeExamRegistration({
      ...person,
      examTypeId: FIXTURE_TYPE_ID,
      examSessionId: FIXTURE_SESSION_ID,
      examTypeLabel: 'telc Deutsch B2',
      examSessionLabel: '21.11.2026 | CASA Bremen',
      registrationType: 'full',
      officialNameConfirmed: true,
    });

    expect(stored).toBe(true);
    const insert = calls.find((call) => /INSERT INTO exam_registrations/.test(call.sql))!;
    expect(insert.sql).toMatch(/\(SELECT id FROM exam_types WHERE id = \$2::uuid\)/);
    expect(insert.sql).toMatch(/\(SELECT id FROM exam_sessions WHERE id = \$3::uuid\)/);
    expect(insert.params.slice(1, 5)).toEqual([
      FIXTURE_TYPE_ID,
      FIXTURE_SESSION_ID,
      'telc Deutsch B2',
      '21.11.2026 | CASA Bremen',
    ]);
  });

  it('resolves course type and instance the same way, and never passes a non-uuid', async () => {
    const stored = await storeCourseRegistration({
      ...person,
      courseTypeId: 'intensive-german',
      courseInstanceId: FIXTURE_SESSION_ID,
      courseTypeLabel: 'Intensiv Deutsch',
      courseInstanceLabel: '26.10.2026 - 18.12.2026',
      currentLevel: '',
      visaRequired: false,
      accommodationRequired: false,
      accommodationType: undefined,
      smoker: false,
      allergies: '',
      notes: '',
    });

    expect(stored).toBe(true);
    const insert = calls.find((call) => /INSERT INTO course_registrations/.test(call.sql))!;
    expect(insert.sql).toMatch(/\(SELECT id FROM course_types WHERE id = \$2::uuid\)/);
    expect(insert.sql).toMatch(/\(SELECT id FROM course_instances WHERE id = \$3::uuid\)/);
    expect(insert.params.slice(1, 5)).toEqual([
      null,
      FIXTURE_SESSION_ID,
      'Intensiv Deutsch',
      '26.10.2026 - 18.12.2026',
    ]);
  });
});
