import type { ReactNode } from 'react';

import { DatabaseUnavailable } from '@/components/admin/database-unavailable';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/guard';

/**
 * The workspace gate, for full-screen tools.
 *
 * The same session check as `(workspace)/layout.tsx` and `(focus)/layout.tsx`
 * — all three call the one `requireStaff()` — without the shell around the
 * page. The website editor is the page itself, edge to edge, with its own
 * slim toolbar and a way back; a rail and a second top bar would take the
 * room the preview needs.
 */
export const dynamic = 'force-dynamic';

export default async function EditorLayout({ children }: { children: ReactNode }) {
  if (!isWorkspaceDatabaseConfigured()) {
    return <DatabaseUnavailable />;
  }

  await requireStaff();
  return children;
}
