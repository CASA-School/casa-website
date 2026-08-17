import type { Metadata } from 'next';

import { HeroBEditorial } from '@/components/heroes';
import { EditorialSplit, HumanStoryBlock, ProofBand, TestimonialGrid } from '@/components/sections';
import { AboutMilestones } from '@/components/signatures';
import { TextCta } from '@/components/ui/text-cta';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { shouldShowDraftClaims } from '@/lib/content/locale';
import { getContentLocale } from '@/lib/content/locale.server';
import { getProofMetrics, getSocialProof } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'About CASA',
  description: 'CASA in Bremen: people-first language education, long-term community impact, and trusted standards.',
  path: '/about',
  keywords: ['About CASA', 'CASA Bremen mission', 'Language school community'],
});

export default async function AboutPage() {
  const locale = await getContentLocale();
  const rhythm = getLayoutRhythm('about');
  const pageConfig = getPublicPageConfig('about', locale);
  const showDraftClaims = shouldShowDraftClaims();

  const [proofMetrics, stories] = await Promise.all([
    Promise.resolve(getProofMetrics(locale)),
    Promise.resolve(getSocialProof(locale)),
  ]);

  const proofStats = proofMetrics
    .filter((metric) => showDraftClaims || metric.verificationStatus === 'verified')
    .filter((metric) => !metric.value.includes('1983'))
    .slice(0, 4)
    .map((metric) => ({ value: metric.value, label: metric.label }));

  const testimonialPortraits = [
    pageConfig.photos.testimonialA,
    pageConfig.photos.testimonialB,
    pageConfig.photos.testimonialC,
  ];
  const testimonialCards = stories.map((story, index) => ({
    id: story.id,
    person: story.personDisplay,
    country: story.country,
    quote: story.quote,
    photoSrc: testimonialPortraits[index % testimonialPortraits.length].src,
    photoAlt: testimonialPortraits[index % testimonialPortraits.length].alt,
    photoCaption: '',
  }));

  const featuredQuote = stories[0]
    ? {
        quote: stories[0].quote,
        person: stories[0].personDisplay,
        role: stories[0].country,
      }
    : {
        quote:
          locale === 'de'
            ? 'CASA fühlt sich wie ein Ort an, an dem Menschen wirklich gesehen werden.'
            : 'CASA feels like a place where people are truly seen.',
        person: locale === 'de' ? 'CASA Lernende' : 'CASA learner',
        role: locale === 'de' ? 'Bremen' : 'Bremen',
      };

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Unsere Schule' : 'Our School' },
  ];

  const leitbild = locale === 'de'
    ? {
        eyebrow: 'CASA Leitbild',
        title: 'Miteinander reden - aufeinander zugehen',
        intro:
          'CASA wurde 1983 von einer Gruppe junger Pädagoginnen und Pädagogen gegründet. Als gemeinnützige Sprachschule verbinden wir Professionalität mit Leidenschaft und schaffen einen Ort der Begegnung für Menschen unterschiedlichster Herkunft.',
        qualityTitle: 'Unsere Qualitätsstandards',
        qualityBullets: [
          'Kontinuität und Aktualität unseres Angebots',
          'Hohe fachliche, pädagogische und soziale Kompetenz unserer Mitarbeitenden',
          'Zeitgemäße räumliche und technische Ausstattung',
          'Erwachsenengerechte Lehr- und Lernmaterialien',
          'Regelmäßige selbstkritische Hinterfragung unserer Arbeit',
        ],
        aimsTitle: 'Unsere Ziele',
        aimsText:
          'Wir spezialisieren uns auf Deutsch als Fremdsprache. Sprachkenntnisse und Ausdrucksfähigkeit sind Schlüssel für Integration, Beruf und Studium.',
        approachTitle: 'Begegnungspädagogik',
        approachText:
          'CASA versteht sich als Brückenbauer zwischen Menschen. Wir schaffen in unserem Unterricht und in unseren Programmen Raum für Begegnung, Austausch und persönliche Entwicklung.',
        encounterBullets: [
          'Unterbringung in deutschen Gastfamilien',
          'Organisation von Tandempartnerschaften',
          'Kultur- und Freizeitprogramme in Bremen',
          'Partnerübungen und Austausch im Unterricht',
        ],
      }
    : {
        eyebrow: 'CASA mission',
        title: 'Talking with each other – reaching out to one another',
        intro:
          'CASA was founded in 1983 by a group of young educators. As a non-profit language school, we combine professionalism with passion and create a house of encounter for people from diverse cultural backgrounds.',
        qualityTitle: 'Our quality standards',
        qualityBullets: [
          'Continuity and relevance of our course portfolio',
          'Strong pedagogical and social competence across our team',
          'Reliable facilities and learning infrastructure',
          'Adult-focused teaching and learning materials',
          'Regular self-review and quality feedback loops',
        ],
        aimsTitle: 'Our aims',
        aimsText:
          'We specialize in German as a foreign language. Communication skills are key for integration, work readiness, and university pathways in Germany.',
        approachTitle: 'Encounter-based pedagogy',
        approachText:
          'CASA sees itself as a bridge builder between people. We intentionally design language learning spaces where exchange, confidence, and personal growth can happen.',
        encounterBullets: [
          'Hosting learners with German families',
          'Organizing tandem partnerships',
          'Running cultural and leisure programs',
          'Creating space for partner work in class',
        ],
      };

  const tandemGuide = locale === 'de'
    ? {
        eyebrow: 'Tandem Programm',
        title: 'Sprachpraxis durch echte Begegnung',
        intro:
          'CASA fördert sprachlichen und kulturellen Austausch über den Unterricht hinaus. Ein Sprachtandem hilft dabei, die Sprache regelmäßig in echten Gesprächen anzuwenden.',
        stepsTitle: 'So funktioniert es',
        steps: [
          'Sie füllen das Tandem-Formular aus und nennen Ihre Wunschsprache.',
          'Wir suchen eine passende Tandempartnerin oder einen passenden Tandempartner.',
          'Wir koordinieren ein erstes Treffen bei CASA und begleiten den Start.',
        ],
        benefitsTitle: 'Warum es wirkt',
        benefits: [
          'Mehr Sprechpraxis im Alltag',
          'Mehr Sicherheit in realen Situationen',
          'Kultureller Austausch mit Menschen vor Ort',
          'Verbindung von Unterricht und echter Kommunikation',
        ],
        primaryCta: 'Tandem anfragen',
        secondaryCta: 'Team kontaktieren',
      }
    : {
        eyebrow: 'Tandem program',
        title: 'Language practice through real exchange',
        intro:
          'CASA supports language and cultural exchange beyond the classroom. Tandem practice helps learners apply language in real conversations with confidence.',
        stepsTitle: 'How it works',
        steps: [
          'You submit the tandem form and select your target language.',
          'We match you with a suitable tandem partner.',
          'We coordinate a first meeting at CASA and support your kickoff.',
        ],
        benefitsTitle: 'Why it helps',
        benefits: [
          'More real speaking practice',
          'More confidence in everyday situations',
          'Cultural exchange with people in Bremen',
          'Stronger link between class and real communication',
        ],
        primaryCta: 'Ask about tandem',
        secondaryCta: 'Contact our team',
      };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <HeroBEditorial
        eyebrow={locale === 'de' ? 'Unsere Schule' : 'Our School'}
        title={locale === 'de' ? 'Ein Haus der Begegnung in Bremen' : 'A house of encounter in Bremen'}
        description={
          locale === 'de'
            ? 'CASA ist ein Ort, an dem Sprache, Menschen und Zukunftsperspektiven zusammenfinden.'
            : 'CASA is where language learning, human connection, and future opportunities meet.'
        }
        photo={{
          ...pageConfig.photos.hero,
          caption: 'International students practicing together after class - Learning continues outside the classroom.',
        }}
        ctas={pageConfig.ctas}
        proofItems={proofStats}
        breadcrumbs={breadcrumbs}
        themeClassName="hero-theme-about"
      />

      {/* Section 1: Proof Band */}
      <section id="partners" className="py-16 md:py-20 bg-white scroll-mt-28">
        <Container>
          <ProofBand
            locale={locale}
            title={locale === 'de' ? 'Nachweise und Partner' : 'Proof and partners'}
            credibilityLine={
              locale === 'de'
                ? 'Langjährige Bildungsarbeit, Partnerschaften und gelebte Community.'
                : 'Long-term educational impact, trusted partners, and community credibility.'
            }
          />
        </Container>
      </section>

      {/* Section 2: Milestones */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30">
        <Container>
          <AboutMilestones
            title={locale === 'de' ? 'CASA Meilensteine seit 1983' : 'CASA milestones since 1983'}
            description={
              locale === 'de'
                ? 'Wie sich CASA als internationale Sprachschule in Bremen entwickelt hat.'
                : 'How CASA has evolved as an international language school in Bremen.'
            }
            milestones={[
              {
                label: '1983',
                title: locale === 'de' ? 'Gründung in Bremen' : 'Founded in Bremen',
                description:
                  locale === 'de'
                    ? 'Start als menschenorientierte Sprachschule.'
                    : 'Started as a people-first language school model.',
              },
              {
                label: '1990s',
                title: locale === 'de' ? 'Internationale Expansion' : 'International expansion',
                description:
                  locale === 'de'
                    ? 'Mehr Lernende aus unterschiedlichen Herkunftsländern.'
                    : 'More learners from increasingly diverse backgrounds.',
              },
              {
                label: locale === 'de' ? 'Heute' : 'Today',
                title: locale === 'de' ? 'Community mit Wirkung' : 'Community with impact',
                description:
                  locale === 'de'
                    ? 'Sprache, Integration und Prüfungswege aus einer Hand.'
                    : 'Language growth, integration, and exam pathways in one ecosystem.',
              },
            ]}
          />
        </Container>
      </section>

      {/* Section 3: Mission */}
      <section id="mission" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white scroll-mt-28">
        <Container>
          <EditorialSplit
            eyebrow={locale === 'de' ? 'Menschliche Bildung' : 'Human education'}
            title={locale === 'de' ? 'Menschen stehen im Zentrum unseres Lernmodells' : 'People are at the center of our learning model'}
            description={
              locale === 'de'
                ? 'Unsere Arbeit verbindet akademische Struktur mit echter menschlicher Begleitung.'
                : 'Our work combines academic structure with genuine human support.'
            }
            bullets={[
              locale === 'de' ? 'Kleine Lerngruppen für mehr Sprechzeit' : 'Small groups for more speaking time',
              locale === 'de' ? 'Lehrkräfte mit persönlichem Feedback' : 'Teachers who provide personal feedback',
              locale === 'de' ? 'Community-Programme für Alltag in Bremen' : 'Community programs for real life in Bremen',
            ]}
            photo={{
              ...pageConfig.photos.mission,
              caption: 'Teacher giving feedback during speaking exercise - Personal feedback in small groups.',
            }}
          />
        </Container>
      </section>

      {/* Section 4: Leitbild */}
      <section id="leitbild" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30 scroll-mt-28">
        <Container>
          <article className="rounded-3xl border border-[color:var(--casa-sand)]/60 bg-white p-6 shadow-[var(--shadow-card)] md:p-10">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{leitbild.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] md:text-3xl">{leitbild.title}</h2>
            <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{leitbild.intro}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <section className="rounded-xl bg-[var(--casa-surface-wash)]/60 p-5">
                <h3 className="text-lg font-bold text-[var(--casa-ink)]">{leitbild.qualityTitle}</h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--casa-muted)]">
                  {leitbild.qualityBullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl bg-[var(--casa-surface-wash)]/60 p-5">
                <h3 className="text-lg font-bold text-[var(--casa-ink)]">{leitbild.approachTitle}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{leitbild.approachText}</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--casa-muted)]">
                  {leitbild.encounterBullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-amber-strong)]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="mt-4 rounded-xl bg-[var(--casa-warm-soft)]/22 p-5">
              <h3 className="text-lg font-bold text-[var(--casa-ink)]">{leitbild.aimsTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{leitbild.aimsText}</p>
            </section>
          </article>
        </Container>
      </section>

      {/* Section 5: Tandem Program */}
      <section id="tandem" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white scroll-mt-28">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{tandemGuide.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] md:text-3xl">{tandemGuide.title}</h2>
              <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{tandemGuide.intro}</p>

              {/* Two adjacent buttons with different labels and the identical
                  /contact href. The /about hero already carries "Talk to
                  admissions" -> /contact as its primary, so this block was the
                  second and third route to one page. One text link now. */}
              <div className="mt-5">
                <TextCta href="/contact">{tandemGuide.primaryCta}</TextCta>
              </div>
            </div>

            <div className="space-y-4">
              <section className="rounded-xl bg-[var(--casa-surface-wash)]/60 p-5">
                <h3 className="text-base font-bold text-[var(--casa-ink)]">{tandemGuide.stepsTitle}</h3>
                <ol className="mt-3 space-y-2">
                  {tandemGuide.steps.map((step, index) => (
                    <li key={step} className="flex items-start gap-2 text-sm text-[var(--casa-muted)]">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--casa-blue)]/12 text-xs font-bold text-[var(--casa-accent-text)]">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="rounded-xl bg-[var(--casa-warm-soft)]/22 p-5">
                <h3 className="text-base font-bold text-[var(--casa-ink)]">{tandemGuide.benefitsTitle}</h3>
                <ul className="mt-3 space-y-2">
                  {tandemGuide.benefits.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[var(--casa-muted)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-ink)]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </Container>
      </section>

      {/* Section 6: Community Story Block */}
      {stories[1] ? (
        <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30">
          <Container>
            <HumanStoryBlock
              eyebrow={locale === 'de' ? 'Community-Stimme' : 'Community story'}
              title={
                locale === 'de'
                  ? 'Was Menschen bei CASA spüren'
                  : 'What people feel at CASA'
              }
              quote={stories[1].quote}
              person={stories[1].personDisplay}
              context={stories[1].country}
              photo={{
                src: pageConfig.photos.hero.src,
                alt: pageConfig.photos.hero.alt,
              }}
              supportingText={
                locale === 'de'
                  ? 'Die Kombination aus Unterricht, Gemeinschaft und Orientierung macht den Unterschied.'
                  : 'The mix of teaching, community, and personal orientation makes the difference.'
              }
              mediaSide="right"
            />
          </Container>
        </section>
      ) : null}

      {/* Section 7: Testimonial Grid */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
        <Container>
          <TestimonialGrid
            title={locale === 'de' ? 'Wie Lernende CASA erleben' : 'How learners experience CASA'}
            description={
              locale === 'de'
                ? 'Stimmen aus Unterricht und Alltag in Bremen.'
                : 'Stories from class life and everyday Bremen.'
            }
            cards={testimonialCards}
            featuredQuote={featuredQuote}
            locale={locale}
          />
        </Container>
      </section>
    </main>
  );
}
