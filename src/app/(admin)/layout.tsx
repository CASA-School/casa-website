import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';

import '../globals.css';

/**
 * Root layout for the STAFF WORKSPACE.
 *
 * A second root layout beside `(site)`, which is why neither lives at the app
 * root — see the note in `src/app/(site)/layout.tsx`. This one deliberately
 * renders no public navigation, no footer, no locale provider and no
 * structured data: none of it belongs on an internal tool, and the footer alone
 * would put the school's full marketing sitemap under every table of records.
 *
 * TYPEFACES ARE THE SAME TWO AS THE PUBLIC SITE, USED DIFFERENTLY.
 *
 * Plus Jakarta Sans carries the interface and every numeral — it has real
 * tabular figures, which a workspace of dated, counted rows depends on
 * completely. Playfair Display is kept for page and card titles only, at 16px
 * and above, because it is what makes this read as CASA's own tool rather than
 * as a generic admin template; below about 20px its hairlines thin out, so it
 * never touches a label, a row or a number.
 *
 * ROUTING NOTE: the workspace answers on `admin.casa-bremen.de`, which
 * `src/middleware.ts` maps onto these `/admin` paths. On the public host these
 * routes are closed in production by the same middleware, so the sign-in page
 * is not reachable at `casa-bremen.de/admin`.
 */

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600'],
});

export const metadata: Metadata = {
  title: 'Workspace · CASA Bremen',
  // Belt and braces with the middleware. Robots metadata is not access control
  // (CLAUDE.md, known open items), but there is no reason to also invite a
  // crawler that ignores the 404.
  robots: { index: false, follow: false, nocache: true },
};

export default function WorkspaceRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${playfairDisplay.variable}`}>
      <body className="casa-workspace bg-ws-canvas font-[family-name:var(--font-sans)] text-[var(--casa-ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
