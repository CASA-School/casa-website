import 'server-only';

import type { PoolClient } from 'pg';

import type { StaffUser } from '../auth';
import { query, queryFirst } from '../db';

import { readLetter } from './read';
import { subjectLine, type Letter, type LetterKind, type LetterLanguage } from './types';

/**
 * Letters in the database (`letters`, `letter_texts`; docs/LETTERS.md).
 *
 * A letter is written to `letters` once, when it is sent, inside the
 * transaction that marks its record as sent — so the record never says "sent"
 * without the letter that went out, and the letter is never changed after.
 */

export type IssueLetter = {
  letter: Letter;
  /** The record it is about, the one its kind names: an offer, a booking, a waiting-list entry. */
  about: { offerId: string } | { bookingId: string } | { waitlistEntryId: string } | { registrationId: string } | { personId: string };
  version: number;
  organisationId: string | null;
  personId: string | null;
  recipientName: string;
  email: string | null;
  /** What the letter was built from, kept beside it. */
  source: unknown;
};

export async function issueLetter(client: PoolClient, input: IssueLetter, actor: StaffUser): Promise<string> {
  const about = input.about;
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO letters (kind, offer_id, booking_id, waitlist_entry_id, registration_id, version, language, organisation_id, person_id,
                          recipient_name, email, subject, document, source, sent_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
    [
      input.letter.kind,
      'offerId' in about ? about.offerId : null,
      'bookingId' in about ? about.bookingId : null,
      'waitlistEntryId' in about ? about.waitlistEntryId : null,
      'registrationId' in about ? about.registrationId : null,
      input.version,
      input.letter.language,
      input.organisationId,
      input.personId,
      input.recipientName,
      input.email || null,
      subjectLine(input.letter),
      JSON.stringify(input.letter),
      JSON.stringify(input.source ?? {}),
      actor.id,
    ]
  );
  return rows[0].id;
}

export type LetterListItem = { id: string; version: number; subject: string; sentAt: Date; sentByName: string | null };

/** The next version of a kind of letter about one booking or waiting-list entry: 1 for the first. */
export async function nextLetterVersion(
  client: PoolClient,
  kind: LetterKind,
  about: { bookingId: string } | { waitlistEntryId: string } | { registrationId: string } | { personId: string }
): Promise<number> {
  const [column, id] =
    'bookingId' in about
      ? ['booking_id', about.bookingId]
      : 'waitlistEntryId' in about
        ? ['waitlist_entry_id', about.waitlistEntryId]
        : 'registrationId' in about
          ? ['registration_id', about.registrationId]
          : ['person_id', about.personId];
  const { rows } = await client.query<{ n: number }>(`SELECT coalesce(max(version), 0)::int AS n FROM letters WHERE kind = $1 AND ${column} = $2`, [kind, id]);
  return rows[0].n + 1;
}

export type SentLetter = {
  id: string;
  kind: LetterKind;
  version: number;
  subject: string;
  sentAt: Date;
  sentByName: string | null;
  bookingId: string | null;
  waitlistEntryId: string | null;
  offerId: string | null;
  registrationId: string | null;
  personId: string | null;
  /** A letter to a place — SchoolMan's letters to hosts (0067). */
  accommodationId: string | null;
  /** How it went out, where SchoolMan logged it (0067). */
  sentVia: 'email' | 'print' | null;
};

const SENT = `SELECT l.id, l.kind, l.version, l.subject, l.sent_at, s.name AS sent_by_name, l.booking_id, l.waitlist_entry_id, l.offer_id,
                     l.registration_id, l.person_id, l.accommodation_id, l.sent_via
                FROM letters l LEFT JOIN staff_users s ON s.id = l.sent_by`;

type SentRow = {
  id: string;
  kind: LetterKind;
  version: number;
  subject: string;
  sent_at: Date;
  sent_by_name: string | null;
  booking_id: string | null;
  waitlist_entry_id: string | null;
  offer_id: string | null;
  registration_id: string | null;
  person_id: string | null;
  accommodation_id: string | null;
  sent_via: 'email' | 'print' | null;
};

const toSent = (r: SentRow): SentLetter => ({
  id: r.id,
  kind: r.kind,
  version: r.version,
  subject: r.subject,
  sentAt: r.sent_at,
  sentByName: r.sent_by_name,
  bookingId: r.booking_id,
  waitlistEntryId: r.waitlist_entry_id,
  offerId: r.offer_id,
  registrationId: r.registration_id,
  personId: r.person_id,
  accommodationId: r.accommodation_id,
  sentVia: r.sent_via,
});

/** The letters to a place — to a host, about a learner's stay — the latest first. */
export async function lettersForPlace(placeId: string): Promise<SentLetter[]> {
  return (await query<SentRow>(`${SENT} WHERE l.accommodation_id = $1 ORDER BY l.sent_at DESC`, [placeId])).map(toSent);
}

