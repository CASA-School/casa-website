/**
 * The booking's and the waiting list's letters, as data (docs/LETTERS.md, migration 0032). Pure:
 * the live preview, the print and the copy kept when a letter is sent are all this module's output.
 *
 * Read from SchoolMan's scripts (2026-10-16) and kept to what they say, without their defects:
 *
 * - The confirmation (`Confirmation.First_Booking`, 3,657 letters): the course, its days and times,
 *   the stay, the costs and the total; what has come in and what is open; how much to transfer and
 *   by when. SchoolMan's variant left the amount blank in one branch and never printed the payments
 *   received; here every figure is the booking's, and the deadline follows the terms (AGB §5.2–5.3):
 *   a learner abroad (visa) pays the whole first course, anyone else a down payment within a week
 *   and the rest four weeks before the start — or by the first day of a follow-up booking.
 * - The receipt (`ReceiptPaymentIn_Booking`, 7,349): the payments chosen, their sum, the sum in
 *   words — in the letter's own language, where SchoolMan wrote German words on English receipts —
 *   and what is still open. It changes nothing on the booking.
 * - The waiting list's three (`ConfirmationWaitingList`, `FreePlaceWaitingList`, `Maybenexttime`):
 *   on the list, a place is free, no place this time. One language per letter, where SchoolMan put
 *   German and English on one page.
 *
 * German says du, by first name (docs/VOICE_AND_TONE.md). The opening and closing are CASA's
 * standard texts (`letter_texts`), changed per letter or saved as the new standard; the sentences
 * built from figures — what to pay, a place in the queue, the next start — are changed per letter only.
 */

import { partsSat, type ExamOutcome, type ExamParts } from '../exam-parts';
import { teachingWeeks } from '../offers/course';

import { formatDateRange, formatLetterDate, formatMoney, letterhead, recipientLines, salutation, type Salutation } from './format';
import {
  LETTER_SCHEMA,
  type BookingLetterKind,
  type Letter,
  type LetterKind,
  type LetterLanguage,
  type LetterPart,
  type RegistrationLetterKind,
  type WaitlistLetterKind,
} from './types';

/** Every kind the composer writes: all but the offer, which has its own editor. */
export type ComposedKind = Exclude<LetterKind, 'offer'>;

// ------------------------------------------------------------------ context

export type LetterAddress = { lines: string[]; countryCode: string | null; country: { de: string | null; en: string | null } };

export type LetterPerson = {
  id: string;
  firstName: string;
  lastName: string;
  salutation: Salutation;
  email: string | null;
  phone: string | null;
  motherTongue: string | null;
  birthPlace: string | null;
  /** For the letters to authorities: the embassy's, the enrolment confirmation. */
  birthDate: string | null;
  nationality: Record<LetterLanguage, string | null>;
  passportNumber: string | null;
  home: LetterAddress | null;
  local: LetterAddress | null;
};

export type LetterCourse = {
  name: Record<LetterLanguage, string>;
  level: string | null;
  startDate: string;
  endDate: string;
  session: 'morning' | 'afternoon' | 'evening' | null;
  time: string | null;
  days: string[];
  lessonsPerWeek: number | null;
  /** Where it is taught: "Dresden" on the 1st floor, for the course-start letter. */
  room: { name: string; floor: number | null } | null;
};

/** An exam booking's sitting (0036): the exam, its day and hours, the parts sat, telc's deadline. */
export type LetterExam = {
  /** "telc Deutsch B2": the same in both languages. */
  name: string;
  /** The day, Berlin time ("2026-11-13"), and the hours ("09:00", "17:00"). */
  day: string;
  startTime: string;
  endTime: string;
  deadline: string | null;
  parts: ExamParts;
  /** telc's outcome per part, once entered (0038); null before. A queue's entry has none. */
  result: { written: ExamOutcome | null; oral: ExamOutcome | null } | null;
};

export type BookingLetterContext = {
  bookingId: string;
  /** "B-2026-0042": on the letter, and the reference for a transfer. */
  number: string;
  /** The language the learner registered in, where they did through the website. */
  language: LetterLanguage;
  person: LetterPerson;
  course: LetterCourse | null;
  /** An exam booking: the sitting instead of a course. */
  exam: LetterExam | null;
  accommodation: { name: Record<LetterLanguage, string>; from: string; to: string | null } | null;
  charges: { kind: string; description: string; amount: number }[];
  payments: { id: string; date: string; method: string; amount: number; subject: string }[];
  charged: number;
  paid: number;
  visaRequired: boolean;
  /** A follow-up booking: the rest is due by its first day, not four weeks before. */
  followUp: boolean;
  /** The course type's down payment (`course_types.down_payment`), when it has one. */
  downPayment: number | null;
  status: 'reserved' | 'confirmed' | 'completed' | 'cancelled';
  cancelledAt: string | null;
  staff: { id: string; name: string }[];
};

export type WaitlistLetterContext = {
  entryId: string;
  language: LetterLanguage;
  status: string;
  person: LetterPerson;
  /** A course start's level — or, for an exam's queue (0036), its sitting. */
  course: LetterCourse | null;
  exam: LetterExam | null;
  /** Place in the queue; null once the entry is closed. */
  position: number | null;
  /** The next start of the same course, or the next sitting of the same exam, for "no place this time". */
  nextStart: string | null;
  staff: { id: string; name: string }[];
};

/** Each kind's name, for lists and buttons. */
export const LETTER_KIND_LABELS: Record<LetterKind, Record<LetterLanguage, string>> = {
  offer: { de: 'Angebot', en: 'Offer' },
  booking_confirmation: { de: 'Buchungsbestätigung', en: 'Booking confirmation' },
  payment_receipt: { de: 'Empfangsbestätigung', en: 'Receipt' },
  payment_reminder: { de: 'Zahlungserinnerung', en: 'Payment reminder' },
  payments_overview: { de: 'Zahlungsübersicht', en: 'Payments overview' },
  visa_letter: { de: 'Bestätigung für die Botschaft', en: 'Letter for the embassy' },
  showup_first_call: { de: 'Kursbeginn bestätigen', en: 'Confirm the course start' },
  showup_last_call: { de: 'Letzte Nachfrage', en: 'Last call' },
  missing_items: { de: 'Fehlende Angaben', en: 'Missing details' },
  course_start: { de: 'Kursbeginn', en: 'Course start' },
  enrolment_certificate: { de: 'Einschreibebestätigung', en: 'Confirmation of enrolment' },
  cancellation_confirmation: { de: 'Stornierung', en: 'Cancellation' },
  exam_confirmation: { de: 'Prüfungsbestätigung', en: 'Exam confirmation' },
  exam_invitation: { de: 'Einladung zur Prüfung', en: 'Exam invitation' },
  exam_results: { de: 'Ergebnis ist da', en: 'Results ready' },
  exam_participation: { de: 'Teilnahmebestätigung', en: 'Confirmation of participation' },
  waitlist_confirmation: { de: 'Bestätigung Warteliste', en: 'Waiting-list confirmation' },
  waitlist_place_free: { de: 'Platz frei', en: 'Place free' },
  waitlist_no_place: { de: 'Kein Platz', en: 'No place' },
  learner_confirmation: { de: 'Bestätigung mehrerer Buchungen', en: 'Confirmation of several bookings' },
  registration_test_request: { de: 'Bitte um Testergebnis', en: 'Test result request' },
  registration_deposit_request: { de: 'Bitte um Anzahlung', en: 'Down payment request' },
};

/** One of a learner's bookings, for the confirmation of several (0035). */
export type LearnerBooking = {
  id: string;
  number: string;
  status: BookingLetterContext['status'];
  course: LetterCourse | null;
  exam: LetterExam | null;
  accommodation: BookingLetterContext['accommodation'];
  charges: { description: string; amount: number }[];
  charged: number;
  paid: number;
  visaRequired: boolean;
};

export type LearnerLetterContext = {
  personId: string;
  language: LetterLanguage;
  person: LetterPerson;
  bookings: LearnerBooking[];
  staff: { id: string; name: string }[];
};

/** A website registration, before there is a booking (0035): what the learner asked for. */
export type RegistrationLetterContext = {
  registrationId: string;
  /** The person the registration is linked to, when it is: the letter is also theirs. */
  personId: string | null;
  language: LetterLanguage;
  person: LetterPerson;
  /** The course start they chose, when there is one; else the course as the form named it. */
  course: LetterCourse | null;
  courseLabel: string;
  declaredLevel: string | null;
  visaRequired: boolean;
  /** The course type's down payment; the terms' 100 € when it has none. */
  downPayment: number;
  /** Where the placement tests are on the website, per language. */
  placementUrl: Record<LetterLanguage, string>;
  staff: { id: string; name: string }[];
};

/** What a colleague chooses for one letter. Texts are per slot; null or absent means the standard. */
export type LetterChoices = {
  language: LetterLanguage;
  address: 'home' | 'local' | 'none';
  signatureId: string | null;
  texts: Partial<Record<string, string>>;
  /** The receipt's payments; empty means all. */
  paymentIds?: string[];
  /** The missing-details letter's items (`MISSING_ITEMS`). */
  items?: string[];
  /** The confirmation of several bookings: which. */
  bookingIds?: string[];
};

/** What a letter's rules and words know about the letters already sent for the record. */
export type LetterMeta = { today: string; version: number; sent?: { kind: string; date: string }[] };

/** What the missing-details letter can ask for — SchoolMan's list, with the bank details for a refund. */
export const MISSING_ITEMS = [
  'birth_date',
  'birth_place',
  'nationality',
  'mother_tongue',
  'passport',
  'phone',
  'german_phone',
  'email',
  'home_address',
  'local_address',
  'placement',
  'bank',
] as const;
export type MissingItem = (typeof MISSING_ITEMS)[number];
export const MISSING_ITEM_LABELS: Record<MissingItem, Record<LetterLanguage, string>> = {
  birth_date: { de: 'dein Geburtsdatum', en: 'your date of birth' },
  birth_place: { de: 'dein Geburtsort', en: 'your place of birth' },
  nationality: { de: 'deine Staatsangehörigkeit', en: 'your nationality' },
  mother_tongue: { de: 'deine Muttersprache', en: 'your mother tongue' },
  passport: { de: 'deine Passnummer', en: 'your passport number' },
  phone: { de: 'deine Telefonnummer', en: 'your phone number' },
  german_phone: { de: 'deine deutsche Handynummer', en: 'your German mobile number' },
  email: { de: 'deine E-Mail-Adresse', en: 'your email address' },
  home_address: { de: 'deine Adresse in deinem Heimatland', en: 'your home address' },
  local_address: { de: 'deine Adresse in Bremen', en: 'your address in Bremen' },
  placement: { de: 'das Ergebnis deines Einstufungstests', en: 'the result of your placement test' },
  bank: { de: 'deine Bankverbindung, für eine Erstattung', en: 'your bank details, for a refund' },
};

