/**
 * Puts SchoolMan's follow-up dates on the bookings that came across (2026-10-18, migration 0062;
 * docs/ADMIN_WORKSPACE.md §Follow-ups).
 *
 *   python3 -I scripts/filemaker/read_follow_ups.py | DATABASE_URL=... node scripts/filemaker/import-follow-ups.mjs [--dry-run]
 *
 * Run after the learners. One transaction; prints counts only.
 *
 * - A follow-up keeps SchoolMan's number; a re-run updates its day and reason, never whether it is done.
 * - SchoolMan never marks one done: one whose day is more than two weeks past comes in done (on its day);
 *   the rest are open, for a colleague to look at.
 */
import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const rows = await readStdin();
const client = await connect();
const count = { read: rows.length, made: 0, updated: 0, open: 0, notHere: 0 };
const closedBefore = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

try {
  await client.query('BEGIN');
  const bookings = new Map(
    (await client.query(`SELECT id, filemaker_booking_id FROM bookings WHERE filemaker_booking_id IS NOT NULL AND deleted_at IS NULL`)).rows.map((r) => [r.filemaker_booking_id, r.id])
  );
  for (const f of rows) {
    const bookingId = bookings.get(f.booking);
    if (!bookingId) {
      count.notHere++;
      continue;
    }
    const done = f.due < closedBefore;
    const result = await client.query(
      `INSERT INTO booking_follow_ups (booking_id, due_on, reason, done_at, created_by_name, created_at, filemaker_id)
       VALUES ($1, $2, $3, CASE WHEN $4 THEN $2::date::timestamp AT TIME ZONE 'Europe/Berlin' END, $5,
               coalesce($6::timestamp AT TIME ZONE 'Europe/Berlin', timezone('utc', now())), $7)
       ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE SET due_on = EXCLUDED.due_on, reason = EXCLUDED.reason
       RETURNING (xmax = 0) AS made, done_at IS NULL AS open`,
      [bookingId, f.due, f.reason, done, f.author ?? 'SchoolMan', f.created, f.id]
    );
    if (result.rows[0].made) count.made++;
    else count.updated++;
    if (result.rows[0].open) count.open++;
  }
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(`${count.read} follow-ups read: ${count.made} new, ${count.updated} updated, ${count.open} open · ${count.notHere} on bookings not here`);
