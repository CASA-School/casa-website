import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst, withTransaction } from './db';
import { EXAM_PARTS_LABELS, isExamParts } from './exam-parts';
import { pick, type Bilingual, type WsLang } from './i18n';
import { countryCodeFromName, normalizeEmail, normalizePhone } from './normalize';
import { inboxConditions, type InboxPeriod, type InboxState } from './inbox';
import { normaliseStatus, type WorkStatus } from './queues';

/**
 * Reads for the registrations.
 *
 * An Anmeldung (`registrations`, 0097) is what one person sent at once; its
 * lines are the courses (`course_registrations`) and the exam
 * (`exam_registrations`) they chose, each kept as it was sent and with its own
 * outcome. The inbox lists Anmeldungen; a line's page leads to its Anmeldung.
 */

export type CourseRegistrationDetail = {
  id: string;
  /** The Anmeldung this line belongs to (0097). */
  registrationId: string;
  requestId: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** What was submitted, verbatim. */
  nationalityRaw: string;
  /** ISO 3166-1 alpha-2 when the name resolved; null (and flagged) when it did not. */
  nationalityCode: string | null;
  nationalityName: string | null;
  birthDateRaw: string;
  birthDate: Date | null;
  /** The learner's own claim. A placement decides the class, not this. */
  declaredLevelRaw: string | null;
  declaredLevelCode: string | null;
  courseTypeLabel: string | null;
  courseInstanceLabel: string | null;
  courseTypeId: string | null;
  courseInstanceId: string | null;
  visaRequired: boolean;
  accommodationRequired: boolean;
  accommodationType: string | null;
  allergies: string | null;
  notes: string | null;
  locale: string;
  source: string;
  status: WorkStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  personId: string | null;
  submittedAt: Date;
  /** What the visitor sent, kept on a colleague's first edit (0076); null while unedited. */
  original: Record<string, unknown> | null;
  editedAt: Date | null;
  editedByName: string | null;
};

export type ExamRegistrationDetail = {
  id: string;
  /** The Anmeldung this line belongs to (0097). */
  registrationId: string;
  requestId: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalityRaw: string;
  nationalityCode: string | null;
  nationalityName: string | null;
  birthDateRaw: string;
  birthDate: Date | null;
  examTypeLabel: string | null;
  examSessionLabel: string | null;
  examTypeId: string | null;
  examSessionId: string | null;
  registrationType: string;
  officialNameConfirmed: boolean;
  locale: string;
  source: string;
  status: WorkStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  personId: string | null;
  submittedAt: Date;
};

export const registrationTypeLabel = (value: string, lang: WsLang) => (isExamParts(value) ? pick(lang, EXAM_PARTS_LABELS[value]) : value);

