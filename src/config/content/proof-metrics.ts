import type { ContentLocale, ProofMetric } from '@/lib/content/types';

export const proofMetricsByLocale: Record<ContentLocale, ProofMetric[]> = {
  en: [
    {
      value: 'Since 1983',
      label: 'Independent language school in Bremen',
      locale: 'en',
      sourceUrl: 'https://www.casa-bremen.de/unsere-sprachschule/',
      sourceType: 'website',
      verificationStatus: 'verified',
      asOf: '2026-02-09',
    },
    {
      value: '30,000+',
      label: 'Learners we have supported',
      locale: 'en',
      sourceUrl: 'internal-dashboard-aggregate:2026-06-17',
      sourceType: 'internal',
      verificationStatus: 'verified',
      asOf: '2026-06-17',
    },
    {
      value: '150+ countries',
      label: 'People from all over the world in our courses',
      locale: 'en',
      sourceUrl: 'internal-dashboard-aggregate:2026-06-17',
      sourceType: 'internal',
      verificationStatus: 'verified',
      asOf: '2026-06-17',
    },
    {
      value: '40+ staff & teachers',
      label: 'Teachers and office staff in our team',
      locale: 'en',
      sourceUrl: 'https://www.casa-bremen.de/unsere-sprachschule/',
      sourceType: 'internal',
      verificationStatus: 'verified',
      asOf: '2026-10-09', // confirmed by Rahman Shafiee
    },
  ],
  de: [
    {
      value: 'Seit 1983',
      label: 'Unabhängige Sprachschule in Bremen',
      locale: 'de',
      sourceUrl: 'https://www.casa-bremen.de/unsere-sprachschule/',
      sourceType: 'website',
      verificationStatus: 'verified',
      asOf: '2026-02-09',
    },
    {
      value: '30.000+',
      label: 'Lernende, die wir begleitet haben',
      locale: 'de',
      sourceUrl: 'internal-dashboard-aggregate:2026-06-17',
      sourceType: 'internal',
      verificationStatus: 'verified',
      asOf: '2026-06-17',
    },
    {
      value: '150+ Herkunftsländer',
      label: 'Menschen aus aller Welt in unseren Kursen',
      locale: 'de',
      sourceUrl: 'internal-dashboard-aggregate:2026-06-17',
      sourceType: 'internal',
      verificationStatus: 'verified',
      asOf: '2026-06-17',
    },
    {
      value: '40+ Mitarbeitende',
      label: 'Lehrkräfte und Verwaltung im Team',
      locale: 'de',
      sourceUrl: 'https://www.casa-bremen.de/unsere-sprachschule/',
      sourceType: 'internal',
      verificationStatus: 'verified',
      asOf: '2026-10-09', // confirmed by Rahman Shafiee
    },
  ],
};
