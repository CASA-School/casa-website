import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate. The price list is finance's and management's: owners and administrators, and whoever the Team screen gives it. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('prices');
  return children;
}
