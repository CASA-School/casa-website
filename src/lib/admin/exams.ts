import 'server-only';

import type { PoolClient } from 'pg';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import type { ExamParts } from './exam-parts';
import type { Bilingual } from './i18n';
import { setQueueStatus } from './queues';
import type { WaitlistSource, WaitlistStatus } from './waitlist';

/**
 * Exam sittings and the candidates booked into them (2026-10-17, migration 0036;
 * docs/ADMIN_WORKSPACE.md §Exams).
 *
 * A sitting has places (`exam_sessions.capacity`). Booked places are the sitting's bookings that are
 * not cancelled; an offered place is held for the person it was offered to; the rest are free. When
 * a sitting is full, candidates queue for it in order — the course waiting list's own table and
 * rules. Places, free places and positions are worked out on every read, never stored.
 *
 * A candidate is reported to telc before the sitting's deadline, and telc prints the certificate
 * from what it was given: so each booking says whether it was reported, and what telc still needs
 * from the person's record.
 */

export const freeSeats = (s: { capacity: number; booked: number; offered: number }) => Math.max(0, s.capacity - s.booked - s.offered);

export type ExamSitting = {
  id: string;
  examTypeId: string;
  examCode: string;
  examName: string;
  level: string | null;
  startsAt: Date;
  endsAt: Date;
  registrationDeadline: Date | null;
  capacity: number;
  status: string;
  booked: number;
  /** Booked and reported to telc. */
  filed: number;
  offered: number;
  waiting: number;
  /** Website registrations for this sitting not yet booked, put on the list or closed. */
  openRegistrations: number;
};

type SittingRow = {
  id: string;
  exam_type_id: string;
  exam_code: string;
  exam_name: string;
  level: string | null;
  starts_at: Date;
  ends_at: Date;
  registration_deadline: Date | null;
  capacity: number;
  status: string;
  booked: number;
  filed: number;
  offered: number;
  waiting: number;
  open_registrations: number;
};

const SITTINGS = `
  SELECT s.id, s.exam_type_id, e.code AS exam_code, e.name AS exam_name, e.level, s.starts_at, s.ends_at,
         s.registration_deadline, s.capacity, s.status,
         (SELECT count(*) FROM bookings b WHERE b.exam_session_id = s.id AND b.deleted_at IS NULL AND b.status <> 'cancelled')::int AS booked,
         (SELECT count(*) FROM bookings b WHERE b.exam_session_id = s.id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
             AND b.exam_filed_at IS NOT NULL)::int AS filed,
         (SELECT count(*) FROM waitlist_entries w WHERE w.exam_session_id = s.id AND w.status = 'offered')::int AS offered,
         (SELECT count(*) FROM waitlist_entries w WHERE w.exam_session_id = s.id AND w.status = 'waiting')::int AS waiting,
         (SELECT count(*) FROM exam_registrations r
           WHERE r.exam_session_id = s.id AND r.status IN ('new', 'in_progress', 'waiting')
             AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.source_exam_registration_id = r.id AND b.deleted_at IS NULL))::int AS open_registrations
    FROM exam_sessions s
    JOIN exam_types e ON e.id = s.exam_type_id`;

const toSitting = (r: SittingRow): ExamSitting => ({
  id: r.id,
  examTypeId: r.exam_type_id,
  examCode: r.exam_code,
  examName: r.exam_name,
  level: r.level,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  registrationDeadline: r.registration_deadline,
  capacity: r.capacity,
  status: r.status,
  booked: r.booked,
  filed: r.filed,
  offered: r.offered,
  waiting: r.waiting,
  openRegistrations: r.open_registrations,
});

/** The sittings from a fortnight ago on: the last ones stay for what follows them (results, certificates). */
export async function listSittings(limit = 30): Promise<ExamSitting[]> {
  const rows = await query<SittingRow>(`${SITTINGS} WHERE s.starts_at >= now() - interval '14 days' ORDER BY s.starts_at LIMIT $1`, [limit]);
  return rows.map(toSitting);
}

export async function getSitting(id: string): Promise<ExamSitting | null> {
  const row = await queryFirst<SittingRow>(`${SITTINGS} WHERE s.id = $1`, [id]);
  return row ? toSitting(row) : null;
}

