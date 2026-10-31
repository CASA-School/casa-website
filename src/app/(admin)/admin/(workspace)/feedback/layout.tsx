import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/** Module gate. Every screen under /admin/feedback sits behind it; sending and „Mein Feedback" are route handlers with their own checks. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('feedback');
  return children;
}