export async function getCourseRegistration(id: string): Promise<CourseRegistrationDetail | null> {
  const found = await queryFirst<{
    id: string;
    registration_id: string;
    request_id: string;
    salutation: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    nationality_raw: string;
    nationality_code: string | null;
    nationality_name: string | null;
    birth_date_raw: string;
    birth_date: Date | null;
    declared_level_raw: string | null;
    declared_level_code: string | null;
    course_type_label: string | null;
    course_instance_label: string | null;
    course_type_id: string | null;
    course_instance_id: string | null;
    visa_required: boolean;
    accommodation_required: boolean;
    accommodation_type: string | null;
    allergies: string | null;
    notes: string | null;
    locale: string;
    source: string;
    status: string;
    assigned_to: string | null;
    assignee_name: string | null;
    person_id: string | null;
    submitted_at: Date;
    original: Record<string, unknown> | null;
    edited_at: Date | null;
    edited_by_name: string | null;
  }>(
    `SELECT r.id,
            r.registration_id,
            r.request_id,
            r.original,
            r.edited_at,
            (SELECT name FROM staff_users eu WHERE eu.id = r.edited_by) AS edited_by_name,
            r.salutation::text AS salutation,
            r.first_name,
            r.last_name,
            r.email,
            r.phone,
            r.nationality_raw,
            r.nationality_code,
            coalesce(c.name_de, c.name_en) AS nationality_name,
            r.birth_date_raw,
            r.birth_date,
            r.declared_level_raw,
            r.declared_level_code,
            r.course_type_label,
            r.course_instance_label,
            r.course_type_id,
            r.course_instance_id,
            r.visa_required,
            r.accommodation_required,
            r.accommodation_type::text AS accommodation_type,
            r.allergies,
            r.notes,
            r.locale,
            r.source,
            r.status::text AS status,
            r.assigned_to,
            u.name AS assignee_name,
            r.person_id,
            r.submitted_at
       FROM course_registrations r
       LEFT JOIN staff_users u ON u.id = r.assigned_to
       LEFT JOIN countries c ON c.code = r.nationality_code
      WHERE r.id = $1`,
    [id]
  );

  if (!found) {
    return null;
  }

  return {
    id: found.id,
    registrationId: found.registration_id,
    requestId: found.request_id,
    salutation: found.salutation,
    firstName: found.first_name,
    lastName: found.last_name,
    email: found.email,
    phone: found.phone,
    nationalityRaw: found.nationality_raw,
    nationalityCode: found.nationality_code,
    nationalityName: found.nationality_name,
    birthDateRaw: found.birth_date_raw,
    birthDate: found.birth_date,
    declaredLevelRaw: found.declared_level_raw,
    declaredLevelCode: found.declared_level_code,
    courseTypeLabel: found.course_type_label,
    courseInstanceLabel: found.course_instance_label,
    courseTypeId: found.course_type_id,
    courseInstanceId: found.course_instance_id,
    visaRequired: found.visa_required,
    accommodationRequired: found.accommodation_required,
    accommodationType: found.accommodation_type,
    allergies: found.allergies,
    notes: found.notes,
    locale: found.locale,
    source: found.source,
    status: normaliseStatus(found.status),
    assignedTo: found.assigned_to,
    assigneeName: found.assignee_name,
    personId: found.person_id,
    submittedAt: found.submitted_at,
    original: found.original,
    editedAt: found.edited_at,
    editedByName: found.edited_by_name,
  };
}

export async function getExamRegistration(id: string): Promise<ExamRegistrationDetail | null> {
  const found = await queryFirst<{
    id: string;
    registration_id: string;
    request_id: string;
    salutation: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    nationality_raw: string;
    nationality_code: string | null;
    nationality_name: string | null;
    birth_date_raw: string;
    birth_date: Date | null;
    exam_type_label: string | null;
    exam_session_label: string | null;
    exam_type_id: string | null;
    exam_session_id: string | null;
    registration_type: string;
    official_name_confirmed: boolean;
    locale: string;
    source: string;
    status: string;
    assigned_to: string | null;
    assignee_name: string | null;
    person_id: string | null;
    submitted_at: Date;
  }>(
    `SELECT r.id,
            r.registration_id,
            r.request_id,
            r.salutation::text AS salutation,
            r.first_name,
            r.last_name,
            r.email,
            r.phone,
            r.nationality_raw,
            r.nationality_code,
            coalesce(c.name_de, c.name_en) AS nationality_name,
            r.birth_date_raw,
            r.birth_date,
            r.exam_type_label,
            r.exam_session_label,
            r.exam_type_id,
            r.exam_session_id,
            r.registration_type,
            r.official_name_confirmed,
            r.locale,
            r.source,
            r.status::text AS status,
            r.assigned_to,
            u.name AS assignee_name,
            r.person_id,
            r.submitted_at
       FROM exam_registrations r
       LEFT JOIN staff_users u ON u.id = r.assigned_to
       LEFT JOIN countries c ON c.code = r.nationality_code
      WHERE r.id = $1`,
    [id]
  );

  if (!found) {
    return null;
  }

  return {
    id: found.id,
    registrationId: found.registration_id,
    requestId: found.request_id,
    salutation: found.salutation,
    firstName: found.first_name,
    lastName: found.last_name,
    email: found.email,
    phone: found.phone,
    nationalityRaw: found.nationality_raw,
    nationalityCode: found.nationality_code,
    nationalityName: found.nationality_name,
    birthDateRaw: found.birth_date_raw,
    birthDate: found.birth_date,
    examTypeLabel: found.exam_type_label,
    examSessionLabel: found.exam_session_label,
    examTypeId: found.exam_type_id,
    examSessionId: found.exam_session_id,
    registrationType: found.registration_type,
    officialNameConfirmed: found.official_name_confirmed,
    locale: found.locale,
    source: found.source,
    status: normaliseStatus(found.status),
    assignedTo: found.assigned_to,
    assigneeName: found.assignee_name,
    personId: found.person_id,
    submittedAt: found.submitted_at,
  };
}

