import { query } from './db';

/**
 * Links from workspace rows to FileMaker records.
 *
 * Read side only for now — the bridge that writes them is designed in
 * docs/FILEMAKER_BRIDGE.md and not built. The shape is the migration model's
 * (`source_database`, `source_layout`, `source_record_id`, `source_primary_key`)
 * so that when FileMaker is imported in phase 3, links made in phase 1 and 2
 * already point at the right rows (docs/FILEMAKER_LESSONS.md §1.4).
 */

export type FileMakerLinkEntity =
  'person' | 'enquiry' | 'course_registration' | 'exam_registration' | 'placement_review';

export type FileMakerLink = {
  id: string;
  sourceDatabase: string;
  sourceLayout: string;
  sourceRecordId: string;
  sourcePrimaryKey: string | null;
  linkedAt: Date;
  linkedByName: string | null;
};

export async function listFileMakerLinks(
  entity: FileMakerLinkEntity,
  entityId: string
): Promise<FileMakerLink[]> {
  const rows = await query<{
    id: string;
    source_database: string;
    source_layout: string;
    source_record_id: string;
    source_primary_key: string | null;
    linked_at: Date;
    linked_by_name: string | null;
  }>(
    `SELECT l.id, l.source_database, l.source_layout, l.source_record_id,
            l.source_primary_key, l.linked_at, u.name AS linked_by_name
       FROM filemaker_links l
       LEFT JOIN staff_users u ON u.id = l.linked_by
      WHERE l.entity = $1 AND l.entity_id = $2
      ORDER BY l.linked_at DESC`,
    [entity, entityId]
  );
  return rows.map((r) => ({
    id: r.id,
    sourceDatabase: r.source_database,
    sourceLayout: r.source_layout,
    sourceRecordId: r.source_record_id,
    sourcePrimaryKey: r.source_primary_key,
    linkedAt: r.linked_at,
    linkedByName: r.linked_by_name,
  }));
}
