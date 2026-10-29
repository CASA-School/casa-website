import type { Metadata } from 'next';

import { LegalUtilityTemplate } from '@/components/patterns/legal-utility-template';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Impressum' : 'Legal notice',
    description: locale === 'de' ? 'Impressum der CASA – Internationale Sprachschule gGmbH, Am Dobben 14–16 in Bremen: Anbieterkennzeichnung und Kontaktdaten der gemeinnützigen Sprachschule.' : 'Legal notice of CASA – Internationale Sprachschule gGmbH, Am Dobben 14–16 in Bremen: provider information and contact details of the non-profit school.',
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
