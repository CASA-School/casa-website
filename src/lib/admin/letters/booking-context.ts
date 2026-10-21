import 'server-only';

import { bookedLevelLabel, chargeLineNames, type LineFacts } from '../booking-levels';
import { query, queryFirst } from '../db';
import { accommodationWeeks } from '../offers/course';
import type { ExamOutcome, ExamParts } from '../exam-parts';
import { sessionOf } from '../waitlist';

import { getSiteUrl } from '@/lib/seo';

import type {
  BookingLetterContext,
  LearnerLetterContext,
  LetterAddress,
  LetterCourse,
  LetterExam,
  LetterPerson,
  RegistrationLetterContext,
  WaitlistLetterContext,
} from './booking-letters';

/**
 * What a booking's or a waiting-list entry's letter is built from, read once (docs/LETTERS.md).
 * The same context feeds the live preview and the copy kept when the letter is sent, so the two
 * cannot differ. Pure data: the words are `booking-letters.ts`'.
 */

type PersonRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  salutation: string | null;
  email: string | null;
  birth_date: string | null;
  nationality_de: string | null;
  nationality_en: string | null;
  passport_number: string | null;
  phone: string | null;
  mother_tongue: string | null;
  birth_place: string | null;
};

async function letterPerson(personId: string): Promise<LetterPerson | null> {
  const person = await queryFirst<PersonRow>(
    `SELECT p.id, p.first_name, p.last_name, p.salutation::text AS salutation,
            (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
            to_char(p.birth_date, 'YYYY-MM-DD') AS birth_date, c.name_de AS nationality_de, c.name_en AS nationality_en, p.passport_number,
            (SELECT ph.number FROM phones ph WHERE ph.person_id = p.id ORDER BY ph.is_primary DESC, ph.created_at LIMIT 1) AS phone,
            p.mother_tongue, p.birth_place
       FROM people p LEFT JOIN countries c ON c.code = p.nationality_code WHERE p.id = canonical_person_id($1)`,
    [personId]
  );
  if (!person) return null;
  const addresses = await query<{ kind: 'home' | 'local'; street: string | null; postcode: string | null; city: string | null; country_code: string | null; de: string | null; en: string | null }>(
    `SELECT a.kind, a.street, a.postcode, a.city, a.country_code, c.name_de AS de, c.name_en AS en
       FROM addresses a LEFT JOIN countries c ON c.code = a.country_code WHERE a.person_id = $1`,
    [person.id]
  );
  const address = (kind: 'home' | 'local'): LetterAddress | null => {
    const a = addresses.find((x) => x.kind === kind);
    if (!a || !(a.street || a.city)) return null;
    return {
      lines: [a.street ?? '', [a.postcode, a.city].filter(Boolean).join(' ')].filter(Boolean),
      countryCode: a.country_code,
      country: { de: a.de, en: a.en },
    };
  };
  return {
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name ?? '',
    salutation: person.salutation === 'ms' ? 'ms' : person.salutation === 'mr' ? 'mr' : 'none',
    email: person.email,
    birthDate: person.birth_date,
    nationality: { de: person.nationality_de, en: person.nationality_en },
    passportNumber: person.passport_number,
    phone: person.phone,
    motherTongue: person.mother_tongue,
    birthPlace: person.birth_place,
    home: address('home'),
    local: address('local'),
  };
}

type CourseRow = {
  name: string;
  name_de: string | null;
  start_date: string;
  end_date: string;
  session: string | null;
  schedule: { days?: string[]; time?: string } | null;
  lessons_per_week: number | null;
  room_name: string | null;
  room_floor: number | null;
};

const toCourse = (r: CourseRow, level: string | null): LetterCourse => ({
  name: { de: r.name_de?.trim() || r.name, en: r.name },
  level,
  startDate: r.start_date,
  endDate: r.end_date,
  session: sessionOf(r.session, r.schedule),
  time: r.schedule?.time ?? null,
  days: Array.isArray(r.schedule?.days) ? r.schedule.days : [],
  lessonsPerWeek: r.lessons_per_week && r.lessons_per_week > 0 ? r.lessons_per_week : null,
  room: r.room_name ? { name: r.room_name, floor: r.room_floor } : null,
});

/** Everyone who can sign a letter: the active colleagues. */
async function signers(): Promise<{ id: string; name: string }[]> {
  return query<{ id: string; name: string }>(`SELECT id, name FROM staff_users WHERE is_active ORDER BY name`);
}

