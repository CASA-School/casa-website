/**
 * Puts SchoolMan's working-time balances into `staff_time_months` and `staff_time_years` (2026-10-22, 0082),
 * for the tab „Stunden" on a colleague's page.
 *
 *   python3 -I scripts/filemaker/read_time.py | DATABASE_URL=... node scripts/filemaker/import-time.mjs [--dry-run]
 *
 * One transaction; prints counts only. Matched on SchoolMan's staff number; a month or a year keeps
 * SchoolMan's reference, and a re-run writes it again — SchoolMan's time sheet is the one kept by finance.
 *
 * Since 2026-10-27 (0092) also the day a month was approved, the hours carried into a year, and the rest
 * of the time sheet, each row keeping SchoolMan's number: the target hours per weekday (`staff_target_days`),
 * the time worked outside the lessons (`staff_work_entries`, with the exam or course it was for), the leave
 * requests (`staff_leave_requests`). A row SchoolMan no longer
 * has goes — only after a read that went through (`complete`), never after one FileMaker refused.
 */
import { connect } from '../db/client.mjs';
import { changes } from './bridge-changes.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const { months, years, targets = [], work = [], leave = [], complete = false } = await readStdin();
const client = await connect();
const count = { months: 0, years: 0, noColleague: 0, targets: 0, work: 0, leave: 0, removed: 0 };

