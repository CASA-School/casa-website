/**
 * Puts SchoolMan's places to stay into `accommodations` (2026-10-18, migration 0060;
 * docs/ADMIN_WORKSPACE.md §Accommodation, docs/schoolman/accommodation.md): host families and CASA's flats
 * with their family, rooms and group bed reservations, and points the learners' stays at them.
 *
 *   python3 -I scripts/filemaker/read_accommodation.py | DATABASE_URL=... node scripts/filemaker/import-accommodation.mjs [--dry-run]
 *
 * Run after the learners and the groups (it links their stays and visits). One transaction; prints
 * counts only.
 *
 * - A place keeps SchoolMan's number (`filemaker_id`). While no colleague has changed it here, a re-run
 *   takes SchoolMan's values; once someone has, SchoolMan only fills what is empty.
 * - Its family (name and role only), rooms and reservations keep SchoolMan's numbers too; one SchoolMan
 *   no longer has goes, one made here stays.
 * - A stay (`booking_stays`) whose SchoolMan place and room came across points at them.
 * - The comments on a place become its notes, under their SchoolMan author.
 */
import { connect } from '../db/client.mjs';
import { changes, unordered } from './bridge-changes.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const places = await readStdin();
const client = await connect();
const count = { read: places.length, made: 0, updated: 0, keptHere: 0, members: 0, rooms: 0, reservations: 0, gone: 0, stays: 0, notes: 0 };

