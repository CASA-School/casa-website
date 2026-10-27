import 'server-only';

import type { PoolClient } from 'pg';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import { isExamOutcome, partsSat, type ExamOutcome, type ExamParts } from './exam-parts';
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
  /** Made in the workspace (0038), not by a seed: only such a sitting can be deleted. */
  createdHere: boolean;
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
  created_here: boolean;
};

const SITTINGS = `
  SELECT s.id, s.exam_type_id, e.code AS exam_code, e.name AS exam_name, e.level, s.starts_at, s.ends_at,
         s.registration_deadline, s.capacity, s.status, s.created_by IS NOT NULL AS created_here,
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
  createdHere: r.created_here,
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
/** Someone a sitting's „Buchen" can book: a learner, never a colleague, a deleted or a linked-away record. */
export type CandidateMatch = { id: string; name: string; email: string | null; bookings: number; booked: boolean };

export async function findCandidates(sittingId: string, text: string): Promise<CandidateMatch[]> {
  const term = text.trim().toLowerCase().slice(0, 80);
  if (term.length < 2) return [];
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await query<{ id: string; first_name: string; last_name: string | null; email: string | null; bookings: number; booked: boolean }>(
    `SELECT p.id, p.first_name, p.last_name,
            (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
            (SELECT count(*) FROM bookings b WHERE canonical_person_id(b.person_id) = p.id AND b.deleted_at IS NULL)::int AS bookings,
            EXISTS (SELECT 1 FROM bookings b WHERE canonical_person_id(b.person_id) = p.id AND b.exam_session_id = $2
                       AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS booked
       FROM people p
      WHERE p.deleted_at IS NULL AND p.merged_into IS NULL AND p.listed
        AND NOT EXISTS (SELECT 1 FROM staff_members sm WHERE sm.person_id = p.id)
        AND (lower(concat_ws(' ', p.first_name, p.last_name)) LIKE $1
             OR EXISTS (SELECT 1 FROM emails e WHERE canonical_person_id(e.person_id) = p.id AND lower(e.address) LIKE $1))
      ORDER BY p.updated_at DESC LIMIT 6`,
    [like, sittingId]
  );
  return rows.map((r) => ({ id: r.id, name: [r.first_name, r.last_name].filter(Boolean).join(' '), email: r.email, bookings: r.bookings, booked: r.booked }));
}

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
  /** How to reach them: the main address and number (2026-10-27, for the candidate at the side). */
  email: string | null;
  phone: string | null;
  /** The exam letters they have had, latest first (their booking's own and those naming it). */
  letters: { id: string; kind: string; sentAt: Date }[];
  /** What telc still needs from the person's record. */
  missing: TelcField[];
  /** telc's outcome per part sat, once recorded (0038), and when the result was collected. */
  result: { written: ExamOutcome | null; oral: ExamOutcome | null; collectedAt: Date | null; collectedNote: string | null } | null;
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
    written: ExamOutcome | null;
    oral: ExamOutcome | null;
    has_result: boolean;
    collected_at: Date | null;
    collected_note: string | null;
    email: string | null;
    phone: string | null;
    letters: { id: string; kind: string; sent_at: string }[];
  }>(
    `SELECT b.id, b.number, canonical_person_id(b.person_id) AS person_id, p.first_name, p.last_name, b.exam_parts,
            (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
            (SELECT ph.number FROM phones ph WHERE ph.person_id = p.id ORDER BY ph.is_primary DESC, ph.created_at LIMIT 1) AS phone,
            coalesce((SELECT json_agg(json_build_object('id', l.id, 'kind', l.kind, 'sent_at', l.sent_at) ORDER BY l.sent_at DESC)
                        FROM letters l
                       WHERE l.kind IN ('exam_confirmation', 'exam_invitation', 'exam_results', 'exam_participation')
                         AND (l.booking_id = b.id OR l.id IN (SELECT lb.letter_id FROM letter_bookings lb WHERE lb.booking_id = b.id))), '[]'::json) AS letters,
            r.written, r.oral, r.booking_id IS NOT NULL AS has_result, r.collected_at, r.collected_note,
            b.status::text AS status, b.observation_reason, b.exam_filed_at,
            coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0) AS charged,
            coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS paid,
            p.birth_date IS NOT NULL AS has_birth_date,
            nullif(trim(p.birth_place), '') IS NOT NULL AS has_birth_place,
            p.birth_country_code IS NOT NULL AS has_birth_country,
            nullif(trim(p.mother_tongue), '') IS NOT NULL AS has_mother_tongue
       FROM bookings b JOIN people p ON p.id = canonical_person_id(b.person_id)
       LEFT JOIN exam_results r ON r.booking_id = b.id
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
    email: r.email,
    phone: r.phone,
    letters: r.letters.map((l) => ({ id: l.id, kind: l.kind, sentAt: new Date(l.sent_at) })),
    missing: TELC_FIELDS.filter((f) => !{ birth_date: r.has_birth_date, birth_place: r.has_birth_place, birth_country: r.has_birth_country, mother_tongue: r.has_mother_tongue }[f]),
    result: r.has_result ? { written: r.written, oral: r.oral, collectedAt: r.collected_at, collectedNote: r.collected_note } : null,
  }));
}

