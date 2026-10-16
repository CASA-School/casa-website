/**
 * A letter, as data (docs/LETTERS.md).
 *
 * Every letter the workspace writes — an offer today; an enrolment
 * confirmation, a visa invitation, a certificate of attendance next — is this
 * shape: CASA's letterhead, a recipient, a subject, a salutation, a body of
 * parts, a signature. A kind of letter is a function from its record to a
 * `Letter`; one sheet renders them all, on screen, on paper and as the copy
 * kept in `letters` when it is sent.
 *
 * Shapes and pure helpers only, so a client component can import them.
 */

/** Bump when the shape changes, and teach `readLetter` the old one. */
export const LETTER_SCHEMA = 1;

/** A booking's letters (0032, 0034), in the order the letter page offers them. */
export const BOOKING_LETTER_KINDS = [
  'booking_confirmation',
  'payment_receipt',
  'payment_reminder',
  'payments_overview',
  'visa_letter',
  'showup_first_call',
  'showup_last_call',
  'missing_items',
  'course_start',
  'enrolment_certificate',
  'cancellation_confirmation',
] as const;

/** A website registration's letters, before there is a booking (0035). */
export const REGISTRATION_LETTER_KINDS = ['registration_test_request', 'registration_deposit_request'] as const;
export type RegistrationLetterKind = (typeof REGISTRATION_LETTER_KINDS)[number];

export const LETTER_KINDS = [
  'offer',
  ...BOOKING_LETTER_KINDS,
  'waitlist_confirmation',
  'waitlist_place_free',
  'waitlist_no_place',
  /** Several bookings of one learner in one letter (0035). */
  'learner_confirmation',
  ...REGISTRATION_LETTER_KINDS,
] as const;
export type LetterKind = (typeof LETTER_KINDS)[number];

export type BookingLetterKind = (typeof BOOKING_LETTER_KINDS)[number];
export const WAITLIST_LETTER_KINDS = ['waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place'] as const;
export type WaitlistLetterKind = (typeof WAITLIST_LETTER_KINDS)[number];

export type LetterLanguage = 'de' | 'en';

/**
 * A row of a table. `ref` names what the row was built from (an offer line's
 * `participant:course`), so the letter view can change its text in place.
 */
export type LetterRow = { text: string; amount: string | null; ref: string | null };

/**
 * The body, in order. A `text` with a `slot` is one the letter view can edit
 * where it stands (the opening, a note, the closing); an empty one prints
 * nothing and is there so the view has a place to add it.
 */
export type LetterPart =
  | { type: 'text'; slot: string | null; text: string; strong: boolean }
  | { type: 'heading'; text: string; detail: string | null }
  | { type: 'table'; heading: string | null; rows: LetterRow[]; total: { label: string; amount: string | null } | null }
  | { type: 'sum'; label: string; amount: string };

export type Letter = {
  schema: typeof LETTER_SCHEMA;
  kind: LetterKind;
  language: LetterLanguage;
  returnAddress: string;
  recipient: string[];
  placeDate: string;
  /** "Angebot Nr. 2026-014 · Deutschkurs in Bremen · 2. Fassung": the title is editable on the letter. */
  subject: { lead: string; title: string; tail: string | null };
  salutation: string;
  body: LetterPart[];
  signOff: string;
  signature: string[];
  footer: string[];
};

export function subjectLine(letter: Pick<Letter, 'subject'>): string {
  const { lead, title, tail } = letter.subject;
  return [lead, title, tail].filter(Boolean).join(' · ');
}

/** A text part of the body by its slot. */
export function textPart(letter: Letter, slot: string): string | null {
  const part = letter.body.find((p) => p.type === 'text' && p.slot === slot);
  return part && part.type === 'text' ? part.text : null;
}
