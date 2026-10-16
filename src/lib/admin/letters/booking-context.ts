import 'server-only';

import { query, queryFirst } from '../db';
import { sessionOf } from '../waitlist';

import type { BookingLetterContext, LetterAddress, LetterCourse, LetterPerson, WaitlistLetterContext } from './booking-letters';

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
};

async function letterPerson(personId: string): Promise<LetterPerson | null> {
  const person = await queryFirst<PersonRow>(
    `SELECT p.id, p.first_name, p.last_name, p.salutation::text AS salutation,
            (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email
       FROM people p WHERE p.id = canonical_person_id($1)`,
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
});

/** Everyone who can sign a letter: the active colleagues. */
async function signers(): Promise<{ id: string; name: string }[]> {
  return query<{ id: string; name: string }>(`SELECT id, name FROM staff_users WHERE is_active ORDER BY name`);
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
    accommodation_from: string | null;
    accommodation_to: string | null;
    earlier: boolean;
    locale: string | null;
  }>(
    `SELECT b.id, b.number, b.person_id, b.status::text AS status, b.visa_required, b.payer, t.down_payment,
            (SELECT r.locale FROM course_registrations r WHERE r.id = b.source_registration_id) AS locale,
            at.name_de AS acc_de, at.name_en AS acc_en,
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
      WHERE b.id = $1 AND b.deleted_at IS NULL`,
    [bookingId]
  );
  if (!booking) return null;
  const [person, course, charges, payments, staff] = await Promise.all([
    letterPerson(booking.person_id),
    queryFirst<CourseRow & { level_code: string | null }>(
      `SELECT t.name, t.name_de, to_char(bp.start_date, 'YYYY-MM-DD') AS start_date,
              to_char((SELECT max(end_date) FROM booking_periods WHERE booking_id = $1), 'YYYY-MM-DD') AS end_date,
              i.session, i.schedule, t.lessons_per_week, bp.level_code
         FROM booking_periods bp
         JOIN bookings b ON b.id = bp.booking_id
         LEFT JOIN course_instances i ON i.id = bp.course_instance_id
         LEFT JOIN course_types t ON t.id = coalesce(i.course_type_id, b.course_type_id)
        WHERE bp.booking_id = $1
        ORDER BY bp.start_date LIMIT 1`,
      [bookingId]
    ),
    query<{ description: string; amount: string }>(`SELECT description, amount FROM booking_charges WHERE booking_id = $1 ORDER BY created_at`, [bookingId]),
    query<{ id: string; received_at: string; method: string; amount: string; subject: string }>(
      `SELECT id, to_char(received_at, 'YYYY-MM-DD') AS received_at, method, amount, subject
         FROM payments WHERE booking_id = $1 AND voided_at IS NULL ORDER BY received_at, created_at`,
      [bookingId]
    ),
    signers(),
  ]);
  if (!person) return null;
  const charged = charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return {
    bookingId: booking.id,
    number: booking.number,
    language: booking.locale === 'en' ? 'en' : 'de',
    person,
    course: course?.name ? toCourse(course, course.level_code) : null,
    accommodation:
      booking.acc_en && booking.accommodation_from
        ? { name: { de: booking.acc_de || booking.acc_en, en: booking.acc_en }, from: booking.accommodation_from, to: booking.accommodation_to }
        : null,
    charges: charges.map((c) => ({ description: c.description, amount: Number(c.amount) })),
    payments: payments.map((p) => ({ id: p.id, date: p.received_at, method: p.method, amount: Number(p.amount), subject: p.subject })),
    charged,
    paid,
    visaRequired: booking.visa_required,
    followUp: booking.earlier,
    downPayment: booking.down_payment === null ? null : Number(booking.down_payment),
    staff,
  };
}

export async function waitlistLetterContext(entryId: string): Promise<WaitlistLetterContext | null> {
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
    position: entry.position,
    nextStart: next?.start_date ?? null,
    staff,
  };
}
