/**
 * Puts the letters to hosts on their place and booking, says how each SchoolMan letter went out, and brings
 * the complaints as notes (2026-10-18, migration 0067).
 *
 *   python3 -I scripts/filemaker/read_letters_extra.py | DATABASE_URL=... node scripts/filemaker/import-letters-extra.mjs [--dry-run]
 *
 * Run after the learners and the accommodation. One transaction; prints counts only.
 *
 * - A letter to a host is a SchoolMan letter of its place and of the booking it is about, with no learner as
 *   its addressee (`StatementLandlord:<id>`); a re-run updates its text.
 * - How a letter went (`letters.sent_via`, e-mail or print) is set on the letters that came across.
 * - A complaint is a note on its booking, else on the learner, under its SchoolMan author.
 */
import { connect } from '../db/client.mjs';

import { letterDocument } from './letter-document.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const { statements, sentVia, complaints } = await readStdin();
const client = await connect();
const count = { statements: 0, updated: 0, via: 0, complaints: 0, notHere: 0 };

try {
  await client.query('BEGIN');
  const map = async (sql) => new Map((await client.query(sql)).rows.map((r) => [String(r.k), r.v]));
  const bookings = await map(`SELECT filemaker_booking_id AS k, id AS v FROM bookings WHERE filemaker_booking_id IS NOT NULL`);
  const places = await map(`SELECT filemaker_id AS k, id AS v FROM accommodations WHERE filemaker_id IS NOT NULL`);
  const persons = await map(`SELECT source_record_id AS k, entity_id AS v FROM filemaker_links WHERE entity = 'person' AND source_database = 'SchoolMan' AND source_layout = 'Person'`);

  for (const s of statements) {
    const placeId = s.place ? (places.get(s.place) ?? null) : null;
    const bookingId = bookings.get(s.booking) ?? null;
    if (!placeId) {
      count.notHere++;
      continue;
    }
    const doc = letterDocument(s, 'schoolman');
    const subject = doc.subject.title || 'Brief an die Unterkunft';
    const recipient = doc.recipient[0] ?? '';
    const known = (await client.query(`SELECT id FROM letters WHERE filemaker_letter_id = $1`, [s.ref])).rows[0];
    if (known) {
      await client.query(`UPDATE letters SET document = $2::jsonb, subject = $3, recipient_name = $4, accommodation_id = $5 WHERE id = $1`, [
        known.id,
        JSON.stringify(doc),
        subject,
        recipient,
        placeId,
      ]);
      count.updated++;
    } else {
      const version = bookingId
        ? (await client.query(`SELECT coalesce(max(version), 0) + 1 AS v FROM letters WHERE booking_id = $1 AND kind = 'schoolman'`, [bookingId])).rows[0].v
        : 1;
      await client.query(
        `INSERT INTO letters (kind, version, language, booking_id, accommodation_id, recipient_name, subject, document, sent_at, filemaker_letter_id)
         VALUES ('schoolman', $1, 'de', $2, $3, $4, $5, $6::jsonb, coalesce($7::timestamp AT TIME ZONE 'Europe/Berlin', now()), $8)`,
        [version, bookingId, placeId, recipient, subject, JSON.stringify(doc), s.sent, s.ref]
      );
      count.statements++;
    }
  }

  const letters = await map(`SELECT filemaker_letter_id AS k, id AS v FROM letters WHERE filemaker_letter_id IS NOT NULL`);
  const ids = [];
  const vias = [];
  for (const [ref, via] of Object.entries(sentVia)) {
    const id = letters.get(ref);
    if (id) {
      ids.push(id);
      vias.push(via);
    }
  }
  count.via = (
    await client.query(
      `UPDATE letters l SET sent_via = v.via FROM unnest($1::uuid[], $2::text[]) AS v(id, via) WHERE l.id = v.id AND l.sent_via IS DISTINCT FROM v.via`,
      [ids, vias]
    )
  ).rowCount;

  for (const c of complaints) {
    const bookingId = c.booking ? (bookings.get(c.booking) ?? null) : null;
    const personId = c.person ? (persons.get(c.person) ?? null) : null;
    if (!bookingId && !personId) {
      count.notHere++;
      continue;
    }
    await client.query(
      `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
       VALUES ($1, $2, $3, $4, $5, coalesce($6::timestamp AT TIME ZONE 'Europe/Berlin', now()))
       ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE SET body = EXCLUDED.body`,
      [bookingId ? 'booking' : 'person', bookingId ?? personId, c.body.slice(0, 20000), c.author ?? 'SchoolMan', c.ref, c.at]
    );
    count.complaints++;
  }
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(
  `${count.statements} letters to hosts new, ${count.updated} updated · ${count.via} letters told how they went · ${count.complaints} complaints · ${count.notHere} not here`
);
