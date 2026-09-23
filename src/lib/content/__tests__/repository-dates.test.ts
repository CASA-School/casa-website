import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The public data layer against a fixed clock.
 *
 * The fixtures are CASA's real published dates, so the defects these guard
 * against appeared only as the calendar moved: past terms as "Nächster Start",
 * "Anmeldung geschlossen" on every course page, and a registration form that
 * pre-selected a term that had begun. The clock is pinned to Wednesday
 * 23 September 2026, when all three were live.
 */
const db = vi.hoisted(() => ({
  current: null as null | { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
}));

vi.mock('@/lib/db/server', () => ({
  getDb: () => db.current,
  logDatabaseFallback: vi.fn(),
}));

import {
  getCourseDetail,
  getCourseFinderData,
  getCourseRegistrationCatalog,
  getExamCatalog,
  getExamRegistrationCatalog,
} from '../repository';

const INTENSIVE = '10000000-0000-4000-8000-000000000001';
const EVENING = '10000000-0000-4000-8000-000000000002';
const BILDUNGSZEIT = '10000000-0000-4000-8000-000000000005';
const TELC_B2 = '20000000-0000-4000-8000-000000000001';
const TELC_C1 = '20000000-0000-4000-8000-000000000002';

function setClock(iso: string) {
  vi.setSystemTime(new Date(iso));
}

/*
 * The zones a date check runs in, whatever zone the machine has: Node applies a
 * TZ change at once. pg hands a `date` over at LOCAL midnight, so a
 * toISOString() day shift shows only at a positive offset like Berlin's; a
 * missing `timeZone: 'Europe/Berlin'` shows only away from Berlin, as in CI.
 */
const ZONES = ['UTC', 'Europe/Berlin'] as const;

function useZone(zone: string) {
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env.TZ;
    process.env.TZ = zone;
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previous;
    }
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  setClock('2026-09-23T10:00:00+02:00');
});

afterEach(() => {
  vi.useRealTimers();
  db.current = null;
});

describe('course registration catalog (fallback mode)', () => {
  it('offers intensive terms from their first day only, soonest first, and defaults to the next one', async () => {
    const catalog = await getCourseRegistrationCatalog('de');

    // 3 Aug (afternoon) and 31 Aug (morning) have begun and cannot be joined.
    expect(catalog.optionsByCourseTypeId[INTENSIVE].map((option) => option.startDate)).toEqual([
      '2026-09-28',
      '2026-10-26',
      '2026-11-23',
      '2027-01-04',
      '2027-02-01',
      '2027-03-01',
    ]);
    expect(catalog.defaultCourseTypeId).toBe(INTENSIVE);
    expect(catalog.defaultOptionId).toBe('30000000-0000-4000-8000-000000010006');
  });

  it('keeps an evening term under way, because CASA publishes joining one', async () => {
    const catalog = await getCourseRegistrationCatalog('de');

    expect(catalog.optionsByCourseTypeId[EVENING].map((option) => option.startDate)).toEqual([
      '2026-08-24',
      '2026-08-25',
    ]);
    expect(catalog.optionsByCourseTypeId[BILDUNGSZEIT][0].startDate).toBe('2026-08-31');
  });

  it('does not honour a requested term that has begun', async () => {
    const catalog = await getCourseRegistrationCatalog('de', '30000000-0000-4000-8000-000000010005');

    expect(catalog.defaultOptionId).toBe('30000000-0000-4000-8000-000000010006');
  });

  it('carries no seat count or scarcity label', async () => {
    const catalog = await getCourseRegistrationCatalog('de');
    const options = Object.values(catalog.optionsByCourseTypeId).flat();

    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option).not.toHaveProperty('seatsLeft');
      expect(option).not.toHaveProperty('availabilityState');
      expect(option).not.toHaveProperty('availabilityLabel');
      expect(option.deadlineStatus).not.toBe('closed');
    }
    expect(JSON.stringify(catalog)).not.toMatch(/Plätze|Warteliste|seats|Waitlist/);
  });

  it('writes weekdays in the page language', async () => {
    const [de, en] = await Promise.all([getCourseRegistrationCatalog('de'), getCourseRegistrationCatalog('en')]);
    const afternoon = (catalog: typeof de) =>
      catalog.optionsByCourseTypeId[INTENSIVE].find((option) => option.id.endsWith('010006'))?.scheduleLabel;

    expect(afternoon(de)).toBe('Mo, Di, Mi, Do • 13:00-17:30');
    expect(afternoon(en)).toBe('Mon, Tue, Wed, Thu • 13:00-17:30');
  });
});