/**
 * The exam a booking or a queue entry is for (0036): its name, its day and hours in Bremen's time,
 * telc's deadline and the parts. `where` picks the row: `b.id = $1` for a booking, `w.id = $1` for
 * a waiting-list entry.
 */
async function letterExam(where: 'b.id = $1' | 'w.id = $1', id: string): Promise<LetterExam | null> {
  const from =
    where === 'b.id = $1'
      ? `bookings b JOIN exam_sessions s ON s.id = b.exam_session_id`
      : `waitlist_entries w JOIN exam_sessions s ON s.id = w.exam_session_id`;
  const booking = where === 'b.id = $1';
  const row = await queryFirst<{
    name: string;
    day: string;
    start_time: string;
    end_time: string;
    deadline: string | null;
    parts: ExamParts;
    written: ExamOutcome | null;
    oral: ExamOutcome | null;
    has_result: boolean;
  }>(
    `SELECT e.name, to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS day,
            to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') AS start_time,
            to_char(s.ends_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') AS end_time,
            to_char(s.registration_deadline, 'YYYY-MM-DD') AS deadline, ${booking ? 'b.exam_parts' : 'w.exam_parts'} AS parts,
            ${booking ? 'r.written, r.oral, r.booking_id IS NOT NULL' : 'NULL::text AS written, NULL::text AS oral, false'} AS has_result
       FROM ${from} JOIN exam_types e ON e.id = s.exam_type_id
       ${booking ? 'LEFT JOIN exam_results r ON r.booking_id = b.id' : ''}
      WHERE ${where}`,
    [id]
  );
  return row
    ? {
        name: row.name,
        day: row.day,
        startTime: row.start_time,
        endTime: row.end_time,
        deadline: row.deadline,
        parts: row.parts,
        result: row.has_result ? { written: row.written, oral: row.oral } : null,
      }
    : null;
}

