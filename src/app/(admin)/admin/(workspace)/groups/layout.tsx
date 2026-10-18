import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate. Every screen under /admin/groups — the list and a visit's page — sits behind it. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('groups');
  return children;
}
