/**
 * Loads every workspace screen against the local database and reports any that
 * fail.
 *
 * WHY THIS EXISTS
 *
 * The workspace's reads are raw SQL. A wrong column name is invisible to
 * `tsc`, to eslint and to `next build` — the query is just a string — and the
 * first thing that notices is a colleague opening the page. That is exactly
 * how `ORDER BY position` against `levels` (whose column is `sort_order`)
 * reached the Courses screen.
 *
 * So: start the dev server, run this, and every screen is fetched once with a
 * real session. It is a smoke test, not an assertion suite — it proves the
 * queries run and the pages render, nothing about what they say.
 *
 *   npm run dev            # in another terminal
 *   npm run admin:check    # BASE=http://localhost:3002 to point elsewhere
 *
 * The session it creates is deleted on the way out, including if a fetch
 * throws: a live token left in the database is worse than a red run.
 */
import { createHash, randomBytes } from 'node:crypto';
import { Client } from 'pg';

const BASE = process.env.BASE ?? 'http://localhost:3002';
const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Source .env.local first.');
  process.exit(2);
}

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();

/** One id per detail screen, or null when the table is empty. */
async function firstId(sql) {
  const { rows } = await client.query(sql);
  return rows[0]?.id ?? null;
}

const [enquiry, courseReg, examReg, person, booking, room, attempt, application, offer, start, letter, entry, sitting, examBooking, staffMember] =
  await Promise.all([
    firstId(`SELECT id FROM enquiries ORDER BY submitted_at DESC LIMIT 1`),
    firstId(`SELECT id FROM course_registrations ORDER BY submitted_at DESC LIMIT 1`),
    firstId(`SELECT id FROM exam_registrations ORDER BY submitted_at DESC LIMIT 1`),
    // A learner: a colleague's person page sends to their staff page (0039).
    firstId(`SELECT id FROM people p WHERE deleted_at IS NULL AND merged_into IS NULL
              AND NOT EXISTS (SELECT 1 FROM staff_members s WHERE s.person_id = p.id) LIMIT 1`),
    firstId(`SELECT id FROM bookings WHERE deleted_at IS NULL LIMIT 1`),
    firstId(`SELECT id FROM rooms LIMIT 1`),
    firstId(`SELECT id FROM placement_attempts ORDER BY created_at DESC LIMIT 1`),
    firstId(`SELECT id FROM career_applications ORDER BY created_at DESC LIMIT 1`),
    firstId(`SELECT id FROM offers WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`),
    // A course start, the one with a waiting list if any: its page reads the queues.
    firstId(`SELECT i.id FROM course_instances i LEFT JOIN waitlist_entries w ON w.course_instance_id = i.id
              WHERE i.end_date >= current_date GROUP BY i.id ORDER BY count(w.id) DESC, min(i.start_date) LIMIT 1`),
    firstId(`SELECT id FROM letters ORDER BY sent_at DESC LIMIT 1`),
    firstId(`SELECT id FROM waitlist_entries ORDER BY joined_at DESC LIMIT 1`),
    // An exam sitting, the one with the most candidates; and an exam booking (0036).
    firstId(`SELECT s.id FROM exam_sessions s LEFT JOIN bookings b ON b.exam_session_id = s.id
              WHERE s.starts_at >= current_date GROUP BY s.id ORDER BY count(b.id) DESC, min(s.starts_at) LIMIT 1`),
    firstId(`SELECT id FROM bookings WHERE exam_session_id IS NOT NULL AND deleted_at IS NULL LIMIT 1`),
    // A colleague, the one most on the board: every tab of their page reads (0039).
    firstId(`SELECT s.id FROM staff_members s LEFT JOIN course_days a ON a.teacher_id = s.id GROUP BY s.id ORDER BY count(a.*) DESC LIMIT 1`),
  ]);