/** The details the record does not have, ticked when the letter opens; a colleague adds or removes. */
export function missingFromRecord(person: LetterPerson): MissingItem[] {
  const out: MissingItem[] = [];
  if (!person.birthDate) out.push('birth_date');
  if (!person.birthPlace) out.push('birth_place');
  if (!person.nationality.de && !person.nationality.en) out.push('nationality');
  if (!person.motherTongue) out.push('mother_tongue');
  if (!person.passportNumber) out.push('passport');
  if (!person.phone) out.push('phone');
  if (!person.email) out.push('email');
  if (!person.home) out.push('home_address');
  if (!person.local) out.push('local_address');
  return out;
}

/** The slots a colleague can save as CASA's standard, per kind. The others are built from figures. */
export const STANDARD_SLOTS: Record<ComposedKind, readonly string[]> = {
  learner_confirmation: ['intro', 'closing', 'ps'],
  registration_test_request: ['intro', 'closing'],
  registration_deposit_request: ['intro', 'reference', 'visa', 'closing'],
  booking_confirmation: ['intro', 'closing', 'ps'],
  payment_receipt: ['intro', 'closing'],
  payment_reminder: ['intro', 'ways', 'closing'],
  payments_overview: ['intro', 'closing'],
  visa_letter: ['programme', 'contract', 'closing'],
  showup_first_call: ['intro', 'postpone', 'closing'],
  showup_last_call: ['intro', 'closing'],
  missing_items: ['intro', 'closing'],
  course_start: ['practical', 'closing'],
  enrolment_certificate: [],
  cancellation_confirmation: ['intro', 'closing'],
  exam_confirmation: ['intro', 'id', 'rules', 'closing'],
  exam_invitation: ['bring', 'oral', 'part', 'rules', 'closing'],
  exam_results: ['collect', 'proxy', 'closing'],
  exam_participation: [],
  waitlist_confirmation: ['intro', 'closing'],
  waitlist_place_free: ['intro', 'closing'],
  waitlist_no_place: ['intro', 'closing'],
};

export const LETTER_STANDARD_DEFAULTS: Record<ComposedKind, Record<LetterLanguage, Record<string, string>>> = {
  // An exam's (0037): what SchoolMan's letters said, and what they left out — the ID, the name on the
  // certificate, a no-show (AGB 6.2).
  exam_confirmation: {
    de: {
      intro: 'vielen Dank für deine Anmeldung. Hiermit bestätigen wir dir deinen Platz in folgender Prüfung:',
      id: 'Bitte prüf, ob dein Name genau so geschrieben ist wie in deinem Ausweis oder Pass: telc druckt dein Zertifikat mit diesem Namen. Wenn etwas nicht stimmt, sag uns bitte sofort Bescheid. Zur Prüfung bringst du deinen gültigen Ausweis oder Pass mit.',
      rules: 'Bitte beachte: Deine Anmeldung zur Prüfung ist verbindlich. Wenn du zur Prüfung nicht kommst, erstatten wir die Prüfungsgebühr nicht (AGB, Punkt 6.2).',
      closing: 'Ein paar Tage vor der Prüfung schicken wir dir eine Einladung mit dem Ablauf. Dein Ergebnis und dein Zertifikat sind etwa 6 Wochen nach der Prüfung da. Wenn du Fragen hast, schreib uns einfach.',
    },
    en: {
      intro: 'Thank you for registering. We are pleased to confirm your place in the following exam:',
      id: 'Please check that your name is spelt exactly as in your ID card or passport: telc prints your certificate with this name. If anything is wrong, please let us know straight away. Bring your valid ID card or passport to the exam.',
      rules: 'Please note: your registration for the exam is binding. If you do not come to the exam, we do not refund the exam fee (terms and conditions, point 6.2).',
      closing: 'A few days before the exam we will send you an invitation with the schedule. Your result and your certificate arrive about 6 weeks after the exam. If you have any questions, just write to us.',
    },
  },
  exam_invitation: {
    de: {
      bring: 'Bitte bring deinen gültigen Ausweis oder Pass mit: Vor Beginn prüfen wir die Angaben aller Teilnehmenden.',
      oral: 'Du legst nur den mündlichen Teil ab: Bitte komm um 12:45 Uhr.',
      part: 'Weil du nur einen Teil ablegst, bring bitte auch dein bisheriges telc-Ergebnis mit.',
      rules: 'In den Prüfungsraum darfst du nur eine durchsichtige Wasserflasche ohne Etikett mitnehmen. Uhren und Smartwatches sind nicht erlaubt.',
      closing: 'Bitte bestätige uns kurz, dass du diese Einladung bekommen hast. Wir wünschen dir viel Erfolg!',
    },
    en: {
      bring: 'Please bring your valid ID card or passport: before the exam begins, we check every candidate’s details.',
      oral: 'You are taking the oral part only: please come at 12:45.',
      part: 'As you are taking one part only, please also bring your previous telc result.',
      rules: 'You may only take a clear water bottle without a label into the exam room. Watches and smartwatches are not allowed.',
      closing: 'Please let us know briefly that you have received this invitation. We wish you every success!',
    },
  },
  exam_participation: { de: {}, en: {} },
  exam_results: {
    de: {
      collect: 'Du kannst dein Ergebnis bei uns im Büro abholen. Bitte bring dazu deinen Ausweis oder Pass mit. Am Telefon und per E-Mail geben wir keine Ergebnisse weiter.',
      proxy: 'Wenn jemand anderes dein Ergebnis für dich abholt, braucht diese Person eine schriftliche Vollmacht von dir.',
      closing: 'Wenn du Fragen hast, schreib uns einfach.',
    },
    en: {
      collect: 'You can collect your result at our office. Please bring your ID card or passport. We do not give results over the phone or by email.',
      proxy: 'If someone else collects your result for you, they need a written authorisation from you.',
      closing: 'If you have any questions, just write to us.',
    },
  },
  learner_confirmation: {
    de: {
      intro: 'vielen Dank für deine Anmeldung bei CASA. Hiermit bestätigen wir dir folgende Buchungen:',
      closing: 'Wir freuen uns, dich bald bei uns begrüßen zu können. Wenn du Fragen hast, schreib uns einfach oder ruf an.',
      ps: 'PS: Diese Bestätigung gilt vorbehaltlich deiner Zahlung und ist keine Bestätigung für einen Visumantrag.',
    },
    en: {
      intro: 'Thank you for registering with CASA. We are pleased to confirm the following bookings:',
      closing: 'We look forward to welcoming you soon. If you have any questions, just write to us or give us a call.',
      ps: 'PS: This confirmation depends on your payment and cannot be used to apply for a visa.',
    },
  },
  registration_test_request: {
    de: {
      intro: 'vielen Dank für deine Anmeldung über unsere Website. Wir haben sie erhalten:',
      closing: 'Bitte schick uns dein Ergebnis in den nächsten Tagen. Sobald wir sicher sind, dass du im richtigen Niveau bist, bearbeiten wir deine Anmeldung weiter.',
    },
    en: {
      intro: 'Thank you for registering on our website. We have received your registration:',
      closing: 'Please send us your result in the next few days. As soon as we are sure that you are in the right level, we will continue with your registration.',
    },
  },
  registration_deposit_request: {
    de: {
      intro: 'vielen Dank für deine Anmeldung über unsere Website. Hiermit bestätigen wir dir den Eingang:',
      reference: 'Bitte gib bei der Überweisung deinen vollen Namen und dein Geburtsdatum als Verwendungszweck an, damit wir die Zahlung richtig zuordnen können. Unsere Bankverbindung steht unten auf diesem Brief.',
      visa: 'Wenn du ein Visum für einen Sprachkurs oder ein Studium beantragen musst: Wir können nur Kurse bestätigen, die vollständig im Voraus bezahlt sind. Sobald du nach Deutschland eingereist bist und der Kurs begonnen hat, kann ein visumgebundener Kurs nicht mehr storniert werden.',
      closing: 'Wenn du Fragen hast, schreib uns einfach.',
    },
    en: {
      intro: 'Thank you for registering on our website. We hereby confirm that we have received your registration:',
      reference: 'When you transfer the money, please give your full name and your date of birth as the payment reference, so that we can match the payment. Our bank details are at the foot of this letter.',
      visa: 'If you need to apply for a visa for a language course or for university: we can only confirm courses that have been paid in full in advance. Once you have entered Germany and the course has begun, a course tied to a visa can no longer be cancelled.',
      closing: 'If you have any questions, just write to us.',
    },
  },
  booking_confirmation: {
    de: {
      intro: 'vielen Dank für deine Anmeldung bei CASA. Hiermit bestätigen wir dir folgende Buchung:',
      closing: 'Wir freuen uns, dich bald bei uns begrüßen zu können. Wenn du Fragen hast, schreib uns einfach oder ruf an.',
      ps: 'PS: Diese Bestätigung gilt vorbehaltlich deiner Zahlung und ist keine Bestätigung für einen Visumantrag.',
    },
    en: {
      intro: 'Thank you for registering with CASA. We are pleased to confirm the following booking:',
      closing: 'We look forward to welcoming you soon. If you have any questions, just write to us or give us a call.',
      ps: 'PS: This confirmation depends on your payment and cannot be used to apply for a visa.',
    },
  },
  payment_receipt: {
    de: { intro: 'hiermit bestätigen wir dir den Erhalt deiner Zahlung:', closing: 'Vielen Dank!' },
    en: { intro: 'We hereby confirm that we have received your payment:', closing: 'Thank you very much.' },
  },
  payment_reminder: {
    de: {
      intro: 'wir möchten dich an eine offene Zahlung für deine Buchung erinnern:',
      ways: 'Du kannst bei uns im Büro mit Karte oder bar bezahlen oder den Betrag überweisen. Unsere Bankverbindung steht unten auf diesem Brief.',
      closing: 'Wenn du in den letzten Tagen schon bezahlt hast, ist dieser Brief für dich erledigt. Bei Fragen melde dich einfach bei uns.',
    },
    en: {
      intro: 'This is a friendly reminder of an outstanding payment for your booking:',
      ways: 'You can pay at our office by card or in cash, or transfer the amount. Our bank details are at the foot of this letter.',
      closing: 'If you have paid in the last few days, please disregard this letter. If you have any questions, just get in touch.',
    },
  },
  payments_overview: {
    de: { intro: 'hier ist die Aufstellung deiner gebuchten Leistungen und Zahlungen:', closing: 'Wenn dir etwas nicht stimmig vorkommt, melde dich einfach bei uns.' },
    en: { intro: 'Here is a statement of your booked services and payments:', closing: 'If anything looks wrong to you, just let us know.' },
  },
  visa_letter: {
    de: {
      programme:
        'Der Kurs ist Teil eines Programms von sechs aufeinander aufbauenden Niveaustufen von A1 bis einschließlich C1 und bereitet auf die Prüfungen telc Deutsch C1 Hochschule bzw. TestDaF vor. Der gebuchte Kurs kann in Bremen verlängert werden.',
      contract:
        'Das Sprachvisum ist an die verbindliche Buchung eines fest definierten Zeitraums an einer Sprachschule gebunden. Es handelt sich um einen Vertrag, der zwischen drei Parteien geschlossen wird: dem deutschen Staat, der Sprachschule und der Person, die das Visum zum Zwecke des Spracherwerbs gebucht hat. Dieser Vertrag kann von der Teilnehmerin oder dem Teilnehmer nicht gekündigt werden.',
      closing:
        'Wir bitten Sie freundlich, die entsprechenden Visumspapiere für die Kursteilnahme auszustellen, und danken Ihnen im Voraus für Ihre Bemühungen. Bei Rückfragen stehen wir Ihnen jederzeit gern zur Verfügung.',
    },
    en: {
      programme:
        'The course is part of a programme of six consecutive levels from A1 up to and including C1 and prepares for the telc Deutsch C1 Hochschule and TestDaF examinations. The course booked can be extended in Bremen.',
      contract:
        'The language visa is tied to the binding booking of a fixed period at a language school. It is a contract between three parties: the German state, the language school and the person who has booked the course to learn the language. The participant cannot cancel this contract.',
      closing:
        'We kindly ask you to issue the visa documents for the course participation and thank you in advance for your efforts. If you have any questions, please do not hesitate to contact us.',
    },
  },
  showup_first_call: {
    de: {
      intro: 'du hast bei uns folgenden Kurs gebucht:',
      postpone:
        'Bitte beachte: Eine Verschiebung wegen des Visums ist einmal kostenlos möglich, jede weitere kostet 100,00 €. In beiden Fällen brauchen wir die Information bis zu dieser Frist. Eine spätere Verschiebung verpflichtet zur Zahlung aller gebuchten Leistungen, die in die vierwöchige Frist fallen.',
      closing: 'Melde dich gern, wenn du Fragen hast.',
    },
    en: {
      intro: 'You have booked the following course with us:',
      postpone:
        'Please note: one postponement because of the visa is free of charge; each further one costs €100.00. In both cases we need to know by this deadline. A later postponement means paying for all booked services that fall within the four-week period.',
      closing: 'Do get in touch if you have any questions.',
    },
  },
  showup_last_call: {
    de: { intro: 'du hast bei uns folgenden Kurs gebucht:', closing: 'Vielen Dank für dein Verständnis.' },
    en: { intro: 'You have booked the following course with us:', closing: 'Thank you for your understanding.' },
  },
  missing_items: {
    de: {
      intro: 'vielen Dank für deine Anmeldung bei CASA. Damit wir alles für deinen Kurs vorbereiten können, brauchen wir noch folgende Angaben von dir:',
      closing: 'Schick sie uns einfach per E-Mail oder bring sie im Büro vorbei. Vielen Dank für deine Hilfe!',
    },
    en: {
      intro: 'Thank you for registering with CASA. So that we can prepare everything for your course, we still need the following details from you:',
      closing: 'Just send them to us by email or bring them to the office. Thank you for your help.',
    },
  },
  course_start: {
    de: {
      practical: 'Komm am ersten Tag am besten etwa 15 Minuten früher. Das Lehrbuch für deinen Kurs kannst du vorher bei uns im Büro kaufen oder abholen.',
      closing: 'Bei Fragen melde dich gern. Wir freuen uns auf dich!',
    },
    en: {
      practical: 'On the first day, please come about 15 minutes early. You can buy or collect the coursebook at our office beforehand.',
      closing: 'If you have any questions, just get in touch. We look forward to seeing you!',
    },
  },
  enrolment_certificate: { de: {}, en: {} },
  cancellation_confirmation: {
    de: {
      intro: 'hiermit bestätigen wir die Stornierung deiner Buchung:',
      closing: 'Wir würden uns freuen, dich zu einem späteren Zeitpunkt bei CASA zu begrüßen. Bei Fragen melde dich gern.',
    },
    en: {
      intro: 'We hereby confirm the cancellation of your booking:',
      closing: 'We would be glad to welcome you at CASA at a later date. If you have any questions, just get in touch.',
    },
  },
  waitlist_confirmation: {
    de: {
      intro: 'vielen Dank für deine Anmeldung. Der Kurs, den du dir ausgesucht hast, ist leider schon ausgebucht. Deshalb haben wir dich auf die Warteliste gesetzt:',
      closing: 'Sobald ein Platz frei wird, melden wir uns bei dir. Wenn dir auch ein anderer Termin passt, sag uns gern Bescheid. Hoffentlich bis bald!',
    },
    en: {
      intro: 'Thank you for registering. Unfortunately, the course you chose is already full, so we have put you on the waiting list:',
      closing: 'As soon as a place becomes free, we will let you know. If another date would also suit you, just tell us. We hope to see you soon.',
    },
  },
  waitlist_place_free: {
    de: {
      intro: 'gute Nachrichten: In deinem Kurs ist ein Platz frei geworden, und wir halten ihn für dich frei.',
      closing: 'Bitte gib uns so bald wie möglich Bescheid, ob wir den Platz fest für dich buchen dürfen. Dann schicken wir dir deine Buchungsbestätigung.',
    },
    en: {
      intro: 'Good news: a place has become free in your course, and we are keeping it for you.',
      closing: 'Please let us know as soon as possible whether we may book the place for you. We will then send you your booking confirmation.',
    },
  },
  waitlist_no_place: {
    de: {
      intro: 'leider ist in deinem Kurs kein Platz frei geworden, und wir können dir dieses Mal keinen Platz anbieten.',
      closing: 'Du kannst dich jederzeit über das Anmeldeformular auf casa-bremen.de anmelden. Wir hoffen, dich bald bei CASA zu sehen.',
    },
    en: {
      intro: 'Unfortunately, no place has become free in your course, and we cannot offer you a place this time.',
      closing: 'You can register at any time with the form on casa-bremen.de. We hope to see you at CASA soon.',
    },
  },
};

