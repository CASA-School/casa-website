import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate for the offer letter, which is full screen like the website editor. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('offers');
  return children;
}
