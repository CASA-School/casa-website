import type { Metadata } from 'next';
import { CasaImage as Image } from '@/components/ui/casa-image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Home,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import { HeroAPhotoLed } from '@/components/heroes';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
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
    title: 'Alternative German Course Landing Page',
    description:
      'A review-only alternative CASA landing page organized around course choice, support, enrollment, and trust.',
    path: '/landing-page-alt',
    keywords: ['CASA Bremen', 'German courses Bremen', 'telc exam center Bremen'],
  }),
  robots: {
    index: false,
    follow: false,
  },
};

const courseGroups = [
  {
    id: 'everyday-german',
    slugs: ['intensive-german', 'evening-german'] as const,
  },
  {
    id: 'focused-german',
    slugs: ['german-for-groups', 'special-courses'] as const,
  },
  {
    id: 'work-german',
    slugs: ['medical-german', 'in-company'] as const,
  },
] as const;

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
    en: 'German for groups',
    de: 'Deutsch für Gruppen',
  },
  'medical-german': {
    en: 'German for medical professionals',
    de: 'Deutsch für Medizin',
  },
  'in-company': {
    en: 'Private lessons / Firmenunterricht',
    de: 'Privatunterricht / Firmenunterricht',
  },
};

const pathwayAccentClassNames = [
  'border-[var(--casa-blue)]/30 bg-[linear-gradient(180deg,#fff_0%,color-mix(in_srgb,var(--casa-blue)_8%,#fff)_100%)] text-[var(--casa-accent-text)]',
  'border-[var(--casa-sun)]/55 bg-[linear-gradient(180deg,#fff_0%,color-mix(in_srgb,var(--casa-sun)_16%,#fff)_100%)] text-[var(--casa-gold-deep)]',
  'border-[var(--casa-red)]/22 bg-[linear-gradient(180deg,#fff_0%,color-mix(in_srgb,var(--casa-red)_7%,#fff)_100%)] text-[var(--casa-red)]',
  'border-[var(--casa-ink-deep)]/16 bg-[linear-gradient(180deg,#fff_0%,color-mix(in_srgb,var(--casa-ink-deep)_7%,#fff)_100%)] text-[var(--casa-ink-deep)]',
];

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

function getGroupCopy(groupId: (typeof courseGroups)[number]['id'], locale: ContentLocale) {
  const copy = {
    'everyday-german': {
      en: {
        eyebrow: 'Everyday German',
        title: 'Build the weekly rhythm first',
        description: 'Start from A1 or continue your level with a course rhythm that keeps language moving.',
      },
      de: {
        eyebrow: 'Alltagsdeutsch',
        title: 'Zuerst den passenden Lernrhythmus finden',
        description: 'Von A1 starten oder auf dem aktuellen Niveau weiterlernen - mit einem klaren Kursrhythmus.',
      },
    },
    'focused-german': {
      en: {
        eyebrow: 'Focused practice',
        title: 'Work on the exact gap',
        description: 'Use smaller formats when you need speaking, grammar, writing, or a specific skill boost.',
      },
      de: {
        eyebrow: 'Gezielte Praxis',
        title: 'An der konkreten Lücke arbeiten',
        description: 'Kleinere Formate helfen bei Sprechen, Grammatik, Schreiben oder einem klaren Lernziel.',
      },
    },
    'work-german': {
      en: {
        eyebrow: 'Work German',
        title: 'Use German professionally',
        description: 'Prepare for workplace communication, medical settings, or company-specific language needs.',
      },
      de: {
        eyebrow: 'Deutsch im Beruf',
        title: 'Deutsch professionell einsetzen',
        description: 'Für Arbeitskommunikation, Medizin oder firmenspezifische Sprachziele.',
      },
    },
  } as const;

  return copy[groupId][locale];
}

