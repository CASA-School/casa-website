import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, MapPin, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';

import { HeroAPhotoLed } from '@/components/heroes';
import {
  EditorialSplit,
  GuidedPicker,
  PersonaPathways,
  ProofBand,
  StatsRow,
  TestimonialGrid,
} from '@/components/sections';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { fallbackCourseTypes } from '@/config/content/public-fixtures';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCoursePath } from '@/lib/content/course-routes';
import {
  getCourseFinderData,
  getCourseNarrative,
  getExamCatalog,
  getPageHero,
  getSocialProof,
} from '@/lib/content/repository';
import type { ContentLocale, CourseNarrative, CourseTypeRow } from '@/lib/content/types';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Learn German in Bremen',
  description:
    'CASA combines human-centered teaching, clear learning pathways, and trusted exam preparation in Bremen.',
  path: '/',
  keywords: ['CASA Bremen', 'Learn German', 'Language school Bremen', 'telc Deutsch B2', 'telc C1 Hochschule'],
});

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const homepageCourseOrder = [
  'intensive-german',
  'evening-german',
  'special-courses',
  'german-for-groups',
  'medical-german',
  'in-company',
] as const;

const additionalProgramOrder = [
  'bildungszeit',
  'university-prep',
  'business-german',
] as const;

const homepageExamOrder = [
  'telc_b2',
  'telc_c1_hochschule',
] as const;

const homepageCourseTitles: Partial<Record<string, Record<ContentLocale, string>>> = {
  'intensive-german': {
    en: 'Intensive German',
    de: 'Intensiv Deutsch',
  },
  'evening-german': {
    en: 'Evening Course',
    de: 'Abendkurs',
  },
  'special-courses': {
    en: 'Special Courses',
    de: 'Spezialkurse',
  },
  'german-for-groups': {
    en: 'German for Groups',
    de: 'Deutsch für Gruppen',
  },
  'medical-german': {
    en: 'German for Medical',
    de: 'Deutsch für Medizin',
  },
  'in-company': {
    en: 'In-company courses',
    de: 'Firmenunterricht',
  },
};

