import type { Metadata } from 'next';
import { CasaImage as Image } from '@/components/ui/casa-image';
import { Link } from '@/i18n/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

import { HeroAPhotoLed } from '@/components/heroes';
import {
  EditorialSplit,
  PersonaPathways,
  ProofBand,
  TestimonialGrid,
} from '@/components/sections';
import { CourseFormatRows } from '@/components/sections/course-format-rows';
import { JsonLdScript } from '@/components/seo/json-ld';
import { TextCta } from '@/components/ui/text-cta';
import { BandSeam } from '@/components/ui/band-seam';
import { CardRail } from '@/components/ui/card-rail';
import { Container } from '@/components/ui/container';
import { fallbackCourseTypes } from '@/config/content/public-fixtures';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getCoursePhoto } from '@/config/courses/course-photos';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCoursePath } from '@/lib/content/course-routes';
import {
  getCourseFinderData,
  getCulturalPrograms,
  getCourseNarrative,
  getExamCatalog,
  getSocialProof,
} from '@/lib/content/repository';
import type { ContentLocale, CourseNarrative, CourseTypeRow } from '@/lib/content/types';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';
import { publicCourseOrder } from '@/config/courses/course-order';
import { meaningClasses } from '@/config/brand/meaning';
import { iconMap } from '@/config/icon-map';
import { cn } from '@/lib/utils';
import { BandHeading } from '@/components/sections/band-heading';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    path: '/',
    keywords: ['CASA Bremen', 'Learn German', 'Deutsch lernen Bremen', 'Language school Bremen', 'telc Deutsch B2', 'telc C1 Hochschule'],
    ...(locale === 'de'
      ? {
          title: 'Deutsch lernen in Bremen',
          description:
            'Deutsch lernen und in Bremen ankommen: CASA bietet Kurse, telc-Prüfungen, persönliche Beratung und Unterkunft in einer internationalen Gemeinschaft.',
        }
      : {
          title: 'Learn German in Bremen',
          description:
            'Learn German and feel at home in Bremen. Discover CASA courses, telc exams, accommodation and personal advice in an international community.',
        }),
  });
}

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value));
}

/**
 * Formats that sit outside the four main routes.
 *
 * 'university-prep' and 'business-german' used to be listed here. CASA does not
 * offer either -- they were development placeholders that rendered to the public
 * as real products. See docs/CONTENT_PARITY_WITH_CASA_BREMEN_DE.md.
 */
const additionalProgramOrder = ['bildungszeit'] as const;

/**
 * The course formats listed under "Für Beruf und Weiterbildung", in this order
 * and before Bildungszeit, instead of as full rows (CASA, 2026-10-03): Pflege
 * und Medizin belongs beside Firmenunterricht, and Unterricht für Gruppen took
 * its full row.
 */
const professionalCourseOrder = ['medical-german', 'in-company'] as const;

/**
 * The list under "Für Beruf und Weiterbildung" shows one short line per format;
 * the course overview and the course page keep the full text.
 */
const homepageListSummaries: Partial<Record<string, Record<ContentLocale, string>>> = {
  'medical-german': {
    de: 'Deutsch für den Klinik- und Pflegealltag, mit Vorbereitung auf die Fachsprachprüfung.',
    en: 'German for work in hospitals and care, with preparation for the medical language exam.',
  },
};

/**
 * Derived from the published order, not restated.
 *
 * This used to be its own literal list here, which is how the homepage came to
 * disagree with /courses about where Intensive German ranks — see
 * config/courses/course-order.ts. The homepage's only real editorial decision is
 * which formats it presents as full rows versus which it hands to the
 * "Specialised formats" rail, and that decision is the slice below, not a
 * second sequence.
 */
const homepageCourseOrder = publicCourseOrder.filter(
  (slug) => !additionalProgramOrder.includes(slug as (typeof additionalProgramOrder)[number])
);

const homepageExamOrder = [
  'telc_b2',
  'telc_c1_hochschule',
] as const;

const homepageCourseTitles: Partial<Record<string, Record<ContentLocale, string>>> = {
  // The flyers' names (Rahman, 2026-10-01), the same as lib/content/repository.ts.
  'intensive-german': {
    en: 'Intensive courses',
    de: 'Intensivkurse',
  },
  'evening-german': {
    en: 'Evening courses',
    de: 'Abendkurse',
  },
  'special-courses': {
    en: 'Special courses',
    de: 'Spezialkurse',
  },
  'german-for-groups': {
    en: 'Classes for groups',
    de: 'Unterricht für Gruppen',
  },
  'medical-german': {
    en: 'German for nursing and medicine',
    de: 'Deutsch für Pflege und Medizin',
  },
  'in-company': {
    en: 'In-company teaching',
    de: 'Firmenunterricht',
  },
};

