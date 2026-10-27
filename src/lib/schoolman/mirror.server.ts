import 'server-only';

import { query, withTransaction } from '@/lib/admin/db';

import LAYOUTS from '../../../scripts/filemaker/sync-layouts.json';

/** The SchoolMan tables the sync service may send: those with a `Sync_` layout. */
export const SYNC_TABLES = new Set(Object.keys(LAYOUTS));

type SyncRecord = { recordId: string; modId: string; fieldData: Record<string, string | number | null> };

/**
 * One batch of SchoolMan records into the copy (migration 0090): new ones added, known ones replaced
 * where SchoolMan's fields changed — `updated_at` moves only then, so the bridge can tell.
 */
export async function keepRecords(table: string, records: SyncRecord[]): Promise<{ kept: number; changed: number }> {
  if (!records.length) return { kept: 0, changed: 0 };
  return withTransaction(async (client) => {
    const result = await client.query<{ changed: boolean }>(
      `INSERT INTO schoolman_records (source_table, record_id, mod_id, data)
       SELECT $1, r.record_id, r.mod_id, r.data FROM jsonb_to_recordset($2::jsonb) AS r(record_id text, mod_id text, data jsonb)
       ON CONFLICT (source_table, record_id) DO UPDATE
         SET mod_id = EXCLUDED.mod_id, data = EXCLUDED.data, seen_at = timezone('utc', now()),
             updated_at = CASE WHEN schoolman_records.data IS DISTINCT FROM EXCLUDED.data THEN timezone('utc', now()) ELSE schoolman_records.updated_at END
       RETURNING updated_at = timezone('utc', now()) AS changed`,
      [table, JSON.stringify(records.map((r) => ({ record_id: r.recordId, mod_id: r.modId, data: r.fieldData })))]
    );
    await client.query(
      `INSERT INTO schoolman_sync_tables (source_table, records, last_batch_at)
       VALUES ($1, (SELECT count(*) FROM schoolman_records WHERE source_table = $1), timezone('utc', now()))
       ON CONFLICT (source_table) DO UPDATE SET records = EXCLUDED.records, last_batch_at = EXCLUDED.last_batch_at`,
      [table]
    );
    return { kept: result.rowCount ?? 0, changed: result.rows.filter((r) => r.changed).length };
  });
}

/**
 * A complete read of a table: every record id SchoolMan has. Records no longer among them go — unless
 * the list is less than half of what is kept, which is a read cut short rather than SchoolMan emptied.
 */
export async function completeTable(table: string, recordIds: string[]): Promise<{ removed: number } | { refused: number }> {
  const [held] = await query<{ n: number }>(`SELECT count(*)::int AS n FROM schoolman_records WHERE source_table = $1`, [table]);
  if (recordIds.length < held.n / 2) return { refused: held.n };
  return withTransaction(async (client) => {
    const removed = await client.query(`DELETE FROM schoolman_records WHERE source_table = $1 AND NOT (record_id = ANY($2::text[]))`, [table, recordIds]);
    await client.query(
      `INSERT INTO schoolman_sync_tables (source_table, records, last_complete_at)
       VALUES ($1, (SELECT count(*) FROM schoolman_records WHERE source_table = $1), timezone('utc', now()))
       ON CONFLICT (source_table) DO UPDATE SET records = EXCLUDED.records, last_complete_at = EXCLUDED.last_complete_at`,
      [table]
    );
    return { removed: removed.rowCount ?? 0 };
  });
}