export async function bookingLetterContext(bookingId: string): Promise<BookingLetterContext | null> {
  const booking = await queryFirst<{
    id: string;
    number: string;
    person_id: string;
    status: string;
    visa_required: boolean;
    payer: string;
    down_payment: string | null;
    acc_de: string | null;
    acc_en: string | null;
    room_de: string | null;
    room_en: string | null;
    catering_de: string | null;
    catering_en: string | null;
    type_de: string | null;
    type_en: string | null;
    accommodation_from: string | null;
    accommodation_to: string | null;
    earlier: boolean;
    locale: string | null;
    cancelled_at: string | null;
  }>(
    `SELECT b.id, b.number, b.person_id, b.status::text AS status, b.visa_required, b.payer, t.down_payment,
            coalesce((SELECT r.locale FROM course_registrations r WHERE r.id = b.source_registration_id),
                     (SELECT r.locale FROM exam_registrations r WHERE r.id = b.source_exam_registration_id)) AS locale,
            to_char(b.cancelled_at, 'YYYY-MM-DD') AS cancelled_at,
            at.name_de AS acc_de, at.name_en AS acc_en, art.name_de AS room_de, art.name_en AS room_en,
            co.name_de AS catering_de, co.name_en AS catering_en, t.name_de AS type_de, t.name AS type_en,
            to_char(b.accommodation_from, 'YYYY-MM-DD') AS accommodation_from,
            to_char(b.accommodation_to, 'YYYY-MM-DD') AS accommodation_to,
            -- A follow-up booking: the learner was booked into an earlier course already.
            EXISTS (SELECT 1 FROM bookings o JOIN booking_periods op ON op.booking_id = o.id
                     WHERE canonical_person_id(o.person_id) = canonical_person_id(b.person_id) AND o.id <> b.id
                       AND o.deleted_at IS NULL AND o.status <> 'cancelled'
                       AND op.start_date < (SELECT min(start_date) FROM booking_periods WHERE booking_id = b.id)) AS earlier
       FROM bookings b
       LEFT JOIN course_types t ON t.id = b.course_type_id
       LEFT JOIN accommodation_types at ON at.code = b.accommodation_type_code
       LEFT JOIN accommodation_room_types art ON art.code = b.accommodation_room_type_code
       LEFT JOIN catering_options co ON co.code = b.accommodation_catering_code
      WHERE b.id = $1 AND b.deleted_at IS NULL`,
    [bookingId]
  );
  if (!booking) return null;
  const [person, course, charges, payments, staff, exam, periods] = await Promise.all([
    letterPerson(booking.person_id),
    queryFirst<CourseRow & { level_code: string | null }>(
      `SELECT t.name, t.name_de, to_char(bp.start_date, 'YYYY-MM-DD') AS start_date,
              to_char((SELECT max(end_date) FROM booking_periods WHERE booking_id = $1), 'YYYY-MM-DD') AS end_date,
              i.session, i.schedule, t.lessons_per_week, bp.level_code,
              coalesce(r.nickname, r.name) AS room_name, r.floor AS room_floor
         FROM booking_periods bp
         JOIN bookings b ON b.id = bp.booking_id
         LEFT JOIN course_instances i ON i.id = bp.course_instance_id
         LEFT JOIN rooms r ON r.id = i.room_id
         LEFT JOIN course_types t ON t.id = coalesce(i.course_type_id, b.course_type_id)
        WHERE bp.booking_id = $1
        ORDER BY bp.start_date LIMIT 1`,
      [bookingId]
    ),
    query<{ kind: string; charge_type_code: string | null; description: string; amount: string }>(
      `SELECT kind::text AS kind, charge_type_code, description, amount FROM booking_charges WHERE booking_id = $1 ORDER BY created_at`,
      [bookingId]
    ),
    query<{ id: string; received_at: string; method: string; amount: string; subject: string }>(
      `SELECT id, to_char(received_at, 'YYYY-MM-DD') AS received_at, method, amount, subject
         FROM payments WHERE booking_id = $1 AND voided_at IS NULL ORDER BY received_at, created_at`,
      [bookingId]
    ),
    signers(),
    letterExam(`b.id = $1`, bookingId),
    // Every period with its course's format: how much of a level the booking teaches („A2.1–A2.2").
    query<{ format: string | null; level_code: string | null; start_date: string; end_date: string }>(
      `SELECT t.format, bp.level_code, to_char(bp.start_date, 'YYYY-MM-DD') AS start_date, to_char(bp.end_date, 'YYYY-MM-DD') AS end_date
         FROM booking_periods bp
         JOIN bookings b ON b.id = bp.booking_id
         LEFT JOIN course_instances i ON i.id = bp.course_instance_id
         LEFT JOIN course_types t ON t.id = coalesce(i.course_type_id, b.course_type_id)
        WHERE bp.booking_id = $1 ORDER BY bp.start_date`,
      [bookingId]
    ),
  ]);
  if (!person) return null;
  const level = bookedLevelLabel(periods.map((p) => ({ format: p.format, levelCode: p.level_code, startDate: p.start_date, endDate: p.end_date })));
  // Each cost line in the letter's language where it can be traced to what it is (2026-10-17).
  const named = (en: string | null, de: string | null) => (en ? { de: de?.trim() || en, en } : null);
  const facts: LineFacts = {
    course: named(booking.type_en, booking.type_de),
    accommodation: booking.acc_en
      ? {
          type: named(booking.acc_en, booking.acc_de)!,
          room: named(booking.room_en, booking.room_de),
          catering: named(booking.catering_en, booking.catering_de),
          from: booking.accommodation_from,
          to: booking.accommodation_to,
        }
      : null,
  };
  const rentWeeks = accommodationWeeks({ kind: 'host_family', from: booking.accommodation_from, to: booking.accommodation_to });
  const charged = charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return {
    bookingId: booking.id,
    number: booking.number,
    language: booking.locale === 'en' ? 'en' : 'de',
    person,
    course: course?.name ? toCourse(course, level ?? course.level_code) : null,
    exam,
    accommodation:
      booking.acc_en && booking.accommodation_from
        ? { name: { de: booking.acc_de || booking.acc_en, en: booking.acc_en }, from: booking.accommodation_from, to: booking.accommodation_to }
        : null,
    charges: charges.map((c) => ({
      kind: c.kind,
      description: c.description,
      amount: Number(c.amount),
      names: chargeLineNames({ kind: c.kind, chargeTypeCode: c.charge_type_code, description: c.description }, facts, rentWeeks),
    })),
    payments: payments.map((p) => ({ id: p.id, date: p.received_at, method: p.method, amount: Number(p.amount), subject: p.subject })),
    charged,
    paid,
    visaRequired: booking.visa_required,
    followUp: booking.earlier,
    downPayment: booking.down_payment === null ? null : Number(booking.down_payment),
    status: booking.status as 'reserved' | 'confirmed' | 'completed' | 'cancelled',
    cancelledAt: booking.cancelled_at,
    staff,
  };
}

