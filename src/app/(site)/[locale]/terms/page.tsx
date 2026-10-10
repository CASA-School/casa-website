import type { Metadata } from 'next';

import { LegalUtilityTemplate } from '@/components/patterns/legal-utility-template';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Allgemeine Geschäftsbedingungen' : 'Terms and conditions',
    description: locale === 'de' ? 'Die Allgemeinen Geschäftsbedingungen von CASA in Bremen für Sprachkurse, Prüfungen, Unterkunft und weitere Angebote.' : 'The terms and conditions of CASA in Bremen for language courses, exams, accommodation and our other services.',
    path: '/terms',
  });
}

export default async function TermsPage() {
  const locale = await getContentLocale();

  return (
    <LegalUtilityTemplate
      document="terms"
      locale={locale}
      breadcrumbs={[
        { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
        { label: locale === 'de' ? 'Geschäftsbedingungen' : 'Terms and conditions' },
      ]}
    />
  );
}
