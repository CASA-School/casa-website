import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  bremenToday,
  isCourseTermBookable,
  isExamSittingBookable,
  lastCourseEntryDate,
  nextCourseStartDate,
} from '../bookability';

/**
 * The published term table is real dates, so it ages. These pin the rule for
 * which terms and sittings the site may still offer, per format, against fixed
 * days rather than the clock.
 */
const term = (start_date: string, end_date: string, status = 'scheduled') => ({ start_date, end_date, status });

describe('bremenToday', () => {
  it("is Bremen's calendar day, not UTC's", () => {
    // 00:30 in Bremen on 13 October is still 12 October in UTC.
    expect(bremenToday(new Date('2026-10-12T22:30:00Z'))).toBe('2026-10-13');
    expect(bremenToday(new Date('2026-10-12T21:30:00Z'))).toBe('2026-10-12');
  });
});

describe('course terms', () => {
  const intensive = term('2026-08-31', '2026-10-23');

  it('offers an intensive term up to and including its first day, never after', () => {
    expect(isCourseTermBookable(intensive, 'intensive-german', '2026-08-31')).toBe(true);
    expect(isCourseTermBookable(intensive, 'intensive-german', '2026-09-01')).toBe(false);
    expect(nextCourseStartDate(intensive, 'intensive-german', '2026-08-20')).toBe('2026-08-31');
    expect(nextCourseStartDate(intensive, 'intensive-german', '2026-09-23')).toBeNull();
  });

  it('keeps an evening term on offer while it runs, with no start date ahead of it', () => {
    const evening = term('2026-08-24', '2026-12-16');

    expect(lastCourseEntryDate(evening, 'evening-german')).toBe('2026-12-16');
    expect(isCourseTermBookable(evening, 'evening-german', '2026-09-23')).toBe(true);
    expect(nextCourseStartDate(evening, 'evening-german', '2026-09-23')).toBeNull();
    expect(isCourseTermBookable(evening, 'evening-german', '2026-12-17')).toBe(false);
  });

  it('lets Bildungszeit start on any Monday up to the last one of the term', () => {
    const bildungszeit = term('2026-08-31', '2026-10-23');

    expect(lastCourseEntryDate(bildungszeit, 'bildungszeit')).toBe('2026-10-19');
    // A Wednesday: the next start is the coming Monday.
    expect(nextCourseStartDate(bildungszeit, 'bildungszeit', '2026-09-23')).toBe('2026-09-28');
    // A Monday is its own next start.
    expect(nextCourseStartDate(bildungszeit, 'bildungszeit', '2026-10-19')).toBe('2026-10-19');
    expect(isCourseTermBookable(bildungszeit, 'bildungszeit', '2026-10-20')).toBe(false);
  });

  it('never offers a term that is not scheduled', () => {
    expect(isCourseTermBookable(term('2026-10-26', '2026-12-18', 'cancelled'), 'intensive-german', '2026-09-23')).toBe(
      false
    );
  });
});

describe('exam sittings', () => {
  const sitting = { starts_at: '2026-11-13T08:00:00.000Z', registration_deadline: '2026-10-12', status: 'scheduled' };

  it('stays open through the deadline day in Bremen', () => {
    expect(isExamSittingBookable(sitting, new Date('2026-10-12T21:59:00Z'))).toBe(true);
    // 00:30 on 13 October in Bremen, still the 12th in UTC.
    expect(isExamSittingBookable(sitting, new Date('2026-10-12T22:30:00Z'))).toBe(false);
  });

  /*
   * A Postgres `date` arrives as a JS Date at LOCAL midnight. Run at Berlin's
   * positive offset as well as in UTC (CI's zone), whatever zone the machine
   * has: only there does a toISOString() conversion land on the day before,
   * and close the sitting on its own deadline day.
   */
  describe.each(['UTC', 'Europe/Berlin'])('with the server in %s', (zone) => {
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

    it('reads a deadline that pg handed over as a Date', () => {
      const fromPg = { ...sitting, registration_deadline: new Date(2026, 8, 15) as unknown as string };

      expect(isExamSittingBookable(fromPg, new Date('2026-09-23T08:00:00Z'))).toBe(false);
      expect(isExamSittingBookable(fromPg, new Date('2026-09-10T08:00:00Z'))).toBe(true);
      // 20:00 on the deadline day in Bremen, and 00:30 the day after.
      expect(isExamSittingBookable(fromPg, new Date('2026-09-15T18:00:00Z'))).toBe(true);
      expect(isExamSittingBookable(fromPg, new Date('2026-09-15T22:30:00Z'))).toBe(false);
    });
  });

  it('is never bookable once it has started, deadline or not', () => {
    const noDeadline = { ...sitting, registration_deadline: null };

    expect(isExamSittingBookable(noDeadline, new Date('2026-11-12T08:00:00Z'))).toBe(true);
    expect(isExamSittingBookable(noDeadline, new Date('2026-11-13T08:00:00Z'))).toBe(false);
  });
});
