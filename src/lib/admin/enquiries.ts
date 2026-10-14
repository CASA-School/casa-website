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
  /** The language the form was sent in — the one to reply in. */
  locale: string;
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
  locale: row.locale,
  topic: row.topic,
  message: row.message,
  status: normaliseStatus(row.status),
  assigneeName: row.assignee_name,
  submittedAt: row.submitted_at,
  personId: row.person_id,
  openFlags: Number(row.open_flags ?? 0),
});

/**
 * The start of the enquiry queue's week: midnight in Bremen six days ago, so the
 * week is today and the six days before it. Everything earlier is the history.
 */
const WEEK_START = `((date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') - interval '6 days') AT TIME ZONE 'Europe/Berlin')`;

const OPEN = `('new', 'in_progress', 'waiting')`;

/** The week, the history before it, or (for a search) everything. */
export type EnquiryPeriod = 'week' | 'history' | 'all';

/** Within a period: every state but spam, only the open ones, or only the closed ones. */
export type EnquiryState = 'any' | 'open' | 'closed';

export async function listEnquiries({
  period = 'week',
  state = 'any',
  search,
  limit = 50,
  offset = 0,
}: {
  period?: EnquiryPeriod;
  state?: EnquiryState;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: EnquiryListItem[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (period === 'week') conditions.push(`e.submitted_at >= ${WEEK_START}`);
  if (period === 'history') conditions.push(`e.submitted_at < ${WEEK_START}`);

  // Spam is never part of the day's work; it stays in the table, out of sight.
  if (state === 'open') conditions.push(`e.status IN ${OPEN}`);
  else if (state === 'closed') conditions.push(`e.status IN ('done', 'declined')`);
  else conditions.push(`e.status <> 'spam'`);

  if (search && search.trim().length > 0) {
    params.push(`%${search.trim()}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(e.first_name ILIKE ${p} OR e.last_name ILIKE ${p} OR e.email ILIKE ${p} OR e.topic ILIKE ${p} OR e.message ILIKE ${p})`
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

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

/** What the queue's head counts: the week, the history, the open states, and what is open from before the week. */
export async function enquiryCounts(): Promise<{
  week: number;
  history: number;
  openOlder: number;
  new: number;
  inProgress: number;
  waiting: number;
}> {
  const row = await queryFirst<Record<'week' | 'history' | 'open_older' | 'new' | 'in_progress' | 'waiting', string>>(
    `SELECT count(*) FILTER (WHERE submitted_at >= ${WEEK_START} AND status <> 'spam') AS week,
            count(*) FILTER (WHERE submitted_at < ${WEEK_START} AND status <> 'spam') AS history,
            count(*) FILTER (WHERE submitted_at < ${WEEK_START} AND status IN ${OPEN}) AS open_older,
            count(*) FILTER (WHERE status = 'new') AS new,
            count(*) FILTER (WHERE status = 'in_progress') AS in_progress,
            count(*) FILTER (WHERE status = 'waiting') AS waiting
       FROM enquiries`
  );
  return {
    week: Number(row?.week ?? 0),
    history: Number(row?.history ?? 0),
    openOlder: Number(row?.open_older ?? 0),
    new: Number(row?.new ?? 0),
    inProgress: Number(row?.in_progress ?? 0),
    waiting: Number(row?.waiting ?? 0),
  };
}

export async function getEnquiry(id: string): Promise<EnquiryDetail | null> {
  const row = await queryFirst<Row>(`${SELECT} WHERE e.id = $1`, [id]);

  if (!row) {
    return null;
  }

  return {
    ...toListItem(row),
    requestId: row.request_id,
    topicKey: row.topic_key,
    source: row.source,
    organiserBrief: row.organiser_brief,
    userAgent: row.user_agent,
    assignedTo: row.assigned_to,
  };
}

/** The other enquiries sent from the same address, newest first: what this person asked before. */
export async function otherEnquiriesFrom(email: string, exceptId: string): Promise<EnquiryListItem[]> {
  const rows = await query<Row>(
    `${SELECT} WHERE lower(e.email) = lower($1) AND e.id <> $2 AND e.status <> 'spam' ORDER BY e.submitted_at DESC LIMIT 6`,
    [email, exceptId]
  );
  return rows.map(toListItem);
}
