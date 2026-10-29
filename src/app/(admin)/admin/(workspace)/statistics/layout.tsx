import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate: the website's statistics belong to whoever holds the Website module. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('website');
  return children;
}