describe('course finder next start', () => {
  it('is a start date still ahead, never a term that has begun', async () => {
    const finder = await getCourseFinderData('de');

    expect(finder.nextStartByCourseId[INTENSIVE]).toBe('2026-09-28');
    // The evening terms are joined, not started: no "Nächster Start: 24. Aug."
    expect(finder.nextStartByCourseId[EVENING]).toBeNull();
    // ...and that null is not "to be announced": they can be joined today.
    expect(finder.joinableNowByCourseId[EVENING]).toBe(true);
    expect(finder.joinableNowByCourseId[INTENSIVE]).toBe(false);
    // Bildungszeit starts on any Monday.
    expect(finder.nextStartByCourseId[BILDUNGSZEIT]).toBe('2026-09-28');
    // Still recognised as weekday courses with German labels.
    expect(finder.scheduleTagsByCourseId[INTENSIVE]).toContain('weekdays');
  });
});

describe('course detail', () => {
  it('keeps the whole published term table for the page to dim', async () => {
    const detail = await getCourseDetail('intensive-german', 'de');

    expect(detail?.instances.map((instance) => instance.start_date)).toContain('2026-08-03');
  });

  it('uses the German course names CASA publishes', async () => {
    expect((await getCourseDetail('special-courses', 'de'))?.course.name).toBe('Deutsch Spezialkurse');
    expect((await getCourseDetail('bildungszeit', 'de'))?.course.name).toBe('Bildungszeit Deutsch');
    expect((await getCourseDetail('bildungszeit', 'en'))?.course.name).toBe('Bildungszeit German');
  });
});

describe('exam sittings (fallback mode)', () => {
  it('drops sittings that have happened or whose deadline has passed', async () => {
    const catalog = await getExamRegistrationCatalog('de');

    expect(catalog.optionsByExamTypeId[TELC_B2].map((option) => option.startsAt)).toEqual([
      '2026-11-13T08:00:00.000Z',
    ]);
    expect(catalog.optionsByExamTypeId[TELC_C1].map((option) => option.startsAt)).toEqual([
      '2026-10-30T07:30:00.000Z',
      '2026-11-27T07:30:00.000Z',
    ]);
    expect(catalog.optionsByExamTypeId[TELC_C1][0].deadlineStatus).toBe('closing-soon');
  });

  it('gives exam pages the sittings the registration form offers, so "Nächste Prüfung" can be booked', async () => {
    const [{ items }, registration] = await Promise.all([getExamCatalog('de'), getExamRegistrationCatalog('de')]);
    const sittings = (id: string) => items.find((item) => item.examType.id === id)?.sessions.map((session) => session.id);
    const offered = (id: string) => registration.optionsByExamTypeId[id].map((option) => option.id);

    expect(sittings(TELC_B2)).toEqual(offered(TELC_B2));
    expect(sittings(TELC_C1)).toEqual(offered(TELC_C1));
    expect(items.find((item) => item.examType.id === TELC_B2)?.sessions[0]?.starts_at).toBe('2026-11-13T08:00:00.000Z');
    expect(items.find((item) => item.examType.id === TELC_C1)?.sessions[0]?.starts_at).toBe('2026-10-30T07:30:00.000Z');
  });

  it('keeps a sitting open through its deadline day in Bremen', async () => {
    setClock('2026-10-12T23:30:00+02:00');
    const onTheDay = await getExamRegistrationCatalog('de');
    expect(onTheDay.optionsByExamTypeId[TELC_B2].map((option) => option.registrationDeadline)).toEqual(['2026-10-12']);
    expect(onTheDay.optionsByExamTypeId[TELC_B2][0].deadlineStatus).toBe('closing-soon');

    setClock('2026-10-13T00:30:00+02:00');
    const dayAfter = await getExamRegistrationCatalog('de');
    expect(dayAfter.optionsByExamTypeId[TELC_B2]).toEqual([]);
  });
});

