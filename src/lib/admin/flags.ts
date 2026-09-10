import { query } from './db';
import type { StaffUser } from './auth';

/**
 * Record flags: "this row needs a look, and here is why".
 *
 * Raised by intake and by imports, cleared by a named person. The alternative
 * — correcting a value quietly to make it fit — is how FileMaker ended up with
 * demonyms in a country field and labels in id columns
 * (docs/FILEMAKER_LESSONS.md §4.4, §11).
 */

export type FlagEntity =
  | 'person'
  | 'enquiry'
  | 'course_registration'
  | 'exam_registration'
  | 'career_application'
  | 'placement_attempt'
  | 'booking';

export type FlagCode =
  | 'duplicate_candidate'
  | 'nationality_unmatched'
  | 'level_unmatched'
  | 'birth_date_unparsed'
  | 'person_unlinked'
  | 'cohort_withdrawn'
  | 'period_without_cohort';

export const FLAG_LABELS: Record<FlagCode, string> = {
  duplicate_candidate: 'May be an existing person',
  nationality_unmatched: 'Nationality not recognised',
  level_unmatched: 'Level not recognised',
  birth_date_unparsed: 'Date of birth not readable',
  person_unlinked: 'Not linked to a person',
  cohort_withdrawn: 'Chosen cohort no longer runs',
  period_without_cohort: 'Booked dates have no cohort yet',
};

export type RecordFlag = {
  id: string;
  entity: FlagEntity;
  entityId: string;
  code: FlagCode;
  detail: Record<string, unknown> | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByName: string | null;
};

const SELECT = `
  SELECT f.id, f.entity, f.entity_id, f.code, f.detail, f.created_at, f.resolved_at,
         u.name AS resolved_by_name
    FROM record_flags f
    LEFT JOIN staff_users u ON u.id = f.resolved_by
`;

type Row = {
  id: string;
  entity: FlagEntity;
  entity_id: string;
  code: FlagCode;
  detail: Record<string, unknown> | null;
  created_at: Date;
  resolved_at: Date | null;
  resolved_by_name: string | null;
};

const toFlag = (r: Row): RecordFlag => ({
  id: r.id,
  entity: r.entity,
  entityId: r.entity_id,
  code: r.code,
  detail: r.detail,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
  resolvedByName: r.resolved_by_name,
});

/** Open flags first, then resolved, newest first within each. */
export async function listFlags(entity: FlagEntity, entityId: string): Promise<RecordFlag[]> {
  const rows = await query<Row>(
    `${SELECT} WHERE f.entity = $1 AND f.entity_id = $2
     ORDER BY (f.resolved_at IS NOT NULL), f.created_at DESC`,
    [entity, entityId]
  );
  return rows.map(toFlag);
}

/** Open-flag counts for a page of rows, so a list shows a marker without N+1. */
export async function openFlagCounts(
  entity: FlagEntity,
  entityIds: readonly string[]
): Promise<Map<string, number>> {
  if (entityIds.length === 0) return new Map();
  const rows = await query<{ entity_id: string; n: string }>(
    `SELECT entity_id, count(*) AS n FROM record_flags
      WHERE entity = $1 AND entity_id = ANY($2::uuid[]) AND resolved_at IS NULL
      GROUP BY entity_id`,
    [entity, entityIds]
  );
  return new Map(rows.map((r) => [r.entity_id, Number(r.n)]));
}

/**
 * Raises a flag; a second raise of the same open flag is a no-op.
 *
 * Callable inside a caller's transaction via `exec`, because intake raises
 * flags in the same transaction that creates the row — a row without its flag
 * is exactly the "looks fine, isn't" state this table exists to prevent.
 */