// -------------------------------------------------------------------- words

const W = {
  de: {
    confirmation: (n: string) => `Bestätigung der Buchung Nr. ${n}`,
    bookingNo: (n: string) => `Buchung Nr. ${n}`,
    receipt: 'Empfangsbestätigung',
    waitlist: 'Warteliste',
    placeFree: 'Gute Nachrichten: ein Platz ist frei',
    version: (v: number) => `${v}. Fassung`,
    weeks: (n: number) => `${n} ${n === 1 ? 'Woche' : 'Wochen'}`,
    lessons: (n: number) => `${n} Unterrichtseinheiten pro Woche`,
    session: { morning: 'vormittags', afternoon: 'nachmittags', evening: 'abends' },
    stay: 'Unterkunft',
    costs: 'Kosten',
    total: 'Gesamt',
    received: 'Bereits bezahlt',
    open: 'Noch offen',
    credit: 'Guthaben',
    allPaid: 'Es ist alles bezahlt. Vielen Dank!',
    deposit: (amount: string, by: string, rest: string, restBy: string) =>
      `Bitte überweise bis zum ${by} eine Anzahlung von ${amount}. Damit ist dein Platz fest reserviert. Den Restbetrag von ${rest} überweise bitte bis zum ${restBy}.`,
    whole: (amount: string, by: string) => `Bitte überweise den Gesamtbetrag von ${amount} bis zum ${by}.`,
    rest: (amount: string, by: string) => `Bitte überweise den offenen Betrag von ${amount} bis zum ${by}.`,
    visa: (amount: string, by: string) =>
      `Für die verbindliche Reservierung deines Kursplatzes und deinen Visumantrag überweise bitte den Gesamtbetrag von ${amount} bis zum ${by}. Sobald deine Zahlung da ist, schicken wir dir eine eigene Bestätigung für die Botschaft.`,
    reference: (number: string, who: string) => `Verwendungszweck: ${number}, ${who}. Unsere Bankverbindung steht unten auf diesem Brief.`,
    receivedRow: 'Erhalten',
    inWords: (words: string) => `In Worten: ${words}`,
    bookingTotal: 'Gesamtbetrag der Buchung',
    paidTotal: 'Insgesamt bezahlt',
    position: (n: number) => `Du stehst auf Platz ${n} der Warteliste.`,
    next: (course: string, date: string) => `Der nächste ${course} beginnt am ${date}. Wenn du möchtest, melden wir dich gern dafür an.`,
    noNext: 'Kommt vielleicht ein späterer Kurs für dich infrage? Dann melden wir dich gern dafür an.',
    nextSitting: (exam: string, date: string) => `Der nächste Termin für ${exam} ist am ${date}. Wenn du möchtest, melden wir dich gern dafür an.`,
    noNextSitting: 'Sobald ein neuer Prüfungstermin feststeht, kannst du dich über das Formular auf casa-bremen.de anmelden.',
    method: { card: 'Karte', cash: 'bar', transfer: 'Überweisung', carryover: 'Übertrag', agency: 'über die Agentur', offset: 'Verrechnung' } as Record<string, string>,
    days: { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' } as Record<string, string>,
  },
  en: {
    confirmation: (n: string) => `Confirmation of booking no. ${n}`,
    bookingNo: (n: string) => `booking no. ${n}`,
    receipt: 'Receipt',
    waitlist: 'Waiting list',
    placeFree: 'Good news: a place is free',
    version: (v: number) => `version ${v}`,
    weeks: (n: number) => `${n} ${n === 1 ? 'week' : 'weeks'}`,
    lessons: (n: number) => `${n} lessons a week`,
    session: { morning: 'mornings', afternoon: 'afternoons', evening: 'evenings' },
    stay: 'Accommodation',
    costs: 'Costs',
    total: 'Total',
    received: 'Already paid',
    open: 'Still to pay',
    credit: 'Credit',
    allPaid: 'Everything has been paid. Thank you!',
    deposit: (amount: string, by: string, rest: string, restBy: string) =>
      `Please transfer a down payment of ${amount} by ${by}. This reserves your place. Please transfer the remaining ${rest} by ${restBy}.`,
    whole: (amount: string, by: string) => `Please transfer the total of ${amount} by ${by}.`,
    rest: (amount: string, by: string) => `Please transfer the outstanding ${amount} by ${by}.`,
    visa: (amount: string, by: string) =>
      `To reserve your place and for your visa application, please transfer the total of ${amount} by ${by}. As soon as your payment arrives, we will send you a separate confirmation for the embassy.`,
    reference: (number: string, who: string) => `Payment reference: ${number}, ${who}. Our bank details are at the foot of this letter.`,
    receivedRow: 'Received',
    inWords: (words: string) => `In words: ${words}`,
    bookingTotal: 'Total of the booking',
    paidTotal: 'Paid in total',
    position: (n: number) => `You are number ${n} on the waiting list.`,
    next: (course: string, date: string) => `The next ${course} starts on ${date}. If you like, we will gladly register you for it.`,
    noNext: 'Would a later course suit you? We will gladly register you for it.',
    nextSitting: (exam: string, date: string) => `The next sitting of ${exam} is on ${date}. If you like, we will gladly register you for it.`,
    noNextSitting: 'As soon as a new exam date is set, you can register with the form on casa-bremen.de.',
    method: { card: 'card', cash: 'cash', transfer: 'bank transfer', carryover: 'carried over', agency: 'through the agency', offset: 'offset' } as Record<string, string>,
    days: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' } as Record<string, string>,
  },
} as const;

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "Mo–Fr" for a run of days, "Mo, Mi" otherwise. */
export function dayList(days: readonly string[], lang: LetterLanguage): string | null {
  const sorted = days.filter((d) => DAY_ORDER.includes(d)).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (sorted.length === 0) return null;
  const run = sorted.every((d, i) => i === 0 || DAY_ORDER.indexOf(d) === DAY_ORDER.indexOf(sorted[i - 1]) + 1);
  const short = sorted.map((d) => W[lang].days[d]);
  return run && short.length > 2 ? `${short[0]}–${short[short.length - 1]}` : short.join(', ');
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Teaching weeks, the school's closures left out (the Christmas break): a level is 8 weeks, not 10. */
const weeksBetween = (from: string, to: string) => teachingWeeks(from, to);

/** The course in one line under its name: dates, weeks, when, how much. */
function courseDetail(course: LetterCourse, lang: LetterLanguage): string {
  const w = W[lang];
  const time = course.time ? course.time.replace('-', '–') : null;
  return [
    `${formatDateRange(course.startDate, course.endDate, lang)} · ${w.weeks(weeksBetween(course.startDate, course.endDate))}`,
    [dayList(course.days, lang), time ?? (course.session ? w.session[course.session] : null)].filter(Boolean).join(' · ') || null,
    course.lessonsPerWeek ? w.lessons(course.lessonsPerWeek) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const courseTitle = (course: LetterCourse, lang: LetterLanguage) => [course.name[lang], course.level].filter(Boolean).join(' ');

// --------------------------------------------------------------- the frame

function frame(
  kind: Letter['kind'],
  person: LetterPerson,
  staff: { id: string; name: string }[],
  choices: LetterChoices,
  today: string,
  subject: Letter['subject'],
  body: LetterPart[],
  /** A letter to an authority: no salutation of its own, a formal sign-off. */
  opts: { salutation?: string; signOff?: string } = {}
): Letter {
  const lang = choices.language;
  const address = choices.address === 'none' ? null : choices.address === 'local' ? (person.local ?? person.home) : (person.home ?? person.local);
  const signatureName = staff.find((s) => s.id === choices.signatureId)?.name ?? null;
  return {
    schema: LETTER_SCHEMA,
    kind,
    language: lang,
    ...letterhead(lang, signatureName),
    recipient: recipientLines({
      name: [person.firstName, person.lastName].filter(Boolean).join(' '),
      contact: '',
      address: address ? address.lines.join('\n') : '',
      countryCode: address?.countryCode ?? null,
      countryName: address ? address.country[lang] : null,
    }),
    placeDate: `Bremen, ${formatLetterDate(today, lang)}`,
    subject,
    salutation: opts.salutation ?? salutation({ language: lang, salutation: person.salutation, firstName: person.firstName, lastName: person.lastName }),
    body,
    ...(opts.signOff !== undefined ? { signOff: opts.signOff } : {}),
  };
}

/** A text part: the colleague's own words for this letter, else the standard (or the built sentence). */
const text = (choices: LetterChoices, slot: string, fallback: string, strong = false): LetterPart => ({
  type: 'text',
  slot,
  text: choices.texts[slot] ?? fallback,
  strong,
});

// ------------------------------------------------------------ the booking

/** What to transfer and by when, from the booking's figures and the terms (AGB §5.2–5.3). */
export function paymentSentence(ctx: BookingLetterContext, lang: LetterLanguage, today: string): string {
  const w = W[lang];
  const balance = Math.round((ctx.charged - ctx.paid) * 100) / 100;
  if (ctx.charged > 0 && balance <= 0.005) return w.allPaid;
  if (balance <= 0.005) return '';
  const money = (n: number) => formatMoney(n, lang);
  const start = ctx.course?.startDate ?? null;
  // A week from today, or the first day when the course starts sooner.
  const week = addDays(today, 7);
  const soon = start && start < week ? start : week;
  if (ctx.visaRequired) return w.visa(money(balance), formatLetterDate(soon, lang));
  // The rest: four weeks before the start for a first booking, by the first day for a follow-up.
  const restBy = start ? (ctx.followUp ? start : addDays(start, -28)) : null;
  if (ctx.paid <= 0.005 && ctx.downPayment && ctx.downPayment < balance && restBy && restBy > soon) {
    return w.deposit(money(ctx.downPayment), formatLetterDate(soon, lang), money(balance - ctx.downPayment), formatLetterDate(restBy, lang));
  }
  const by = ctx.paid > 0.005 && restBy && restBy > today ? restBy : soon;
  return ctx.paid > 0.005 ? w.rest(money(balance), formatLetterDate(by, lang)) : w.whole(money(balance), formatLetterDate(by, lang));
}

export function bookingConfirmationLetter(
  ctx: BookingLetterContext,
  choices: LetterChoices,
  standard: Record<string, string>,
  meta: { today: string; version: number }
): Letter {
  const lang = choices.language;
  const w = W[lang];
  const money = (n: number) => formatMoney(n, lang);
  const balance = ctx.charged - ctx.paid;
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.course) body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: courseDetail(ctx.course, lang) });
  if (ctx.accommodation) {
    body.push({
      type: 'heading',
      text: `${w.stay}: ${ctx.accommodation.name[lang]}`,
      detail: ctx.accommodation.to ? formatDateRange(ctx.accommodation.from, ctx.accommodation.to, lang) : formatLetterDate(ctx.accommodation.from, lang),
    });
  }
  body.push({
    type: 'table',
    heading: w.costs,
    rows: ctx.charges.map((c) => ({ text: c.description, amount: money(c.amount), ref: null })),
    total: { label: w.total, amount: money(ctx.charged) },
  });
  if (ctx.paid > 0.005) {
    body.push({ type: 'sum', label: w.received, amount: money(ctx.paid) });
    body.push({ type: 'sum', label: balance < -0.005 ? w.credit : w.open, amount: money(Math.abs(balance)) });
  }
  const payment = paymentSentence(ctx, lang, meta.today);
  body.push(text(choices, 'payment', payment, true));
  if (balance > 0.005) {
    body.push({ type: 'text', slot: null, text: w.reference(ctx.number, [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' ')), strong: false });
  }
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  body.push(text(choices, 'ps', standard.ps));
  return frame(
    'booking_confirmation',
    ctx.person,
    ctx.staff,
    choices,
    meta.today,
    { lead: w.confirmation(ctx.number), title: ctx.course ? courseTitle(ctx.course, lang) : '', tail: meta.version > 1 ? w.version(meta.version) : null },
    body
  );
}

export function paymentReceiptLetter(
  ctx: BookingLetterContext,
  choices: LetterChoices,
  standard: Record<string, string>,
  meta: { today: string; version: number }
): Letter {
  const lang = choices.language;
  const w = W[lang];
  const money = (n: number) => formatMoney(n, lang);
  const chosen = choices.paymentIds?.length ? ctx.payments.filter((p) => choices.paymentIds!.includes(p.id)) : ctx.payments;
  const received = chosen.reduce((sum, p) => sum + p.amount, 0);
  const balance = ctx.charged - ctx.paid;
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.course) body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: formatDateRange(ctx.course.startDate, ctx.course.endDate, lang) });
  if (ctx.exam) body.push(examHeading(ctx.exam, lang));
  body.push({
    type: 'table',
    heading: null,
    rows: chosen.map((p) => ({ text: [formatLetterDate(p.date, lang), p.subject, w.method[p.method] ?? p.method].filter(Boolean).join(' · '), amount: money(p.amount), ref: null })),
    total: { label: w.receivedRow, amount: money(received) },
  });
  body.push({ type: 'text', slot: null, text: w.inWords(amountInWords(received, lang)), strong: false });
  body.push({ type: 'sum', label: w.bookingTotal, amount: money(ctx.charged) });
  body.push({ type: 'sum', label: w.paidTotal, amount: money(ctx.paid) });
  body.push({ type: 'sum', label: balance < -0.005 ? w.credit : w.open, amount: money(Math.abs(balance)) });
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame(
    'payment_receipt',
    ctx.person,
    ctx.staff,
    choices,
    meta.today,
    { lead: w.receipt, title: [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' '), tail: w.bookingNo(ctx.number) },
    body
  );
}

