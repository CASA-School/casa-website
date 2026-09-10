import type { Metadata } from 'next';

import { HeroAPhotoLed } from '@/components/heroes';
import { HumanStoryBlock, ProcessSteps } from '@/components/sections';
import { BandHeading } from '@/components/sections/band-heading';
import { CourseFormatRows } from '@/components/sections/course-format-rows';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getAccommodationNarratives, getSocialProofById } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: 'Accommodation',
    description: 'Choose between shared flats and host families with clear trust standards and support from CASA.',
    path: '/accommodation',
    keywords: ['Accommodation Bremen', 'Host families', 'Shared flats'],
  });
}

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
        THE SITE'S STANDARD HERO — the same component /, /about, /exams and
        /courses/german-for-groups render, with the same six props.

        WHAT THIS PAGE GAVE UP TO GET THAT, both deliberately:

        - The cost rail. Four figures used to sit under the actions. They are
          still on the page, itemised in the playbook, and the hero's job here
          is the choice rather than the invoice.
        - The second control. `pageConfig.ctas` carries "Reserve course +
          housing" as well, and passing the whole array rendered it as a text
          link beside the button. `.slice(0, 1)` is the hero's stated rule: one
          eyebrow, one headline, one sentence, one button.

        Breadcrumbs stay INSIDE the hero. They used to render 400px lower,
        inside the options section, so this page put them somewhere no other
        accommodation page did.

        `thumbC` (the shared kitchen), not `thumbA`. thumbA is the student room
        the "Shared flats" option card renders 400px below, so the hero was
        showing one of the two answers while asking the reader to choose between
        them. A kitchen table is the shared ground of both options.
      */}
      <HeroAPhotoLed
        breadcrumbs={breadcrumbs}
        eyebrow={locale === 'de' ? 'Unterkunft' : 'Accommodation'}
        title={locale === 'de' ? 'Wohnen in Bremen mit Klarheit und Vertrauen' : 'Live in Bremen with clarity and trust'}
        description={
          locale === 'de'
            ? 'Shared flats oder Host families: beide Wege werden durch CASA begleitet und transparent erklärt.'
            : 'Shared flats or host families: both pathways are supported by CASA with transparent expectations.'
        }
        photo={pageConfig.photos.thumbC}
        ctas={pageConfig.ctas.slice(0, 1)}
      />

      {/*
        Section 1: the two options, as the site's format rows.

        THIS WAS `GuidedPicker` — two cards with a photo band on top, a title, one
        sentence and a "Best for" chip. Two problems with it here.

        It said less than the page already knows. Each option has four published
        highlights in config/content/accommodation-narratives.ts — a private room
        with furnished essentials, German spoken at home every day — and the card
        showed none of them, so the reader had to open a detail page to learn
        anything beyond the one-line summary.

        And it was a fourth composition for "here are your options" on a site that
        already has one. `CourseFormatRows` presents the six course formats on the
        homepage and on /courses, and the host-family rows on
        /accommodation/become-host. The two accommodation options are the same
        kind of choice, so they are the same rows: copy and CTA one side,
        photograph the other, alternating.

        `id` on each row rather than the two empty `<div id="flat">` anchors that
        used to sit above this section — /accommodation#flat now lands on the row
        it names instead of on a zero-height div near the hero. `scroll-mt` comes
        with the component.

        `meta` is the same figure on both, deliberately: the two options cost the
        same, and accommodation-costs.ts exists because these pages used to imply
        otherwise. Stating it twice is the point.
      */}
      {/*
        THE SAME BAND /courses AND THE HOMEPAGE USE — ground, heading and rows.

        This was a white section with a left-aligned heading and a tricolour
        rule, so the one place on the site presenting a set of options in these
        rows looked unlike the other two. `bg-[var(--casa-ink-deep)] py-20
        text-white md:py-32` is the band those pages set, `BandHeading` is the
        centred heading all three now share, and the rows take the matching
        `tone="dark"`.
      */}
      <section className="bg-[var(--casa-ink-deep)] py-20 text-white md:py-32">
        <Container>
          <div className="px-6 md:px-9">
            <BandHeading
              eyebrow={locale === 'de' ? 'Wohnoptionen' : 'Accommodation options'}
              title={locale === 'de' ? 'Zwei Hauptoptionen für Ihren Aufenthalt' : 'Two primary options for your stay'}
              description={
                locale === 'de'
                  ? 'Beide kosten dasselbe. Die Wahl ist eine Frage des Alltags, nicht des Preises.'
                  : 'Both cost the same. Choosing between them is a question of daily life, not of price.'
              }
            />

            <CourseFormatRows
              className="mt-12 md:mt-16"
              tone="dark"
              /* Four, not the default three: each option publishes exactly four
                 highlights and dropping one would be losing content to a layout
                 default. Same reason become-host raises it. */
              maxOutcomes={4}
              rows={[
                {
                  id: 'flat',
                  title: flat?.headline || (locale === 'de' ? 'CASA WGs' : 'Shared flats'),
                  description: flat?.summary || '',
                  bestFor: locale === 'de' ? 'Gut für: eigenständiger Alltag' : 'Best for: independent routines',
                  outcomes: flat?.highlights || [],
                  /* No `meta`. It carried accommodationPriceSummary(locale) as a
                     kicker above the title — "€580 FOR 4 WEEKS, THEN €145 A WEEK"
                     — on both rows, which is the same figure twice on an index
                     whose two destinations each publish the full cost list in
                     the shared FeeStrip. The heading already states the one thing
                     an index needs to say about price: the two cost the same. */
                  href: '/accommodation/flat',
                  ctaLabel: locale === 'de' ? 'WGs ansehen' : 'See shared flats',
                  media: { src: pageConfig.photos.thumbA.src, alt: pageConfig.photos.thumbA.alt },
                },
                {
                  id: 'host',
                  title: host?.headline || (locale === 'de' ? 'Gastfamilien' : 'Host families'),
                  description: host?.summary || '',
                  bestFor: locale === 'de' ? 'Gut für: tägliche Sprachpraxis' : 'Best for: daily language immersion',
                  outcomes: host?.highlights || [],
                  href: '/accommodation/host',
                  ctaLabel: locale === 'de' ? 'Gastfamilien ansehen' : 'See host families',
                  media: { src: pageConfig.photos.thumbB.src, alt: pageConfig.photos.thumbB.alt },
                },
              ]}
            />
          </div>
        </Container>
      </section>

      {/*
        NO COMPARISON TABLE HERE, AND THE TABLE ITSELF IS WHY.

        A "Shared Flats vs Host Families" module used to sit on an ink-deep band
        between the story and the steps. Two of its seven rows compared nothing:
        `Cost` rendered `accommodationPriceSummary(locale)` on BOTH sides — the
        identical string, because the two options are identically priced — and
        `Utilities` read "Typically included" against "Typically included". A row
        whose two columns are the same value is a row that answers no question.

        The rest restated the option rows above it. "Daily routine: Independent |
        Family integrated" is the highlight "You keep your own routine — no
        household mealtimes to plan around" beside "Meals and daily rhythm shared
        with the family"; "Language exposure: Peer-based | Daily conversation" is
        "German spoken at home every day, not only in class". Those highlights now
        render in full on the rows, so the table was saying the same things again
        in shorter words.

        The comparison composition is not gone from the site — /accommodation/flat,
        /accommodation/host and /accommodation/become-host each still carry one,
        where the reader has chosen an option and is comparing within it.
      */}

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
          {/*
            THE SAME PROCESS PANEL THE OTHER SIX PAGES RENDER.

            This mounted `tone="plain" layout="rail"` and was the only call site
            on the site using either. Both overrides were answers to a page that
            no longer exists:

            `layout="rail"` put the heading in a left rail to break the monotony
            of "nine bands, nine times heading-on-top". The page has five bands
            now, so there is no monotony to break — and the rail cost more than
            it bought: the heading column ran short while the steps column ran
            tall, so the band opened with a large empty area under the
            description, and the three steps were squeezed into ~215px each,
            wrapping "Receive matching / options" across two lines while its
            neighbours took one.

            `tone="plain"` dropped the warm fill because /accommodation had FOUR
            warm panels in nine sections and read as a tunnel. It now has one, and
            restoring this makes two in five — the same ratio /exams carries.
          */}
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

      {/*
        NO SEAM HERE ANY MORE, and it went with the section it was separating.

        A `BandSeam` sat at this point because the "Practical guide to living in
        Germany" accordion below it was on the canvas and so was the process band
        above — two identical grounds with no boundary, which is the one case
        BandSeam's own comment says a seam is earned. With the accordion removed
        the next band is white, so the ground itself marks the boundary and a
        seam would be the decoration that component exists to avoid.
      */}

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