// ------------------------------------------------------------------ a colleague's corrections (0076)

export type RegistrationEdit = {
  salutation: 'mr' | 'ms' | 'mx' | 'neutral';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  birthDate: string | null;
  visaRequired: boolean;
  accommodationRequired: boolean;
  accommodationType: 'flat' | 'host' | null;
  allergies: string | null;
  notes: string | null;
};

/** The columns a colleague may correct, as they stand: what `original` keeps on the first edit. */
const EDITABLE = `jsonb_build_object(
  'salutation', salutation::text, 'first_name', first_name, 'last_name', last_name, 'email', email, 'phone', phone,
  'nationality', nationality_raw, 'birth_date', birth_date_raw, 'visa_required', visa_required,
  'accommodation_required', accommodation_required, 'accommodation_type', accommodation_type::text,
  'allergies', allergies, 'notes', notes)`;

/**
 * „Daten bearbeiten" (Rahman, 2026-10-21: „sometimes registrations are incomplete, so the colleagues
 * edit and improve that"), on the Anmeldung as a whole (0097): every line takes the corrected values —
 * the stay only the course lines, which hold it. What the visitor sent is kept once per line, on the
 * first edit (`original`), and shown beside it. Its person follows while no colleague has acted on them
 * yet (off the register): a booking then starts from the corrected name and address.
 */
export async function editRegistration(registrationId: string, input: RegistrationEdit, actor: StaffUser): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  const nationalityCode = countryCodeFromName(input.nationality);
  const done = await withTransaction(async (client) => {
    const found = await client.query<{ person_id: string | null }>(`SELECT person_id FROM registrations WHERE id = $1 FOR UPDATE`, [registrationId]);
    if (!found.rows[0]) return false;
    await client.query(
      `UPDATE course_registrations
          SET original = coalesce(original, ${EDITABLE}),
              salutation = $2::salutation, first_name = $3, last_name = $4, email = $5, phone = $6,
              nationality_raw = $7, nationality_code = $8, birth_date_raw = coalesce($9, ''), birth_date = $9::date,
              visa_required = $10, accommodation_required = $11, accommodation_type = $12::accommodation_type,
              allergies = $13, notes = $14, edited_at = now(), edited_by = $15
        WHERE registration_id = $1`,
      [
        registrationId,
        input.salutation,
        input.firstName,
        input.lastName,
        input.email,
        input.phone,
        input.nationality,
        nationalityCode,
        input.birthDate,
        input.visaRequired,
        input.accommodationRequired,
        input.accommodationRequired ? input.accommodationType : null,
        input.allergies,
        input.notes,
        actor.id,
      ]
    );
    await client.query(
      `UPDATE exam_registrations
          SET salutation = $2::salutation, first_name = $3, last_name = $4, email = $5, phone = $6,
              nationality_raw = $7, nationality_code = $8, birth_date_raw = coalesce($9, ''), birth_date = $9::date
        WHERE registration_id = $1`,
      [registrationId, input.salutation, input.firstName, input.lastName, input.email, input.phone, input.nationality, nationalityCode, input.birthDate]
    );
    const personId = found.rows[0].person_id;
    if (personId) {
      const listed = await client.query<{ listed: boolean }>(`SELECT listed FROM people WHERE id = $1`, [personId]);
      if (listed.rows[0] && !listed.rows[0].listed) {
        await client.query(
          `UPDATE people SET salutation = $2::salutation, first_name = $3, last_name = $4, birth_date = $5::date, nationality_code = $6, nationality_raw = $7 WHERE id = $1`,
          [personId, input.salutation, input.firstName, input.lastName, input.birthDate, nationalityCode, input.nationality]
        );
        await client.query(
          `UPDATE emails SET address = $2, normalized = $3 WHERE id = (SELECT id FROM emails WHERE person_id = $1 ORDER BY is_primary DESC, created_at LIMIT 1)`,
          [personId, input.email, normalizeEmail(input.email)]
        );
        await client.query(
          `UPDATE phones SET number = $2, normalized = $3 WHERE id = (SELECT id FROM phones WHERE person_id = $1 ORDER BY is_primary DESC, created_at LIMIT 1)`,
          [personId, input.phone, normalizePhone(input.phone)]
        );
      }
    }
    return true;
  });
  if (!done) return { ok: false, reason: { de: 'Diese Anmeldung gibt es nicht mehr.', en: 'This registration no longer exists.' } };
  await logActivity({ actor, entity: 'registration', entityId: registrationId, action: 'registration_edited' });
  return { ok: true };
}

