/**
 * Puts SchoolMan's history and notes on the records no other step writes them for (2026-10-27, migration 0094;
 * docs/schoolman/letters-and-history.md): the kinds of a history line SchoolMan has and the workspace does
 * not, a place's history, and a class's notes.
 *
 *   python3 -I scripts/filemaker/read_history.py | DATABASE_URL=... node scripts/filemaker/import-history.mjs [--dry-run]
 *
 * Run after the accommodation, the courses and the learners. One transaction; prints counts only.
 *
 * - A kind of history line (`ProcessReference`) the workspace has no row for comes across with SchoolMan's
 *   names; the workspace's own names are never changed by it.
 * - A place's history is read afresh as SchoolMan has it whenever it changed (`schoolman_log` on the
 *   accommodation), each line with its kind, whether a colleague typed it, and its invoice; a place SchoolMan
 *   no longer names in any line loses the lines it had.
 * - A note on a course is a note on the workspace's course for that SchoolMan course (its own number or one of
 *   its groups'), under its SchoolMan author; a re-run updates it.
 */
import { connect } from '../db/client.mjs';
import { changes } from './bridge-changes.mjs';
import { historyProcesses, logDetail } from './history-line.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const data = await readStdin();
const client = await connect();
const count = { processes: 0, places: 0, lines: 0, placesCleared: 0, notes: 0, notHere: 0 };

try {
  await client.query('BEGIN');
  // A kind SchoolMan has that the workspace does not, with SchoolMan's names.
  for (const p of data.processes ?? []) {
    count.processes += (
      await client.query(
        `INSERT INTO history_processes (code, name_de, name_en, position, filemaker_id) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [`schoolman_${p.id}`, p.de ?? p.en ?? `SchoolMan ${p.id}`, p.en ?? p.de ?? `SchoolMan ${p.id}`, 100 + Number(p.id), Number(p.id)]
      )
    ).rowCount;
  }
  const processes = await historyProcesses(client);

  const map = async (sql) => new Map((await client.query(sql)).rows.map((r) => [String(r.k), r.v]));
  const places = await map(`SELECT filemaker_id AS k, id AS v FROM accommodations WHERE filemaker_id IS NOT NULL`);
  const changed = await changes(client, 'history');

  // A place's history, as SchoolMan has it now.
  const withLines = [];
  for (const p of data.places ?? []) {
    const placeId = places.get(p.place);
    if (!placeId) {
      count.notHere++;
      continue;
    }
    withLines.push(placeId);
    if (changed.same(`place:${p.place}`, [p, placeId, [...processes].sort()])) continue;
    await client.query(`DELETE FROM staff_activity WHERE action = 'schoolman_log' AND entity = 'accommodation' AND entity_id = $1`, [placeId]);
    count.lines += (
      await client.query(
        `INSERT INTO staff_activity (staff_name, entity, entity_id, action, detail, created_at)
         SELECT coalesce(v.author, 'SchoolMan'), 'accommodation', $1, 'schoolman_log', v.detail,
                coalesce(v.at::timestamp AT TIME ZONE 'Europe/Berlin', timezone('utc', now()))
           FROM unnest($2::text[], $3::jsonb[], $4::text[]) AS v(author, detail, at)`,
        [placeId, p.log.map((w) => w.author), p.log.map((w) => JSON.stringify(logDetail(w, processes))), p.log.map((w) => w.at)]
      )
    ).rowCount;
    count.places++;
  }
  count.placesCleared = (
    await client.query(`DELETE FROM staff_activity WHERE action = 'schoolman_log' AND entity = 'accommodation' AND NOT (entity_id = ANY($1::uuid[]))`, [withLines])
  ).rowCount;

  // A class's notes, on the workspace's course for SchoolMan's course (its number, or a group's).
  const courses = new Map();
  for (const r of (await client.query(`SELECT id, filemaker_course_id, filemaker_group_ids FROM courses WHERE filemaker_course_id IS NOT NULL OR filemaker_group_ids IS NOT NULL`)).rows) {
    for (const fm of r.filemaker_group_ids ?? []) courses.set(String(fm), r.id);
    if (r.filemaker_course_id && !courses.has(String(r.filemaker_course_id))) courses.set(String(r.filemaker_course_id), r.id);
  }
  for (const n of data.courseNotes ?? []) {
    const courseId = courses.get(n.course);
    if (!courseId) {
      count.notHere++;
      continue;
    }
    if (changed.same(`course-note:${n.ref}`, [n, courseId])) continue;
    await client.query(
      `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
       VALUES ('course', $1, $2, $3, $4, coalesce($5::timestamp AT TIME ZONE 'Europe/Berlin', now()))
       ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE
         SET entity = EXCLUDED.entity, entity_id = EXCLUDED.entity_id, body = EXCLUDED.body, author_name = EXCLUDED.author_name, created_at = EXCLUDED.created_at`,
      [courseId, n.body.slice(0, 20000), n.author ?? 'SchoolMan', n.ref, n.at]
    );
    count.notes++;
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
  `${count.processes} kinds of history line added · ${count.places} places' history written (${count.lines} lines), ${count.placesCleared} lines of places SchoolMan no longer names removed · ` +
    `${count.notes} notes on a course · ${count.notHere} not here · ${count.unchanged ?? 0} as last time`
);
