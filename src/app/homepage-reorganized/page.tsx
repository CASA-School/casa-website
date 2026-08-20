import type { Metadata } from 'next';
import { CasaImage as Image } from '@/components/ui/casa-image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { HeroAPhotoLed } from '@/components/heroes';
import {
  EditorialSplit,
  PersonaPathways,
  ProcessSteps,
  TestimonialGrid,
} from '@/components/sections';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Container } from '@/components/ui/container';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getCoursePath } from '@/lib/content/course-routes';
import { getContentLocale } from '@/lib/content/locale.server';
import {
  getCourseFinderData,
  getExamCatalog,
  getPageHero,
  getProofMetrics,
  getSocialProof,
} from '@/lib/content/repository';
import type { ContentLocale } from '@/lib/content/types';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: 'Reorganized Homepage Flow',
    description:
      'A review-only CASA homepage variant that reorganizes the existing homepage content into a clearer visitor journey.',
    path: '/homepage-reorganized',
    keywords: ['CASA Bremen', 'German courses Bremen', 'homepage flow'],
  }),
  robots: {
    index: false,
    follow: false,
  },
};

const primaryCourseOrder = [
  'intensive-german',
  'evening-german',
  'german-for-groups',
  'special-courses',
  'medical-german',
  'in-company',
] as const;

/**
 * Formats that sit outside the four main routes.
 *
 * 'university-prep' and 'business-german' used to be listed here. CASA does not
 * offer either -- they were development placeholders that rendered to the public
 * as real products. See docs/CONTENT_PARITY_WITH_CASA_BREMEN_DE.md.
 */
const additionalProgramOrder = ['bildungszeit'] as const;

const courseTitleOverrides: Partial<Record<string, Record<ContentLocale, string>>> = {
  'intensive-german': {
    en: 'Intensive German',
    de: 'Intensiv Deutsch',
  },
  'evening-german': {
    en: 'Evening Course',
    de: 'Abendkurs',
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
    en: 'Private lessons / Firmenunterricht',
    de: 'Privatunterricht / Firmenunterricht',
  },
};

const additionalProgramLabels: Record<string, Record<ContentLocale, string>> = {
  bildungszeit: {
    en: 'Bildungszeit',
    de: 'Bildungszeit',
  },
  'medical-german': {
    en: 'German for Medical',
    de: 'Deutsch für Medizin',
  },
  'in-company': {
    en: 'Firmenunterricht',
    de: 'Firmenunterricht',
  },
};