export async function waitlistLetterContext(entryId: string): Promise<WaitlistLetterContext | null> {
  // An exam sitting's queue (0036): the sitting instead of a course start.
  const examEntry = await queryFirst<{ id: string; person_id: string; status: string; exam_session_id: string; locale: string | null; position: number | null }>(
    `SELECT w.id, w.person_id, w.status, w.exam_session_id,
            (SELECT r.locale FROM exam_registrations r WHERE r.id = w.exam_registration_id) AS locale,
            CASE WHEN w.status IN ('waiting', 'offered') THEN (
              SELECT count(*)::int FROM waitlist_entries o
               WHERE o.exam_session_id = w.exam_session_id AND o.status IN ('waiting', 'offered')
                 AND (o.rank, o.joined_at) <= (w.rank, w.joined_at)) END AS position
       FROM waitlist_entries w WHERE w.id = $1 AND w.exam_session_id IS NOT NULL`,
    [entryId]
  );
  if (examEntry) {
    const [person, exam, next, staff] = await Promise.all([
      letterPerson(examEntry.person_id),
      letterExam(`w.id = $1`, entryId),
      // The next sitting of the same exam: what a "no place this time" letter points to.
      queryFirst<{ day: string }>(
        `SELECT to_char(n.starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS day
           FROM exam_sessions s JOIN exam_sessions n ON n.exam_type_id = s.exam_type_id AND n.starts_at > s.starts_at AND n.status = 'scheduled'
          WHERE s.id = $1 ORDER BY n.starts_at LIMIT 1`,
        [examEntry.exam_session_id]
      ),
      signers(),
    ]);
    if (!person) return null;
    return {
      entryId: examEntry.id,
      language: examEntry.locale === 'en' ? 'en' : 'de',
      status: examEntry.status,
      person,
      course: null,
      exam,
      position: examEntry.position,
      nextStart: next?.day ?? null,
      staff,
    };
  }
  const entry = await queryFirst<
    CourseRow & {
      id: string;
      person_id: string;
      level_code: string;
      status: string;
      course_instance_id: string;
      course_type_id: string;
      position: number | null;
      locale: string | null;
    }
  >(
    `SELECT w.id, w.person_id, w.level_code, w.status, w.course_instance_id, i.course_type_id,
            (SELECT r.locale FROM course_registrations r WHERE r.id = w.registration_id) AS locale,
            t.name, t.name_de, to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date,
            i.session, i.schedule, t.lessons_per_week,
            (SELECT coalesce(r.nickname, r.name) FROM rooms r WHERE r.id = i.room_id) AS room_name,
            (SELECT r.floor FROM rooms r WHERE r.id = i.room_id) AS room_floor,
            CASE WHEN w.status IN ('waiting', 'offered') THEN (
              SELECT count(*)::int FROM waitlist_entries o
               WHERE o.course_instance_id = w.course_instance_id AND o.level_code = w.level_code AND o.status IN ('waiting', 'offered')
                 AND (o.rank, o.joined_at) <= (w.rank, w.joined_at)) END AS position
       FROM waitlist_entries w
       JOIN course_instances i ON i.id = w.course_instance_id
       JOIN course_types t ON t.id = i.course_type_id
      WHERE w.id = $1`,
    [entryId]
  );
  if (!entry) return null;
  const [person, next, staff] = await Promise.all([
    letterPerson(entry.person_id),
    // The next start of the same course after this one: what a "no place this time" letter points to.
    queryFirst<{ start_date: string }>(
      `SELECT to_char(start_date, 'YYYY-MM-DD') AS start_date FROM course_instances
        WHERE course_type_id = $1 AND start_date > $2::date AND status <> 'cancelled'
        ORDER BY start_date LIMIT 1`,
      [entry.course_type_id, entry.start_date]
    ),
    signers(),
  ]);
  if (!person) return null;
  return {
    entryId: entry.id,
    language: entry.locale === 'en' ? 'en' : 'de',
    status: entry.status,
    person,
    course: toCourse(entry, entry.level_code),
    exam: null,
    position: entry.position,
    nextStart: next?.start_date ?? null,
    staff,
  };
}

/** A learner's bookings that are not deleted, the latest first: what the confirmation of several chooses from. */
export async function learnerLetterContext(personId: string): Promise<LearnerLetterContext | null> {
  const person = await letterPerson(personId);
  if (!person) return null;
  const ids = await query<{ id: string }>(
    `SELECT b.id FROM bookings b
      WHERE b.deleted_at IS NULL AND canonical_person_id(b.person_id) = $1
      ORDER BY (SELECT min(start_date) FROM booking_periods WHERE booking_id = b.id) DESC NULLS LAST, b.created_at DESC`,
    [person.id]
  );
  const [contexts, staff] = await Promise.all([Promise.all(ids.map((r) => bookingLetterContext(r.id))), signers()]);
  const bookings = contexts.filter((c): c is BookingLetterContext => c !== null);
  return {
    personId: person.id,
    // The language of their last website registration, else German.
    language: bookings.find((b) => b.language === 'en') ? 'en' : 'de',
    person,
    bookings: bookings.map((b) => ({
      id: b.bookingId,
      number: b.number,
      status: b.status,
      course: b.course,
      exam: b.exam,
      accommodation: b.accommodation,
      charges: b.charges.map((c) => ({ description: c.description, amount: c.amount, names: c.names ?? null })),
      charged: b.charged,
      paid: b.paid,
      visaRequired: b.visaRequired,
    })),
    staff,
  };
}