const additionalProgramLabels: Record<string, Record<ContentLocale, string>> = {
  bildungszeit: {
    en: 'Bildungszeit',
    de: 'Bildungszeit',
  },
};

type HomepageCourseRecord = CourseTypeRow & {
  narrative: CourseNarrative | null;
};

function examDetailHref(code: string) {
  if (code === 'telc_b2') {
    return '/exams/b2';
  }
  if (code === 'telc_c1_hochschule') {
    return '/exams/c1';
  }

  return '/exams';
}

export default async function HomePage() {
  const locale = await getContentLocale();
  const pageConfig = getPublicPageConfig('home', locale);
  // A CASA-WG room for "Ein eigenes Zimmer" (slot 57), not the accommodation
  // page's host-family photograph that this used to borrow.
  const accommodationPhoto = pageConfig.photos.accommodation;
  const rhythm = getLayoutRhythm('home');
  const culturalPrograms = getCulturalPrograms(locale);
  const programById = (id: string) => culturalPrograms.find((program) => program.id === id);
  const tandemProgram = programById('tandem');
  const TandemIcon = iconMap.tandem;
  const lifeTiles = [
    {
      id: 'weekend-excursions',
      photo: pageConfig.photos.lifeRegion,
      title: programById('weekend-excursions')?.title ?? '',
      line: locale === 'de' ? 'Ausflüge, Stadtspaziergänge, Kulturprogramm' : 'Trips, city walks and cultural events',
    },
    {
      id: 'community-events',
      photo: pageConfig.photos.lifePeople,
      title: programById('community-events')?.title ?? '',
      line: locale === 'de' ? 'Internationalen Teilnehmenden mit Vielfalt und Offenheit begegnen' : 'An international community, open and diverse',
    },
  ];

  const [finderData, examCatalog, stories] = await Promise.all([
    getCourseFinderData(locale),
    getExamCatalog(locale),
    Promise.resolve(getSocialProof(locale)),
  ]);

  const coursesBySlug = new Map(finderData.courses.map((course) => [course.slug, course]));
  const fallbackCoursesBySlug = new Map(fallbackCourseTypes.map((course) => [course.slug, course]));
  const guidedCourseRecords = homepageCourseOrder.reduce<HomepageCourseRecord[]>((records, slug) => {
    const repositoryCourse = coursesBySlug.get(slug);

    if (repositoryCourse) {
      records.push(repositoryCourse);
      return records;
    }

    const fallbackCourse = fallbackCoursesBySlug.get(slug);

    if (fallbackCourse) {
      records.push({
        ...fallbackCourse,
        narrative: getCourseNarrative(slug, locale),
      });
    }

    return records;
  }, []);

  const guidedCourses = guidedCourseRecords.map((course) => {
    const nextStart = finderData.nextStartByCourseId[course.id];
    /*
      Same photograph this course carries on /courses and on its own page.
      Previously indexed by position here too, which is why Intensive German
      wore a different photograph on each of the three surfaces.
    */
    const photo = getCoursePhoto(course.slug, locale);

    return {
      id: `course-${course.slug}`,
      title: homepageCourseTitles[course.slug]?.[locale] ?? course.name,
      description:
        course.narrative?.promise ||
        (locale === 'de'
          ? 'Praxisnahe Lernziele mit klarer Struktur.'
          : 'Practical language outcomes with clear structure.'),
      bestFor: course.narrative?.audienceInPromise
        ? ''
        : course.narrative?.audience ||
          (locale === 'de'
            ? 'Geeignet für internationale Lernende'
            : 'Suitable for international learners'),
      outcomes: course.narrative?.outcomes ?? [],
      href: getCoursePath(course.slug),
      ctaLabel: locale === 'de' ? 'Kurs ansehen' : 'Explore this course',
      meta: nextStart
        ? `${locale === 'de' ? 'Nächster Start' : 'Next start'}: ${formatDate(nextStart, locale)}`
        : undefined,
      media: {
        src: photo.src,
        alt: photo.alt,
      },
    };
  });

  /*
   * The formats for learners carry the band as full alternating rows, in the
   * published order; the formats for work and further training go to the list
   * beneath, in `professionalCourseOrder`.
   */
  const isProfessional = (courseId: string) =>
    professionalCourseOrder.some((slug) => courseId === `course-${slug}`);
  const flagshipCourses = guidedCourses.filter((course) => !isProfessional(course.id));
  const secondaryCourses = professionalCourseOrder
    .map((slug) => guidedCourses.find((course) => course.id === `course-${slug}`))
    .filter((course): course is NonNullable<typeof course> => course !== undefined);

  const additionalPrograms = additionalProgramOrder
    .map((slug) => {
      const course = coursesBySlug.get(slug) ?? fallbackCoursesBySlug.get(slug);
      const narrative = getCourseNarrative(slug, locale);

      if (!course) {
        return null;
      }

      return {
        title: additionalProgramLabels[slug]?.[locale] ?? course.name,
        description:
          narrative?.audience ||
          (locale === 'de'
            ? 'Ergänzende Programme für besondere Lernziele.'
            : 'Additional programmes for specific learning goals.'),
        href: getCoursePath(course.slug),
      };
    })
    .filter((program): program is NonNullable<typeof program> => program !== null);

  /*
   * One "everything else" list instead of two.
   *
   * The band used to end with BOTH a secondary-course row and a separate
   * "Additional programs" card grid — three tiers of course listing stacked in
   * one section. A visitor does not distinguish "a format we did not feature"
   * from "a programme"; both are simply other options. Merging them removes a
   * whole sub-section and a duplicated "explore all courses" exit.
   *
   * `anchorId` only exists for the course formats, which are in-page link
   * targets for the persona cards. The programmes are not linked to.
   */
  const moreOptions = [
    ...secondaryCourses.map((course) => ({
      key: course.id,
      anchorId: course.id as string | undefined,
      title: course.title,
      description: homepageListSummaries[course.id.replace(/^course-/, '')]?.[locale] ?? course.description,
      href: course.href,
    })),
    ...additionalPrograms.map((program) => ({
      key: program.href,
      anchorId: undefined as string | undefined,
      title: program.title,
      description: program.description,
      href: program.href,
    })),
  ];

  const examPathways = homepageExamOrder
    .map((code) => examCatalog.items.find((item) => item.examType.code === code))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)
    .map((item) => {
      const nextSession = item.sessions[0];

      return {
        title: item.examType.name,
        prepTitle:
          item.examType.code === 'telc_b2'
            ? locale === 'de'
              ? 'Vorbereitungskurs B2'
              : 'B2 preparation course'
            : locale === 'de'
              ? 'Vorbereitungskurs C1 Hochschule'
              : 'C1 Hochschule preparation course',
        description:
          item.narrative?.summary ||
          (locale === 'de'
            ? 'Gezielte Vorbereitung mit Prüfungsstrategie, Simulation und Feedback.'
            : 'Focused preparation with exam strategies, mock exams and feedback.'),
        level: item.examType.level || '',
        href: examDetailHref(item.examType.code),
        nextDate: nextSession?.starts_at ? formatDate(nextSession.starts_at, locale) : null,
      };
    });

  const featuredSource = stories[1] ?? stories[0];
  const featuredStoryId = featuredSource?.id;
  const nonFeaturedStories = stories.filter((story) => story.id !== featuredStoryId);
  const storiesForCards = nonFeaturedStories.length >= 2 ? nonFeaturedStories : stories;


  // No portraits. These are CASA's real published testimonials with real first
  // names, and the three testimonial images are synthetic — cycling them by
  // index put a generated face on a named learner. CLAUDE.md hard rule 2.
  /*
   * Four cards behind a featured tile: two visible per page beside it, so exactly
   * two pages. The pool is seven, which paged three deep and buried the last
   * three quotes where nobody would reach them.
   */
  const testimonialCards = storiesForCards.slice(0, 4).map((story) => ({
    id: story.id,
    person: story.personDisplay,
    country: story.country,
    quote: story.quote,
  }));


  const featuredQuote = featuredSource
    ? {
        quote: featuredSource.quote,
        person: featuredSource.personDisplay,
        role: featuredSource.country,
      }
    : undefined;

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CASA Internationale Sprachschule Bremen',
    url: toAbsoluteUrl('/'),
    inLanguage: ['en', 'de'],
  };

  return (
    <main
      className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]"
      data-rhythm={rhythm.hero}
    >
      <JsonLdScript id="website-schema" data={websiteSchema} />

      {/* Keep CASA's German Leitbild; English expresses the same welcome in its own voice. */}
      <HeroAPhotoLed
        eyebrow={
          locale === 'de' ? 'Deutsch lernen in Bremen · seit 1983' : 'German courses in Bremen · since 1983'
        }
        title={
          locale === 'de'
            ? 'Miteinander reden – aufeinander zugehen'
            : 'Learn German. Feel at home.'
        }
        description={
          locale === 'de'
            ? 'Bei CASA kannst du nicht nur Deutsch lernen, sondern auch Menschen aus aller Welt treffen. Wir helfen dir, gut in Bremen anzukommen – mit individueller Begleitung und einem offenen Miteinander.'
            : 'At CASA you don’t just learn German, you meet people from all over the world. We help you settle into Bremen, with personal support and a welcoming community.'
        }
        ctas={[
          {
            label: locale === 'de' ? 'Kurs finden' : 'Find my course',
            href: '#course-recommendation',
            kind: 'primary',
          },
        ]}
        photo={pageConfig.photos.hero}
      />

      <section className="py-14 md:py-20" data-track-section="trust-and-search">
        <Container>
          <ProofBand locale={locale} />
        </Container>
      </section>

      {/*
        Heading rail + content column, the composition every band on
        /landing-page-alt uses and the reason that page reads as designed while
        this one read as a tunnel. The header used to sit ON TOP of a full-width
        4-up row, which gives the eye nothing to anchor on and makes the band
        indistinguishable from the one above it at any width.

        The 0.82/1.18 ratio (0.41/0.59) is the reference page's own — see
        `alt-why-casa` at src/app/landing-page-alt/page.tsx:477, which is this
        exact shape: four cards in a 2x2 beside a rail.
      */}
      <BandSeam />

      <section className="py-16 md:py-24" data-track-section="persona-pathways">
        <Container>
          <div className="mx-auto grid max-w-[85rem] gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Startpunkt wählen' : 'Start here'}
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--casa-ink)] md:text-4xl">
                {locale === 'de' ? 'Was sind deine Lernziele?' : 'What are your learning goals?'}
              </h2>
              <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {locale === 'de'
                  ? 'Du möchtest studieren, beruflich weiterkommen oder dich im Alltag sicherer fühlen? Finde einen ersten Anhaltspunkt. Alles Weitere besprechen wir persönlich.'
                  : 'You may be planning to study, looking ahead to work or settling into everyday life. Start with what matters to you; we can work out the details together.'}
              </p>
              <span className="casa-tricolor-rule mt-7 block h-1 w-28 rounded-full md:w-36" aria-hidden />
            </div>

            <PersonaPathways locale={locale} presentation="rail" />
          </div>
        </Container>
      </section>

      {/*
        A blue-tinted field rather than white. White read as "no decision made",
        and this is the band the page exists to deliver. Blue rather than another
        warm tint because the two neighbouring bands are both warm, and blue is
        the one CASA brand colour not already carrying a band. It stays a tint
        (6%) rather than a saturated field so the photographs still lead.
      */}
      <section
        className="bg-[var(--casa-ink-deep)] py-20 text-white md:py-32"
        data-track-section="learning-journey"
      >
        <Container className="space-y-12 md:space-y-14">

          {/*
            Centred alternating rows, ported from /design-system/layout-patterns
            (pattern 5). Replaces a 3-up card grid whose photos rendered at
            2.97:1 and whose `min-h-[25rem]` floor left ~80px of dead space above
            every CTA.

            Four rows rather than six equal tiles: equal cards give every format
            the same weight, which is exactly what made this band read as a
            uniform slab. Content is held at 68rem inside the site frame so the
            reading width stays tight while the band itself stays full width.

            Kept LIGHT deliberately. The design-system version sits on ink-deep,
            but the very next band (`exam-preparation-pathways`) is the page's
            only dark section and is load-bearing as the mid-page reset — two
            dark bands in a row would destroy that contrast. Composition carries
            the distinction here instead of colour.
          */}
          <div id="course-recommendation" className="scroll-mt-28 md:scroll-mt-32">
            <BandHeading
              eyebrow={locale === 'de' ? 'Kurs finden' : 'Find your course'}
              title={
                locale === 'de'
                  ? 'Finde das Kursformat, das zu deinem Ziel passt'
                  : 'Find the course format that matches your goal'
              }
              description={
                locale === 'de'
                  ? 'Intensiv lernen, abends am Ball bleiben oder gezielt üben: Gemeinsam finden wir einen Kurs, der zu deinen Vorkenntnissen und deinem Alltag passt.'
                  : 'Study intensively, join an evening class or focus on a particular skill. We can help you find a course that suits your level and your everyday commitments.'
              }
            />

            <CourseFormatRows rows={flagshipCourses} tone="dark" className="mt-12 md:mt-16" />
          </div>
        </Container>
      </section>

      {/*
        Edge-bleed rail, its own band.

        These five were a hairline grid crammed under the four flagship rows,
        which made the dark band do two jobs and left the secondary formats no
        room to breathe. As their own section they get real spacing, and the
        rail's bleed does the work photographs would otherwise do — there are no
        images here at all, which is the point: this is a list of options, not a
        gallery.

        `overflow-x-clip` is required, not optional. `50vw` in the bleed below
        includes the scrollbar, so without it the rail overflows the document by
        the scrollbar width. `clip` rather than `hidden` because `hidden` creates
        a scroll container and would swallow the rail's own horizontal scroll.
      */}
      <section className="overflow-x-clip py-16 md:py-24" data-track-section="more-formats">
        <Container>
          <div className="mx-auto max-w-[85rem]">
            <div className="max-w-[42rem]">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Deutsch für besondere Ziele' : 'German for specific goals'}
              </p>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-[var(--casa-ink)] md:text-4xl">
                {locale === 'de'
                  ? 'Für Beruf und Weiterbildung'
                  : 'For work and professional development'}
              </h2>
              <p className="mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                {locale === 'de'
                  ? 'Deutsch für den medizinischen Alltag, für dein Team oder im Rahmen der Bildungszeit: Erzähl uns, was du brauchst.'
                  : 'German for medical practice, for your team or during your Bildungszeit, Bremen’s paid leave for further training. Tell us what you need and we will help you explore the options.'}
              </p>
            </div>

            <div className="mt-10">
              {/*
                margin-right: calc(50% - 50vw) — inside a centred box of width W
                in a viewport V, `50%` is W/2 and `50vw` is V/2, so the negative
                margin is exactly (V - W)/2: the distance from this box's right
                edge to the viewport's. The left edge never moves, so the first
                card stays locked to the same grid line as the heading above it.

                `data-[scrollable=false]:` cancels the bleed when the cards all
                fit, which at desktop widths they do — there are three of them.
                Without it the row kept reaching for the viewport edge and simply
                stopped 216px short of it, which reads as a cut-off carousel
                rather than as three cards. CardRail sets the attribute.
              */}
              <CardRail
                ariaLabel={locale === 'de' ? 'Weitere Kursformate' : 'More course formats'}
                railClassName="mr-[calc(50%-50vw)] scroll-pl-0 pr-10 data-[scrollable=false]:mr-0 data-[scrollable=false]:pr-0"
                controlsClassName="max-w-[42rem]"
              >
                {moreOptions.map((option, index) => (
                  <li
                    key={option.key}
                    id={option.anchorId}
                    className={cn(
                      'w-[78vw] shrink-0 snap-start scroll-mt-28 sm:w-[46vw] md:scroll-mt-32 xl:w-[24rem]',
                      // Fill the row rather than sitting at a fixed 24rem with
                      // whitespace after them, on the widths where all three fit.
                      'xl:group-data-[scrollable=false]/rail:w-auto xl:group-data-[scrollable=false]/rail:flex-1'
                    )}
                  >
                    <Link
                      href={option.href}
                      className={cn(
                        /*
                          shadow-card, not shadow-soft. The soft step is 0.04/0.05
                          alpha, which was tuned to separate a white card from the
                          --casa-canvas tint. The page is pure white now, so that
                          step is almost invisible and the cards lose their edge.
                        */
                        // Red top edge: a course card (src/config/brand/meaning.ts).
                        'group relative flex h-full flex-col overflow-hidden rounded-xl bg-white p-7 shadow-[var(--shadow-card)] transition-all duration-300',
                        'motion-safe:hover:-translate-y-1 hover:shadow-[var(--shadow-modal)]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2'
                      )}
                    >
                      <span className={cn('casa-card-edge', meaningClasses.courses.bar)} aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-eyebrow tabular-nums text-[var(--casa-muted)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="mt-4 block text-xl font-bold text-[var(--casa-ink)] group-hover:text-[var(--casa-red-text)]">
                        {option.title}
                      </span>
                      <span className="mt-3 block text-sm leading-relaxed text-[var(--casa-muted)]">
                        {option.description}
                      </span>
                      <span className={cn('mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold', meaningClasses.courses.link)}>
                        {locale === 'de' ? 'Ansehen' : 'View'}
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </CardRail>
            </div>
          </div>
        </Container>
      </section>

      {/*
        "Why CASA" gets its own canvas band rather than riding inside the dark
        course field. EditorialSplit is built for a light surface — ink headings,
        muted body, a warm panel — and none of that survives on ink-deep. Giving
        it its own band is a smaller change than teaching the component a dark
        mode, and it also stops the dark field running to two screens tall.
      */}
      <BandSeam />

      <section className="py-16 md:py-24" data-track-section="why-casa">
        <Container>
          <div className="mx-auto max-w-[85rem]">
            <EditorialSplit
              eyebrow={locale === 'de' ? 'Warum CASA' : 'Why CASA'}
              title={
                locale === 'de'
                  ? 'Wir hören zu. Und begleiten dich.'
                  : 'Your plans start with a conversation'
              }
              description={
                locale === 'de'
                  ? 'Jeder Mensch bringt andere Erfahrungen und Wünsche mit. Wir nehmen uns Zeit für ein persönliches Gespräch und überlegen mit dir, was dir jetzt weiterhilft – beim Deutschlernen und bei deinen nächsten Schritten.'
                  : 'Everyone arrives with a different story. We listen, take your questions seriously and help you work out what comes next, whether you have a clear goal or are still finding your direction.'
              }
              bullets={[
                locale === 'de'
                  ? 'Persönliche Beratung bezüglich Kurswahl, Sprachniveau und Prüfungen'
                  : 'One-to-one advice on choosing a course, your language level and exams',
                locale === 'de'
                  ? 'Orientierung, wenn du studieren, Arbeit suchen oder eine Ausbildung machen möchtest'
                  : 'Guidance if you’re planning to study, looking for work or hoping to start vocational training',
                locale === 'de'
                  ? 'Unterstützung bei der Unterkunft und beim Ankommen in Bremen'
                  : 'Help with accommodation and settling into life in Bremen',
              ]}
              photo={pageConfig.photos.story}
            />
          </div>
        </Container>
      </section>

      {/*
        Non-profit band — moved below the course formats, 2026-08-16.

        It used to sit third, before anyone had seen a course. The public-benefit
        story lands better as a reason to trust CASA once the offer is known, not
        as a preamble to it.

        Ad Grants note: docs/GOOGLE_AD_GRANTS_COMPLIANCE.md requires the
        non-profit narrative to be VISIBLE on the homepage, not to be in any
        particular position. It is still here, still linked to
        /ueber-uns/gemeinnuetzigkeit, and now reads as a statement rather than a
        two-column aside — so the requirement is met more strongly than before,
        not less. Do not remove this band.

        ON THE CANVAS, and no BandSeam above it any more (2026-08-20).

        The band used to be transparent, which on this page means white, sitting
        between a white band and the ink-deep exam field with a centred hairline
        marking the seam. So the one statement the Ad Grants review asks the site
        to make plainly was also the flattest thing on the page: no surface of
        its own, and a rule doing the work a surface should do. It now sits on
        --casa-canvas, an 11-unit step from the white above it, which is a real
        boundary — and the seam goes, for the reason BandSeam's own comment gives
        about the ink-deep bands: drawing a line where the eye already sees the
        change is what makes a page look fussy.

        The three commitments were bare on the field with a rule above each,
        stretched across the full 85rem while the statement above them was
        clamped to 46rem — three one-line claims spanning 432px each at 1440,
        centred text over left-aligned columns. They are now one raised panel,
        clamped to the statement's own measure, divided rather than boxed: a
        horizontal rule between them when stacked, a vertical one when abreast.
        That is also what fixes the mid-width jump, which went 1 column straight
        to 3 at 640px and gave each claim 213px at 768.
      */}
      <section
        id="gemeinnuetzigkeit"
        className="bg-[var(--casa-canvas)] py-16 md:py-24"
        data-track-section="nonprofit-mission"
      >
        <Container>
          {/*
            The `text-balance` / `text-pretty` fixes this band needed are defaults
            inside BandHeading now — see its note. They were discovered here.
          */}
          <BandHeading
            tone="light"
            eyebrow={locale === 'de' ? 'Gemeinnützige Sprachschule' : 'Non-profit language school'}
            title={
              locale === 'de'
                ? 'Deine Kursgebühren fördern Bildung.'
                : 'Your course fees support education.'
            }
            description={
              locale === 'de'
                ? 'CASA ist eine gemeinnützige GmbH. Einnahmen werden in Unterrichtsqualität, faire Vergütung, Lernräume und soziale Bildungsprojekte reinvestiert.'
                : 'CASA is a non-profit language school. Our income supports teaching, fair pay, learning spaces and projects that help people take part in society.'
            }
          />

          {/*
            One panel, divided — not three cards, and not three bare columns.

            `divide-y ... md:divide-y-0 md:divide-x` is the whole responsive
            story: stacked, the claims are separated by a horizontal rule; abreast
            they are separated by a vertical one. No breakpoint has to be tuned
            and nothing reflows into an awkward width, because the panel is
            clamped to 64rem rather than running to the 85rem grid.

            `items-start` on the icon row so a title that wraps to two lines at
            tablet width keeps the shield aligned to its first line rather than
            floating to the vertical centre.
          */}
          <ul className="mx-auto mt-10 grid max-w-[64rem] divide-y divide-[color:var(--casa-sand)] overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] md:mt-12 md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              {
                title: locale === 'de' ? 'Keine Gewinnausschüttung' : 'No profit distribution',
                text:
                  locale === 'de'
                    ? 'Überschüsse fließen in unsere gemeinnützige Arbeit.'
                    : 'Any surplus supports our non-profit work.',
              },
              {
                title: locale === 'de' ? 'Reinvestition in Bildung' : 'Reinvestment in education',
                text:
                  locale === 'de'
                    ? 'Unterricht, Vergütung und Lernräume.'
                    : 'Teaching, fair pay and learning spaces.',
              },
              {
                title: locale === 'de' ? 'Integrationsprojekte' : 'Integration projects',
                text:
                  locale === 'de'
                    ? 'Soziale Bildungsarbeit in Bremen.'
                    : 'Helping people build a life in Bremen through education.',
              },
            ].map((item) => (
              <li key={item.title} className="p-6 md:p-7">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--casa-accent-text)]"
                    aria-hidden
                  />
                  <p className="text-base font-bold leading-snug text-[var(--casa-ink)]">{item.title}</p>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--casa-muted)]">{item.text}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 text-center md:mt-12">
            <TextCta href="/ueber-uns/gemeinnuetzigkeit">
              {locale === 'de'
                ? 'Wie CASA Kursgebühren gemeinnützig einsetzt'
                : 'How CASA reinvests course fees'}
            </TextCta>
          </div>
        </Container>
      </section>

      {examPathways.length > 0 ? (
        <section
          id="exam-preparation"
          className="scroll-mt-28 bg-[var(--casa-ink-deep)] py-20 text-white md:scroll-mt-32 md:py-32"
          data-track-section="exam-preparation-pathways"
        >
          <Container>
            <div className="mx-auto grid max-w-[85rem] gap-8 lg:grid-cols-[0.78fr_minmax(0,1.22fr)] lg:items-end">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]">
                  {locale === 'de' ? 'Zertifikat geplant?' : 'Need a certificate?'}
                </p>
                <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                  {locale === 'de'
                    ? 'Gut vorbereitet in deine telc-Prüfung'
                    : 'Prepare for your telc exam with us'}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/72 md:text-lg">
                  {locale === 'de'
                    ? 'Du brauchst ein Zertifikat telc Deutsch B2 oder telc Deutsch C1 Hochschule? Wir helfen dir bei der Wahl der Prüfung und bieten eigene Vorbereitungskurse an.'
                    : 'Need a telc Deutsch B2 or telc Deutsch C1 Hochschule certificate? We’ll help you choose the right exam, and we run our own preparation courses.'}
                </p>
                {/*
                  A band lead-in, not a conversion. The two cards below it are
                  already whole-card links into the same section, so a filled
                  sun-yellow button here was the third route to one place.
                */}
                <TextCta href="/exams" onDark className="mt-7 text-[var(--casa-sun)] hover:text-white">
                  {locale === 'de' ? 'Prüfungsvorbereitung erkunden' : 'Explore exam preparation'}
                </TextCta>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {examPathways.map((exam, index) => (
                  <Link
                    key={exam.href}
                    href={exam.href}
                    className="group flex min-h-[19rem] flex-col rounded-xl bg-white/[0.06] p-5 ring-1 ring-white/12 transition-all hover:-translate-y-0.5 hover:bg-white/[0.09] hover:ring-white/22 md:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* /45 measured 4.26:1 on the dark panel — under AA for 11px text. */}
                      <span className="text-xs font-semibold uppercase tracking-eyebrow text-white/60">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {exam.nextDate ? (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/76">
                          {locale === 'de' ? 'Nächste Prüfung' : 'Next exam'}: {exam.nextDate}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-7 text-sm font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]">
                      {exam.title}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold leading-tight text-white">
                      {exam.prepTitle}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-white/68">
                      {exam.description}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/72">
                        {exam.level}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/72">
                        {locale === 'de' ? 'Vorbereitung + Anmeldung' : 'Preparation + registration'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      <section
        id="accommodation-support"
        className="scroll-mt-28 py-16 md:scroll-mt-32 md:py-24"
        data-track-section="housing-and-life"
      >
        <Container>
          <div className="mx-auto grid max-w-[85rem] gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="relative overflow-hidden rounded-xl bg-[var(--casa-ink-deep)] shadow-[var(--shadow-modal)]">
              <div className="relative aspect-[4/3]">
                <Image
                  src={accommodationPhoto.src}
                  alt={accommodationPhoto.alt}
                  fill
                  sizes="(min-width: 1024px) 44vw, 92vw"
                  className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.7)_100%)]" aria-hidden />
              </div>
              <p className="absolute inset-x-0 bottom-0 p-5 text-base font-bold text-white md:p-6">
                {locale === 'de'
                  ? 'Ein eigenes Zimmer für deinen Start in Bremen.'
                  : 'A room of your own as you settle into Bremen.'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Ankommen in Bremen' : 'Settling in Bremen'}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
                {locale === 'de'
                  ? 'Ein Zuhause für deine Zeit in Bremen'
                  : 'A place to call home in Bremen'}
              </h2>
              <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {locale === 'de'
                  ? 'Für die Zeit deines Intensivkurses bei uns vermitteln wir dir Zimmer in einer CASA-WG oder bei Gastgebern in Bremen und Umgebung. Gemeinsam klären wir, welche Wohnform zu dir passt und verfügbar ist.'
                  : 'While you’re on an intensive course with us, we can find you a room in a CASA shared flat or with hosts in and around Bremen. Together we work out which kind of home suits you and what’s available.'}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  locale === 'de' ? 'CASA-WG' : 'CASA shared flat',
                  locale === 'de' ? 'Gastfamilie' : 'Host family',
                  locale === 'de' ? 'Persönliche Vermittlung' : 'Personal help finding a room',
                  locale === 'de' ? 'Verfügbarkeit auf Anfrage' : 'Availability on request',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-bold text-[var(--casa-ink)] ring-1 ring-[color:var(--casa-sand)]"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--casa-sun-text)]" aria-hidden />
                    {item}
                  </div>
                ))}
              </div>

              {/* Yellow: accommodation and arrival (src/config/brand/meaning.ts). */}
              <TextCta href="/accommodation" className={cn('mt-8', meaningClasses.arrival.link)}>
                {locale === 'de' ? 'Unterkunft erkunden' : 'Explore accommodation'}
              </TextCta>
            </div>
          </div>
        </Container>
      </section>

      <BandSeam />

      <section id="community" className="bg-[var(--casa-canvas)] py-16 md:py-24 scroll-mt-28" data-track-section="life-at-casa">
        <Container>
          <BandHeading
            tone="light"
            eyebrow={locale === 'de' ? 'Leben bei CASA' : 'Life at CASA'}
            title={locale === 'de' ? 'Bremen entdecken. Menschen kennenlernen.' : 'Discover Bremen. Find your people.'}
            description={locale === 'de'
              ? 'Zum Ankommen gehört mehr als ein Sprachkurs. Gemeinsame Erlebnisse machen aus einer neuen Stadt einen vertrauten Ort.'
              : 'Feeling at home takes more than a language course. Shared experiences help turn a new city into a familiar place.'}
          />
          {/*
            Two real photographs with their caption on a dark gradient, and the
            tandem as a light-blue card (blue = exchange, src/config/brand/meaning.ts).
            It was three columns of text; the texts are the same programmes.
          */}
          <div className="mx-auto mt-10 grid max-w-[85rem] gap-5 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr]">
            {lifeTiles.map((tile) => (
              <figure
                key={tile.id}
                className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--casa-ink-deep)] shadow-[var(--shadow-card)] lg:aspect-auto lg:h-[23rem]"
              >
                <Image
                  src={tile.photo.src}
                  alt={tile.photo.alt}
                  fill
                  sizes="(min-width: 1024px) 34vw, (min-width: 768px) 46vw, 92vw"
                  className="object-cover"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.78)_100%)] px-5 pb-5 pt-16 text-white md:px-6">
                  <span className="block text-lg font-bold leading-snug">{tile.title}</span>
                  <span className="mt-1 block text-sm text-white/90">{tile.line}</span>
                </figcaption>
              </figure>
            ))}
            {tandemProgram ? (
              <article className="flex flex-col justify-between rounded-xl bg-[var(--casa-warm-panel)] p-6 md:col-span-2 md:p-7 lg:col-span-1 lg:h-[23rem]">
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--casa-accent-text)]" aria-hidden>
                    <TandemIcon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-[var(--casa-ink)]">{tandemProgram.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{tandemProgram.summary}</p>
                </div>
                <TextCta href="/contact" className="mt-6 self-start">
                  {locale === 'de' ? 'Tandem anfragen' : 'Ask about a tandem'}
                </TextCta>
              </article>
            ) : null}
          </div>
          <div className="mt-8 text-center">
            <TextCta href="/contact">
              {locale === 'de' ? 'Nach dem aktuellen Programm fragen' : 'Ask what is coming up'}
            </TextCta>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24" data-track-section="proof-and-outcomes">
        <Container>
          <div className="mx-auto max-w-[85rem]">
          <TestimonialGrid
            title={
              locale === 'de'
                ? 'Das sagen unsere Teilnehmenden'
                : 'In our students’ words'
            }
            description={
              locale === 'de'
                ? 'Lernende berichten über Fortschritt, Vertrauen und Alltag in Bremen.'
                : 'Learners share stories about progress, confidence and life in Bremen.'
            }
            cards={testimonialCards}
            featuredQuote={featuredQuote}
            locale={locale}
          />
          </div>
        </Container>
      </section>
    </main>
  );
}
