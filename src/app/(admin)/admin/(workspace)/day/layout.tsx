import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate. The Tagesplan and its attendance sheets sit behind it. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('day');
  return children;
}