// ------------------------------------------------------------------ the Anmeldung (0097)

/** Who sent the Anmeldung, from its first line (a course before the exam). */
const SENDER = `CROSS JOIN LATERAL (
    SELECT first_name, last_name, email FROM (
      SELECT first_name, last_name, email, 0 AS rank FROM course_registrations WHERE registration_id = g.id
      UNION ALL
      SELECT first_name, last_name, email, 1 FROM exam_registrations WHERE registration_id = g.id
    ) x ORDER BY rank LIMIT 1
  ) who`;

/** A line as the inbox row names it: the course or exam, the level or the parts, the dates as sent. */
export type RegistrationLineSummary = {
  kind: 'course' | 'exam';
  label: string | null;
  typeId: string | null;
  /** A course's level as the learner chose it; an exam's parts (`full`, `written`, `oral`). */
  detail: string | null;
  option: string | null;
  settled: boolean;
};

export type RegistrationListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  locale: string;
  status: WorkStatus;
  assigneeName: string | null;
  submittedAt: Date;
  personId: string | null;
  openFlags: number;
  deliveryNeedsReview: boolean;
  accommodationRequired: boolean;
  visaRequired: boolean;
  /** Courses first, by start, then the exam. */
  lines: RegistrationLineSummary[];
};

/** The inbox: one row per Anmeldung, found by the sender's name or address or by a course or exam it holds. */
export async function listRegistrations({
  period = 'week',
  state = 'any',
  search,
  limit = 40,
  offset = 0,
}: {
  period?: InboxPeriod;
  state?: InboxState;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: RegistrationListItem[]; total: number }> {
  const params: unknown[] = [];
  const conditions = inboxConditions('registration', 'g', { period, state });

  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(EXISTS (SELECT 1 FROM course_registrations c WHERE c.registration_id = g.id
                  AND (c.first_name ILIKE ${p} OR c.last_name ILIKE ${p} OR c.email ILIKE ${p} OR c.course_type_label ILIKE ${p}))
        OR EXISTS (SELECT 1 FROM exam_registrations e WHERE e.registration_id = g.id
                  AND (e.first_name ILIKE ${p} OR e.last_name ILIKE ${p} OR e.email ILIKE ${p} OR e.exam_type_label ILIKE ${p})))`
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const totalRow = await queryFirst<{ n: string }>(`SELECT count(*) AS n FROM registrations g ${where}`, params);

  const rows = await query<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    locale: string;
    status: string;
    assignee_name: string | null;
    person_id: string | null;
    submitted_at: Date;
    open_flags: string;
    delivery_needs_review: boolean;
    accommodation_required: boolean;
    visa_required: boolean;
    lines: RegistrationLineSummary[] | null;
  }>(
    `SELECT g.id, who.first_name, who.last_name, who.email, g.locale, g.status::text AS status,
            u.name AS assignee_name, g.person_id, g.submitted_at,
            (SELECT count(*) FROM record_flags f
              WHERE f.resolved_at IS NULL
                AND ((f.entity = 'course_registration' AND f.entity_id IN (SELECT id FROM course_registrations WHERE registration_id = g.id))
                  OR (f.entity = 'exam_registration' AND f.entity_id IN (SELECT id FROM exam_registrations WHERE registration_id = g.id)))) AS open_flags,
            EXISTS (SELECT 1 FROM record_flags f WHERE f.resolved_at IS NULL
              AND f.code IN ('registration_staff_notice_unconfirmed', 'registration_receipt_unconfirmed')
              AND ((f.entity = 'course_registration' AND f.entity_id IN (SELECT id FROM course_registrations WHERE registration_id = g.id))
                OR (f.entity = 'exam_registration' AND f.entity_id IN (SELECT id FROM exam_registrations WHERE registration_id = g.id)))) AS delivery_needs_review,
            EXISTS (SELECT 1 FROM course_registrations c WHERE c.registration_id = g.id AND c.accommodation_required) AS accommodation_required,
            EXISTS (SELECT 1 FROM course_registrations c WHERE c.registration_id = g.id AND c.visa_required) AS visa_required,
            (SELECT json_agg(json_build_object('kind', l.kind, 'label', l.label, 'typeId', l.type_id, 'detail', l.detail, 'option', l.option, 'settled', l.settled)
                             ORDER BY l.rank, l.starts NULLS LAST, l.created_at)
               FROM (SELECT 'course' AS kind, 0 AS rank, c.course_type_label AS label, c.course_type_id AS type_id,
                            coalesce(c.declared_level_raw, c.declared_level_code) AS detail, c.course_instance_label AS option,
                            ci.start_date AS starts, c.created_at, c.status IN ('done', 'declined', 'spam') AS settled
                       FROM course_registrations c LEFT JOIN course_instances ci ON ci.id = c.course_instance_id
                      WHERE c.registration_id = g.id
                     UNION ALL
                     SELECT 'exam', 1, e.exam_type_label, e.exam_type_id, e.registration_type, e.exam_session_label,
                            (es.starts_at AT TIME ZONE 'Europe/Berlin')::date, e.created_at, e.status IN ('done', 'declined', 'spam')
                       FROM exam_registrations e LEFT JOIN exam_sessions es ON es.id = e.exam_session_id
                      WHERE e.registration_id = g.id) l) AS lines
       FROM registrations g
       ${SENDER}
       LEFT JOIN staff_users u ON u.id = g.assigned_to
       ${where}
      ORDER BY g.submitted_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    total: Number(totalRow?.n ?? 0),
    items: rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      locale: row.locale,
      status: normaliseStatus(row.status),
      assigneeName: row.assignee_name,
      submittedAt: row.submitted_at,
      personId: row.person_id,
      openFlags: Number(row.open_flags ?? 0),
      deliveryNeedsReview: row.delivery_needs_review,
      accommodationRequired: row.accommodation_required,
      visaRequired: row.visa_required,
      lines: row.lines ?? [],
    })),
  };
}

