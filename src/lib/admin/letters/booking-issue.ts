import 'server-only';

import { logActivity } from '../activity';
import type { StaffUser } from '../auth';
import { withTransaction } from '../db';
import type { Bilingual } from '../i18n';

import { bookingLetterContext, learnerLetterContext, registrationLetterContext, waitlistLetterContext } from './booking-context';
import {
  bookingLetterBlock,
  buildBookingLetter,
  learnerConfirmationLetter,
  learnerLetterBlock,
  LETTER_STANDARD_DEFAULTS,
  registrationLetter,
  waitlistLetter,
  type LetterChoices,
} from './booking-letters';
import { issueLetter, lettersForBooking, nextLetterVersion, standardTexts } from './repo';
import { subjectLine, type BookingLetterKind, type RegistrationLetterKind, type WaitlistLetterKind } from './types';
import { setQueueStatus } from '../queues';

/**
 * Sending a booking's or a waiting-list entry's letter (docs/LETTERS.md). The letter is built again
 * on the server from its record and the colleague's choices — never taken from the browser — and
 * kept as it went out, in the transaction that does what the letter says: a "place is free" letter
 * holds the place for the learner, a "no place this time" letter takes them off the list. SchoolMan
 * wrote these letters and changed nothing, so its lists never knew what had been sent.
 */

type Result = { ok: true; letterId: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function issueBookingLetter(bookingId: string, kind: BookingLetterKind, choices: LetterChoices, actor: StaffUser): Promise<Result> {
  const ctx = await bookingLetterContext(bookingId);
  if (!ctx) return refuse('Die Buchung gibt es nicht mehr.', 'The booking no longer exists.');
  const sent = (await lettersForBooking(bookingId)).map((l) => ({ kind: l.kind, date: isoDay(l.sentAt) }));
  // The same rules the letter page shows, checked again: a form can be sent without the page.
  const blocked = bookingLetterBlock(kind, ctx, { today: todayIso(), version: 1, sent });
  if (blocked) return { ok: false, reason: blocked };
  if (kind === 'missing_items' && !choices.items?.length) return refuse('Bitte wähle mindestens eine Angabe.', 'Choose at least one detail.');
  const standard = (await standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]))[choices.language];
  const result = await withTransaction(async (client) => {
    const version = await nextLetterVersion(client, kind, { bookingId });
    const letter = buildBookingLetter(kind, ctx, choices, standard, { today: todayIso(), version, sent });
    const id = await issueLetter(
      client,
      {
        letter,
        about: { bookingId },
        version,
        organisationId: null,
        personId: ctx.person.id,
        recipientName: [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' '),
        email: ctx.person.email,
        source: { choices, charged: ctx.charged, paid: ctx.paid },
      },
      actor
    );
    return { id, subject: subjectLine(letter) };
  });
  await logActivity({ actor, entity: 'booking', entityId: bookingId, action: 'letter_sent', detail: { kind, letter: result.id, subject: result.subject } });
  await logActivity({ actor, entity: 'person', entityId: ctx.person.id, action: 'letter_sent', detail: { kind, letter: result.id, subject: result.subject } });
  return { ok: true, letterId: result.id };
}

export async function issueWaitlistLetter(entryId: string, kind: WaitlistLetterKind, choices: LetterChoices, actor: StaffUser): Promise<Result> {
  const ctx = await waitlistLetterContext(entryId);
  if (!ctx) return refuse('Den Eintrag gibt es nicht mehr.', 'The entry no longer exists.');
  const open = ctx.status === 'waiting' || ctx.status === 'offered';
  if (!open && kind !== 'waitlist_confirmation') return refuse('Der Eintrag ist schon abgeschlossen.', 'The entry is already closed.');
  const standard = (await standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]))[choices.language];
  const result = await withTransaction(async (client) => {
    const version = await nextLetterVersion(client, kind, { waitlistEntryId: entryId });
    const letter = waitlistLetter(kind, ctx, choices, standard, { today: todayIso(), version });
    const id = await issueLetter(
      client,
      {
        letter,
        about: { waitlistEntryId: entryId },
        version,
        organisationId: null,
        personId: ctx.person.id,
        recipientName: [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' '),
        email: ctx.person.email,
        source: { choices, position: ctx.position, status: ctx.status },
      },
      actor
    );
    // What the letter says, the list does.
    if (kind === 'waitlist_place_free' && ctx.status === 'waiting') {
      await client.query(`UPDATE waitlist_entries SET status = 'offered', offered_at = now(), offered_by = $2 WHERE id = $1 AND status = 'waiting'`, [entryId, actor.id]);
    }
    if (kind === 'waitlist_no_place') {
      await client.query(
        `UPDATE waitlist_entries SET status = 'withdrawn', closed_at = now(), closed_by = $2, close_reason = 'no_place'
          WHERE id = $1 AND status IN ('waiting', 'offered')`,
        [entryId, actor.id]
      );
    }
    return { id, subject: subjectLine(letter) };
  });
  await logActivity({ actor, entity: 'person', entityId: ctx.person.id, action: 'letter_sent', detail: { kind, letter: result.id, subject: result.subject } });
  return { ok: true, letterId: result.id };
}

