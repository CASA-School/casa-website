'use server';

import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { searchWorkspace, type SearchHit } from '@/lib/admin/search';

/** The sidebar's search. Everyone holds the overview; each kind of record is searched only for those who hold its module. */
export async function searchWorkspaceAction(text: string): Promise<SearchHit[]> {
  const user = await requireModule('overview');
  if (typeof text !== 'string') return [];
  const { t } = await getI18n();
  return searchWorkspace(text, (module) => canAccess(user, module), t);
}