/** What became of a line: booked (its booking), on a waiting list, a later course offered, declined, or still open. */
export type LineOutcome =
  | { kind: 'open' }
  /** `schoolman`: a booking made in SchoolMan and linked to the line (0113), not booked from it here. */
  | { kind: 'booked'; bookingId: string; number: string; cancelled: boolean; schoolman: boolean }
  | { kind: 'waiting'; entryId: string; offered: boolean }
  | { kind: 'later' }
  | { kind: 'declined' };

export type RegistrationCourseLine = {
  kind: 'course';
  id: string;
  courseTypeId: string | null;
  courseTypeLabel: string | null;
  courseInstanceId: string | null;
  courseInstanceLabel: string | null;
  declaredLevelRaw: string | null;
  declaredLevelCode: string | null;
  status: WorkStatus;
  outcome: LineOutcome;
  openFlags: number;
};

export type RegistrationExamLine = {
  kind: 'exam';
  id: string;
  examTypeId: string | null;
  examTypeLabel: string | null;
  examSessionId: string | null;
  examSessionLabel: string | null;
  registrationType: string;
  officialNameConfirmed: boolean;
  status: WorkStatus;
  outcome: LineOutcome;
  openFlags: number;
};

export type RegistrationDetail = {
  id: string;
  requestId: string;
  status: WorkStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  personId: string | null;
  locale: string;
  submittedAt: Date;
  /** Who sent it, as the first line holds it (every line holds the same, kept so by `editRegistration`). */
  contact: {
    salutation: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationalityRaw: string;
    nationalityCode: string | null;
    nationalityName: string | null;
    birthDateRaw: string;
    birthDate: Date | null;
  };
  /** Visa, accommodation and their notes, asked once with the courses; null for an exam alone. */
  stay: { visaRequired: boolean; accommodationRequired: boolean; accommodationType: string | null; allergies: string | null; notes: string | null } | null;
  /** What the visitor sent, kept on a colleague's first edit (0076); null while unedited. */
  original: Record<string, unknown> | null;
  editedAt: Date | null;
  editedByName: string | null;
  /** By start; a level without a date last. */
  courses: RegistrationCourseLine[];
  exams: RegistrationExamLine[];
};

