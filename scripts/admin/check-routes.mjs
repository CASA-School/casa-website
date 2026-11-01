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

const [enquiry, courseReg, person, booking, room, attempt, application, offer, start, letter, entry, sitting, examBooking, staffMember, course, numbered, organisation, group, place, ledger, publisher, flat, keyHolder, programmeGroup, lessonDay] =
  await Promise.all([
    firstId(`SELECT id FROM enquiries ORDER BY submitted_at DESC LIMIT 1`),
    firstId(`SELECT id FROM course_registrations ORDER BY submitted_at DESC LIMIT 1`),
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
    // A course, the one with the most lesson days: its page reads days, plan and choices (0045).
    firstId(`SELECT c.id FROM courses c LEFT JOIN course_days d ON d.course_id = c.id GROUP BY c.id ORDER BY count(d.*) DESC LIMIT 1`),
    // A course of several SchoolMan numbers: each has its own page (`/<n>`).
    firstId(`SELECT id FROM courses WHERE coalesce(array_length(filemaker_group_ids, 1), 0) > 1 ORDER BY updated_at DESC LIMIT 1`),
    // An organisation, the one paying the most bookings: every tab of its page reads (0057).
    firstId(`SELECT o.id FROM organisations o LEFT JOIN bookings b ON b.payer_organisation_id = o.id GROUP BY o.id ORDER BY count(b.id) DESC, o.id LIMIT 1`),
    // A group visit, the one with the most participants: its participants tab reads their bookings (0058).
    firstId(`SELECT v.id FROM group_visits v LEFT JOIN bookings b ON b.group_visit_id = v.id GROUP BY v.id ORDER BY count(b.id) DESC, v.id LIMIT 1`),
    // A place to stay, the one with the most stays: its rooms, stays and reservations read (0060).
    firstId(`SELECT a.id FROM accommodations a LEFT JOIN booking_stays s ON s.accommodation_id = a.id GROUP BY a.id ORDER BY count(s.id) DESC, a.id LIMIT 1`),
    // A booking with SchoolMan's plan, commission and payouts on it (0063).
    firstId(`SELECT b.id FROM bookings b WHERE EXISTS (SELECT 1 FROM booking_commissions c WHERE c.booking_id = b.id)
              AND EXISTS (SELECT 1 FROM payouts p WHERE p.booking_id = b.id) ORDER BY b.number LIMIT 1`),
    // A publisher with its book orders, a CASA flat with its cleaning plan, a colleague holding keys, a group with a programme (0068).
    firstId(`SELECT o.id FROM organisations o WHERE EXISTS (SELECT 1 FROM book_orders b WHERE b.organisation_id = o.id) ORDER BY o.name LIMIT 1`),
    firstId(`SELECT a.id FROM accommodations a WHERE EXISTS (SELECT 1 FROM cleaning_weeks w WHERE w.accommodation_id = a.id) ORDER BY a.name LIMIT 1`),
    firstId(`SELECT s.id FROM staff_members s WHERE EXISTS (SELECT 1 FROM staff_keys k WHERE k.holder_id = s.id) LIMIT 1`),
    firstId(`SELECT g.id FROM group_visits g WHERE EXISTS (SELECT 1 FROM group_programme p WHERE p.group_visit_id = g.id) LIMIT 1`),
    // A lesson day with learners on it: the Tagesplan of its day reads lessons, desks and absences; its sheet the week (0071).
    firstId(`SELECT d.id FROM course_days d WHERE NOT d.cancelled AND d.on_date >= current_date - 7
              AND EXISTS (SELECT 1 FROM booking_periods bp WHERE bp.course_id = d.course_id AND bp.start_date <= d.on_date AND bp.end_date >= d.on_date)
              ORDER BY d.on_date LIMIT 1`),
  ]);
const lessonDate = lessonDay ? (await client.query(`SELECT to_char(on_date, 'YYYY-MM-DD') AS d FROM course_days WHERE id = $1`, [lessonDay])).rows[0]?.d : null;
// The next first day of an intensive A2, B1 or B1+ class: the Tagesplan's Einstufungstest card (0075).
const testDate = (
  await client.query(
    `SELECT to_char(min(d.on_date), 'YYYY-MM-DD') AS d FROM course_days d JOIN courses c ON c.id = d.course_id
       JOIN course_instances i ON i.id = c.course_instance_id JOIN course_types ty ON ty.id = i.course_type_id
      WHERE ty.slug = 'intensive-german' AND c.level_code IN ('A2.1', 'B1.1', 'B1+.1') AND d.on_date >= current_date
        AND d.on_date = (SELECT min(x.on_date) FROM course_days x WHERE x.course_id = c.id)`
  )
).rows[0]?.d;

// An Anmeldung, the one with the most lines (0097): its page reads every line's outcome and places.
const anmeldung = await firstId(`SELECT g.id FROM registrations g
  ORDER BY (SELECT count(*) FROM course_registrations c WHERE c.registration_id = g.id) + (SELECT count(*) FROM exam_registrations e WHERE e.registration_id = g.id) DESC, g.submitted_at DESC LIMIT 1`);