/** An exam's sittings still ahead and open: where a booking of it can move. */
export async function sittingsOf(examTypeId: string): Promise<ExamSitting[]> {
  const rows = await query<SittingRow>(`${SITTINGS} WHERE s.exam_type_id = $1 AND s.starts_at >= current_date AND s.status = 'scheduled' ORDER BY s.starts_at`, [examTypeId]);
  return rows.map(toSitting);
}

/** For the booking wizard: the sittings still ahead, with the queue in order and whom a place is held for. */
export type SittingChoice = {
  id: string;
  examTypeId: string;
  startsAt: Date;
  registrationDeadline: Date | null;
  capacity: number;
  booked: number;
  offered: number;
  /** People waiting, first in line first. */
  queue: string[];
  /** People a place is offered to — their own place is not "taken" for them. */
  offeredTo: string[];
};

export async function upcomingSittings(): Promise<SittingChoice[]> {
  const [rows, queued] = await Promise.all([
    query<SittingRow>(`${SITTINGS} WHERE s.starts_at >= current_date AND s.status = 'scheduled' ORDER BY s.starts_at`),
    query<{ exam_session_id: string; person_id: string; status: WaitlistStatus }>(
      `SELECT w.exam_session_id, canonical_person_id(w.person_id) AS person_id, w.status
         FROM waitlist_entries w JOIN exam_sessions s ON s.id = w.exam_session_id
        WHERE w.status IN ('waiting', 'offered') AND s.starts_at >= current_date
        ORDER BY w.rank, w.joined_at`
    ),
  ]);
  return rows.map((r) => ({
    id: r.id,
    examTypeId: r.exam_type_id,
    startsAt: r.starts_at,
    registrationDeadline: r.registration_deadline,
    capacity: r.capacity,
    booked: r.booked,
    offered: r.offered,
    queue: queued.filter((q) => q.exam_session_id === r.id && q.status === 'waiting').map((q) => q.person_id),
    offeredTo: queued.filter((q) => q.exam_session_id === r.id && q.status === 'offered').map((q) => q.person_id),
  }));
}

// ------------------------------------------------------------ candidates

/** What telc needs to register a candidate, by the record's own words; what is missing is named. */
export const TELC_FIELDS = ['birth_date', 'birth_place', 'birth_country', 'mother_tongue'] as const;
export type TelcField = (typeof TELC_FIELDS)[number];
export const TELC_FIELD_LABELS: Record<TelcField, Bilingual> = {
  birth_date: { de: 'Geburtsdatum', en: 'date of birth' },
  birth_place: { de: 'Geburtsort', en: 'place of birth' },
  birth_country: { de: 'Geburtsland', en: 'country of birth' },
  mother_tongue: { de: 'Muttersprache', en: 'mother tongue' },
};

export type SittingCandidate = {
  bookingId: string;
  number: string;
  personId: string;
  personName: string;
  parts: ExamParts;
  status: 'reserved' | 'confirmed' | 'completed' | 'cancelled';
  charged: number;
  paid: number;
  observationReason: string | null;
  filedAt: Date | null;
  /** What telc still needs from the person's record. */
  missing: TelcField[];
};

export async function sittingCandidates(sittingId: string): Promise<SittingCandidate[]> {
  const rows = await query<{
    id: string;
    number: string;
    person_id: string;
    first_name: string;
    last_name: string | null;
    exam_parts: ExamParts;
    status: SittingCandidate['status'];
    charged: string;
    paid: string;
    observation_reason: string | null;
    exam_filed_at: Date | null;
    has_birth_date: boolean;
    has_birth_place: boolean;
    has_birth_country: boolean;
    has_mother_tongue: boolean;
  }>(
    `SELECT b.id, b.number, canonical_person_id(b.person_id) AS person_id, p.first_name, p.last_name, b.exam_parts,
            b.status::text AS status, b.observation_reason, b.exam_filed_at,
            coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0) AS charged,
            coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS paid,
            p.birth_date IS NOT NULL AS has_birth_date,
            nullif(trim(p.birth_place), '') IS NOT NULL AS has_birth_place,
            p.birth_country_code IS NOT NULL AS has_birth_country,
            nullif(trim(p.mother_tongue), '') IS NOT NULL AS has_mother_tongue
       FROM bookings b JOIN people p ON p.id = canonical_person_id(b.person_id)
      WHERE b.exam_session_id = $1 AND b.deleted_at IS NULL
      ORDER BY (b.status = 'cancelled'), p.last_name, p.first_name`,
    [sittingId]
  );
  return rows.map((r) => ({
    bookingId: r.id,
    number: r.number,
    personId: r.person_id,
    personName: [r.first_name, r.last_name].filter(Boolean).join(' '),
    parts: r.exam_parts,
    status: r.status,
    charged: Number(r.charged),
    paid: Number(r.paid),
    observationReason: r.observation_reason,
    filedAt: r.exam_filed_at,
    missing: TELC_FIELDS.filter((f) => !{ birth_date: r.has_birth_date, birth_place: r.has_birth_place, birth_country: r.has_birth_country, mother_tongue: r.has_mother_tongue }[f]),
  }));
}

