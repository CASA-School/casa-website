import { bookingLetterBlock, missingFromRecord, type BookingLetterContext, type WaitlistLetterContext } from './booking-letters';
import type { BookingLetterKind, WaitlistLetterKind } from './types';
import { owesMoney } from '../open-money';

/**
 * The letter a booking is due next, from what it is and what was sent (2026-10-17). SchoolMan left
 * this to memory: a colleague opened the booking and knew, or did not, that the confirmation never
 * went, that a payment came in without a receipt, that the show-up letter's window had opened.
 * Pure: the same answer on the booking's page, its letter page and in a test. Most urgent first.
 */

type Sent = readonly { kind: string; date: string }[];

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const daysUntil = (from: string, to: string) => Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000);

/** The last day a kind of letter went out, if it did. */
const lastSent = (sent: Sent, kind: string) =>
  sent
    .filter((s) => s.kind === kind)
    .map((s) => s.date)
    .sort()
    .pop() ?? null;

/** The date of birth, the nationality, a way to reach them; a passport number for a visa. */
function essentialsMissing(ctx: BookingLetterContext): boolean {
  const missing = new Set(missingFromRecord(ctx.person));
  return (
    missing.has('birth_date') ||
    missing.has('nationality') ||
    (missing.has('email') && missing.has('phone')) ||
    (ctx.visaRequired && missing.has('passport'))
  );
}

export function suggestBookingLetters(ctx: BookingLetterContext, today: string, sent: Sent): BookingLetterKind[] {
  const out: BookingLetterKind[] = [];
  const balance = Math.round((ctx.charged - ctx.paid) * 100) / 100;
  const confirmation = ctx.exam ? 'exam_confirmation' : 'booking_confirmation';
  const confirmed = lastSent(sent, confirmation);

  // Cancelled: only the cancellation, once.
  if (ctx.status === 'cancelled') return lastSent(sent, 'cancellation_confirmation') ? [] : ['cancellation_confirmation'];

  // Over (a booking from before, SchoolMan's ones among them, 0052): a confirmation, a receipt or a
  // course-start letter comes too late; only money still open is worth a letter.
  const end = ctx.course?.endDate ?? null;
  if (ctx.status === 'completed' || (end && end < today)) {
    const reminded = lastSent(sent, 'payment_reminder');
    return owesMoney(balance) && (!reminded || reminded <= addDays(today, -7)) ? ['payment_reminder'] : [];
  }

  if (!confirmed) out.push(confirmation);

  // A payment came in after the last receipt, or there is none yet.
  const receipt = lastSent(sent, 'payment_receipt');
  if (ctx.payments.some((p) => p.amount > 0 && (!receipt || p.date > receipt))) out.push('payment_receipt');

  if (ctx.exam) {
    const day = ctx.exam.day;
    if (day >= today && daysUntil(today, day) <= 14 && !lastSent(sent, 'exam_invitation')) out.push('exam_invitation');
    if (ctx.exam.result && !lastSent(sent, 'exam_results')) out.push('exam_results');
  } else {
    const start = ctx.course?.startDate ?? null;
    // A visa: the letter for the embassy once paid in full; the show-up letter in its window.
    if (ctx.visaRequired && ctx.charged > 0.005 && balance <= 0.005 && !lastSent(sent, 'visa_letter')) out.push('visa_letter');
    if (ctx.visaRequired && start) {
      const days = daysUntil(today, start);
      if (days <= 40 && days >= 9 && !lastSent(sent, 'showup_first_call')) out.push('showup_first_call');
    }
    if (start && start >= today && daysUntil(today, start) <= 7 && !lastSent(sent, 'course_start')) out.push('course_start');
  }

  // Still open a week after the confirmation, and no reminder in the last week.
  const reminded = lastSent(sent, 'payment_reminder');
  if (owesMoney(balance) && confirmed && confirmed <= addDays(today, -7) && (!reminded || reminded <= addDays(today, -7))) out.push('payment_reminder');

  // What the record must have and lacks — not every field on the list, most records lack some —
  // asked for at most every two weeks, a course learner's only.
  const asked = lastSent(sent, 'missing_items');
  if (!ctx.exam && essentialsMissing(ctx) && (!asked || asked <= addDays(today, -14))) out.push('missing_items');

  return out;
}

/** A queue's next letter: "a place is free" once one is offered, else the confirmation of the place. */
export function suggestWaitlistLetter(ctx: WaitlistLetterContext, sent: Sent): WaitlistLetterKind | null {
  if (ctx.status === 'offered') return lastSent(sent, 'waitlist_place_free') ? null : 'waitlist_place_free';
  if (ctx.status === 'waiting') return lastSent(sent, 'waitlist_confirmation') ? null : 'waitlist_confirmation';
  return null;
}

/** Where each kind of letter stands for one record: why not yet, when last sent and how often, whether due. */
export type KindState = { blocked: { de: string; en: string } | null; lastSent: string | null; count: number; suggested: boolean };

export function bookingKindStates(kinds: readonly BookingLetterKind[], ctx: BookingLetterContext, today: string, sent: Sent): Map<BookingLetterKind, KindState> {
  const due = new Set(suggestBookingLetters(ctx, today, sent));
  return new Map(
    kinds.map((kind) => [
      kind,
      {
        blocked: bookingLetterBlock(kind, ctx, { today, version: 1, sent: [...sent] }),
        lastSent: lastSent(sent, kind),
        count: sent.filter((s) => s.kind === kind).length,
        suggested: due.has(kind),
      },
    ])
  );
}

/** A record's letters by kind: how often each went, and when last. */
export function sentStates(kinds: readonly string[], sent: Sent): Map<string, Pick<KindState, 'lastSent' | 'count'>> {
  return new Map(kinds.map((kind) => [kind, { lastSent: lastSent(sent, kind), count: sent.filter((s) => s.kind === kind).length }]));
}