// ------------------------------------------------- more of a booking's letters (0034)

const MORE = {
  de: {
    bookingNo: (n: string) => `Buchung Nr. ${n}`,
    reminder: 'Zahlungserinnerung',
    nth: (v: number) => `${v}. Erinnerung`,
    open: (amount: string, by: string) => `Für deine Buchung ist noch ein Betrag von ${amount} offen. Bitte zahle ihn bis zum ${by}.`,
    overview: 'Aufstellung über gebuchte Leistungen und Zahlungen',
    costsTotal: 'Kosten gesamt',
    payments: 'Zahlungen',
    paymentsTotal: 'Zahlungen gesamt',
    balanceOpen: 'Noch offen',
    balanceCredit: 'Guthaben',
    balanceEven: 'Ausgeglichen',
    visa: 'Anmeldebestätigung',
    visaSalutation: 'Sehr geehrte Damen und Herren,',
    formalSignOff: 'Mit freundlichen Grüßen',
    enrolled: (who: string) =>
      `hiermit bestätigen wir, dass ${who} bei CASA – Internationale Sprachschule Bremen verbindlich für folgenden Deutschkurs angemeldet ist:`,
    born: (date: string) => `geboren am ${date}`,
    nationality: (n: string) => `Staatsangehörigkeit ${n}`,
    passport: (n: string) => `Reisepass Nr. ${n}`,
    lessons: (perWeek: number, total: number) =>
      `Der Kurs umfasst ${perWeek} Unterrichtseinheiten à 45 Minuten pro Woche, insgesamt ${total} Unterrichtseinheiten, und findet als Präsenzunterricht statt. Die persönliche Anwesenheit ist daher erforderlich.`,
    stay: (name: string, range: string) => `Gebuchte Unterkunft: ${name}, ${range}.`,
    paidInFull: (amount: string, stay: boolean) => `Wir bestätigen den Erhalt der vollständigen Zahlung in Höhe von ${amount} für die Kursgebühr${stay ? ' und die Unterkunft' : ''}.`,
    showup: 'Bitte bestätige deinen Kursbeginn',
    showupRequest: (by: string) =>
      `Bitte schick uns bis spätestens ${by} einen Nachweis deines Visums (ein Foto der Passseite mit dem Visum) und bestätige uns, dass du den Kurs antreten kannst. Wenn wir bis dahin nichts von dir hören, deaktivieren wir deine Buchung.`,
    lastCall: 'Dringend: bitte melde dich bis morgen',
    lastCallRequest: (first: string | null, tomorrow: string) =>
      `Wir haben dir${first ? ` am ${first}` : ''} eine Nachricht mit einer Antwortfrist geschickt und bis heute keine Antwort von dir bekommen. Bitte melde dich bis morgen, ${tomorrow}. Sonst deaktivieren wir deine Buchung.`,
    missing: 'Wir brauchen noch ein paar Angaben',
    courseStart: 'Dein Kurs beginnt',
    startsOn: (day: string, time: string | null, room: string | null) =>
      `in wenigen Tagen, am ${day}, beginnt dein Kurs.${time ? ` Der Unterricht beginnt um ${time} Uhr` : ' Der Unterricht findet'} bei uns in der Schule, Am Dobben 14–16 in Bremen${room ? `, im Raum ${room}` : ''}.`,
    floor: (f: number) => (f === 0 ? 'im Erdgeschoss' : `im ${f}. Stock`),
    certificate: 'Einschreibebestätigung',
    certify: (who: string, range: string, course: string) =>
      `Hiermit bestätigen wir, dass ${who} ${range} in einem Deutschkurs (${course}) bei CASA – Internationale Sprachschule Bremen eingeschrieben ist.`,
    certifyLessons: (perWeek: number, total: number) => `Der Kurs umfasst ${perWeek} Unterrichtseinheiten à 45 Minuten pro Woche, insgesamt ${total} Unterrichtseinheiten.`,
    title: { ms: 'Frau ', mr: 'Herr ', none: '' } as Record<Salutation, string>,
    fromTo: (from: string, to: string) => `vom ${from} bis ${to}`,
    level: (l: string) => `Niveau ${l}`,
    cancellation: 'Stornierung deiner Buchung',
    cancelFee: (fee: string) => `Für die Stornierung berechnen wir eine Gebühr von ${fee}.`,
    cancelPay: (amount: string, by: string) => `Bitte überweise den offenen Betrag von ${amount} bis zum ${by}.`,
    cancelCredit: (amount: string) => `Du hast bei uns ein Guthaben von ${amount}. Wir melden uns bei dir, wie wir es dir zurückzahlen oder auf eine neue Buchung übertragen.`,
    cancelSettled: (fee: string) => `Die Stornierungsgebühr von ${fee} ist damit beglichen.`,
    weekdays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  },
  en: {
    bookingNo: (n: string) => `booking no. ${n}`,
    reminder: 'Payment reminder',
    nth: (v: number) => `reminder ${v}`,
    open: (amount: string, by: string) => `There is still ${amount} outstanding on your booking. Please pay it by ${by}.`,
    overview: 'Statement of booked services and payments',
    costsTotal: 'Total costs',
    payments: 'Payments',
    paymentsTotal: 'Total payments',
    balanceOpen: 'Still to pay',
    balanceCredit: 'Credit',
    balanceEven: 'Settled',
    visa: 'Confirmation of enrolment',
    visaSalutation: 'Dear Sir or Madam,',
    formalSignOff: 'Yours faithfully',
    enrolled: (who: string) => `We hereby confirm that ${who} is firmly registered at CASA – Internationale Sprachschule Bremen for the following German course:`,
    born: (date: string) => `born on ${date}`,
    nationality: (n: string) => `nationality ${n}`,
    passport: (n: string) => `passport no. ${n}`,
    lessons: (perWeek: number, total: number) =>
      `The course comprises ${perWeek} lessons of 45 minutes a week, ${total} lessons in total, and is taught in person. Attendance in person is therefore required.`,
    stay: (name: string, range: string) => `Accommodation booked: ${name}, ${range}.`,
    paidInFull: (amount: string, stay: boolean) => `We confirm that we have received the full payment of ${amount} for the course fee${stay ? ' and the accommodation' : ''}.`,
    showup: 'Please confirm your course start',
    showupRequest: (by: string) =>
      `Please send us proof of your visa (a photo of the passport page with the visa) and confirm that you can attend the course by ${by} at the latest. If we do not hear from you by then, we will deactivate your booking.`,
    lastCall: 'Urgent: please reply by tomorrow',
    lastCallRequest: (first: string | null, tomorrow: string) =>
      `We sent you a message${first ? ` on ${first}` : ''} with a deadline for your reply and have not heard from you yet. Please get in touch by tomorrow, ${tomorrow}. Otherwise we will deactivate your booking.`,
    missing: 'We still need a few details',
    courseStart: 'Your course starts',
    startsOn: (day: string, time: string | null, room: string | null) =>
      `Your course starts in a few days, on ${day}.${time ? ` Lessons begin at ${time}` : ' Lessons take place'} at our school, Am Dobben 14–16 in Bremen${room ? `, in room ${room}` : ''}.`,
    floor: (f: number) => (f === 0 ? 'on the ground floor' : `on the ${f === 1 ? '1st' : f === 2 ? '2nd' : f === 3 ? '3rd' : `${f}th`} floor`),
    certificate: 'Confirmation of enrolment',
    certify: (who: string, range: string, course: string) => `This is to confirm that ${who} is enrolled ${range} in a German course (${course}) at CASA – Internationale Sprachschule Bremen.`,
    certifyLessons: (perWeek: number, total: number) => `The course comprises ${perWeek} lessons of 45 minutes a week, ${total} lessons in total.`,
    title: { ms: 'Ms ', mr: 'Mr ', none: '' } as Record<Salutation, string>,
    fromTo: (from: string, to: string) => `from ${from} to ${to}`,
    level: (l: string) => `level ${l}`,
    cancellation: 'Cancellation of your booking',
    cancelFee: (fee: string) => `We charge a cancellation fee of ${fee}.`,
    cancelPay: (amount: string, by: string) => `Please transfer the outstanding ${amount} by ${by}.`,
    cancelCredit: (amount: string) => `You have a credit of ${amount} with us. We will be in touch about refunding it or carrying it over to a new booking.`,
    cancelSettled: (fee: string) => `The cancellation fee of ${fee} has been settled.`,
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
} as const;

/** "Montag, 04.01.2027" · "Monday, 4 January 2027". */
function weekdayDate(iso: string, lang: LetterLanguage): string {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return `${MORE[lang].weekdays[day]}, ${formatLetterDate(iso, lang)}`;
}

const daysUntil = (from: string, to: string) => Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000);
const fullName = (p: LetterPerson) => [p.firstName, p.lastName].filter(Boolean).join(' ');
const totalLessons = (c: LetterCourse) => (c.lessonsPerWeek ? c.lessonsPerWeek * weeksBetween(c.startDate, c.endDate) : null);
const reference = (ctx: BookingLetterContext, lang: LetterLanguage): LetterPart => ({ type: 'text', slot: null, text: W[lang].reference(ctx.number, fullName(ctx.person)), strong: false });