const routes = [
  '/admin',
  '/admin/kursplanung',
  '/admin/kursplanung/kurse',
  '/admin/kursplanung/lehrkraefte',
  '/admin?date=2026-01-05',
  '/admin/enquiries',
  enquiry && `/admin/enquiries/${enquiry}`,
  '/admin/registrations/course',
  courseReg && `/admin/registrations/course/${courseReg}`,
  '/admin/registrations/exam',
  examReg && `/admin/registrations/exam/${examReg}`,
  '/admin/placement',
  attempt && `/admin/placement/${attempt}`,
  '/admin/people',
  '/admin/people/flags',
  person && `/admin/people/${person}`,
  '/admin/bookings',
  '/admin/bookings?filter=all',
  booking && `/admin/bookings/${booking}`,
  booking && `/admin/bookings/${booking}/letter`,
  booking && `/admin/bookings/${booking}/letter?kind=receipt`,
  letter && `/admin/letters/${letter}`,
  entry && `/admin/catalogue/waitlist/${entry}/letter`,
  person && `/admin/people/${person}/letter`,
  courseReg && `/admin/registrations/course/${courseReg}/letter`,
  courseReg && `/admin/registrations/course/${courseReg}/letter?kind=test`,
  '/admin/offers',
  '/admin/offers?filter=all',
  '/admin/offers/new',
  offer && `/admin/offers/${offer}`,
  offer && `/admin/offers/${offer}/letter`,
  '/admin/catalogue',
  start && `/admin/catalogue/${start}`,
  '/admin/catalogue/waitlist',
  '/admin/catalogue/waitlist?view=closed',
  '/admin/staff',
  '/admin/staff?view=former',
  staffMember && `/admin/staff/${staffMember}`,
  staffMember && `/admin/staff/${staffMember}?tab=exams`,
  '/admin/catalogue/exams',
  sitting && `/admin/catalogue/exams/${sitting}`,
  sitting && `/admin/catalogue/exams/${sitting}/telc`,
  sitting && `/admin/catalogue/exams/${sitting}/results`,
  sitting && `/admin/catalogue/exams/${sitting}/letters`,
  sitting && `/admin/catalogue/exams/${sitting}/letters?kind=participation`,
  examBooking && `/admin/bookings/${examBooking}`,
  examBooking && `/admin/bookings/${examBooking}/letter`,
  examBooking && `/admin/bookings/${examBooking}/letter?kind=invitation`,
  '/admin/settings/rooms',
  room && `/admin/settings/rooms/${room}`,
  '/admin/applications',
  application && `/admin/applications/${application}`,
  '/admin/activity',
  '/admin/team',
  '/admin/settings',
  '/admin/settings/setup',
  '/admin/settings/prices',
].filter(Boolean);

const token = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(token).digest('hex');

const { rows: owners } = await client.query(
  `SELECT id, name FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`
);

if (owners.length === 0) {
  console.error('No active owner account. Run `npm run admin:seed` first.');
  await client.end();
  process.exit(2);
}

await client.query(
  `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent)
   VALUES ($1, $2, now() + interval '10 minutes', 'admin:check')`,
  [owners[0].id, tokenHash]
);

const failed = [];

try {
  console.log(`\n${routes.length} screens as ${owners[0].name}, against ${BASE}\n`);

  for (const route of routes) {
    try {
      const response = await fetch(`${BASE}${route}`, {
        headers: { cookie: `casa_workspace_session=${token}` },
        redirect: 'manual',
      });
      const ok = response.status === 200;
      if (!ok) failed.push(`${response.status}  ${route}`);
      console.log(`  ${ok ? 'ok  ' : String(response.status).padEnd(4)} ${route}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push(`down ${route} (${message})`);
      console.log(`  down ${route} — ${message}`);
    }
  }
} finally {
  await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
  await client.end();
}

if (failed.length > 0) {
  console.error(
    `\n${failed.length} of ${routes.length} failed:\n${failed.map((f) => `  ${f}`).join('\n')}`
  );
  console.error('\nA 500 here is usually a column name that does not exist.\n');
  process.exit(1);
}

console.log(`\nAll ${routes.length} rendered.\n`);