type OutcomeColumns = {
  status: string;
  booking_id: string | null;
  booking_number: string | null;
  booking_status: string | null;
  booking_schoolman?: boolean | null;
  waitlist_id: string | null;
  waitlist_status: string | null;
  later_offered?: boolean;
};

function outcomeOf(row: OutcomeColumns): LineOutcome {
  if (row.booking_id) {
    return { kind: 'booked', bookingId: row.booking_id, number: row.booking_number ?? '', cancelled: row.booking_status === 'cancelled', schoolman: row.booking_schoolman === true };
  }
  if (row.status === 'declined') return { kind: 'declined' };
  if (row.waitlist_id && (row.waitlist_status === 'waiting' || row.waitlist_status === 'offered')) {
    return { kind: 'waiting', entryId: row.waitlist_id, offered: row.waitlist_status === 'offered' };
  }
  if (row.later_offered) return { kind: 'later' };
  return { kind: 'open' };
}

const FLAGS = (entity: string, alias: string) =>
  `(SELECT count(*) FROM record_flags f WHERE f.entity = '${entity}' AND f.entity_id = ${alias}.id AND f.resolved_at IS NULL) AS open_flags`;

type ContactColumns = {
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  nationality_raw: string;
  nationality_code: string | null;
  nationality_name: string | null;
  birth_date_raw: string;
  birth_date: Date | null;
};