/** A candidate as telc registers them: SchoolMan's export, read from the person's record. */
export type TelcRow = {
  bookingId: string;
  lastName: string;
  firstName: string;
  salutation: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  birthCountry: string | null;
  motherTongue: string | null;
  email: string | null;
  parts: ExamParts;
};

/** The sitting's candidates whose booking stands, for telc: the names exactly as booked. */
export async function telcList(sittingId: string): Promise<TelcRow[]> {
  const rows = await query<{
    id: string;
    last_name: string | null;
    first_name: string;
    salutation: string | null;
    birth_date: string | null;
    birth_place: string | null;
    birth_country: string | null;
    mother_tongue: string | null;
    email: string | null;
    exam_parts: ExamParts;
  }>(
    `SELECT b.id, p.last_name, p.first_name, p.salutation::text AS salutation, to_char(p.birth_date, 'DD.MM.YYYY') AS birth_date,
            nullif(trim(p.birth_place), '') AS birth_place, c.name_de AS birth_country, nullif(trim(p.mother_tongue), '') AS mother_tongue,
            (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
            b.exam_parts
       FROM bookings b
       JOIN people p ON p.id = canonical_person_id(b.person_id)
       LEFT JOIN countries c ON c.code = p.birth_country_code
      WHERE b.exam_session_id = $1 AND b.deleted_at IS NULL AND b.status <> 'cancelled'
      ORDER BY p.last_name, p.first_name`,
    [sittingId]
  );
  return rows.map((r) => ({
    bookingId: r.id,
    lastName: r.last_name ?? '',
    firstName: r.first_name,
    salutation: r.salutation,
    birthDate: r.birth_date,
    birthPlace: r.birth_place,
    birthCountry: r.birth_country,
    motherTongue: r.mother_tongue,
    email: r.email,
    parts: r.exam_parts,
  }));
}

/** Website registrations for the sitting that nobody has answered with a booking or a place in the queue. */
export async function sittingRegistrations(sittingId: string): Promise<{ id: string; name: string; parts: string; submittedAt: Date; personId: string | null }[]> {
  const rows = await query<{ id: string; first_name: string; last_name: string; registration_type: string; submitted_at: Date; person_id: string | null }>(
    `SELECT r.id, r.first_name, r.last_name, r.registration_type, r.submitted_at, r.person_id
       FROM exam_registrations r
      WHERE r.exam_session_id = $1 AND r.status IN ('new', 'in_progress', 'waiting')
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.source_exam_registration_id = r.id AND b.deleted_at IS NULL)
      ORDER BY r.submitted_at`,
    [sittingId]
  );
  return rows.map((r) => ({ id: r.id, name: `${r.first_name} ${r.last_name}`, parts: r.registration_type, submittedAt: r.submitted_at, personId: r.person_id }));
}

// ------------------------------------------------------------ the queue

export type ExamWaitlistEntry = {
  id: string;
  personId: string;
  personName: string;
  email: string | null;
  examSessionId: string;
  examName: string;
  startsAt: Date;
  parts: ExamParts;
  status: WaitlistStatus;
  position: number | null;
  joinedAt: Date;
  source: WaitlistSource;
  registrationId: string | null;
  note: string | null;
  offeredAt: Date | null;
  offeredByName: string | null;
  closedAt: Date | null;
  closeReason: string | null;
  bookingId: string | null;
};