function getPathways(locale: ContentLocale) {
  return locale === 'de'
    ? [
        {
          title: 'Neue Lernende',
          description: 'Starten Sie mit A1 oder finden Sie Ihr aktuelles Niveau.',
          action: 'Anfängeroptionen ansehen',
          href: '#everyday-german',
          icon: BookOpen,
        },
        {
          title: 'Berufstätige',
          description: 'Verbessern Sie Deutsch für Arbeit, Kommunikation und Alltag.',
          action: 'Berufliche Kurse ansehen',
          href: '#work-german',
          icon: Briefcase,
        },
        {
          title: 'Prüfungskandidaten',
          description: 'Bereiten Sie telc B2, C1 Hochschule oder Zertifikatsziele vor.',
          action: 'Prüfungsvorbereitung',
          href: '#exams',
          icon: GraduationCap,
        },
        {
          title: 'Wohnen & Ankommen',
          description: 'Kombinieren Sie Kursstart mit Unterkunft und Orientierung.',
          action: 'Unterkunftssupport',
          href: '#accommodation',
          icon: Home,
        },
      ]
    : [
        {
          title: 'New learners',
          description: 'Start German from A1 or continue from your current level.',
          action: 'Show beginner options',
          href: '#everyday-german',
          icon: BookOpen,
        },
        {
          title: 'Working professionals',
          description: 'Improve German for work, communication, and daily life.',
          action: 'Courses for professionals',
          href: '#work-german',
          icon: Briefcase,
        },
        {
          title: 'Exam candidates',
          description: 'Prepare for telc B2, C1 Hochschule, or certificate goals.',
          action: 'Exam preparation',
          href: '#exams',
          icon: GraduationCap,
        },
        {
          title: 'Housing + onboarding',
          description: 'Connect your course start with arrival and accommodation support.',
          action: 'Accommodation support',
          href: '#accommodation',
          icon: Home,
        },
      ];
}

