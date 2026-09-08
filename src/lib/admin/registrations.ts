import { query, queryFirst } from './db';
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
  /** The course or exam the person chose, as they saw it named. */
  productLabel: string;
  /** The dated option within it: a cohort start, or an exam sitting. */
  optionLabel: string | null;
  status: WorkStatus;
  assigneeName: string | null;
  submittedAt: Date;
  /** Course only. Set when the learner asked for a room. */
  accommodationRequired?: boolean;
  /** Course only, self-declared. Exam only: which part they are sitting. */
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
  nationality: string;
  birthDate: string;
  currentLevel: string | null;
  courseTypeLabel: string | null;
  courseInstanceLabel: string | null;
  courseTypeId: string | null;
  courseInstanceId: string | null;
  visaRequired: boolean;
  accommodationRequired: boolean;
  accommodationType: string | null;
  smoker: boolean;
  allergies: string | null;
  notes: string | null;
  locale: string;
  status: WorkStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  externalRef: string | null;
  submittedAt: Date;
};

export type ExamRegistrationDetail = {
  id: string;
  requestId: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  birthDate: string;
  examTypeLabel: string | null;
  examSessionLabel: string | null;
  examTypeId: string | null;
  examSessionId: string | null;
  registrationType: string;
  officialNameConfirmed: boolean;
  locale: string;
  status: WorkStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  externalRef: string | null;
  submittedAt: Date;
};

const REGISTRATION_TYPE_LABELS: Record<string, string> = {
  full: 'Full exam',
  written: 'Written part only',
  oral: 'Oral part only',
};

export const registrationTypeLabel = (value: string) =>
  REGISTRATION_TYPE_LABELS[value] ?? value;

function statusFilter(
  column: string,
  status: WorkStatus | 'open' | 'all' | undefined,
  params: unknown[]
): string | null {
  if (status === 'open' || status === undefined) {
    return `${column} IN ('new', 'in_progress', 'waiting')`;
  }

  if (status === 'all') {
    return null;
  }

  params.push(status);
  return `${column} = $${params.length}::work_status`;
}

export async function listCourseRegistrations({
  status,
  search,
  limit = 40,
  offset = 0,
}: {
  status?: WorkStatus | 'open' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: RegistrationListItem[]; total: number }> {
  const params: unknown[] = [];
  const conditions: string[] = [];

  const statusClause = statusFilter('r.status', status, params);
  if (statusClause) conditions.push(statusClause);

  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(r.first_name ILIKE ${p} OR r.last_name ILIKE ${p} OR r.email ILIKE ${p} OR r.course_type_label ILIKE ${p})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

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
    current_level: string | null;
    accommodation_required: boolean;
    status: string;
    assignee_name: string | null;
    submitted_at: Date;
  }>(
    `SELECT r.id,
            r.first_name,
            r.last_name,
            r.email,
            r.course_type_label,
            r.course_instance_label,
            r.current_level,
            r.accommodation_required,
            r.status::text AS status,
            u.name AS assignee_name,
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
      productLabel: row.course_type_label ?? 'Course',
      optionLabel: row.course_instance_label,
      status: normaliseStatus(row.status),
      assigneeName: row.assignee_name,
      submittedAt: row.submitted_at,
      accommodationRequired: row.accommodation_required,
      detailNote: row.current_level,
    })),
  };
}

export async function listExamRegistrations({
  status,
  search,
  limit = 40,
  offset = 0,
}: {
  status?: WorkStatus | 'open' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: RegistrationListItem[]; total: number }> {
  const params: unknown[] = [];
  const conditions: string[] = [];

  const statusClause = statusFilter('r.status', status, params);
  if (statusClause) conditions.push(statusClause);

  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(r.first_name ILIKE ${p} OR r.last_name ILIKE ${p} OR r.email ILIKE ${p} OR r.exam_type_label ILIKE ${p})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

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
    status: string;
    assignee_name: string | null;
    submitted_at: Date;
  }>(
    `SELECT r.id,
            r.first_name,
            r.last_name,
            r.email,
            r.exam_type_label,
            r.exam_session_label,
            r.registration_type,
            r.status::text AS status,
            u.name AS assignee_name,
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
      productLabel: row.exam_type_label ?? 'Exam',
      optionLabel: row.exam_session_label,
      status: normaliseStatus(row.status),
      assigneeName: row.assignee_name,
      submittedAt: row.submitted_at,
      detailNote: registrationTypeLabel(row.registration_type),
    })),
  };
}