export async function raiseFlag(
  {
    entity,
    entityId,
    code,
    detail,
  }: {
    entity: FlagEntity;
    entityId: string;
    code: FlagCode;
    detail?: Record<string, unknown>;
  },
  exec: (sql: string, params: unknown[]) => Promise<unknown> = (sql, params) => query(sql, params)
): Promise<void> {
  await exec(
    `INSERT INTO record_flags (entity, entity_id, code, detail)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (entity, entity_id, code) WHERE resolved_at IS NULL DO NOTHING`,
    [entity, entityId, code, detail ? JSON.stringify(detail) : null]
  );
}

export async function resolveFlag(flagId: string, actor: StaffUser): Promise<void> {
  await query(
    `UPDATE record_flags SET resolved_at = now(), resolved_by = $2
      WHERE id = $1 AND resolved_at IS NULL`,
    [flagId, actor.id]
  );
}

/** Resolves every open flag of one code on one row — used when the cause is gone. */
export async function resolveFlagsByCode(
  entity: FlagEntity,
  entityId: string,
  code: FlagCode,
  actor: StaffUser,
  exec: (sql: string, params: unknown[]) => Promise<unknown> = (sql, params) => query(sql, params)
): Promise<void> {
  await exec(
    `UPDATE record_flags SET resolved_at = now(), resolved_by = $4
      WHERE entity = $1 AND entity_id = $2 AND code = $3 AND resolved_at IS NULL`,
    [entity, entityId, code, actor.id]
  );
}

/** Open flags by kind, for the People screen's "needs a look" band. */
export async function openFlagsByCode(): Promise<Partial<Record<FlagCode, number>>> {
  const rows = await query<{ code: FlagCode; n: string }>(
    `SELECT code, count(*) AS n FROM record_flags WHERE resolved_at IS NULL GROUP BY code`
  );
  return Object.fromEntries(rows.map((r) => [r.code, Number(r.n)]));
}

export type OpenFlag = RecordFlag & {
  /** The record's own screen, where the flag is cleared. */
  href: string;
  /** Who the record is about, so the list reads as people rather than uuids. */
  subject: string;
};

const HREF: Record<FlagEntity, string> = {
  person: '/admin/people',
  enquiry: '/admin/enquiries',
  course_registration: '/admin/registrations/course',
  exam_registration: '/admin/registrations/exam',
  career_application: '/admin/applications',
  placement_attempt: '/admin/placement',
  booking: '/admin/bookings',
};

/** Every open flag, optionally of one kind, oldest first — a work list. */
export async function listOpenFlags(code?: FlagCode, limit = 100): Promise<OpenFlag[]> {
  const params: unknown[] = [limit];
  if (code) params.push(code);
  const rows = await query<Row & { subject: string | null }>(
    `${SELECT.replace(
      'FROM record_flags f',
      `, coalesce(
           (SELECT e.first_name || ' ' || coalesce(e.last_name, '') FROM enquiries e WHERE f.entity = 'enquiry' AND e.id = f.entity_id),
           (SELECT r.first_name || ' ' || r.last_name FROM course_registrations r WHERE f.entity = 'course_registration' AND r.id = f.entity_id),
           (SELECT r.first_name || ' ' || r.last_name FROM exam_registrations r WHERE f.entity = 'exam_registration' AND r.id = f.entity_id),
           (SELECT p.first_name || ' ' || coalesce(p.last_name, '') FROM people p WHERE f.entity = 'person' AND p.id = f.entity_id),
           (SELECT p.first_name || ' ' || coalesce(p.last_name, '') FROM bookings b JOIN people p ON p.id = b.person_id WHERE f.entity = 'booking' AND b.id = f.entity_id)
         ) AS subject
       FROM record_flags f`
    )}
     WHERE f.resolved_at IS NULL ${code ? 'AND f.code = $2' : ''}
     ORDER BY f.created_at
     LIMIT $1`,
    params
  );
  return rows.map((r) => ({
    ...toFlag(r),
    href: `${HREF[r.entity]}/${r.entity_id}`,
    subject: (r.subject ?? '').trim() || 'Unknown record',
  }));
}
