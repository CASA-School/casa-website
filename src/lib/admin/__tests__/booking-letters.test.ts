import { describe, expect, it } from 'vitest';

import {
  amountInWords,
  bookingConfirmationLetter,
  bookingLetterBlock,
  buildBookingLetter,
  missingFromRecord,
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
  phone: null,
  motherTongue: null,
  birthPlace: null,
  birthDate: '1998-03-14',
  nationality: { de: 'Spanien', en: 'Spain' },
  passportNumber: null,
  home: { lines: ['Calle Mayor 3', '46001 Valencia'], countryCode: 'ES', country: { de: 'Spanien', en: 'Spain' } },
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
  room: { name: 'Dresden', floor: 1 },
};
const base: BookingLetterContext = {
  bookingId: 'b',
  number: 'B-2026-0042',
  language: 'de',
  person,
  course,
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
    expect(sentence).toContain('Restbetrag von 740,00\u00a0€ überweise bitte bis zum 26.10.2026');
  });

  it('asks for the rest by the first day of a follow-up booking, once something is paid', () => {
    expect(paymentSentence({ ...base, paid: 200, followUp: true }, 'en', today)).toBe('Please transfer the outstanding €740.00 by 23 November 2026.');
  });

  it('says so when everything is paid', () => {
    expect(paymentSentence({ ...base, paid: 940 }, 'de', today)).toBe('Es ist alles bezahlt. Vielen Dank!');
  });
});

describe('bookingConfirmationLetter', () => {
  it('names the course with its days and times, the costs, what came in and what is open', () => {
    const letter = bookingConfirmationLetter({ ...base, paid: 200, payments: [{ id: 'x', date: '2026-10-10', method: 'card', amount: 200, subject: 'Anzahlung' }] }, de, LETTER_STANDARD_DEFAULTS.booking_confirmation.de, { today, version: 1 });
    expect(letter.subject).toEqual({ lead: 'Bestätigung der Buchung Nr. B-2026-0042', title: 'Intensivkurs B1.1', tail: null });
    expect(letter.body).toContainEqual({
      type: 'text',
      slot: null,
      text: 'Verwendungszweck: B-2026-0042, Lucía Fernández. Unsere Bankverbindung steht unten auf diesem Brief.',
      strong: false,
    });
    expect(letter.salutation).toBe('Liebe Lucía,');
    expect(letter.recipient).toEqual(['Lucía Fernández', 'Calle Mayor 3', '46001 Valencia', 'Spanien']);
    const heading = letter.body.find((p) => p.type === 'heading');
    expect(heading && heading.type === 'heading' ? heading.detail : '').toBe('23.11.2026–28.01.2027 · 8 Wochen · Mo–Fr · 09:00–12:30 · 20 Unterrichtseinheiten pro Woche');
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

describe('more of a booking’s letters (0034)', () => {
  const today = '2026-10-16';
  const meta = { today, version: 1, sent: [] as { kind: string; date: string }[] };
  const paid = { ...base, paid: 940 };

  it('refuses the letter for the embassy until the course is paid in full, and without a date of birth', () => {
    expect(bookingLetterBlock('visa_letter', base, meta)?.de).toContain('Erst nach vollständiger Zahlung');
    expect(bookingLetterBlock('visa_letter', { ...paid, person: { ...person, birthDate: null } }, meta)?.de).toContain('Geburtsdatum fehlt');
    expect(bookingLetterBlock('visa_letter', paid, meta)).toBeNull();
    const letter = buildBookingLetter('visa_letter', paid, de, LETTER_STANDARD_DEFAULTS.visa_letter.de, meta);
    expect(letter.salutation).toBe('Sehr geehrte Damen und Herren,');
    expect(letter.signOff).toBe('Mit freundlichen Grüßen');
    expect(letter.body).toContainEqual({ type: 'text', slot: 'payment', text: 'Wir bestätigen den Erhalt der vollständigen Zahlung in Höhe von 940,00 € für die Kursgebühr.', strong: true });
  });

  it('allows the show-up letter only between 40 and 9 days before the start, and the last call only after it', () => {
    expect(bookingLetterBlock('showup_first_call', base, { ...meta, today: '2026-10-01' })?.de).toContain('Zu früh');
    expect(bookingLetterBlock('showup_first_call', base, { ...meta, today: '2026-11-30' })?.de).toContain('Frist für eine Verschiebung ist vorbei');
    expect(bookingLetterBlock('showup_first_call', base, { ...meta, today: '2026-10-20' })).toBeNull();
    expect(bookingLetterBlock('showup_last_call', base, meta)?.de).toContain('Kursbeginn bestätigen');
    expect(bookingLetterBlock('showup_last_call', base, { ...meta, sent: [{ kind: 'showup_first_call', date: '2026-11-10' }] })).toBeNull();
  });

  it('asks for the visa proof 19 days before the start', () => {
    const letter = buildBookingLetter('showup_first_call', base, de, LETTER_STANDARD_DEFAULTS.showup_first_call.de, { ...meta, today: '2026-10-20' });
    expect(letter.body).toContainEqual(expect.objectContaining({ slot: 'request', text: expect.stringContaining('bis spätestens Mittwoch, 04.11.2026') }));
  });

  it('ticks the details the record does not have', () => {
    expect(missingFromRecord(person)).toEqual(['birth_place', 'mother_tongue', 'passport', 'phone', 'local_address']);
  });

  it('tells the learner the day, the time and the room', () => {
    const letter = buildBookingLetter('course_start', base, de, LETTER_STANDARD_DEFAULTS.course_start.de, meta);
    expect(letter.body[0]).toEqual({
      type: 'text',
      slot: 'start',
      text: 'in wenigen Tagen, am Montag, 23.11.2026, beginnt dein Kurs. Der Unterricht beginnt um 09:00 Uhr bei uns in der Schule, Am Dobben 14–16 in Bremen, im Raum Dresden (im 1. Stock).',
      strong: false,
    });
  });

  it('certifies the enrolment, never attendance it does not know', () => {
    const letter = buildBookingLetter('enrolment_certificate', base, de, {}, meta);
    const words = letter.body.map((p) => (p.type === 'text' ? p.text : '')).join(' ');
    expect(words).toContain('Frau Lucía Fernández, geboren am 14.03.1998, vom 23.11.2026 bis 28.01.2027 in einem Deutschkurs (Intensivkurs, Niveau B1.1)');
    expect(words).not.toContain('regelmäßig');
    expect(letter.salutation).toBe('');
  });

  it('says what a cancellation leaves to pay or to give back, from the booking’s lines', () => {
    const cancelled = { ...base, status: 'cancelled' as const, charges: [...base.charges, { kind: 'cancellation', description: 'Stornogebühr', amount: 100 }], charged: 1040, paid: 1200 };
    expect(bookingLetterBlock('cancellation_confirmation', base, meta)?.de).toBe('Die Buchung ist nicht storniert.');
    const letter = buildBookingLetter('cancellation_confirmation', cancelled, de, LETTER_STANDARD_DEFAULTS.cancellation_confirmation.de, meta);
    expect(letter.body).toContainEqual(expect.objectContaining({ slot: 'money', text: expect.stringContaining('Guthaben von 160,00 €') }));
  });
});