export async function getCourseRegistration(
  id: string
): Promise<CourseRegistrationDetail | null> {
  const found = await queryFirst<{
    id: string;
    request_id: string;
    salutation: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    nationality: string;
    birth_date: string;
    current_level: string | null;
    course_type_label: string | null;
    course_instance_label: string | null;
    course_type_id: string | null;
    course_instance_id: string | null;
    visa_required: boolean;
    accommodation_required: boolean;
    accommodation_type: string | null;
    smoker: boolean;
    allergies: string | null;
    notes: string | null;
    locale: string;
    status: string;
    assigned_to: string | null;
    assignee_name: string | null;
    external_ref: string | null;
    submitted_at: Date;
  }>(
    `SELECT r.id,
            r.request_id,
            r.salutation,
            r.first_name,
            r.last_name,
            r.email,
            r.phone,
            r.nationality,
            r.birth_date,
            r.current_level,
            r.course_type_label,
            r.course_instance_label,
            r.course_type_id,
            r.course_instance_id,
            r.visa_required,
            r.accommodation_required,
            r.accommodation_type,
            r.smoker,
            r.allergies,
            r.notes,
            r.locale,
            r.status::text AS status,
            r.assigned_to,
            u.name AS assignee_name,
            r.external_ref,
            r.submitted_at
       FROM course_registrations r
       LEFT JOIN staff_users u ON u.id = r.assigned_to
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
    nationality: found.nationality,
    birthDate: found.birth_date,
    currentLevel: found.current_level,
    courseTypeLabel: found.course_type_label,
    courseInstanceLabel: found.course_instance_label,
    courseTypeId: found.course_type_id,
    courseInstanceId: found.course_instance_id,
    visaRequired: found.visa_required,
    accommodationRequired: found.accommodation_required,
    accommodationType: found.accommodation_type,
    smoker: found.smoker,
    allergies: found.allergies,
    notes: found.notes,
    locale: found.locale,
    status: normaliseStatus(found.status),
    assignedTo: found.assigned_to,
    assigneeName: found.assignee_name,
    externalRef: found.external_ref,
    submittedAt: found.submitted_at,
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
    nationality: string;
    birth_date: string;
    exam_type_label: string | null;
    exam_session_label: string | null;
    exam_type_id: string | null;
    exam_session_id: string | null;
    registration_type: string;
    official_name_confirmed: boolean;
    locale: string;
    status: string;
    assigned_to: string | null;
    assignee_name: string | null;
    external_ref: string | null;
    submitted_at: Date;
  }>(
    `SELECT r.id,
            r.request_id,
            r.salutation,
            r.first_name,
            r.last_name,
            r.email,
            r.phone,
            r.nationality,
            r.birth_date,
            r.exam_type_label,
            r.exam_session_label,
            r.exam_type_id,
            r.exam_session_id,
            r.registration_type,
            r.official_name_confirmed,
            r.locale,
            r.status::text AS status,
            r.assigned_to,
            u.name AS assignee_name,
            r.external_ref,
            r.submitted_at
       FROM exam_registrations r
       LEFT JOIN staff_users u ON u.id = r.assigned_to
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
    nationality: found.nationality,
    birthDate: found.birth_date,
    examTypeLabel: found.exam_type_label,
    examSessionLabel: found.exam_session_label,
    examTypeId: found.exam_type_id,
    examSessionId: found.exam_session_id,
    registrationType: found.registration_type,
    officialNameConfirmed: found.official_name_confirmed,
    locale: found.locale,
    status: normaliseStatus(found.status),
    assignedTo: found.assigned_to,
    assigneeName: found.assignee_name,
    externalRef: found.external_ref,
    submittedAt: found.submitted_at,
  };
}