function formatDate(value: string, locale: ContentLocale) {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function examDetailHref(code: string) {
  if (code === 'telc_b2') {
    return '/exams/b2';
  }

  if (code === 'telc_c1_hochschule') {
    return '/exams/c1';
  }

  return '/exams';
}

function getCourseGroupCopy(groupId: 'everyday' | 'focused' | 'professional', locale: ContentLocale) {
  const copy = {
    everyday: {
      en: {
        eyebrow: 'Everyday German',
        title: 'Start with the weekly rhythm',
        description: 'The broadest starting points for learners who need structure, progress, and practice.',
      },
      de: {
        eyebrow: 'Alltagsdeutsch',
        title: 'Mit dem Wochenrhythmus starten',
        description: 'Die wichtigsten Einstiege für Lernende, die Struktur, Fortschritt und Praxis brauchen.',
      },
    },
    focused: {
      en: {
        eyebrow: 'Focused German',
        title: 'Solve a specific learning gap',
        description: 'Smaller formats for speaking, writing, grammar, groups, or short targeted modules.',
      },
      de: {
        eyebrow: 'Gezieltes Deutsch',
        title: 'Eine konkrete Lernlücke schließen',
        description: 'Kleinere Formate für Sprechen, Schreiben, Grammatik, Gruppen oder kurze Module.',
      },
    },
    professional: {
      en: {
        eyebrow: 'Work German',
        title: 'Use German in professional settings',
        description: 'Specialized German for medical communication, teams, and company-specific needs.',
      },
      de: {
        eyebrow: 'Deutsch im Beruf',
        title: 'Deutsch beruflich einsetzen',
        description: 'Spezialisiertes Deutsch für Medizin, Teams und firmenspezifische Ziele.',
      },
    },
  } as const;

  return copy[groupId][locale];
}

export default async function HomepageReorganizedPage() {
  const locale = await getContentLocale();
  const pageConfig = getPublicPageConfig('home', locale);
  const accommodationPageConfig = getPublicPageConfig('accommodation', locale);

  const [hero, proofMetrics, finderData, examCatalog, stories] = await Promise.all([
    Promise.resolve(getPageHero('home', locale)),
    Promise.resolve(getProofMetrics(locale)),
    getCourseFinderData(locale),
    getExamCatalog(locale),
    Promise.resolve(getSocialProof(locale)),
  ]);

  const proofSince = proofMetrics.find((item) => item.value.includes('1983')) ?? proofMetrics[0];
  const proofLearners = proofMetrics.find((item) => item.value.includes('30')) ?? proofMetrics[1];
  const trustProofItems = [
    {
      value: proofSince?.value ?? (locale === 'de' ? 'Seit 1983' : 'Since 1983'),
      label: locale === 'de' ? 'Unabhängige Sprachschule' : 'Independent language school',
    },
    {
      value: proofLearners?.value ?? (locale === 'de' ? '30.000+' : '30,000+'),
      label: locale === 'de' ? 'Begleitete Lernende' : 'Learners supported',
    },
    {
      value: 'telc',
      label: locale === 'de' ? 'Prüfungszentrum' : 'Exam center',
    },
    {
      value: locale === 'de' ? 'Wohnen' : 'Housing',
      label: locale === 'de' ? 'Unterkunftssupport' : 'Accommodation support',
    },
  ];

  const coursesBySlug = new Map(finderData.courses.map((course) => [course.slug, course]));
  const courseCards = primaryCourseOrder
    .map((slug) => coursesBySlug.get(slug))
    .filter((course): course is NonNullable<typeof course> => course !== undefined)
    .map((course) => {
      const levelRange = [course.level_min, course.level_max]
        .filter((item): item is string => Boolean(item))
        .join(' - ');
      const nextStart = finderData.nextStartByCourseId[course.id];

      return {
        slug: course.slug,
        title: courseTitleOverrides[course.slug]?.[locale] ?? course.name,
        description:
          course.narrative?.promise ??
          (locale === 'de'
            ? 'Praxisnahe Lernziele mit klarer Struktur.'
            : 'Practical language outcomes with clear structure.'),
        audience:
          course.narrative?.audience ??
          (locale === 'de'
            ? 'Für internationale Lernende mit klarem Deutschziel.'
            : 'For international learners with a clear German goal.'),
        href: getCoursePath(course.slug),
        meta: [
          levelRange || null,
          nextStart ? `${locale === 'de' ? 'Nächster Start' : 'Next start'} ${formatDate(nextStart, locale)}` : null,
        ].filter((item): item is string => Boolean(item)),
      };
    });

  const courseGroups = [
    {
      id: 'everyday' as const,
      slugs: ['intensive-german', 'evening-german'],
    },
    {
      id: 'focused' as const,
      slugs: ['german-for-groups', 'special-courses'],
    },
    {
      id: 'professional' as const,
      slugs: ['medical-german', 'in-company'],
    },
  ].map((group) => ({
    ...group,
    copy: getCourseGroupCopy(group.id, locale),
    courses: courseCards.filter((course) => group.slugs.includes(course.slug)),
  }));

  const additionalPrograms = additionalProgramOrder
    .map((slug) => coursesBySlug.get(slug))
    .filter((course): course is NonNullable<typeof course> => course !== undefined)
    .map((course) => ({
      title: additionalProgramLabels[course.slug]?.[locale] ?? course.name,
      description:
        course.narrative?.audience ??
        (locale === 'de'
          ? 'Ergänzende Programme für besondere Lernziele.'
          : 'Additional programs for specific learning goals.'),
      href: getCoursePath(course.slug),
    }));

  const examPathways = ['telc_b2', 'telc_c1_hochschule']
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
          item.narrative?.summary ??
          (locale === 'de'
            ? 'Gezielte Vorbereitung mit Prüfungsstrategie, Simulation und Feedback.'
            : 'Focused preparation with exam strategy, simulation, and feedback.'),
        level: item.examType.level || '',
        href: examDetailHref(item.examType.code),
        nextDate: nextSession?.starts_at ? formatDate(nextSession.starts_at, locale) : null,
      };
    });

  const accommodationOptions = [
    {
      key: 'flat',
      title: 'CASA WG',
      subtitle: locale === 'de' ? 'Selbstständig wohnen' : 'Independent living',
      description:
        locale === 'de'
          ? 'Für Lernende, die ihren eigenen Rhythmus wollen und trotzdem CASA Support beim Ankommen brauchen.'
          : 'For learners who want their own rhythm and still need CASA support when settling in.',
      href: '/accommodation/flat',
      image: accommodationPageConfig.photos.thumbA,
    },
    {
      key: 'host',
      title: locale === 'de' ? 'Gastfamilie' : 'Host family',
      subtitle: locale === 'de' ? 'Deutsch im Alltag' : 'German in daily life',
      description:
        locale === 'de'
          ? 'Für Lernende, die Orientierung, Familienalltag und tägliche Sprachpraxis suchen.'
          : 'For learners who want orientation, family routine, and daily language practice.',
      href: '/accommodation/host',
      image: accommodationPageConfig.photos.thumbB,
    },
  ];

  const statsItems =
    locale === 'de'
      ? [
          { value: '30.000+', label: 'Begleitete Lernende' },
          { value: '150+', label: 'Herkunftsländer' },
          { value: '7-80+', label: 'Altersspanne' },
          { value: '45.000+', label: 'Kursbuchungen' },
        ]
      : [
          { value: '30,000+', label: 'Learners supported' },
          { value: '150+', label: 'Countries represented' },
          { value: '7-80+', label: 'Age range represented' },
          { value: '45,000+', label: 'Course bookings' },
        ];

  const featuredSource = stories[1] ?? stories[0];
  const featuredStoryId = featuredSource?.id;
  const nonFeaturedStories = stories.filter((story) => story.id !== featuredStoryId);
  const storiesForCards = nonFeaturedStories.length >= 2 ? nonFeaturedStories : stories;
  // No portraits. These are CASA's real published testimonials with real first
  // names, and the three testimonial images are synthetic — cycling them by
  // index put a generated face on a named learner. CLAUDE.md hard rule 2.
  const testimonialCards = storiesForCards.map((story) => ({
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
    : {
        quote:
          locale === 'de'
            ? 'CASA hat mir geholfen, im Alltag sicherer Deutsch zu sprechen.'
            : 'CASA helped me speak German with more confidence in real life.',
        person: locale === 'de' ? 'CASA Lernende' : 'CASA learner',
        role: 'Bremen',
      };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'CASA Reorganized Homepage Flow',
    url: toAbsoluteUrl('/homepage-reorganized'),
    inLanguage: locale,
  };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-homepage-experiment="reorganized-existing">
      <JsonLdScript id="homepage-reorganized-schema" data={websiteSchema} />

      <HeroAPhotoLed
        eyebrow={hero.eyebrow}
        title={
          locale === 'de'
            ? 'Deutsch lernen in Bremen mit persönlicher Begleitung'
            : 'Learn German in Bremen with personal support'
        }
        description={
          locale === 'de'
            ? 'CASA verbindet Deutschkurse, Prüfungsvorbereitung und praktische Hilfe beim Ankommen in Bremen.'
            : 'CASA combines German courses, exam preparation, and practical help for settling into Bremen.'
        }
        ctas={[
          {
            label: locale === 'de' ? 'Kurs finden' : 'Find my course',
            href: '#courses',
            kind: 'primary',
          },
          {
            label: locale === 'de' ? 'Beratung anfragen' : 'Talk to an advisor',
            href: '/contact',
            kind: 'secondary',
          },
        ]}
        photo={pageConfig.photos.hero}
      />

      <section
        className="border-y border-[color:var(--casa-sand)] bg-white py-5"
        data-reveal-disabled="true"
        data-track-section="reorganized-trust-proof"
      >
        <Container>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustProofItems.map((item) => (
              <div
                key={`${item.value}-${item.label}`}
                className="rounded-lg bg-[color:var(--casa-warm-soft)]/35 px-4 py-4 ring-1 ring-[color:var(--casa-sand)]"
              >
                <dt className="text-2xl font-black leading-none text-[var(--casa-ink)]">{item.value}</dt>
                <dd className="mt-2 text-sm font-bold leading-snug text-[var(--casa-muted)]">{item.label}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <nav
        aria-label={locale === 'de' ? 'Startseitenbereiche' : 'Homepage sections'}
        className="sticky top-16 z-20 border-b border-[color:var(--casa-sand)] bg-white/92 py-3 backdrop-blur-xl"
      >
        <Container>
          <div className="flex gap-2 overflow-x-auto">
            {[
              { label: locale === 'de' ? 'Weg' : 'Path', href: '#path' },
              { label: locale === 'de' ? 'Warum CASA' : 'Why CASA', href: '#why-casa' },
              { label: locale === 'de' ? 'Kurse' : 'Courses', href: '#courses' },
              { label: locale === 'de' ? 'Prüfungen' : 'Exams', href: '#exams' },
              { label: locale === 'de' ? 'Wohnen' : 'Accommodation', href: '#accommodation' },
              { label: locale === 'de' ? 'Anmeldung' : 'Enrollment', href: '#enrollment' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex h-9 shrink-0 items-center rounded-full border border-[color:var(--casa-sand)] bg-white px-4 text-sm font-black text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/35 hover:text-[var(--casa-accent-text)]"
              >
                {item.label}
              </a>
            ))}
          </div>
        </Container>
      </nav>

      <section
        id="path"
        className="py-14 md:py-18"
        data-reveal-disabled="true"
        data-track-section="reorganized-pathways"
      >
        <Container className="space-y-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
              {locale === 'de' ? 'Entscheidungsstart' : 'Decision gateway'}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-5xl">
              {locale === 'de' ? 'Erst das Ziel, dann der Kurs.' : 'Start with the goal, then choose the course.'}
            </h2>
          </div>
          <PersonaPathways locale={locale} />
        </Container>
      </section>

      <section
        id="why-casa"
        className="bg-[linear-gradient(180deg,rgba(255,243,218,0.4),rgba(255,255,255,0.96))] py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="reorganized-why-casa"
      >
        <Container>
          <EditorialSplit
            eyebrow={locale === 'de' ? 'Warum CASA' : 'Why CASA'}
            title={
              locale === 'de'
                ? 'Ein Ort für Kurs, Prüfung und Ankommen'
                : 'One place for courses, exams, and settling in'
            }
            description={
              locale === 'de'
                ? 'Sobald das Ziel klar ist, verbindet CASA den passenden Deutschkurs mit Prüfungsvorbereitung, Unterkunftssupport und persönlicher Orientierung.'
                : 'Once the goal is clear, CASA connects the right German course with exam preparation, accommodation support, and personal guidance.'
            }
            bullets={[
              locale === 'de'
                ? 'Deutschkurse für Alltag, Studium und Beruf'
                : 'German courses for daily life, study, and work',
              locale === 'de'
                ? 'telc Vorbereitung mit Strategie und Feedback'
                : 'telc preparation with strategy and feedback',
              locale === 'de'
                ? 'Unterkunft und Community als praktische Begleitung'
                : 'Accommodation and community as practical support',
            ]}
            photo={pageConfig.photos.story}
          />
        </Container>
      </section>

      <section
        id="courses"
        className="py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="reorganized-course-groups"
      >
        <Container className="space-y-8 md:space-y-10">
          <div className="grid gap-5 md:grid-cols-[0.82fr_1.18fr] md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Kursformate' : 'Course formats'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-5xl">
                {locale === 'de' ? 'Kurse in drei Entscheidungen.' : 'Courses in three decisions.'}
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
              {locale === 'de'
                ? 'Statt alle Formate gleich stark zu zeigen, gruppiert diese Version die vorhandenen Kurskarten nach Alltag, Fokus und Beruf.'
                : 'Instead of showing every format equally, this version groups the existing course cards by everyday, focused, and professional goals.'}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {courseGroups.map((group) => (
              <article
                key={group.id}
                className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-card)] md:p-6"
              >
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                  {group.copy.eyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-[var(--casa-ink)]">{group.copy.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{group.copy.description}</p>
 
                <div className="mt-6 space-y-3">
                  {group.courses.map((course) => (
                    <Link
                      key={course.href}
                      href={course.href}
                      className="group block rounded-lg border border-transparent bg-[color:var(--casa-warm-soft)]/35 p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--casa-blue)]/35 hover:bg-white shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft)]"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-lg font-black leading-tight text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">
                          {course.title}
                        </span>
                        <ArrowRight
                          className="mt-1 h-4 w-4 shrink-0 text-[var(--casa-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--casa-accent-text)]"
                          aria-hidden
                        />
                      </span>
                      <span className="mt-2 block text-sm leading-relaxed text-[var(--casa-muted)]">
                        {course.audience}
                      </span>
                      <span className="mt-3 block text-sm font-bold text-[var(--casa-ink)]">{course.description}</span>
                      {course.meta.length > 0 ? (
                        <span className="mt-3 flex flex-wrap gap-2">
                          {course.meta.map((meta) => (
                            <span
                              key={meta}
                              className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--casa-muted)] ring-1 ring-[color:var(--casa-sand)]"
                            >
                              {meta}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {additionalPrograms.length > 0 ? (
            <section className="rounded-xl bg-[color:var(--casa-warm-soft)]/35 p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                    {locale === 'de' ? 'Weitere Programme' : 'Additional programs'}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[var(--casa-ink)]">
                    {locale === 'de' ? 'Spezielle Wege, wenn das Ziel klarer wird' : 'Special pathways once the goal gets clearer'}
                  </h3>
                </div>
                <Link
                  href="/courses"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-[var(--casa-ink)] shadow-[var(--shadow-soft)] border border-slate-200 transition-colors hover:border-[var(--casa-blue)]/35 hover:text-[var(--casa-accent-text)]"
                >
                  {locale === 'de' ? 'Alle Kurse ansehen' : 'See all courses'}
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
                    <span className="text-base font-black text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">
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
          id="exams"
          className="bg-[var(--casa-ink-deep)] py-16 text-white md:py-20"
          data-reveal-disabled="true"
          data-track-section="reorganized-exams"
        >
          <Container>
            <div className="grid gap-8 lg:grid-cols-[0.78fr_minmax(0,1.22fr)] lg:items-start">
              <div className="max-w-xl">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-sun)]">
                  {locale === 'de' ? 'Prüfungsvorbereitung' : 'Exam preparation'}
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                  {locale === 'de'
                    ? 'Zertifikat geplant? Dann gehört telc direkt nach den Kursen.'
                    : 'Need a certificate? telc belongs right after courses.'}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/72 md:text-lg">
                  {locale === 'de'
                    ? 'Diese Reihenfolge zeigt zuerst die Kurswahl und danach die naheliegende Prüfungsvorbereitung.'
                    : 'This order shows course choice first, then the natural next step: exam preparation.'}
                </p>
                <Link
                  href="/exams"
                  className="group mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--casa-sun)] px-6 text-sm font-black text-[var(--casa-ink-deep)] transition-all hover:-translate-y-0.5 hover:bg-white"
                >
                  {locale === 'de' ? 'Prüfungsvorbereitung erkunden' : 'Explore exam preparation'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {examPathways.map((exam, index) => (
                  <Link
                    key={exam.href}
                    href={exam.href}
                    className="group flex min-h-[18rem] flex-col rounded-lg bg-white/[0.06] p-5 ring-1 ring-white/12 transition-all hover:-translate-y-0.5 hover:bg-white/[0.09] hover:ring-white/22 md:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {exam.nextDate ? (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/76">
                          {locale === 'de' ? 'Nächste Prüfung' : 'Next exam'}: {exam.nextDate}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-7 text-sm font-black uppercase tracking-[0.12em] text-[var(--casa-sun)]">
                      {exam.title}
                    </p>
                    <h3 className="mt-3 text-2xl font-black leading-tight text-white">{exam.prepTitle}</h3>
                    <p className="mt-4 text-sm leading-relaxed text-white/68">{exam.description}</p>

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
        id="accommodation"
        className="bg-[linear-gradient(180deg,rgba(255,243,218,0.56),rgba(255,255,255,0.92))] py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="reorganized-accommodation"
      >
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.72fr_minmax(0,1.28fr)] lg:items-start">
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Wohnen in Bremen' : 'Living in Bremen'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-5xl">
                {locale === 'de'
                  ? 'Unterkunft unterstützt den Kursstart.'
                  : 'Accommodation supports the course start.'}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {locale === 'de'
                  ? 'Hier konkurriert Wohnen nicht mit dem Kursangebot. Es wird als praktische Hilfe für Lernende gezeigt, die nach Bremen kommen.'
                  : 'Here, housing does not compete with the course offer. It appears as practical support for learners coming to Bremen.'}
              </p>
              <Link
                href="/accommodation"
                className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--casa-ink-deep)] px-6 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--casa-ink-deep-hover)]"
              >
                {locale === 'de' ? 'Unterkunft erkunden' : 'Explore accommodation'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {accommodationOptions.map((option, index) => (
                <Link
                  key={option.key}
                  href={option.href}
                  className="group overflow-hidden rounded-lg bg-white shadow-[var(--shadow-modal)] ring-1 ring-[color:var(--casa-sand)] transition-all hover:-translate-y-1 hover:ring-[var(--casa-blue)]/35"
                >
                  <div className="relative h-56 overflow-hidden md:h-64">
                    <Image
                      src={option.image.src}
                      alt={option.image.alt}
                      fill
                      sizes="(min-width: 1024px) 34vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,23,42,0.54)] via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--casa-ink)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex min-h-[14rem] flex-col p-5 md:p-6">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                      {option.subtitle}
                    </p>
                    <h3 className="mt-3 text-2xl font-black leading-tight text-[var(--casa-ink)]">{option.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{option.description}</p>
                    <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-[var(--casa-ink)]">
                      {locale === 'de' ? 'Option ansehen' : 'See option'}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section
        id="enrollment"
        className="py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="reorganized-enrollment"
      >
        <Container>
          <ProcessSteps
            eyebrow={locale === 'de' ? 'Anmeldung' : 'Enrollment'}
            title={locale === 'de' ? 'Was passiert als Nächstes?' : 'What happens next?'}
            description={
              locale === 'de'
                ? 'Der Prozess kommt erst, nachdem Angebot, Prüfung und Unterkunft klar sind.'
                : 'The process appears after the offer, exam path, and accommodation support are clear.'
            }
            steps={[
              {
                step: '1',
                title: locale === 'de' ? 'Ziel wählen' : 'Choose your goal',
                description:
                  locale === 'de'
                    ? 'Kurs, Prüfung, Beruf oder Wohnen als Startpunkt festlegen.'
                    : 'Pick course, exam, work, or housing as the starting point.',
              },
              {
                step: '2',
                title: locale === 'de' ? 'Beratung bekommen' : 'Get course advice',
                description:
                  locale === 'de'
                    ? 'Niveau, Tempo und passende Optionen mit CASA klären.'
                    : 'Clarify level, pace, and suitable options with CASA.',
              },
              {
                step: '3',
                title: locale === 'de' ? 'Kurs und Termine bestätigen' : 'Confirm course and dates',
                description:
                  locale === 'de'
                    ? 'Format, Starttermin und Anmeldung verbindlich sortieren.'
                    : 'Sort format, start date, and registration clearly.',
              },
              {
                step: '4',
                title: locale === 'de' ? 'In Bremen starten' : 'Start learning in Bremen',
                description:
                  locale === 'de'
                    ? 'Unterricht, Community und Alltag verbinden.'
                    : 'Connect class, community, and daily life.',
              },
            ]}
            cta={
              locale === 'de'
                ? { label: 'Jetzt starten', href: '/courses' }
                : { label: 'Start now', href: '/courses' }
            }
          />
        </Container>
      </section>

      <section
        className="bg-[color:var(--casa-warm-soft)]/35 py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="reorganized-stories"
      >
        <Container className="space-y-12 md:space-y-14">
          <section className="rounded-lg bg-[var(--casa-ink-deep)] p-5 text-white shadow-[var(--shadow-modal)] md:p-6">
            <h2 className="text-2xl font-black leading-tight text-white md:text-3xl">
              {locale === 'de' ? 'Warum Lernende CASA vertrauen' : 'Why learners trust CASA'}
            </h2>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statsItems.map((item, index) => (
                <div
                  key={`${item.value}-${item.label}`}
                  className="rounded-lg bg-white/[0.06] p-4 ring-1 ring-white/10"
                >
                  <dt className="tabular-nums text-3xl font-black leading-none text-white">
                    {item.value}
                  </dt>
                  <dd className="mt-3 text-xs font-bold uppercase leading-snug tracking-[0.08em] text-white/68">
                    {item.label}
                  </dd>
                  <span
                    className={[
                      'mt-4 block h-1 w-10 rounded-full',
                      index % 4 === 0 ? 'bg-[var(--casa-blue)]' : '',
                      index % 4 === 1 ? 'bg-[var(--casa-sun)]' : '',
                      index % 4 === 2 ? 'bg-[var(--casa-red)]' : '',
                      index % 4 === 3 ? 'bg-white' : '',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </dl>
          </section>

          <TestimonialGrid
            title={locale === 'de' ? 'Echte Stimmen nach dem Angebot' : 'Real stories after the offer'}
            description={
              locale === 'de'
                ? 'Stimmen kommen bewusst später: Besucher wissen jetzt, wofür CASA steht.'
                : 'Stories come later on purpose: visitors now understand what CASA offers.'
            }
            cards={testimonialCards}
            featuredQuote={featuredQuote}
            locale={locale}
          />
        </Container>
      </section>

      <section
        className="py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="reorganized-final-cta"
      >
        <Container>
          <div className="grid gap-7 rounded-lg border border-[color:var(--casa-sand)] bg-[linear-gradient(135deg,var(--casa-ink-deep)_0%,var(--casa-ink-panel)_70%,color-mix(in_srgb,var(--casa-blue)_22%,var(--casa-ink-panel))_100%)] p-6 text-white shadow-[var(--shadow-hero)] md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-sun)]">
                {locale === 'de' ? 'Nächster Schritt' : 'Next step'}
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-5xl">
                {locale === 'de'
                  ? 'Bereit, den passenden Deutschkurs in Bremen zu finden?'
                  : 'Ready to find the right German course in Bremen?'}
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Link
                href="/courses"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--casa-sun)] px-6 text-sm font-black text-[var(--casa-ink-deep)] transition-colors hover:bg-white"
              >
                {locale === 'de' ? 'Kurs finden' : 'Find my course'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/24 bg-white/8 px-6 text-sm font-black text-white transition-colors hover:bg-white hover:text-[var(--casa-ink-deep)]"
              >
                {locale === 'de' ? 'Beratung anfragen' : 'Talk to an advisor'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
