import type { Metadata } from 'next';

import { LegalUtilityTemplate } from '@/components/patterns/legal-utility-template';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getPageHero } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Imprint',
  description: 'Provider information and legal disclosure for CASA Internationale Sprachschule.',
  path: '/imprint',
});

export default async function ImprintPage() {
  const locale = await getContentLocale();
  const pageConfig = getPublicPageConfig('imprint', locale);
  const hero = { ...getPageHero('imprint', locale), ctas: pageConfig.ctas };

  const sections = [
    {
      title: locale === 'de' ? 'Anbieter' : 'Provider',
      body: [
        'CASA – Internationale Sprachschule gemeinnützige GmbH',
        'Am Dobben 14–16',
        '28203 Bremen',
        'Deutschland',
      ],
    },
    {
      title: locale === 'de' ? 'Kontakt' : 'Contact',
      body: [
        locale === 'de' ? 'Telefon: +49 421 460 414 3-0' : 'Phone: +49 421 460 414 3-0',
        'Fax: +49 421 460 414 340',
        'E-Mail: info@casa-bremen.de',
      ],
    },
    {
      title: locale === 'de' ? 'Vertretungsberechtigte Person' : 'Managing Director',
      body: [
        locale === 'de' ? 'Geschäftsführerin: Bettina Rick' : 'Managing Director: Bettina Rick',
      ],
    },
    {
      title: locale === 'de' ? 'Registereintrag' : 'Company registration',
      body: [
        locale === 'de' ? 'Registergericht: Amtsgericht Bremen' : 'Register court: Amtsgericht Bremen',
        locale === 'de' ? 'Registernummer: HRB 32761 HB' : 'Registration number: HRB 32761 HB',
      ],
    },
    {
      title: locale === 'de' ? 'Steuernummer' : 'Tax number',
      body: [
        locale === 'de'
          ? 'Steuernummer Finanzamt Bremen: 60/147/04599'
          : 'Tax number (Finanzamt Bremen): 60/147/04599',
      ],
    },
    {
      title: locale === 'de' ? 'Haftungshinweis' : 'Liability notice',
      body: [
        locale === 'de'
          ? 'Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.'
          : 'Despite careful review of content, we accept no liability for the content of external links. The operators of linked pages are solely responsible for their content.',
      ],
    },
    {
      title: locale === 'de' ? 'Streitbeilegung' : 'Online dispute resolution',
      body: [
        locale === 'de'
          ? 'Plattform der EU-Kommission: ec.europa.eu/consumers/odr/. CASA nimmt nicht an Streitbeilegungsverfahren teil, sofern gesetzlich nicht verpflichtend.'
          : 'EU Commission platform: ec.europa.eu/consumers/odr/. CASA does not participate in consumer arbitration unless required by law.',
      ],
    },
  ];

  return (
    <LegalUtilityTemplate
      hero={hero}
      breadcrumbs={[
        { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
        { label: 'Imprint' },
      ]}
      sections={sections}
    />
  );
}
