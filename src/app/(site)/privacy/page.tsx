import type { Metadata } from 'next';

import { LegalUtilityTemplate } from '@/components/patterns/legal-utility-template';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getPageHero } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Privacy Policy',
  description:
    'How CASA collects, uses, and protects personal data in connection with website use and educational services.',
  path: '/privacy',
});

const privacySections = [
  {
    title: '1. Data Controller',
    body: [
      'CASA Internationale Sprachschule, Am Dobben 14-16, 28203 Bremen, Germany, is the controller for processing personal data collected through this website.',
      'Contact: info@casa-bremen.de | +49 421 460 414 3-0',
    ],
  },
  {
    title: '2. Data We Process',
    body: [
      'We process data you provide directly, such as contact details, registration data, and communication content related to courses, exams, or accommodation.',
      'We also process technical usage data required for service security and reliability, including server logs and request metadata.',
    ],
  },
  {
    title: '3. Purposes and Legal Bases',
    body: [
      'Data is processed to answer inquiries, manage registrations, provide educational services, coordinate accommodation, and fulfill legal obligations.',
      'Legal bases include contractual necessity, pre-contractual steps, legal obligations, and legitimate interests in secure service delivery.',
    ],
  },
  {
    title: '4. Recipients and Transfers',
    body: [
      'Data may be shared with contracted service providers (hosting, communication, scheduling, administration) under appropriate processing agreements.',
      'Where transfers outside the EEA occur, CASA applies safeguards consistent with GDPR requirements.',
    ],
  },
  {
    title: '5. Retention',
    body: [
      'Data is retained only for required service delivery periods and statutory retention obligations.',
      'Once retention is no longer required, data is deleted or anonymized according to internal policies.',
    ],
  },
  {
    title: '6. Your Rights',
    body: [
      'You may request access, rectification, erasure, restriction, data portability, or object to processing where applicable.',
      'You may also lodge a complaint with a competent supervisory authority.',
    ],
  },
  {
    title: '7. Cookies and Tracking',
    body: [
      'Technically necessary cookies may be used for core functionality and security.',
      'Optional analytics or marketing tools should only run with a valid consent setup.',
    ],
  },
];

export default async function PrivacyPage() {
  const locale = await getContentLocale();
  const pageConfig = getPublicPageConfig('privacy', locale);
  const hero = { ...getPageHero('privacy', locale), ctas: pageConfig.ctas };

  return (
    <LegalUtilityTemplate
      hero={hero}
      breadcrumbs={[
        { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
        { label: locale === 'de' ? 'Datenschutz' : 'Privacy' },
      ]}
      sections={privacySections}
      notice={
        locale === 'de'
          ? 'Rechtlicher Hinweis: Diese Datenschutzerklärung ist ein produktionsnaher Entwurf und sollte vor finaler Veröffentlichung juristisch geprüft werden.'
          : 'Legal notice: This privacy policy is a production-ready draft and should be reviewed by legal and data-protection counsel before final publication.'
      }
    />
  );
}