try {
  await client.query('BEGIN');
  const staff = new Map(
    (await client.query(`SELECT id, filemaker_staff_id::text AS fm FROM staff_members WHERE filemaker_staff_id IS NOT NULL`)).rows.map((r) => [r.fm, r.id])
  );
  // A month or year as it was last time is passed over (0088).
  const changed = await changes(client, 'time');
  for (const m of months) {
    const member = staff.get(m.staff);
    if (!member) {
      count.noColleague++;
      continue;
    }
    if (changed.same(`month:${member}:${m.month}`, m)) continue;
    await client.query(
      `INSERT INTO staff_time_months (staff_member_id, month, balance_hours, running_hours, holiday_days_left, approved, filemaker_ref, approved_on)
       VALUES ($1, ($2 || '-01')::date, $3, $4, $5, $6, $7, $8::date)
       ON CONFLICT (staff_member_id, month) DO UPDATE
         SET balance_hours = EXCLUDED.balance_hours, running_hours = EXCLUDED.running_hours, holiday_days_left = EXCLUDED.holiday_days_left,
             approved = EXCLUDED.approved, filemaker_ref = EXCLUDED.filemaker_ref, approved_on = EXCLUDED.approved_on,
             updated_at = timezone('utc', now())`,
      [member, m.month, m.balance, m.running, m.holidayLeft, m.approved, `SingleMonthStaff:${m.ref}`, m.approvedOn ?? null]
    );
    count.months++;
  }
  for (const y of years) {
    const member = staff.get(y.staff);
    if (!member) {
      count.noColleague++;
      continue;
    }
    if (changed.same(`year:${member}:${y.year}`, y)) continue;
    await client.query(
      `INSERT INTO staff_time_years (staff_member_id, year, holiday_days, holiday_days_left, running_hours, filemaker_ref, carried_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (staff_member_id, year) DO UPDATE
         SET holiday_days = EXCLUDED.holiday_days, holiday_days_left = EXCLUDED.holiday_days_left, running_hours = EXCLUDED.running_hours,
             filemaker_ref = EXCLUDED.filemaker_ref, carried_hours = EXCLUDED.carried_hours, updated_at = timezone('utc', now())`,
      [member, y.year, y.holidays, y.holidaysLeft, y.running, `SingleYearStaff:${y.ref}`, y.carried ?? null]
    );
    count.years++;
  }

  // The target hours per weekday of each contract period.
  const seenTargets = [];
  for (const d of targets) {
    const member = staff.get(d.staff);
    if (!member) continue;
    seenTargets.push(d.ref);
    if (changed.same(`target:${d.ref}`, [member, d])) continue;
    await client.query(
      `INSERT INTO staff_target_days (staff_member_id, valid_from, valid_to, weekday, hours, starts_at, ends_at, break_minutes, filemaker_id)
       VALUES ($1, $2::date, $3::date, $4, $5, $6::time, $7::time, $8, $9)
       ON CONFLICT (filemaker_id) DO UPDATE
         SET staff_member_id = EXCLUDED.staff_member_id, valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, weekday = EXCLUDED.weekday,
             hours = EXCLUDED.hours, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, break_minutes = EXCLUDED.break_minutes`,
      [member, d.from, d.from && d.to && d.to < d.from ? null : d.to, d.weekday, d.hours, d.start, d.end, d.break === null ? null : Math.max(0, Math.round(d.break)), d.ref]
    );
    count.targets++;
  }

  // Time worked outside the lessons, with the exam sitting or the course it was for where the workspace has it.
  const sittings = new Map((await client.query(`SELECT filemaker_exam_id AS fm, id FROM exam_sessions WHERE filemaker_exam_id IS NOT NULL`)).rows.map((r) => [r.fm, r.id]));
  const courses = new Map((await client.query(`SELECT filemaker_course_id AS fm, id FROM courses WHERE filemaker_course_id IS NOT NULL`)).rows.map((r) => [r.fm, r.id]));
  const seenWork = [];
  for (const w of work) {
    const member = staff.get(w.staff);
    if (!member) continue;
    seenWork.push(w.ref);
    const exam = sittings.get(w.exam ?? '') ?? null;
    const course = courses.get(w.course ?? '') ?? null;
    if (changed.same(`work:${w.ref}`, [member, w, exam, course])) continue;
    await client.query(
      `INSERT INTO staff_work_entries (staff_member_id, on_date, kind, hours, starts_at, ends_at, note, exam_session_id, course_id, filemaker_id)
       VALUES ($1, $2::date, $3, $4, $5::time, $6::time, $7, $8, $9, $10)
       ON CONFLICT (filemaker_id) DO UPDATE
         SET staff_member_id = EXCLUDED.staff_member_id, on_date = EXCLUDED.on_date, kind = EXCLUDED.kind, hours = EXCLUDED.hours, starts_at = EXCLUDED.starts_at,
             ends_at = EXCLUDED.ends_at, note = EXCLUDED.note, exam_session_id = EXCLUDED.exam_session_id, course_id = EXCLUDED.course_id`,
      [member, w.date, w.kind, w.hours, w.start, w.end, w.note, exam, course, w.ref]
    );
    count.work++;
  }

  // The leave requests: kind, from–to, the working days and those approved.
  const seenLeave = [];
  for (const r of leave) {
    const member = staff.get(r.staff);
    if (!member) continue;
    seenLeave.push(r.ref);
    if (changed.same(`leave:${r.ref}`, [member, r])) continue;
    await client.query(
      `INSERT INTO staff_leave_requests (staff_member_id, kind, starts_on, ends_on, days, approved_days, note, filemaker_id)
       VALUES ($1, $2, $3::date, $4::date, $5::date[], $6::date[], $7, $8)
       ON CONFLICT (filemaker_id) DO UPDATE
         SET staff_member_id = EXCLUDED.staff_member_id, kind = EXCLUDED.kind, starts_on = EXCLUDED.starts_on, ends_on = EXCLUDED.ends_on, days = EXCLUDED.days,
             approved_days = EXCLUDED.approved_days, note = EXCLUDED.note`,
      [member, r.kind, r.from, r.to, r.days, r.approved, r.note, r.ref]
    );
    count.leave++;
  }

  // What SchoolMan no longer has goes — after a whole read only.
  if (complete) {
    for (const [table, column, seen] of [
      ['staff_target_days', 'filemaker_id', seenTargets],
      ['staff_work_entries', 'filemaker_id', seenWork],
      ['staff_leave_requests', 'filemaker_id', seenLeave],
    ]) {
      count.removed += (await client.query(`DELETE FROM ${table} WHERE ${column} IS NOT NULL AND NOT (${column} = ANY($1::text[]))`, [seen])).rowCount;
    }
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
  `${count.months} months and ${count.years} years of working time written · ${count.unchanged ?? 0} as last time · skipped: ${count.noColleague} of a colleague not here\n` +
    `${count.targets} target days, ${count.work} work entries, ${count.leave} leave requests written · ${count.removed} no longer in SchoolMan removed`
);
