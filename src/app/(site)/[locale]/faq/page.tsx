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
import { pickTree, say } from '@/lib/cms/copy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Häufige Fragen zu Deutschkursen in Bremen' : 'FAQ: German courses in Bremen',
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
    pickTree(locale, { de: {
          registration: 'Anmeldung',
          courses: 'Kurse',
          exams: 'Prüfungen',
          accommodation: 'Unterkunft',
          visa: 'Visum',
          cancellation: 'Kündigung',
          general: 'Allgemeines',
        }, en: {
          registration: 'Registration',
          courses: 'Courses',
          exams: 'Exams',
          accommodation: 'Accommodation',
          visa: 'Visa',
          cancellation: 'Cancellation',
          general: 'General',
        } });

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
    pickTree(locale, { de: ['Alle', 'Anmeldung', 'Kurse', 'Prüfungen', 'Visum', 'Unterkunft', 'Kündigung', 'Allgemeines'], en: ['All', 'Registration', 'Courses', 'Exams', 'Visa', 'Accommodation', 'Cancellation', 'General'] });

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
    { label: say(locale, 'Start', 'Home'), href: '/' },
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
        cta={{ label: say(locale, 'Kontakt', 'Contact'), href: '/contact', kind: 'primary' }}
        meta={hero.proofMetrics.slice(0, 2).map((item) => `${item.value} ${item.label}`)}
      />

      <section className="py-16 md:py-20">
        <Container>
          <FaqTopicNavigator
            title={say(locale, 'FAQ nach Thema durchsuchen', 'Browse FAQs by topic')}
            description={
              say(locale, 'Wähle ein Thema oder suche direkt in den Fragen und Antworten.', 'Choose a topic or search the questions and answers directly.')
            }
            topics={topics}
            items={normalized}
            searchPlaceholder={say(locale, 'FAQ durchsuchen...', 'Search FAQ...')}
          />
        </Container>
      </section>

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <EditorialSplit
            eyebrow={say(locale, 'Persönliche Beratung', 'Personal advice')}
            title={say(locale, 'Hast du noch eine Frage?', 'Still have a question?')}
            description={
              say(locale, 'Manches lässt sich am besten im Gespräch klären. Erzähl uns, was dich beschäftigt. Wir nehmen uns gern Zeit für dich.', 'Some things are easier to sort out in a conversation. Tell us what’s on your mind. We’ll gladly make time for you.')
            }
            bullets={[
              say(locale, 'Bei dringenden Fragen melden wir uns schnell bei dir.', 'If your question is urgent, we’ll get back to you quickly.'),
              say(locale, 'Wir sagen dir, welche nächsten Schritte für dich sinnvoll sind.', 'We’ll tell you which next steps make sense for you.'),
              say(locale, 'Wir helfen dir bei Fragen zu Kursen, Prüfungen und Unterkunft.', 'We can help with questions about courses, exams and accommodation.'),
            ]}
            photo={{
              ...pageConfig.photos.support,
              caption: 'Teacher giving feedback during speaking exercise - Personal feedback in small groups.',
            }}
            ctas={[
              { label: say(locale, 'Kontakt aufnehmen', 'Get in touch'), href: '/contact', kind: 'primary' },
            ]}
          />
        </Container>
      </section>

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <ProcessSteps
            eyebrow={say(locale, 'So geht es weiter', 'What to do next')}
            title={say(locale, 'In drei Schritten zur Antwort', 'Your answer in three steps')}
            description={
              say(locale, 'So findest du die passende Information oder bekommst persönliche Unterstützung.', 'Here’s how to find the information you need or get personal help.')
            }
            steps={[
              {
                step: locale === 'de' ? '1' : '1',
                title: say(locale, 'Thema wählen', 'Choose a topic'),
                description: say(locale, 'Wähle oben ein Thema, zum Beispiel Kurse, Prüfungen oder Unterkunft.', 'Pick one of the topics above, for example courses, exams or accommodation.'),
              },
              {
                step: locale === 'de' ? '2' : '2',
                title: say(locale, 'Antworten lesen', 'Read the answers'),
                description: say(locale, 'Lies die Antworten zu deinem Thema.', 'Read the answers on your topic.'),
              },
              {
                step: locale === 'de' ? '3' : '3',
                title: say(locale, 'Kontakt aufnehmen', 'Get in touch'),
                description: say(locale, 'Wenn noch etwas offen ist, schreib uns oder ruf uns an.', 'If anything is still unclear, write to us or give us a call.'),
              },
            ]}
          />
        </Container>
      </section>
    </main>
  );
}
