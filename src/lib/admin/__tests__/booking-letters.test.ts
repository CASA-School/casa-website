import { describe, expect, it } from 'vitest';

import {
  amountInWords,
  bookingConfirmationLetter,
  LETTER_STANDARD_DEFAULTS,
  paymentReceiptLetter,
  paymentSentence,
  waitlistLetter,
  type BookingLetterContext,
  type LetterChoices,
  type WaitlistLetterContext,
} from '../letters/booking-letters';

/**
 * The booking's and the waiting list's letters (docs/LETTERS.md, 0032): every figure is the
 * booking's, the deadline follows the terms (AGB §5.2–5.3), and a receipt's sum is spelled in the
 * letter's own language — where SchoolMan wrote German words on English receipts.
 */

const person = {
  id: 'p',
  firstName: 'Lucía',
  lastName: 'Fernández',
  salutation: 'ms' as const,
  email: 'lucia@example.com',
  home: { lines: ['Calle Mayor 3', '46001 Valencia'], countryCode: 'ES', country: { de: 'Spanien', en: 'Spain' } },
  local: null,
};
const course = {
  name: { de: 'Intensivkurs', en: 'Intensive German' },
  level: 'B1.1',
  startDate: '2026-12-07',
  endDate: '2027-01-29',
  session: 'morning' as const,
  time: '09:00-12:30',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  lessonsPerWeek: 20,
};
const base: BookingLetterContext = {
  bookingId: 'b',
  language: 'de',
  person,
  course,
  accommodation: null,
  charges: [{ description: 'Kurspreis 8 Wochen', amount: 940 }],
  payments: [],
  charged: 940,
  paid: 0,
  visaRequired: false,
  followUp: false,
  downPayment: 200,
  staff: [{ id: 's', name: 'Rahman Shafiee' }],
};
const de: LetterChoices = { language: 'de', address: 'home', signatureId: 's', texts: {} };
const today = '2026-10-16';

describe('paymentSentence', () => {
  it('asks a learner abroad for the whole first course within a week', () => {
    expect(paymentSentence({ ...base, visaRequired: true }, 'de', today)).toContain('Gesamtbetrag von 940,00\u00a0€ bis zum 23.10.2026');
  });

  it('asks anyone else for the down payment within a week and the rest four weeks before the start', () => {
    const sentence = paymentSentence(base, 'de', today);
    expect(sentence).toContain('Anzahlung von 200,00\u00a0€');
    expect(sentence).toContain('23.10.2026');
    expect(sentence).toContain('Restbetrag von 740,00\u00a0€ überweise bitte bis zum 09.11.2026');
  });

  it('asks for the rest by the first day of a follow-up booking, once something is paid', () => {
    expect(paymentSentence({ ...base, paid: 200, followUp: true }, 'en', today)).toBe('Please transfer the outstanding €740.00 by 7 December 2026.');
  });

  it('says so when everything is paid', () => {
    expect(paymentSentence({ ...base, paid: 940 }, 'de', today)).toBe('Es ist alles bezahlt. Vielen Dank!');
  });
});

describe('bookingConfirmationLetter', () => {
  it('names the course with its days and times, the costs, what came in and what is open', () => {
    const letter = bookingConfirmationLetter({ ...base, paid: 200, payments: [{ id: 'x', date: '2026-10-10', method: 'card', amount: 200, subject: 'Anzahlung' }] }, de, LETTER_STANDARD_DEFAULTS.booking_confirmation.de, { today, version: 1 });
    expect(letter.subject).toEqual({ lead: 'Bestätigung der Buchung', title: 'Intensivkurs B1.1', tail: null });
    expect(letter.salutation).toBe('Liebe Lucía,');
    expect(letter.recipient).toEqual(['Lucía Fernández', 'Calle Mayor 3', '46001 Valencia', 'Spanien']);
    const heading = letter.body.find((p) => p.type === 'heading');
    expect(heading && heading.type === 'heading' ? heading.detail : '').toBe('07.12.2026–29.01.2027 · 8 Wochen · Mo–Fr · 09:00–12:30 · 20 Unterrichtseinheiten pro Woche');
    expect(letter.body).toContainEqual({ type: 'sum', label: 'Noch offen', amount: '740,00\u00a0€' });
  });
});

describe('paymentReceiptLetter', () => {
  it('lists the chosen payments, their sum in words, and what is still open', () => {
    const ctx = { ...base, paid: 1200, charged: 1200, payments: [
      { id: 'a', date: '2026-10-01', method: 'transfer', amount: 1000, subject: 'Kurspreis' },
      { id: 'b', date: '2026-10-10', method: 'cash', amount: 200, subject: 'Unterkunft' },
    ] };
    const letter = paymentReceiptLetter(ctx, { ...de, paymentIds: ['a'] }, LETTER_STANDARD_DEFAULTS.payment_receipt.de, { today, version: 1 });
    const table = letter.body.find((p) => p.type === 'table');
    expect(table && table.type === 'table' ? table.rows.map((r) => r.amount) : []).toEqual(['1.000,00\u00a0€']);
    expect(letter.body).toContainEqual({ type: 'text', slot: null, text: 'In Worten: eintausend Euro', strong: false });
  });
});

describe('amountInWords', () => {
  it('spells German as a receipt does', () => {
    expect(amountInWords(940, 'de')).toBe('neunhundertvierzig Euro');
    expect(amountInWords(1200, 'de')).toBe('eintausendzweihundert Euro');
    expect(amountInWords(1, 'de')).toBe('ein Euro');
    expect(amountInWords(21, 'de')).toBe('einundzwanzig Euro');
    expect(amountInWords(12.5, 'de')).toBe('zwölf Euro und fünfzig Cent');
  });

  it('spells English in English', () => {
    expect(amountInWords(1250.5, 'en')).toBe('one thousand two hundred and fifty euros and fifty cents');
    expect(amountInWords(1005, 'en')).toBe('one thousand and five euros');
    expect(amountInWords(1, 'en')).toBe('one euro');
  });
});

describe('waitlistLetter', () => {
  const ctx: WaitlistLetterContext = { entryId: 'w', language: 'de', status: 'waiting', person, course, position: 3, nextStart: '2027-02-01', staff: base.staff };

  it('tells the learner their place in the queue', () => {
    const letter = waitlistLetter('waitlist_confirmation', ctx, de, LETTER_STANDARD_DEFAULTS.waitlist_confirmation.de, { today, version: 1 });
    expect(letter.subject.lead).toBe('Warteliste');
    expect(letter.body).toContainEqual({ type: 'text', slot: 'position', text: 'Du stehst auf Platz 3 der Warteliste.', strong: false });
  });

  it('points to the next start when there was no place', () => {
    const letter = waitlistLetter('waitlist_no_place', ctx, { ...de, language: 'en' }, LETTER_STANDARD_DEFAULTS.waitlist_no_place.en, { today, version: 1 });
    expect(letter.body).toContainEqual({
      type: 'text',
      slot: 'next',
      text: 'The next Intensive German starts on 1 February 2027. If you like, we will gladly register you for it.',
      strong: false,
    });
  });
});
