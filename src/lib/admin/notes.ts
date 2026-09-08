import { query } from './db';
import type { StaffUser } from './auth';

/**
 * Staff notes on a record.
 *
 * `entity` is checked by the constraint on `staff_notes` in
 * 0006_admin_workspace.sql rather than here, so a bad value fails at the
 * database and not silently at whichever call site forgot.
 */

export type NoteEntity =
  | 'enquiry'
  | 'course_registration'
  | 'exam_registration'
  | 'career_application'
  | 'placement_attempt';

export type StaffNote = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: Date;
};

export async function listNotes(entity: NoteEntity, entityId: string): Promise<StaffNote[]> {
  const rows = await query<{
    id: string;
    body: string;
    author_name: string | null;
    created_at: Date;
  }>(
    `SELECT n.id, n.body, u.name AS author_name, n.created_at
       FROM staff_notes n
       LEFT JOIN staff_users u ON u.id = n.staff_user_id
      WHERE n.entity = $1 AND n.entity_id = $2
      ORDER BY n.created_at DESC`,
    [entity, entityId]
  );

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    authorName: row.author_name,
    createdAt: row.created_at,
  }));
}

export async function addNote({
  entity,
  entityId,
  body,
  actor,
}: {
  entity: NoteEntity;
  entityId: string;
  body: string;
  actor: StaffUser;
}): Promise<void> {
  const trimmed = body.trim();

  if (trimmed.length === 0) {
    return;
  }

  await query(
    `INSERT INTO staff_notes (entity, entity_id, staff_user_id, body)
     VALUES ($1, $2, $3, $4)`,
    [entity, entityId, actor.id, trimmed.slice(0, 4000)]
  );

  await query(
    `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action)
     VALUES ($1, $2, $3, $4, 'note_added')`,
    [actor.id, actor.name, entity, entityId]
  );
}

/** Note counts for a page of records, so a list can show "2 notes" without N+1. */
export async function noteCounts(
  entity: NoteEntity,
  entityIds: readonly string[]
): Promise<Map<string, number>> {
  if (entityIds.length === 0) {
    return new Map();
  }

  const rows = await query<{ entity_id: string; n: string }>(
    `SELECT entity_id, count(*) AS n
       FROM staff_notes
      WHERE entity = $1 AND entity_id = ANY($2::uuid[])
      GROUP BY entity_id`,
    [entity, entityIds]
  );

  return new Map(rows.map((row) => [row.entity_id, Number(row.n)]));
}