const additionalProgramLabels: Record<string, Record<ContentLocale, string>> = {
  bildungszeit: {
    en: 'Bildungszeit',
    de: 'Bildungszeit',
  },
  'university-prep': {
    en: 'University preparation',
    de: 'Studienvorbereitung',
  },
  'business-german': {
    en: 'Business German',
    de: 'Business Deutsch',
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
  const accommodationPageConfig = getPublicPageConfig('accommodation', locale);
  const accommodationPhoto =
    accommodationPageConfig.photos.story ??
    accommodationPageConfig.photos.thumbA ??
    pageConfig.photos.accommodation;
  const rhythm = getLayoutRhythm('home');

  const [hero, finderData, examCatalog, stories] = await Promise.all([
    Promise.resolve(getPageHero('home', locale)),
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

  const homepageCoursePhotos = [
    pageConfig.photos.courseA,
    pageConfig.photos.courseB,
    pageConfig.photos.courseC,
    pageConfig.photos.courseD,
    pageConfig.photos.courseE,
    pageConfig.photos.courseF,
  ];

  const guidedCourses = guidedCourseRecords.map((course, index) => {
    const nextStart = finderData.nextStartByCourseId[course.id];
    const photo = homepageCoursePhotos[index % homepageCoursePhotos.length] ?? pageConfig.photos.story;

    return {
      id: `course-${course.slug}`,
      title: homepageCourseTitles[course.slug]?.[locale] ?? course.name,
      description:
        course.narrative?.promise ||
        (locale === 'de'
          ? 'Praxisnahe Lernziele mit klarer Struktur.'
          : 'Practical language outcomes with clear structure.'),
      bestFor:
        course.narrative?.audience ||
        (locale === 'de'
          ? 'Geeignet für internationale Lernende'
          : 'Best for: international learners'),
      href: getCoursePath(course.slug),
      ctaLabel: locale === 'de' ? 'Kursplan erkunden' : 'Explore course plan',
      meta: nextStart
        ? `${locale === 'de' ? 'Nächster Start' : 'Next start'}: ${formatDate(nextStart, locale)}`
        : undefined,
      media: {
        src: photo.src,
        alt: photo.alt,
      },
    };
  });

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
            : 'Additional programs for specific learning goals.'),
        href: getCoursePath(course.slug),
      };
    })
    .filter((program): program is NonNullable<typeof program> => program !== null);

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
              ? 'B2 Vorbereitungskurs'
              : 'B2 preparation course'
            : locale === 'de'
              ? 'C1 Hochschule Vorbereitungskurs'
              : 'C1 Hochschule preparation course',
        description:
          item.narrative?.summary ||
          (locale === 'de'
            ? 'Gezielte Vorbereitung mit Prüfungsstrategie, Simulation und Feedback.'
            : 'Focused preparation with exam strategy, simulation, and feedback.'),
        level: item.examType.level || '',
        href: examDetailHref(item.examType.code),
        nextDate: nextSession?.starts_at ? formatDate(nextSession.starts_at, locale) : null,
      };
    });

  const statsItems = locale === 'de'
    ? [
        {
          value: '30.000+',
          label: 'Begleitete Lernende',
        },
        {
          value: '150+',
          label: 'Herkunftsländer',
        },
        {
          value: '7-80+',
          label: 'Altersspanne',
        },
        {
          value: '45.000+',
          label: 'Kursbuchungen',
        },
      ]
    : [
        {
          value: '30,000+',
          label: 'Learners supported',
        },
        {
          value: '150+',
          label: 'Countries represented',
        },
        {
          value: '7-80+',
          label: 'Age range represented',
        },
        {
          value: '45,000+',
          label: 'Course bookings',
        },
      ];

  const featuredSource = stories[1] ?? stories[0];
  const featuredStoryId = featuredSource?.id;
  const nonFeaturedStories = stories.filter((story) => story.id !== featuredStoryId);
  const storiesForCards = nonFeaturedStories.length >= 2 ? nonFeaturedStories : stories;


  const testimonialCards = storiesForCards.map((story, index) => ({
    id: story.id,
    person: story.personDisplay,
    country: story.country,
    quote: story.quote,
    photoSrc:
      index % 3 === 0
        ? pageConfig.photos.testimonialA.src
        : index % 3 === 1
          ? pageConfig.photos.testimonialB.src
          : pageConfig.photos.testimonialC.src,
    photoAlt:
      index % 3 === 0
        ? pageConfig.photos.testimonialA.alt
        : index % 3 === 1
          ? pageConfig.photos.testimonialB.alt
          : pageConfig.photos.testimonialC.alt,
    photoCaption: '',
  }));


  const featuredQuote = featuredSource
    ? {
        quote: featuredSource.quote,
        person: featuredSource.personDisplay,
        role: featuredSource.country,
      }
    : {
        quote:
          locale === 'de'
            ? 'CASA hat mir geholfen, im Alltag sicherer Deutsch zu sprechen.'
            : 'CASA helped me speak German with more confidence in real life.',
        person: locale === 'de' ? 'CASA Lernende' : 'CASA learner',
        role: locale === 'de' ? 'Bremen' : 'Bremen',
      };

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

      <HeroAPhotoLed
        eyebrow={hero.eyebrow}
        title={
          locale === 'de'
            ? 'Deutsch lernen in Bremen - mit klarem Weg vom Kurs bis in den Alltag'
            : 'Learn German in Bremen with a clear path from course to everyday life'
        }
        description={
          locale === 'de'
            ? 'Sagen Sie uns, wo Sie starten. CASA hilft beim passenden Kurs, ergänzt Prüfungsvorbereitung, wenn ein Zertifikat wichtig ist, und unterstützt beim Ankommen in Bremen.'
            : 'Tell us where you are starting from. CASA helps you choose the right course, add exam preparation if you need a certificate, and settle into Bremen with practical support.'
        }
        proofLine={
          locale === 'de'
            ? 'Kursberatung, telc Vorbereitung und Ankommen in Bremen'
            : 'Course advice, telc preparation, and arrival support in Bremen'
        }
        badge={
          locale === 'de'
            ? 'Offizielles telc Prüfungszentrum'
            : 'Official telc exam center'
        }
        ctas={pageConfig.ctas}
        photo={pageConfig.photos.hero}
        trustBadges={hero.chips}
      />

      <section className="py-16 md:py-20" data-track-section="trust-and-search">
        <Container className="space-y-12 md:space-y-14">
          <ProofBand locale={locale} />
        </Container>
      </section>

      <section
        id="gemeinnuetzigkeit"
        className="border-y border-[color:var(--casa-sand)]/45 bg-white py-12 md:py-16"
        data-track-section="nonprofit-mission"
      >
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Gemeinnützige Sprachschule' : 'Non-profit language school'}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
                {locale === 'de'
                  ? 'Kursgebühren bleiben im Bildungsauftrag.'
                  : 'Course fees stay inside the education mission.'}
              </h2>
            </div>

            <div>
              <p className="max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {locale === 'de'
                  ? 'CASA ist eine gemeinnützige GmbH. Einnahmen werden in Unterrichtsqualität, faire Vergütung, Lernräume und soziale Bildungsprojekte reinvestiert - für Bildung, Völkerverständigung und Integration in Bremen.'
                  : 'CASA is a non-profit gGmbH. Income is reinvested in teaching quality, fair pay, learning spaces, and social education projects - supporting education, intercultural understanding, and integration in Bremen.'}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  locale === 'de' ? 'Keine Gewinnausschüttung' : 'No profit distribution',
                  locale === 'de' ? 'Reinvestition in Bildung' : 'Reinvestment in education',
                  locale === 'de' ? 'Integrationsprojekte' : 'Integration projects',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-lg bg-[var(--casa-warm-soft)]/32 px-4 py-3 text-sm font-bold text-[var(--casa-ink)]"
                  >
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild variant="marketing-dark">
                  <Link href="/ueber-uns/gemeinnuetzigkeit">
                    {locale === 'de' ? 'Gemeinnützigkeit lesen' : 'Read non-profit status'}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline-prism">
                  <Link href="/ueber-uns/gemeinnuetzigkeit#integrationsprojekte">
                    {locale === 'de' ? 'Projekte ansehen' : 'View projects'}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12 md:py-16" data-track-section="persona-pathways">
        <Container className="space-y-12 md:space-y-14">
          <PersonaPathways locale={locale} />
        </Container>
      </section>

      <section className="py-16 md:py-20" data-track-section="learning-journey">
        <Container className="space-y-12 md:space-y-14">
          <EditorialSplit
            eyebrow={locale === 'de' ? 'Warum CASA' : 'Why CASA'}
            title={
              locale === 'de'
                ? 'Kurs, Prüfung und Support in einem Plan'
                : 'The right course, exam path, and support in one plan'
            }
            description={
              locale === 'de'
                ? 'Sobald Ihr Ziel klar ist, hilft CASA, den passenden Kurs, Prüfungsvorbereitung und praktische Unterstützung zu verbinden.'
                : 'Once you know your goal, CASA helps you combine the right course, exam preparation, and practical support.'
            }
            bullets={[
              locale === 'de'
                ? 'Kursberatung nach Niveau, Zeitplan und Ziel'
                : 'Course advice based on your level, schedule, and goal',
              locale === 'de'
                ? 'telc Vorbereitung, wenn ein Zertifikat wichtig ist'
                : 'telc preparation when a certificate matters',
              locale === 'de'
                ? 'Unterkunft und Ankommen, wenn Sie nach Bremen kommen'
                : 'Accommodation and arrival support if you are coming to Bremen',
            ]}
            photo={pageConfig.photos.story}
          />

          <div id="course-recommendation" className="scroll-mt-28 md:scroll-mt-32">
            <GuidedPicker
              eyebrow={locale === 'de' ? 'Kurs finden' : 'Find your course'}
              title={
                locale === 'de'
                  ? 'Finden Sie das Kursformat, das zu Ihrem Ziel passt'
                  : 'Find the course format that matches your goal'
              }
              description={
                locale === 'de'
                  ? 'Starten Sie mit den wichtigsten Formaten. Wenn Sie unsicher sind, hilft CASA beim passenden Niveau und Lerntempo.'
                  : 'Start with the main formats. If you are unsure, CASA can help you choose the right level and pace.'
              }
              items={guidedCourses}
              locale={locale}
              presentation="courseSignalCards"
              showAccentRule={false}
              showBestFor={false}
            />
          </div>

          {additionalPrograms.length > 0 ? (
            <section className="rounded-xl bg-[color:var(--casa-warm-soft)]/32 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                    {locale === 'de' ? 'Weitere Programme' : 'Additional programs'}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[var(--casa-ink)]">
                    {locale === 'de'
                      ? 'Bildungszeit und besondere Wege'
                      : 'Bildungszeit and special pathways'}
                  </h3>
                </div>
                <Link
                  href="/courses"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-[var(--casa-ink)] shadow-[var(--shadow-soft)] border border-[color:var(--casa-sand)] transition-colors hover:border-[var(--casa-blue)]/35 hover:text-[var(--casa-accent-text)]"
                >
                  {locale === 'de' ? 'Alle Kurse erkunden' : 'Explore all courses'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {additionalPrograms.map((program) => (
                  <Link
                    key={program.href}
                    href={program.href}
                    className="group rounded-lg bg-white px-4 py-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                  >
                    <span className="text-base font-bold text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">
                      {program.title}
                    </span>
                    <span className="mt-2 line-clamp-2 block text-sm leading-relaxed text-[var(--casa-muted)]">
                      {program.description}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

        </Container>
      </section>

      {examPathways.length > 0 ? (
        <section
          id="exam-preparation"
          className="scroll-mt-28 bg-[var(--casa-ink-deep)] py-16 text-white md:scroll-mt-32 md:py-20"
          data-track-section="exam-preparation-pathways"
        >
          <Container>
            <div className="grid gap-8 lg:grid-cols-[0.78fr_minmax(0,1.22fr)] lg:items-end">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]">
                  {locale === 'de' ? 'Zertifikat geplant?' : 'Need a certificate?'}
                </p>
                <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                  {locale === 'de'
                    ? 'Ergänzen Sie Ihren Kursweg mit Prüfungsvorbereitung'
                    : 'Add exam preparation to your course plan'}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/72 md:text-lg">
                  {locale === 'de'
                    ? 'Nach der Kurswahl können Sie gezielt telc Deutsch B2 oder telc Deutsch C1 Hochschule vorbereiten - mit Prüfungstraining, Feedback und klarer Anmeldung.'
                    : 'After choosing a course, you can prepare for telc Deutsch B2 or telc Deutsch C1 Hochschule with exam training, feedback, and clear registration.'}
                </p>
                <Button
                  asChild
                  variant="marketing-sun"
                  className="mt-7"
                >
                  <Link href="/exams">
                    {locale === 'de' ? 'Prüfungsvorbereitung erkunden' : 'Explore exam preparation'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {examPathways.map((exam, index) => (
                  <Link
                    key={exam.href}
                    href={exam.href}
                    className="group flex min-h-[19rem] flex-col rounded-lg bg-white/[0.06] p-5 ring-1 ring-white/12 transition-all hover:-translate-y-0.5 hover:bg-white/[0.09] hover:ring-white/22 md:p-6"
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
                        {locale === 'de' ? 'Vorbereitung + Anmeldung' : 'Prep + registration'}
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
        className="scroll-mt-28 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,243,218,0.5))] py-16 md:scroll-mt-32 md:py-20"
        data-track-section="housing-and-life"
      >
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="relative overflow-hidden rounded-lg bg-[var(--casa-ink-deep)] shadow-[var(--shadow-modal)]">
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
                  ? 'Kursstart und Ankommen in Bremen werden zusammen geplant.'
                  : 'Course start and arrival in Bremen are planned together.'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Ankommen in Bremen' : 'Settling in Bremen'}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
                {locale === 'de'
                  ? 'Unterkunft als Support rund um den Kurs.'
                  : 'Accommodation as support around the course.'}
              </h2>
              <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {locale === 'de'
                  ? 'Wenn Sie für einen Kurs nach Bremen kommen, kann CASA bei WG, Gastfamilie und den nächsten Schritten helfen.'
                  : 'If you are coming to Bremen for a course, CASA can support shared-flat or host-family options and the next practical steps.'}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  locale === 'de' ? 'CASA WG' : 'CASA shared flat',
                  locale === 'de' ? 'Gastfamilie' : 'Host family',
                  locale === 'de' ? 'Klare Erwartungen' : 'Clear expectations',
                  locale === 'de' ? 'Anfragebasierte Verfügbarkeit' : 'Request-based availability',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-bold text-[var(--casa-ink)] ring-1 ring-[color:var(--casa-sand)]"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                    {item}
                  </div>
                ))}
              </div>

              <Button
                asChild
                variant="marketing-dark"
                className="mt-8"
              >
                <Link href="/accommodation">
                  {locale === 'de' ? 'Unterkunft erkunden' : 'Explore accommodation'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20" data-track-section="enrollment-steps">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'So geht es weiter' : 'How enrollment works'}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
                {locale === 'de' ? 'Vier Schritte bis zum Start.' : 'Four steps to start.'}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {locale === 'de'
                  ? 'Erst das Ziel, dann die Beratung, dann Kurs und Termine – ohne unnötige Umwege.'
                  : 'First the goal, then advice, then course and dates - without unnecessary detours.'}
              </p>
            </div>

            <ol className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: locale === 'de' ? 'Ziel wählen' : 'Choose your goal',
                  text: locale === 'de' ? 'Kurs, Prüfung, Beruf oder Wohnen.' : 'Course, exam, work, or housing.',
                  icon: Sparkles,
                },
                {
                  title: locale === 'de' ? 'Beratung bekommen' : 'Get course advice',
                  text: locale === 'de' ? 'Das Team klärt Niveau, Tempo und nächste Schritte.' : 'The team checks level, pace, and next steps.',
                  icon: MessageCircle,
                },
                {
                  title: locale === 'de' ? 'Kurs und Termine bestätigen' : 'Confirm course and dates',
                  text: locale === 'de' ? 'Sie sehen Format, Start und Anmeldung klar.' : 'You understand the format, start, and registration.',
                  icon: ShieldCheck,
                },
                {
                  title: locale === 'de' ? 'In Bremen starten' : 'Start learning in Bremen',
                  text: locale === 'de' ? 'Unterricht, Community und Alltag greifen zusammen.' : 'Class, community, and daily life connect.',
                  icon: MapPin,
                },
              ].map((step, index) => {
                const Icon = step.icon;

                return (
                  <li
                    key={step.title}
                    className="rounded-lg border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Icon className="h-6 w-6 text-[var(--casa-accent-text)]" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-[var(--casa-ink)]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{step.text}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20" data-track-section="proof-and-outcomes">
        <Container className="space-y-12 md:space-y-14">
          <StatsRow
            title={locale === 'de' ? 'Was Lernende bei CASA schätzen' : 'What learners value at CASA'}
            items={statsItems}
          />

          <TestimonialGrid
            title={
              locale === 'de'
                ? 'Echte Stimmen aus der CASA Community'
                : 'Real stories from the CASA community'
            }
            description={
              locale === 'de'
                ? 'Lernende berichten über Fortschritt, Vertrauen und Alltag in Bremen.'
                : 'Learners share stories about progress, confidence, and life in Bremen.'
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
