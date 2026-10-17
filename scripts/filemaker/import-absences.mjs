/**
 * Puts SchoolMan's staff absences into `staff_absences` (2026-10-17, docs/ADMIN_WORKSPACE.md §Staff),
 * so Kursplanung, the course pages and a day's teacher choices know who is ill or on holiday.
 *
 *   python3 -I scripts/filemaker/read_absences.py | DATABASE_URL=... node scripts/filemaker/import-absences.mjs [--dry-run]
 *
 * One transaction; prints counts only. Matched on SchoolMan's staff number
 * (`staff_members.filemaker_staff_id`). A day keeps SchoolMan's reference (`filemaker_ref`
 * `SingleDayStaff:<id>`): a re-run updates those days, and removes those SchoolMan no longer marks
 * within the window it read (a holiday taken back). A day entered in the workspace is never touched.
 */
import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const rows = await readStdin();
const client = await connect();
const count = { read: rows.length, written: 0, kept: 0, removed: 0, noColleague: 0 };

try {
  await client.query('BEGIN');
  const staff = new Map(
    (await client.query(`SELECT id, filemaker_staff_id::text AS fm FROM staff_members WHERE filemaker_staff_id IS NOT NULL`)).rows.map((r) => [r.fm, r.id])
  );
  const refs = [];
  for (const r of rows) {
    const member = staff.get(r.staff);
    if (!member) {
      count.noColleague++;
      continue;
    }
    const ref = `SingleDayStaff:${r.ref}`;
    refs.push(ref);
    // The workspace's own entry for that day wins; SchoolMan's own day is brought up to date.
    const result = await client.query(
      `INSERT INTO staff_absences (staff_member_id, on_date, reason, filemaker_ref) VALUES ($1, $2::date, $3, $4)
       ON CONFLICT (staff_member_id, on_date) DO UPDATE SET reason = EXCLUDED.reason, filemaker_ref = EXCLUDED.filemaker_ref
         WHERE staff_absences.filemaker_ref LIKE 'SingleDayStaff:%'`,
      [member, r.date, r.reason, ref]
    );
    if (result.rowCount) count.written++;
    else count.kept++;
  }
  const dates = rows.map((r) => r.date).sort();
  if (dates.length) {
    const removed = await client.query(
      `DELETE FROM staff_absences WHERE filemaker_ref LIKE 'SingleDayStaff:%' AND on_date BETWEEN $1::date AND $2::date AND NOT (filemaker_ref = ANY($3::text[]))`,
      [dates[0], dates[dates.length - 1], refs]
    );
    count.removed = removed.rowCount;
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
  `${count.read} absent days read: ${count.written} written · ${count.kept} kept as entered here · ${count.removed} no longer in SchoolMan · skipped: ${count.noColleague} of a colleague not here`
);