export default async function AlternativeLandingPage() {
  const locale = await getContentLocale();
  const pageConfig = getPublicPageConfig('home', locale);
  const accommodationConfig = getPublicPageConfig('accommodation', locale);
  const accommodationPhoto =
    accommodationConfig.photos.story ??
    accommodationConfig.photos.thumbA ??
    pageConfig.photos.accommodation;

  const [hero, proofMetrics, finderData, examCatalog, stories] = await Promise.all([
    Promise.resolve(getPageHero('home', locale)),
    Promise.resolve(getProofMetrics(locale)),
    getCourseFinderData(locale),
    getExamCatalog(locale),
    Promise.resolve(getSocialProof(locale)),
  ]);

  const proofSince = proofMetrics.find((item) => item.value.includes('1983')) ?? proofMetrics[0];
  const proofLearners = proofMetrics.find((item) => item.value.includes('30')) ?? proofMetrics[1];
  const proofItems = [
    {
      value: proofSince?.value ?? (locale === 'de' ? 'Seit 1983' : 'Since 1983'),
      label: locale === 'de' ? 'Sprachschule in Bremen' : 'Language school in Bremen',
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
  const courseCardsBySlug = new Map(
    finderData.courses.map((course) => {
      const nextStart = finderData.nextStartByCourseId[course.id];
      const levelRange = [course.level_min, course.level_max]
        .filter((item): item is string => Boolean(item))
        .join(' - ');

      return [
        course.slug,
        {
          title: courseTitleOverrides[course.slug]?.[locale] ?? course.name,
          audience:
            course.narrative?.audience ??
            (locale === 'de'
              ? 'Für Lernende mit einem klaren Deutschziel.'
              : 'For learners with a clear German goal.'),
          promise:
            course.narrative?.promise ??
            (locale === 'de'
              ? 'Klarer Unterricht mit direktem Feedback.'
              : 'Clear teaching with direct feedback.'),
          href: getCoursePath(course.slug),
          meta: [
            levelRange || null,
            nextStart ? `${locale === 'de' ? 'Start' : 'Starts'} ${formatDate(nextStart, locale)}` : null,
          ].filter((item): item is string => Boolean(item)),
        },
      ] as const;
    })
  );

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
        href: examDetailHref(item.examType.code),
        meta: nextSession?.starts_at
          ? `${locale === 'de' ? 'Nächster Termin' : 'Next session'} ${formatDate(nextSession.starts_at, locale)}`
          : item.examType.level,
      };
    });

  const pathways = getPathways(locale);
  const featuredStory = stories[1] ?? stories[0];
  const storyCards = stories.filter((story) => story.id !== featuredStory?.id).slice(0, 2);

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Alternative CASA Landing Page',
    url: toAbsoluteUrl('/landing-page-alt'),
    inLanguage: locale,
  };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <JsonLdScript id="alternative-landing-page-schema" data={websiteSchema} />

      <HeroAPhotoLed
        eyebrow={hero.eyebrow}
        title={
          locale === 'de'
            ? 'Deutsch lernen in Bremen mit persönlicher Begleitung'
            : 'Learn German in Bremen with personal support'
        }
        description={
          locale === 'de'
            ? 'CASA hilft vom passenden Kurs über Prüfungsvorbereitung bis zum Alltag in Bremen - klar, menschlich und Schritt für Schritt.'
            : 'CASA helps you move from the right course to exam preparation and everyday life in Bremen - clearly, personally, and step by step.'
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
        className="border-y border-[color:var(--casa-sand)] bg-white/86 py-5 backdrop-blur"
        data-reveal-disabled="true"
        data-track-section="alt-trust-bar"
      >
        <Container>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {proofItems.map((item) => (
              <div
                key={`${item.value}-${item.label}`}
                className="rounded-lg bg-[color:var(--casa-warm-soft)]/34 px-4 py-4 ring-1 ring-[color:var(--casa-sand)]/70"
              >
                <dt className="text-2xl font-black leading-none text-[var(--casa-ink)]">{item.value}</dt>
                <dd className="mt-2 text-sm font-bold leading-snug text-[var(--casa-muted)]">{item.label}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <nav
        aria-label={locale === 'de' ? 'Seitenbereiche' : 'Page sections'}
        className="sticky top-16 z-20 border-b border-[color:var(--casa-sand)] bg-white/92 py-3 backdrop-blur-xl"
      >
        <Container>
          <div className="flex gap-2 overflow-x-auto">
            {[
              { label: locale === 'de' ? 'Weg' : 'Path', href: '#path' },
              { label: locale === 'de' ? 'Kurse' : 'Courses', href: '#courses' },
              { label: locale === 'de' ? 'Prüfungen' : 'Exams', href: '#exams' },
              { label: locale === 'de' ? 'Wohnen' : 'Accommodation', href: '#accommodation' },
              { label: locale === 'de' ? 'Anmeldung' : 'Enrollment', href: '#enrollment' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex h-9 shrink-0 items-center rounded-full border border-[color:var(--casa-sand)] bg-white px-4 text-sm font-black text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/35 hover:text-[var(--casa-accent-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)]"
              >
                {item.label}
              </a>
            ))}
          </div>
        </Container>
      </nav>

      <section
        id="path"
        className="py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="alt-pathways"
      >
        <Container className="space-y-8 md:space-y-10">
          <div className="grid gap-5 md:grid-cols-[0.78fr_1.22fr] md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Wo soll ich starten?' : 'Where should I start?'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-5xl">
                {locale === 'de' ? 'Wählen Sie zuerst Ihr Ziel.' : 'Choose your path first.'}
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
              {locale === 'de'
                ? 'Jeder Einstieg führt direkt zum passenden Teil der Seite: Kurs, Beruf, Prüfung oder Wohnen.'
                : 'Each starting point moves directly into the matching part of the page: course, work, exam, or housing.'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pathways.map((pathway, index) => {
              const Icon = pathway.icon;

              return (
                <a
                  key={pathway.title}
                  href={pathway.href}
                  className={`group flex min-h-[18rem] flex-col justify-between rounded-lg border p-6 shadow-[var(--shadow-modal)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-hero)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)] ${pathwayAccentClassNames[index]}`}
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white text-current shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)]">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>

                  <span>
                    <span className="block text-2xl font-black leading-tight text-[var(--casa-ink)]">
                      {pathway.title}
                    </span>
                    <span className="mt-3 block text-sm leading-relaxed text-[var(--casa-muted)]">
                      {pathway.description}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-2 text-sm font-black text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">
                    {pathway.action}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </a>
              );
            })}
          </div>
        </Container>
      </section>

      <section
        className="bg-[linear-gradient(180deg,rgba(255,243,218,0.36),rgba(255,255,255,0.96))] py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="alt-why-casa"
      >
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Warum CASA' : 'Why CASA'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-4xl">
                {locale === 'de'
                  ? 'Kurs, Prüfung und Alltag gehören zusammen.'
                  : 'Course, exam, and everyday life belong together.'}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {locale === 'de'
                  ? 'Sobald Ihr Ziel klar ist, kombiniert CASA den passenden Kurs, Prüfungsvorbereitung und praktische Begleitung für den Alltag in Bremen.'
                  : 'Once you know your goal, CASA helps you combine the right course, exam preparation, and practical support around life in Bremen.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: BookOpen,
                  title: locale === 'de' ? 'Deutschkurs' : 'German courses',
                  text: locale === 'de' ? 'Klare Formate für Alltag, Studium und Beruf.' : 'Clear formats for daily life, study, and work.',
                },
                {
                  icon: GraduationCap,
                  title: locale === 'de' ? 'telc Vorbereitung' : 'telc preparation',
                  text: locale === 'de' ? 'Prüfungstraining mit Strategie und Feedback.' : 'Exam training with strategy and feedback.',
                },
                {
                  icon: Home,
                  title: locale === 'de' ? 'Unterkunft' : 'Accommodation',
                  text: locale === 'de' ? 'Unterstützung beim Ankommen in Bremen.' : 'Support for settling into Bremen.',
                },
                {
                  icon: Users,
                  title: locale === 'de' ? 'Gemeinschaft' : 'Community',
                  text: locale === 'de' ? 'Persönliche Begleitung vor und nach dem Unterricht.' : 'Personal guidance before and after class.',
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]"
                  >
                    <Icon className="h-6 w-6 text-[var(--casa-accent-text)]" aria-hidden />
                    <h3 className="mt-4 text-xl font-black text-[var(--casa-ink)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section
        id="courses"
        className="py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="alt-courses"
      >
        <Container className="space-y-8 md:space-y-10">
          <div className="grid gap-5 md:grid-cols-[0.82fr_1.18fr] md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Kursformate' : 'Course formats'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-5xl">
                {locale === 'de' ? 'Der richtige Kurs folgt dem Ziel.' : 'The right course follows the goal.'}
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
              {locale === 'de'
                ? 'Die Formate sind gebündelt, damit die Auswahl nicht wie eine lange Liste wirkt.'
                : 'Formats are grouped so the choice feels like a decision, not a long list.'}
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {courseGroups.map((group) => {
              const copy = getGroupCopy(group.id, locale);

              return (
                <a
                  key={group.id}
                  href={`#${group.id}`}
                  className="inline-flex h-9 shrink-0 items-center rounded-full bg-[color:var(--casa-warm-soft)] px-4 text-sm font-black text-[var(--casa-ink)] ring-1 ring-[color:var(--casa-sand)] transition-colors hover:text-[var(--casa-accent-text)]"
                >
                  {copy.eyebrow}
                </a>
              );
            })}
            <a
              href="#exams"
              className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--casa-ink-deep)] px-4 text-sm font-black text-white transition-colors hover:bg-[var(--casa-accent-surface)]"
            >
              {locale === 'de' ? 'Prüfungsvorbereitung' : 'Exam prep'}
            </a>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {courseGroups.map((group) => {
              const copy = getGroupCopy(group.id, locale);
              const groupCourses = group.slugs
                .map((slug) => coursesBySlug.get(slug) ? courseCardsBySlug.get(slug) : null)
                .filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined);

              return (
                <section
                  key={group.id}
                  id={group.id}
                  className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-card)] md:p-6"
                >
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                    {copy.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-black leading-tight text-[var(--casa-ink)]">{copy.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.description}</p>
 
                  <div className="mt-6 space-y-3">
                    {groupCourses.map((course) => (
                      <Link
                        key={course.href}
                        href={course.href}
                        className="group block rounded-lg border border-transparent bg-[color:var(--casa-warm-soft)]/35 p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--casa-blue)]/35 hover:bg-white shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft)]"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-lg font-black leading-tight text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">
                            {course.title}
                          </span>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--casa-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--casa-accent-text)]" aria-hidden />
                        </span>
                        <span className="mt-2 block text-sm leading-relaxed text-[var(--casa-muted)]">
                          {course.audience}
                        </span>
                        <span className="mt-3 block text-sm font-bold text-[var(--casa-ink)]">
                          {course.promise}
                        </span>
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
                </section>
              );
            })}
          </div>
        </Container>
      </section>

      <section
        id="exams"
        className="bg-[var(--casa-ink-deep)] py-16 text-white md:py-20"
        data-reveal-disabled="true"
        data-track-section="alt-exams"
      >
        <Container>
          <div className="grid gap-9 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-sun)]">
                {locale === 'de' ? 'Zertifikat geplant?' : 'Need a certificate?'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                {locale === 'de'
                  ? 'Kurswahl und Prüfungsvorbereitung greifen ineinander.'
                  : 'Course choice and exam preparation work together.'}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/72 md:text-lg">
                {locale === 'de'
                  ? 'CASA unterstützt Lernende bei telc Vorbereitung, Hochschulwegen und der passenden Anmeldung.'
                  : 'CASA supports learners preparing for telc exams, university-related German pathways, and the right registration step.'}
              </p>
              <Button
                asChild
                className="mt-7 h-12 rounded-full bg-[var(--casa-sun)] px-6 text-sm font-black text-[var(--casa-ink-deep)] hover:bg-white"
              >
                <Link href="/exams">
                  {locale === 'de' ? 'Prüfungsvorbereitung erkunden' : 'Explore exam preparation'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ...examPathways,
                {
                  title: locale === 'de' ? 'telc Prüfungszentrum' : 'telc exam center',
                  prepTitle: locale === 'de' ? 'Anmeldung und Orientierung' : 'Registration and guidance',
                  description:
                    locale === 'de'
                      ? 'Das Team hilft beim nächsten sinnvollen Schritt vor der Prüfung.'
                      : 'The team helps you understand the most sensible next step before exam day.',
                  href: '/exams',
                  meta: locale === 'de' ? 'Bremen' : 'Bremen',
                },
              ].map((exam, index) => (
                <Link
                  key={`${exam.title}-${index}`}
                  href={exam.href}
                  className="group flex min-h-[18rem] flex-col rounded-lg bg-white/[0.07] p-5 ring-1 ring-white/12 transition-all hover:-translate-y-0.5 hover:bg-white/[0.1] hover:ring-white/24"
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-6 text-sm font-black uppercase tracking-[0.12em] text-[var(--casa-sun)]">
                    {exam.title}
                  </p>
                  <h3 className="mt-3 text-2xl font-black leading-tight text-white">{exam.prepTitle}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-white/68">{exam.description}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-white">
                    {exam.meta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section
        id="accommodation"
        className="bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,243,218,0.5))] py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="alt-accommodation"
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
              <p className="absolute inset-x-0 bottom-0 p-5 text-base font-black text-white md:p-6">
                {locale === 'de'
                  ? 'Kursstart und Ankommen in Bremen werden zusammen geplant.'
                  : 'Course start and arrival in Bremen are planned together.'}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Ankommen in Bremen' : 'Settling in Bremen'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-5xl">
                {locale === 'de'
                  ? 'Unterkunft als Support rund um den Kurs.'
                  : 'Accommodation as support around the course.'}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
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
                className="mt-8 h-12 rounded-full bg-[var(--casa-ink-deep)] px-6 text-sm font-black text-white hover:bg-[var(--casa-ink-deep-hover)]"
              >
                <Link href="/accommodation">
                  {locale === 'de' ? 'Unterkunft erkunden' : 'Explore accommodation'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section
        id="enrollment"
        className="py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="alt-enrollment"
      >
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'So geht es weiter' : 'How enrollment works'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-5xl">
                {locale === 'de' ? 'Vier Schritte bis zum Start.' : 'Four steps to start.'}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {locale === 'de'
                  ? 'Erst das Ziel, dann die Beratung, dann Kurs und Termine - ohne unnötige Umwege.'
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
                      <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-muted)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-black text-[var(--casa-ink)]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{step.text}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </Container>
      </section>

      <section
        className="bg-[color:var(--casa-warm-soft)]/38 py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="alt-stories"
      >
        <Container className="space-y-8">
          <div className="grid gap-5 md:grid-cols-[0.82fr_1.18fr] md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Stimmen aus der Community' : 'Learner stories'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-5xl">
                {locale === 'de' ? 'Menschen finden ihren Weg.' : 'People find their path.'}
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
              {locale === 'de'
                ? 'Nach Angebot und Ablauf prüfen Besucher, ob Menschen wie sie bei CASA wirklich weiterkommen.'
                : 'After the offer and process, visitors need to see whether people like them make progress here.'}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            {featuredStory ? (
              <figure className="rounded-lg bg-[var(--casa-ink-deep)] p-6 text-white shadow-[var(--shadow-modal)] md:p-8">
                <blockquote className="text-2xl font-black leading-tight md:text-3xl">
                  &quot;{featuredStory.quote}&quot;
                </blockquote>
                <figcaption className="mt-8 text-sm font-bold text-white/68">
                  {featuredStory.personDisplay} - {featuredStory.country}
                </figcaption>
              </figure>
            ) : null}

            <div className="grid gap-4">
              {storyCards.map((story, index) => (
                <article
                  key={story.id}
                  className="grid gap-4 rounded-lg bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)] sm:grid-cols-[7rem_1fr]"
                >
                  <div className="relative min-h-[7rem] overflow-hidden rounded-lg bg-[var(--casa-warm-soft)]">
                    <Image
                      src={
                        index % 3 === 0
                          ? pageConfig.photos.testimonialA.src
                          : index % 3 === 1
                            ? pageConfig.photos.testimonialB.src
                            : pageConfig.photos.testimonialC.src
                      }
                      alt={
                        index % 3 === 0
                          ? pageConfig.photos.testimonialA.alt
                          : index % 3 === 1
                            ? pageConfig.photos.testimonialB.alt
                            : pageConfig.photos.testimonialC.alt
                      }
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm leading-relaxed text-[var(--casa-muted)]">&quot;{story.quote}&quot;</p>
                    <p className="mt-4 text-sm font-black text-[var(--casa-ink)]">
                      {story.personDisplay} - {story.country}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section
        className="py-16 md:py-20"
        data-reveal-disabled="true"
        data-track-section="alt-final-cta"
      >
        <Container>
          <div className="grid gap-7 rounded-lg border border-[color:var(--casa-sand)] bg-[linear-gradient(135deg,var(--casa-ink-deep)_0%,var(--casa-ink-panel)_68%,color-mix(in_srgb,var(--casa-blue)_24%,var(--casa-ink-panel))_100%)] p-6 text-white shadow-[var(--shadow-hero)] md:grid-cols-[1fr_auto] md:items-center md:p-8">
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
              <Button
                asChild
                className="h-12 rounded-full bg-[var(--casa-sun)] px-6 text-sm font-black text-[var(--casa-ink-deep)] hover:bg-white"
              >
                <Link href="/courses">
                  {locale === 'de' ? 'Kurs finden' : 'Find my course'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-full border-white/24 bg-white/8 px-6 text-sm font-black text-white hover:bg-white hover:text-[var(--casa-ink-deep)]"
              >
                <Link href="/contact">
                  {locale === 'de' ? 'Beratung anfragen' : 'Talk to an advisor'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
