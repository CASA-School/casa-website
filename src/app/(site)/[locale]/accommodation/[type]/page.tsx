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
import { say } from '@/lib/cms/copy';

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
      ? (locale === 'de' ? 'CASA-WG: Zimmer für Lernende in Bremen' : 'CASA shared flats for learners in Bremen')
      : (locale === 'de' ? 'Wohnen bei Bremer Gastgebern' : 'Living with hosts in Bremen'),
    // One description per type: the two pages shared one, and a search result could not tell them apart.
    description: type === 'flat'
      ? (locale === 'de'
        ? 'Ein eigenes Zimmer in einer CASA-WG mit anderen Lernenden, während deines Intensivkurses in Bremen: Ausstattung, Kosten und Anreise.'
        : 'A room of your own in a CASA shared flat with other learners during your intensive course in Bremen: what it has, what it costs and how to get there.')
      : (locale === 'de'
        ? 'Wohnen bei einer Gastfamilie in Bremen während deines Intensivkurses: jeden Tag Deutsch sprechen, mit Kosten, Ablauf und Anreise.'
        : 'Live with a host family in Bremen during your intensive course and speak German every day: what it costs, how it works and how to get there.'),
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
      ? say(locale, 'WGs', 'Shared flats')
      : say(locale, 'Gastfamilien', 'Host families');

  /*
    The sticky rail's own two rows. Deliberately price + availability: what a
    reader needs at the moment they decide, not the full fee schedule they have
    already scrolled past twice.
  */
  const decisionItems = [
    { label: say(locale, 'Preis ab', 'Price from'), value: say(locale, '580 € / 4 Wochen', '€580 / 4 weeks') },
    { label: say(locale, 'Verfügbarkeit', 'Availability'), value: say(locale, 'Auf Anfrage', 'On request') },
  ];

  const breadcrumbs = [
    { label: say(locale, 'Start', 'Home'), href: '/' },
    { label: say(locale, 'Unterkunft', 'Accommodation'), href: '/accommodation' },
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
    { label: say(locale, 'Preis ab', 'Price from'), value: say(locale, '580 € / 4 Wochen', '€580 / 4 weeks') },
    { label: say(locale, 'Verfügbarkeit', 'Availability'), value: say(locale, 'Auf Anfrage', 'On request') },
  ];

  // Each type has its own photographs (2026-10-02): a 4:3 crop for phones, a
  // 2.4:1 crop for the hero band from lg up, and a different second photo.
  // A CASA-WG photo never stands in for a host family's (CLAUDE.md hard rule 5).
  const photoKey = accommodationType === 'flat' ? 'flat' : 'host';
  const detailHeroPhoto = pageConfig.photos[photoKey];
  const detailHeroPhotoWide = pageConfig.photos[`${photoKey}Hero`];
  const detailStoryPhoto = pageConfig.photos[`${photoKey}Story`];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <HeroCUtilityRail
        eyebrow={say(locale, 'Unterkunft', 'Accommodation')}
        title={detail.headline}
        description={detail.summary}
        breadcrumbs={breadcrumbs}
        infoTitle={say(locale, 'Unterkunftsinfos', 'Accommodation details')}
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
          say(locale, 'Ob ein Zimmer frei ist, bestätigen wir dir nach deiner Anfrage.', 'We confirm whether a room is free once you have sent your request.')
        }
        ctas={pageConfig.ctas}
        photo={detailHeroPhoto}
        photoWide={detailHeroPhotoWide}
        themeClassName="hero-theme-accommodation"
      />

      <section className="py-16 md:py-20">
        <Container className="space-y-12 md:space-y-14">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div className="min-w-0 space-y-12 md:space-y-14">
              <AccommodationArrivalChecklist
                title={say(locale, 'Ankunfts- und Stadtteil-Checkliste', 'Arrival and neighbourhood checklist')}
                description={
                  say(locale, 'Eine Checkliste zum Ausdrucken für deine Anreise und deine erste Woche.', 'A checklist to print out for your arrival and your first week.')
                }
                neighborhoodTitle={say(locale, 'Im Stadtteil', 'In the neighbourhood')}
                checklistTitle={say(locale, 'Vor der Ankunft', 'Before you arrive')}
                printLabel={say(locale, 'Checkliste drucken', 'Print checklist')}
                neighborhoodNotes={[
                  say(locale, 'Bus- und Bahnverbindungen zur Schule heraussuchen', 'Look up bus and tram connections to the school'),
                  say(locale, 'Supermärkte und Apotheken in der Nähe finden', 'Find supermarkets and pharmacies nearby'),
                  say(locale, 'Ruhige Orte zum Lernen in der Umgebung finden', 'Find quiet places to study in the area'),
                ]}
                arrivalChecklist={[
                  say(locale, 'Ankunftszeit bestätigen', 'Confirm your arrival time'),
                  say(locale, 'Hausregeln lesen und akzeptieren', 'Read and accept the house rules'),
                  say(locale, 'Notfallkontakt abspeichern', 'Save the emergency contact'),
                  say(locale, 'Kaution, Vermittlungsgebühr und Kündigungsfrist prüfen', 'Check the deposit, booking fee and notice period'),
                  say(locale, 'Den Weg zur Schule vorher einmal ausprobieren', 'Try out your route to school before your first day'),
                ]}
              />

              <EditorialSplit
                eyebrow={say(locale, 'So wohnst du', 'How you will live')}
                title={optionTitle}
                description={detail.summary}
                bullets={detail.highlights}
                photo={detailStoryPhoto}
              />

              <section>
                <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">
                  {say(locale, 'Was die Unterkunft kostet', 'What accommodation costs')}
                </h2>
                <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                  {say(locale, 'In der CASA-WG und bei einer Gastfamilie zahlst du dieselben Preise.', 'You pay the same in a CASA shared flat as with a host family.')}
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
                  {say(locale, 'Die Übergabe wird gemeinsam festgehalten', 'The handover is recorded together')}
                </h2>
                <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                  {say(locale, 'Wenn du ankommst und wenn du abreist, schaust du dir das Zimmer zusammen mit der Person an, die dafür zuständig ist. Was ihr seht, haltet ihr gemeinsam auf einem Formular fest. So lassen sich Fragen zum Zimmer und zur Kaution später für beide Seiten gut klären.', 'When you arrive and again when you leave, you look round the room together with the person responsible for it. You both note down what you see on a form. That makes it easy for both sides to sort out any questions about the room or the deposit later.')}
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
                eyebrow={say(locale, 'Wohnen bei CASA', 'Living with CASA')}
                title={say(locale, 'WG oder privater Haushalt?', 'Shared flat or private household?')}
                description={say(locale, 'Das bieten dir die beiden Wohnmöglichkeiten während deines Intensivkurses.', 'What the two options offer you during your intensive course.')}
                rowHeading={say(locale, 'Auf einen Blick', 'At a glance')}
                leftTitle={say(locale, 'CASA-WG', 'CASA shared flat')}
                rightTitle={say(locale, 'Privater Haushalt', 'Private household')}
                rows={[
                  {
                    label: say(locale, 'Zusammenleben', 'Who you live with'),
                    left: say(locale, 'Mit anderen internationalen Kursteilnehmenden', 'Other international course participants'),
                    right: say(locale, 'Bei Privatpersonen in Bremen', 'Private hosts in Bremen'),
                  },
                  {
                    label: say(locale, 'Dein Zimmer', 'Your room'),
                    left: say(locale, 'Eigenes möbliertes Zimmer', 'Your own furnished room'),
                    right: say(locale, 'Eigenes möbliertes Zimmer', 'Your own furnished room'),
                  },
                  {
                    label: say(locale, 'Küche und Bad', 'Kitchen and bathroom'),
                    left: say(locale, 'Gemeinsame Nutzung in der WG', 'Shared with your flatmates'),
                    right: say(locale, 'In der Regel gemeinsam mit den Gastgebern genutzt', 'Usually shared with your hosts'),
                  },
                  {
                    label: say(locale, 'Verpflegung', 'Meals'),
                    left: say(locale, 'Selbstverpflegung', 'Self-catering'),
                    right: say(locale, 'Selbstverpflegung', 'Self-catering'),
                  },
                  {
                    label: say(locale, 'Für wen?', 'Who can book?'),
                    left: say(locale, 'Volljährige Teilnehmende unserer Intensivkurse', 'Participants aged 18 or over on our intensive courses'),
                    right: say(locale, 'Teilnehmende unserer Intensivkurse', 'Participants on our intensive courses'),
                  },
                ]}
              />

              <ProcessSteps
                eyebrow={say(locale, 'Anfrage', 'Enquire')}
                title={say(locale, 'Unterkunft anfragen', 'Request accommodation')}
                description={
                  say(locale, 'Sag uns, was du dir wünschst. Wir schicken dir passende Möglichkeiten und sagen dir, wie es weitergeht.', 'Tell us what you would like. We will send you suitable options and let you know what happens next.')
                }
                steps={[
                  {
                    step: locale === 'de' ? '1' : '1',
                    title: say(locale, 'Wunsch nennen', 'Tell us your preference'),
                    description: say(locale, 'Sag uns, wie du wohnen möchtest und für welchen Zeitraum.', 'Let us know how you would like to live and for which dates.'),
                  },
                  {
                    step: locale === 'de' ? '2' : '2',
                    title: say(locale, 'Vorschläge prüfen', 'Look through our suggestions'),
                    description: say(locale, 'Du bekommst passende Möglichkeiten mit den Kosten und siehst, was frei ist.', 'You receive suitable options with their costs and can see what is available.'),
                  },
                  {
                    step: locale === 'de' ? '3' : '3',
                    title: say(locale, 'Zusagen', 'Confirm'),
                    description: say(locale, 'Nach der Buchung besprechen wir mit dir deine Anreise und die Schlüsselübergabe.', 'Once you have booked, we talk through your arrival and how you collect your keys.'),
                  },
                ]}
              />

              <Link
                href="/accommodation"
                className="inline-flex rounded-lg border border-[color:var(--casa-sand)] px-4 py-2 text-sm font-semibold text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]"
              >
                {say(locale, 'Zurück zu allen Optionen', 'Back to all options')}
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
                infoTitle={say(locale, 'Deine Entscheidung', 'Your decision')}
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
