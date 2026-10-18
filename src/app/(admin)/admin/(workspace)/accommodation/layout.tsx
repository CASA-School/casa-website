import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate. Every screen under /admin/accommodation — the places, a place's page, the stays — sits behind it. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('accommodation');
  return children;
}
