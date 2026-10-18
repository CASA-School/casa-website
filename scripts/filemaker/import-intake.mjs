/**
 * Puts how the sample's learners came in beside them (2026-10-18, migration 0065; docs/schoolman/intake.md):
 * each SchoolMan pre-booking as a note saying what was asked for, and the waiting-list rows that name a
 * course here on that course's waiting list.
 *
 *   python3 -I scripts/filemaker/read_intake.py | DATABASE_URL=... node scripts/filemaker/import-intake.mjs [--dry-run]
 *
 * Run after the learners and the courses. One transaction; prints counts only.
 *
 * - A pre-booking is a note („Anmeldung in SchoolMan: Intensivkurs · B1 · vormittags · …") on the booking it
 *   became, else on the person, under its SchoolMan author and day (`PreBooking:<id>`). Its state is said only
 *   when it is ja or nein: u.B. is the default nobody maintains.
 * - A waiting-list row is an entry on its course's list (`source` schoolman): booked when it became a booking
 *   here, else closed („no place") once the course has begun, else still waiting.
 */
import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const { preBookings, waiting } = await readStdin();
const client = await connect();
const count = { notes: 0, onBooking: 0, waiting: 0, booked: 0, closed: 0, open: 0, notHere: 0 };
const day = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

try {
  await client.query('BEGIN');
  const map = async (sql) => new Map((await client.query(sql)).rows.map((r) => [String(r.k), r.v]));
  const persons = await map(`SELECT source_record_id AS k, entity_id AS v FROM filemaker_links WHERE entity = 'person' AND source_database = 'SchoolMan' AND source_layout = 'Person'`);
  const bookings = await map(`SELECT filemaker_booking_id AS k, id AS v FROM bookings WHERE filemaker_booking_id IS NOT NULL`);
  const types = await map(`SELECT filemaker_id AS k, coalesce(nullif(btrim(name_de), ''), name) AS v FROM course_types WHERE filemaker_id IS NOT NULL`);
  const steps = await map(`SELECT filemaker_level_step_id AS k, code AS v FROM levels WHERE filemaker_level_step_id IS NOT NULL`);
  const courses = new Map(
    (
      await client.query(
        `SELECT c.filemaker_course_id AS k, c.id, c.course_instance_id, c.level_code, coalesce(c.title, c.level_code) AS label, to_char(i.start_date, 'YYYY-MM-DD') AS start
           FROM courses c JOIN course_instances i ON i.id = c.course_instance_id WHERE c.filemaker_course_id IS NOT NULL`
      )
    ).rows.map((r) => [r.k, r])
  );

  for (const p of preBookings) {
    const personId = persons.get(p.person);
    if (!personId) {
      count.notHere++;
      continue;
    }
    const bookingId = p.booking ? (bookings.get(p.booking) ?? null) : null;
    const course = p.course ? courses.get(p.course) : null;
    const parts = [
      types.get(String(p.courseType ?? '')) ?? null,
      (p.step && steps.get(p.step)) || p.band,
      p.daytime,
      course ? `Kurs ${course.label ?? ''} ab ${day(course.start)}`.replace(/\s+/g, ' ') : null,
      p.visa === true ? 'Visum nötig' : p.visa === false ? 'kein Visum' : null,
      p.state === 'ja' || p.state === 'nein' ? `Status ${p.state}` : null,
    ].filter(Boolean);
    const body = `Anmeldung in SchoolMan${parts.length ? `: ${parts.join(' · ')}` : ''}`;
    await client.query(
      `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
       VALUES ($1, $2, $3, $4, $5, coalesce($6::timestamp AT TIME ZONE 'Europe/Berlin', now()))
       ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE
         SET entity = EXCLUDED.entity, entity_id = EXCLUDED.entity_id, body = EXCLUDED.body, author_name = EXCLUDED.author_name, created_at = EXCLUDED.created_at`,
      [bookingId ? 'booking' : 'person', bookingId ?? personId, body, p.author ?? 'SchoolMan', `PreBooking:${p.id}`, p.created]
    );
    count.notes++;
    if (bookingId) count.onBooking++;
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const w of waiting) {
    const personId = persons.get(w.person);
    const course = courses.get(w.course);
    if (!personId || !course || !course.level_code) {
      count.notHere++;
      continue;
    }
    const bookingId = w.booking ? (bookings.get(w.booking) ?? null) : null;
    const status = bookingId ? 'booked' : course.start <= today ? 'withdrawn' : 'waiting';
    const closed = status !== 'waiting';
    const joined = w.joined ?? `${today}T12:00:00`;
    await client.query(
      `INSERT INTO waitlist_entries (person_id, course_instance_id, level_code, course_id, status, joined_at, rank, source, note, closed_at, close_reason, booking_id, filemaker_id)
       VALUES ($1, $2, $3, $4, $5, $6::timestamp AT TIME ZONE 'Europe/Berlin', extract(epoch FROM $6::timestamp), 'schoolman', $7,
               CASE WHEN $8 THEN $6::timestamp AT TIME ZONE 'Europe/Berlin' END, CASE WHEN $5 = 'withdrawn' THEN 'no_place' END, $9, $10)
       ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
         SET status = EXCLUDED.status, closed_at = EXCLUDED.closed_at, close_reason = EXCLUDED.close_reason, booking_id = EXCLUDED.booking_id`,
      [personId, course.course_instance_id, course.level_code, course.id, status, joined, w.author ? `In SchoolMan eingetragen von ${w.author}` : null, closed, bookingId, w.id]
    );
    count.waiting++;
    count[status === 'booked' ? 'booked' : closed ? 'closed' : 'open']++;
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
  `${count.notes} pre-bookings as notes (${count.onBooking} on the booking they became) · ` +
    `${count.waiting} waiting-list entries (${count.booked} booked, ${count.closed} closed, ${count.open} waiting) · ${count.notHere} whose learner or course is not here`
);
