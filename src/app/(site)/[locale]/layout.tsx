/*
 * Root layout for the PUBLIC website.
 *
 * `src/app` deliberately has no `layout.tsx` of its own. There are two products
 * in this repository now — the marketing site and the staff workspace at
 * `/admin` (admin.casa-bremen.de) — and they share nothing above the design
 * tokens: different fonts in use, different chrome, different body ground, and
 * the workspace must never render the public navigation or footer. Next only
 * allows a second root layout when the app root has none, so both live in a
 * route group: `(site)` here, `(admin)` beside it. Route groups do not appear in
 * URLs, so every public path is unchanged.
 *
 * The shared parts — `globals.css` and the metadata icon files — stay at the
 * `src/app` root, which is why the stylesheet import below reaches up one level.
 */
import type {Metadata} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Montserrat, Plus_Jakarta_Sans } from 'next/font/google';

import { EditBridge } from '@/components/cms/edit-bridge';
import { SiteCopyProvider } from '@/components/cms/site-copy-provider';
import { OldBrowserNotice } from '@/components/layout/old-browser-notice';
import { SiteShell } from '@/components/layout/site-shell';
import { prepareCopy, valuesForLocale } from '@/lib/cms/content.server';
import { cmsDirection } from '@/lib/cms/locales';
import { editorOrigins } from '@/lib/cms/origins';
import { siteGraph } from '@/lib/structured-data';
import { JsonLdScript } from '@/components/seo/json-ld';
import { defaultLocale, directionFor, isLocale } from '@/i18n/routing';
import { createPublicMetadata } from '@/lib/seo';
import '../../globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

/*
 * Display face for headings: Montserrat (Rahman, 2026-10-29), in place of
 * Playfair Display. A variable font, so every heading weight the site uses,
 * semibold to black, comes from one file.
 *
 * HEADINGS ONLY. Body, UI and numerals stay on Plus Jakarta Sans:
 * `--container-measure: 48ch` in globals.css is measured against its metrics
 * (1ch = 0.732em) and governs body copy, and the stat band and every
 * `tabular-nums` price and date depend on it.
 */
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-display',
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale = isLocale(requested) ? requested : defaultLocale;

  return {
    ...createPublicMetadata({
      title: 'CASA Bremen',
      description:
        locale === 'de'
          ? 'CASA ist eine gemeinnützige Sprachschule in Bremen. Wir bieten Deutschkurse und telc-Prüfungen an, vermitteln Unterkünfte und begleiten internationale Lernende.'
          : 'CASA is a non-profit language school in Bremen. We offer German courses and telc exams, arrange accommodation and support international learners.',
      path: '/',
      locale,
      keywords: ['CASA Bremen', 'German language school', 'German courses', 'telc exams'],
    }),
    // Override the composed title for the root — avoid "CASA Bremen | CASA Bremen"
    title: 'CASA Bremen — Internationale Sprachschule',
    // No canonical or hreflang at layout level. Every page sets its own; the only
    // thing that inherits these is a 404, which cannot set metadata of its own and
    // would otherwise name the homepage as its canonical.
    alternates: null,
    // No Open Graph or Twitter card either, for the same reason: every page that
    // is shared sets its own. What inherits these — a 404 after hydration, the
    // noindex placement runner and result — would otherwise carry the
    // homepage's og:url and a "CASA Bremen | CASA Bremen" og:title.
    openGraph: null,
    twitter: null,
    other: {
      'theme-color': '#009fe3',
    },
  };
}



export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  // The URL is the only source of truth for the language. This makes it
  // available to every getLocale() call below, and hands it to the shell as a
  // prop so the client chrome renders the same language on the server and on
  // hydration.
  setRequestLocale(locale);
  const messages = await getMessages();
  const contentLocale = locale;
  // The site's copy for this request (src/lib/cms/copy.ts): live edits, or in the
  // website editor's preview (draft mode) the drafts, each text tagged, and the
  // live values (prices, dates) the texts name.
  // In the editor's preview of a prepared language (`display`), the page speaks that language.
  const { editing, values, facts, display } = await prepareCopy(locale);

  return (
    <html lang={display ?? locale} dir={display ? cmsDirection(display) : directionFor(locale)}>
      <body
        suppressHydrationWarning
        className={`min-h-screen flex flex-col bg-background text-foreground antialiased ${plusJakartaSans.variable} ${montserrat.variable} font-sans`}
      >
        <OldBrowserNotice locale={locale} />
        <JsonLdScript id="site-schema" data={siteGraph(locale)} />
        <NextIntlClientProvider messages={messages}>
          <SiteCopyProvider locale={locale} editing={editing} values={valuesForLocale(values, locale)} facts={facts.values} display={display}>
            <SiteShell contentLocale={contentLocale}>{children}</SiteShell>
          </SiteCopyProvider>
        </NextIntlClientProvider>
        {editing ? <EditBridge allowedOrigins={await editorOrigins()} /> : null}
      </body>
    </html>
  );
}
