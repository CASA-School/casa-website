import type { Metadata } from 'next';

import { HeroEMinimal } from '@/components/heroes';
import { EditorialSplit, ProcessSteps } from '@/components/sections';
import { FaqTopicNavigator } from '@/components/signatures';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getFaq, getPageHero } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Häufige Fragen' : 'Frequently asked questions',
    description: locale === 'de' ? 'Antworten zu Deutschkursen, Prüfungen, Anmeldung und Unterkunft bei CASA in Bremen.' : 'Answers about German courses, exams, registration and accommodation at CASA in Bremen.',
    path: '/faq',
    keywords: ['CASA FAQ', 'Course FAQ', 'Exam FAQ', 'Accommodation FAQ'],
  });
}

/*
 * Cancellation is its own topic.
 *
 * casa-bremen.de/faq has four sections and one of them is
 * "Kündigungsbedingungen" — the four-week notice period, the 100 EUR processing
 * fee, and that a cancellation only counts in writing. Folding that into
 * "General" buries the answer somebody is most anxious to find, so it gets its
 * own filter chip.
 */
function toTopic(category: string, locale: 'en' | 'de') {
  const value = category.toLowerCase();
  const labels =
    locale === 'de'
      ? {
          registration: 'Anmeldung',
          courses: 'Kurse',
          exams: 'Prüfungen',
          accommodation: 'Unterkunft',
          visa: 'Visum',
          cancellation: 'Kündigung',
          general: 'Allgemeines',
        }
      : {
          registration: 'Registration',
          courses: 'Courses',
          exams: 'Exams',
          accommodation: 'Accommodation',
          visa: 'Visa',
          cancellation: 'Cancellation',
          general: 'General',
        };

  if (value.includes('registr') || value.includes('anmeld')) return labels.registration;
  if (value.includes('course') || value.includes('kurs') || value.includes('niveau')) return labels.courses;
  if (value.includes('exam') || value.includes('pruef') || value.includes('pruf')) return labels.exams;
  if (value.includes('accomm') || value.includes('unterkunft')) return labels.accommodation;
  if (value.includes('visa') || value.includes('visum')) return labels.visa;
  if (value.includes('cancel') || value.includes('kuend') || value.includes('künd')) return labels.cancellation;
  return labels.general;
}

export default async function FaqPage() {
  const locale = await getContentLocale();
  const rhythm = getLayoutRhythm('faq');
  const hero = getPageHero('faq', locale);
  const pageConfig = getPublicPageConfig('contact', locale);

  const faqItems = await getFaq(locale);

  const topics =
    locale === 'de'
      ? ['Alle', 'Anmeldung', 'Kurse', 'Prüfungen', 'Visum', 'Unterkunft', 'Kündigung', 'Allgemeines']
      : ['All', 'Registration', 'Courses', 'Exams', 'Visa', 'Accommodation', 'Cancellation', 'General'];

  const normalized = faqItems.map((item) => ({
    id: item.id,
    topic: toTopic(item.category, locale),
    question: item.question,
    answer: item.answer,
  }));

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: normalized.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: 'FAQ' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <JsonLdScript id="faq-schema" data={faqSchema} />

      <HeroEMinimal
        eyebrow={hero.eyebrow}
        title={hero.headline}
        description={hero.subheadline}
        breadcrumbs={breadcrumbs}
        cta={{ label: locale === 'de' ? 'Kontakt' : 'Contact', href: '/contact', kind: 'primary' }}
        meta={hero.proofMetrics.slice(0, 2).map((item) => `${item.value} ${item.label}`)}
      />

      <section className="py-16 md:py-20 bg-white">
        <Container>
          <FaqTopicNavigator
            title={locale === 'de' ? 'FAQ nach Thema durchsuchen' : 'Browse FAQs by topic'}
            description={
              locale === 'de'
                ? 'Filtern Sie nach Thema und suchen Sie direkt in Fragen und Antworten.'
                : 'Filter by topic and search directly inside questions and answers.'
            }
            topics={topics}
            items={normalized}
            searchPlaceholder={locale === 'de' ? 'FAQ durchsuchen...' : 'Search FAQ...'}
          />
        </Container>
      </section>

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <EditorialSplit
            eyebrow={locale === 'de' ? 'Persönliche Beratung' : 'Human support'}
            title={locale === 'de' ? 'Ihre Frage ist noch offen?' : 'Still have a question?'}
            description={
              locale === 'de'
                ? 'Manches lässt sich am besten im Gespräch klären. Erzählen Sie uns, was Sie beschäftigt – wir nehmen uns Zeit für Sie.'
                : 'Some questions are easier to talk through. Tell us what is on your mind and our team will take time to help.'
            }
            bullets={[
              locale === 'de' ? 'Schnelle Rückmeldung für dringende Fragen' : 'Fast responses for urgent questions',
              locale === 'de' ? 'Klare Empfehlungen für nächste Schritte' : 'Clear recommendations for next steps',
              locale === 'de' ? 'Unterstützung für Kurs, Prüfung und Unterkunft' : 'Support across courses, exams, and accommodation',
            ]}
            photo={{
              ...pageConfig.photos.support,
              caption: 'Teacher giving feedback during speaking exercise - Personal feedback in small groups.',
            }}
            ctas={[
              { label: locale === 'de' ? 'Kontakt aufnehmen' : 'Contact CASA', href: '/contact', kind: 'primary' },
            ]}
          />
        </Container>
      </section>

      <section className="py-16 md:py-20 bg-white border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <ProcessSteps
            eyebrow={locale === 'de' ? 'Nächste Aktion' : 'Next action'}
            title={locale === 'de' ? 'Von Frage zu Entscheidung' : 'From question to decision'}
            description={
              locale === 'de'
                ? 'So finden Sie die passende Information oder persönliche Unterstützung.'
                : 'Find the information you need or get in touch for personal help.'
            }
            steps={[
              {
                step: locale === 'de' ? '1' : '1',
                title: locale === 'de' ? 'Thema wählen' : 'Pick topic',
                description: locale === 'de' ? 'Kurs, Prüfung oder Unterkunft.' : 'Courses, exams, or accommodation.',
              },
              {
                step: locale === 'de' ? '2' : '2',
                title: locale === 'de' ? 'Antworten prüfen' : 'Review answers',
                description: locale === 'de' ? 'Schnell die relevanten Punkte lesen.' : 'Read the most relevant points quickly.',
              },
              {
                step: locale === 'de' ? '3' : '3',
                title: locale === 'de' ? 'Kontakt aufnehmen' : 'Contact team',
                description: locale === 'de' ? 'Bei Bedarf direkte Beratung anfragen.' : 'Reach out for direct guidance if needed.',
              },
            ]}
          />
        </Container>
      </section>
    </main>
  );
}
