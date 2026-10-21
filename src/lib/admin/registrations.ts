import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst, withTransaction } from './db';
import { EXAM_PARTS_LABELS, isExamParts } from './exam-parts';
import { pick, type Bilingual, type WsLang } from './i18n';
import { countryCodeFromName, normalizeEmail, normalizePhone } from './normalize';
import { inboxConditions, type InboxPeriod, type InboxState } from './inbox';
import { normaliseStatus, type WorkStatus } from './queues';

/**
 * Reads for the two registration queues.
 *
 * Course and exam registrations are separate tables (see
 * 0006_admin_workspace.sql) and stay separate here. What they do share is the
 * shape of the list row, so the workspace can show both under one "Registrations"
 * heading without either becoming a table of nulls.
 */

export type RegistrationKind = 'course' | 'exam';

export type RegistrationListItem = {
  id: string;
  kind: RegistrationKind;
  firstName: string;
  lastName: string;
  email: string;
  /** The language the form was sent in — the one to reply in. */
  locale: string;
  /** The course or exam the person chose, as they saw it named; null when none was stored. */
  productLabel: string | null;
  /** The dated option within it: a cohort start, or an exam sitting. */
  optionLabel: string | null;
  status: WorkStatus;
  assigneeName: string | null;
  submittedAt: Date;
  personId: string | null;
  openFlags: number;
  /** Course only. Set when the learner asked for a room. */
  accommodationRequired?: boolean;
  /**
   * Course only: the declared level, self-declared. Exam only: the stored
   * registration type (`full`, `written`, `oral`), named with `registrationTypeLabel`.
   */
  detailNote?: string | null;
};

export type CourseRegistrationDetail = {
  id: string;
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

export async function listCourseRegistrations({
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
  const conditions = inboxConditions('course_registration', 'r', { period, state });

  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(r.first_name ILIKE ${p} OR r.last_name ILIKE ${p} OR r.email ILIKE ${p} OR r.course_type_label ILIKE ${p})`
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const totalRow = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM course_registrations r ${where}`,
    params
  );

  const rows = await query<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    course_type_label: string | null;
    course_instance_label: string | null;
    declared_level: string | null;
    accommodation_required: boolean;
    locale: string;
    status: string;
    assignee_name: string | null;
    person_id: string | null;
    open_flags: string;
    submitted_at: Date;
  }>(
    `SELECT r.id,
            r.first_name,
            r.last_name,
            r.email,
            r.course_type_label,
            r.course_instance_label,
            coalesce(r.declared_level_code, r.declared_level_raw) AS declared_level,
            r.accommodation_required,
            r.locale,
            r.status::text AS status,
            u.name AS assignee_name,
            r.person_id,
            (SELECT count(*) FROM record_flags f
              WHERE f.entity = 'course_registration' AND f.entity_id = r.id AND f.resolved_at IS NULL) AS open_flags,
            r.submitted_at
       FROM course_registrations r
       LEFT JOIN staff_users u ON u.id = r.assigned_to
       ${where}
      ORDER BY r.submitted_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    total: Number(totalRow?.n ?? 0),
    items: rows.map((row) => ({
      id: row.id,
      kind: 'course' as const,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      locale: row.locale,
      productLabel: row.course_type_label,
      optionLabel: row.course_instance_label,
      status: normaliseStatus(row.status),
      assigneeName: row.assignee_name,
      submittedAt: row.submitted_at,
      personId: row.person_id,
      openFlags: Number(row.open_flags ?? 0),
      accommodationRequired: row.accommodation_required,
      detailNote: row.declared_level,
    })),
  };
}

export async function listExamRegistrations({
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
  const conditions = inboxConditions('exam_registration', 'r', { period, state });

  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(r.first_name ILIKE ${p} OR r.last_name ILIKE ${p} OR r.email ILIKE ${p} OR r.exam_type_label ILIKE ${p})`
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const totalRow = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM exam_registrations r ${where}`,
    params
  );

  const rows = await query<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    exam_type_label: string | null;
    exam_session_label: string | null;
    registration_type: string;
    locale: string;
    status: string;
    assignee_name: string | null;
    person_id: string | null;
    open_flags: string;
    submitted_at: Date;
  }>(
    `SELECT r.id,
            r.first_name,
            r.last_name,
            r.email,
            r.exam_type_label,
            r.exam_session_label,
            r.registration_type,
            r.locale,
            r.status::text AS status,
            u.name AS assignee_name,
            r.person_id,
            (SELECT count(*) FROM record_flags f
              WHERE f.entity = 'exam_registration' AND f.entity_id = r.id AND f.resolved_at IS NULL) AS open_flags,
            r.submitted_at
       FROM exam_registrations r
       LEFT JOIN staff_users u ON u.id = r.assigned_to
       ${where}
      ORDER BY r.submitted_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    total: Number(totalRow?.n ?? 0),
    items: rows.map((row) => ({
      id: row.id,
      kind: 'exam' as const,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      locale: row.locale,
      productLabel: row.exam_type_label,
      optionLabel: row.exam_session_label,
      status: normaliseStatus(row.status),
      assigneeName: row.assignee_name,
      submittedAt: row.submitted_at,
      personId: row.person_id,
      openFlags: Number(row.open_flags ?? 0),
      detailNote: row.registration_type,
    })),
  };
}

export async function getCourseRegistration(id: string): Promise<CourseRegistrationDetail | null> {
  const found = await queryFirst<{
    id: string;
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
 * edit and improve that"). The registration takes the corrected values; what the visitor sent is kept
 * once, on the first edit (`original`), and shown beside it. Its person follows while no colleague has
 * acted on them yet (off the register): the booking then starts from the corrected name and address.
 */
export async function editCourseRegistration(id: string, input: RegistrationEdit, actor: StaffUser): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  const nationalityCode = countryCodeFromName(input.nationality);
  const done = await withTransaction(async (client) => {
    const { rows } = await client.query<{ person_id: string | null }>(
      `UPDATE course_registrations
          SET original = coalesce(original, ${EDITABLE}),
              salutation = $2::salutation, first_name = $3, last_name = $4, email = $5, phone = $6,
              nationality_raw = $7, nationality_code = $8, birth_date_raw = coalesce($9, ''), birth_date = $9::date,
              visa_required = $10, accommodation_required = $11, accommodation_type = $12::accommodation_type,
              allergies = $13, notes = $14, edited_at = now(), edited_by = $15
        WHERE id = $1
        RETURNING person_id`,
      [
        id,
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
    if (!rows[0]) return false;
    const personId = rows[0].person_id;
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
  await logActivity({ actor, entity: 'course_registration', entityId: id, action: 'registration_edited' });
  return { ok: true };
}