/** A week from today, or the course start when it comes sooner. */
const deadline = (ctx: BookingLetterContext, today: string) => {
  if (ctx.exam) return examPayBy(ctx.exam, today);
  const week = addDays(today, 7);
  const start = ctx.course?.startDate;
  return start && start > today && start < week ? start : week;
};

/**
 * Whether a kind of letter can go out for this booking now, and why not — SchoolMan's refusals and
 * the ones it lacked: no letter for the embassy before the course is paid in full (AGB §5.3; SchoolMan
 * stated full payment whatever was paid), the show-up letter only between 40 and 9 days before the
 * start, the last call only after the first.
 */
export function bookingLetterBlock(kind: BookingLetterKind, ctx: BookingLetterContext, meta: LetterMeta): Record<LetterLanguage, string> | null {
  const block = (de: string, en: string) => ({ de, en });
  const money = (n: number) => formatMoney(n, 'de');
  const balance = Math.round((ctx.charged - ctx.paid) * 100) / 100;
  const cancelled = ctx.status === 'cancelled';
  const start = ctx.course?.startDate ?? null;
  // An exam booking writes an exam's letters, a course booking a course's (0037).
  if (!lettersFor(ctx).includes(kind)) {
    return ctx.exam ? block('Diesen Brief gibt es für eine Prüfungsbuchung nicht.', 'There is no such letter for an exam booking.') : block('Diesen Brief gibt es nur für eine Prüfungsbuchung.', 'This letter is for exam bookings only.');
  }
  if (kind === 'cancellation_confirmation') return cancelled ? null : block('Die Buchung ist nicht storniert.', 'The booking is not cancelled.');
  if (cancelled && kind !== 'payment_receipt' && kind !== 'payments_overview') return block('Die Buchung ist storniert.', 'The booking is cancelled.');
  switch (kind) {
    case 'payment_receipt':
      return ctx.payments.length ? null : block('Für diese Buchung ist noch keine Zahlung erfasst.', 'No payment is recorded on this booking yet.');
    case 'payment_reminder':
      return balance > 0.005 ? null : block('Auf dieser Buchung ist nichts offen.', 'Nothing is outstanding on this booking.');
    case 'visa_letter':
      if (!ctx.course) return block('Die Buchung hat keinen Kurs.', 'The booking has no course.');
      if (!ctx.person.birthDate) return block('Das Geburtsdatum fehlt: auf der Seite der Person eintragen.', 'The date of birth is missing: add it on the person’s page.');
      if (ctx.charged <= 0.005 || balance > 0.005)
        return block(
          `Erst nach vollständiger Zahlung (AGB §5.3): noch offen ${money(Math.max(balance, 0))}.`,
          `Only once paid in full (terms §5.3): ${formatMoney(Math.max(balance, 0), 'en')} still to pay.`
        );
      return null;
    case 'showup_first_call': {
      if (!start) return block('Die Buchung hat keinen Kursbeginn.', 'The booking has no course start.');
      const days = daysUntil(meta.today, start);
      if (days > 40)
        return block(`Zu früh: frühestens 40 Tage vor Kursbeginn, ab dem ${formatLetterDate(addDays(start, -40), 'de')}.`, `Too early: at the earliest 40 days before the start, from ${formatLetterDate(addDays(start, -40), 'en')}.`);
      if (days < 9) return block('Die Frist für eine Verschiebung ist vorbei: weniger als 9 Tage bis zum Kursbeginn.', 'The deadline for a postponement has passed: fewer than 9 days to the start.');
      return null;
    }
    case 'showup_last_call':
      return meta.sent?.some((l) => l.kind === 'showup_first_call')
        ? null
        : block('Erst die Nachfrage „Kursbeginn bestätigen“ schicken.', 'Send “Confirm the course start” first.');
    case 'course_start':
      if (!start) return block('Die Buchung hat keinen Kursbeginn.', 'The booking has no course start.');
      return start < meta.today ? block('Der Kurs hat schon begonnen.', 'The course has already begun.') : null;
    case 'enrolment_certificate':
      return ctx.course ? null : block('Die Buchung hat keinen Kurs.', 'The booking has no course.');
    case 'exam_invitation':
      return ctx.exam && ctx.exam.day < meta.today ? block('Die Prüfung ist schon vorbei.', 'The exam is already over.') : null;
    case 'exam_results':
      if (ctx.exam && ctx.exam.day >= meta.today) return block('Erst nach dem Prüfungstag.', 'Only after the exam day.');
      return ctx.exam?.result ? null : block('Erst wenn das Ergebnis eingetragen ist.', 'Only once the result is entered.');
    case 'exam_participation':
      if (!ctx.exam?.result) return block('Erst wenn das Ergebnis eingetragen ist.', 'Only once the result is entered.');
      return partsTaken(ctx.exam).length ? null : block('Die Person ist zur Prüfung nicht erschienen.', 'The candidate did not come to the exam.');
    default:
      return null;
  }
}

