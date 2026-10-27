/**
 * Puts how the sample's learners came in beside them (2026-10-18, migration 0065; docs/schoolman/intake.md):
 * each SchoolMan pre-booking as a note saying what was asked for, and the waiting-list rows on the waiting
 * list of the course or the exam sitting they wait for.
 *
 *   python3 -I scripts/filemaker/read_intake.py | DATABASE_URL=... node scripts/filemaker/import-intake.mjs [--dry-run]
 *
 * Run after the learners, the courses and the exams. One transaction; prints counts only.
 *
 * - A pre-booking is a note („Anmeldung in SchoolMan: Intensivkurs · B1 · vormittags · …") on the booking it
 *   became, else on the person, under its SchoolMan author and day (`PreBooking:<id>`). Its state is said only
 *   when it is ja or nein: u.B. is the default nobody maintains. Since 2026-10-27 the note also says the exam
 *   asked for, whether they are in Germany or abroad, how they got in touch and the course dates and stay they
 *   wished for; a stay wished for fills the booking it became where that booking has no stay or wish of its own.
 * - A waiting-list row is an entry on its course's list (`source` schoolman), or — when its pre-booking names
 *   an exam sitting and no course — on that sitting's list (2026-10-27; the sitting found or made as
 *   exam-sittings.mjs does). Booked when SchoolMan says it became a booking, else closed („no place") once the
 *   course has begun or the sitting is past, else still waiting. A colleague's offer or closing here stands
 *   until SchoolMan says the learner is booked.
 */
import { connect } from '../db/client.mjs';
import { changes } from './bridge-changes.mjs';
import { examSittings } from './exam-sittings.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// SchoolMan's exams (`ExamReference`) the catalogue does not offer keep their name in the note.
const EXAM_NAME = { 1: 'TestDaF', 2: 'telc Deutsch B1', 3: 'telc Deutsch B2', 4: 'telc Deutsch C1 Hochschule', 5: 'TestAS' };
const CONTACT = { online: 'online', email: 'per E-Mail', phone: 'telefonisch', office: 'im Büro' };

const { preBookings, waiting } = await readStdin();
const client = await connect();
const count = { notes: 0, onBooking: 0, stayWishes: 0, waiting: 0, exams: 0, booked: 0, closed: 0, open: 0, notHere: 0, twice: 0 };
const day = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
const span = (s) => (s.start ? (s.end && s.end !== s.start ? `${day(s.start)} – ${day(s.end)}` : day(s.start)) : null);

