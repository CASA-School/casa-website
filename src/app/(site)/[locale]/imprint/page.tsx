import type { Metadata } from 'next';

import { LegalUtilityTemplate } from '@/components/patterns/legal-utility-template';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Impressum' : 'Legal notice',
    description: locale === 'de' ? 'Anbieterkennzeichnung und Kontaktdaten der CASA Internationale Sprachschule Bremen.' : 'Provider information and contact details for CASA Internationale Sprachschule Bremen.',
    path: '/imprint',
  });
}

export default async function ImprintPage() {
  const locale = await getContentLocale();

  return (
    <LegalUtilityTemplate
      document="imprint"
      locale={locale}
      breadcrumbs={[
        { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
        { label: locale === 'de' ? 'Impressum' : 'Imprint' },
      ]}
    />
  );
}
