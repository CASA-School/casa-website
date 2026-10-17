import 'server-only';

import type { StaffUser } from '../auth';
import { sittingCandidates } from '../exams';

import { bookingLetterContext } from './booking-context';
import { issueBookingLetter } from './booking-issue';
import { bookingLetterBlock, buildBookingLetter, LETTER_STANDARD_DEFAULTS, type BookingLetterContext } from './booking-letters';
import { lettersForBooking, standardTexts } from './repo';
import type { BookingLetterKind, Letter, LetterLanguage } from './types';

/**
 * One letter to every candidate of a sitting (0038): the invitation, "your result is here", the
 * confirmation of participation. SchoolMan sent its invitation as one circular with every
 * candidate's address on it; here each candidate gets their own letter, in their own language,
 * kept on their booking — the same letter, rules and words as one sent from the booking.
 */

export const SITTING_LETTER_KINDS = ['exam_invitation', 'exam_results', 'exam_participation'] as const satisfies readonly BookingLetterKind[];
export type SittingLetterKind = (typeof SITTING_LETTER_KINDS)[number];

export type SittingLetterRow = {
  bookingId: string;
  personName: string;
  language: LetterLanguage;
  email: string | null;
  /** Why this candidate cannot have the letter now, in both languages; null when they can. */
  blocked: Record<LetterLanguage, string> | null;
  /** When they last had this letter, if they did. */
  sentOn: string | null;
};

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Each candidate whose booking stands, with whether the letter can go to them and whether it already did. */
export async function sittingLetterRows(sittingId: string, kind: SittingLetterKind): Promise<{ rows: SittingLetterRow[]; contexts: Map<string, BookingLetterContext> }> {
  const today = isoDay(new Date());
  const candidates = (await sittingCandidates(sittingId)).filter((c) => c.status !== 'cancelled');
  const contexts = new Map<string, BookingLetterContext>();
  const rows: SittingLetterRow[] = [];
  for (const c of candidates) {
    const [ctx, letters] = await Promise.all([bookingLetterContext(c.bookingId), lettersForBooking(c.bookingId)]);
    if (!ctx) continue;
    contexts.set(c.bookingId, ctx);
    const sent = letters.map((l) => ({ kind: l.kind, date: isoDay(l.sentAt) }));
    const last = letters.filter((l) => l.kind === kind).sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0];
    rows.push({
      bookingId: c.bookingId,
      personName: c.personName,
      language: ctx.language,
      email: ctx.person.email,
      blocked: bookingLetterBlock(kind, ctx, { today, version: 1, sent }),
      sentOn: last ? isoDay(last.sentAt) : null,
    });
  }
  return { rows, contexts };
}

/** The letter as it would go to one candidate, in their language, with the standard texts. */
export async function previewSittingLetter(kind: SittingLetterKind, ctx: BookingLetterContext, signatureId: string | null): Promise<Letter> {
  const standard = (await standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]))[ctx.language];
  return buildBookingLetter(kind, ctx, { language: ctx.language, address: 'home', signatureId, texts: {} }, standard, { today: isoDay(new Date()), version: 1 });
}

/** Sends — keeps as sent — the letter to each chosen candidate of the sitting; returns the letters made. */
export async function issueSittingLetters(
  sittingId: string,
  kind: SittingLetterKind,
  bookingIds: readonly string[],
  signatureId: string | null,
  actor: StaffUser
): Promise<{ letterIds: string[]; refused: number }> {
  const ours = new Set((await sittingCandidates(sittingId)).filter((c) => c.status !== 'cancelled').map((c) => c.bookingId));
  const letterIds: string[] = [];
  let refused = 0;
  for (const bookingId of bookingIds) {
    if (!ours.has(bookingId)) continue;
    const ctx = await bookingLetterContext(bookingId);
    if (!ctx) continue;
    // The same check, words and record as a letter sent from the booking itself.
    const result = await issueBookingLetter(bookingId, kind, { language: ctx.language, address: 'home', signatureId, texts: {} }, actor);
    if (result.ok) letterIds.push(result.letterId);
    else refused += 1;
  }
  return { letterIds, refused };
}
