/**
 * Puts SchoolMan's calendar day into the Tagesplan (2026-10-19, migration 0071): the day's to-dos into
 * `day_tasks`, who works at reception or in the office behind it into `staff_members.desk`, and
 * reception's usual week into `staff_shifts`.
 *
 *   python3 -I scripts/filemaker/read_day.py | DATABASE_URL=... node scripts/filemaker/import-day.mjs [--dry-run]
 *
 * Run after the staff. One transaction; prints counts only. Every row is written only when something
 * differs, so a re-run changes nothing (the `set_updated_at` triggers would otherwise stamp every row).
 *
 * - A to-do keeps SchoolMan's number (`filemaker_id`); a re-run brings its day, times, text and author
 *   up to date. Its title stands before its text, and the colleague it is for is its assignee (0094). Its status is the workspace's once read across: SchoolMan can only mark a task done,
 *   never reopen it, and never one a colleague closed here (`done_by`). A task written here is never
 *   touched, and nothing is deleted.
 * - A desk is set to SchoolMan's front or back where it differs; a colleague SchoolMan gives neither
 *   keeps whatever the workspace says.
 * - A shift is written only for the weekdays the reader worked out; a colleague's other weekdays,
 *   entered here, stay.
 */
import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const data = await readStdin();
const client = await connect();
const count = {
  tasks: data.tasks.length,
  inserted: 0,
  updated: 0,
  unchanged: 0,
  desks: data.desks.length,
  desksSet: 0,
  desksSame: 0,
  shifts: data.shifts.length,
  shiftsWritten: 0,
  shiftsSame: 0,
  noColleague: 0,
};

try {
  await client.query('BEGIN');
  // Whom a task is for (0094): the first colleague it names who has a workspace account; any other it names
  // is written under its text.
  const colleagues = new Map(
    (
      await client.query(
        `SELECT m.filemaker_staff_id::text AS fm, m.staff_user_id, trim(concat_ws(' ', p.first_name, p.last_name)) AS name
           FROM staff_members m JOIN people p ON p.id = m.person_id WHERE m.filemaker_staff_id IS NOT NULL`
      )
    ).rows.map((r) => [r.fm, r])
  );
  for (const t of data.tasks) {
    const named = (t.for ?? []).map((fm) => colleagues.get(fm)).filter(Boolean);
    const assignee = named.find((c) => c.staff_user_id) ?? null;
    const others = named.filter((c) => c !== assignee).map((c) => c.name);
    const body = others.length ? `${t.body}\nAuch für: ${others.join(', ')}`.slice(0, 2000) : t.body;
    // xmax = 0 only on a freshly inserted row; an update that the WHERE turns down returns no row.
    const result = await client.query(
      `INSERT INTO day_tasks (on_date, starts_at, ends_at, body, status, author_name, filemaker_id, done_at, assignee_id)
       VALUES ($1::date, $2::time, $3::time, $4, $5, $6, $7, CASE WHEN $5 = 'done' THEN now() END, $8)
       ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE SET
         on_date = EXCLUDED.on_date, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
         body = EXCLUDED.body, author_name = EXCLUDED.author_name, assignee_id = coalesce(EXCLUDED.assignee_id, day_tasks.assignee_id),
         status = CASE WHEN day_tasks.done_by IS NULL AND EXCLUDED.status = 'done' THEN 'done' ELSE day_tasks.status END,
         done_at = CASE WHEN day_tasks.done_by IS NULL AND EXCLUDED.status = 'done' AND day_tasks.status <> 'done' THEN now() ELSE day_tasks.done_at END
       WHERE (day_tasks.on_date, day_tasks.starts_at, day_tasks.ends_at, day_tasks.body, day_tasks.author_name)
               IS DISTINCT FROM (EXCLUDED.on_date, EXCLUDED.starts_at, EXCLUDED.ends_at, EXCLUDED.body, EXCLUDED.author_name)
          OR (EXCLUDED.assignee_id IS NOT NULL AND day_tasks.assignee_id IS DISTINCT FROM EXCLUDED.assignee_id)
          OR (day_tasks.done_by IS NULL AND EXCLUDED.status = 'done' AND day_tasks.status <> 'done')
       RETURNING (xmax = 0) AS inserted`,
      [t.date, t.start, t.end, body, t.status, t.author, t.id, assignee?.staff_user_id ?? null]
    );
    if (!result.rowCount) count.unchanged++;
    else if (result.rows[0].inserted) count.inserted++;
    else count.updated++;
  }

  const staff = new Map(
    (await client.query(`SELECT filemaker_staff_id::text AS fm, id FROM staff_members WHERE filemaker_staff_id IS NOT NULL`)).rows.map((r) => [r.fm, r.id])
  );
  for (const d of data.desks) {
    const member = staff.get(d.staff);
    if (!member) {
      count.noColleague++;
      continue;
    }
    const result = await client.query(`UPDATE staff_members SET desk = $2 WHERE id = $1 AND desk IS DISTINCT FROM $2`, [member, d.desk]);
    if (result.rowCount) count.desksSet++;
    else count.desksSame++;
  }
  for (const s of data.shifts) {
    const member = staff.get(s.staff);
    if (!member) {
      count.noColleague++;
      continue;
    }
    const result = await client.query(
      `INSERT INTO staff_shifts (staff_member_id, weekday, starts_at, ends_at) VALUES ($1, $2, $3::time, $4::time)
       ON CONFLICT (staff_member_id, weekday) DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at
         WHERE (staff_shifts.starts_at, staff_shifts.ends_at) IS DISTINCT FROM (EXCLUDED.starts_at, EXCLUDED.ends_at)`,
      [member, s.weekday, s.start, s.end]
    );
    if (result.rowCount) count.shiftsWritten++;
    else count.shiftsSame++;
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
  `${process.argv.includes('--dry-run') ? '[dry run, rolled back] ' : ''}` +
    `${count.tasks} tasks read: ${count.inserted} new · ${count.updated} updated · ${count.unchanged} unchanged | ` +
    `${count.desks} desks: ${count.desksSet} set · ${count.desksSame} already so | ` +
    `${count.shifts} weekday shifts: ${count.shiftsWritten} written · ${count.shiftsSame} already so | ` +
    `skipped: ${count.noColleague} of a colleague not here`
);
