/**
 * Puts the last of SchoolMan's smaller areas into the workspace (2026-10-18, migration 0068): a group visit's
 * programme, services and internship places; book orders to publishers (each publisher an organisation,
 * „Verlag"); CASA's keys and who holds them; the CASA flats' cleaning plan.
 *
 *   python3 -I scripts/filemaker/read_rest.py | DATABASE_URL=... node scripts/filemaker/import-rest.mjs [--dry-run]
 *
 * Run after the groups, the organisations, the accommodation and the staff. One transaction; prints counts
 * only. Every row keeps SchoolMan's number; a re-run updates it. SchoolMan has four keys twice under one
 * number; they come across once.
 */
import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const data = await readStdin();
const client = await connect();
const count = { programme: 0, services: 0, internships: 0, publishersMade: 0, orders: 0, lines: 0, keys: 0, jobs: 0, weeks: 0, notHere: 0 };

try {
  await client.query('BEGIN');
  const map = async (sql) => new Map((await client.query(sql)).rows.map((r) => [String(r.k), r.v]));
  const groups = await map(`SELECT filemaker_group_id AS k, id AS v FROM group_visits WHERE filemaker_group_id IS NOT NULL`);
  const places = await map(`SELECT filemaker_id AS k, id AS v FROM accommodations WHERE filemaker_id IS NOT NULL`);
  const rooms = await map(`SELECT filemaker_id AS k, id AS v FROM accommodation_rooms WHERE filemaker_id IS NOT NULL`);
  const staff = await map(`SELECT filemaker_staff_id AS k, id AS v FROM staff_members WHERE filemaker_staff_id IS NOT NULL`);
  const books = await map(`SELECT filemaker_id::text AS k, id AS v FROM materials WHERE filemaker_id IS NOT NULL`);
  const managements = await map(
    `SELECT source_record_id AS k, entity_id AS v FROM filemaker_links WHERE entity = 'organisation' AND source_database = 'SchoolMan' AND source_layout = 'Management'`
  );
  const upsert = async (table, columns, values, filemakerId) => {
    const cols = [...columns, 'filemaker_id'];
    const params = [...values, filemakerId];
    await client.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE SET ${columns.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`,
      params
    );
  };

  for (const p of data.programme) {
    const groupId = groups.get(p.group);
    if (!groupId) {
      count.notHere++;
      continue;
    }
    await upsert('group_programme', ['group_visit_id', 'day', 'starts_at', 'activity', 'meeting_point'], [groupId, p.day, p.time, p.activity, p.meeting], p.id);
    count.programme++;
  }
  for (const s of data.services) {
    const groupId = groups.get(s.group);
    if (!groupId) {
      count.notHere++;
      continue;
    }
    await upsert('group_services', ['group_visit_id', 'service', 'detail'], [groupId, s.service, s.detail], s.id);
    count.services++;
  }
  for (const i of data.internships) {
    const groupId = groups.get(i.group);
    if (!groupId) {
      count.notHere++;
      continue;
    }
    await upsert(
      'group_internships',
      ['group_visit_id', 'organisation_id', 'place', 'starts_on', 'ends_on', 'min_people', 'max_people'],
      [groupId, i.management ? (managements.get(i.management) ?? null) : null, i.place, i.from, i.to && i.from && i.to < i.from ? i.from : i.to, i.min, i.max],
      i.id
    );
    count.internships++;
  }

  // A publisher is an organisation („Verlag"): by its `Editorial` record, else its `Management`, else made.
  const publisherOrg = new Map();
  for (const o of data.orders) {
    if (!o.publisherId || !o.publisher?.name || publisherOrg.has(o.publisherId)) continue;
    let orgId = (
      await client.query(
        `SELECT entity_id FROM filemaker_links WHERE entity = 'organisation' AND source_database = 'SchoolMan' AND source_layout = 'Editorial' AND source_record_id = $1`,
        [o.publisherId]
      )
    ).rows[0]?.entity_id;
    orgId ??= o.publisher.management ? managements.get(o.publisher.management) : undefined;
    orgId ??= (await client.query(`SELECT id FROM organisations WHERE lower(name) = lower($1) LIMIT 1`, [o.publisher.name])).rows[0]?.id;
    if (!orgId) {
      orgId = (
        await client.query(`INSERT INTO organisations (name, kind, language, relation) VALUES ($1, 'company', 'de', 'publisher') RETURNING id`, [o.publisher.name])
      ).rows[0].id;
      count.publishersMade++;
    } else {
      await client.query(`UPDATE organisations SET relation = coalesce(relation, 'publisher') WHERE id = $1`, [orgId]);
    }
    await client.query(
      `INSERT INTO filemaker_links (entity, entity_id, source_database, source_layout, source_record_id, source_primary_key)
       VALUES ('organisation', $1, 'SchoolMan', 'Editorial', $2, $2) ON CONFLICT DO NOTHING`,
      [orgId, o.publisherId]
    );
    publisherOrg.set(o.publisherId, orgId);
  }
  for (const o of data.orders) {
    await upsert(
      'book_orders',
      ['organisation_id', 'ordered_on', 'done', 'email', 'ordered_by_name'],
      [o.publisherId ? (publisherOrg.get(o.publisherId) ?? null) : null, o.day, o.done, o.email, o.by],
      o.id
    );
    const orderId = (await client.query(`SELECT id FROM book_orders WHERE filemaker_id = $1`, [o.id])).rows[0].id;
    count.orders++;
    for (const l of o.lines) {
      await upsert(
        'book_order_lines',
        ['order_id', 'material_id', 'title', 'quantity', 'unit_net', 'net'],
        [orderId, l.book ? (books.get(l.book) ?? null) : null, l.title, l.quantity, l.unit, l.net],
        l.id
      );
      count.lines++;
    }
  }

  for (const k of data.keys) {
    await upsert('staff_keys', ['number', 'kind', 'holder_id', 'is_active', 'note'], [k.number, k.kind, k.holder ? (staff.get(k.holder) ?? null) : null, k.active, k.note], k.id);
    count.keys++;
  }

  for (const j of data.jobs) {
    const placeId = places.get(j.place);
    if (!placeId) {
      count.notHere++;
      continue;
    }
    await upsert('cleaning_jobs', ['accommodation_id', 'job_de', 'job_en', 'filemaker_ref'], [placeId, j.de, j.en, j.ref], j.id);
    count.jobs++;
  }
  for (const w of data.weeks) {
    const placeId = places.get(w.place);
    if (!placeId) {
      count.notHere++;
      continue;
    }
    // The week's job by its number (0069): SchoolMan ties it to no task list.
    await upsert(
      'cleaning_weeks',
      ['accommodation_id', 'room_id', 'job_number', 'starts_on', 'ends_on'],
      [placeId, w.room ? (rooms.get(w.room) ?? null) : null, /^\d{1,3}$/.test(w.ref ?? '') ? Number(w.ref) : null, w.from, w.to],
      w.id
    );
    count.weeks++;
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
  `programme ${count.programme} · services ${count.services} · internship places ${count.internships} · book orders ${count.orders} (${count.lines} lines, ` +
    `${count.publishersMade} publishers new) · keys ${count.keys} · cleaning jobs ${count.jobs}, weeks ${count.weeks} · ${count.notHere} not here`
);
