import { z } from 'zod';

import { canAccess } from '@/lib/admin/access';
import { getStaffUser } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { getI18n } from '@/lib/admin/i18n.server';
import { recentRecords, searchWorkspace, SEARCH_KINDS, type RecordRef, type SearchKind } from '@/lib/admin/search';
import { apiError, apiSuccess } from '@/lib/api/response';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isKind = (value: string): value is SearchKind => (SEARCH_KINDS as readonly string[]).includes(value);

const Body = z.union([
  z.object({ q: z.string().max(200) }),
  // `person:<id>` — the records opened last, newest first.
  z.object({ recent: z.array(z.string().max(80)).max(12) }),
]);

/**
 * The palette's search (⌘K, src/components/admin/command-search.tsx): `{ q }` what was typed, or
 * `{ recent: ['person:<id>', …] }` the records opened last, as hits.
 *
 * A request the palette can cancel when the next letter is typed — a server action cannot be, and the
 * router runs actions one after another. A POST, so what was typed (a learner's name) is never in an
 * address or an access log. A route handler is not a child of the workspace layout, so it checks the
 * session itself (CLAUDE.md rule 7); every kind of record is then searched only for a colleague who
 * holds its module (`searchWorkspace`'s `holds`).
 */
export async function POST(request: Request): Promise<Response> {
  if (!isWorkspaceDatabaseConfigured()) {
    return apiError('not_found', 'Not found', 404);
  }

  const user = await getStaffUser();

  if (!user) {
    return apiError('signed_out', 'Signed out', 401);
  }

  if (!canAccess(user, 'overview', 'view')) {
    return apiError('not_found', 'Not found', 404);
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError('invalid', 'Invalid search', 400);
  }

  const { t, lang } = await getI18n();
  const holds = (module: Parameters<typeof canAccess>[1]) => canAccess(user, module);

  if ('recent' in parsed.data) {
    const refs = parsed.data.recent
      .map((entry) => entry.split(':'))
      .filter((parts): parts is [SearchKind, string] => parts.length === 2 && isKind(parts[0]) && UUID.test(parts[1]))
      .map(([kind, id]): RecordRef => ({ kind, id }));
    return apiSuccess({ hits: await recentRecords(refs, holds, t, lang) });
  }

  return apiSuccess({ groups: await searchWorkspace(parsed.data.q.slice(0, 80), holds, t, lang) });
}
