import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate. Every screen under /admin/catalogue sits behind it. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('catalogue');
  return children;
}
