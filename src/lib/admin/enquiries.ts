import { query, queryFirst } from './db';
import { normaliseStatus, type WorkStatus } from './queues';

/**
 * Reads for the enquiry queue.
 *
 * `organiser_brief` is returned as-is. It is a jsonb bag whose keys come from
 * `organiserBriefFields()` in src/lib/validation/contact.ts and change when the
 * public form changes, so typing it here would guarantee the two drift apart;
 * the detail view renders whatever keys are present and labels the ones it
 * knows.
 */

export type EnquiryListItem = {
  id: string;
  kind: 'general' | 'group' | 'company';
  firstName: string;
  lastName: string | null;
  email: string;
  topic: string;
  message: string;
  status: WorkStatus;
  assigneeName: string | null;
  submittedAt: Date;
  personId: string | null;
  /** Unresolved record_flags — "needs a look" markers in a list. */
  openFlags: number;
};

export type EnquiryDetail = EnquiryListItem & {
  requestId: string;
  locale: string;
  topicKey: string | null;
  source: string;
  organiserBrief: Record<string, unknown> | null;
  userAgent: string | null;
  assignedTo: string | null;
};

type Row = {
  id: string;
  request_id: string;
  kind: string;
  locale: string;
  first_name: string;
  last_name: string | null;
  email: string;
  topic: string;
  topic_key: string | null;
  message: string;
  source: string;
  organiser_brief: Record<string, unknown> | null;
  status: string;
  assigned_to: string | null;
  assignee_name: string | null;
  user_agent: string | null;
  person_id: string | null;
  open_flags: string;
  submitted_at: Date;
};

const SELECT = `
  SELECT e.id,
         e.request_id,
         e.kind,
         e.locale,
         e.first_name,
         e.last_name,
         e.email,
         e.topic,
         e.topic_key,
         e.message,
         e.source,
         e.organiser_brief,
         e.status::text AS status,
         e.assigned_to,
         u.name AS assignee_name,
         e.user_agent,
         e.person_id,
         (SELECT count(*) FROM record_flags f
           WHERE f.entity = 'enquiry' AND f.entity_id = e.id AND f.resolved_at IS NULL) AS open_flags,
         e.submitted_at
    FROM enquiries e
    LEFT JOIN staff_users u ON u.id = e.assigned_to
`;

const toListItem = (row: Row): EnquiryListItem => ({
  id: row.id,
  kind: row.kind === 'group' || row.kind === 'company' ? row.kind : 'general',
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  topic: row.topic,
  message: row.message,
  status: normaliseStatus(row.status),
  assigneeName: row.assignee_name,
  submittedAt: row.submitted_at,
  personId: row.person_id,
  openFlags: Number(row.open_flags ?? 0),
});

export async function listEnquiries({
  status,
  search,
  limit = 50,
  offset = 0,
}: {
  status?: WorkStatus | 'open' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: EnquiryListItem[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  // "Open" is the default working view: everything that is not closed. A staff
  // member opening the queue wants their workload, not the archive.
  if (status === 'open' || status === undefined) {
    conditions.push(`e.status IN ('new', 'in_progress', 'waiting')`);
  } else if (status !== 'all') {
    params.push(status);
    conditions.push(`e.status = $${params.length}::work_status`);
  }

  if (search && search.trim().length > 0) {
    params.push(`%${search.trim()}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(e.first_name ILIKE ${p} OR e.last_name ILIKE ${p} OR e.email ILIKE ${p} OR e.topic ILIKE ${p} OR e.message ILIKE ${p})`
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRow = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM enquiries e ${where}`,
    params
  );

  const rows = await query<Row>(
    `${SELECT} ${where}
     ORDER BY e.submitted_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { items: rows.map(toListItem), total: Number(totalRow?.n ?? 0) };
}

export async function getEnquiry(id: string): Promise<EnquiryDetail | null> {
  const row = await queryFirst<Row>(`${SELECT} WHERE e.id = $1`, [id]);

  if (!row) {
    return null;
  }

  return {
    ...toListItem(row),
    requestId: row.request_id,
    locale: row.locale,
    topicKey: row.topic_key,
    source: row.source,
    organiserBrief: row.organiser_brief,
    userAgent: row.user_agent,
    assignedTo: row.assigned_to,
  };
}
