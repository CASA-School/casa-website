import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HeroCUtilityRail } from '@/components/heroes';
import { ComparisonModule, DecisionRail, EditorialSplit, ProcessSteps } from '@/components/sections';
import { AccommodationArrivalChecklist } from '@/components/signatures';
import { localizeAccommodationCosts } from '@/config/content/accommodation-costs';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getAccommodationDetail } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';
import type { AccommodationTypeKey } from '@/lib/content/types';

type AccommodationDetailPageProps = {
  params: Promise<{ type: string }>;
};

const validTypes: AccommodationTypeKey[] = ['flat', 'host'];

export async function generateMetadata({ params }: AccommodationDetailPageProps): Promise<Metadata> {
  const { type } = await params;

  if (!validTypes.includes(type as AccommodationTypeKey)) {
    return createPublicMetadata({
      title: 'Accommodation detail',
      description: 'CASA accommodation detail',
      path: `/accommodation/${type}`,
    });
  }

  return createPublicMetadata({
    title: type === 'flat' ? 'Shared Flats | CASA' : 'Host Families | CASA',
    description: 'CASA accommodation detail including arrival checklist and support expectations.',
    path: `/accommodation/${type}`,
  });
}

export default async function AccommodationDetailPage({ params }: AccommodationDetailPageProps) {
  const locale = await getContentLocale();
  const { type } = await params;

  if (!validTypes.includes(type as AccommodationTypeKey)) {
    notFound();
  }

  const accommodationType = type as AccommodationTypeKey;
  const detail = await getAccommodationDetail(accommodationType, locale);
  if (!detail) {
    notFound();
  }

  const rhythm = getLayoutRhythm('accommodation-detail');
  const pageConfig = getPublicPageConfig('accommodation-detail', locale);

  const optionTitle =
    accommodationType === 'flat'
      ? locale === 'de'
        ? 'WGs'
        : 'Shared flats'
      : locale === 'de'
        ? 'Gastfamilien'
        : 'Host families';

  /*
    The sticky rail's own two rows. Deliberately price + availability: what a
    reader needs at the moment they decide, not the full fee schedule they have
    already scrolled past twice.
  */
  const decisionItems = [
    { label: locale === 'de' ? 'Preis ab' : 'Price from', value: locale === 'de' ? '€580 / 4 Wochen' : '€580 / 4 weeks' },
    { label: locale === 'de' ? 'Verfügbarkeit' : 'Availability', value: locale === 'de' ? 'Auf Anfrage' : 'On request' },
  ];

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Unterkunft' : 'Accommodation', href: '/accommodation' },
    { label: optionTitle },
  ];

  const infoItems = [
    { label: locale === 'de' ? 'Typ' : 'Type', value: optionTitle },
    /*
      One currency format. These four lines managed three of them: "580 EUR / 4
      weeks", then "EUR 145", "EUR 50", "EUR 580" — suffix and prefix alternating
      inside a single rail, with German using suffix throughout and English
      flipping between the two. Site-wide the count was 111 suffix, 57 prefix and
      52 symbol.
    */
    { label: locale === 'de' ? 'Preis ab' : 'Price from', value: locale === 'de' ? '€580 / 4 Wochen' : '€580 / 4 weeks' },
    { label: locale === 'de' ? 'Weitere Woche' : 'Extra week', value: '€145' },
    { label: locale === 'de' ? 'Vermittlung' : 'Placement fee', value: '€50' },
    { label: locale === 'de' ? 'Kaution' : 'Deposit', value: '€580' },
    { label: locale === 'de' ? 'Verfügbarkeit' : 'Availability', value: locale === 'de' ? 'Auf Anfrage' : 'On request' },
  ];

  const detailHeroPhoto =
    accommodationType === 'flat' ? pageConfig.photos.supportCard : pageConfig.photos.story;

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <HeroCUtilityRail
        eyebrow={locale === 'de' ? 'Unterkunftsdetail' : 'Accommodation detail'}
        title={detail.headline}
        description={detail.summary}
        breadcrumbs={breadcrumbs}
        infoTitle={locale === 'de' ? 'Unterkunftsinfos' : 'Accommodation details'}
        infoItems={infoItems}
        notes={
          locale === 'de'
            ? 'Verfügbarkeit wird nach Anfrage bestätigt. Für die Schließzeiten gilt derselbe Wochensatz von €145; Storno wird mit 4 Wochen Vorlauf geplant.'
            : 'Availability is confirmed after your request. The closure weeks carry the same €145 weekly rate; cancellations are planned around a 4-week period.'
        }
        ctas={pageConfig.ctas}
        photo={{
          ...detailHeroPhoto,
          caption:
            accommodationType === 'flat'
              ? 'Shared flat kitchen / common area - Independent living with other students.'
              : 'Host family dinner conversation - Daily immersion and cultural exchange.',
        }}
        themeClassName="hero-theme-accommodation"
      />

      <section className="py-16 md:py-20">
        <Container className="space-y-12 md:space-y-14">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div className="min-w-0 space-y-12 md:space-y-14">
              <AccommodationArrivalChecklist
                title={locale === 'de' ? 'Ankunfts- und Stadtteil-Checkliste' : 'Neighborhood + arrival checklist'}
                description={
                  locale === 'de'
                    ? 'Printbare Checkliste für Anreise, Orientierung und erste Woche.'
                    : 'Printable checklist for arrival, orientation, and your first week.'
                }
                neighborhoodTitle={locale === 'de' ? 'Im Stadtteil' : 'In the neighbourhood'}
                checklistTitle={locale === 'de' ? 'Vor der Ankunft' : 'Before you arrive'}
                printLabel={locale === 'de' ? 'Checkliste drucken' : 'Print checklist'}
                neighborhoodNotes={[
                  locale === 'de' ? 'ÖPNV-Anbindung und Wege zur Schule prüfen' : 'Check public transport access to school',
                  locale === 'de' ? 'Nächste Supermärkte und Apotheken lokalisieren' : 'Locate nearby groceries and pharmacies',
                  locale === 'de' ? 'Ruhige Lernorte im Umfeld identifizieren' : 'Identify quiet places for study',
                ]}
                arrivalChecklist={[
                  locale === 'de' ? 'Check-in Zeit bestätigen' : 'Confirm check-in time',
                  locale === 'de' ? 'Hausregeln lesen und akzeptieren' : 'Review and accept house rules',
                  locale === 'de' ? 'Notfallkontakt abspeichern' : 'Save emergency support contact',
                  locale === 'de' ? 'Kaution, Vermittlung und Stornofrist prüfen' : 'Review deposit, placement fee, and cancellation timing',
                  locale === 'de' ? 'Ersten Schulweg vorab testen' : 'Test first commute to CASA',
                ]}
              />

              <EditorialSplit
                eyebrow={locale === 'de' ? 'Wohnprofil' : 'Living snapshot'}
                title={optionTitle}
                description={detail.summary}
                bullets={detail.highlights}
                photo={{
                  ...pageConfig.photos.story,
                  caption:
                    accommodationType === 'flat'
                      ? 'Shared flat kitchen / common area - Independent living with other students.'
                      : 'Host family dinner conversation - Daily immersion and cultural exchange.',
                }}
              />

              {/*
                The cost, stated in full, identically on both option pages.

                It used to be two of the four `highlights` bullets — and the two
                options told different stories about the same figures: the flat
                listed the 4-week price, the additional-week rate, the placement
                fee and the deposit; the host family listed only a "holiday
                surcharge" of the same 145. Same price, two accounts of it.
                Everything here comes from config/content/accommodation-costs.ts.
              */}
              <section>
                <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">
                  {locale === 'de' ? 'Was die Unterkunft kostet' : 'What the accommodation costs'}
                </h2>
                <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                  {locale === 'de'
                    ? 'Für die Gastfamilie und für die CASA-WG gelten dieselben Sätze. Die Wahl ist eine Frage des Alltags, nicht des Preises.'
                    : 'A host family and a CASA shared flat cost the same. Choosing between them is a question of daily life, not of price.'}
                </p>
                <dl className="mt-7 border-t border-[color:var(--casa-sand)]">
                  {localizeAccommodationCosts(locale).map((cost) => (
                    <div
                      key={cost.label}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-[color:var(--casa-sand)]/60 py-3.5"
                    >
                      <dt className="text-sm leading-relaxed text-[var(--casa-ink)]">
                        {cost.label}
                        {cost.note ? (
                          <span className="mt-1 block text-xs leading-relaxed text-[var(--casa-muted)]">
                            {cost.note}
                          </span>
                        ) : null}
                      </dt>
                      {/* Tabular figures so the amounts form a column a reader can scan. */}
                      <dd className="whitespace-nowrap text-base font-bold tabular-nums text-[var(--casa-ink)]">
                        {cost.amount}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <ComparisonModule
                eyebrow={locale === 'de' ? 'Vergleich' : 'Comparison'}
                title={locale === 'de' ? 'Ist diese Option die richtige für Sie?' : 'Is this option right for you?'}
                description={
                  locale === 'de'
                    ? 'Vergleich nach Alltag, Struktur und Sprachpraxis.'
                    : 'Compare by daily routine, structure, and language exposure.'
                }
                leftTitle={optionTitle}
                rightTitle={
                  accommodationType === 'flat'
                    ? locale === 'de'
                      ? 'Gastfamilien'
                      : 'Host Families'
                    : locale === 'de'
                      ? 'WGs'
                      : 'Shared Flats'
                }
                rows={[
                  {
                    label: locale === 'de' ? 'Alltagsrhythmus' : 'Daily rhythm',
                    left: accommodationType === 'flat' ? (locale === 'de' ? 'Selbstorganisiert' : 'Self-organized') : locale === 'de' ? 'Familienbasiert' : 'Family-based',
                    right: accommodationType === 'flat' ? (locale === 'de' ? 'Familienbasiert' : 'Family-based') : locale === 'de' ? 'Selbstorganisiert' : 'Self-organized',
                  },
                  {
                    label: locale === 'de' ? 'Sprachpraxis' : 'Language practice',
                    left: accommodationType === 'flat' ? (locale === 'de' ? 'Peer-Umfeld' : 'Peer environment') : locale === 'de' ? 'Tägliche Gespräche' : 'Daily conversations',
                    right: accommodationType === 'flat' ? (locale === 'de' ? 'Tägliche Gespräche' : 'Daily conversations') : locale === 'de' ? 'Peer-Umfeld' : 'Peer environment',
                  },
                  {
                    label: locale === 'de' ? 'Privatsphäre' : 'Privacy',
                    left: accommodationType === 'flat' ? (locale === 'de' ? 'Hoch - eigenes Zimmer in WG' : 'Higher - own room in shared flat') : locale === 'de' ? 'Mittel - Familienalltag' : 'Moderate - shared family rhythm',
                    right: accommodationType === 'flat' ? (locale === 'de' ? 'Mittel - Familienalltag' : 'Moderate - shared family rhythm') : locale === 'de' ? 'Hoch - eigenes Zimmer in WG' : 'Higher - own room in shared flat',
                  },
                  {
                    label: locale === 'de' ? 'Nebenkosten' : 'Utilities',
                    left: locale === 'de' ? 'Meist inklusive' : 'Usually included',
                    right: locale === 'de' ? 'In der Regel inklusive' : 'Typically included',
                  },
                  {
                    label: locale === 'de' ? 'Unterstützungsmodell' : 'Support model',
                    left: accommodationType === 'flat' ? (locale === 'de' ? 'CASA Team + Hausregeln' : 'CASA team + house policy') : locale === 'de' ? 'CASA Team + Gastgeberkontakt' : 'CASA team + host contact',
                    right: accommodationType === 'flat' ? (locale === 'de' ? 'CASA Team + Gastgeberkontakt' : 'CASA team + host contact') : locale === 'de' ? 'CASA Team + Hausregeln' : 'CASA team + house policy',
                  },
                  {
                    label: locale === 'de' ? 'Alltagsstruktur' : 'Daily structure',
                    left: accommodationType === 'flat' ? (locale === 'de' ? 'Flexibel und eigenverantwortlich' : 'Flexible and self-directed') : locale === 'de' ? 'Strukturierter Familienrahmen' : 'Structured family framework',
                    right: accommodationType === 'flat' ? (locale === 'de' ? 'Strukturierter Familienrahmen' : 'Structured family framework') : locale === 'de' ? 'Flexibel und eigenverantwortlich' : 'Flexible and self-directed',
                  },
                  {
                    label: locale === 'de' ? 'Geeignet für' : 'Best fit',
                    left: accommodationType === 'flat' ? (locale === 'de' ? 'Selbstständige Lernende' : 'Independent learners') : locale === 'de' ? 'Lernende mit Wunsch nach Immersion' : 'Learners seeking immersion',
                    right: accommodationType === 'flat' ? (locale === 'de' ? 'Lernende mit Wunsch nach Immersion' : 'Learners seeking immersion') : locale === 'de' ? 'Selbstständige Lernende' : 'Independent learners',
                  },
                ]}
              />

              <ProcessSteps
                eyebrow={locale === 'de' ? 'Anfrage' : 'Request CTA'}
                title={locale === 'de' ? 'Unterkunft jetzt anfragen' : 'Request this accommodation now'}
                description={
                  locale === 'de'
                    ? 'Teilen Sie Ihre Präferenz, wir senden passende Optionen und nächste Schritte.'
                    : 'Share your preference and we will send options with next steps.'
                }
                steps={[
                  {
                    step: locale === 'de' ? '1' : '1',
                    title: locale === 'de' ? 'Präferenz senden' : 'Share preference',
                    description: locale === 'de' ? 'Typ und Zeitraum angeben.' : 'Select type and preferred dates.',
                  },
                  {
                    step: locale === 'de' ? '2' : '2',
                    title: locale === 'de' ? 'Matching erhalten' : 'Receive matching',
                    description: locale === 'de' ? 'Optionen, Kosten und Verfügbarkeit prüfen.' : 'Review options, costs, and availability.',
                  },
                  {
                    step: locale === 'de' ? '3' : '3',
                    title: locale === 'de' ? 'Bestätigen' : 'Confirm',
                    description: locale === 'de' ? 'Nach Zahlungsschritten Check-in Infos erhalten.' : 'Receive check-in details after required payment steps.',
                  },
                ]}
              />

              <Link
                href="/accommodation"
                className="inline-flex rounded-lg border border-[color:var(--casa-sand)] px-4 py-2 text-sm font-semibold text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]"
              >
                {locale === 'de' ? 'Zurück zu allen Optionen' : 'Back to all options'}
              </Link>
            </div>

            <div className="min-w-0">
              <DecisionRail
                locale={locale}
                infoTitle={locale === 'de' ? 'Ihre Entscheidung' : 'Your decision'}
                /*
                  Two rows, not the hero's six.

                  The hero rail above already lists type, price from, extra week,
                  placement fee, deposit and availability, and the "What the
                  accommodation costs" table states all four figures in full — so
                  passing `infoItems` here printed the same numbers a THIRD time
                  inside one page. This is the same defect PREMIUM_UI_REVIEW §1.5
                  found on course detail, fixed there by `decisionFactOrder` and
                  never applied here. A sticky rail is what the reader scrolls
                  back to, so it carries only what decides the click.
                */
                infoItems={decisionItems}
                notes={
                  locale === 'de'
                    ? 'So bleiben Preis und Verfügbarkeit beim Lesen sichtbar.'
                    : 'Keeps the price and availability visible while you read.'
                }
              />
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