/** A candidate as telc registers them: SchoolMan's export, read from the person's record. */
export type TelcRow = {
  bookingId: string;
  /** Whose record a gap is filled on. */
  personId: string;
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
    person_id: string;
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
    `SELECT b.id, p.id AS person_id, p.last_name, p.first_name, p.salutation::text AS salutation, to_char(p.birth_date, 'DD.MM.YYYY') AS birth_date,
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
    personId: r.person_id,
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

/** The exam preparation courses that lead to a sitting (SchoolMan's `Course._ID_Exam`, 0093), the first first. */
export async function sittingPreparations(sittingId: string): Promise<{ id: string; startDate: string }[]> {
  return query<{ id: string; startDate: string }>(
    `SELECT c.id, to_char(i.start_date, 'YYYY-MM-DD') AS "startDate"
       FROM courses c JOIN course_instances i ON i.id = c.course_instance_id
      WHERE c.exam_session_id = $1 AND c.status <> 'cancelled'
      ORDER BY i.start_date, c.id`,
    [sittingId]
  );
}

/** A sitting's queue: the open entries in order, then the closed ones, latest first. */
export async function sittingEntries(sittingId: string): Promise<ExamWaitlistEntry[]> {
  const rows = await query<ExamEntryRow>(
    `SELECT * FROM (${EXAM_ENTRIES} WHERE w.exam_session_id = $1) x
      ORDER BY (status IN ('waiting', 'offered')) DESC, position NULLS LAST, closed_at DESC`,
    [sittingId]
  );
  return rows.map(toExamEntry);
}

/** The mails written from the sitting's page (2026-10-27): to everyone booked, or to the examiners, latest first. */
export type SittingMail = { id: string; to: 'candidates' | 'examiners'; subject: string; recipients: number; sentAt: Date; byName: string | null };

export async function sittingMails(sittingId: string): Promise<SittingMail[]> {
  const rows = await query<{ id: string; about_kind: string; subject: string; recipients: number; sent_at: Date; by_name: string | null }>(
    `SELECT m.id, m.about_kind, m.subject, cardinality(m.recipients) AS recipients, m.sent_at, u.name AS by_name
       FROM workspace_mails m LEFT JOIN staff_users u ON u.id = m.sent_by
      WHERE m.about_kind IN ('exam_sitting', 'exam_examiners') AND m.about_id = $1
      ORDER BY m.sent_at DESC LIMIT 50`,
    [sittingId]
  );
  return rows.map((r) => ({
    id: r.id,
    to: r.about_kind === 'exam_examiners' ? 'examiners' : 'candidates',
    subject: r.subject,
    recipients: r.recipients,
    sentAt: r.sent_at,
    byName: r.by_name,
  }));
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

// ------------------------------------------------------------ the sittings themselves (0038)

export type SittingStatus = 'draft' | 'scheduled' | 'cancelled';

/** A sitting as the form writes it: the day and hours in Bremen's time, the deadline, the places. */
export type SittingInput = {
  examTypeId: string;
  day: string;
  startTime: string;
  endTime: string;
  deadline: string | null;
  capacity: number;
  /** On the website's registration form (scheduled), or prepared only (draft). */
  published: boolean;
};

/** The exams a sitting can be of, each with its last sitting's hours and places to start a new one from. */
export async function sittingDefaults(): Promise<{ id: string; name: string; startTime: string; endTime: string; capacity: number }[]> {
  const rows = await query<{ id: string; name: string; start_time: string | null; end_time: string | null; capacity: number | null }>(
    `SELECT e.id, e.name, last.start_time, last.end_time, last.capacity
       FROM exam_types e
       LEFT JOIN LATERAL (
         SELECT to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') AS start_time,
                to_char(s.ends_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') AS end_time, s.capacity
           FROM exam_sessions s WHERE s.exam_type_id = e.id ORDER BY s.starts_at DESC LIMIT 1
       ) last ON true
      WHERE e.is_active ORDER BY e.name`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, startTime: r.start_time ?? '09:00', endTime: r.end_time ?? '17:00', capacity: r.capacity ?? 20 }));
}

/** A sitting's own fields, for its form: Bremen's day and hours. */
export async function sittingForEdit(id: string): Promise<(SittingInput & { status: SittingStatus }) | null> {
  const row = await queryFirst<{ exam_type_id: string; day: string; start_time: string; end_time: string; deadline: string | null; capacity: number; status: SittingStatus }>(
    `SELECT exam_type_id, to_char(starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS day,
            to_char(starts_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') AS start_time,
            to_char(ends_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') AS end_time,
            to_char(registration_deadline, 'YYYY-MM-DD') AS deadline, capacity, status
       FROM exam_sessions WHERE id = $1`,
    [id]
  );
  return row
    ? { examTypeId: row.exam_type_id, day: row.day, startTime: row.start_time, endTime: row.end_time, deadline: row.deadline, capacity: row.capacity, published: row.status === 'scheduled', status: row.status }
    : null;
}

function checkInput(input: SittingInput): Result | null {
  if (!(input.startTime < input.endTime)) return refuse('Das Ende liegt vor dem Beginn.', 'The end is before the start.');
  if (input.deadline && input.deadline >= input.day) return refuse('Der Anmeldeschluss liegt nicht vor dem Prüfungstag.', 'The deadline is not before the exam day.');
  return null;
}

/** A new sitting. A draft is prepared only; a published one is on the website's registration form until its deadline. */
export async function createSitting(input: SittingInput, actor: StaffUser): Promise<Result> {
  const wrong = checkInput(input);
  if (wrong) return wrong;
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO exam_sessions (exam_type_id, starts_at, ends_at, registration_deadline, capacity, status, created_by)
     SELECT e.id, ($2::date + $3::time) AT TIME ZONE 'Europe/Berlin', ($2::date + $4::time) AT TIME ZONE 'Europe/Berlin', $5::date, $6, $7, $8
       FROM exam_types e WHERE e.id = $1 AND e.is_active
     RETURNING id`,
    [input.examTypeId, input.day, input.startTime, input.endTime, input.deadline, input.capacity, input.published ? 'scheduled' : 'draft', actor.id]
  );
  if (!row) return refuse('Diese Prüfung gibt es nicht.', 'That exam does not exist.');
  await logActivity({ actor, entity: 'exam_session', entityId: row.id, action: 'sitting_created', detail: { day: input.day, published: input.published } });
  return { ok: true, id: row.id };
}

/** The sitting changed: another day or hours, deadline, places, or on or off the website. */
export async function updateSitting(id: string, input: SittingInput, actor: StaffUser): Promise<Result> {
  const wrong = checkInput(input);
  if (wrong) return wrong;
  const current = await getSitting(id);
  if (!current) return refuse('Diesen Termin gibt es nicht mehr.', 'That sitting no longer exists.');
  if (input.capacity < current.booked) return refuse(`Es sind schon ${current.booked} gebucht.`, `${current.booked} are already booked.`);
  if (input.examTypeId !== current.examTypeId && current.booked > 0) {
    return refuse('Mit Buchungen bleibt die Prüfung dieselbe.', 'With bookings, the exam stays the same.');
  }
  await query(
    `UPDATE exam_sessions
        SET exam_type_id = $2, starts_at = ($3::date + $4::time) AT TIME ZONE 'Europe/Berlin', ends_at = ($3::date + $5::time) AT TIME ZONE 'Europe/Berlin',
            registration_deadline = $6::date, capacity = $7, status = $8
      WHERE id = $1`,
    [id, input.examTypeId, input.day, input.startTime, input.endTime, input.deadline, input.capacity, input.published ? 'scheduled' : 'draft']
  );
  await logActivity({ actor, entity: 'exam_session', entityId: id, action: 'sitting_updated', detail: { day: input.day, published: input.published } });
  return { ok: true, id };
}

/**
 * Called off: off the website, kept on record. Not while a booking stands or anyone waits — they are
 * moved to another sitting, cancelled or told first, so nobody is left on a sitting that will not happen.
 */
export async function cancelSitting(id: string, actor: StaffUser): Promise<Result> {
  const current = await getSitting(id);
  if (!current) return refuse('Diesen Termin gibt es nicht mehr.', 'That sitting no longer exists.');
  if (current.booked === 1) return refuse('Erst die Buchung auf einen anderen Termin verschieben oder stornieren.', 'Move or cancel the booking first.');
  if (current.booked > 1) return refuse(`Erst die ${current.booked} Buchungen auf einen anderen Termin verschieben oder stornieren.`, `Move or cancel the ${current.booked} bookings first.`);
  if (current.waiting + current.offered > 0) return refuse('Erst die Warteliste auflösen.', 'Clear the waiting list first.');
  await query(`UPDATE exam_sessions SET status = 'cancelled' WHERE id = $1`, [id]);
  await logActivity({ actor, entity: 'exam_session', entityId: id, action: 'sitting_cancelled', detail: {} });
  return { ok: true };
}

/**
 * Gone, for a sitting made here by mistake: only one created in the workspace — the seeds put theirs
 * back on every release — with no booking, entry or registration ever made on it. Else: cancel it.
 */
export async function deleteSitting(id: string, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ ours: boolean; used: boolean }>(
    `SELECT s.created_by IS NOT NULL AS ours,
            EXISTS (SELECT 1 FROM bookings b WHERE b.exam_session_id = s.id)
              OR EXISTS (SELECT 1 FROM waitlist_entries w WHERE w.exam_session_id = s.id)
              OR EXISTS (SELECT 1 FROM exam_registrations r WHERE r.exam_session_id = s.id) AS used
       FROM exam_sessions s WHERE s.id = $1`,
    [id]
  );
  if (!row) return refuse('Diesen Termin gibt es nicht mehr.', 'That sitting no longer exists.');
  if (!row.ours || row.used) return refuse('Dieser Termin wird abgesagt, nicht gelöscht.', 'This sitting is cancelled, not deleted.');
  await query(`DELETE FROM exam_sessions WHERE id = $1`, [id]);
  await logActivity({ actor, entity: 'exam_session', entityId: id, action: 'sitting_deleted', detail: {} });
  return { ok: true };
}

// ------------------------------------------------------------ results (0038)

/**
 * telc's results for the sitting's candidates, as entered: per booking, the outcome of each part it
 * sat. A part not sat stays empty whatever was sent; a booking with nothing entered is left alone.
 */
export async function saveResults(sittingId: string, rows: readonly { bookingId: string; written: unknown; oral: unknown }[], actor: StaffUser): Promise<number> {
  const bookings = await query<{ id: string; exam_parts: ExamParts }>(
    `SELECT id, exam_parts FROM bookings WHERE exam_session_id = $1 AND deleted_at IS NULL AND status <> 'cancelled' AND id = ANY($2::uuid[])`,
    [sittingId, rows.map((r) => r.bookingId)]
  );
  let saved = 0;
  for (const b of bookings) {
    const row = rows.find((r) => r.bookingId === b.id)!;
    const sat = partsSat(b.exam_parts);
    const written = sat.includes('written') && isExamOutcome(row.written) ? row.written : null;
    const oral = sat.includes('oral') && isExamOutcome(row.oral) ? row.oral : null;
    if (!written && !oral) continue;
    await query(
      `INSERT INTO exam_results (booking_id, written, oral, recorded_by) VALUES ($1, $2, $3, $4)
       ON CONFLICT (booking_id) DO UPDATE SET written = EXCLUDED.written, oral = EXCLUDED.oral, recorded_at = now(), recorded_by = EXCLUDED.recorded_by`,
      [b.id, written, oral, actor.id]
    );
    saved += 1;
  }
  if (saved) await logActivity({ actor, entity: 'exam_session', entityId: sittingId, action: 'exam_results_saved', detail: { count: saved } });
  return saved;
}

/** The result and the certificate were collected at the office — by the candidate, or with an authorisation (the note). */
export async function markCollected(bookingId: string, note: string | null, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ booking_id: string }>(
    `UPDATE exam_results SET collected_at = now(), collected_by = $2, collected_note = $3 WHERE booking_id = $1 AND collected_at IS NULL RETURNING booking_id`,
    [bookingId, actor.id, note]
  );
  if (!row) return refuse('Für diese Buchung ist kein Ergebnis eingetragen.', 'No result is recorded for this booking.');
  await logActivity({ actor, entity: 'booking', entityId: bookingId, action: 'exam_result_collected', detail: { note } });
  return { ok: true };
}