export function paymentReminderLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const m = MORE[lang];
  const balance = ctx.charged - ctx.paid;
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.course) body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: formatDateRange(ctx.course.startDate, ctx.course.endDate, lang) });
  if (ctx.exam) body.push(examHeading(ctx.exam, lang));
  body.push(text(choices, 'open', m.open(formatMoney(Math.max(balance, 0), lang), formatLetterDate(deadline(ctx, meta.today), lang)), true));
  body.push(text(choices, 'ways', standard.ways));
  body.push(reference(ctx, lang));
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame('payment_reminder', ctx.person, ctx.staff, choices, meta.today, { lead: m.reminder, title: m.bookingNo(ctx.number), tail: meta.version > 1 ? m.nth(meta.version) : null }, body);
}

export function paymentsOverviewLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const m = MORE[lang];
  const w = W[lang];
  const money = (n: number) => formatMoney(n, lang);
  const balance = Math.round((ctx.charged - ctx.paid) * 100) / 100;
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.course) body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: courseDetail(ctx.course, lang) });
  if (ctx.exam) body.push(examHeading(ctx.exam, lang));
  body.push({ type: 'table', heading: w.costs, rows: ctx.charges.map((c) => ({ text: c.description, amount: money(c.amount), ref: null })), total: { label: m.costsTotal, amount: money(ctx.charged) } });
  body.push({
    type: 'table',
    heading: m.payments,
    rows: ctx.payments.map((p) => ({ text: [formatLetterDate(p.date, lang), p.subject, w.method[p.method] ?? p.method].filter(Boolean).join(' · '), amount: money(p.amount), ref: null })),
    total: { label: m.paymentsTotal, amount: money(ctx.paid) },
  });
  body.push({ type: 'sum', label: balance > 0.005 ? m.balanceOpen : balance < -0.005 ? m.balanceCredit : m.balanceEven, amount: money(Math.abs(balance)) });
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame('payments_overview', ctx.person, ctx.staff, choices, meta.today, { lead: m.overview, title: fullName(ctx.person), tail: m.bookingNo(ctx.number) }, body);
}

export function visaLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const m = MORE[lang];
  const p = ctx.person;
  const who = [
    `${m.title[p.salutation]}${fullName(p)}`,
    p.birthDate ? m.born(formatLetterDate(p.birthDate, lang)) : null,
    p.nationality[lang] ? m.nationality(p.nationality[lang]!) : null,
    p.passportNumber ? m.passport(p.passportNumber) : null,
  ]
    .filter(Boolean)
    .join(', ');
  const body: LetterPart[] = [text(choices, 'enrolled', m.enrolled(who))];
  if (ctx.course) {
    body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: courseDetail(ctx.course, lang) });
    const total = totalLessons(ctx.course);
    if (ctx.course.lessonsPerWeek && total) body.push(text(choices, 'lessons', m.lessons(ctx.course.lessonsPerWeek, total)));
  }
  body.push(text(choices, 'programme', standard.programme));
  body.push(text(choices, 'contract', standard.contract));
  if (ctx.accommodation) {
    const range = ctx.accommodation.to ? formatDateRange(ctx.accommodation.from, ctx.accommodation.to, lang) : formatLetterDate(ctx.accommodation.from, lang);
    body.push({ type: 'text', slot: null, text: m.stay(ctx.accommodation.name[lang], range), strong: false });
  }
  body.push(text(choices, 'payment', m.paidInFull(formatMoney(ctx.paid, lang), Boolean(ctx.accommodation)), true));
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame('visa_letter', p, ctx.staff, choices, meta.today, { lead: m.visa, title: fullName(p), tail: m.bookingNo(ctx.number) }, body, {
    salutation: m.visaSalutation,
    signOff: m.formalSignOff,
  });
}

export function showupLetter(kind: 'showup_first_call' | 'showup_last_call', ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const m = MORE[lang];
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.course) body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: courseDetail(ctx.course, lang) });
  if (kind === 'showup_first_call') {
    // SchoolMan's deadline, 19 days before the start — never one already past.
    const start = ctx.course?.startDate ?? meta.today;
    const by = [addDays(start, -19), addDays(meta.today, 2)].sort().pop()!;
    body.push(text(choices, 'request', m.showupRequest(weekdayDate(by, lang)), true));
    body.push(text(choices, 'postpone', standard.postpone));
  } else {
    const first = meta.sent?.find((l) => l.kind === 'showup_first_call')?.date ?? null;
    body.push(text(choices, 'request', m.lastCallRequest(first ? formatLetterDate(first, lang) : null, weekdayDate(addDays(meta.today, 1), lang)), true));
  }
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame(kind, ctx.person, ctx.staff, choices, meta.today, { lead: kind === 'showup_first_call' ? m.showup : m.lastCall, title: m.bookingNo(ctx.number), tail: null }, body);
}

export function missingItemsLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const m = MORE[lang];
  const items = (choices.items ?? []).filter((i): i is MissingItem => (MISSING_ITEMS as readonly string[]).includes(i));
  const body: LetterPart[] = [
    text(choices, 'intro', standard.intro),
    { type: 'table', heading: null, rows: items.map((i) => ({ text: MISSING_ITEM_LABELS[i][lang], amount: null, ref: null })), total: null },
    text(choices, 'note', ''),
    text(choices, 'closing', standard.closing),
  ];
  return frame('missing_items', ctx.person, ctx.staff, choices, meta.today, { lead: m.missing, title: ctx.course ? courseTitle(ctx.course, lang) : '', tail: m.bookingNo(ctx.number) }, body);
}

export function courseStartLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const m = MORE[lang];
  const c = ctx.course;
  const time = c?.time ? (c.time.split('-')[0] ?? null) : null;
  const room = c?.room ? `${c.room.name}${c.room.floor !== null ? ` (${m.floor(c.room.floor)})` : ''}` : null;
  const body: LetterPart[] = [];
  if (c) {
    body.push(text(choices, 'start', m.startsOn(weekdayDate(c.startDate, lang), time, room)));
    body.push({ type: 'heading', text: courseTitle(c, lang), detail: courseDetail(c, lang) });
  }
  body.push(text(choices, 'practical', standard.practical));
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame('course_start', ctx.person, ctx.staff, choices, meta.today, { lead: m.courseStart, title: c ? courseTitle(c, lang) : '', tail: c ? formatLetterDate(c.startDate, lang) : null }, body);
}

export function enrolmentCertificateLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  void standard;
  const lang = choices.language;
  const m = MORE[lang];
  const p = ctx.person;
  const c = ctx.course;
  // "Frau Lucía Fernández, geboren am 14.03.1998," — the apposition closed by its comma.
  const who = `${m.title[p.salutation]}${fullName(p)}${p.birthDate ? `, ${m.born(formatLetterDate(p.birthDate, lang))},` : ''}`;
  const body: LetterPart[] = [];
  if (c) {
    // Enrolment only: SchoolMan also certified "regular attendance", which nothing here records.
    body.push(text(choices, 'certify', m.certify(who, m.fromTo(formatLetterDate(c.startDate, lang), formatLetterDate(c.endDate, lang)), [c.name[lang], c.level ? m.level(c.level) : null].filter(Boolean).join(', '))));
    const total = totalLessons(c);
    if (c.lessonsPerWeek && total) body.push(text(choices, 'lessons', m.certifyLessons(c.lessonsPerWeek, total)));
  }
  body.push(text(choices, 'note', ''));
  return frame('enrolment_certificate', p, ctx.staff, choices, meta.today, { lead: m.certificate, title: fullName(p), tail: null }, body, { salutation: '', signOff: '' });
}

export function cancellationLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const m = MORE[lang];
  const money = (n: number) => formatMoney(n, lang);
  const fee = ctx.charges.filter((c) => c.kind === 'cancellation').reduce((sum, c) => sum + c.amount, 0);
  const balance = Math.round((ctx.charged - ctx.paid) * 100) / 100;
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.course) body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: formatDateRange(ctx.course.startDate, ctx.course.endDate, lang) });
  if (ctx.exam) body.push(examHeading(ctx.exam, lang));
  // What is owed or owed back, from the booking's lines — SchoolMan wrote a fixed 100 € fee into the text.
  const money_ = [
    fee > 0.005 && balance > 0.005 ? m.cancelFee(money(fee)) : null,
    balance > 0.005 ? m.cancelPay(money(balance), formatLetterDate(addDays(meta.today, 7), lang)) : null,
    balance < -0.005 ? m.cancelCredit(money(-balance)) : null,
    fee > 0.005 && Math.abs(balance) <= 0.005 ? m.cancelSettled(money(fee)) : null,
  ]
    .filter(Boolean)
    .join(' ');
  if (money_) body.push(text(choices, 'money', money_, true));
  if (balance > 0.005) body.push(reference(ctx, lang));
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame('cancellation_confirmation', ctx.person, ctx.staff, choices, meta.today, { lead: m.cancellation, title: ctx.course ? courseTitle(ctx.course, lang) : (ctx.exam?.name ?? ''), tail: m.bookingNo(ctx.number) }, body);
}

// ------------------------------------------------------------- an exam's letters (0037)

const EX = {
  de: {
    confirmation: 'Bestätigung deiner Prüfungsanmeldung',
    invitation: 'Einladung zur Prüfung',
    results: 'Dein Prüfungsergebnis ist da',
    when: (day: string, from: string, to: string) => `${day} · ${from}–${to} Uhr`,
    place: 'Die Prüfung findet bei uns in der Schule statt: CASA, Am Dobben 14–16, 28203 Bremen.',
    pay: (amount: string, by: string) => `Damit dein Prüfungsplatz fest reserviert ist, überweise bitte ${amount} bis zum ${by}.`,
    paid: 'Die Prüfungsgebühr ist bezahlt. Dein Platz ist fest reserviert.',
    arrive: (day: string, name: string, at: string) => `am ${day} ist deine Prüfung ${name}. Bitte sei um ${at} Uhr bei uns in der Schule, Am Dobben 14–16 in Bremen.`,
    ready: (name: string, day: string) => `das Ergebnis deiner Prüfung ${name} vom ${day} ist da.`,
    participation: 'Teilnahmebestätigung',
    took: (who: string, day: string, exam: string, parts: string) =>
      `Hiermit bestätigen wir, dass ${who} am ${day} bei CASA – Internationale Sprachschule Bremen an der Prüfung ${exam} teilgenommen hat${parts}.`,
    partsTaken: { both: ' (schriftlicher und mündlicher Teil)', written: ' (schriftlicher Teil)', oral: ' (mündlicher Teil)' },
  },
  en: {
    confirmation: 'Confirmation of your exam registration',
    invitation: 'Invitation to the exam',
    results: 'Your exam result has arrived',
    when: (day: string, from: string, to: string) => `${day} · ${from}–${to}`,
    place: 'The exam takes place at our school: CASA, Am Dobben 14–16, 28203 Bremen.',
    pay: (amount: string, by: string) => `To reserve your exam place for good, please transfer ${amount} by ${by}.`,
    paid: 'The exam fee has been paid. Your place is reserved.',
    arrive: (day: string, name: string, at: string) => `Your exam ${name} is on ${day}. Please be at our school, Am Dobben 14–16 in Bremen, at ${at}.`,
    ready: (name: string, day: string) => `The result of your exam ${name} on ${day} has arrived.`,
    participation: 'Confirmation of participation',
    took: (who: string, day: string, exam: string, parts: string) =>
      `This is to confirm that ${who} took part in the exam ${exam} at CASA – Internationale Sprachschule Bremen on ${day}${parts}.`,
    partsTaken: { both: ' (written and oral part)', written: ' (written part)', oral: ' (oral part)' },
  },
} as const;

