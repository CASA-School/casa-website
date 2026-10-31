import 'server-only';

import { z } from 'zod';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst, withTransaction } from './db';
import { FEEDBACK_LIMITS, isFeedbackKind, type FeedbackContext, type FeedbackImageType, type FeedbackKind, type MyFeedback } from './feedback-shared';
import { inboxConditions, inboxOrder, type InboxPeriod, type InboxState } from './inbox';
import { normaliseStatus, type WorkStatus } from './queues';

/**
 * Feedback from the team (0112, Rahman 2026-10-31): sent from any screen with „Feedback" in the top bar,
 * read and worked by whoever holds the module `feedback`, like an inbox record. The sender sees their own
 * under „Mein Feedback", with its state and the answer. docs/ADMIN_WORKSPACE.md §Feedback.
 */

const text = (max: number) => z.string().trim().max(max);

/** What the panel sends besides the text, checked field by field; anything else is dropped. */
const ContextSchema = z
  .object({
    url: text(600).optional(),
    viewport: text(40).optional(),
    screen: text(40).optional(),
    userAgent: text(400).optional(),
    lang: z.enum(['de', 'en']).optional(),
    trail: z.array(z.object({ path: text(500), title: text(200) })).max(8).optional(),
    errors: z.array(z.object({ message: text(500), at: text(40) })).max(10).optional(),
  })
  .partial();

