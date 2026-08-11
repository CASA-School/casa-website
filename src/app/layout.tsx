import type {Metadata} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import { Plus_Jakarta_Sans } from 'next/font/google';

import { SiteShell } from '@/components/layout/site-shell';
import { JsonLdScript } from '@/components/seo/json-ld';
import { footerConfig } from '@/config/footer';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: 'CASA Bremen',
    description:
      'CASA Internationale Sprachschule in Bremen. Courses, exams, accommodation, and learner support for international students.',
    path: '/',
    keywords: ['CASA Bremen', 'German language school', 'German courses', 'telc exams'],
  }),
  // Override the composed title for the root — avoid "CASA Bremen | CASA Bremen"
  title: 'CASA Bremen — Internationale Sprachschule',
  other: {
    'theme-color': '#009fe3',
  },
};

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  // Resolve the content locale on the server and hand it to the shell. The
  // navbar/footer/mobile-nav are client components; if they read the locale
  // cookie themselves during render, SSR (no cookie access) renders English
  // while hydration renders German, and React throws the whole tree away.
  const contentLocale = await getContentLocale();

  return (
    <html lang={contentLocale}>
      <body
        suppressHydrationWarning
        className={`min-h-screen flex flex-col bg-background text-foreground antialiased ${plusJakartaSans.variable} font-sans`}
      >
        <JsonLdScript id="organization-schema" data={organizationSchema} />
        <NextIntlClientProvider messages={messages}>
          <SiteShell contentLocale={contentLocale}>{children}</SiteShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
