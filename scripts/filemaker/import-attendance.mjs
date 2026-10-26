/**
 * Puts the Klassenbuch's attendance, as SchoolMan holds it, beside the sample's bookings (2026-10-18,
 * migration 0064; docs/ADMIN_WORKSPACE.md §Attendance).
 *
 *   python3 -I scripts/filemaker/read_attendance.py | DATABASE_URL=... node scripts/filemaker/import-attendance.mjs [--dry-run]
 *
 * Run after the learners and the lesson days. One transaction, in batches; prints counts only. A row keeps
 * SchoolMan's number and a re-run updates it: attendance is the Klassenbuch's, and the workspace reads it.
 */
import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const rows = await readStdin();
const client = await connect();
const count = { read: rows.length, written: 0, notHere: 0, withDay: 0 };
const BATCH = 2000;

try {
  await client.query('BEGIN');
  const bookings = new Map((await client.query(`SELECT filemaker_booking_id AS k, id AS v FROM bookings WHERE filemaker_booking_id IS NOT NULL`)).rows.map((r) => [r.k, r.v]));
  const days = new Map((await client.query(`SELECT filemaker_id AS k, id AS v FROM course_days WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [r.k, r.v]));
  const kept = rows.filter((r) => bookings.has(r.booking));
  count.notHere = rows.length - kept.length;
  for (let i = 0; i < kept.length; i += BATCH) {
    const part = kept.slice(i, i + BATCH);
    const col = (f) => part.map(f);
    const result = await client.query(
      `INSERT INTO booking_attendance (booking_id, course_day_id, day, present, absence, sick_note, minutes_late, lessons, comment, filemaker_id)
       SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::date[], $4::boolean[], $5::text[], $6::text[], $7::smallint[], $8::numeric[], $9::text[], $10::text[])
       ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
         SET booking_id = EXCLUDED.booking_id, course_day_id = EXCLUDED.course_day_id, day = EXCLUDED.day, present = EXCLUDED.present, absence = EXCLUDED.absence,
             sick_note = EXCLUDED.sick_note, minutes_late = EXCLUDED.minutes_late, lessons = EXCLUDED.lessons, comment = EXCLUDED.comment`,
      [
        col((r) => bookings.get(r.booking)),
        col((r) => days.get(r.courseDay) ?? null),
        col((r) => r.day),
        col((r) => r.present),
        col((r) => r.absence),
        col((r) => r.sickNote),
        col((r) => r.late),
        col((r) => r.lessons),
        col((r) => r.comment?.slice(0, 2000) ?? null),
        col((r) => r.id),
      ]
    );
    count.written += result.rowCount;
    count.withDay += part.filter((r) => days.has(r.courseDay)).length;
  }
  // FileMaker's generated birthday notes are not a teacher's comment (read_attendance.py), also on rows
  // this run did not read.
  await client.query(`UPDATE booking_attendance SET comment = NULL WHERE filemaker_id IS NOT NULL AND comment ~* '^\\s*hat (heute|morgen) Geburtstag\\W*$'`);
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(`${count.read} attendance rows read: ${count.written} written (${count.withDay} on a lesson day here) · ${count.notHere} on bookings not here`);