const EXAM_ENTRIES = `
  SELECT w.id, canonical_person_id(w.person_id) AS person_id, p.first_name, p.last_name,
         (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
         w.exam_session_id, et.name AS exam_name, s.starts_at, w.exam_parts, w.status,
         CASE WHEN w.status IN ('waiting', 'offered')
              THEN row_number() OVER (PARTITION BY w.exam_session_id, (w.status IN ('waiting', 'offered')) ORDER BY w.rank, w.joined_at)
         END::int AS position,
         w.joined_at, w.source, w.exam_registration_id, w.note, w.offered_at, ou.name AS offered_by_name,
         w.closed_at, w.close_reason, w.booking_id
    FROM waitlist_entries w
    JOIN people p ON p.id = w.person_id
    JOIN exam_sessions s ON s.id = w.exam_session_id
    JOIN exam_types et ON et.id = s.exam_type_id
    LEFT JOIN staff_users ou ON ou.id = w.offered_by`;

type ExamEntryRow = {
  id: string;
  person_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  exam_session_id: string;
  exam_name: string;
  starts_at: Date;
  exam_parts: ExamParts;
  status: WaitlistStatus;
  position: number | null;
  joined_at: Date;
  source: WaitlistSource;
  exam_registration_id: string | null;
  note: string | null;
  offered_at: Date | null;
  offered_by_name: string | null;
  closed_at: Date | null;
  close_reason: string | null;
  booking_id: string | null;
};

const toExamEntry = (r: ExamEntryRow): ExamWaitlistEntry => ({
  id: r.id,
  personId: r.person_id,
  personName: [r.first_name, r.last_name].filter(Boolean).join(' '),
  email: r.email,
  examSessionId: r.exam_session_id,
  examName: r.exam_name,
  startsAt: r.starts_at,
  parts: r.exam_parts,
  status: r.status,
  position: r.position,
  joinedAt: r.joined_at,
  source: r.source,
  registrationId: r.exam_registration_id,
  note: r.note,
  offeredAt: r.offered_at,
  offeredByName: r.offered_by_name,
  closedAt: r.closed_at,
  closeReason: r.close_reason,
  bookingId: r.booking_id,
});

/** A sitting's queue: the open entries in order, then the closed ones, latest first. */
export async function sittingEntries(sittingId: string): Promise<ExamWaitlistEntry[]> {
  const rows = await query<ExamEntryRow>(
    `SELECT * FROM (${EXAM_ENTRIES} WHERE w.exam_session_id = $1) x
      ORDER BY (status IN ('waiting', 'offered')) DESC, position NULLS LAST, closed_at DESC`,
    [sittingId]
  );
  return rows.map(toExamEntry);
}

/** The sittings a person is or was waiting for, linked records included, the open ones first. */
export async function personExamEntries(canonicalPersonId: string): Promise<ExamWaitlistEntry[]> {
  const rows = await query<ExamEntryRow>(
    `SELECT * FROM (${EXAM_ENTRIES}) x WHERE person_id = $1
      ORDER BY (status IN ('waiting', 'offered')) DESC, starts_at DESC`,
    [canonicalPersonId]
  );
  return rows.map(toExamEntry);
}

// ------------------------------------------------------------ mutations

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

export async function sittingWords(sittingId: string): Promise<{ exam: string; sitting: string }> {
  const row = await queryFirst<{ name: string; day: string }>(
    `SELECT e.name, to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS day
       FROM exam_sessions s JOIN exam_types e ON e.id = s.exam_type_id WHERE s.id = $1`,
    [sittingId]
  );
  return { exam: row?.name ?? '', sitting: row?.day ?? '' };
}