/** The confirmation of several of a learner's bookings, about the learner; the bookings it covers are in its source. */
export async function issueLearnerLetter(personId: string, choices: LetterChoices, actor: StaffUser): Promise<Result> {
  const ctx = await learnerLetterContext(personId);
  if (!ctx) return refuse('Die Person gibt es nicht mehr.', 'The person no longer exists.');
  const blocked = learnerLetterBlock(ctx, choices);
  if (blocked) return { ok: false, reason: blocked };
  const standard = (await standardTexts('learner_confirmation', LETTER_STANDARD_DEFAULTS.learner_confirmation))[choices.language];
  const result = await withTransaction(async (client) => {
    const version = await nextLetterVersion(client, 'learner_confirmation', { personId: ctx.personId });
    const letter = learnerConfirmationLetter(ctx, choices, standard, { today: todayIso(), version });
    const id = await issueLetter(
      client,
      {
        letter,
        about: { personId: ctx.personId },
        version,
        organisationId: null,
        personId: ctx.personId,
        recipientName: [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' '),
        email: ctx.person.email,
        source: { choices, bookings: choices.bookingIds },
      },
      actor
    );
    return { id, subject: subjectLine(letter) };
  });
  await logActivity({ actor, entity: 'person', entityId: ctx.personId, action: 'letter_sent', detail: { kind: 'learner_confirmation', letter: result.id, subject: result.subject } });
  for (const bookingId of choices.bookingIds ?? []) {
    await logActivity({ actor, entity: 'booking', entityId: bookingId, action: 'letter_sent', detail: { kind: 'learner_confirmation', letter: result.id, subject: result.subject } });
  }
  return { ok: true, letterId: result.id };
}

/**
 * A website registration's letter. What it asks for — the test result, the down payment — is now
 * the learner's to answer: a registration still new or in progress waits for the reply.
 */
export async function issueRegistrationLetter(registrationId: string, kind: RegistrationLetterKind, choices: LetterChoices, actor: StaffUser): Promise<Result> {
  const ctx = await registrationLetterContext(registrationId);
  if (!ctx) return refuse('Die Anmeldung gibt es nicht mehr.', 'The registration no longer exists.');
  const standard = (await standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]))[choices.language];
  const result = await withTransaction(async (client) => {
    const version = await nextLetterVersion(client, kind, { registrationId });
    const letter = registrationLetter(kind, ctx, choices, standard, { today: todayIso(), version });
    const id = await issueLetter(
      client,
      {
        letter,
        about: { registrationId },
        version,
        organisationId: null,
        personId: ctx.personId,
        recipientName: [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' '),
        email: ctx.person.email,
        source: { choices },
      },
      actor
    );
    const status = await client.query<{ status: string }>(`SELECT status::text AS status FROM course_registrations WHERE id = $1`, [registrationId]);
    return { id, subject: subjectLine(letter), status: status.rows[0]?.status ?? null };
  });
  await logActivity({ actor, entity: 'course_registration', entityId: registrationId, action: 'letter_sent', detail: { kind, letter: result.id, subject: result.subject } });
  if (ctx.personId) await logActivity({ actor, entity: 'person', entityId: ctx.personId, action: 'letter_sent', detail: { kind, letter: result.id, subject: result.subject } });
  if (result.status === 'new' || result.status === 'in_progress') {
    await setQueueStatus({ entity: 'course_registration', id: registrationId, status: 'waiting', actor });
  }
  return { ok: true, letterId: result.id };
}