export function parseFeedbackContext(raw: unknown): FeedbackContext {
  if (typeof raw !== 'string' || raw.length > 16_000) return {};
  try {
    const parsed = ContextSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** A workspace address, or nothing: the page a feedback was sent from is only ever one of ours. */
export const workspacePath = (value: unknown) =>
  typeof value === 'string' && /^\/admin(\/|$|\?)/.test(value) && value.length <= 500 && !value.includes('//') ? value : null;

/**
 * A browser that says where a request came from must name this host (the proxy's, behind Azure's
 * ingress). With the session cookie's SameSite=Lax, a form on another site cannot post in a colleague's name.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0].trim();
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export type NewFeedback = {
  kind: FeedbackKind;
  message: string;
  pagePath: string | null;
  pageTitle: string | null;
  context: FeedbackContext;
  files: { type: FeedbackImageType; bytes: Uint8Array }[];
};

export async function createFeedback(sender: StaffUser, input: NewFeedback): Promise<{ id: string; number: number }> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string; number: number }>(
      `INSERT INTO staff_feedback (kind, message, page_path, page_title, context, sender_id, sender_name)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING id, number`,
      [input.kind, input.message, input.pagePath, input.pageTitle, JSON.stringify(input.context), sender.id, sender.name]
    );
    const created = rows[0];
    for (const [position, file] of input.files.entries()) {
      await client.query(
        `INSERT INTO staff_feedback_files (feedback_id, position, content_type, byte_size, content) VALUES ($1, $2, $3, $4, $5)`,
        [created.id, position, file.type, file.bytes.byteLength, Buffer.from(file.bytes)]
      );
    }
    return created;
  });
}

export type FeedbackListItem = {
  id: string;
  number: number;
  kind: FeedbackKind;
  senderName: string;
  pageTitle: string | null;
  messageStart: string;
  files: number;
  status: WorkStatus;
  submittedAt: Date;
  assigneeName: string | null;
};

const kindOf = (value: string): FeedbackKind => (isFeedbackKind(value) ? value : 'idea');

/** The inbox's list (`InboxScreen`): the week, the history or a search, as every inbox reads. */
export async function listFeedback({
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
}): Promise<{ items: FeedbackListItem[]; total: number }> {
  const params: unknown[] = [];
  const conditions = inboxConditions('feedback', 'f', { period, state });
  if (search) {
    const number = search.replace(/^#/, '');
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(f.message ILIKE ${p} OR f.sender_name ILIKE ${p} OR f.page_title ILIKE ${p}${/^\d{1,9}$/.test(number) ? ` OR f.number = ${Number(number)}` : ''})`
    );
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const [total, rows] = await Promise.all([
    queryFirst<{ n: string }>(`SELECT count(*) AS n FROM staff_feedback f ${where}`, params),
    query<{
      id: string;
      number: number;
      kind: string;
      sender_name: string;
      page_title: string | null;
      message_start: string;
      files: string;
      status: string;
      submitted_at: Date;
      assignee_name: string | null;
    }>(
      `SELECT f.id, f.number, f.kind, f.sender_name, f.page_title, left(f.message, 240) AS message_start,
              (SELECT count(*) FROM staff_feedback_files x WHERE x.feedback_id = f.id) AS files,
              f.status::text AS status, f.submitted_at, u.name AS assignee_name
         FROM staff_feedback f
         LEFT JOIN staff_users u ON u.id = f.assigned_to
         ${where}
        ORDER BY ${inboxOrder('feedback', 'f')}
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params
    ),
  ]);
  return {
    total: Number(total?.n ?? 0),
    items: rows.map((r) => ({
      id: r.id,
      number: r.number,
      kind: kindOf(r.kind),
      senderName: r.sender_name,
      pageTitle: r.page_title,
      messageStart: r.message_start,
      files: Number(r.files),
      status: normaliseStatus(r.status),
      submittedAt: r.submitted_at,
      assigneeName: r.assignee_name,
    })),
  };
}

export type FeedbackDetail = {
  id: string;
  number: number;
  kind: FeedbackKind;
  message: string;
  pagePath: string | null;
  pageTitle: string | null;
  context: FeedbackContext;
  senderId: string | null;
  senderName: string;
  senderEmail: string | null;
  status: WorkStatus;
  assignedTo: string | null;
  answer: string | null;
  answeredAt: Date | null;
  answeredBy: string | null;
  senderSeenAt: Date | null;
  mailedAt: Date | null;
  submittedAt: Date;
  files: { id: string; contentType: FeedbackImageType; byteSize: number }[];
};

export async function getFeedback(id: string): Promise<FeedbackDetail | null> {
  const row = await queryFirst<{
    id: string;
    number: number;
    kind: string;
    message: string;
    page_path: string | null;
    page_title: string | null;
    context: FeedbackContext | null;
    sender_id: string | null;
    sender_name: string;
    sender_email: string | null;
    status: string;
    assigned_to: string | null;
    answer: string | null;
    answered_at: Date | null;
    answered_by_name: string | null;
    sender_seen_at: Date | null;
    mailed_at: Date | null;
    submitted_at: Date;
    files: { id: string; content_type: FeedbackImageType; byte_size: number }[] | null;
  }>(
    `SELECT f.id, f.number, f.kind, f.message, f.page_path, f.page_title, f.context, f.sender_id, f.sender_name,
            s.email AS sender_email, f.status::text AS status, f.assigned_to, f.answer, f.answered_at,
            a.name AS answered_by_name, f.sender_seen_at, f.mailed_at, f.submitted_at,
            (SELECT json_agg(json_build_object('id', x.id, 'content_type', x.content_type, 'byte_size', x.byte_size) ORDER BY x.position)
               FROM staff_feedback_files x WHERE x.feedback_id = f.id) AS files
       FROM staff_feedback f
       LEFT JOIN staff_users s ON s.id = f.sender_id
       LEFT JOIN staff_users a ON a.id = f.answered_by
      WHERE f.id = $1`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id,
    number: row.number,
    kind: kindOf(row.kind),
    message: row.message,
    pagePath: row.page_path,
    pageTitle: row.page_title,
    context: row.context ?? {},
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    status: normaliseStatus(row.status),
    assignedTo: row.assigned_to,
    answer: row.answer,
    answeredAt: row.answered_at,
    answeredBy: row.answered_by_name,
    senderSeenAt: row.sender_seen_at,
    mailedAt: row.mailed_at,
    submittedAt: row.submitted_at,
    files: (row.files ?? []).map((f) => ({ id: f.id, contentType: f.content_type, byteSize: f.byte_size })),
  };
}

/** One screenshot, with who sent it: the route serves it to the module's holders and to the sender. */
export async function getFeedbackFile(feedbackId: string, fileId: string) {
  const row = await queryFirst<{ content_type: FeedbackImageType; content: Buffer; sender_id: string | null; number: number; position: number }>(
    `SELECT x.content_type, x.content, f.sender_id, f.number, x.position
       FROM staff_feedback_files x JOIN staff_feedback f ON f.id = x.feedback_id
      WHERE x.feedback_id = $1 AND x.id = $2`,
    [feedbackId, fileId]
  );
  return row
    ? { contentType: row.content_type, content: row.content, senderId: row.sender_id, name: `feedback-${row.number}-${row.position + 1}` }
    : null;
}

/** Every screenshot of one feedback, for its mail. */
export async function feedbackFiles(feedbackId: string) {
  return query<{ id: string; content_type: FeedbackImageType; content: Buffer }>(
    `SELECT id, content_type, content FROM staff_feedback_files WHERE feedback_id = $1 ORDER BY position`,
    [feedbackId]
  );
}

/** The sender's own, newest first: what „Mein Feedback" shows. */
export async function myFeedback(userId: string): Promise<MyFeedback[]> {
  const rows = await query<{
    id: string;
    number: number;
    kind: string;
    message: string;
    page_title: string | null;
    status: string;
    submitted_at: Date;
    answer: string | null;
    answered_at: Date | null;
    answered_by_name: string | null;
    unread: boolean;
    files: string[] | null;
  }>(
    `SELECT f.id, f.number, f.kind, f.message, f.page_title, f.status::text AS status, f.submitted_at,
            f.answer, f.answered_at, a.name AS answered_by_name,
            (f.answered_at IS NOT NULL AND (f.sender_seen_at IS NULL OR f.sender_seen_at < f.answered_at)) AS unread,
            (SELECT array_agg(x.id ORDER BY x.position) FROM staff_feedback_files x WHERE x.feedback_id = f.id) AS files
       FROM staff_feedback f
       LEFT JOIN staff_users a ON a.id = f.answered_by
      WHERE f.sender_id = $1 AND f.status <> 'spam'
      ORDER BY f.submitted_at DESC
      LIMIT 40`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    kind: kindOf(r.kind),
    message: r.message,
    pageTitle: r.page_title,
    status: normaliseStatus(r.status),
    submittedAt: r.submitted_at.toISOString(),
    answer: r.answer,
    answeredAt: r.answered_at?.toISOString() ?? null,
    answeredBy: r.answered_by_name,
    unread: r.unread,
    files: r.files ?? [],
  }));
}

