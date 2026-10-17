import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate for Offers: the list, a new offer, an offer and its letter, in the workspace's frame. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('offers');
  return children;
}
