import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate. Every screen under /admin/organisations — the list and an organisation's page — sits behind it. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('organisations');
  return children;
}