const routes = [
  '/admin',
  '/admin/day',
  '/admin/day?date=2026-12-24',
  lessonDate && `/admin/day?date=${lessonDate}`,
  testDate && `/admin/day?date=${testDate}`,
  '/admin/day/tests',
  '/admin/day/tests/qr?kurs=b1',
  '/admin/day/tests/booklet?kurs=b1plus&version=B',
  '/admin/day/tests/guide',
  '/admin/day/tests/codes',
  '/admin/day/tests/mail',
  '/admin/day/courses',
  '/admin/day/rooms',
  lessonDate && `/admin/day/courses?date=${lessonDate}`,
  lessonDate && `/admin/day/rooms?date=${lessonDate}`,
  course && `/admin/day/attendance?course=${course}&group=1`,
  lessonDay && `/admin/day/contacts?lesson=${lessonDay}`,
  '/admin/kursplanung',
  '/admin/kursplanung/kurse',
  '/admin?date=2026-01-05',
  '/admin/enquiries',
  enquiry && `/admin/enquiries/${enquiry}`,
  '/admin/registrations',
  '/admin/registrations?view=history',
  anmeldung && `/admin/registrations/${anmeldung}`,
  anmeldung && `/admin/registrations/${anmeldung}?book=${courseReg}`,
  // A line's own address (`/admin/registrations/course/<id>`) is a redirect to its Anmeldung since 0097.
  '/admin/placement',
  attempt && `/admin/placement/${attempt}`,
  '/admin/people',
  '/admin/people/flags',
  person && `/admin/people/${person}`,
  '/admin/bookings',
  '/admin/bookings?filter=all',
  '/admin/bookings?filter=followup',
  booking && `/admin/bookings/${booking}`,
  booking && `/admin/bookings/${booking}/letter`,
  booking && `/admin/bookings/${booking}/letter?kind=receipt`,
  letter && `/admin/letters/${letter}`,
  letter && `/admin/letters/mail?ids=${letter}`,
  person && `/admin/mail?to=person:${person}`,
  entry && `/admin/catalogue/waitlist/${entry}/letter`,
  person && `/admin/people/${person}/letter`,
  courseReg && `/admin/registrations/course/${courseReg}/letter`,
  courseReg && `/admin/registrations/course/${courseReg}/letter?kind=test`,
  '/admin/organisations',
  '/admin/organisations?view=agency',
  organisation && `/admin/organisations/${organisation}`,
  organisation && `/admin/organisations/${organisation}?tab=bookings&earlier=all`,
  '/admin/groups',
  '/admin/groups?view=all',
  '/admin/groups?view=past&q=a',
  group && `/admin/groups/${group}`,
  '/admin/accommodation',
  '/admin/accommodation?view=casa_flat&q=e',
  place && `/admin/accommodation/${place}`,
  ledger && `/admin/bookings/${ledger}`,
  publisher && `/admin/organisations/${publisher}`,
  flat && `/admin/accommodation/${flat}`,
  flat && `/admin/accommodation/${flat}?tab=cleaning`,
  flat && `/admin/accommodation/${flat}/cleaning`,
  keyHolder && `/admin/staff/${keyHolder}`,
  programmeGroup && `/admin/groups/${programmeGroup}`,
  '/admin/accommodation/occupancy',
  '/admin/accommodation/occupancy?date=2026-12-24',
  '/admin/accommodation/stays',
  '/admin/accommodation/stays?view=arriving',
  '/admin/accommodation/stays?view=leaving&kind=casa_flat',
  '/admin/accommodation/stays?view=after',
  '/admin/accommodation/stays?view=unplaced&kind=host_family',
  '/admin/offers',
  '/admin/offers?filter=all',
  '/admin/offers?filter=declined',
  '/admin/offers?filter=all&q=376',
  '/admin/offers/new',
  offer && `/admin/offers/${offer}`,
  offer && `/admin/offers/${offer}/letter`,
  '/admin/catalogue',
  '/admin/catalogue?time=past',
  '/admin/catalogue?view=evening',
  '/admin/catalogue?view=other&time=past',
  '/admin/catalogue?view=types',
  start && `/admin/catalogue/${start}`,
  course && `/admin/catalogue/courses/${course}`,
  course && `/admin/catalogue/courses/${course}?tab=plan`,
  course && `/admin/catalogue/courses/${course}?book=1`,
  numbered && `/admin/catalogue/courses/${numbered}/2`,
  numbered && `/admin/catalogue/courses/${numbered}/2?tab=learners`,
  '/admin/catalogue/waitlist',
  '/admin/catalogue/waitlist?view=closed',
  '/admin/staff',
  '/admin/staff?view=former',
  staffMember && `/admin/staff/${staffMember}`,
  staffMember && `/admin/staff/${staffMember}?tab=exams`,
  '/admin/catalogue/exams',
  // The views and every filter at once, and a search by a word (2026-10-27).
  '/admin/catalogue/exams?view=drafts',
  '/admin/catalogue/exams?view=results',
  '/admin/catalogue/exams?view=past',
  '/admin/catalogue/exams?view=all&places=full&examiner=none&filed=open&month=2026-11&q=telc%2013.11.2026',
  sitting && `/admin/catalogue/exams/${sitting}`,
  sitting && `/admin/catalogue/exams/${sitting}?tab=letters`,
  sitting && `/admin/mail?to=exam_sitting:${sitting}`,
  sitting && `/admin/mail?to=exam_examiners:${sitting}`,
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
  '/admin/statistics',
  '/admin/team',
  '/admin/settings',
  '/admin/settings/system',
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
