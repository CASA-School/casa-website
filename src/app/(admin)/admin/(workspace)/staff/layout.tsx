import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate. Every screen under /admin/staff — the register and a colleague's page — sits behind it. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('staff');
  return children;
}