/**
 * A website registration, for its letters: the course they chose (its start when they picked one),
 * the level they gave, the visa, and who they are — the linked person's record when there is one
 * (their address), else the form's own fields.
 */
export async function registrationLetterContext(registrationId: string): Promise<RegistrationLetterContext | null> {
  const r = await queryFirst<
    CourseRow & {
      id: string;
      person_id: string | null;
      first_name: string;
      last_name: string;
      salutation: string | null;
      email: string;
      phone: string | null;
      birth_date: string | null;
      locale: string | null;
      visa_required: boolean;
      declared_level: string | null;
      course_type_label: string | null;
      course_instance_label: string | null;
      down_payment: string | null;
      has_instance: boolean;
    }
  >(
    `SELECT r.id, r.person_id, r.first_name, r.last_name, r.salutation::text AS salutation, r.email, r.phone,
            to_char(r.birth_date, 'YYYY-MM-DD') AS birth_date, r.locale, r.visa_required,
            coalesce(r.declared_level_code, r.declared_level_raw) AS declared_level,
            r.course_type_label, r.course_instance_label, t.down_payment,
            coalesce(t.name, r.course_type_label, '') AS name, t.name_de,
            to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date,
            i.session, i.schedule, t.lessons_per_week,
            (SELECT coalesce(rm.nickname, rm.name) FROM rooms rm WHERE rm.id = i.room_id) AS room_name,
            (SELECT rm.floor FROM rooms rm WHERE rm.id = i.room_id) AS room_floor,
            i.id IS NOT NULL AS has_instance
       FROM course_registrations r
       LEFT JOIN course_instances i ON i.id = r.course_instance_id
       LEFT JOIN course_types t ON t.id = coalesce(i.course_type_id, r.course_type_id)
      WHERE r.id = $1`,
    [registrationId]
  );
  if (!r) return null;
  const linked = r.person_id ? await letterPerson(r.person_id) : null;
  const person: LetterPerson = linked ?? {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    salutation: r.salutation === 'ms' ? 'ms' : r.salutation === 'mr' ? 'mr' : 'none',
    email: r.email,
    phone: r.phone,
    motherTongue: null,
    birthPlace: null,
    birthDate: r.birth_date,
    nationality: { de: null, en: null },
    passportNumber: null,
    home: null,
    local: null,
  };
  const site = getSiteUrl();
  return {
    registrationId: r.id,
    personId: linked?.id ?? null,
    language: r.locale === 'en' ? 'en' : 'de',
    person: { ...person, email: r.email || person.email },
    course: r.has_instance && r.start_date && r.end_date ? toCourse(r, null) : null,
    courseLabel: [r.course_type_label, r.course_instance_label].filter(Boolean).join(' · ') || r.name,
    declaredLevel: r.declared_level,
    visaRequired: r.visa_required,
    // The terms' down payment (AGB §5.2) where the course type names none.
    downPayment: r.down_payment === null ? 100 : Number(r.down_payment),
    placementUrl: { de: `${site}/anmeldung/einstufungstest`, en: `${site}/en/placement-test` },
    laterStart: await laterStartOf(registrationId),
    staff: await signers(),
  };
}

/** The next start of the registration's course after the one it chose (or after today, without one). */
async function laterStartOf(registrationId: string): Promise<string | null> {
  const row = await queryFirst<{ start: string | null }>(
    `SELECT to_char(min(n.start_date), 'YYYY-MM-DD') AS start
       FROM course_registrations r
       LEFT JOIN course_instances i ON i.id = r.course_instance_id
       JOIN course_instances n ON n.course_type_id = coalesce(i.course_type_id, r.course_type_id)
      WHERE r.id = $1 AND n.status = 'scheduled'
        AND n.start_date > greatest(coalesce(i.start_date, current_date), current_date)`,
    [registrationId]
  );
  return row?.start ?? null;
}