describe.each(ZONES)('exam times with the server in %s', (zone) => {
  useZone(zone);

  it('are shown in Bremen time', async () => {
    const catalog = await getExamRegistrationCatalog('de');

    expect(catalog.optionsByExamTypeId[TELC_B2][0].startsAtLabel).toMatch(/09:00 - 17:00$/);
  });
});

describe.each(ZONES)('database mode, server in %s: pg returns date columns as Date objects', (zone) => {
  useZone(zone);

  // Date columns are built inside each query, so at local midnight in the zone
  // under test, as pg builds them.
  const row = { capacity: 20, fee_override: null, status: 'scheduled', created_at: new Date(), updated_at: new Date() };

  it('enforces an exam deadline that arrives as a Date', async () => {
    db.current = {
      query: async (sql: string) => {
        if (sql.includes('FROM exam_types')) {
          return [{ id: 'exam-b2', code: 'telc_b2', name: 'telc Deutsch B2', level: 'B2', default_fee: 190, currency: 'EUR', is_active: true }];
        }
        if (sql.includes('FROM exam_sessions')) {
          return [
            // Deadline 15 September: passed on the 23rd. It used to read 'open'.
            {
              ...row,
              id: 'session-closed',
              exam_type_id: 'exam-b2',
              starts_at: new Date('2026-10-16T07:00:00Z'),
              ends_at: new Date('2026-10-16T15:00:00Z'),
              registration_deadline: new Date(2026, 8, 15),
            },
            {
              ...row,
              id: 'session-open',
              exam_type_id: 'exam-b2',
              starts_at: new Date('2026-11-13T08:00:00Z'),
              ends_at: new Date('2026-11-13T16:00:00Z'),
              registration_deadline: new Date(2026, 9, 12),
            },
          ];
        }
        return [];
      },
    };

    const catalog = await getExamRegistrationCatalog('de');
    const [option, ...rest] = catalog.optionsByExamTypeId['exam-b2'];

    expect(rest).toEqual([]);
    expect(option.id).toBe('session-open');
    expect(option.registrationDeadline).toBe('2026-10-12');
    expect(option.startsAt).toBe('2026-11-13T08:00:00.000Z');
    expect(option.deadlineStatus).toBe('open');

    // With sittings in the database, the exam pages show the ones the form offers.
    const { items } = await getExamCatalog('de');
    expect(items.find((item) => item.examType.id === 'exam-b2')?.sessions.map((session) => session.id)).toEqual([
      'session-open',
    ]);
  });

  it('keeps the calendar day of a course date that arrives as a Date', async () => {
    db.current = {
      query: async (sql: string) => {
        if (sql.includes('FROM course_types')) {
          return [
            {
              id: 'course-intensive',
              slug: 'intensive-german',
              name: 'Intensive German',
              format: 'Intensive',
              level_min: 'A1',
              level_max: 'C1',
              lessons_per_week: 20,
              default_price: 520,
              pricing_mode: 'from',
              visa_eligible: true,
              currency: 'EUR',
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ];
        }
        if (sql.includes('FROM course_instances')) {
          const schedule = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '09:00-12:30' };
          return [
            // Begun on 31 August, so not offered.
            { ...row, id: 'term-begun', course_type_id: 'course-intensive', start_date: new Date(2026, 7, 31), end_date: new Date(2026, 9, 23), schedule, location: null },
            { ...row, id: 'term-next', course_type_id: 'course-intensive', start_date: new Date(2026, 9, 26), end_date: new Date(2026, 11, 18), schedule, location: null },
          ];
        }
        return [];
      },
    };

    const catalog = await getCourseRegistrationCatalog('de');

    expect(catalog.optionsByCourseTypeId['course-intensive'].map((option) => [option.id, option.startDate, option.endDate])).toEqual([
      ['term-next', '2026-10-26', '2026-12-18'],
    ]);
    expect(catalog.defaultOptionId).toBe('term-next');
  });
});
