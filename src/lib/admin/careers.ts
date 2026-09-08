import { query, queryFirst } from './db';
import { normaliseStatus, type WorkStatus } from './queues';

/**
 * Career applications.
 *
 * The only queue that predates the workspace: `career_applications` and
 * `career_application_files` are written by the public apply route, CV included.
 *
 * THE CV IS NOT READ HERE. The file lives in `career_application_files` as
 * bytes, and a list or detail query that selected it would pull every megabyte
 * into the render. It is streamed by its own route handler instead, which is
 * also the only place the download can be authorised.
 */

export type ApplicationListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  positionTitle: string;
  status: WorkStatus;
  /** The raw stored value, for the rows the public route wrote as 'submitted'. */
  rawStatus: string;
  assigneeName: string | null;
  cvFileName: string;
  cvFileSize: number;
  createdAt: Date;
};

export type ApplicationDetail = ApplicationListItem & {
  phone: string | null;
  linkedinUrl: string | null;
  coverLetter: string;
  positionSlug: string;
  locale: string;
  source: string;
  cvMimeType: string | null;
  assignedTo: string | null;
  hasStoredFile: boolean;
};

export async function listApplications({
  status,
  search,
  limit = 40,
  offset = 0,
}: {
  status?: WorkStatus | 'open' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ApplicationListItem[]; total: number }> {
  const params: unknown[] = [];
  const conditions: string[] = [];

  // 'submitted' is what the public route writes; it means the same as 'new'.
  if (status === 'open' || status === undefined) {
    conditions.push(`a.status IN ('submitted', 'new', 'in_progress', 'waiting', 'interview')`);
  } else if (status !== 'all') {
    params.push(status === 'new' ? ['new', 'submitted'] : [status]);
    conditions.push(`a.status = ANY($${params.length})`);
  }

  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(a.first_name ILIKE ${p} OR a.last_name ILIKE ${p} OR a.email ILIKE ${p} OR a.position_title ILIKE ${p})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRow = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM career_applications a ${where}`,
    params
  );

  const rows = await query<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position_title: string;
    status: string;
    assignee_name: string | null;
    cv_file_name: string;
    cv_file_size: number;
    created_at: Date;
  }>(
    `SELECT a.id,
            a.first_name,
            a.last_name,
            a.email,
            a.position_title,
            a.status,
            u.name AS assignee_name,
            a.cv_file_name,
            a.cv_file_size,
            a.created_at
       FROM career_applications a
       LEFT JOIN staff_users u ON u.id = a.assigned_to
       ${where}
      ORDER BY a.created_at DESC
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
      positionTitle: row.position_title,
      status: normaliseStatus(row.status),
      rawStatus: row.status,
      assigneeName: row.assignee_name,
      cvFileName: row.cv_file_name,
      cvFileSize: row.cv_file_size,
      createdAt: row.created_at,
    })),
  };
}

export async function getApplication(id: string): Promise<ApplicationDetail | null> {
  const row = await queryFirst<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    linkedin_url: string | null;
    cover_letter: string;
    position_title: string;
    position_slug: string;
    locale: string;
    source: string;
    status: string;
    assigned_to: string | null;
    assignee_name: string | null;
    cv_file_name: string;
    cv_file_size: number;
    cv_mime_type: string | null;
    created_at: Date;
    has_stored_file: boolean;
  }>(
    `SELECT a.id,
            a.first_name,
            a.last_name,
            a.email,
            a.phone,
            a.linkedin_url,
            a.cover_letter,
            a.position_title,
            a.position_slug,
            a.locale,
            a.source,
            a.status,
            a.assigned_to,
            u.name AS assignee_name,
            a.cv_file_name,
            a.cv_file_size,
            a.cv_mime_type,
            a.created_at,
            (f.career_application_id IS NOT NULL) AS has_stored_file
       FROM career_applications a
       LEFT JOIN staff_users u ON u.id = a.assigned_to
       LEFT JOIN career_application_files f ON f.career_application_id = a.id
      WHERE a.id = $1`,
    [id]
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    linkedinUrl: row.linkedin_url,
    coverLetter: row.cover_letter,
    positionTitle: row.position_title,
    positionSlug: row.position_slug,
    locale: row.locale,
    source: row.source,
    status: normaliseStatus(row.status),
    rawStatus: row.status,
    assigneeName: row.assignee_name,
    assignedTo: row.assigned_to,
    cvFileName: row.cv_file_name,
    cvFileSize: row.cv_file_size,
    cvMimeType: row.cv_mime_type,
    createdAt: row.created_at,
    hasStoredFile: row.has_stored_file,
  };
}

/** The stored CV, for the download route. Nothing else may select these bytes. */
export async function getApplicationFile(
  id: string
): Promise<{ fileName: string; mimeType: string | null; content: Buffer } | null> {
  const row = await queryFirst<{
    file_name: string;
    mime_type: string | null;
    file_bytes: Buffer;
  }>(
    `SELECT file_name, mime_type, file_bytes
       FROM career_application_files
      WHERE career_application_id = $1`,
    [id]
  );

  if (!row) {
    return null;
  }

  return { fileName: row.file_name, mimeType: row.mime_type, content: row.file_bytes };
}
