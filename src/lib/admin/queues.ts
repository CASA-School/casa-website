import { query, queryFirst, withTransaction } from './db';
import type { StaffUser } from './auth';

/**
 * The four inbound queues, and the two mutations they all share.
 *
 * Everything that arrives from the public site is worked the same way: it gets
 * a status and an owner, and both changes are recorded. Writing that four times
 * guaranteed four subtly different versions, so the shared half lives here and
 * only the reading and rendering of a record stays bespoke — which is right,
 * because an exam candidate and a job applicant have almost nothing in common
 * beyond a name and an inbox.
 *
 * `ENTITIES` is an allowlist, not a convenience. A table name cannot be
 * parameterised in SQL, so it has to be interpolated; the only safe way to
 * interpolate one is to look it up in a constant map, never to accept it from a
 * caller. Every function here goes through `resolve()` for that reason.
 */

export const WORK_STATUSES = [
  'new',
  'in_progress',
  'waiting',
  'done',
  'declined',
  'spam',
] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];

export const STATUS_LABELS: Record<WorkStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  waiting: 'Waiting on them',
  done: 'Done',
  declined: 'Declined',
  spam: 'Spam',
};

/**
 * How each status reads at a glance. Only two carry colour: `new` — because an
 * unanswered enquiry is the costliest thing in the building — and the two
 * closing states. Everything else is neutral, so a full list is not a rainbow.
 */
export const STATUS_TONES: Record<WorkStatus, 'accent' | 'neutral' | 'positive' | 'quiet'> = {
  new: 'accent',
  in_progress: 'neutral',
  waiting: 'neutral',
  done: 'positive',
  declined: 'quiet',
  spam: 'quiet',
};

export type QueueEntity =
  | 'enquiry'
  | 'course_registration'
  | 'exam_registration'
  | 'career_application';

type EntitySpec = {
  table: string;
  /** Where the record lives in the workspace, for links and redirects. */
  path: string;
  singular: string;
  /**
   * `career_applications.status` predates the workspace and is plain text with
   * its own vocabulary — the public apply route writes 'submitted'. The others
   * use the `work_status` enum, which Postgres will not accept as a bare
   * string parameter.
   */
  statusColumn: 'enum' | 'text';
};

const ENTITIES: Record<QueueEntity, EntitySpec> = {
  enquiry: {
    table: 'enquiries',
    path: '/admin/enquiries',
    singular: 'Enquiry',
    statusColumn: 'enum',
  },
  course_registration: {
    table: 'course_registrations',
    path: '/admin/registrations/course',
    singular: 'Course registration',
    statusColumn: 'enum',
  },
  exam_registration: {
    table: 'exam_registrations',
    path: '/admin/registrations/exam',
    singular: 'Exam registration',
    statusColumn: 'enum',
  },
  career_application: {
    table: 'career_applications',
    path: '/admin/applications',
    singular: 'Application',
    statusColumn: 'text',
  },
};

function resolve(entity: QueueEntity): EntitySpec {
  const spec = ENTITIES[entity];

  if (!spec) {
    throw new Error(`Unknown queue entity: ${entity}`);
  }

  return spec;
}

export const queuePath = (entity: QueueEntity) => resolve(entity).path;
export const queueLabel = (entity: QueueEntity) => resolve(entity).singular;

/**
 * Career applications are the one queue whose incoming status is 'submitted'.
 * Mapped on read so the workspace has one vocabulary; the stored value is left
 * alone until staff touch the row, so nothing the public route wrote is
 * rewritten behind its back.
 */
export function normaliseStatus(value: string | null | undefined): WorkStatus {
  if (value === 'submitted' || value === null || value === undefined) {
    return 'new';
  }

  if (value === 'interview') {
    return 'in_progress';
  }

  return (WORK_STATUSES as readonly string[]).includes(value) ? (value as WorkStatus) : 'new';
}

/**
 * Moves a record to a new status and records who did it.
 *
 * One transaction: a status change nobody can attribute is worse than no
 * status column, since it invites exactly the "who marked this done?" argument
 * the workspace exists to end. The previous value is read inside the
 * transaction and logged, so the trail reads as a change and not a state.
 */
export async function setQueueStatus({
  entity,
  id,
  status,
  actor,
}: {
  entity: QueueEntity;
  id: string;
  status: WorkStatus;
  actor: StaffUser;
}): Promise<void> {
  const spec = resolve(entity);
  const cast = spec.statusColumn === 'enum' ? '::work_status' : '';

  await withTransaction(async (client) => {
    const previous = await client.query<{ status: string | null }>(
      `SELECT status FROM ${spec.table} WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (previous.rowCount === 0) {
      throw new Error(`${spec.singular} ${id} not found`);
    }

    const from = normaliseStatus(previous.rows[0].status);

    if (from === status) {
      return;
    }

    await client.query(`UPDATE ${spec.table} SET status = $2${cast} WHERE id = $1`, [id, status]);

    await client.query(
      `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
       VALUES ($1, $2, $3, $4, 'status_changed', $5)`,
      [actor.id, actor.name, entity, id, JSON.stringify({ from, to: status })]
    );
  });
}

/** Assigns or unassigns a record. `staffUserId` of null clears the owner. */
export async function setQueueAssignee({
  entity,
  id,
  staffUserId,
  actor,
}: {
  entity: QueueEntity;
  id: string;
  staffUserId: string | null;
  actor: StaffUser;
}): Promise<void> {
  const spec = resolve(entity);

  await withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE ${spec.table} SET assigned_to = $2 WHERE id = $1`,
      [id, staffUserId]
    );

    if (updated.rowCount === 0) {
      throw new Error(`${spec.singular} ${id} not found`);
    }

    const assignee = staffUserId
      ? await client.query<{ name: string }>(`SELECT name FROM staff_users WHERE id = $1`, [
          staffUserId,
        ])
      : null;

    await client.query(
      `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actor.id,
        actor.name,
        entity,
        id,
        staffUserId ? 'assigned' : 'unassigned',
        JSON.stringify({ to: assignee?.rows[0]?.name ?? null }),
      ]
    );
  });
}

/** Counts per status for one queue, for the filter chips above a list. */
export async function queueStatusCounts(
  entity: QueueEntity
): Promise<{ total: number; byStatus: Record<WorkStatus, number> }> {
  const spec = resolve(entity);

  const rows = await query<{ status: string | null; n: string }>(
    `SELECT status, count(*) AS n FROM ${spec.table} GROUP BY status`
  );

  const byStatus = Object.fromEntries(WORK_STATUSES.map((s) => [s, 0])) as Record<
    WorkStatus,
    number
  >;
  let total = 0;

  for (const row of rows) {
    const count = Number(row.n);
    byStatus[normaliseStatus(row.status)] += count;
    total += count;
  }

  return { total, byStatus };
}

/** How many rows in one queue are still untouched. Drives the sidebar badges. */
export async function unhandledCount(entity: QueueEntity): Promise<number> {
  const spec = resolve(entity);
  const openStates =
    spec.statusColumn === 'text' ? ['new', 'submitted'] : ['new'];

  const row = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM ${spec.table} WHERE status::text = ANY($1)`,
    [openStates]
  );

  return Number(row?.n ?? 0);
}
