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
  /** The Anmeldung (0096). */
  | 'registration'
  | 'course_registration'
  | 'exam_registration'
  | 'career_application'
  | 'placement_attempt'
  | 'booking'
  | 'person'
  | 'offer'
  | 'group_visit'
  | 'accommodation'
  | 'organisation'
  /** A class (`courses`): SchoolMan's notes on a course (0094) and the team's own. */
  | 'course'
  /** An exam sitting (0096): the team's notes beside its history. */
  | 'exam_session';

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
    // A note brought across from SchoolMan (0055) keeps its SchoolMan author's name.
    `SELECT n.id, n.body, coalesce(u.name, n.author_name) AS author_name, n.created_at
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