try {
  await client.query('BEGIN');
  const roomTypes = new Map((await client.query(`SELECT code, filemaker_id::text AS fm FROM accommodation_room_types WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [r.fm, r.code]));

  // A place as it was last time, its reservations' groups here as they were, is passed over (0088).
  const changed = await changes(client, 'accommodation');
  const groupsHere = new Set((await client.query(`SELECT filemaker_group_id::text AS k FROM group_visits WHERE filemaker_group_id IS NOT NULL`)).rows.map((r) => r.k));
  const vocabulary = unordered(roomTypes);

  for (const p of places) {
    if (changed.same(p.id, [p, vocabulary, p.reservations.map((r) => groupsHere.has(String(r.group)))])) continue;
    const values = [
      p.name.slice(0, 200),
      p.kind,
      p.contactName,
      p.email,
      p.phone,
      p.address,
      p.descriptionDe,
      p.descriptionEn,
      p.smoker,
      p.pets,
      p.washingMachine,
      p.rating,
      p.active,
    ];
    const known = (
      await client.query(
        `SELECT a.id, EXISTS (SELECT 1 FROM staff_activity s WHERE s.entity = 'accommodation' AND s.entity_id = a.id) AS changed_here
           FROM accommodations a WHERE a.filemaker_id = $1`,
        [p.id]
      )
    ).rows[0];
    let placeId = known?.id;
    if (!known) {
      placeId = (
        await client.query(
          `INSERT INTO accommodations (name, kind, contact_name, email, phone, address, description_de, description_en, smoker, pets, washing_machine, rating, is_active,
                                       filemaker_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, coalesce($15::date::timestamp AT TIME ZONE 'Europe/Berlin', timezone('utc', now())))
           RETURNING id`,
          [...values, p.id, p.created]
        )
      ).rows[0].id;
      count.made++;
    } else if (!known.changed_here) {
      await client.query(
        `UPDATE accommodations SET name = $2, kind = $3, contact_name = $4, email = $5, phone = $6, address = $7, description_de = $8, description_en = $9, smoker = $10,
                pets = $11, washing_machine = $12, rating = $13, is_active = $14
          WHERE id = $1`,
        [placeId, ...values]
      );
      count.updated++;
    } else {
      // A colleague has worked on it here: SchoolMan only fills what is empty.
      await client.query(
        `UPDATE accommodations SET contact_name = coalesce(contact_name, $2), email = coalesce(email, $3), phone = coalesce(phone, $4), address = coalesce(address, $5),
                description_de = coalesce(description_de, $6), description_en = coalesce(description_en, $7), smoker = coalesce(smoker, $8), pets = coalesce(pets, $9),
                washing_machine = coalesce(washing_machine, $10), rating = coalesce(rating, $11)
          WHERE id = $1`,
        [placeId, ...values.slice(2, 12)]
      );
      count.keptHere++;
    }

    const memberIds = [];
    for (const m of p.members) {
      memberIds.push(m.id);
      await client.query(
        `INSERT INTO accommodation_members (accommodation_id, first_name, last_name, role, filemaker_person_id) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (accommodation_id, filemaker_person_id) WHERE filemaker_person_id IS NOT NULL DO UPDATE
           SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, role = EXCLUDED.role`,
        [placeId, m.firstName, m.lastName, m.role, m.id]
      );
      count.members++;
    }
    count.gone += (
      await client.query(`DELETE FROM accommodation_members WHERE accommodation_id = $1 AND filemaker_person_id IS NOT NULL AND NOT (filemaker_person_id = ANY($2::text[]))`, [
        placeId,
        memberIds,
      ])
    ).rowCount;

    const roomIds = [];
    for (const r of p.rooms) {
      roomIds.push(r.id);
      await client.query(
        `INSERT INTO accommodation_rooms (accommodation_id, name, room_type_code, beds, note, filemaker_id) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
           SET accommodation_id = EXCLUDED.accommodation_id, name = EXCLUDED.name, room_type_code = EXCLUDED.room_type_code, beds = EXCLUDED.beds, note = EXCLUDED.note`,
        [placeId, r.name, roomTypes.get(r.type ?? '') ?? null, r.beds != null && r.beds <= 20 ? r.beds : null, r.note, r.id]
      );
      count.rooms++;
    }
    count.gone += (
      await client.query(`DELETE FROM accommodation_rooms WHERE accommodation_id = $1 AND filemaker_id IS NOT NULL AND NOT (filemaker_id = ANY($2::text[]))`, [placeId, roomIds])
    ).rowCount;

    const reservationIds = [];
    for (const r of p.reservations) {
      reservationIds.push(r.id);
      await client.query(
        `INSERT INTO accommodation_reservations (accommodation_id, room_id, group_visit_id, starts_on, ends_on, min_people, max_people, note, filemaker_id)
         VALUES ($1, (SELECT id FROM accommodation_rooms WHERE filemaker_id = $2), (SELECT id FROM group_visits WHERE filemaker_group_id = $3), $4, $5, $6, $7, $8, $9)
         ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
           SET accommodation_id = EXCLUDED.accommodation_id, room_id = EXCLUDED.room_id, group_visit_id = EXCLUDED.group_visit_id, starts_on = EXCLUDED.starts_on,
               ends_on = EXCLUDED.ends_on, min_people = EXCLUDED.min_people, max_people = EXCLUDED.max_people, note = EXCLUDED.note`,
        [placeId, r.room, r.group, r.start, r.end < r.start ? r.start : r.end, r.min, r.max, r.note, r.id]
      );
      count.reservations++;
    }
    count.gone += (
      await client.query(`DELETE FROM accommodation_reservations WHERE accommodation_id = $1 AND filemaker_id IS NOT NULL AND NOT (filemaker_id = ANY($2::text[]))`, [
        placeId,
        reservationIds,
      ])
    ).rowCount;

    for (const n of p.notes) {
      await client.query(
        `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
         VALUES ('accommodation', $1, $2, $3, $4, coalesce($5::timestamp AT TIME ZONE 'Europe/Berlin', now()))
         ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE
           SET entity = EXCLUDED.entity, entity_id = EXCLUDED.entity_id, body = EXCLUDED.body, author_name = EXCLUDED.author_name, created_at = EXCLUDED.created_at`,
        [placeId, n.body.slice(0, 20000), n.author ?? 'SchoolMan', n.ref, n.at]
      );
      count.notes++;
    }
  }

  // The learners' stays, at the places and rooms SchoolMan names.
  count.stays = (
    await client.query(
      `UPDATE booking_stays s
          SET accommodation_id = a.id, room_id = coalesce((SELECT r.id FROM accommodation_rooms r WHERE r.filemaker_id = s.filemaker_room_id AND r.accommodation_id = a.id), s.room_id)
         FROM accommodations a
        WHERE a.filemaker_id = s.filemaker_place_id AND s.accommodation_id IS DISTINCT FROM a.id`
    )
  ).rowCount;
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
  `${count.read} places read: ${count.unchanged ?? 0} as last time, ${count.made} new, ${count.updated} updated, ${count.keptHere} changed here (only gaps filled)\n` +
    `${count.members} family members · ${count.rooms} rooms · ${count.reservations} group reservations · ${count.gone} no longer in SchoolMan removed · ` +
    `${count.stays} stays placed · ${count.notes} comments`
);
