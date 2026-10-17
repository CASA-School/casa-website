import { describe, expect, it } from 'vitest';

import type { BookingLetterContext } from '../letters/booking-letters';
import { bookingKindStates, suggestBookingLetters } from '../letters/suggest';

/** The letter due next (2026-10-17): from what the booking is and what was sent, most urgent first. */

const today = '2026-10-17';
const person = {
  id: 'p',
  firstName: 'Mariana',
  lastName: 'Silva',
  salutation: 'ms' as const,
  email: 'mariana@example.com',
  phone: null,
  motherTongue: null,
  birthPlace: null,
  birthDate: '1997-03-14',
  nationality: { de: 'Brasilien', en: 'Brazil' },
  passportNumber: null,
  home: { lines: ['Rua das Flores 12'], countryCode: 'BR', country: { de: 'Brasilien', en: 'Brazil' } },
  local: null,
};
const course = {
  name: { de: 'Intensivkurs', en: 'Intensive German' },
  level: 'B1.1',
  startDate: '2026-11-23',
  endDate: '2027-01-28',
  session: 'morning' as const,
  time: '09:00-12:30',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  lessonsPerWeek: 20,
  room: null,
};
const base: BookingLetterContext = {
  bookingId: 'b',
  number: 'B-2026-0002',
  language: 'de',
  person,
  course,
  exam: null,
  accommodation: null,
  charges: [{ kind: 'tuition', description: 'Kurspreis 8 Wochen', amount: 940 }],
  payments: [],
  charged: 940,
  paid: 0,
  visaRequired: false,
  followUp: false,
  downPayment: 200,
  status: 'confirmed',
  cancelledAt: null,
  staff: [],
};

describe('suggestBookingLetters', () => {
  it('starts with the confirmation', () => {
    expect(suggestBookingLetters(base, today, [])).toEqual(['booking_confirmation']);
  });

  it('a payment without its receipt comes first; the reminder a week after the confirmation', () => {
    const paid = { ...base, payments: [{ id: 'x', date: '2026-10-12', method: 'transfer', amount: 200, subject: 'Anzahlung' }], paid: 200 };
    const sent = [{ kind: 'booking_confirmation', date: '2026-10-07' }];
    expect(suggestBookingLetters(paid, today, sent)).toEqual(['payment_receipt', 'payment_reminder']);
    // The receipt went after the payment, and a reminder this week: nothing due.
    expect(
      suggestBookingLetters(paid, today, [...sent, { kind: 'payment_receipt', date: '2026-10-13' }, { kind: 'payment_reminder', date: '2026-10-15' }])
    ).toEqual([]);
  });

  it('a visa: the show-up letter in its window, the letter for the embassy once paid, the passport asked for', () => {
    const visa = { ...base, visaRequired: true };
    const sent = [{ kind: 'booking_confirmation', date: '2026-10-16' }];
    expect(suggestBookingLetters(visa, today, sent)).toEqual(['showup_first_call', 'missing_items']);
    const paidUp = { ...visa, paid: 940, payments: [{ id: 'x', date: '2026-10-16', method: 'transfer', amount: 940, subject: 'Kurs' }], person: { ...person, passportNumber: 'BR123' } };
    expect(suggestBookingLetters(paidUp, today, [...sent, { kind: 'payment_receipt', date: '2026-10-16' }])).toEqual(['visa_letter', 'showup_first_call']);
  });

  it('the course start in its last week; a cancelled booking only its cancellation, once', () => {
    const soon = { ...base, course: { ...course, startDate: '2026-10-20' } };
    expect(suggestBookingLetters(soon, today, [{ kind: 'booking_confirmation', date: '2026-10-16' }])).toEqual(['course_start']);
    const cancelled = { ...base, status: 'cancelled' as const };
    expect(suggestBookingLetters(cancelled, today, [])).toEqual(['cancellation_confirmation']);
    expect(suggestBookingLetters(cancelled, today, [{ kind: 'cancellation_confirmation', date: '2026-10-17' }])).toEqual([]);
  });

  it('an exam: its confirmation, the invitation in the last fortnight, the result once entered', () => {
    const exam = { ...base, course: null, exam: { name: 'telc Deutsch B2', day: '2026-10-30', startTime: '09:00', endTime: '17:00', deadline: null, parts: 'full' as const, result: null } };
    expect(suggestBookingLetters(exam, today, [])).toEqual(['exam_confirmation', 'exam_invitation']);
    const after = { ...exam, exam: { ...exam.exam, day: '2026-10-01', result: { written: 'passed' as const, oral: 'passed' as const } } };
    expect(suggestBookingLetters(after, today, [{ kind: 'exam_confirmation', date: '2026-09-01' }])).toEqual(['exam_results', 'payment_reminder']);
  });
});

describe('bookingKindStates', () => {
  it('says per kind why not yet, when sent and how often, and whether due', () => {
    const states = bookingKindStates(['booking_confirmation', 'visa_letter'], base, today, [
      { kind: 'booking_confirmation', date: '2026-10-01' },
      { kind: 'booking_confirmation', date: '2026-10-09' },
    ]);
    expect(states.get('booking_confirmation')).toEqual({ blocked: null, lastSent: '2026-10-09', count: 2, suggested: false });
    expect(states.get('visa_letter')?.blocked?.de).toContain('vollständiger Zahlung');
  });
});
