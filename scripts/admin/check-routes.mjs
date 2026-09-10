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

const [enquiry, courseReg, examReg, person, booking, room, attempt, application] =
  await Promise.all([
    firstId(`SELECT id FROM enquiries ORDER BY submitted_at DESC LIMIT 1`),
    firstId(`SELECT id FROM course_registrations ORDER BY submitted_at DESC LIMIT 1`),
    firstId(`SELECT id FROM exam_registrations ORDER BY submitted_at DESC LIMIT 1`),
    firstId(`SELECT id FROM people WHERE deleted_at IS NULL AND merged_into IS NULL LIMIT 1`),
    firstId(`SELECT id FROM bookings WHERE deleted_at IS NULL LIMIT 1`),
    firstId(`SELECT id FROM rooms LIMIT 1`),
    firstId(`SELECT id FROM placement_attempts ORDER BY created_at DESC LIMIT 1`),
    firstId(`SELECT id FROM career_applications ORDER BY created_at DESC LIMIT 1`),
  ]);

const routes = [
  '/admin',
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
  '/admin/catalogue',
  '/admin/catalogue/exams',
  '/admin/planning',
  room && `/admin/planning/rooms/${room}`,
  '/admin/applications',
  application && `/admin/applications/${application}`,
  '/admin/activity',
  '/admin/team',
  '/admin/settings',
  '/admin/settings/setup',
  '/admin/settings/setup?tab=types',
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
