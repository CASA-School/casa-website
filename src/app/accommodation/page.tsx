import type { Metadata } from 'next';

import { HeroDGallery } from '@/components/heroes';
import { ComparisonModule, EditorialSplit, GuidedPicker, HumanStoryBlock, ProcessSteps, StudentHousingGuide } from '@/components/sections';
import { AccommodationPlaybook } from '@/components/signatures';
import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getAccommodationNarratives, getSocialProof } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Accommodation',
  description: 'Choose between shared flats and host families with clear trust standards and support from CASA.',
  path: '/accommodation',
  keywords: ['Accommodation Bremen', 'Host families', 'Shared flats'],
});

export default async function AccommodationPage() {
  const locale = await getContentLocale();
  const rhythm = getLayoutRhythm('accommodation-index');
  const pageConfig = getPublicPageConfig('accommodation', locale);

  const narratives = getAccommodationNarratives(locale);
  const stories = getSocialProof(locale);
  const flat = narratives.find((item) => item.id === 'flat');
  const host = narratives.find((item) => item.id === 'host');
  const leadStory = stories[0];

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Unterkunft' : 'Accommodation' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <HeroDGallery
        eyebrow={locale === 'de' ? 'Unterkunft' : 'Accommodation'}
        title={locale === 'de' ? 'Wohnen in Bremen mit Klarheit und Vertrauen' : 'Live in Bremen with clarity and trust'}
        description={
          locale === 'de'
            ? 'Shared flats oder Host families: beide Wege werden durch CASA begleitet und transparent erklärt.'
            : 'Shared flats or host families: both pathways are supported by CASA with transparent expectations.'
        }
        photos={[
          {
            ...pageConfig.photos.thumbA,
            caption: 'Shared flat bedroom with desk and balcony - Independent living close to CASA.',
          },
          {
            ...pageConfig.photos.thumbB,
            caption: 'Host family kitchen table - Daily immersion and cultural exchange.',
          },
          {
            ...pageConfig.photos.thumbC,
            caption: 'Shared flat kitchen with study materials - Practical everyday student life.',
          },
        ]}
        ctas={pageConfig.ctas}
      />

      <div id="flat" className="scroll-mt-28" />
      <div id="host" className="scroll-mt-28" />

      {/* Section 1: Options Shortlist */}
      <section className="py-16 md:py-20 bg-white">
        <Container>
          <Breadcrumbs items={breadcrumbs} className="mb-8" />
          <GuidedPicker
            eyebrow={locale === 'de' ? 'Wohnoptionen' : 'Accommodation options'}
            title={locale === 'de' ? 'Zwei Hauptoptionen für Ihren Aufenthalt' : 'Two primary options for your stay'}
            description={
              locale === 'de'
                ? 'Weniger Auswahlstress, mehr Orientierung: WG oder Gastfamilie.'
                : 'Less option overload, more clarity: shared flats or host families.'
            }
            items={[
              {
                title: locale === 'de' ? 'WGs' : 'Shared flats',
                description: flat?.summary || '',
                bestFor: locale === 'de' ? 'Gut für: eigenständiger Alltag' : 'Best for: independent routines',
                href: '/accommodation/flat',
                ctaLabel: locale === 'de' ? 'Details' : 'Details',
                meta: locale === 'de' ? 'Ab 580 EUR / 4 Wochen' : 'From 580 EUR / 4 weeks',
                media: {
                  src: pageConfig.photos.thumbA.src,
                  alt: pageConfig.photos.thumbA.alt,
                },
              },
              {
                title: locale === 'de' ? 'Gastfamilien' : 'Host families',
                description: host?.summary || '',
                bestFor: locale === 'de' ? 'Gut für: tägliche Sprachpraxis' : 'Best for: daily language immersion',
                href: '/accommodation/host',
                ctaLabel: locale === 'de' ? 'Details' : 'Details',
                meta: locale === 'de' ? 'Ab 580 EUR / 4 Wochen' : 'From 580 EUR / 4 weeks',
                media: {
                  src: pageConfig.photos.thumbB.src,
                  alt: pageConfig.photos.thumbB.alt,
                },
              },
            ]}
          />
        </Container>
      </section>

      {/* Section 2: Playbook */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30">
        <Container>
          <AccommodationPlaybook
            title={locale === 'de' ? 'Wohnregeln und Kosten transparent' : 'Housing expectations playbook'}
            description={
              locale === 'de'
                ? 'Verfügbarkeit, Kaution, Vermittlungsgebühr und Support werden vor der Buchung geklärt.'
                : 'Availability, deposit, placement fee, and support expectations are clarified before booking.'
            }
            cards={[
              {
                title: locale === 'de' ? 'Kostenbasis 2026' : '2026 planning basis',
                detail:
                  locale === 'de'
                    ? '580 EUR für 4 Wochen, 145 EUR je weitere Woche, plus 50 EUR Vermittlungsgebühr.'
                    : 'EUR 580 for 4 weeks, EUR 145 per additional week, plus EUR 50 placement fee.',
              },
              {
                title: locale === 'de' ? 'Kaution und Zustand' : 'Deposit and condition',
                detail:
                  locale === 'de'
                    ? 'Die 580 EUR Kaution wird nach Auszug je nach Zimmer- und Schlüsselzustand abgerechnet.'
                    : 'The EUR 580 deposit is settled after departure based on room and key condition.',
              },
              {
                title: locale === 'de' ? 'Ferien und Fristen' : 'Holidays and timing',
                detail:
                  locale === 'de'
                    ? 'Weihnachts- und Osterzeiten können 145 EUR pro Woche extra kosten; Storno wird mit 4 Wochen Vorlauf geplant.'
                    : 'Christmas and Easter periods may add EUR 145 per week; cancellations are planned around a 4-week period.',
              },
            ]}
            checklist={[
              locale === 'de' ? 'Hausregeln vor Einzug lesen' : 'Review house rules before move-in',
              locale === 'de' ? 'Notfallkontakt speichern' : 'Save emergency contact details',
              locale === 'de' ? 'Anreisezeit bestätigen' : 'Confirm arrival timing',
              locale === 'de' ? 'Zimmerzustand beim Einzug dokumentieren' : 'Document room condition on arrival',
            ]}
          />
        </Container>
      </section>

      {/* Section 3: Mission */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
        <Container>
            <EditorialSplit
            eyebrow={locale === 'de' ? 'Ankommen' : 'Human story'}
            title={locale === 'de' ? 'Unterkunft als Teil des Lernerfolgs' : 'Housing as part of language progress'}
            description={
              locale === 'de'
                ? 'Ein passendes Wohnumfeld verbessert Alltag, Konzentration und sprachliche Sicherheit.'
                : 'A suitable living setup improves focus, daily rhythm, and spoken confidence.'
            }
            bullets={[
              locale === 'de' ? 'Ankommen mit klaren Erwartungen' : 'Arrive with clear expectations',
              locale === 'de' ? 'Unterstützung bei Fragen und Anpassungen' : 'Support for practical adjustments',
              locale === 'de' ? 'Mehr Sicherheit für Kursstart und Integration' : 'More stability for class start and integration',
            ]}
            photo={{
              ...pageConfig.photos.story,
              caption: 'Host family dinner conversation - Daily immersion and cultural exchange.',
            }}
          />
        </Container>
      </section>

      {/* Section 4: Comparison */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30">
        <Container>
          <ComparisonModule
            eyebrow={locale === 'de' ? 'Direktvergleich' : 'Side-by-side comparison'}
            title={locale === 'de' ? 'WGs vs Gastfamilien' : 'Shared Flats vs Host Families'}
            description={
              locale === 'de'
                ? 'Ein klarer Vergleich nach Alltag, Sprachpraxis und Struktur.'
                : 'A practical comparison by daily rhythm, language exposure, and structure.'
            }
            leftTitle={locale === 'de' ? 'WGs' : 'Shared Flats'}
            rightTitle={locale === 'de' ? 'Gastfamilien' : 'Host Families'}
            rows={[
              {
                label: locale === 'de' ? 'Alltag' : 'Daily routine',
                left: locale === 'de' ? 'Eigenständig' : 'Independent',
                right: locale === 'de' ? 'Familiennah' : 'Family integrated',
              },
              {
                label: locale === 'de' ? 'Sprachpraxis' : 'Language exposure',
                left: locale === 'de' ? 'Peer-Umfeld' : 'Peer-based',
                right: locale === 'de' ? 'Tägliche Konversation' : 'Daily conversation',
              },
              {
                label: locale === 'de' ? 'Geeignet für' : 'Best for',
                left: locale === 'de' ? 'Flexible Selbstorganisation' : 'Flexible self-management',
                right: locale === 'de' ? 'Kulturelle Immersion' : 'Cultural immersion',
              },
              {
                label: locale === 'de' ? 'Privatsphäre' : 'Privacy',
                left: locale === 'de' ? 'Hoch - eigenes Zimmer in WG-Umfeld' : 'Higher - own room with independent routine',
                right: locale === 'de' ? 'Mittel - Familienalltag mit gemeinsamen Zeiten' : 'Moderate - shared family rhythm',
              },
              {
                label: locale === 'de' ? 'Nebenkosten' : 'Utilities',
                left: locale === 'de' ? 'Meist inklusive, je nach WG-Regelung' : 'Usually included, depends on flat policy',
                right: locale === 'de' ? 'In der Regel inklusive' : 'Typically included',
              },
              {
                label: locale === 'de' ? 'Sprachintensität zuhause' : 'Home language immersion',
                left: locale === 'de' ? 'Variiert nach Mitbewohnenden' : 'Varies with roommates',
                right: locale === 'de' ? 'Hoch durch tägliche Familiengespräche' : 'High through daily family conversation',
              },
              {
                label: locale === 'de' ? 'Support bei Fragen' : 'Support response',
                left: locale === 'de' ? 'CASA Housing Team + Hausregeln' : 'CASA housing team plus house policy',
                right: locale === 'de' ? 'CASA Housing Team + Gastgeberkontakt' : 'CASA housing team plus host contact',
              },
            ]}
          />
        </Container>
      </section>

      {/* Section 5: Story */}
      {leadStory ? (
        <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
          <Container>
            <HumanStoryBlock
              eyebrow={locale === 'de' ? 'Wohn-Erfahrung' : 'Housing story'}
              title={locale === 'de' ? 'Ankommen, wohl fühlen, besser lernen' : 'Settle well, learn better'}
              quote={leadStory.quote}
              person={leadStory.personDisplay}
              context={leadStory.country}
              photo={{
                src: pageConfig.photos.thumbB.src,
                alt: pageConfig.photos.thumbB.alt,
              }}
              supportingText={
                locale === 'de'
                  ? 'Die passende Wohnsituation schafft Stabilität für den Kursstart und den Alltag in Bremen.'
                  : 'The right housing setup creates stability for your classes and daily life in Bremen.'
              }
            />
          </Container>
        </section>
      ) : null}

      {/* Section 6: Steps */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30">
        <Container>
          <ProcessSteps
            eyebrow={locale === 'de' ? 'Ablauf' : 'How requests work'}
            title={locale === 'de' ? 'Unterkunftsanfrage in drei Schritten' : 'Request accommodation in three steps'}
            description={
              locale === 'de'
                ? 'Schnell, transparent und mit klarer Rückmeldung.'
                : 'Fast, transparent, and backed by clear support communication.'
            }
            steps={[
              {
                step: locale === 'de' ? '1' : '1',
                title: locale === 'de' ? 'Präferenz senden' : 'Share preference',
                description: locale === 'de' ? 'WG oder Gastfamilie wählen.' : 'Choose shared flat or host family.',
              },
              {
                step: locale === 'de' ? '2' : '2',
                title: locale === 'de' ? 'Matching erhalten' : 'Receive matching options',
                description: locale === 'de' ? 'Passende Optionen mit Details.' : 'Receive suitable options with details.',
              },
              {
                step: locale === 'de' ? '3' : '3',
                title: locale === 'de' ? 'Bestätigen und einziehen' : 'Confirm and move in',
                description: locale === 'de' ? 'Check-in Informationen folgen.' : 'Check-in details are shared next.',
              },
            ]}
          />
        </Container>
      </section>

      <section className="py-16 md:py-20 bg-[var(--casa-surface-wash)]/30 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <StudentHousingGuide locale={locale} />
        </Container>
      </section>
    </main>
  );
}
