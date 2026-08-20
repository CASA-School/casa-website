import type { Metadata } from 'next';
import { CasaImage as Image } from '@/components/ui/casa-image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { CardRail } from '@/components/ui/card-rail';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';

const baseMetadata = createPublicMetadata({
  title: 'Layout Patterns',
  description: 'Internal CASA design review page for full-bleed and asymmetric section patterns.',
  path: '/design-system/layout-patterns',
});

export const metadata: Metadata = {
  ...baseMetadata,
  robots: { index: false, follow: false },
};

/**
 * Section-level layout patterns — the layer above card styling.
 *
 * The site reads as a "tunnel" because every band is the same width, centred,
 * with equal gutters. Narrowing some of them does not fix that; it just makes a
 * narrower tunnel. What breaks it on the reference sites is ASYMMETRIC BLEED:
 * content stays locked to the container grid on ONE side and runs off the
 * viewport on the other, so the page has a left edge you can read down while
 * the right edge keeps opening up.
 *
 * The mechanism is one line, and it is worth understanding rather than copying:
 *
 *     margin-right: calc(50% - 50vw)
 *
 * Inside a centred container of content width W in a viewport V, `50%` is W/2
 * and `50vw` is V/2, so the negative margin is exactly (V − W)/2 — the distance
 * from the container's right edge to the viewport's. The element's left edge
 * never moves. Mirror it for a left bleed.
 *
 * `overflow-x: clip` on the section is required, not optional: `vw` includes the
 * scrollbar, so without it the bleed overflows the page by the scrollbar width
 * and produces a horizontal scrollbar on the document.
 *
 * `clip` rather than `hidden` deliberately — `hidden` creates a scroll
 * container, which would break `position: sticky` on anything inside and would
 * capture the rail's own horizontal scroll.
 */

const BLEED_RIGHT = 'mr-[calc(50%-50vw)]';
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2';

function PatternHeading({
  index,
  title,
  reference,
  mechanism,
}: {
  index: string;
  title: string;
  reference: string;
  mechanism: string;
}) {
  return (
    <Container>
      <div className="border-t border-[color:var(--casa-sand)] pt-8">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          Pattern {index}
        </p>
        <h2 className="mt-3 text-2xl font-bold text-[var(--casa-ink)]">{title}</h2>
        <p className="mt-2 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
          Reference: {reference}
        </p>
        <p className="mt-1 max-w-measure text-sm leading-relaxed text-[var(--casa-ink)]">
          {mechanism}
        </p>
      </div>
    </Container>
  );
}

