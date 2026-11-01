import { Manrope } from 'next/font/google';
import type { ReactNode } from 'react';

import { requireModule } from '@/lib/admin/guard';

/**
 * The board keeps the face it was approved in (docs/KURSPLANUNG.md rule 5: the prototype's look, 1:1),
 * Manrope, while the rest of the workspace moved to Inter (2026-11-01). Loaded here only.
 */
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

/** Module gate. Every screen under /admin/kursplanung sits behind it. */
export default async function ModuleLayout({ children }: { children: ReactNode }) {
  await requireModule('kursplanung');
  return <div className={`${manrope.variable} contents font-[family-name:var(--font-sans)]`}>{children}</div>;
}
