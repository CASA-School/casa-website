import type { Metadata } from 'next';
import { CasaImage as Image } from '@/components/ui/casa-image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CoursePracticalDetails } from '@/components/courses/course-practical-details';
import { CourseTermTable } from '@/components/courses/course-term-table';
import type { CourseTermGroup } from '@/components/courses/course-term-table';
import { SpecialCourseCatalogue } from '@/components/courses/special-course-catalogue';
import { HeroCUtilityRail } from '@/components/heroes';
import { DecisionRail, EditorialSplit, ProcessSteps, TestimonialGrid } from '@/components/sections';
import { CourseLevelGoals } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCanonicalCourseRouteSlug, getCourseContentSlug, getCoursePath } from '@/lib/content/course-routes';
import { formatCoursePrice, isQuoteOnly } from '@/lib/content/course-pricing';
import { getCourseArchetype, archetypeAllowsFact, nextStepsHeading } from '@/config/courses/archetypes';
import type { CourseFactKey } from '@/config/courses/archetypes';
import { getCourseLevelGoals, getCoursePhotoKey, getCourseProfile, getQuoteAudience } from '@/config/courses/course-profiles';
import { getCourseAudienceContent, getCourseNextSteps } from '@/config/courses/course-page-content';
import { ContactInquiryForm } from '@/components/forms/contact-inquiry-form';
import { cn } from '@/lib/utils';
import { contactTopicOptions, formCopyByLocale } from '@/config/content/contact-form';
import { localizePracticalFacts } from '@/config/courses/course-practical-facts';
import { getCourseContact, hasNamedCourseContact } from '@/config/courses/course-profiles';
import { teachingStaffStatement } from '@/config/content/team-spotlights';
import { getCourseDetail, getCourses, getSocialProofForCourse } from '@/lib/content/repository';
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

  const [detail, courses, socialProof] = await Promise.all([
    getCourseDetail(slug, locale),
    getCourses(locale),
    Promise.resolve(getSocialProofForCourse(getCourseContentSlug(slug), locale)),
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
  // Only meaningful on `package-inquiry`, where two very different products
  // share one page shape. See QuoteAudience in config/courses/course-profiles.
  const quoteAudience = getQuoteAudience(detail.course.slug);
  const isGroupQuote = archetype.cta === 'request-quote' && quoteAudience === 'group';
  const isOrganisationQuote = archetype.cta === 'request-quote' && quoteAudience === 'organisation';

  const practicalFacts = localizePracticalFacts(detail.course.slug, locale);

  /*
   * Group the published terms by weekly slot.
   *
   * The group label has to carry the days as well as the time. The intensive
   * course's two cohorts are not "the same course at two times of day": mornings
   * run Mon-Fri and afternoons Mon-Thu, so choosing the afternoon is choosing a
   * four-day week. That difference belongs in the label a reader compares on,
   * not in a footnote.
   */
  const termGroups: CourseTermGroup[] = (() => {
    const dayNames = {
      en: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' },
      de: { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' },
    }[locale];

    const groups = new Map<string, CourseTermGroup>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const courseInstance of detail.instances) {
      const schedule = courseInstance.schedule as { days?: string[]; time?: string } | null;
      const days = Array.isArray(schedule?.days) ? schedule.days : [];
      const time = typeof schedule?.time === 'string' ? schedule.time : '';

      // Contiguous weekday runs read as a range; anything else as a list.
      const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const indices = days.map((day) => order.indexOf(day)).filter((index) => index >= 0);
      const isRun =
        indices.length > 2 && indices.every((index, position) => position === 0 || index === indices[position - 1] + 1);
      const dayLabel = isRun
        ? `${dayNames[days[0] as keyof typeof dayNames]}–${dayNames[days[days.length - 1] as keyof typeof dayNames]}`
        : days.map((day) => dayNames[day as keyof typeof dayNames] ?? day).join('/');

      const slotLabel = [dayLabel, time.replace('-', '–')].filter(Boolean).join(', ');

      if (!groups.has(slotLabel)) {
        groups.set(slotLabel, { slotLabel, terms: [] });
      }

      groups.get(slotLabel)?.terms.push({
        id: courseInstance.id,
        rangeLabel: `${formatDate(courseInstance.start_date, locale)} – ${formatDate(courseInstance.end_date, locale)}`,
        href: `${getCoursePath(detail.course.slug)}?instance=${encodeURIComponent(courseInstance.id)}`,
        isSelected: courseInstance.id === selectedInstance?.id,
        isPast: new Date(courseInstance.end_date) < today,
      });
    }

    return [...groups.values()];
  })();

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
      // 0 is the "CASA publishes no weekly load" sentinel, not a real zero.
      // Firmenunterricht is agreed per contract; German for Medical simply has
      // no published figure. Rendering "0" would read as "no lessons".
      value:
        detail.course.lessons_per_week > 0
          ? String(detail.course.lessons_per_week)
          : locale === 'de'
            ? 'Nach Absprache'
            : 'By arrangement',
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
        quoteAudience === 'group'
          ? locale === 'de'
            ? 'Unterricht, Kulturprogramm, Unterkunft, Nahverkehrsticket'
            : 'Lessons, culture programme, accommodation, transit pass'
          : locale === 'de'
            ? 'Lehrplan nach Bedarfsanalyse, Unterricht im Betrieb oder bei CASA'
            : 'Syllabus built from a needs analysis, taught on site or at CASA',
    },
    'lead-time': {
      label: locale === 'de' ? 'Vorlaufzeit' : 'Lead time',
      value: locale === 'de' ? 'Frühzeitig anfragen' : 'Enquire early',
    },
  };

  /*
   * A row whose value is "By arrangement" is not a fact, it is the absence of
   * one, and three of them in a five-row rail is what made Firmenunterricht read
   * as a broken course page rather than a bespoke one. The archetype decides
   * which facts a page MAY show; this drops the ones that turned out to have no
   * answer for this particular course. German for Groups keeps its real 20
   * lessons a week and loses only its group size.
   *
   * `level-range` is always real, so the rail can never empty out.
   */
  const byArrangement = locale === 'de' ? 'Nach Absprache' : 'By arrangement';
  const infoItems = archetype.facts
    .filter((fact) => archetypeAllowsFact(archetype, fact))
    .map((fact) => factRows[fact])
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter((row) => row.value !== byArrangement);

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

  // No portraits: these are real named learners and the only portrait files on
  // hand are synthetic. See components/sections/testimonial-grid.
  /*
   * Three cards, not seven.
   *
   * `getSocialProofForCourse` returns this course's own learner first and then the
   * rest of the pool, which made the carousel four pages deep on every course page
   * — and nobody pages through a carousel to page four. Three is the grid's own
   * column count, so it fills one row with no pagination at all: the course's own
   * voice leading, two others for breadth.
   */
  const testimonialCards = socialProof.slice(0, 3).map((story) => ({
    id: story.id,
    person: story.personDisplay,
    country: story.country,
    quote: story.quote,
  }));

  /*
   * The rail used to pick "a team member whose role contains 'teacher'" and, if
   * none matched, simply the first person in the list — then rendered them as
   * this course's teacher with a portrait and an endorsement. Both the person and
   * the endorsement were invented. CASA does not name individual classroom
   * teachers, so the rail now carries what CASA does say about all of them.
   */
  const teachingStaff = teachingStaffStatement[locale];

  const isFactsRail = archetype.layout === 'facts-rail';
  const isBrief = archetype.layout === 'brief';

  /*
   * Which enquiry this page opens. `medical-german` is a learner topic — a doctor
   * enquiring for themselves — while the two package products are organiser
   * topics, and the contact schema asks each a different set of brief questions
   * (see ORGANISER_TOPIC_KEYS in lib/validation/contact.ts).
   */
  const briefTopicKey =
    detail.course.slug === 'medical-german'
      ? 'medical-german'
      : detail.course.slug === 'in-company'
        ? 'company-courses'
        : 'group-booking';

  const briefCopy =
    detail.course.slug === 'medical-german'
      ? {
          title: locale === 'de' ? 'Kurs anfragen' : 'Ask about this course',
          description:
            locale === 'de'
              ? 'Nennen Sie Fachgebiet, aktuelles Niveau und Zeitrahmen — wir melden uns mit Umfang, Terminen und Kosten für Ihre Situation.'
              : 'Tell us your specialism, your current level and your timeframe, and we come back with the scope, the dates and the cost for your situation.',
        }
      : detail.course.slug === 'in-company'
        ? {
            title: locale === 'de' ? 'Firmenkurs anfragen' : 'Brief us on your company course',
            description:
              locale === 'de'
                ? 'Beratung und Angebot sind stets unverbindlich. Je genauer die Angaben, desto genauer das Angebot.'
                : 'Both the consultation and the quote are always without obligation. The more precise the brief, the more precise the quote.',
          }
        : {
            title: locale === 'de' ? 'Gruppenprogramm anfragen' : 'Brief us on your group',
            description:
              locale === 'de'
                ? 'Gruppengröße, Alter, Zeitraum und Schwerpunkte — Sie erhalten ein individuelles, unverbindliches Angebot.'
                : 'Group size, ages, dates and what you want to focus on. You get an individual, no-obligation offer.',
          };

  const processHeading = nextStepsHeading(archetype, locale);
  /*
   * Per-course first, archetype second.
   *
   * The archetype knows the SHAPE of the journey; only the course knows what the
   * steps are. Bildungszeit is arranged with an employer, German for Medical
   * starts with a conversation rather than a registration — its archetype CTA is
   * already `advisory-call`, while the steps it inherited opened with "Complete
   * registration", an action that does not exist for it. See
   * config/courses/course-page-content.ts.
   */
  const courseNextSteps = getCourseNextSteps(detail.course.slug, locale);
  const courseAudience = getCourseAudienceContent(detail.course.slug, locale);
  const processDescription = courseNextSteps?.description ?? (isOrganisationQuote
    ? locale === 'de'
      ? 'Von der Studienberatung bis zum Ausbildungsplan - beides unverbindlich.'
      : 'From needs consultation to training plan, both without obligation.'
    : archetype.cta === 'request-quote'
      ? locale === 'de'
        ? 'Von der ersten Anfrage bis zum bestätigten Programm.'
        : 'From first enquiry to a confirmed programme.'
      : locale === 'de'
        ? 'So geht es weiter bis zum ersten Unterrichtstag.'
        : 'What happens next before your first class day.');

  // Quote products have a different journey: nobody registers, someone briefs.
  const processStepItems = courseNextSteps?.steps ?? (isOrganisationQuote
    ? [
        {
          step: '1',
          title: locale === 'de' ? 'Studienberatung' : 'Needs consultation',
          description:
            locale === 'de'
              ? 'Wir klären Lernbedürfnisse, Lernziele und Sprachkompetenzen im Team.'
              : 'We establish learning needs, goals, and the language levels in your team.',
        },
        {
          step: '2',
          title: locale === 'de' ? 'Ausbildungsplan' : 'Training plan',
          description:
            locale === 'de'
              ? 'Daraus entwickeln wir den Lehrplan für Ihre Mitarbeitenden.'
              : 'From that we build the syllabus for your employees.',
        },
        {
          step: '3',
          title: locale === 'de' ? 'Unverbindliches Angebot' : 'No-obligation quote',
          description:
            locale === 'de'
              ? 'Beratung und Angebot sind stets unverbindlich.'
              : 'Both the consultation and the quote are always without obligation.',
        },
      ]
    : isGroupQuote
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
      : /*
         * Placement first, registration second.
         *
         * These ran the other way round — "Complete registration", then "Confirm
         * placement" — which contradicts the site's own rule, stated plainly on
         * /courses: "Every format starts from a placement. The test is free and
         * it decides which group you join." You cannot pick a group before you
         * know your level, so the old order asked the reader to commit and then
         * find out what they had committed to.
         */
        [
          {
            step: '1',
            title: locale === 'de' ? 'Einstufung machen' : 'Take the placement test',
            description:
              locale === 'de'
                ? 'Kostenlos und in wenigen Minuten — sie entscheidet über die Gruppe.'
                : 'Free, a few minutes, and it decides which group you join.',
          },
          {
            step: '2',
            title: locale === 'de' ? 'Termin buchen' : 'Book your start date',
            description:
              locale === 'de'
                ? 'Starttermin wählen und Angaben bestätigen.'
                : 'Choose a start date and confirm your details.',
          },
          {
            step: '3',
            title: locale === 'de' ? 'Start vorbereiten' : 'Prepare your start',
            description: locale === 'de' ? 'Unterlagen, Zeitplan, optional Unterkunft.' : 'Materials, schedule, optional housing support.',
          },
        ]);

  // "For whom" bullets were identical on all nine pages. An organiser needs
  // different reassurance than a learner picking a start date.
  const audienceTitle = courseAudience?.title ?? (isOrganisationQuote
    ? locale === 'de'
      ? 'Für Unternehmen, die Sprache als Teil der Qualifikation planen'
      : 'For companies planning language work as part of staff qualification'
    : isGroupQuote
      ? locale === 'de'
        ? 'Für Gruppen, die mit einem klaren Ziel nach Bremen kommen'
        : 'For groups coming to Bremen with a clear goal'
      : locale === 'de'
        ? 'Dieser Kurs passt zu Lernenden, die Struktur und Menschlichkeit suchen'
        : 'This course fits learners who want structure and human support');

  const audienceBullets = courseAudience?.bullets ?? (isOrganisationQuote
    ? [
        locale === 'de' ? 'Lehrplan gemeinsam festgelegt, nicht von der Stange' : 'A syllabus agreed with you, not off the shelf',
        // CASA states this requirement plainly on the Firmenunterricht page.
        locale === 'de'
          ? 'Teilnehmende sollten etwa auf demselben Sprachniveau sein'
          : 'Participants should be at roughly the same language level',
        locale === 'de'
          ? 'Sprachliche und interkulturelle Qualifikation aus einer Hand'
          : 'Language and intercultural training from one provider',
      ]
    : isGroupQuote
      ? [
          locale === 'de' ? 'Inhalte und Tempo nach Absprache' : 'Content and pace agreed with you',
          locale === 'de' ? 'Unterkunft und Kulturprogramm organisiert' : 'Accommodation and culture programme arranged',
          locale === 'de' ? 'Eine Ansprechperson von der Anfrage bis zur Abreise' : 'One contact from enquiry through to departure',
        ]
      : [
          locale === 'de' ? 'Klare Lernziele pro Woche' : 'Clear weekly learning goals',
          locale === 'de' ? 'Praxisorientierte Aufgaben und Feedback' : 'Practice tasks with direct feedback',
          locale === 'de' ? 'Nächste Schritte Richtung Prüfung oder Alltag' : 'Next-step orientation for exams or daily life',
        ]);

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

      {/*
        THREE PAGE SHAPES, chosen by the archetype's `layout`.

        Every course page used to be this same two-column grid with a facts rail
        on the right — measured identically at 700px/620px on all seven. See
        CourseLayout in config/courses/archetypes.ts for why that fails: a format
        that publishes no dates and no price then wears the chrome of one that
        publishes both, and reads as broken rather than as different.
      */}
      <section className={isBrief ? 'py-16 md:py-24' : 'py-16 md:py-20'}>
        <Container className="space-y-12 md:space-y-14">
          <div
            className={
              isFactsRail
                ? 'grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start'
                : undefined
            }
          >
            {/*
              `brief` runs one column at a reading measure — 58rem, close to the
              site's `max-w-measure` for prose but wide enough for the two-column
              blocks inside a section. `catalogue` takes the full grid, because
              the week picker is the page.
            */}
            <div className={cn('space-y-12 md:space-y-14', isBrief && 'mx-auto max-w-[58rem]')}>
              {archetype.sections.map((sectionKey) => {
                switch (sectionKey) {
                case 'module-catalogue':
                  return <SpecialCourseCatalogue key={sectionKey} locale={locale} />;

                case 'term-table':
                  return (
                  <CourseTermTable
                    key={sectionKey}
                    groups={termGroups}
                    locale={locale}
                    note={
                      detail.course.slug === 'bildungszeit'
                        ? locale === 'de'
                          ? 'Die Bildungszeit umfasst zwei parallele Intensivkurse — einen am Vormittag, einen am Nachmittag. Der Einstieg ist immer montags möglich.'
                          : 'Bildungszeit is two intensive courses in parallel, one in the morning and one in the afternoon. You can join on any Monday.'
                        : undefined
                    }
                  />
                  );

                case 'practical-details':
                  return practicalFacts ? (
                  <CoursePracticalDetails
                    key={sectionKey}
                    fees={practicalFacts.fees}
                    feeNote={practicalFacts.feeNote}
                    conditions={practicalFacts.conditions}
                    locale={locale}
                  />
                  ) : null;

                case 'level-goals':
                  return (
                  <CourseLevelGoals
                    key={sectionKey}
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
                    title={processHeading.title}
                    description={processDescription}
                    steps={processStepItems}
                    /*
                     * No `cta` — it passed `primaryDecisionCta` verbatim, which
                     * the hero rail already renders at the top of the same page.
                     * "Book placement first" appeared twice on every course
                     * detail route, both times as a filled button to the same
                     * href. The process list explains the steps; the hero asks
                     * for the click.
                     */
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
                    <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)]">
                      {locale === 'de' ? 'Andere Kurswege vergleichen' : 'Compare other course paths'}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {related.map((course) => {
                        const relatedPhoto = pageConfig.photos[getCoursePhotoKey(course.slug)] ?? pageConfig.photos.supportCard;

                        return (
                          <Link
                            key={course.id}
                            href={getCoursePath(course.slug)}
                            className="group grid overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/75 transition-all hover:-translate-y-0.5 hover:ring-[var(--casa-blue)]/35 sm:grid-cols-[8.5rem_minmax(0,1fr)]"
                          >
                            <div className="casa-media-overlay relative min-h-36 sm:min-h-full">
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

            {isFactsRail ? (
            <DecisionRail
              locale={locale}
              infoTitle={locale === 'de' ? 'Ihre Entscheidung' : 'Your decision'}
              infoItems={decisionItems.length > 0 ? decisionItems : infoItems}
              notes={contactLine}
              deadlineIso={selectedInstance?.start_date}
              teachingStaff={teachingStaff}
            />
            ) : null}
          </div>

          {/*
            THE ENQUIRY, on the pages whose only real action is one.

            `brief` covers German for Medical, German for Groups and
            Firmenunterricht. None of them publishes a date, a weekly load or a
            price, so none of them can end in "register" — and until now they
            ended in a facts rail whose rows said "On request". This is the same
            ContactInquiryForm that /contact mounts, with the topic preselected,
            so the validation, the API route and the webhook fan-out stay
            single-sourced rather than duplicated per course.
          */}
          {isBrief ? (
            <div className="mx-auto max-w-[58rem] border-t border-[color:var(--casa-sand)] pt-12 md:pt-14">
              <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">
                {briefCopy.title}
              </h2>
              <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                {briefCopy.description}
              </p>
              <div className="mt-8">
                <ContactInquiryForm
                  locale={locale}
                  topics={contactTopicOptions(locale)}
                  initialTopicKey={briefTopicKey}
                  copy={formCopyByLocale[locale]}
                />
              </div>
            </div>
          ) : null}
        </Container>
      </section>
    </main>
  );
}
