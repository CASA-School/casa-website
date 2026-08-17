import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HeroCUtilityRail } from '@/components/heroes';
import { ComparisonModule, DecisionRail, EditorialSplit, ProcessSteps } from '@/components/sections';
import { AccommodationArrivalChecklist } from '@/components/signatures';
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

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Unterkunft' : 'Accommodation', href: '/accommodation' },
    { label: optionTitle },
  ];

  const infoItems = [
    { label: locale === 'de' ? 'Typ' : 'Type', value: optionTitle },
    { label: locale === 'de' ? 'Preis ab' : 'Price from', value: locale === 'de' ? '580 EUR / 4 Wochen' : '580 EUR / 4 weeks' },
    { label: locale === 'de' ? 'Weitere Woche' : 'Extra week', value: locale === 'de' ? '145 EUR' : 'EUR 145' },
    { label: locale === 'de' ? 'Vermittlung' : 'Placement fee', value: locale === 'de' ? '50 EUR' : 'EUR 50' },
    { label: locale === 'de' ? 'Kaution' : 'Deposit', value: locale === 'de' ? '580 EUR' : 'EUR 580' },
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
        infoTitle={locale === 'de' ? 'Unterkunftsinfos' : 'Accommodation info rail'}
        infoItems={infoItems}
        notes={
          locale === 'de'
            ? 'Verfügbarkeit wird nach Anfrage bestätigt. Ferienzeiten können 145 EUR pro Woche extra kosten; Storno wird mit 4 Wochen Vorlauf geplant.'
            : 'Availability is confirmed after your request. Holiday periods may add EUR 145 per week; cancellations are planned around a 4-week period.'
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

              <ComparisonModule
                eyebrow={locale === 'de' ? 'Vergleich' : 'Comparison bullets'}
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
                infoTitle={locale === 'de' ? 'Ihre Entscheidung' : 'Your decision rail'}
                infoItems={infoItems}
                notes={
                  locale === 'de'
                    ? 'So bleiben Preis, Verfügbarkeit und Anfrage-CTA beim Lesen sichtbar.'
                    : 'Keep pricing, availability, and request CTA visible while reading details.'
                }
              />
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
