/**
 * Puts the Wohnungsgeberbestätigungen on their place, booking, stay and learner, says how each SchoolMan letter
 * went out, and brings the complaints as notes (2026-10-18, migrations 0067, 0095).
 *
 *   python3 -I scripts/filemaker/read_letters_extra.py | DATABASE_URL=... node scripts/filemaker/import-letters-extra.mjs [--dry-run]
 *
 * Run after the learners and the accommodation. One transaction; prints counts only.
 *
 * - A Wohnungsgeberbestätigung (`StatementLandlord:<id>`) is a SchoolMan letter to the learner it is for, of the
 *   place, the booking and the stay it certifies. SchoolMan keeps no text for it, only the facts it prints —
 *   the Wohnungsgeber, the dwelling, move-in and move-out — so the letter is built from them, signed by the
 *   colleague who issued it (`sent_by` when they have an account here); a re-run updates it.
 * - How a letter went (`letters.sent_via`, e-mail or print) is set on the letters that came across.
 * - A complaint is a note on its booking, else on the learner, under its SchoolMan author.
 */
import { connect } from '../db/client.mjs';
import { changes } from './bridge-changes.mjs';

import { letterDocument } from './letter-document.mjs';

const dayDe = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** A Wohnungsgeberbestätigung as a letter (schema 1): the facts SchoolMan prints on it, its text when it has one. */
function statementDocument(s, learner, signature) {
  const doc = letterDocument(s, 'schoolman');
  const fact = (text, detail) => (detail ? [{ type: 'heading', text, detail: detail.slice(0, 5000) }] : []);
  return {
    ...doc,
    recipient: learner ? [learner] : [],
    subject: { lead: s.subject ?? 'Wohnungsgeberbestätigung', title: '', tail: null },
    body: [
      ...fact('Wohnungsgeber', s.landlord.join(', ')),
      ...fact('Wohnung', s.dwelling.join(', ')),
      ...fact('Einzug', s.moveIn ? dayDe(s.moveIn) : null),
      ...fact('Auszug', s.moveOut ? dayDe(s.moveOut) : null),
      ...doc.body,
    ].slice(0, 100),
    signature: signature ? [signature.slice(0, 5000)] : [],
  };
}

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

  // The learner a Wohnungsgeberbestätigung is for (the booking's), the stay it certifies, who signed it.
  const learners = new Map(
    (await client.query(`SELECT b.id, b.person_id, btrim(concat_ws(' ', p.first_name, p.last_name)) AS name FROM bookings b JOIN people p ON p.id = b.person_id`)).rows.map(
      (r) => [r.id, { personId: r.person_id, name: r.name || null }]
    )
  );
  const stays = await map(`SELECT filemaker_id AS k, id AS v FROM booking_stays WHERE filemaker_id IS NOT NULL`);
  const signers = new Map(
    (
      await client.query(
        `SELECT m.filemaker_staff_id AS k, m.staff_user_id, btrim(concat_ws(' ', p.first_name, p.last_name)) AS name
           FROM staff_members m JOIN people p ON p.id = m.person_id WHERE m.filemaker_staff_id IS NOT NULL`
      )
    ).rows.map((r) => [String(r.k), { userId: r.staff_user_id, name: r.name || null }])
  );

  // A letter or complaint as it was last time, on the same records here, is passed over (0088).
  const changed = await changes(client, 'letters-extra');
  for (const s of statements) {
    const placeId = s.place ? (places.get(s.place) ?? null) : null;
    const bookingId = bookings.get(s.booking) ?? null;
    if (!placeId) {
      count.notHere++;
      continue;
    }
    const learner = bookingId ? (learners.get(bookingId) ?? null) : null;
    const stayId = s.stay ? (stays.get(s.stay) ?? null) : null;
    const signer = s.signer ? signers.get(s.signer) : undefined;
    const signature = signer?.name ?? s.signerName;
    if (changed.same(`statement:${s.ref}`, [s, placeId, bookingId, learner, stayId, signer?.userId ?? null, signature])) continue;
    const doc = statementDocument(s, learner?.name, signature);
    const subject = doc.subject.lead;
    const recipient = learner?.name ?? '';
    const source = { statement: { moveIn: s.moveIn, moveOut: s.moveOut } };
    const known = (await client.query(`SELECT id FROM letters WHERE filemaker_letter_id = $1`, [s.ref])).rows[0];
    if (known) {
      await client.query(
        `UPDATE letters SET document = $2::jsonb, subject = $3, recipient_name = $4, accommodation_id = $5, person_id = $6, booking_stay_id = $7, sent_by = $8,
                source = $9::jsonb
          WHERE id = $1`,
        [known.id, JSON.stringify(doc), subject, recipient, placeId, learner?.personId ?? null, stayId, signer?.userId ?? null, JSON.stringify(source)]
      );
      count.updated++;
    } else {
      const version = bookingId
        ? (await client.query(`SELECT coalesce(max(version), 0) + 1 AS v FROM letters WHERE booking_id = $1 AND kind = 'schoolman'`, [bookingId])).rows[0].v
        : 1;
      await client.query(
        `INSERT INTO letters (kind, version, language, booking_id, accommodation_id, person_id, booking_stay_id, sent_by, recipient_name, subject, document, source,
                              sent_at, filemaker_letter_id)
         VALUES ('schoolman', $1, 'de', $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, coalesce($11::timestamp AT TIME ZONE 'Europe/Berlin', now()), $12)`,
        [version, bookingId, placeId, learner?.personId ?? null, stayId, signer?.userId ?? null, recipient, subject, JSON.stringify(doc), JSON.stringify(source), s.sent, s.ref]
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
    if (changed.same(`complaint:${c.ref}`, [c, bookingId, personId])) continue;
    await client.query(
      `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
       VALUES ($1, $2, $3, $4, $5, coalesce($6::timestamp AT TIME ZONE 'Europe/Berlin', now()))
       ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE SET body = EXCLUDED.body`,
      [bookingId ? 'booking' : 'person', bookingId ?? personId, c.body.slice(0, 20000), c.author ?? 'SchoolMan', c.ref, c.at]
    );
    count.complaints++;
  }
  count.unchanged = changed.unchanged;
  await changed.save();
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(
  `${count.statements} Wohnungsgeberbestätigungen new, ${count.updated} updated · ${count.via} letters told how they went · ${count.complaints} complaints · ${count.notHere} not here · ${count.unchanged ?? 0} as last time`
);