/** Puts a candidate in a full sitting's queue, at the end. One open place per person and sitting. */
export async function addToExamWaitlist(
  input: { personId: string; examSessionId: string; parts: ExamParts; source: WaitlistSource; registrationId?: string | null; note?: string | null },
  actor: StaffUser
): Promise<Result> {
  const already = await queryFirst<{ id: string }>(
    `SELECT id FROM waitlist_entries
      WHERE canonical_person_id(person_id) = canonical_person_id($1) AND exam_session_id = $2 AND status IN ('waiting', 'offered')`,
    [input.personId, input.examSessionId]
  );
  if (already) return refuse('Diese Person steht für diesen Termin schon auf der Warteliste.', 'This person is already on the waiting list for this sitting.');
  const booked = await queryFirst<{ id: string }>(
    `SELECT id FROM bookings WHERE canonical_person_id(person_id) = canonical_person_id($1) AND exam_session_id = $2
        AND deleted_at IS NULL AND status <> 'cancelled'`,
    [input.personId, input.examSessionId]
  );
  if (booked) return refuse('Diese Person ist für diesen Termin schon gebucht.', 'This person is already booked for this sitting.');
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO waitlist_entries (person_id, exam_session_id, exam_parts, rank, source, exam_registration_id, note, created_by)
     VALUES ($1, $2, $3, extract(epoch FROM now()), $4, $5, $6, $7) RETURNING id`,
    [input.personId, input.examSessionId, input.parts, input.source, input.registrationId ?? null, input.note ?? null, actor.id]
  );
  await logActivity({
    actor,
    entity: 'person',
    entityId: input.personId,
    action: 'waitlist_joined',
    detail: { entry: row!.id, parts: input.parts, ...(await sittingWords(input.examSessionId)) },
  });
  // A registration answered with a place in the queue is done: the queue carries it from here.
  if (input.registrationId) await setQueueStatus({ entity: 'exam_registration', id: input.registrationId, status: 'done', actor });
  return { ok: true, id: row!.id };
}

/** Inside a booking's transaction: a candidate booked into a sitting leaves its queue, booked. */
export async function closeOnExamBooking(client: PoolClient, personId: string, examSessionId: string, bookingId: string, actor: StaffUser): Promise<string[]> {
  const { rows } = await client.query<{ id: string }>(
    `UPDATE waitlist_entries
        SET status = 'booked', booking_id = $3, closed_at = now(), closed_by = $4, close_reason = NULL
      WHERE canonical_person_id(person_id) = canonical_person_id($1) AND exam_session_id = $2 AND status IN ('waiting', 'offered')
      RETURNING id`,
    [personId, examSessionId, bookingId, actor.id]
  );
  return rows.map((r) => r.id);
}

/**
 * Inside a booking's transaction, with the sitting locked: is a place free for this person? Their
 * own offered place counts as theirs; anyone else's offer holds its place.
 */
export async function sittingHasPlace(client: PoolClient, examSessionId: string, personId: string, exceptBookingId: string | null = null): Promise<boolean> {
  const { rows } = await client.query<{ capacity: number; booked: number; offered: number }>(
    `SELECT s.capacity,
            (SELECT count(*) FROM bookings b WHERE b.exam_session_id = s.id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
                AND b.id IS DISTINCT FROM $3::uuid)::int AS booked,
            (SELECT count(*) FROM waitlist_entries w WHERE w.exam_session_id = s.id AND w.status = 'offered'
                AND canonical_person_id(w.person_id) <> canonical_person_id($2))::int AS offered
       FROM exam_sessions s WHERE s.id = $1 FOR UPDATE`,
    [examSessionId, personId, exceptBookingId]
  );
  return rows.length > 0 && freeSeats(rows[0]) > 0;
}

/** Candidates reported to telc for the sitting — or, by mistake, not. */
export async function setFiled(sittingId: string, bookingIds: readonly string[], filed: boolean, actor: StaffUser): Promise<number> {
  if (bookingIds.length === 0) return 0;
  const { length } = await query<{ id: string }>(
    filed
      ? `UPDATE bookings SET exam_filed_at = now(), exam_filed_by = $3
          WHERE exam_session_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NULL AND status <> 'cancelled' AND exam_filed_at IS NULL
          RETURNING id`
      : `UPDATE bookings SET exam_filed_at = NULL, exam_filed_by = NULL
          WHERE exam_session_id = $1 AND id = ANY($2::uuid[]) AND exam_filed_at IS NOT NULL
          RETURNING id`,
    [sittingId, bookingIds, actor.id]
  );
  await logActivity({ actor, entity: 'exam_session', entityId: sittingId, action: filed ? 'exam_filed' : 'exam_unfiled', detail: { bookings: bookingIds, count: length } });
  return length;
}

/** A sitting's places: how many candidates the room and the examiners take. */
export async function setCapacity(sittingId: string, capacity: number, actor: StaffUser): Promise<void> {
  await query(`UPDATE exam_sessions SET capacity = $2 WHERE id = $1`, [sittingId, capacity]);
  await logActivity({ actor, entity: 'exam_session', entityId: sittingId, action: 'places_set', detail: { capacity } });
}
