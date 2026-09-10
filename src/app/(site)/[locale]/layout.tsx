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
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';

import { SiteShell } from '@/components/layout/site-shell';
import { JsonLdScript } from '@/components/seo/json-ld';
import { footerConfig } from '@/config/footer';
import { defaultLocale, directionFor, isLocale } from '@/i18n/routing';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';
import '../../globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

/*
 * Display face for headings, matched to the caterlove-prep-system site
 * (~/Tasks/10-active/work/caterlove-prep-system/website), which pairs
 * Playfair Display for display type with a sans for body.
 *
 * HEADINGS ONLY. Body, UI and numerals stay on Plus Jakarta Sans, which matters
 * for two reasons beyond taste:
 *   - `--container-measure: 48ch` in globals.css is measured against Plus
 *     Jakarta Sans metrics (1ch = 0.732em) and governs body copy. Leaving body
 *     on PJS keeps that token honest.
 *   - Playfair has no tabular figures worth the name; the stat band and every
 *     `tabular-nums` price and date depend on PJS.
 *
 * Playfair is a high-contrast Didone: its hairlines thin out badly below ~20px,
 * so it is bound to h1/h2/h3 only and never to small text.
 */
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale = isLocale(requested) ? requested : defaultLocale;

  return {
    ...createPublicMetadata({
      title: 'CASA Bremen',
      description:
        locale === 'de'
          ? 'CASA Internationale Sprachschule in Bremen. Deutschkurse, telc Prüfungen, Unterkunft und Begleitung für internationale Lernende.'
          : 'CASA Internationale Sprachschule in Bremen. Courses, exams, accommodation, and learner support for international students.',
      path: '/',
      locale,
      keywords: ['CASA Bremen', 'German language school', 'German courses', 'telc exams'],
    }),
    // Override the composed title for the root — avoid "CASA Bremen | CASA Bremen"
    title: 'CASA Bremen — Internationale Sprachschule',
    other: {
      'theme-color': '#009fe3',
    },
  };
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'CASA Internationale Sprachschule Bremen',
  legalName: 'CASA - Internationale Sprachschule Bremen gemeinnützige GmbH',
  description:
    'Non-profit German language school in Bremen for German courses, telc exam preparation, learner support, and integration projects.',
  url: toAbsoluteUrl('/'),
  address: {
    '@type': 'PostalAddress',
    streetAddress: footerConfig.contact.address,
    addressLocality: 'Bremen',
    addressCountry: 'DE',
  },
  telephone: footerConfig.contact.phone,
  sameAs: footerConfig.socialLinks.map((item) => item.href),
};

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

  return (
    <html lang={locale} dir={directionFor(locale)}>
      <body
        suppressHydrationWarning
        className={`min-h-screen flex flex-col bg-background text-foreground antialiased ${plusJakartaSans.variable} ${playfairDisplay.variable} font-sans`}
      >
        <JsonLdScript id="organization-schema" data={organizationSchema} />
        <NextIntlClientProvider messages={messages}>
          <SiteShell contentLocale={contentLocale}>{children}</SiteShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