export default async function LayoutPatternsPage() {
  const locale = await getContentLocale();
  const pageConfig = getPublicPageConfig('home', locale);

  const courses = [
    { title: 'Intensive German', text: 'High-structure weekly rhythm with daily speaking momentum.', photo: pageConfig.photos.courseA },
    { title: 'Evening Course', text: 'Steady progress after work hours without losing structure.', photo: pageConfig.photos.courseB },
    { title: 'Special Courses', text: 'Short focused modules for grammar, writing, or conversation.', photo: pageConfig.photos.courseC },
    { title: 'German for Groups', text: 'Closed groups with a shared goal and a shared schedule.', photo: pageConfig.photos.courseD },
    { title: 'Medical German', text: 'Clinical vocabulary for healthcare professionals.', photo: pageConfig.photos.courseE },
    { title: 'In-company courses', text: 'Training delivered at your own workplace.', photo: pageConfig.photos.courseF },
  ];

  /*
   * The three formats that carry the homepage. Copy is qualitative on purpose:
   * CLAUDE.md forbids publishing any price or weekly-hours figure that is not in
   * docs/COURSE_FACTS_SOURCE_OF_TRUTH.md, so nothing here states a number.
   */
  const flagshipFormats = [
    {
      eyebrow: 'Most chosen',
      title: 'Intensive German',
      body: 'A high-structure weekly rhythm with daily speaking. The fastest route through the levels if you can give it your mornings.',
      href: '/courses/intensive-german',
      photo: pageConfig.photos.courseA,
    },
    {
      eyebrow: 'Around a working week',
      title: 'Evening Course',
      body: 'Steady progress after work without losing structure. The same teachers and the same method, at a pace that fits a job.',
      href: '/courses/evening-german',
      photo: pageConfig.photos.courseB,
    },
    {
      eyebrow: 'Short and focused',
      title: 'Special Courses',
      body: 'Short modules that fix one thing - grammar, writing, or speaking confidence - without committing to a full level.',
      href: '/courses/special-courses',
      photo: pageConfig.photos.courseC,
    },
    {
      eyebrow: 'Learning together',
      title: 'German for Groups',
      body: 'Closed groups with one shared goal and one shared schedule, planned around the group rather than around the calendar.',
      href: '/courses/german-for-groups',
      photo: pageConfig.photos.courseD,
    },
  ];

  /*
   * Copy length here is a LAYOUT constraint, not a style preference.
   *
   * These render side by side on one baseline, so a description that wraps to a
   * different number of lines than its neighbours is immediately visible as a
   * ragged row. Keep each `text` to roughly 40-50 characters — one line at the
   * two-column width, two at the narrowest. The markup below survives a breach
   * (equal-height cells, two-line clamp), but it will look better if you do not
   * breach it.
   */
  const secondaryFormats = [
    { title: 'Medical German', text: 'Clinical vocabulary for healthcare work.', href: '/courses/medical-german' },
    { title: 'In-company courses', text: 'Training delivered at your workplace.', href: '/courses/in-company' },
  ];

  const pillars = [
    {
      title: 'Get solid foundations from teachers who stay with you',
      body: 'Small groups, a fixed teacher, and a weekly rhythm you can plan a life around. Progress is checked, not assumed.',
      cta: 'Explore course formats',
      href: '/courses',
      photo: pageConfig.photos.courseA,
    },
    {
      title: 'Prepare for telc with people who mark the real exam',
      body: 'CASA is an official telc exam centre. Preparation, registration and the exam itself happen in the same building, with the same people.',
      cta: 'See exam preparation',
      href: '/exams',
      photo: pageConfig.photos.courseB,
    },
    {
      title: 'Arrive in Bremen with somewhere to go',
      body: 'Shared flats and host families, arranged around your course start rather than left to chance.',
      cta: 'Explore accommodation',
      href: '/accommodation',
      photo: pageConfig.photos.courseE,
    },
  ];

  /*
   * PLACEHOLDER, and deliberately not dressed up as real.
   *
   * CLAUDE.md hard rule 1 restricts public metrics to a reviewed list, and
   * hard rule 2 forbids named testimonials without a verified quote-to-person
   * relationship. This block exists to show the COMPOSITION only — the numbers
   * are invented and the names are initials. Do not lift this data.
   */
  const sampleReviews = [
    { score: 5, quote: 'Der Kurs hatte einen klaren Rhythmus und die Lehrerin wusste immer, wo ich stand.', who: 'Sample review', when: 'Placeholder date' },
    { score: 5, quote: 'Preparation for telc B2 was structured and the mock exams were the closest thing to the real one.', who: 'Sample review', when: 'Placeholder date' },
    { score: 4, quote: 'Die Unterkunft war schon organisiert, bevor ich in Bremen ankam. Das hat viel Stress genommen.', who: 'Sample review', when: 'Placeholder date' },
    { score: 5, quote: 'Small group, so there was nowhere to hide — which is exactly why I actually started speaking.', who: 'Sample review', when: 'Placeholder date' },
    { score: 4, quote: 'Gute Mischung aus Grammatik und Sprechen, und der Kurs hat wirklich zu meinem Ziel gepasst.', who: 'Sample review', when: 'Placeholder date' },
  ];

  /*
   * REAL figures, not placeholders — the only block on this page that uses them.
   *
   * CLAUDE.md hard rule 1 fixes the approved public-safe aggregate list
   * (2026-06-17 sync): 30,000+ learners supported, 150+ countries represented,
   * 7-80+ age range represented, 45,000+ course bookings. Anything outside that
   * list does not go on a public surface. In particular the `40+ staff and
   * teachers` claim is DRAFT and must not ship unverified, so it is not here.
   *
   * Three, not four, because the composition is a centred row and an odd count
   * gives it a middle to sit on. The age-range figure is the weakest of the four
   * as a headline number, so it is the one left out.
   */
  const headlineStats = [
    { value: '30,000+', label: 'learners supported since 1983' },
    { value: '150+', label: 'countries represented in our classrooms' },
    { value: '45,000+', label: 'course bookings taken' },
  ];

  const distribution = [
    { stars: 5, count: 476 },
    { stars: 4, count: 324 },
    { stars: 3, count: 72 },
    { stars: 2, count: 35 },
    { stars: 1, count: 13 },
  ];
  const distributionMax = Math.max(...distribution.map((d) => d.count));

  return (
    <main className="min-h-screen bg-[var(--casa-canvas)] pb-24 pt-12 md:pt-16">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          Internal · design review
        </p>
        <h1 className="mt-3 text-4xl font-bold text-[var(--casa-ink)]">Layout patterns</h1>
        <p className="mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
          Section-level composition, not card styling. Every pattern here breaks the equal-gutter
          centred band that makes the site read as one long tunnel. Nothing on this page ships —
          it exists to choose from.
        </p>
      </Container>

      <div className="mt-14 space-y-16 md:space-y-20">
        {/* ------------------------------------------------------------------ */}
        <PatternHeading
          index="1"
          title="Hero with dissolved right bleed"
          reference="Your note — “attached to the background, blurred on one side, full-width right”"
          mechanism="The photograph occupies the right half and runs to the viewport edge, but its left edge is dissolved with a mask rather than cut with a border-radius. Nothing separates image from page: the type sits on the same field the photo fades into, which is what makes it read as attached rather than placed."
        />

        <section className="relative overflow-x-clip bg-[var(--casa-warm-soft)]/35">
          <div className="relative grid items-center gap-10 py-16 md:min-h-[34rem] md:grid-cols-2 md:gap-0 md:py-0">
            <Container className="md:!mr-0 md:max-w-[calc(var(--casa-container-max)/2)]">
              <div className="max-w-[34rem] md:py-20">
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                  Official telc exam centre · Bremen
                </p>
                <h3 className="mt-4 text-4xl font-bold leading-tight text-[var(--casa-ink)] md:text-5xl">
                  Learn German in Bremen, with a route from first class to certificate
                </h3>
                <p className="mt-6 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                  Tell us where you are starting. CASA matches the course, adds exam preparation when
                  a certificate matters, and helps you land in the city.
                </p>
                {/*
                  ONE button, then a text link — not two buttons side by side.

                  Two equally weighted controls do not offer a choice, they
                  defer one. The reader has to compare them before they can act,
                  and whichever they pick, the other was noise. It also spends
                  the page's only piece of solid colour twice, so neither reads
                  as primary.

                  These two actions ARE different — "find your course" is
                  someone ready to move, "ask an advisor" is someone who is not
                  — so both belong here. They just must not be the same weight.
                  TextCta exists for precisely this; its own doc states the
                  rule: one solid button per decision, everything beside it is a
                  link. The homepage already did this cleanup (see the comment
                  at src/app/page.tsx:418); this hero had regressed against it.
                */}
                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <Link
                    href="/courses"
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg bg-[var(--casa-ink-deep)] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)]',
                      FOCUS_RING
                    )}
                  >
                    Find your course
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <TextCta href="/contact">Ask an advisor first</TextCta>
                </div>
              </div>
            </Container>

            {/*
              The image is masked, not cropped.

              A rounded rectangle sitting on a background is a *placed* object.
              Fading the left edge to transparent with a mask means there is no
              boundary at all — the photograph becomes the page's right edge and
              the warm field reads as continuous behind it.

              `mask-image` needs the -webkit- prefix for Safari; both are set.
              The fade runs to 34% so the dissolve happens over ~200px rather
              than as a visible seam, and the vertical mask softens the top and
              bottom so the photo does not butt into the section boundary.
            */}
            <div
              className="relative h-[22rem] md:absolute md:inset-y-0 md:right-0 md:h-full md:w-[52vw]"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, black 34%), linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
                maskImage:
                  'linear-gradient(to right, transparent 0%, black 34%), linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
                WebkitMaskComposite: 'source-in',
                maskComposite: 'intersect',
              }}
            >
              <Image
                src={pageConfig.photos.hero.src}
                alt={pageConfig.photos.hero.alt}
                fill
                sizes="(min-width: 768px) 52vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>
        {/* ------------------------------------------------------------------ */}
        <PatternHeading
          index="2"
          title="Edge-bleed rail"
          reference="Meininger — review carousel and promo tiles"
          mechanism="The heading stays on the container grid. The rail shares its left edge but runs off the right of the viewport, so cards arrive from and leave to open space instead of stopping at a gutter. Arrow scrolls one card; the strip never appears to start or end on screen."
        />

        <section className="overflow-x-clip">
          <Container>
            <div className="max-w-[42rem]">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                Course formats
              </p>
              <h3 className="mt-3 text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
                Find the format that fits your week
              </h3>
            </div>

            <div className="mt-8">
              <CardRail
                ariaLabel="Course formats, edge bleed"
                railClassName={cn(BLEED_RIGHT, 'scroll-pl-0 pr-10')}
                controlsClassName="max-w-[42rem]"
              >
                {courses.map((course, index) => (
                  <li key={course.title} className="w-[78vw] shrink-0 snap-start sm:w-[42vw] xl:w-[26rem]">
                    <article className="group h-full overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-card)]">
                      <div className="casa-media-overlay relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={course.photo.src}
                          alt={course.photo.alt}
                          fill
                          sizes="(min-width: 1280px) 26rem, 78vw"
                          className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
                        />
                      </div>
                      <div className="p-6">
                        <p className="text-xs font-semibold uppercase tracking-eyebrow tabular-nums text-[var(--casa-muted)]">
                          {String(index + 1).padStart(2, '0')}
                        </p>
                        <h4 className="mt-2 text-xl font-bold text-[var(--casa-ink)]">{course.title}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{course.text}</p>
                      </div>
                    </article>
                  </li>
                ))}
              </CardRail>
            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------------------ */}
        <PatternHeading
          index="3"
          title="Saturated pillar band"
          reference="Le Wagon — “Why Le Wagon”"
          mechanism="A full-bleed colour field with the content pulled tighter than the site frame, so the band reads as a held moment rather than another row. Rows alternate side, and the photograph is the only rounded object on the field — the type sits directly on the colour with no card under it."
        />

        <section className="overflow-x-clip bg-[var(--casa-ink-deep)] py-20 md:py-28">
          <Container>
            <div className="mx-auto max-w-[52rem] text-center">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]">
                Why CASA
              </p>
              <h3 className="mt-4 text-4xl font-bold leading-tight text-white md:text-5xl">
                Learn with teachers who stay with you, and arrive with a plan
              </h3>
            </div>

            <div className="mx-auto mt-14 max-w-[68rem] space-y-14 md:mt-16 md:space-y-20">
              {pillars.map((pillar, index) => (
                <div
                  key={pillar.title}
                  className="grid items-center gap-10 md:grid-cols-2 md:gap-16"
                >
                  <div className={cn(index % 2 === 1 && 'md:order-2')}>
                    <h4 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                      {pillar.title}
                    </h4>
                    <p className="mt-5 max-w-measure text-base leading-relaxed text-white/72">
                      {pillar.body}
                    </p>
                    <Link
                      href={pillar.href}
                      className={cn(
                        'mt-8 inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-[var(--casa-ink-deep)]',
                        FOCUS_RING
                      )}
                    >
                      {pillar.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>

                  <div className={cn('casa-media-overlay relative aspect-[4/3] overflow-hidden rounded-2xl', index % 2 === 1 && 'md:order-1')}>
                    <Image
                      src={pillar.photo.src}
                      alt={pillar.photo.alt}
                      fill
                      sizes="(min-width: 768px) 34vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------------------ */}
        <PatternHeading
          index="4"
          title="Proof panel with bleeding testimonial rail"
          reference="Meininger — “Was unsere Gäste sagen”"
          mechanism="A summary block on the grid (score, distribution, filters) sits above a rail that bleeds right. The distribution bars do the persuading; the quotes are evidence rather than decoration. Numbers below are placeholder — see the note."
        />

        <section className="overflow-x-clip">
          <Container>
            <h3 className="text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
              What our learners say
            </h3>

            <div className="mt-8 flex flex-wrap items-start gap-x-16 gap-y-8">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold tabular-nums text-[var(--casa-ink)]">4.3</span>
                  <span className="text-lg font-bold text-[var(--casa-ink)]">Very good</span>
                </div>
                <p className="mt-2 text-sm text-[var(--casa-muted)]">920 reviews</p>
                <p className="mt-3 inline-block rounded bg-[var(--casa-warm-soft)] px-2 py-1 text-xs font-semibold text-[var(--casa-gold-deep)]">
                  Placeholder data — not verified CASA figures
                </p>
              </div>

              <ul className="min-w-[18rem] flex-1 space-y-2">
                {distribution.map((row) => (
                  <li key={row.stars} className="flex items-center gap-3">
                    <span className="w-3 text-xs font-semibold tabular-nums text-[var(--casa-muted)]">
                      {row.stars}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--casa-sand)]">
                      <span
                        className="block h-full rounded-full bg-[var(--casa-ink-deep)]"
                        style={{ width: `${(row.count / distributionMax) * 100}%` }}
                      />
                    </span>
                    <span className="w-10 text-right text-xs tabular-nums text-[var(--casa-muted)]">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10">
              <CardRail
                ariaLabel="Learner reviews"
                railClassName={cn(BLEED_RIGHT, 'scroll-pl-0 pr-10')}
                controlsClassName="max-w-[42rem]"
              >
                {sampleReviews.map((review, index) => (
                  <li key={index} className="w-[78vw] shrink-0 snap-start sm:w-[40vw] xl:w-[22rem]">
                    <figure className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-soft)]">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded bg-[var(--casa-ink-deep)] px-2 text-xs font-bold tabular-nums text-white">
                          {review.score}
                        </span>
                        <span className="flex gap-1" aria-hidden>
                          {Array.from({ length: 5 }).map((_, star) => (
                            <span
                              key={star}
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                star < review.score ? 'bg-[var(--casa-ink-deep)]' : 'bg-[color:var(--casa-sand)]'
                              )}
                            />
                          ))}
                        </span>
                      </div>
                      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-[var(--casa-ink)]">
                        {review.quote}
                      </blockquote>
                      <figcaption className="mt-5 text-xs text-[var(--casa-muted)]">
                        {review.who} · {review.when}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </CardRail>
            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------------------ */}
        <PatternHeading
          index="5"
          title="Course formats — Le Wagon composition"
          reference="Le Wagon — “Why Le Wagon”, applied to the real six course formats"
          mechanism="The band bleeds full-width but the content is pulled to 1088px and centred, so the colour field is generous while the reading width stays tight. Cards use CASA's existing dark-surface vocabulary (white/6 on ink with a white/12 hairline) — the same one the homepage exam band already uses — so they read as family, not as white boxes dropped on a dark field."
        />

        <section className="overflow-x-clip bg-[var(--casa-ink-deep)] py-20 md:py-28">
          <Container>
            <div className="mx-auto max-w-[52rem] text-center">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]">
                Find your course
              </p>
              <h3 className="mt-4 text-4xl font-bold leading-tight text-white md:text-5xl">
                Six formats, one route into German
              </h3>
              <p className="mx-auto mt-6 max-w-measure text-base leading-relaxed text-white/72 md:text-lg">
                Start with the format that fits your week. If you are not sure, CASA will place you by
                level and pace rather than guessing.
              </p>
            </div>

            {/*
              The real Le Wagon composition: alternating rows, not a grid.

              Three flagship formats get a full row each — heading, paragraph,
              one outlined CTA — with the photograph opposite and the side
              flipping each time. That is what makes the band read as three
              considered arguments rather than six equivalent tiles.

              1088px, not the 1600px site frame. This is the point of the
              composition: the colour runs edge to edge so the band feels
              generous, while the reading width stays tight. Widening this to
              the full frame puts it straight back into the tunnel.
            */}
            <div className="mx-auto mt-14 max-w-[68rem] space-y-14 md:mt-16 md:space-y-20">
              {flagshipFormats.map((format, index) => (
                <div key={format.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
                  <div className={cn(index % 2 === 1 && 'md:order-2')}>
                    <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]">
                      {format.eyebrow}
                    </p>
                    <h4 className="mt-4 text-3xl font-bold leading-tight text-white md:text-4xl">
                      {format.title}
                    </h4>
                    <p className="mt-5 max-w-measure text-base leading-relaxed text-white/72">
                      {format.body}
                    </p>
                    <Link
                      href={format.href}
                      className={cn(
                        'mt-8 inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-[var(--casa-ink-deep)]',
                        FOCUS_RING
                      )}
                    >
                      Explore course plan
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>

                  <div className={cn('casa-media-overlay relative aspect-[4/3] overflow-hidden rounded-2xl', index % 2 === 1 && 'md:order-1')}>
                    <Image
                      src={format.photo.src}
                      alt={format.photo.alt}
                      fill
                      sizes="(min-width: 768px) 34vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/*
              The remaining formats still need a route in, but promoting them to
              full pillar rows would flatten the hierarchy the alternating
              pattern just created. They get one hairline row instead.

              Three structural rules keep that row from going ragged, because
              the first version did:

                1. `auto-rows-fr` + `h-full` — every cell takes the height of the
                   tallest, so the bottom rules sit on ONE baseline. Without it
                   each <li> sizes to its own copy and a one-line description
                   lifts its rule ~35px above a two-line neighbour.
                2. `justify-between` — the rule is pinned to the bottom of that
                   equalised box rather than floating under the text.
                3. `line-clamp-2` — caps the damage if someone later writes four
                   lines of copy. The layout bends instead of breaking.
            */}
            <div className="mx-auto mt-16 max-w-[68rem] border-t border-white/15 pt-8">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-white/60">
                Also available
              </p>
              <ul className="mt-5 grid auto-rows-fr gap-x-8 gap-y-4 sm:grid-cols-2">
                {secondaryFormats.map((format) => (
                  <li key={format.title} className="h-full">
                    <Link
                      href={format.href}
                      className={cn(
                        'group flex h-full flex-col justify-between gap-2 border-b border-white/10 pb-4 text-white no-underline transition-colors hover:border-white/40',
                        FOCUS_RING
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-base font-bold">{format.title}</span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 translate-y-1 text-white/60 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                          aria-hidden
                        />
                      </span>
                      <span className="line-clamp-2 text-sm leading-relaxed text-white/60">
                        {format.text}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------------------ */}
        <PatternHeading
          index="6"
          title="Centred stat band"
          reference="Le Wagon — “More than a bootcamp”"
          mechanism="No panel, no dividers, no decoration. Centred heading, a short lede, and three numbers set large in the accent colour with small labels beneath. The whitespace does the framing that CASA's current dark slab tries to do with a border, two decorative circles and three vertical rules."
        />

        <section className="py-20 md:py-28">
          <Container>
            <div className="mx-auto max-w-[46rem] text-center">
              <h3 className="text-4xl font-bold leading-tight text-[var(--casa-ink)] md:text-5xl">
                More than a language course. A school Bremen has trusted since 1983.
              </h3>
              <p className="mx-auto mt-6 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                CASA is a non-profit language school. Course fees are reinvested in teaching, fair pay
                and social education projects rather than distributed as profit.
              </p>
            </div>

            {/*
              Two details carry this composition, and both are easy to lose.

              `tabular-nums` — the figures share a column, so proportional digits
              would make 30,000+ and 45,000+ sit at visibly different widths and
              the row would read as misaligned rather than as a set.

              The label clamp — capped and centred so each wraps to at most two
              short lines under its number. Uncapped, "countries represented in
              our classrooms" runs the full column width and the number stops
              looking like the subject of its own label.

              No dividers, no panel, no ring. The gap is the separator.
            */}
            <ul className="mx-auto mt-16 grid max-w-[62rem] gap-x-8 gap-y-12 text-center sm:grid-cols-3 md:mt-20">
              {headlineStats.map((stat) => (
                <li key={stat.label}>
                  <p className="text-5xl font-bold tabular-nums text-[var(--casa-accent-text)] md:text-6xl">
                    {stat.value}
                  </p>
                  <p className="mx-auto mt-4 max-w-[13rem] text-sm leading-relaxed text-[var(--casa-ink)] md:text-base">
                    {stat.label}
                  </p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

      </div>
    </main>
  );
}
