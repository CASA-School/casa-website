import type { Metadata } from 'next';

import { LegalUtilityTemplate } from '@/components/patterns/legal-utility-template';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Datenschutz' : 'Privacy policy',
    description: locale === 'de' ? 'Informationen zum Umgang mit personenbezogenen Daten bei der Nutzung der CASA-Website und unserer Angebote.' : 'How CASA handles personal data when you use our website and services.',
    path: '/privacy',
  });
}

export default async function PrivacyPage() {
  const locale = await getContentLocale();

  return (
    <LegalUtilityTemplate
      document="privacy"
      locale={locale}
      breadcrumbs={[
        { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
        { label: locale === 'de' ? 'Datenschutz' : 'Privacy' },
      ]}
    />
  );
}
