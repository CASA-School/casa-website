import 'server-only';

import { logActivity } from '../activity';
import type { StaffUser } from '../auth';
import { withTransaction } from '../db';
import type { Bilingual } from '../i18n';

import { bookingLetterContext, waitlistLetterContext } from './booking-context';
import {
  bookingConfirmationLetter,
  LETTER_STANDARD_DEFAULTS,
  paymentReceiptLetter,
  waitlistLetter,
  type LetterChoices,
} from './booking-letters';
import { issueLetter, nextLetterVersion, standardTexts } from './repo';
import { subjectLine, type BookingLetterKind, type WaitlistLetterKind } from './types';

/**
 * Sending a booking's or a waiting-list entry's letter (docs/LETTERS.md). The letter is built again
 * on the server from its record and the colleague's choices — never taken from the browser — and
 * kept as it went out, in the transaction that does what the letter says: a "place is free" letter
 * holds the place for the learner, a "no place this time" letter takes them off the list. SchoolMan
 * wrote these letters and changed nothing, so its lists never knew what had been sent.
 */

type Result = { ok: true; letterId: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function issueBookingLetter(bookingId: string, kind: BookingLetterKind, choices: LetterChoices, actor: StaffUser): Promise<Result> {
  const ctx = await bookingLetterContext(bookingId);
  if (!ctx) return refuse('Die Buchung gibt es nicht mehr.', 'The booking no longer exists.');
  if (kind === 'payment_receipt' && ctx.payments.length === 0) return refuse('Für diese Buchung ist noch keine Zahlung erfasst.', 'No payment is recorded on this booking yet.');
  const standard = (await standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]))[choices.language];
  const result = await withTransaction(async (client) => {
    const version = await nextLetterVersion(client, kind, { bookingId });
    const meta = { today: todayIso(), version };
    const letter = kind === 'booking_confirmation' ? bookingConfirmationLetter(ctx, choices, standard, meta) : paymentReceiptLetter(ctx, choices, standard, meta);
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
