import { describe, expect, it } from 'vitest';

import {
  bookedLevelLabel,
  chargeLineNames,
  coversWholeLevel,
  halfLevelEnd,
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
