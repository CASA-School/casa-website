import type { Metadata } from 'next';

import { HeroDGallery } from '@/components/heroes';
import { ComparisonModule, EditorialSplit, GuidedPicker, HumanStoryBlock, ProcessSteps, StudentHousingGuide } from '@/components/sections';
import { AccommodationPlaybook } from '@/components/signatures';
import { BandSeam } from '@/components/ui/band-seam';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { accommodationHeroFacts, accommodationPriceSummary } from '@/config/content/accommodation-costs';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getAccommodationNarratives, getSocialProofById } from '@/lib/content/repository';
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

  const flat = narratives.find((item) => item.id === 'flat');
  const host = narratives.find((item) => item.id === 'host');
  // Elena, deliberately: the accompanying teacher of a school group, and the only
  // published voice that talks about the host families this page is selling.
  const leadStory = getSocialProofById('elena-groups', locale);

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Unterkunft' : 'Accommodation' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      {/*
        The homepage's hero, composed from the same two shared parts — see the
        note in HeroDGallery. Three things arrive with it:

        - The breadcrumbs move INTO the hero. They used to render 400px lower,
          inside the options section, so this page put them somewhere no other
          accommodation page did.
        - The cost rail. The four figures that decide this page's question were
          only in the playbook, two scrolls down, while the hero asked for a
          housing match with no price anywhere near the ask.
        - The photo caption is gone with the photo's frame.
      */}
      <HeroDGallery
        breadcrumbs={breadcrumbs}
        eyebrow={locale === 'de' ? 'Unterkunft' : 'Accommodation'}
        title={locale === 'de' ? 'Wohnen in Bremen mit Klarheit und Vertrauen' : 'Live in Bremen with clarity and trust'}
        description={
          locale === 'de'
            ? 'Shared flats oder Host families: beide Wege werden durch CASA begleitet und transparent erklärt.'
            : 'Shared flats or host families: both pathways are supported by CASA with transparent expectations.'
        }
        photos={[pageConfig.photos.thumbA]}
        ctas={pageConfig.ctas}
        facts={accommodationHeroFacts(locale)}
      />

      <div id="flat" className="scroll-mt-28" />
      <div id="host" className="scroll-mt-28" />

      {/* Section 1: Options Shortlist */}
      <section className="bg-white py-16 md:py-24">
        {/* px-6 md:px-9 inside the gutter, so every section on this page shares
            one content column — the panels get theirs from their own padding. */}
        <Container>
          <div className="px-6 md:px-9">
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
                meta: locale === 'de' ? 'Ab €580 / 4 Wochen' : 'From €580 / 4 weeks',
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
                meta: locale === 'de' ? 'Ab €580 / 4 Wochen' : 'From €580 / 4 weeks',
                media: {
                  src: pageConfig.photos.thumbB.src,
                  alt: pageConfig.photos.thumbB.alt,
                },
              },
            ]}
          />
        </div>
        </Container>
      </section>

      {/*
        Section 2: Playbook.

        No `border-t`. Every light band on this page carried one, six in all, and
        five of them drew a hairline where the ground already changes — see the
        BandSeam doc comment for the measurement. Here the band above is white and
        this one is the canvas, an 11-unit step the eye reads on its own.
      */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="px-6 md:px-9">
          <AccommodationPlaybook
            eyebrow={locale === 'de' ? 'Kosten und Bedingungen' : 'Costs and conditions'}
            title={locale === 'de' ? 'Wohnregeln und Kosten transparent' : 'Housing expectations playbook'}
            description={
              locale === 'de'
                ? 'Verfügbarkeit, Kaution, Vermittlungsgebühr und Support werden vor der Buchung geklärt.'
                : 'Availability, deposit, placement fee, and support expectations are clarified before booking.'
            }
            /*
              Figures come from config/content/accommodation-costs.ts, and the
              currency is written one way. This block previously wrote "EUR 580"
              while the option pages wrote "580 EUR" and the course pages write
              "€580" — three formats, two of them on this page alone.

              It also said the Christmas/Easter weeks "may add EUR 145", while
              the flat page called the same 145 the additional-week rate. It is
              both, which is what the source table says, so both are stated.
            */
            cards={[
              {
                title: locale === 'de' ? 'Kostenbasis' : 'What it costs',
                detail:
                  locale === 'de'
                    ? `${accommodationPriceSummary(locale)}, plus €50 Vermittlungsgebühr — für Gastfamilie und WG identisch.`
                    : `${accommodationPriceSummary(locale)}, plus a €50 placement fee. The same for a host family and a shared flat.`,
              },
              {
                title: locale === 'de' ? 'Kaution und Zustand' : 'Deposit and condition',
                detail:
                  locale === 'de'
                    ? 'Die Kaution von €580 wird zurückerstattet, wenn Zimmer und Schlüssel so übergeben werden wie erhalten.'
                    : 'The €580 deposit is refunded when the room and the keys come back as they were handed over.',
              },
              {
                title: locale === 'de' ? 'Ferien und Fristen' : 'Holidays and timing',
                detail:
                  locale === 'de'
                    ? 'Für die Schließzeiten zu Weihnachten und Ostern gilt derselbe Wochensatz von €145. Storno wird mit 4 Wochen Vorlauf geplant.'
                    : 'The Christmas and Easter closure weeks carry the same €145 weekly rate. Cancellations are planned around a 4-week period.',
              },
            ]}
            checklistTitle={locale === 'de' ? 'Checkliste vor dem Einzug' : 'Before you move in'}
            checklist={[
              locale === 'de' ? 'Hausregeln vor Einzug lesen' : 'Review house rules before move-in',
              locale === 'de' ? 'Notfallkontakt speichern' : 'Save emergency contact details',
              locale === 'de' ? 'Anreisezeit bestätigen' : 'Confirm arrival timing',
              locale === 'de' ? 'Zimmerzustand beim Einzug dokumentieren' : 'Document room condition on arrival',
            ]}
          />
        </div>
        </Container>
      </section>

      {/* Section 3: Mission */}
      <section className="bg-white py-16 md:py-24">
        <Container>
            <EditorialSplit
            tone="plain"
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

      {/*
        Section 4: Comparison — AND THE PAGE'S ONE INVERTED FIELD.

        Nine sections on this page and, measured, not one of them was dark: the
        run was wash / white / warm / warm / white / warm / warm / white / light.
        The homepage's rhythm comes from four ink-deep fields breaking up the
        light ones, and without any the page reads as a tunnel however well each
        band is built. Choosing between a shared flat and a host family is the
        decision this page exists for, so that is the band that gets the weight.
      */}
      {/*
        128px of vertical air, not 96. The homepage gives both of its ink-deep
        fields `py-20 md:py-32` while every light band around them takes 96, and
        that difference is most of why they read as punctuation rather than as
        another section. This band was on 96 — the same value as the seven light
        bands around it — so the page's one inverted field was the only one of the
        site's four not given the weight the composition depends on.
      */}
      <section className="bg-[var(--casa-ink-deep)] py-20 md:py-32">
        <Container>
          <ComparisonModule
            tone="dark"
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
                /*
                  The first row on purpose. Two options priced identically, shown
                  side by side with no cost row, invited the reader to assume one
                  was cheaper — and the two pages did disagree about the 145.
                */
                label: locale === 'de' ? 'Kosten' : 'Cost',
                left: accommodationPriceSummary(locale),
                right: accommodationPriceSummary(locale),
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
        <section className="bg-white py-16 md:py-24">
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

      {/*
        Section 6: Steps — and THE PAGE'S ONE RAIL COMPOSITION.

        Measured before this, all nine bands on this page were the same shape:
        heading block on top, content full width beneath it. That is a different
        problem from the surface rhythm the previous pass fixed, and it survives
        any amount of work on the individual bands — the homepage's own answer is
        to put the heading in a narrow left rail beside a wider content column
        (`0.82fr / 1.18fr`, the persona-pathways band), and it uses that shape
        three times. This is the section it suits best here: three short steps
        that do not need the full 1216px, next to a heading that explains them.
      */}
      <section className="py-16 md:py-24">
        <Container>
          <ProcessSteps
            tone="plain"
            layout="rail"
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

      {/*
        The one place a seam is earned: the band above is the canvas and so is
        this one, so there is no change of ground to mark the boundary. A short
        centred hairline says "different thought" without the structural weight of
        a rule across the whole frame.
      */}
      <BandSeam />

      <section className="py-16 md:py-24">
        <Container>
          <StudentHousingGuide locale={locale} />
        </Container>
      </section>

      {/*
        THE OTHER SIDE OF THIS SECTION.

        /accommodation/become-host was reachable only from the nav dropdown: this
        page linked to /contact, /accommodation/flat and /accommodation/host and
        nowhere else, so a Bremen household who arrived here — the exact audience
        for it — had no route to it. Host families are also what makes the host
        option on this page possible, which is why the invitation belongs at the
        end of the student journey rather than competing with it at the top.
      */}
      <section className="bg-white py-16 md:py-24">
        <Container>
          <div className="flex flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between md:px-9">
            <div className="max-w-measure">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Gastgeben' : 'Hosting'}
              </p>
              <h2 className="mt-3 text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">
                {locale === 'de'
                  ? 'Sie wohnen in Bremen und haben ein Zimmer frei?'
                  : 'Do you live in Bremen with a room to spare?'}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">
                {locale === 'de'
                  ? 'CASA vermittelt seit 1983 Lernende an Gastgeber in Bremen. Familien, Paare und Einzelpersonen können gastgeben.'
                  : 'CASA has matched learners with households in Bremen since 1983. Families, couples and single-person households can all host.'}
              </p>
            </div>
            <TextCta href="/accommodation/become-host" className="shrink-0">
              {locale === 'de' ? 'Gastfamilie werden' : 'Become a host family'}
            </TextCta>
          </div>
        </Container>
      </section>
    </main>
  );
}