const PART_WORDS: Record<LetterLanguage, Record<ExamParts, string>> = {
  de: { full: '', written: 'nur schriftlicher Teil', oral: 'nur mündlicher Teil' },
  en: { full: '', written: 'written part only', oral: 'oral part only' },
};

/** "telc Deutsch B2 · nur schriftlicher Teil": the exam, and the part when it is one. */
const examTitle = (exam: LetterExam, lang: LetterLanguage) => [exam.name, PART_WORDS[lang][exam.parts]].filter(Boolean).join(' · ');

/** The exam as a heading: its name and parts, the day and the hours. */
const examHeading = (exam: LetterExam, lang: LetterLanguage): LetterPart => ({
  type: 'heading',
  text: examTitle(exam, lang),
  detail: EX[lang].when(weekdayDate(exam.day, lang), exam.startTime, exam.endTime),
});

/** A quarter of an hour before the start: the check of everyone's details (SchoolMan: 08:15 for 08:30). */
const arrival = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const minutes = h * 60 + m - 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/** By when the fee is due: a week from today, but before telc's deadline and the day before the exam. */
function examPayBy(exam: LetterExam, today: string): string {
  const candidates = [addDays(today, 7), addDays(exam.day, -1)];
  if (exam.deadline && exam.deadline >= today) candidates.push(exam.deadline);
  return candidates.sort()[0] < today ? today : candidates.sort()[0];
}

export function examConfirmationLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const e = EX[lang];
  const w = W[lang];
  const money = (n: number) => formatMoney(n, lang);
  const balance = Math.round((ctx.charged - ctx.paid) * 100) / 100;
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.exam) body.push(examHeading(ctx.exam, lang));
  body.push(text(choices, 'place', e.place));
  body.push({ type: 'table', heading: w.costs, rows: ctx.charges.map((c) => ({ text: c.description, amount: money(c.amount), ref: null })), total: { label: w.total, amount: money(ctx.charged) } });
  if (ctx.paid > 0.005) {
    body.push({ type: 'sum', label: w.received, amount: money(ctx.paid) });
    body.push({ type: 'sum', label: balance < -0.005 ? w.credit : w.open, amount: money(Math.abs(balance)) });
  }
  const payment = balance > 0.005 && ctx.exam ? e.pay(money(balance), formatLetterDate(examPayBy(ctx.exam, meta.today), lang)) : ctx.charged > 0.005 ? e.paid : '';
  body.push(text(choices, 'payment', payment, true));
  if (balance > 0.005) body.push(reference(ctx, lang));
  body.push(text(choices, 'id', standard.id));
  body.push(text(choices, 'rules', standard.rules));
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame('exam_confirmation', ctx.person, ctx.staff, choices, meta.today, { lead: e.confirmation, title: ctx.exam?.name ?? '', tail: meta.version > 1 ? w.version(meta.version) : MORE[lang].bookingNo(ctx.number) }, body);
}

export function examInvitationLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const e = EX[lang];
  const exam = ctx.exam;
  const body: LetterPart[] = [];
  if (exam) {
    body.push(text(choices, 'arrive', e.arrive(weekdayDate(exam.day, lang), exam.name, arrival(exam.startTime))));
    body.push(examHeading(exam, lang));
  }
  body.push(text(choices, 'bring', standard.bring));
  // Only the oral part: its own time. One part of the two: the earlier result goes with it.
  if (exam?.parts === 'oral') body.push(text(choices, 'oral', standard.oral, true));
  if (exam && exam.parts !== 'full') body.push(text(choices, 'part', standard.part));
  body.push(text(choices, 'rules', standard.rules));
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame('exam_invitation', ctx.person, ctx.staff, choices, meta.today, { lead: e.invitation, title: exam?.name ?? '', tail: exam ? formatLetterDate(exam.day, lang) : null }, body);
}

export function examResultsLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const e = EX[lang];
  const exam = ctx.exam;
  const body: LetterPart[] = [];
  if (exam) body.push(text(choices, 'ready', e.ready(exam.name, formatLetterDate(exam.day, lang))));
  body.push(text(choices, 'collect', standard.collect, true));
  body.push(text(choices, 'proxy', standard.proxy));
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame('exam_results', ctx.person, ctx.staff, choices, meta.today, { lead: e.results, title: exam?.name ?? '', tail: null }, body);
}

/** The parts a candidate came to: those sat whose outcome is not "did not come". */
const partsTaken = (exam: LetterExam): ('written' | 'oral')[] => (exam.result ? partsSat(exam.parts).filter((p) => exam.result![p] && exam.result![p] !== 'absent') : []);

/**
 * SchoolMan's `Confirmation.ParticiptionExam_Booking`, which certified participation nothing
 * recorded: here only once the result is entered, and only for the parts the candidate came to.
 * Third person, no salutation, like the confirmation of enrolment.
 */
export function examParticipationLetter(ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  void standard;
  const lang = choices.language;
  const e = EX[lang];
  const m = MORE[lang];
  const p = ctx.person;
  const exam = ctx.exam;
  const who = `${m.title[p.salutation]}${fullName(p)}${p.birthDate ? `, ${m.born(formatLetterDate(p.birthDate, lang))},` : ''}`;
  const body: LetterPart[] = [];
  if (exam) {
    const taken = partsTaken(exam);
    const parts = taken.length === 2 ? e.partsTaken.both : taken.length === 1 ? e.partsTaken[taken[0]] : '';
    body.push(text(choices, 'certify', e.took(who, formatLetterDate(exam.day, lang), exam.name, parts)));
  }
  body.push(text(choices, 'note', ''));
  return frame('exam_participation', p, ctx.staff, choices, meta.today, { lead: e.participation, title: fullName(p), tail: null }, body, { salutation: '', signOff: '' });
}

/** A booking letter's short name in the address (`?kind=reminder`). */
export const BOOKING_LETTER_KEYS: Record<BookingLetterKind, string> = {
  booking_confirmation: 'confirmation',
  payment_receipt: 'receipt',
  payment_reminder: 'reminder',
  payments_overview: 'overview',
  visa_letter: 'visa',
  showup_first_call: 'showup',
  showup_last_call: 'lastcall',
  missing_items: 'missing',
  course_start: 'start',
  enrolment_certificate: 'certificate',
  cancellation_confirmation: 'cancellation',
  exam_confirmation: 'exam',
  exam_invitation: 'invitation',
  exam_results: 'results',
  exam_participation: 'participation',
};

/** The booking letters in groups, as the letter page lists them. */
export const BOOKING_LETTER_GROUPS: { label: Record<LetterLanguage, string>; kinds: BookingLetterKind[] }[] = [
  { label: { de: 'Anmeldung', en: 'Registration' }, kinds: ['booking_confirmation', 'missing_items', 'visa_letter', 'enrolment_certificate'] },
  { label: { de: 'Zahlung', en: 'Payment' }, kinds: ['payment_receipt', 'payment_reminder', 'payments_overview'] },
  { label: { de: 'Vor dem Kurs', en: 'Before the course' }, kinds: ['showup_first_call', 'showup_last_call', 'course_start'] },
  { label: { de: 'Stornierung', en: 'Cancellation' }, kinds: ['cancellation_confirmation'] },
];

/** An exam booking's letters (0037): its confirmation, the money, the day and the result, a cancellation. */
export const EXAM_LETTER_GROUPS: { label: Record<LetterLanguage, string>; kinds: BookingLetterKind[] }[] = [
  { label: { de: 'Anmeldung', en: 'Registration' }, kinds: ['exam_confirmation'] },
  { label: { de: 'Zahlung', en: 'Payment' }, kinds: ['payment_receipt', 'payment_reminder', 'payments_overview'] },
  { label: { de: 'Prüfung', en: 'The exam' }, kinds: ['exam_invitation', 'exam_results', 'exam_participation'] },
  { label: { de: 'Stornierung', en: 'Cancellation' }, kinds: ['cancellation_confirmation'] },
];

/** The kinds a booking writes: an exam's, or a course's. */
export const lettersFor = (ctx: Pick<BookingLetterContext, 'exam'>) => (ctx.exam ? EXAM_LETTER_GROUPS : BOOKING_LETTER_GROUPS).flatMap((g) => g.kinds);

/** Every booking letter by its kind: what the composer previews and the server keeps. */
export function buildBookingLetter(kind: BookingLetterKind, ctx: BookingLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  switch (kind) {
    case 'booking_confirmation':
      return bookingConfirmationLetter(ctx, choices, standard, meta);
    case 'payment_receipt':
      return paymentReceiptLetter(ctx, choices, standard, meta);
    case 'payment_reminder':
      return paymentReminderLetter(ctx, choices, standard, meta);
    case 'payments_overview':
      return paymentsOverviewLetter(ctx, choices, standard, meta);
    case 'visa_letter':
      return visaLetter(ctx, choices, standard, meta);
    case 'showup_first_call':
    case 'showup_last_call':
      return showupLetter(kind, ctx, choices, standard, meta);
    case 'missing_items':
      return missingItemsLetter(ctx, choices, standard, meta);
    case 'course_start':
      return courseStartLetter(ctx, choices, standard, meta);
    case 'enrolment_certificate':
      return enrolmentCertificateLetter(ctx, choices, standard, meta);
    case 'cancellation_confirmation':
      return cancellationLetter(ctx, choices, standard, meta);
    case 'exam_confirmation':
      return examConfirmationLetter(ctx, choices, standard, meta);
    case 'exam_invitation':
      return examInvitationLetter(ctx, choices, standard, meta);
    case 'exam_results':
      return examResultsLetter(ctx, choices, standard, meta);
    case 'exam_participation':
      return examParticipationLetter(ctx, choices, standard, meta);
  }
}

// ------------------------------------- several bookings, and a registration (0035)