try {
  await client.query('BEGIN');
  const map = async (sql) => new Map((await client.query(sql)).rows.map((r) => [String(r.k), r.v]));
  const persons = await map(`SELECT source_record_id AS k, entity_id AS v FROM filemaker_links WHERE entity = 'person' AND source_database = 'SchoolMan' AND source_layout = 'Person'`);
  const bookings = await map(`SELECT filemaker_booking_id AS k, id AS v FROM bookings WHERE filemaker_booking_id IS NOT NULL`);
  const types = await map(`SELECT filemaker_id AS k, coalesce(nullif(btrim(name_de), ''), name) AS v FROM course_types WHERE filemaker_id IS NOT NULL`);
  const steps = await map(`SELECT filemaker_level_step_id AS k, code AS v FROM levels WHERE filemaker_level_step_id IS NOT NULL`);
  const examNames = await map(`SELECT filemaker_id AS k, name AS v FROM exam_types WHERE filemaker_id IS NOT NULL`);
  // The stay vocabularies by SchoolMan's numbers: their code, and their German name for the note.
  const stayVocabulary = async (name) => new Map((await client.query(`SELECT filemaker_id::int::text AS fm, code, name_de FROM ${name} WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [r.fm, r]));
  const stayTypes = await stayVocabulary('accommodation_types');
  const roomTypes = await stayVocabulary('accommodation_room_types');
  const caterings = await stayVocabulary('catering_options');
  // A course by SchoolMan's number: its own, or one of its parallel groups' (0046).
  const courses = new Map();
  for (const r of (
    await client.query(
      `SELECT c.filemaker_course_id, c.filemaker_group_ids, c.id, c.course_instance_id, c.level_code, coalesce(c.title, c.level_code) AS label, to_char(i.start_date, 'YYYY-MM-DD') AS start
         FROM courses c JOIN course_instances i ON i.id = c.course_instance_id WHERE c.filemaker_course_id IS NOT NULL OR c.filemaker_group_ids IS NOT NULL`
    )
  ).rows) {
    (r.filemaker_group_ids ?? []).forEach((fm) => courses.set(fm, r));
    if (r.filemaker_course_id && !courses.has(r.filemaker_course_id)) courses.set(r.filemaker_course_id, r);
  }
  const sittingsHere = await map(`SELECT filemaker_exam_id AS k, id AS v FROM exam_sessions WHERE filemaker_exam_id IS NOT NULL`);
  const sittings = await examSittings(client);

  // A pre-booking or waiting-list entry as it was last time, on the same records here, is passed over (0088).
  const changed = await changes(client, 'intake');
  for (const p of preBookings) {
    const personId = persons.get(p.person);
    if (!personId) {
      count.notHere++;
      continue;
    }
    const bookingId = p.booking ? (bookings.get(p.booking) ?? null) : null;
    const course = p.course ? courses.get(p.course) : null;
    const stay = p.wish?.stay.at(-1) ?? null;
    const stayParts = stay ? [stayTypes.get(stay.type ?? '')?.name_de, roomTypes.get(stay.room ?? '')?.name_de, caterings.get(stay.catering ?? '')?.name_de].filter(Boolean) : [];
    const examName = p.exam ? (examNames.get(String(p.exam.ref ?? '')) ?? EXAM_NAME[p.exam.ref]) : p.examType ? (examNames.get(String(p.examType)) ?? EXAM_NAME[p.examType]) : null;
    const parts = [
      types.get(String(p.courseType ?? '')) ?? null,
      (p.step && steps.get(p.step)) || p.band,
      p.daytime,
      course ? `Kurs ${course.label ?? ''} ab ${day(course.start)}`.replace(/\s+/g, ' ') : null,
      examName ? `Prüfung ${examName}${p.exam?.day ? ` am ${day(p.exam.day)}` : ''}` : null,
      ...(p.wish?.course ?? []).map((s) => span(s)).filter(Boolean).map((s) => `gewünscht ${s}`),
      stay ? `Unterkunft${span(stay) ? ` ${span(stay)}` : ''}${stayParts.length ? `: ${stayParts.join(', ')}` : ''}` : null,
      p.visa === true ? 'Visum nötig' : p.visa === false ? 'kein Visum' : null,
      p.local === 'inland' ? 'in Deutschland' : p.local === 'abroad' ? 'aus dem Ausland' : null,
      p.contact?.length ? `Kontakt ${p.contact.map((c) => CONTACT[c] ?? c).join(', ')}` : null,
      p.state === 'ja' || p.state === 'nein' ? `Status ${p.state}` : null,
    ].filter(Boolean);
    const body = `Anmeldung in SchoolMan${parts.length ? `: ${parts.join(' · ')}` : ''}`;
    if (changed.same(`pre-booking:${p.id}`, [p, personId, bookingId, body])) continue;
    await client.query(
      `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
       VALUES ($1, $2, $3, $4, $5, coalesce($6::timestamp AT TIME ZONE 'Europe/Berlin', now()))
       ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE
         SET entity = EXCLUDED.entity, entity_id = EXCLUDED.entity_id, body = EXCLUDED.body, author_name = EXCLUDED.author_name, created_at = EXCLUDED.created_at`,
      [bookingId ? 'booking' : 'person', bookingId ?? personId, body, p.author ?? 'SchoolMan', `PreBooking:${p.id}`, p.created]
    );
    count.notes++;
    if (bookingId) count.onBooking++;
    // The stay wished for, on the booking it became — only where that booking has no stay and no wish of its own.
    const wished = stay && [stayTypes.get(stay.type ?? '')?.code ?? null, roomTypes.get(stay.room ?? '')?.code ?? null, caterings.get(stay.catering ?? '')?.code ?? null];
    if (bookingId && wished?.some(Boolean)) {
      count.stayWishes += (
        await client.query(
          `UPDATE bookings SET accommodation_type_code = $2, accommodation_room_type_code = $3, accommodation_catering_code = $4,
                  accommodation_from = $5::date, accommodation_to = CASE WHEN $6::date >= $5::date THEN $6::date END
            WHERE id = $1 AND accommodation_type_code IS NULL AND accommodation_room_type_code IS NULL AND accommodation_catering_code IS NULL
              AND accommodation_from IS NULL AND accommodation_to IS NULL AND NOT EXISTS (SELECT 1 FROM booking_stays s WHERE s.booking_id = $1)`,
          [bookingId, ...wished, stay.start, stay.end]
        )
      ).rowCount;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const w of waiting) {
    const personId = persons.get(w.person);
    const course = w.course ? courses.get(w.course) : null;
    // An exam wait's sitting: here already, else found or made as a learner's exam booking's would be.
    let sittingId = w.exam ? (sittingsHere.get(w.exam.id) ?? null) : null;
    if (w.exam && !sittingId && personId) sittingId = (await sittings.sittingFor(w.exam))?.id ?? null;
    if (!personId || (w.course ? !course?.level_code : !sittingId)) {
      count.notHere++;
      continue;
    }
    const bookingId = w.booking ? (bookings.get(w.booking) ?? null) : null;
    const begins = course ? course.start : w.exam.day;
    const status = w.booking ? 'booked' : begins && begins <= today ? 'withdrawn' : 'waiting';
    const closed = status !== 'waiting';
    const joined = w.joined ?? `${today}T12:00:00`;
    const note = [w.author ? `In SchoolMan eingetragen von ${w.author}` : null, ...w.wish.map((s) => span(s)).filter(Boolean).map((s) => `gewünscht ${s}`)].filter(Boolean).join(' · ') || null;
    if (changed.same(`waiting:${w.id}`, [w, personId, course?.id ?? sittingId, bookingId, status])) continue;
    // A second open entry of the same learner on the same list (SchoolMan has the row twice, or a colleague
    // put them on here) is left out: the list's unique rule refuses it.
    await client.query('SAVEPOINT waiting_entry');
    try {
      await client.query(
        `INSERT INTO waitlist_entries (person_id, course_instance_id, level_code, course_id, exam_session_id, exam_parts, status, joined_at, rank, source, note,
                                       closed_at, close_reason, booking_id, filemaker_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamp AT TIME ZONE 'Europe/Berlin', extract(epoch FROM $8::timestamp), 'schoolman', $9,
                 CASE WHEN $10 THEN $8::timestamp AT TIME ZONE 'Europe/Berlin' END, CASE WHEN $7 = 'withdrawn' THEN 'no_place' END, $11, $12)
         ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
           SET person_id = EXCLUDED.person_id, course_instance_id = EXCLUDED.course_instance_id, level_code = EXCLUDED.level_code, course_id = EXCLUDED.course_id,
               exam_session_id = EXCLUDED.exam_session_id, exam_parts = EXCLUDED.exam_parts, status = EXCLUDED.status, note = EXCLUDED.note,
               closed_at = EXCLUDED.closed_at, close_reason = EXCLUDED.close_reason, booking_id = EXCLUDED.booking_id
           WHERE (waitlist_entries.offered_by IS NULL AND waitlist_entries.closed_by IS NULL) OR EXCLUDED.status = 'booked'`,
        [
          personId,
          course?.course_instance_id ?? null,
          course?.level_code ?? null,
          course?.id ?? null,
          course ? null : sittingId,
          course ? null : 'full',
          status,
          joined,
          note,
          closed,
          bookingId,
          w.id,
        ]
      );
      await client.query('RELEASE SAVEPOINT waiting_entry');
    } catch (error) {
      if (error.code !== '23505') throw error;
      await client.query('ROLLBACK TO SAVEPOINT waiting_entry');
      count.twice++;
      continue;
    }
    count.waiting++;
    if (!course) count.exams++;
    count[status === 'booked' ? 'booked' : closed ? 'closed' : 'open']++;
  }
  count.sittingsMade = sittings.count.made + sittings.count.linked;
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
  `${count.notes} pre-bookings as notes (${count.onBooking} on the booking they became, ${count.stayWishes} stays wished for on it) · ` +
    `${count.waiting} waiting-list entries (${count.exams} for an exam; ${count.booked} booked, ${count.closed} closed, ${count.open} waiting) · ` +
    `${count.notHere} whose learner, course or sitting is not here · ${count.twice} already on that list · ${count.sittingsMade ?? 0} sittings found or made · ${count.unchanged ?? 0} as last time`
);
