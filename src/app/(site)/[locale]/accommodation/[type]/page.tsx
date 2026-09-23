import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';

import { HeroCUtilityRail } from '@/components/heroes';
import { ComparisonModule, DecisionRail, EditorialSplit, ProcessSteps } from '@/components/sections';
import { AccommodationArrivalChecklist } from '@/components/signatures';
import { accommodationHolidayNote, localizeAccommodationCosts } from '@/config/content/accommodation-costs';
import { checkInSummary } from '@/config/content/accommodation-checkin-form';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getAccommodationDetail } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';
import type { AccommodationTypeKey } from '@/lib/content/types';
import { getCasaContact } from '@/config/content/contacts';
import { FeeStrip } from '@/components/sections/fee-strip';

type AccommodationDetailPageProps = {
  params: Promise<{ type: string }>;
};

const validTypes: AccommodationTypeKey[] = ['flat', 'host'];

export async function generateMetadata({ params }: AccommodationDetailPageProps): Promise<Metadata> {
  const locale = await getContentLocale();
  const { type } = await params;

  // An unknown type 404s from here, so no canonical is emitted for it.
  if (!validTypes.includes(type as AccommodationTypeKey)) {
    notFound();
  }

  return createPublicMetadata({
    locale,
    title: type === 'flat'
      ? (locale === 'de' ? 'CASA-WGs' : 'CASA shared flats')
      : (locale === 'de' ? 'Wohnen bei Bremer Gastgebern' : 'Stay with local hosts'),
    description: locale === 'de'
      ? 'Ihr Zimmer während des Intensivkurses: Informationen zu Wohnen, Kosten und Anreise sowie persönliche Unterstützung von CASA.'
      : 'Your room during your intensive course: accommodation details, costs and arrival information, with personal support from CASA.',
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

  /*
   * TWO ROWS. This card had six, and four of them were prices.
   *
   * The full cost breakdown — €580 first four weeks, €145 each extra week, €50
   * placement, €580 refundable deposit — is itemised further down this page from
   * `accommodationCosts`, where each figure carries the qualifier that makes it
   * readable ("refundable", "also the closure weeks"). Repeating all four here
   * as bare amounts put the invoice above the fold and pushed the hero 210px
   * past a 720px viewport.
   *
   * "Type: Shared flats" went too: it restated the h1 directly above it, which
   * became obvious once the headline was shortened to the option's name.
   *
   * What is left is the two things a reader needs before scrolling — roughly
   * what it costs, and whether a room is even available.
   *
   * One currency format, kept from the previous list: these lines once managed
   * three between them, alternating prefix and suffix inside a single card.
   */
  const infoItems = [
    { label: locale === 'de' ? 'Preis ab' : 'Price from', value: locale === 'de' ? '€580 / 4 Wochen' : '€580 / 4 weeks' },
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
        /*
          One line, not three.

          This said: "Availability is confirmed after your request. The closure
          weeks carry the same €145 weekly rate; cancellations are planned
          around a 4-week period." Three lines of small print at the top of the
          page — and measured on the rendered page, the closure weeks appear
          four more times, the €145 six more and the cancellation window twice
          more, all in the costs and arrival sections where they have room to be
          explained. The one thing a reader needs before scrolling is that the
          room is not confirmed yet.
        */
        notes={
          locale === 'de'
            ? 'Verfügbarkeit wird nach Ihrer Anfrage bestätigt.'
            : 'Availability is confirmed after your request.'
        }
        ctas={pageConfig.ctas}
        photo={{
          ...detailHeroPhoto,
          caption:
            accommodationType === 'flat'
              ? 'Shared flat kitchen / common area - Independent living with other students.'
              : (locale === 'de' ? 'Wohnen in einem privaten Bremer Haushalt.' : 'Accommodation in a private Bremen household.'),
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
                    ? 'Eine Checkliste zum Ausdrucken für Ihre Anreise und die erste Woche.'
                    : 'Printable checklist for arrival, orientation, and your first week.'
                }
                neighborhoodTitle={locale === 'de' ? 'Im Stadtteil' : 'In the neighbourhood'}
                checklistTitle={locale === 'de' ? 'Vor der Ankunft' : 'Before you arrive'}
                printLabel={locale === 'de' ? 'Checkliste drucken' : 'Print checklist'}
                neighborhoodNotes={[
                  locale === 'de' ? 'ÖPNV-Anbindung und Wege zur Schule prüfen' : 'Check public transport access to school',
                  locale === 'de' ? 'Supermärkte und Apotheken in der Nähe finden' : 'Locate nearby groceries and pharmacies',
                  locale === 'de' ? 'Ruhige Orte zum Lernen in der Umgebung finden' : 'Identify quiet places for study',
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
                      : (locale === 'de' ? 'Wohnen in einem privaten Bremer Haushalt.' : 'Accommodation in a private Bremen household.'),
                }}
              />

              <section>
                <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">
                  {locale === 'de' ? 'Ihre Unterkunftskosten im Überblick' : 'Your accommodation costs at a glance'}
                </h2>
                <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                  {locale === 'de'
                    ? 'Ob CASA-WG oder privater Haushalt: Für beide Wohnmöglichkeiten gelten dieselben Preise.'
                    : 'The same rates apply to a CASA shared flat and a room with local hosts.'}
                </p>
                <FeeStrip figures={localizeAccommodationCosts(locale)} className="mt-6" />
                <p className="mt-4 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
                  {accommodationHolidayNote(locale)}
                </p>
              </section>

              {/*
                What stands behind the deposit rule.

                The costs table above says the €580 deposit comes back "when the
                room and the keys come back as they were handed over", which until
                now was an assertion with no mechanism shown. There is a
                mechanism: CASA's check-in/check-out form, which the host and the
                student complete together at arrival and again at departure. This
                lists what it records — never the form's own fields, because its
                house rules, liability terms and signatures are between those two
                parties. See docs/ACCOMMODATION_CHECK_IN_OUT_FORM.md.
              */}
              <section>
                <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">
                  {locale === 'de' ? 'Übergabe wird gemeinsam dokumentiert' : 'The handover is documented together'}
                </h2>
                <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                  {locale === 'de'
                    ? 'Bei der Ankunft und bei der Abreise halten Gastgeber und Teilnehmende den Zustand des Zimmers gemeinsam fest. Das Übergabeformular hilft beiden Seiten, Fragen zu Zustand und Kaution nachvollziehbar zu klären.'
                    : 'At arrival and departure, the host and student record the condition of the room together. The handover form gives both sides a shared record when discussing the room and deposit.'}
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {checkInSummary(locale).map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 border-t border-[color:var(--casa-sand)] pt-3 text-sm leading-relaxed text-[var(--casa-ink)]"
                    >
                      <span
                        aria-hidden
                        className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <ComparisonModule
                eyebrow={locale === 'de' ? 'Wohnen bei CASA' : 'Living with CASA'}
                title={locale === 'de' ? 'WG oder privater Haushalt?' : 'Shared flat or local household?'}
                description={locale === 'de'
                  ? 'Das bieten die beiden Wohnmöglichkeiten für Ihren Intensivkurs.'
                  : 'What each accommodation option offers during your intensive course.'}
                rowHeading={locale === 'de' ? 'Auf einen Blick' : 'At a glance'}
                leftTitle={locale === 'de' ? 'CASA-WG' : 'CASA shared flat'}
                rightTitle={locale === 'de' ? 'Privater Haushalt' : 'Local household'}
                rows={[
                  {
                    label: locale === 'de' ? 'Zusammenleben' : 'Who you live with',
                    left: locale === 'de' ? 'Mit anderen internationalen Kursteilnehmenden' : 'Other international course participants',
                    right: locale === 'de' ? 'Bei Privatpersonen in Bremen' : 'Local hosts in Bremen',
                  },
                  {
                    label: locale === 'de' ? 'Ihr Zimmer' : 'Your room',
                    left: locale === 'de' ? 'Eigenes möbliertes Zimmer' : 'Your own furnished room',
                    right: locale === 'de' ? 'Eigenes möbliertes Zimmer' : 'Your own furnished room',
                  },
                  {
                    label: locale === 'de' ? 'Küche und Bad' : 'Kitchen and bathroom',
                    left: locale === 'de' ? 'Gemeinsame Nutzung in der WG' : 'Shared with your flatmates',
                    right: locale === 'de' ? 'In der Regel gemeinsam mit den Gastgebern genutzt' : 'Usually shared with your hosts',
                  },
                  {
                    label: locale === 'de' ? 'Verpflegung' : 'Meals',
                    left: locale === 'de' ? 'Selbstverpflegung' : 'Self-catering',
                    right: locale === 'de' ? 'Selbstverpflegung' : 'Self-catering',
                  },
                  {
                    label: locale === 'de' ? 'Für wen?' : 'Who can book?',
                    left: locale === 'de' ? 'Volljährige Teilnehmende unserer Intensivkurse' : 'Intensive-course participants aged 18 or over',
                    right: locale === 'de' ? 'Teilnehmende unserer Intensivkurse' : 'Participants on our intensive courses',
                  },
                ]}
              />

              <ProcessSteps
                eyebrow={locale === 'de' ? 'Anfrage' : 'Enquire'}
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
                    description: locale === 'de' ? 'Nach der Buchung Anreise und Schlüsselübergabe abstimmen.' : 'Arrange your arrival and key collection after booking.',
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

            {/*
              DecisionRail is a DIRECT grid child, as on course detail.

              It was wrapped in a plain `min-w-0` div, and `position: sticky`
              resolves against its nearest block container — a div that is only as
              tall as the rail itself, so there was no range to stick within and
              the rail simply scrolled away. The course page mounts it unwrapped,
              where `lg:self-start` inside an `items-start` grid gives it the full
              column height to stick in.
            */}
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
                /*
                  No `notes`. It read "Keeps the price and availability visible
                  while you read" — copy that explains the component to the
                  visitor instead of telling them anything, which is the same
                  class of leak as the "Signature" eyebrow and the "info rail"
                  heading. The card now ends on a named person, which is the
                  useful thing to end on.
                */
              /*
                Natàlia Sostres, per CASA's 2026-09-08 allocation — this row used
                to name Mareike Thomeczek, written inline here rather than in a
                shared list. The name and its spelling now come off the verified
                roster via config/content/contacts.ts, so accommodation, courses
                and exams all read one source.
              */
              contact={getCasaContact('accommodation', locale)}
            />
          </div>
        </Container>
      </section>
    </main>
  );
}
