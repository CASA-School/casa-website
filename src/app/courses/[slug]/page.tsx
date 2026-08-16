import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { SpecialCourseCatalogue } from '@/components/courses/special-course-catalogue';
import { HeroCUtilityRail } from '@/components/heroes';
import { DecisionRail, EditorialSplit, ProcessSteps, TestimonialGrid } from '@/components/sections';
import { CourseLevelGoals } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCanonicalCourseRouteSlug, getCoursePath } from '@/lib/content/course-routes';
import { formatCoursePrice, isQuoteOnly } from '@/lib/content/course-pricing';
import { getCourseArchetype, archetypeAllowsFact, nextStepsHeading } from '@/config/courses/archetypes';
import type { CourseFactKey } from '@/config/courses/archetypes';
import { getCourseLevelGoals, getCoursePhotoKey, getCourseProfile } from '@/config/courses/course-profiles';
import { getCourseContact, hasNamedCourseContact } from '@/config/courses/course-profiles';
import { getCourseDetail, getCourses, getSocialProof, getTeamSpotlights } from '@/lib/content/repository';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCourseDetail(slug, 'en');

  if (!detail) {
    return createPublicMetadata({
      title: 'Course detail',
      description: 'CASA course detail',
      path: `/courses/${getCanonicalCourseRouteSlug(slug)}`,
    });
  }

  return createPublicMetadata({
    // createPublicMetadata already appends "| CASA Bremen"
    title: detail.course.name,
    description: detail.course.narrative?.promise || 'Course detail',
    path: `/courses/${getCanonicalCourseRouteSlug(slug)}`,
    keywords: [detail.course.name, 'CASA course detail', 'German learning outcomes'],
  });
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ instance?: string }>;
}) {
  const locale = await getContentLocale();
  const { slug } = await params;
  const { instance } = await searchParams;
  const canonicalSlug = getCanonicalCourseRouteSlug(slug);

  if (canonicalSlug !== slug) {
    const query = typeof instance === 'string' ? `?instance=${encodeURIComponent(instance)}` : '';
    redirect(`/courses/${canonicalSlug}${query}`);
  }

  const rhythm = getLayoutRhythm('course-detail');
  const pageConfig = getPublicPageConfig('course-detail', locale);

  const [detail, courses, socialProof, teamSpotlights] = await Promise.all([
    getCourseDetail(slug, locale),
    getCourses(locale),
    Promise.resolve(getSocialProof(locale)),
    Promise.resolve(getTeamSpotlights(locale)),
  ]);

  if (!detail) {
    notFound();
  }

  const requestedInstanceId = typeof instance === 'string' ? instance : '';
  const selectedInstance =
    detail.instances.find((courseInstance) => courseInstance.id === requestedInstanceId) ?? detail.instances[0];
  const selectedStartOptions = detail.instances.map((courseInstance) => ({
    value: courseInstance.id,
    label: formatDate(courseInstance.start_date, locale),
    href: `${getCoursePath(detail.course.slug)}?instance=${encodeURIComponent(courseInstance.id)}`,
  }));
  const coursePhotoKey = getCoursePhotoKey(detail.course.slug);
  const coursePhoto = pageConfig.photos[coursePhotoKey] ?? pageConfig.photos.supportCard;
  const courseStoryPhoto = pageConfig.photos[`${coursePhotoKey}Story`] ?? coursePhoto;
  const courseLevelGoals = getCourseLevelGoals(detail.course.slug, locale);
  const archetype = getCourseArchetype(getCourseProfile(detail.course.slug)?.archetype);

  // Each course format has an Ansprechpartner. Formats without a confirmed
  // owner fall back to the general office rather than naming someone who has
  // not agreed to answer.
  const courseContact = getCourseContact(detail.course.slug);
  const namedContact = hasNamedCourseContact(detail.course.slug);
  const contactLine = namedContact
    ? locale === 'de'
      ? `Ihre Ansprechpartnerin: ${courseContact.name}, ${courseContact.role.de}.`
      : `Your contact: ${courseContact.name}, ${courseContact.role.en}.`
    : locale === 'de'
      ? 'Fragen beantwortet das CASA Kursberatungsteam.'
      : 'The CASA course advice team answers questions on this format.';
  const beginnerTrack = (detail.course.level_min ?? 'A1').toUpperCase().startsWith('A');

  // Quote-only products (group packages, Firmenunterricht) are bought by an
  // organiser on behalf of others, so the learner registration wizard is the
  // wrong destination. They need a briefing conversation instead. This is the
  // CTA half of the `package-inquiry` archetype in
  // docs/COPY_AND_COURSE_ARCHETYPE_REVIEW.md.
  const quoteOnly = isQuoteOnly(detail.course);
  const quoteTopic = detail.course.slug === 'in-company' ? 'company-courses' : 'group-booking';

  const primaryDecisionCta = quoteOnly
    ? {
        label: locale === 'de' ? 'Angebot anfragen' : 'Request a quote',
        href: `/contact?topic=${quoteTopic}`,
        kind: 'primary' as const,
      }
    : beginnerTrack
      ? {
          label: locale === 'de' ? 'Einstufung zuerst buchen' : 'Book placement first',
          href: '/placement-test',
          kind: 'primary' as const,
        }
      : {
          label: locale === 'de' ? 'Jetzt registrieren' : 'Register now',
          href: selectedInstance ? `/registration/course?courseId=${selectedInstance.id}` : '/registration/course',
          kind: 'primary' as const,
        };

  const secondaryDecisionCta = quoteOnly
    ? {
        label: locale === 'de' ? 'Programm besprechen' : 'Talk through the programme',
        href: `/contact?topic=${quoteTopic}`,
        kind: 'secondary' as const,
      }
    : {
        label: locale === 'de' ? 'Beratung anfragen' : 'Request guidance',
        href: '/contact?topic=Course advice',
        kind: 'secondary' as const,
      };

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Kurse' : 'Courses', href: '/courses' },
    { label: detail.course.name },
  ];

  // The rail is built from the archetype's permitted facts, not from a fixed
  // list. A package-inquiry page cannot render a price or a start date because
  // its archetype does not list them.
  type FactRow = {
    label: string;
    value: string;
    selector?: { selectedValue: string; options: typeof selectedStartOptions };
  };

  const factRows: Partial<Record<CourseFactKey, FactRow>> = {
    'next-start': {
      label: locale === 'de' ? 'Nächster Start' : 'Next start date',
      value: selectedInstance
        ? formatDate(selectedInstance.start_date, locale)
        : locale === 'de'
          ? 'Wird bekannt gegeben'
          : 'To be announced',
      selector:
        archetype.showsStartDateSelector && selectedStartOptions.length > 1 && selectedInstance
          ? {
              selectedValue: selectedInstance.id,
              options: selectedStartOptions,
            }
          : undefined,
    },
    duration: {
      label: locale === 'de' ? 'Dauer' : 'Duration',
      value: selectedInstance
        ? `${formatDate(selectedInstance.start_date, locale)} - ${formatDate(selectedInstance.end_date, locale)}`
        : locale === 'de'
          ? 'Auf Anfrage'
          : 'On request',
    },
    'lessons-per-week': {
      label: locale === 'de' ? 'Lektionen/Woche' : 'Lessons/week',
      value: String(detail.course.lessons_per_week),
    },
    'level-range': {
      label: locale === 'de' ? 'Niveaubereich' : 'Level range',
      value: `${detail.course.level_min || 'A1'} - ${detail.course.level_max || 'C1'}`,
    },
    price: {
      label: locale === 'de' ? 'Preis' : 'Price',
      value: formatCoursePrice(detail.course, locale),
    },
    'group-size': {
      label: locale === 'de' ? 'Gruppengröße' : 'Group size',
      value: locale === 'de' ? 'Nach Absprache' : 'By arrangement',
    },
    included: {
      label: locale === 'de' ? 'Inklusive' : 'Included',
      value:
        locale === 'de'
          ? 'Unterricht, Kulturprogramm, Unterkunft'
          : 'Lessons, culture programme, accommodation',
    },
    'lead-time': {
      label: locale === 'de' ? 'Vorlaufzeit' : 'Lead time',
      value: locale === 'de' ? 'Frühzeitig anfragen' : 'Enquire early',
    },
  };

  const infoItems = archetype.facts
    .filter((fact) => archetypeAllowsFact(archetype, fact))
    .map((fact) => factRows[fact])
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  /*
   * The hero rail already lists every fact this archetype permits. The sticky
   * body rail follows the reader down the page, so it repeats only the facts
   * that carry the decision at the moment they are ready to act.
   *
   * Before this, both rails rendered the identical five rows AND a four-tile
   * `#course-summary` strip sat between them — the same facts three times
   * inside one 1500px viewport. See docs/PREMIUM_UI_REVIEW_2026-08-16.md §1.5.
   */
  const decisionFactOrder: CourseFactKey[] = ['price', 'next-start', 'lead-time', 'lessons-per-week'];
  const decisionItems = decisionFactOrder
    .filter((fact) => archetypeAllowsFact(archetype, fact))
    .map((fact) => factRows[fact])
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .slice(0, 2);

  const related = courses.filter((course) => course.slug !== detail.course.slug).slice(0, 2);

  const testimonialPortraits = [
    pageConfig.photos.testimonialA,
    pageConfig.photos.testimonialB,
    pageConfig.photos.testimonialC,
  ];
  const testimonialCards = socialProof.map((story, index) => ({
    id: story.id,
    person: story.personDisplay,
    country: story.country,
    quote: story.quote,
    photoSrc: testimonialPortraits[index % testimonialPortraits.length].src,
    photoAlt: testimonialPortraits[index % testimonialPortraits.length].alt,
    photoCaption: '',
  }));

  const spotlightTeacher =
    teamSpotlights.find((member) => member.role.toLowerCase().includes('teacher')) ?? teamSpotlights[0] ?? null;

  const processHeading = nextStepsHeading(archetype, locale);
  const processDescription =
    archetype.cta === 'request-quote'
      ? locale === 'de'
        ? 'Von der ersten Anfrage bis zum bestätigten Programm.'
        : 'From first enquiry to a confirmed programme.'
      : locale === 'de'
        ? 'So geht es weiter bis zum ersten Unterrichtstag.'
        : 'What happens next before your first class day.';

  // Quote products have a different journey: nobody registers, someone briefs.
  const processStepItems =
    archetype.cta === 'request-quote'
      ? [
          {
            step: '1',
            title: locale === 'de' ? 'Anfrage senden' : 'Send your enquiry',
            description:
              locale === 'de'
                ? 'Gruppengröße, Alter, Zeitraum und Schwerpunkte.'
                : 'Group size, ages, dates, and what you want to focus on.',
          },
          {
            step: '2',
            title: locale === 'de' ? 'Programm abstimmen' : 'Shape the programme',
            description:
              locale === 'de'
                ? 'Unterricht, Kulturprogramm und Unterkunft gemeinsam planen.'
                : 'We plan lessons, culture programme, and accommodation together.',
          },
          {
            step: '3',
            title: locale === 'de' ? 'Angebot erhalten' : 'Receive your quote',
            description:
              locale === 'de'
                ? 'Unverbindliches Angebot mit allen Leistungen und Kosten.'
                : 'A no-obligation quote covering everything included.',
          },
        ]
      : [
          {
            step: '1',
            title: locale === 'de' ? 'Anmeldung abschließen' : 'Complete registration',
            description: locale === 'de' ? 'Terminauswahl und Datenbestätigung.' : 'Select date and confirm learner details.',
          },
          {
            step: '2',
            title: locale === 'de' ? 'Einstufung bestätigen' : 'Confirm placement',
            description: locale === 'de' ? 'Niveauabgleich für passgenauen Einstieg.' : 'Placement alignment for a better fit.',
          },
          {
            step: '3',
            title: locale === 'de' ? 'Start vorbereiten' : 'Prepare your start',
            description: locale === 'de' ? 'Unterlagen, Zeitplan, optional Unterkunft.' : 'Materials, schedule, optional housing support.',
          },
        ];

  // "For whom" bullets were identical on all nine pages. An organiser needs
  // different reassurance than a learner picking a start date.
  const audienceTitle =
    archetype.cta === 'request-quote'
      ? locale === 'de'
        ? 'Für Gruppen, die mit einem klaren Ziel nach Bremen kommen'
        : 'For groups coming to Bremen with a clear goal'
      : locale === 'de'
        ? 'Dieser Kurs passt zu Lernenden, die Struktur und Menschlichkeit suchen'
        : 'This course fits learners who want structure and human support';

  const audienceBullets =
    archetype.cta === 'request-quote'
      ? [
          locale === 'de' ? 'Inhalte und Tempo nach Absprache' : 'Content and pace agreed with you',
          locale === 'de' ? 'Unterkunft und Kulturprogramm organisiert' : 'Accommodation and culture programme arranged',
          locale === 'de' ? 'Eine Ansprechperson von der Anfrage bis zur Abreise' : 'One contact from enquiry through to departure',
        ]
      : [
          locale === 'de' ? 'Klare Lernziele pro Woche' : 'Clear weekly learning goals',
          locale === 'de' ? 'Praxisorientierte Aufgaben und Feedback' : 'Practice tasks with direct feedback',
          locale === 'de' ? 'Nächste Schritte Richtung Prüfung oder Alltag' : 'Next-step orientation for exams or daily life',
        ];

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: detail.course.name,
    description: detail.course.narrative?.promise || '',
    provider: {
      '@type': 'EducationalOrganization',
      name: 'CASA Internationale Sprachschule Bremen',
      url: toAbsoluteUrl('/'),
    },
  };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />

      <HeroCUtilityRail
        eyebrow={locale === 'de' ? 'Kursdetail' : 'Course detail'}
        title={detail.course.name}
        description={detail.course.narrative?.promise || (locale === 'de' ? 'Klarer Lernweg mit messbaren Schritten.' : 'Clear learning path with measurable progress.')}
        breadcrumbs={breadcrumbs}
        infoTitle={locale === 'de' ? 'Kursinfo' : 'Course info'}
        infoItems={infoItems}
        notes={
          archetype.cta === 'request-quote'
            ? contactLine
            : locale === 'de'
              ? 'Termine und Verfügbarkeit werden bei der Anmeldung bestätigt.'
              : 'Dates and availability are confirmed during registration.'
        }
        ctas={[primaryDecisionCta, secondaryDecisionCta]}
        photo={{
          ...coursePhoto,
          caption: coursePhoto.caption,
        }}
        themeClassName="hero-theme-courses"
      />

      <section className="py-16 md:py-20">
        <Container className="space-y-12 md:space-y-14">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div className="space-y-12 md:space-y-14">
              {archetype.sections.map((sectionKey) => {
                switch (sectionKey) {
                case 'module-catalogue':
                  return <SpecialCourseCatalogue key={sectionKey} locale={locale} />;

                case 'level-goals':
                  return (
                  <CourseLevelGoals
                    key={sectionKey}
                    eyebrow={locale === 'de' ? 'Kursziele' : 'Course Goals'}
                    title={courseLevelGoals.title}
                    description={courseLevelGoals.description}
                    levels={courseLevelGoals.levels}
                    practices={
                      detail.course.narrative?.outcomes || [
                        locale === 'de' ? 'Aktive Kommunikation in Alltagssituationen' : 'Active communication in everyday situations',
                        locale === 'de' ? 'Präziser Einsatz zentraler Grammatikstrukturen' : 'More precise grammar usage in context',
                        locale === 'de' ? 'Flüssigeres Verstehen und Sprechen' : 'Stronger listening and speaking fluency',
                      ]
                    }
                    practiceTitle={locale === 'de' ? 'Das üben Sie' : 'What you will practice'}
                    locale={locale}
                  />
                  );

                case 'audience':
                  return (
                  <EditorialSplit
                    key={sectionKey}
                    eyebrow={locale === 'de' ? 'Für wen' : 'For whom'}
                    title={audienceTitle}
                    description={
                      detail.course.narrative?.audience ||
                      (locale === 'de'
                        ? 'Geeignet für Lernende, die klare Ziele mit persönlicher Begleitung verbinden möchten.'
                        : 'Ideal for learners who want clear outcomes with personal teaching support.')
                    }
                    bullets={audienceBullets}
                    photo={{
                      ...courseStoryPhoto,
                      caption: courseStoryPhoto.caption,
                    }}
                  />
                  );

                case 'next-steps':
                  return (
                  <ProcessSteps
                    key={sectionKey}
                    eyebrow={processHeading.eyebrow}
                    title={processHeading.title}
                    description={processDescription}
                    steps={processStepItems}
                    cta={{
                      label: primaryDecisionCta.label,
                      href: primaryDecisionCta.href,
                    }}
                  />
                  );

                case 'testimonials':
                  return (
                  <TestimonialGrid
                    key={sectionKey}
                    title={locale === 'de' ? 'Wie Lernende diesen Kurs erleben' : 'How learners describe this course'}
                    description={
                      locale === 'de'
                        ? 'Stimmen aus Kursalltag und Lernfortschritt.'
                        : 'Stories from classroom rhythm and language progress.'
                    }
                    cards={testimonialCards}
                    locale={locale}
                  />
                  );
                case 'related-courses':
                  return (
                  <section key={sectionKey} className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                        {locale === 'de' ? 'Weitere Optionen' : 'Related routes'}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--casa-ink)]">
                        {locale === 'de' ? 'Andere Kurswege vergleichen' : 'Compare other course paths'}
                      </h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {related.map((course) => {
                        const relatedPhoto = pageConfig.photos[getCoursePhotoKey(course.slug)] ?? pageConfig.photos.supportCard;

                        return (
                          <Link
                            key={course.id}
                            href={getCoursePath(course.slug)}
                            className="group grid overflow-hidden rounded-lg bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/75 transition-all hover:-translate-y-0.5 hover:ring-[var(--casa-blue)]/35 sm:grid-cols-[8.5rem_minmax(0,1fr)]"
                          >
                            <div className="casa-media-overlay casa-media-overlay-card relative min-h-36 sm:min-h-full">
                              <Image
                                src={relatedPhoto.src}
                                alt={relatedPhoto.alt}
                                fill
                                sizes="(min-width: 768px) 9rem, 92vw"
                                className="object-cover"
                              />
                            </div>
                            <div className="p-4">
                              <h3 className="text-lg font-bold leading-tight text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">{course.name}</h3>
                              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--casa-muted)]">
                                {course.narrative?.promise || (locale === 'de' ? 'Strukturierter Deutschkurs mit klaren nächsten Schritten.' : 'Structured German course with clear next steps.')}
                              </p>
                              <p className="mt-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                                {course.level_min || 'A1'} - {course.level_max || 'C1'} · {course.lessons_per_week} {locale === 'de' ? 'Lektionen/Woche' : 'lessons/week'}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                  );
                default:
                  return null;
                }
              })}
            </div>

            <DecisionRail
              locale={locale}
              infoTitle={locale === 'de' ? 'Ihre Entscheidung' : 'Your decision'}
              infoItems={decisionItems.length > 0 ? decisionItems : infoItems}
              notes={contactLine}
              ctas={[primaryDecisionCta, secondaryDecisionCta]}
              deadlineIso={selectedInstance?.start_date}
              teacher={spotlightTeacher}
            />
          </div>
        </Container>
      </section>
    </main>
  );
}