export async function getRegistration(id: string): Promise<RegistrationDetail | null> {
  const head = await queryFirst<{
    id: string;
    request_id: string;
    status: string;
    assigned_to: string | null;
    assignee_name: string | null;
    person_id: string | null;
    locale: string;
    submitted_at: Date;
  }>(
    `SELECT g.id, g.request_id, g.status::text AS status, g.assigned_to, u.name AS assignee_name, g.person_id, g.locale, g.submitted_at
       FROM registrations g LEFT JOIN staff_users u ON u.id = g.assigned_to
      WHERE g.id = $1`,
    [id]
  );
  if (!head) return null;

  const [courses, exams] = await Promise.all([
    query<
      ContactColumns &
        OutcomeColumns & {
          id: string;
          course_type_id: string | null;
          course_type_label: string | null;
          course_instance_id: string | null;
          course_instance_label: string | null;
          declared_level_raw: string | null;
          declared_level_code: string | null;
          visa_required: boolean;
          accommodation_required: boolean;
          accommodation_type: string | null;
          allergies: string | null;
          notes: string | null;
          original: Record<string, unknown> | null;
          edited_at: Date | null;
          edited_by_name: string | null;
          open_flags: string;
        }
    >(
      `SELECT c.id, c.salutation::text AS salutation, c.first_name, c.last_name, c.email, c.phone, c.nationality_raw, c.nationality_code,
              coalesce(n.name_de, n.name_en) AS nationality_name, c.birth_date_raw, c.birth_date,
              c.course_type_id, c.course_type_label, c.course_instance_id, c.course_instance_label, c.declared_level_raw, c.declared_level_code,
              c.visa_required, c.accommodation_required, c.accommodation_type::text AS accommodation_type, c.allergies, c.notes,
              c.original, c.edited_at, (SELECT name FROM staff_users eu WHERE eu.id = c.edited_by) AS edited_by_name,
              c.status::text AS status,
              b.id AS booking_id, b.number AS booking_number, b.status::text AS booking_status, b.schoolman AS booking_schoolman,
              w.id AS waitlist_id, w.status AS waitlist_status,
              EXISTS (SELECT 1 FROM letters l WHERE l.registration_id = c.id AND l.kind = 'registration_later_course') AS later_offered,
              ${FLAGS('course_registration', 'c')}
         FROM course_registrations c
         LEFT JOIN countries n ON n.code = c.nationality_code
         LEFT JOIN course_instances ci ON ci.id = c.course_instance_id
         LEFT JOIN LATERAL (SELECT id, number, status, filemaker_booking_id IS NOT NULL AS schoolman FROM bookings WHERE source_registration_id = c.id AND deleted_at IS NULL LIMIT 1) b ON true
         LEFT JOIN LATERAL (SELECT id, status FROM waitlist_entries WHERE registration_id = c.id ORDER BY created_at DESC LIMIT 1) w ON true
        WHERE c.registration_id = $1
        ORDER BY ci.start_date NULLS LAST, c.created_at, c.id`,
      [id]
    ),
    query<
      ContactColumns &
        OutcomeColumns & {
          id: string;
          exam_type_id: string | null;
          exam_type_label: string | null;
          exam_session_id: string | null;
          exam_session_label: string | null;
          registration_type: string;
          official_name_confirmed: boolean;
          open_flags: string;
        }
    >(
      `SELECT e.id, e.salutation::text AS salutation, e.first_name, e.last_name, e.email, e.phone, e.nationality_raw, e.nationality_code,
              coalesce(n.name_de, n.name_en) AS nationality_name, e.birth_date_raw, e.birth_date,
              e.exam_type_id, e.exam_type_label, e.exam_session_id, e.exam_session_label, e.registration_type, e.official_name_confirmed,
              e.status::text AS status,
              b.id AS booking_id, b.number AS booking_number, b.status::text AS booking_status, b.schoolman AS booking_schoolman,
              w.id AS waitlist_id, w.status AS waitlist_status,
              ${FLAGS('exam_registration', 'e')}
         FROM exam_registrations e
         LEFT JOIN countries n ON n.code = e.nationality_code
         LEFT JOIN exam_sessions es ON es.id = e.exam_session_id
         LEFT JOIN LATERAL (SELECT id, number, status, filemaker_booking_id IS NOT NULL AS schoolman FROM bookings WHERE source_exam_registration_id = e.id AND deleted_at IS NULL LIMIT 1) b ON true
         LEFT JOIN LATERAL (SELECT id, status FROM waitlist_entries WHERE exam_registration_id = e.id ORDER BY created_at DESC LIMIT 1) w ON true
        WHERE e.registration_id = $1
        ORDER BY es.starts_at NULLS LAST, e.created_at, e.id`,
      [id]
    ),
  ]);

  const first: ContactColumns | undefined = courses[0] ?? exams[0];
  if (!first) return null;
  const lead = courses[0];

  return {
    id: head.id,
    requestId: head.request_id,
    status: normaliseStatus(head.status),
    assignedTo: head.assigned_to,
    assigneeName: head.assignee_name,
    personId: head.person_id,
    locale: head.locale,
    submittedAt: head.submitted_at,
    contact: {
      salutation: first.salutation,
      firstName: first.first_name,
      lastName: first.last_name,
      email: first.email,
      phone: first.phone,
      nationalityRaw: first.nationality_raw,
      nationalityCode: first.nationality_code,
      nationalityName: first.nationality_name,
      birthDateRaw: first.birth_date_raw,
      birthDate: first.birth_date,
    },
    stay: lead
      ? {
          visaRequired: lead.visa_required,
          accommodationRequired: lead.accommodation_required,
          accommodationType: lead.accommodation_type,
          allergies: lead.allergies,
          notes: lead.notes,
        }
      : null,
    original: lead?.original ?? null,
    editedAt: lead?.edited_at ?? null,
    editedByName: lead?.edited_by_name ?? null,
    courses: courses.map((row) => ({
      kind: 'course' as const,
      id: row.id,
      courseTypeId: row.course_type_id,
      courseTypeLabel: row.course_type_label,
      courseInstanceId: row.course_instance_id,
      courseInstanceLabel: row.course_instance_label,
      declaredLevelRaw: row.declared_level_raw,
      declaredLevelCode: row.declared_level_code,
      status: normaliseStatus(row.status),
      outcome: outcomeOf(row),
      openFlags: Number(row.open_flags ?? 0),
    })),
    exams: exams.map((row) => ({
      kind: 'exam' as const,
      id: row.id,
      examTypeId: row.exam_type_id,
      examTypeLabel: row.exam_type_label,
      examSessionId: row.exam_session_id,
      examSessionLabel: row.exam_session_label,
      registrationType: row.registration_type,
      officialNameConfirmed: row.official_name_confirmed,
      status: normaliseStatus(row.status),
      outcome: outcomeOf(row),
      openFlags: Number(row.open_flags ?? 0),
    })),
  };
}

