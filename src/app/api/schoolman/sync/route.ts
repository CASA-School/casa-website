import { z } from 'zod';

import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { apiError, apiSuccess } from '@/lib/api/response';
import { SYNC_TABLES, completeTable, keepRecords } from '@/lib/schoolman/mirror.server';
import { SIGNATURE_HEADER, verify } from '@/lib/schoolman/signature';

export const dynamic = 'force-dynamic';

const id = z.union([z.string().max(40), z.number().int()]).transform(String);
const schema = z.object({
  table: z.string().refine((t) => SYNC_TABLES.has(t)),
  records: z.array(z.object({ recordId: id, modId: id, fieldData: z.record(z.string(), z.union([z.string(), z.number(), z.null()])) })).max(2000),
  // A complete read of the table: every record id SchoolMan has, sent once all its records are.
  complete: z.object({ recordIds: z.array(id).max(500_000) }).optional(),
});

/*
 * SchoolMan's records from the sync service on the office network (scripts/schoolman-sync, migration
 * 0090). Not a page of either product: a machine sends here, signed with SCHOOLMAN_SYNC_KEY, and nothing
 * is answered without that key — no key configured, no endpoint. Records only go into the copy; the
 * bridge's steps take them from there into the workspace (docs/FILEMAKER_BRIDGE.md §9).
 */
export async function POST(request: Request) {
  const key = process.env.SCHOOLMAN_SYNC_KEY;
  if (!key || !isWorkspaceDatabaseConfigured()) return apiError('NOT_FOUND', 'Not found.', 404);
  const body = await request.text();
  if (!verify(key, body, request.headers.get(SIGNATURE_HEADER))) return apiError('UNAUTHORIZED', 'Not signed.', 401);

  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(body));
  } catch {
    return apiError('INVALID', 'Invalid request.', 400);
  }
  if (!parsed.success) return apiError('INVALID', 'Invalid request.', 400);
  const { table, records, complete } = parsed.data;

  const kept = await keepRecords(table, records);
  if (!complete) return apiSuccess(kept);
  const done = await completeTable(table, complete.recordIds);
  if ('refused' in done) return apiError('INCOMPLETE', `Fewer than half of the ${done.refused} records kept: nothing removed.`, 409);
  return apiSuccess({ ...kept, ...done });
}
