/**
 * Puts SchoolMan's working-time balances into `staff_time_months` and `staff_time_years` (2026-10-22, 0082),
 * for the tab „Stunden" on a colleague's page.
 *
 *   python3 -I scripts/filemaker/read_time.py | DATABASE_URL=... node scripts/filemaker/import-time.mjs [--dry-run]
 *
 * One transaction; prints counts only. Matched on SchoolMan's staff number; a month or a year keeps
 * SchoolMan's reference, and a re-run writes it again — SchoolMan's time sheet is the one kept by finance.
 */
import { connect } from '../db/client.mjs';
import { changes } from './bridge-changes.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const { months, years } = await readStdin();
const client = await connect();
const count = { months: 0, years: 0, noColleague: 0 };

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
      `INSERT INTO staff_time_months (staff_member_id, month, balance_hours, running_hours, holiday_days_left, approved, filemaker_ref)
       VALUES ($1, ($2 || '-01')::date, $3, $4, $5, $6, $7)
       ON CONFLICT (staff_member_id, month) DO UPDATE
         SET balance_hours = EXCLUDED.balance_hours, running_hours = EXCLUDED.running_hours, holiday_days_left = EXCLUDED.holiday_days_left,
             approved = EXCLUDED.approved, filemaker_ref = EXCLUDED.filemaker_ref, updated_at = timezone('utc', now())`,
      [member, m.month, m.balance, m.running, m.holidayLeft, m.approved, `SingleMonthStaff:${m.ref}`]
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
      `INSERT INTO staff_time_years (staff_member_id, year, holiday_days, holiday_days_left, running_hours, filemaker_ref)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (staff_member_id, year) DO UPDATE
         SET holiday_days = EXCLUDED.holiday_days, holiday_days_left = EXCLUDED.holiday_days_left, running_hours = EXCLUDED.running_hours,
             filemaker_ref = EXCLUDED.filemaker_ref, updated_at = timezone('utc', now())`,
      [member, y.year, y.holidays, y.holidaysLeft, y.running, `SingleYearStaff:${y.ref}`]
    );
    count.years++;
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
  `${count.months} months and ${count.years} years of working time written · ${count.unchanged ?? 0} as last time · skipped: ${count.noColleague} of a colleague not here`
);
