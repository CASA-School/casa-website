'use server';

import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { searchWorkspace, type SearchHit } from '@/lib/admin/search';

/** The top bar's search. Everyone holds Today; each kind of record is searched only for those who hold its module. */
export async function searchWorkspaceAction(text: string): Promise<SearchHit[]> {
  const user = await requireModule('overview');
  if (typeof text !== 'string') return [];
  return searchWorkspace(text, (module) => canAccess(user, module));
}