/** The Anmeldung a course or exam line belongs to: where its old address leads. */
export async function registrationOfLine(kind: 'course' | 'exam', lineId: string): Promise<string | null> {
  const row = await queryFirst<{ registration_id: string }>(
    `SELECT registration_id FROM ${kind === 'course' ? 'course_registrations' : 'exam_registrations'} WHERE id = $1`,
    [lineId]
  );
  return row?.registration_id ?? null;
}

/**
 * „Absagen" on a line — the learner no longer wants that course, or CASA cannot offer it — and its undo.
 * A booked line is not declined here: its booking is cancelled on the booking. The Anmeldung follows
 * its lines (0097's trigger): closed once every line is booked, queued or declined.
 */
export async function setLineDeclined(
  registrationId: string,
  kind: 'course' | 'exam',
  lineId: string,
  declined: boolean,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  const table = kind === 'course' ? 'course_registrations' : 'exam_registrations';
  const source = kind === 'course' ? 'source_registration_id' : 'source_exam_registration_id';
  const label = kind === 'course' ? 'course_type_label' : 'exam_type_label';
  const level = kind === 'course' ? 'coalesce(declared_level_raw, declared_level_code)' : 'NULL::text';
  const row = await queryFirst<{ label: string | null; level: string | null }>(
    `UPDATE ${table} SET status = $3::work_status
      WHERE id = $1 AND registration_id = $2
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.${source} = ${table}.id AND b.deleted_at IS NULL)
      RETURNING ${label} AS label, ${level} AS level`,
    [lineId, registrationId, declined ? 'declined' : 'new']
  );
  if (!row) return { ok: false, reason: { de: 'Diese Position ist schon gebucht.', en: 'This line is already booked.' } };
  if (!declined) {
    // Reopened: an Anmeldung its lines had closed is open again.
    await query(`UPDATE registrations SET status = 'in_progress' WHERE id = $1 AND status IN ('done', 'declined')`, [registrationId]);
  }
  await logActivity({
    actor,
    entity: 'registration',
    entityId: registrationId,
    action: declined ? 'registration_line_declined' : 'registration_line_reopened',
    detail: { label: [row.label, row.level?.split(/\s/)[0]].filter(Boolean).join(' ') },
  });
  return { ok: true };
}