/** The sender opened „Mein Feedback": every answer there is read. */
export async function markMyFeedbackSeen(userId: string): Promise<void> {
  await query(
    `UPDATE staff_feedback SET sender_seen_at = now()
      WHERE sender_id = $1 AND answered_at IS NOT NULL AND (sender_seen_at IS NULL OR sender_seen_at < answered_at)`,
    [userId]
  );
}

/** The answer the sender reads; an empty one takes it back. */
export async function setFeedbackAnswer(id: string, answer: string, actor: StaffUser): Promise<boolean> {
  const value = answer.trim().slice(0, FEEDBACK_LIMITS.answer) || null;
  const updated = await query<{ id: string }>(
    `UPDATE staff_feedback
        SET answer = $2,
            answered_at = CASE WHEN $2::text IS NULL THEN NULL ELSE now() END,
            answered_by = CASE WHEN $2::text IS NULL THEN NULL ELSE $3::uuid END
      WHERE id = $1 AND answer IS DISTINCT FROM $2::text
      RETURNING id`,
    [id, value, actor.id]
  );
  if (updated.length) {
    await logActivity({ actor, entity: 'feedback', entityId: id, action: value ? 'feedback_answered' : 'feedback_answer_removed' });
  }
  return updated.length > 0;
}

export async function markFeedbackMailed(id: string): Promise<void> {
  await query(`UPDATE staff_feedback SET mailed_at = now() WHERE id = $1`, [id]);
}

export async function deleteFeedback(id: string, actor: StaffUser): Promise<boolean> {
  const removed = await query<{ number: number }>(`DELETE FROM staff_feedback WHERE id = $1 RETURNING number`, [id]);
  if (!removed.length) return false;
  await query(`DELETE FROM staff_notes WHERE entity = 'feedback' AND entity_id = $1`, [id]);
  await logActivity({ actor, entity: 'feedback', entityId: null, action: 'feedback_deleted', detail: { number: removed[0].number } });
  return true;
}
