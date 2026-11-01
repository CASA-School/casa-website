import 'server-only';

import { z } from 'zod';
import type { PoolClient } from 'pg';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { isEmailKind, isPhoneKind, type EmailKind, type PhoneKind } from './contact-labels';
import { query, withTransaction } from './db';
import type { Bilingual } from './i18n';
import { normalizeEmail, normalizePhone } from './normalize';

/**
 * A person's addresses and numbers (Rahman, 2026-11-01: „what if a participant has more than one email or
 * phone"). Everyone keeps every address they gave — a registration adds its own, SchoolMan's come across —
 * over all their linked records. Which one is used is the rule of 0114 (`person_emails`): their own before
 * an agency's, the one a colleague chose, a private one, the newest. A colleague labels an address, chooses
 * the main one, adds or removes one; the rule does the rest.
 */

export type PersonEmail = {
  id: string;
  address: string;
  kind: EmailKind;
  isPrimary: boolean;
  note: string | null;
  /** 0 their own; 1 several people's (an agency nobody entered yet); 2 an agency's or an organisation's. */
  tier: 0 | 1 | 2;
  /** The one the workspace writes to. */
  inUse: boolean;
  /** The organisation the address belongs to, when it is one's. */
  organisation: string | null;
  /** How many other people have it. */
  sharedWith: number;
};

export type PersonPhone = { id: string; number: string; kind: PhoneKind; isPrimary: boolean; inUse: boolean };

type Result = { ok: true } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });
const Email = z.email();

export async function personContacts(personId: string, client?: PoolClient): Promise<{ emails: PersonEmail[]; phones: PersonPhone[] }> {
  const [emails, phones] = await Promise.all([
    query<{ id: string; address: string; kind: string; is_primary: boolean; note: string | null; tier: number; rank: number; organisation: string | null; shared: number }>(
      `SELECT pe.id, pe.address, pe.kind, pe.is_primary, pe.note, pe.tier, pe.rank,
              coalesce((SELECT o.name FROM organisations o WHERE lower(trim(o.email)) = pe.normalized ORDER BY o.is_active DESC LIMIT 1),
                       (SELECT o.name FROM organisation_contacts c JOIN organisations o ON o.id = c.organisation_id WHERE lower(c.email) = pe.normalized LIMIT 1)) AS organisation,
              (SELECT count(DISTINCT canonical_person_id(e.person_id)) FROM emails e WHERE e.normalized = pe.normalized)::int AS shared
         FROM person_emails($1) pe ORDER BY pe.rank`,
      [personId], client
    ),
    query<{ id: string; number: string; kind: string; is_primary: boolean; rank: number }>(`SELECT id, number, kind, is_primary, rank FROM person_phones($1) ORDER BY rank`, [personId], client),
  ]);
  return {
    emails: emails.map((e) => ({
      id: e.id,
      address: e.address,
      kind: isEmailKind(e.kind) ? e.kind : 'personal',
      isPrimary: e.is_primary,
      note: e.note,
      tier: (e.tier === 2 ? 2 : e.tier === 1 ? 1 : 0) as PersonEmail['tier'],
      inUse: e.rank === 1,
      organisation: e.organisation,
      sharedWith: Math.max(0, e.shared - 1),
    })),
    phones: phones.map((p) => ({ id: p.id, number: p.number, kind: isPhoneKind(p.kind) ? p.kind : 'mobile', isPrimary: p.is_primary, inUse: p.rank === 1 })),
  };
}

export type EmailInput = { address: string; kind: EmailKind; note: string | null; primary: boolean };
export type PhoneInput = { number: string; kind: PhoneKind; primary: boolean };

