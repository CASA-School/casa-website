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
  /** The record it is about. One per kind; an offer is the only kind so far. */
  about: { offerId: string };
  version: number;
  organisationId: string | null;
  personId: string | null;
  recipientName: string;
  email: string | null;
  /** What the letter was built from, kept beside it. */
  source: unknown;
};

export async function issueLetter(client: PoolClient, input: IssueLetter, actor: StaffUser): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO letters (kind, offer_id, version, language, organisation_id, person_id, recipient_name, email,
                          subject, document, source, sent_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    [
      input.letter.kind,
      input.about.offerId,
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
