import { describe, expect, it } from 'vitest';

import {
  bookedLevelLabel,
  bookedSpan,
  chargeLineNames,
  coversWholeLevel,
  defaultJoin,
  halfLevelEnd,
  inSecondHalf,
  isJoinMonday,
  joinWeeks,
  offersWholeLevel,
  paymentSubject,
  stayFor,
  wishesWholeLevel,
} from '../booking-levels';
import { accommodationWeeks } from '../offers/course';

/**
 * How much of a level a booking teaches, and the stay around it (2026-10-17 audit): a whole A2 is
 * confirmed as „A2.1–A2.2" (it matters for a visa), a half ends after four teaching weeks, an evening
 * term is one half, and an eight-week course pays eight weeks of rent, not seven.
 */
const MON_FRI = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const intensive = (levelCode: string, startDate: string, endDate: string) => ({ format: 'intensive', levelCode, startDate, endDate });

describe('the level a booking teaches', () => {
  it('reads an intensive period past four teaching weeks at a first half as the whole level', () => {
    expect(coversWholeLevel(intensive('A2.1', '2026-10-26', '2026-12-18'))).toBe(true);
    expect(coversWholeLevel(intensive('A2.1', '2026-10-26', '2026-11-20'))).toBe(false);
    expect(coversWholeLevel(intensive('A2.2', '2026-10-26', '2026-11-20'))).toBe(false);
    expect(coversWholeLevel({ format: 'evening', levelCode: 'B2.1', startDate: '2026-08-24', endDate: '2026-12-16' })).toBe(false);
  });

  it('says the range for a whole level and across periods', () => {
    expect(bookedLevelLabel([intensive('A2.1', '2026-10-26', '2026-12-18')])).toBe('A2.1–A2.2');
    expect(bookedLevelLabel([intensive('A2.1', '2026-10-26', '2026-11-20')])).toBe('A2.1');
    expect(bookedLevelLabel([intensive('B1+.1', '2026-10-26', '2026-12-18')])).toBe('B1+.1–B1+.2');
    expect(bookedLevelLabel([intensive('A2.1', '2026-10-26', '2026-12-18'), intensive('B1.1', '2027-01-04', '2027-02-26')])).toBe('A2.1–B1.2');
    expect(bookedLevelLabel([{ format: null, levelCode: null, startDate: '2026-10-26', endDate: '2026-12-18' }])).toBeNull();
  });

  it('offers the whole level only on an intensive start, from its first half', () => {
    const codes = ['A2.1', 'A2.2', 'B2.1', 'B2.2'];
    expect(offersWholeLevel('intensive', 'A2.1', codes)).toBe(true);
    expect(offersWholeLevel('intensive', 'A2.2', codes)).toBe(false);
    expect(offersWholeLevel('evening', 'B2.1', codes)).toBe(false);
    expect(offersWholeLevel('intensive', 'C1.1', codes)).toBe(false);
  });

  it('ends a first half after its fourth teaching week, on the course days, closures left out', () => {
    expect(halfLevelEnd('2026-10-26', '2026-12-18', MON_FRI)).toBe('2026-11-20');
    // The afternoon course meets Monday to Thursday.
    expect(halfLevelEnd('2026-11-23', '2027-01-28', ['Mon', 'Tue', 'Wed', 'Thu'])).toBe('2026-12-17');
    // Christmas (21.12.–01.01.) is no teaching week.
    expect(halfLevelEnd('2026-12-07', '2027-02-05', MON_FRI)).toBe('2027-01-15');
  });

  it('reads the registration wish „A2 komplett" as the whole level', () => {
    expect(wishesWholeLevel('A1 komplett (A1.1 + A1.2) · 8 Wochen')).toBe(true);
    expect(wishesWholeLevel('B2 complete · 8 weeks')).toBe(true);
    expect(wishesWholeLevel('A2.1')).toBe(false);
    expect(wishesWholeLevel(null)).toBe(false);
  });
});