/** A website registration's letters, the latest first. */
export async function lettersForRegistration(registrationId: string): Promise<SentLetter[]> {
  return (await query<SentRow>(`${SENT} WHERE l.registration_id = $1 ORDER BY l.sent_at DESC`, [registrationId])).map(toSent);
}

/** A booking's letters, the latest first. */
export async function lettersForBooking(bookingId: string): Promise<SentLetter[]> {
  return (await query<SentRow>(`${SENT} WHERE l.booking_id = $1 ORDER BY l.sent_at DESC`, [bookingId])).map(toSent);
}

/** The letters of some waiting-list entries, the latest first. */
export async function lettersForEntries(entryIds: readonly string[]): Promise<SentLetter[]> {
  if (entryIds.length === 0) return [];
  return (await query<SentRow>(`${SENT} WHERE l.waitlist_entry_id = ANY($1::uuid[]) ORDER BY l.sent_at DESC`, [entryIds])).map(toSent);
}

/** Every letter to a person, linked records included, the latest first. */
export async function lettersForPerson(canonicalPersonId: string): Promise<SentLetter[]> {
  return (
    await query<SentRow>(`${SENT} WHERE l.person_id IS NOT NULL AND canonical_person_id(l.person_id) = $1 ORDER BY l.sent_at DESC`, [canonicalPersonId])
  ).map(toSent);
}

/** One letter as it went out, with what it is about; null when there is none or it cannot be read. */
export async function getSentLetter(id: string): Promise<(SentLetter & { letter: Letter; email: string | null; recipientName: string }) | null> {
  const row = await queryFirst<SentRow & { document: unknown; email: string | null; recipient_name: string }>(
    `SELECT l.id, l.kind, l.version, l.subject, l.sent_at, s.name AS sent_by_name, l.booking_id, l.waitlist_entry_id, l.offer_id,
            l.registration_id, l.person_id, l.accommodation_id, l.sent_via, l.document, l.email, l.recipient_name
       FROM letters l LEFT JOIN staff_users s ON s.id = l.sent_by WHERE l.id = $1`,
    [id]
  );
  if (!row) return null;
  const letter = readLetter(row.document);
  return letter ? { ...toSent(row), letter, email: row.email, recipientName: row.recipient_name } : null;
}

/** The letters sent for an offer, the latest first. */
export async function lettersForOffer(offerId: string): Promise<LetterListItem[]> {
  const rows = await query<{ id: string; version: number; subject: string; sent_at: Date; sent_by_name: string | null }>(
    `SELECT l.id, l.version, l.subject, l.sent_at, s.name AS sent_by_name
       FROM letters l LEFT JOIN staff_users s ON s.id = l.sent_by
      WHERE l.offer_id = $1 ORDER BY l.version DESC`,
    [offerId]
  );
  return rows.map((r) => ({ id: r.id, version: r.version, subject: r.subject, sentAt: r.sent_at, sentByName: r.sent_by_name }));
}

/** One sent version of an offer's letter, as it went out; null when there is none or it cannot be read. */
/** The letter of an offer's latest version that went out, for the mail screen. */
export async function latestOfferLetterId(offerId: string): Promise<string | null> {
  const row = await queryFirst<{ id: string }>(`SELECT id FROM letters WHERE offer_id = $1 ORDER BY version DESC, sent_at DESC LIMIT 1`, [offerId]);
  return row?.id ?? null;
}

export async function sentOfferLetter(offerId: string, version: number): Promise<Letter | null> {
  const row = await queryFirst<{ document: unknown }>(`SELECT document FROM letters WHERE offer_id = $1 AND version = $2`, [offerId, version]);
  return row ? readLetter(row.document) : null;
}

// ------------------------------------------------------- standard texts

export type StandardTexts = Record<LetterLanguage, Record<string, string>>;

/**
 * A kind's standard texts per language: CASA's own where it saved one, the
 * kind's written default otherwise.
 */
export async function standardTexts(kind: LetterKind, defaults: StandardTexts): Promise<StandardTexts> {
  const rows = await query<{ language: LetterLanguage; part: string; body: string }>(
    `SELECT language, part, body FROM letter_texts WHERE kind = $1`,
    [kind]
  );
  const out: StandardTexts = { de: { ...defaults.de }, en: { ...defaults.en } };
  for (const r of rows) if (r.part in out[r.language]) out[r.language][r.part] = r.body;
  return out;
}

export async function saveStandardText(kind: LetterKind, language: LetterLanguage, part: string, body: string, actor: StaffUser) {
  await query(
    `INSERT INTO letter_texts (kind, language, part, body, updated_by) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (kind, language, part) DO UPDATE SET body = EXCLUDED.body, updated_by = EXCLUDED.updated_by,
                                                      updated_at = timezone('utc', now())`,
    [kind, language, part, body, actor.id]
  );
}