/** An address added, or — already one of theirs — labelled again. */
export async function saveEmail(personId: string, emailId: string | null, input: EmailInput, actor: StaffUser, client?: PoolClient): Promise<Result> {
  const address = input.address.trim();
  if (!emailId && !Email.safeParse(address).success) return refuse('Diese E-Mail-Adresse sieht nicht richtig aus.', 'That email address does not look right.');
  const work = async (client: PoolClient) => {
    const owner = await client.query<{ root: string }>(`SELECT canonical_person_id($1) AS root FROM people WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [personId]);
    const root = owner.rows[0]?.root;
    if (!root) return null;
    let id = emailId;
    if (id) {
      const own = await client.query(`UPDATE emails SET kind = $3, note = $4 WHERE id = $1 AND person_id = ANY (person_records($2))`, [id, root, input.kind, input.note]);
      if (!own.rowCount) return null;
    } else {
      const normalized = normalizeEmail(address);
      const existing = await client.query<{ id: string }>(`SELECT id FROM emails WHERE person_id = ANY (person_records($1)) AND normalized = $2 LIMIT 1`, [root, normalized]);
      id = existing.rows[0]?.id ?? null;
      if (id) {
        await client.query(`UPDATE emails SET kind = $2, note = coalesce($3, note) WHERE id = $1`, [id, input.kind, input.note]);
      } else {
        const made = await client.query<{ id: string }>(
          `INSERT INTO emails (person_id, address, normalized, kind, is_primary, note) VALUES ($1, $2, $3, $4, false, $5) RETURNING id`,
          [root, address, normalized, input.kind, input.note]
        );
        id = made.rows[0].id;
      }
    }
    if (input.primary) {
      await client.query(`UPDATE emails SET is_primary = (id = $1) WHERE person_id = ANY (person_records($2))`, [id, root]);
    } else {
      await client.query(`UPDATE emails SET is_primary = false WHERE id = $1`, [id]);
    }
    return root;
  };
  const done = client ? await work(client) : await withTransaction(work);
  if (!done) return refuse('Diese Adresse gibt es nicht mehr.', 'That address no longer exists.');
  await logActivity({ actor, entity: 'person', entityId: done, action: emailId ? 'contact_changed' : 'contact_added', detail: { channel: 'email' } }, client);
  return { ok: true };
}

/** A number added, or — already one of theirs — labelled again. */
export async function savePhone(personId: string, phoneId: string | null, input: PhoneInput, actor: StaffUser, client?: PoolClient): Promise<Result> {
  const number = input.number.trim();
  const normalized = normalizePhone(number);
  if (!phoneId && normalized.replace('+', '').length < 5) return refuse('Diese Telefonnummer sieht nicht richtig aus.', 'That phone number does not look right.');
  // An emergency contact is someone else's number: never the one used.
  const primary = input.primary && input.kind !== 'emergency';
  const work = async (client: PoolClient) => {
    const owner = await client.query<{ root: string }>(`SELECT canonical_person_id($1) AS root FROM people WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [personId]);
    const root = owner.rows[0]?.root;
    if (!root) return null;
    let id = phoneId;
    if (id) {
      const own = await client.query(`UPDATE phones SET kind = $3 WHERE id = $1 AND person_id = ANY (person_records($2))`, [id, root, input.kind]);
      if (!own.rowCount) return null;
    } else {
      const existing = await client.query<{ id: string }>(`SELECT id FROM phones WHERE person_id = ANY (person_records($1)) AND normalized = $2 LIMIT 1`, [root, normalized]);
      id = existing.rows[0]?.id ?? null;
      if (id) {
        await client.query(`UPDATE phones SET kind = $2 WHERE id = $1`, [id, input.kind]);
      } else {
        const made = await client.query<{ id: string }>(
          `INSERT INTO phones (person_id, number, normalized, kind, is_primary) VALUES ($1, $2, $3, $4, false) RETURNING id`,
          [root, number, normalized, input.kind]
        );
        id = made.rows[0].id;
      }
    }
    if (primary) {
      await client.query(`UPDATE phones SET is_primary = (id = $1) WHERE person_id = ANY (person_records($2))`, [id, root]);
    } else {
      await client.query(`UPDATE phones SET is_primary = false WHERE id = $1`, [id]);
    }
    return root;
  };
  const done = client ? await work(client) : await withTransaction(work);
  if (!done) return refuse('Diese Nummer gibt es nicht mehr.', 'That number no longer exists.');
  await logActivity({ actor, entity: 'person', entityId: done, action: phoneId ? 'contact_changed' : 'contact_added', detail: { channel: 'phone' } }, client);
  return { ok: true };
}

/** An address or number removed from the person — from every record of theirs that has it. */
export async function removeContact(personId: string, channel: 'email' | 'phone', id: string, actor: StaffUser, client?: PoolClient): Promise<boolean> {
  const work = async (connection: PoolClient) => {
    const owner = await connection.query<{ root: string }>(
      `SELECT canonical_person_id($1) AS root FROM people WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [personId]
    );
    const root = owner.rows[0]?.root;
    if (!root) return false;
    const table = channel === 'email' ? 'emails' : 'phones';
    const removed = await connection.query(
      `DELETE FROM ${table} WHERE person_id = ANY (person_records($2))
          AND normalized = (SELECT normalized FROM ${table} WHERE id = $1 AND person_id = ANY (person_records($2)))
       RETURNING id`,
      [id, root]
    );
    if (!removed.rowCount) return false;
    await logActivity({ actor, entity: 'person', entityId: root, action: 'contact_removed', detail: { channel } }, connection);
    return true;
  };
  return client ? work(client) : withTransaction(work);
}
