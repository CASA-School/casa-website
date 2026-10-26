/**
 * SchoolMan's exam parts onto the sittings here (2026-10-26, mapping review §5; docs/schoolman/bridge-gaps.md #6).
 *
 *   python3 -I scripts/filemaker/read_exams.py | DATABASE_URL=... node scripts/filemaker/import-exams.mjs [--dry-run]
 *
 * Run after the learners, whose exam bookings link the sittings (`filemaker_exam_id`). One transaction;
 * prints counts only.
 *
 * - A sitting takes the real hours of its parts — unless a colleague created or changed it here.
 * - The examiners of its parts come across (`exam_session_examiners`, written, oral or the whole exam);
 *   one a colleague added here is never changed or removed.
 */
import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const exams = await readStdin();
const client = await connect();
const count = { read: exams.length, timed: 0, examiners: 0, examinersGone: 0, keptHere: 0, notHere: 0, unknownExaminer: 0 };

try {
  await client.query('BEGIN');
  const sittings = new Map(
    (
      await client.query(
        `SELECT s.filemaker_exam_id, s.id,
                EXISTS (SELECT 1 FROM staff_activity a WHERE a.entity = 'exam_session' AND a.entity_id = s.id AND a.action IN ('sitting_created', 'sitting_updated')) AS changed_here
           FROM exam_sessions s WHERE s.filemaker_exam_id IS NOT NULL`
      )
    ).rows.map((r) => [r.filemaker_exam_id, r])
  );
  const staff = new Map((await client.query(`SELECT filemaker_staff_id::text AS k, id FROM staff_members WHERE filemaker_staff_id IS NOT NULL`)).rows.map((r) => [r.k, r.id]));

  for (const e of exams) {
    const sitting = sittings.get(e.exam);
    if (!sitting) {
      count.notHere++;
      continue;
    }
    if (sitting.changed_here) count.keptHere++;
    else if (e.from && e.to && e.to > e.from) {
      count.timed += (
        await client.query(
          `UPDATE exam_sessions SET starts_at = ($2::date + $3::time) AT TIME ZONE 'Europe/Berlin', ends_at = ($2::date + $4::time) AT TIME ZONE 'Europe/Berlin'
            WHERE id = $1 AND (starts_at, ends_at) IS DISTINCT FROM (($2::date + $3::time) AT TIME ZONE 'Europe/Berlin', ($2::date + $4::time) AT TIME ZONE 'Europe/Berlin')`,
          [sitting.id, e.day, e.from, e.to]
        )
      ).rowCount;
    }
    const examiners = e.examiners.flatMap((x) => (staff.has(x.staff) ? [{ id: staff.get(x.staff), part: x.part }] : []));
    count.unknownExaminer += e.examiners.length - examiners.length;
    for (const x of examiners) {
      count.examiners += (
        await client.query(
          `INSERT INTO exam_session_examiners (exam_session_id, staff_member_id, part) VALUES ($1, $2, $3)
           ON CONFLICT (exam_session_id, staff_member_id) DO UPDATE SET part = EXCLUDED.part
             WHERE exam_session_examiners.created_by IS NULL AND exam_session_examiners.part IS DISTINCT FROM EXCLUDED.part`,
          [sitting.id, x.id, x.part]
        )
      ).rowCount;
    }
    count.examinersGone += (
      await client.query(`DELETE FROM exam_session_examiners WHERE exam_session_id = $1 AND created_by IS NULL AND NOT (staff_member_id = ANY($2::uuid[]))`, [
        sitting.id,
        examiners.map((x) => x.id),
      ])
    ).rowCount;
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
  `${count.read} exams with parts read: ${count.timed} sittings given their real hours, ${count.keptHere} changed here (hours kept) · ` +
    `${count.examiners} examiners written, ${count.examinersGone} no longer in SchoolMan removed · ${count.notHere} without a sitting here · ${count.unknownExaminer} examiners not here`
);