describe('joining a course under way (2026-10-17)', () => {
  // The afternoon intensive course from 28 Sep 2026, Monday to Thursday; the morning one before it ends 23 Oct.
  const MON_THU = ['Mon', 'Tue', 'Wed', 'Thu'];
  const running = { format: 'intensive', startDate: '2026-09-28', endDate: '2026-11-19', days: MON_THU, runningEnd: '2026-10-23' };

  it('offers the Mondays left, from next week on a weekend, from this week on a weekday', () => {
    expect(joinWeeks('2026-09-28', '2026-11-19', '2026-10-17')).toEqual([
      { monday: '2026-10-19', week: 4, left: 5 },
      { monday: '2026-10-26', week: 5, left: 4 },
      { monday: '2026-11-02', week: 6, left: 3 },
      { monday: '2026-11-09', week: 7, left: 2 },
      { monday: '2026-11-16', week: 8, left: 1 },
    ]);
    expect(joinWeeks('2026-09-28', '2026-11-19', '2026-10-14')[0]).toEqual({ monday: '2026-10-12', week: 3, left: 6 });
  });

  it('leaves the Christmas closure out and counts teaching weeks across it', () => {
    expect(joinWeeks('2026-11-23', '2027-01-28', '2026-12-16').map((w) => [w.monday, w.week, w.left])).toEqual([
      ['2026-12-14', 4, 5],
      ['2027-01-04', 5, 4],
      ['2027-01-11', 6, 3],
      ['2027-01-18', 7, 2],
      ['2027-01-25', 8, 1],
    ]);
  });

  it('preselects the next Monday, or today when it is a Monday', () => {
    expect(defaultJoin(joinWeeks('2026-09-28', '2026-11-19', '2026-10-14'), '2026-10-14')).toBe('2026-10-19');
    expect(defaultJoin(joinWeeks('2026-09-28', '2026-11-19', '2026-10-19'), '2026-10-19')).toBe('2026-10-19');
    expect(defaultJoin(joinWeeks('2026-09-28', '2026-11-19', '2026-11-18'), '2026-11-18')).toBe('2026-11-16');
    expect(defaultJoin([], '2026-10-17')).toBeNull();
  });

  it('accepts on the server only a Monday of a teaching week, within the course, from this week on', () => {
    const ok = (join: string, today = '2026-10-17') => isJoinMonday(join, '2026-09-28', '2026-11-19', today);
    expect(ok('2026-10-26')).toBe(true);
    expect(ok('2026-10-12')).toBe(true);
    expect(ok('2026-10-05')).toBe(false);
    expect(ok('2026-10-27')).toBe(false);
    expect(ok('2026-11-23')).toBe(false);
    expect(ok('2026-02-30')).toBe(false);
    expect(ok('26.10.2026')).toBe(false);
    expect(isJoinMonday('2026-12-28', '2026-11-23', '2027-01-28', '2026-12-16')).toBe(false);
  });

  it('reads the course as in its second half from the fifth teaching week', () => {
    expect(inSecondHalf(running, '2026-10-19')).toBe(false);
    expect(inSecondHalf(running, '2026-10-26')).toBe(true);
  });

  it('books from the join Monday, to the end, to the half or to the running course before', () => {
    expect(bookedSpan(running, 'B1.1', 'whole', '2026-10-19')).toEqual({ startDate: '2026-10-19', endDate: '2026-11-19' });
    expect(bookedSpan(running, 'B1.1', 'half', '2026-10-19')).toEqual({ startDate: '2026-10-19', endDate: '2026-10-22' });
    // Past the half there is no first half alone.
    expect(bookedSpan(running, 'B1.1', 'half', '2026-10-26')).toEqual({ startDate: '2026-10-26', endDate: '2026-11-19' });
    // A `.2` joiner from the fifth week sits in this course to its end; before, in the running course before it.
    expect(bookedSpan(running, 'B1.2', 'half', '2026-10-26')).toEqual({ startDate: '2026-10-26', endDate: '2026-11-19' });
    expect(bookedSpan(running, 'B1.2', 'half', '2026-10-19')).toEqual({ startDate: '2026-10-19', endDate: '2026-10-23' });
    expect(bookedSpan({ ...running, format: 'evening' }, 'B2.1', 'half', '2026-11-02')).toEqual({ startDate: '2026-11-02', endDate: '2026-11-19' });
  });

  it('keeps today’s rule without a join', () => {
    expect(bookedSpan(running, 'B1.1', 'whole')).toEqual({ startDate: '2026-09-28', endDate: '2026-11-19' });
    expect(bookedSpan(running, 'B1.1', 'half')).toEqual({ startDate: '2026-09-28', endDate: '2026-10-22' });
    expect(bookedSpan(running, 'B1.2', 'half')).toEqual({ startDate: '2026-09-28', endDate: '2026-10-23' });
    expect(bookedSpan({ ...running, runningEnd: null }, 'B1.2', 'half')).toEqual({ startDate: '2026-09-28', endDate: '2026-11-19' });
    // A join on or before the start is none.
    expect(bookedSpan(running, 'B1.1', 'whole', '2026-09-28')).toEqual({ startDate: '2026-09-28', endDate: '2026-11-19' });
  });

  it('names what a joiner is taught', () => {
    expect(bookedLevelLabel([intensive('B1.1', '2026-10-19', '2026-11-19')])).toBe('B1.1–B1.2');
    expect(bookedLevelLabel([intensive('B1.1', '2026-10-19', '2026-10-22')])).toBe('B1.1');
    expect(bookedLevelLabel([intensive('B1.2', '2026-10-26', '2026-11-19')])).toBe('B1.2');
  });
});