const MULTI = {
  de: {
    lead: 'Bestätigung deiner Buchungen',
    bookingNo: (n: string) => `Buchung Nr. ${n}`,
    subtotal: 'Zwischensumme',
    total: 'Gesamt',
    pay: (amount: string, by: string) => `Bitte überweise den offenen Betrag von ${amount} bis zum ${by}.`,
    visa: (amount: string, by: string) =>
      `Für die verbindliche Reservierung deiner Kursplätze und deinen Visumantrag überweise bitte den Gesamtbetrag von ${amount} bis zum ${by}. Sobald deine Zahlung da ist, schicken wir dir eine eigene Bestätigung für die Botschaft.`,
    reference: (numbers: string, who: string) => `Verwendungszweck: ${numbers}, ${who}. Unsere Bankverbindung steht unten auf diesem Brief.`,
    registration: 'Deine Anmeldung',
    testLead: 'Deine Anmeldung: bitte schick uns dein Testergebnis',
    depositLead: 'Deine Anmeldung: Anzahlung',
    level: (l: string) => `angegebenes Niveau ${l}`,
    test: (url: string) => `Damit wir deine Anmeldung abschließen können, brauchen wir noch das Ergebnis deines Einstufungstests. Die Tests findest du hier: ${url}`,
    deposit: (amount: string) => `Bitte überweise eine erste Anzahlung von ${amount} für deinen Kurs. Sobald sie bei uns ist, bearbeiten wir deine Anmeldung weiter.`,
  },
  en: {
    lead: 'Confirmation of your bookings',
    bookingNo: (n: string) => `booking no. ${n}`,
    subtotal: 'Subtotal',
    total: 'Total',
    pay: (amount: string, by: string) => `Please transfer the outstanding ${amount} by ${by}.`,
    visa: (amount: string, by: string) =>
      `To reserve your places and for your visa application, please transfer the total of ${amount} by ${by}. As soon as your payment arrives, we will send you a separate confirmation for the embassy.`,
    reference: (numbers: string, who: string) => `Payment reference: ${numbers}, ${who}. Our bank details are at the foot of this letter.`,
    registration: 'Your registration',
    testLead: 'Your registration: please send us your test result',
    depositLead: 'Your registration: down payment',
    level: (l: string) => `level given: ${l}`,
    test: (url: string) => `So that we can complete your registration, we still need the result of your placement test. You can find the tests here: ${url}`,
    deposit: (amount: string) => `Please transfer a first down payment of ${amount} for your course. As soon as it has arrived, we will continue with your registration.`,
  },
} as const;

/** The confirmation of several bookings: only bookings chosen, none cancelled. */
export function learnerLetterBlock(ctx: LearnerLetterContext, choices: Pick<LetterChoices, 'bookingIds'>): Record<LetterLanguage, string> | null {
  const chosen = ctx.bookings.filter((b) => choices.bookingIds?.includes(b.id));
  if (chosen.length === 0) return { de: 'Bitte wähle die Buchungen, die der Brief bestätigt.', en: 'Choose the bookings the letter confirms.' };
  if (chosen.some((b) => b.status === 'cancelled')) return { de: 'Eine gewählte Buchung ist storniert.', en: 'A chosen booking is cancelled.' };
  return null;
}

/**
 * SchoolMan's `ConfirmationStudentIndividual` (915 in 2026): the bookings a colleague chooses — a
 * course, an exam, a stay — each with its costs and subtotal, then the total, what came in, what is
 * open and by when. SchoolMan's left the amount blank in one branch and never printed the payments.
 */
export function learnerConfirmationLetter(ctx: LearnerLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const m = MULTI[lang];
  const w = W[lang];
  const money = (n: number) => formatMoney(n, lang);
  // In the order the learner will take them, whatever order the list was in.
  const chosen = ctx.bookings
    .filter((b) => choices.bookingIds?.includes(b.id))
    .sort((a, b) => (a.course?.startDate ?? a.exam?.day ?? '').localeCompare(b.course?.startDate ?? b.exam?.day ?? ''));
  const charged = chosen.reduce((sum, b) => sum + b.charged, 0);
  const paid = chosen.reduce((sum, b) => sum + b.paid, 0);
  const balance = Math.round((charged - paid) * 100) / 100;
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  for (const b of chosen) {
    body.push({
      type: 'heading',
      text: `${b.course ? courseTitle(b.course, lang) : b.exam ? examTitle(b.exam, lang) : w.costs} · ${m.bookingNo(b.number)}`,
      detail: b.course ? courseDetail(b.course, lang) : b.exam ? EX[lang].when(weekdayDate(b.exam.day, lang), b.exam.startTime, b.exam.endTime) : null,
    });
    if (b.accommodation) {
      body.push({
        type: 'heading',
        text: `${w.stay}: ${b.accommodation.name[lang]}`,
        detail: b.accommodation.to ? formatDateRange(b.accommodation.from, b.accommodation.to, lang) : formatLetterDate(b.accommodation.from, lang),
      });
    }
    body.push({ type: 'table', heading: null, rows: b.charges.map((c) => ({ text: c.description, amount: money(c.amount), ref: null })), total: { label: m.subtotal, amount: money(b.charged) } });
  }
  body.push({ type: 'sum', label: m.total, amount: money(charged) });
  if (paid > 0.005) {
    body.push({ type: 'sum', label: w.received, amount: money(paid) });
    body.push({ type: 'sum', label: balance < -0.005 ? w.credit : w.open, amount: money(Math.abs(balance)) });
  }
  // A week from today, or the first start when it comes sooner; the whole amount for a visa.
  // An exam's fee is due before its day, like a course's before its start.
  const starts = chosen.map((b) => b.course?.startDate ?? (b.exam ? addDays(b.exam.day, -1) : undefined)).filter((d): d is string => Boolean(d) && d! > meta.today).sort();
  const week = addDays(meta.today, 7);
  const by = formatLetterDate(starts[0] && starts[0] < week ? starts[0] : week, lang);
  const payment = balance > 0.005 ? (chosen.some((b) => b.visaRequired) ? m.visa(money(balance), by) : m.pay(money(balance), by)) : charged > 0 ? w.allPaid : '';
  body.push(text(choices, 'payment', payment, true));
  if (balance > 0.005) {
    body.push({ type: 'text', slot: null, text: m.reference(chosen.map((b) => b.number).join(', '), fullName(ctx.person)), strong: false });
  }
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  body.push(text(choices, 'ps', standard.ps));
  return frame('learner_confirmation', ctx.person, ctx.staff, choices, meta.today, { lead: m.lead, title: fullName(ctx.person), tail: meta.version > 1 ? w.version(meta.version) : null }, body);
}

/**
 * SchoolMan's `NewLetter.SendTest` and `NewLetterDownPayment`: a registration from the website,
 * answered before there is a booking — please send the placement-test result, or the down payment.
 */
export function registrationLetter(kind: RegistrationLetterKind, ctx: RegistrationLetterContext, choices: LetterChoices, standard: Record<string, string>, meta: LetterMeta): Letter {
  const lang = choices.language;
  const m = MULTI[lang];
  const body: LetterPart[] = [
    text(choices, 'intro', standard.intro),
    {
      type: 'heading',
      text: ctx.course ? courseTitle({ ...ctx.course, level: ctx.course.level ?? null }, lang) : ctx.courseLabel,
      detail: [ctx.course ? courseDetail(ctx.course, lang) : null, ctx.declaredLevel ? m.level(ctx.declaredLevel) : null].filter(Boolean).join(' · ') || null,
    },
  ];
  if (kind === 'registration_test_request') {
    body.push(text(choices, 'test', m.test(ctx.placementUrl[lang]), true));
  } else {
    body.push(text(choices, 'deposit', m.deposit(formatMoney(ctx.downPayment, lang)), true));
    body.push(text(choices, 'reference', standard.reference));
    if (ctx.visaRequired) body.push(text(choices, 'visa', standard.visa));
  }
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame(
    kind,
    ctx.person,
    ctx.staff,
    choices,
    meta.today,
    { lead: kind === 'registration_test_request' ? m.testLead : m.depositLead, title: ctx.course ? courseTitle(ctx.course, lang) : ctx.courseLabel, tail: null },
    body
  );
}

// ------------------------------------------------------- the waiting list

export function waitlistLetter(
  kind: WaitlistLetterKind,
  ctx: WaitlistLetterContext,
  choices: LetterChoices,
  standard: Record<string, string>,
  meta: { today: string; version: number }
): Letter {
  const lang = choices.language;
  const w = W[lang];
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.course) body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: courseDetail(ctx.course, lang) });
  if (ctx.exam) body.push(examHeading(ctx.exam, lang));
  if (kind === 'waitlist_confirmation' && ctx.position) body.push(text(choices, 'position', w.position(ctx.position)));
  if (kind === 'waitlist_no_place') {
    const next = ctx.nextStart
      ? ctx.exam
        ? w.nextSitting(ctx.exam.name, formatLetterDate(ctx.nextStart, lang))
        : w.next(ctx.course?.name[lang] ?? '', formatLetterDate(ctx.nextStart, lang))
      : ctx.exam
        ? w.noNextSitting
        : w.noNext;
    body.push(text(choices, 'next', next));
  }
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame(
    kind,
    ctx.person,
    ctx.staff,
    choices,
    meta.today,
    {
      lead: kind === 'waitlist_place_free' ? w.placeFree : w.waitlist,
      title: ctx.course ? courseTitle(ctx.course, lang) : (ctx.exam?.name ?? ''),
      tail: meta.version > 1 ? w.version(meta.version) : ctx.course ? formatDateRange(ctx.course.startDate, ctx.course.endDate, lang) : ctx.exam ? formatLetterDate(ctx.exam.day, lang) : null,
    },
    body
  );
}

// ------------------------------------------------------------ in words

const DE_ONES = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const DE_TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function deUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h ? `${DE_ONES[h]}hundert` : '';
  if (r === 0) return head;
  if (r < 20) return head + (r === 1 ? 'eins' : DE_ONES[r]);
  const one = r % 10;
  return head + (one ? `${DE_ONES[one]}und` : '') + DE_TENS[Math.floor(r / 10)];
}

function enUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${EN_ONES[h]} hundred`);
  if (r) {
    const tail = r < 20 ? EN_ONES[r] : `${EN_TENS[Math.floor(r / 10)]}${r % 10 ? `-${EN_ONES[r % 10]}` : ''}`;
    parts.push(h ? `and ${tail}` : tail);
  }
  return parts.join(' ');
}

/** A sum in words, as a receipt writes it: "eintausendzweihundert Euro", "one thousand two hundred euros and 50 cents". */
export function amountInWords(amount: number, lang: LetterLanguage): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (lang === 'de') {
    const thousands = Math.floor(euros / 1000);
    const below = euros % 1000;
    const head = thousands ? `${thousands === 1 ? 'ein' : deUnder1000(thousands)}tausend` : '';
    // "ein Euro", "einundzwanzig Euro", "eintausendeins Euro": one alone before the noun is "ein".
    const words = euros === 0 ? 'null' : head + (below ? (below === 1 && !thousands ? 'ein' : deUnder1000(below)) : '');
    return `${words} Euro${rest ? ` und ${deUnder1000(rest) || 'null'} Cent` : ''}`;
  }
  const thousands = Math.floor(euros / 1000);
  const below = euros % 1000;
  const words =
    euros === 0
      ? 'zero'
      : [thousands ? `${enUnder1000(thousands)} thousand` : '', below ? (thousands && below < 100 ? `and ${enUnder1000(below)}` : enUnder1000(below)) : '']
          .filter(Boolean)
          .join(' ');
  return `${words} ${euros === 1 ? 'euro' : 'euros'}${rest ? ` and ${enUnder1000(rest)} ${rest === 1 ? 'cent' : 'cents'}` : ''}`;
}