describe('the stay around a course', () => {
  it('arrives the day before and leaves the Saturday after: eight weeks of rent for eight weeks', () => {
    const stay = stayFor('2026-10-26', '2026-12-18');
    expect(stay).toEqual({ from: '2026-10-25', to: '2026-12-19' });
    expect(accommodationWeeks({ kind: 'host_family', ...stay! })).toBe(8);
    // Monday to Friday, the old default, paid seven.
    expect(accommodationWeeks({ kind: 'host_family', from: '2026-10-26', to: '2026-12-18' })).toBe(7);
  });
});

describe('a cost line in the letter’s language', () => {
  const facts = {
    course: { de: 'Intensivkurs', en: 'Intensive German' },
    accommodation: {
      type: { de: 'Wohngemeinschaft', en: 'Shared apartment' },
      room: { de: 'Einzelzimmer', en: 'Single room' },
      catering: { de: 'mit Küchenbenutzung', en: 'with cooking facilities' },
      from: '2026-10-25',
      to: '2026-12-19',
    },
  };

  it('names the enrolment fee, the course and the rent in both languages', () => {
    expect(chargeLineNames({ kind: 'enrolment_fee', chargeTypeCode: 'enrolment_fee', description: 'Enrolment fee' }, facts, 8)).toEqual({
      de: 'Einschreibegebühr',
      en: 'Enrolment fee',
    });
    expect(chargeLineNames({ kind: 'tuition', chargeTypeCode: 'tuition', description: 'Intensivkurs A2.1–A2.2 · 26.10.26 – 18.12.26' }, facts, 8)).toEqual({
      de: 'Intensivkurs A2.1–A2.2 · 26.10.26 – 18.12.26',
      en: 'Intensive German A2.1–A2.2 · 26.10.26 – 18.12.26',
    });
    // A line written in English before (2026-10-17) reads in German too.
    expect(chargeLineNames({ kind: 'tuition', chargeTypeCode: 'tuition', description: 'Intensive German · 26.10.26 – 18.12.26' }, facts, 8)?.de).toBe(
      'Intensivkurs · 26.10.26 – 18.12.26'
    );
    expect(chargeLineNames({ kind: 'accommodation', chargeTypeCode: 'accommodation_rent', description: 'CASA Shared flat' }, facts, 8)).toEqual({
      de: 'Wohngemeinschaft (Einzelzimmer, mit Küchenbenutzung) · 25.10.26 – 19.12.26 · 8 Wochen',
      en: 'Shared apartment (Single room, with cooking facilities) · 25.10.26 – 19.12.26 · 8 weeks',
    });
  });

  it('leaves a line a colleague typed in their own words', () => {
    expect(chargeLineNames({ kind: 'other', chargeTypeCode: null, description: 'Abholung vom Flughafen' }, facts, 8)).toBeNull();
    expect(chargeLineNames({ kind: 'tuition', chargeTypeCode: null, description: 'Verlängerung' }, facts, 8)).toBeNull();
  });

  it('says what a payment was for in the letter’s language', () => {
    expect(paymentSubject('Anzahlung', 'en')).toBe('Down payment');
    expect(paymentSubject('Restzahlung', 'de')).toBe('Restzahlung');
    expect(paymentSubject('Kaution zurück', 'en')).toBe('Kaution zurück');
  });
});
