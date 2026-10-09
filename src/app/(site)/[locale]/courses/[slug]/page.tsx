import type { Metadata } from 'next';
import { CasaImage as Image } from '@/components/ui/casa-image';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';

import { CoursePracticalDetails } from '@/components/courses/course-practical-details';
import { CourseTermTable } from '@/components/courses/course-term-table';
import type { CourseTermGroup } from '@/components/courses/course-term-table';
import { SpecialCourseCatalogue } from '@/components/courses/special-course-catalogue';
import { HeroCUtilityRail } from '@/components/heroes';
import { HeroLede, HeroSurface } from '@/components/heroes/shared';
import { BremenMusiciansHero } from '@/components/sections/bremen-musicians-hero';
import nightHero from '@/components/sections/night-hero.module.css';
import { DecisionRail, EditorialSplit, HumanStoryBlock, ProcessSteps, TestimonialGrid } from '@/components/sections';
import { serializeJsonLd } from '@/components/seo/json-ld';
import { CourseLevelGoals } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { redirectLocalized } from '@/i18n/redirect';
import { getCanonicalCourseRouteSlug, getCourseContentSlug, getCoursePath } from '@/lib/content/course-routes';
import { formatCoursePrice, isQuoteOnly } from '@/lib/content/course-pricing';
import { GruppenPackages } from '@/components/gruppen/gruppen-packages';
import { InterestDialog } from '@/components/courses/interest-dialog';
import { hasInterestList, INTEREST_ANCHOR } from '@/config/courses/interest-list';
import { GRUPPEN_PACKAGES_BY_STACK } from '@/config/gruppen/packages';
import { getCourseArchetype, archetypeAllowsFact, nextStepsHeading } from '@/config/courses/archetypes';
import type { CourseFactKey } from '@/config/courses/archetypes';
import { getCourseContactKey, getCourseLevelGoals, getCoursePhotoKey, getCourseProfile, getQuoteAudience } from '@/config/courses/course-profiles';
import { getCasaContact } from '@/config/content/contacts';
import { getCourseAudienceContent, getCourseNextSteps } from '@/config/courses/course-page-content';
import { localizePracticalFacts } from '@/config/courses/course-practical-facts';
import { bremenToday, isCourseTermBookable, nextCourseStartDate } from '@/lib/content/bookability';
import { getCourseDetail, getCourses, getSocialProofForCourse } from '@/lib/content/repository';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

/* What each of the Bremen Town Musicians says in the group page's hero. */
const MUSICIAN_VOICES = {
  esel: { de: 'I-aah!', en: 'Hee-haw!' },
  hund: { de: 'Wau!', en: 'Woof!' },
  katze: { de: 'Miau!', en: 'Miaow!' },
  hahn: { de: 'Kikeriki!', en: 'Cock-a-doodle-doo!' },
} as const;

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const locale = await getContentLocale();
  const { slug } = await params;
  const detail = await getCourseDetail(slug, locale);

  // A missing course 404s from here, so no canonical or hreflang is emitted for
  // a URL that does not exist.
  if (!detail) {
    notFound();
  }

  return createPublicMetadata({
    locale,
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
    await redirectLocalized(`/courses/${canonicalSlug}${query}`);
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

  /*
   * Only a term a learner can still join is ever selected — not `instances[0]`,
   * which was a term that had begun weeks earlier, rendered as "Nächster Start".
   * The rule is per format (an evening term can be joined while it runs); see
   * lib/content/bookability. `today` is the request's day in Bremen.
   */
  const today = bremenToday();
  const bookableInstances = detail.instances.filter((courseInstance) =>
    isCourseTermBookable(courseInstance, detail.course.slug, today)
  );
  const requestedInstanceId = typeof instance === 'string' ? instance : '';
  const selectedInstance =
    bookableInstances.find((courseInstance) => courseInstance.id === requestedInstanceId) ?? bookableInstances[0];
  // An evening term under way has no start ahead of it: it is joined.
  const startLabel = (courseInstance: (typeof detail.instances)[number]) => {
    const nextStart = nextCourseStartDate(courseInstance, detail.course.slug, today);
    if (nextStart) {
      return formatDate(nextStart, locale);
    }
    const since = formatDate(courseInstance.start_date, locale);
    return locale === 'de' ? `Laufender Kurs seit ${since}` : `Course running since ${since}`;
  };
  const selectedIsUnderWay = Boolean(
    selectedInstance && !nextCourseStartDate(selectedInstance, detail.course.slug, today)
  );
  const selectedStartOptions = bookableInstances.map((courseInstance) => ({
    value: courseInstance.id,
    label: startLabel(courseInstance),
    href: `${getCoursePath(detail.course.slug)}?instance=${encodeURIComponent(courseInstance.id)}`,
  }));
  const coursePhotoKey = getCoursePhotoKey(detail.course.slug);
  const coursePhoto = pageConfig.photos[coursePhotoKey] ?? pageConfig.photos.supportCard;
  const courseStoryPhoto = pageConfig.photos[`${coursePhotoKey}Story`] ?? coursePhoto;
  // From `lg` the hero is a 2.2-2.6:1 band; a crop composed for it beats a slice of the 4:3.
  const courseHeroPhoto = pageConfig.photos[`${coursePhotoKey}Hero`] ?? coursePhoto;
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
    const bookableIds = new Set(bookableInstances.map((courseInstance) => courseInstance.id));

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
        // A term that has begun and cannot be joined is not a link either.
        state: bookableIds.has(courseInstance.id)
          ? 'bookable'
          : courseInstance.end_date < today
            ? 'finished'
            : 'under-way',
      });
    }

    return [...groups.values()];
  })();

  // Each course format has an Ansprechpartner. Formats without a confirmed
  // owner fall back to the general office rather than naming someone who has
  // not agreed to answer.
  const courseContactKey = getCourseContactKey(detail.course.slug);
  const beginnerTrack = (detail.course.level_min ?? 'A1').toUpperCase().startsWith('A');

  // Quote-only products (group packages, Firmenunterricht) are bought by an
  // organiser on behalf of others, so the learner registration wizard is the
  // wrong destination. They need a briefing conversation instead. This is the
  // CTA half of the `package-inquiry` archetype in
  // docs/COPY_AND_COURSE_ARCHETYPE_REVIEW.md.
  const quoteOnly = isQuoteOnly(detail.course);
  const quoteTopic = detail.course.slug === 'in-company' ? 'company-courses' : 'group-booking';
  // A course without set dates collects interested people first (config/courses/interest-list.ts).
  const courseSlug = detail.course.slug;
  const interestCourse = hasInterestList(courseSlug) ? courseSlug : null;

  const primaryDecisionCta = interestCourse
    ? {
        label: locale === 'de' ? 'Interesse anmelden' : 'Register your interest',
        href: `${getCoursePath(courseSlug)}#${INTEREST_ANCHOR}`,
        kind: 'primary' as const,
      }
    : quoteOnly
    ? {
        label: locale === 'de' ? 'Angebot anfragen' : 'Request a quote',
        href: `/contact?topic=${quoteTopic}`,
        kind: 'primary' as const,
      }
    : beginnerTrack
      ? {
          label: locale === 'de' ? 'Niveau zuerst prüfen' : 'Check your level first',
          href: '/placement-test',
          kind: 'primary' as const,
        }
      : {
          label: locale === 'de' ? 'Jetzt anmelden' : 'Register now',
          href: selectedInstance ? `/registration/course?courseId=${selectedInstance.id}` : '/registration/course',
          kind: 'primary' as const,
        };

  const secondaryDecisionCta = interestCourse
    ? {
        label: locale === 'de' ? 'Frage stellen' : 'Ask a question',
        href: '/contact?topic=Course advice',
        kind: 'secondary' as const,
      }
    : quoteOnly
    ? {
        label: locale === 'de' ? 'Programm besprechen' : 'Talk through the programme',
        href: `/contact?topic=${quoteTopic}`,
        kind: 'secondary' as const,
      }
    : {
        label: locale === 'de' ? 'Beratung anfragen' : 'Get advice',
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
      label: selectedIsUnderWay
        ? locale === 'de'
          ? 'Einstieg'
          : 'Joining'
        : locale === 'de'
          ? 'Nächster Start'
          : 'Next start date',
      value: selectedInstance
        ? startLabel(selectedInstance)
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
      // The value is the term's dates, not a length: "Zeitraum", not "Dauer".
      label: locale === 'de' ? 'Zeitraum' : 'Dates',
      value: selectedInstance
        ? `${formatDate(selectedInstance.start_date, locale)} – ${formatDate(selectedInstance.end_date, locale)}`
        : locale === 'de'
          ? 'Auf Anfrage'
          : 'On request',
    },
    'lessons-per-week': {
      label: locale === 'de' ? 'Unterrichtseinheiten pro Woche' : 'Lessons a week',
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
            : 'Lessons, culture programme, accommodation, public transport ticket'
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
   * A row reading "By arrangement" is not a fact, it is the absence of one, and
   * Firmenunterricht rendered three of them in a five-row rail. The archetype
   * decides which facts a page MAY show; this drops the ones with no answer for
   * this particular course. German for Groups keeps its real 20 lessons a week
   * and loses only its group size. `level-range` is always real, so the rail can
   * never empty out.
   */
  const byArrangement = locale === 'de' ? 'Nach Absprache' : 'By arrangement';
  const infoItems = [
    ...archetype.facts
      .filter((fact) => archetypeAllowsFact(archetype, fact))
      .map((fact) => factRows[fact])
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => row.value !== byArrangement),
    // When and how much, for a course whose archetype has no rows for them (course-practical-facts.ts).
    ...(practicalFacts?.summary ?? []),
  ];

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
    /*
      Same `byArrangement` drop the hero rail above applies — this rail was
      missing it, so Firmenunterricht's card read "LESSONS/WEEK: By arrangement"
      while its own hero, built from the same `factRows`, correctly showed no
      such row. `.slice(0, 2)` runs after the filter, so dropping a non-fact
      promotes a real one instead of leaving the card a row shorter.
    */
    .filter((row) => row.value !== byArrangement)
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
      ? 'So entsteht ein Firmenkurs bei CASA.'
      : 'This is how we put together a course for your company.'
    : archetype.cta === 'request-quote'
      ? locale === 'de'
        ? 'Von der ersten Anfrage bis zum fertigen Programm sind es drei Schritte.'
        : 'It takes three steps.'
      : locale === 'de'
        ? 'Von der Einstufung bis zum ersten Kurstag sind es drei Schritte.'
        : 'There are three steps between your placement and your first day in class.');

  // Quote products have a different journey: nobody registers, someone briefs.
  // Firmenunterricht speaks about the company in the third person, as the old
  // casa-bremen.de page did; the group steps say "du" to the organiser, as the
  // whole site does (Rahman, 2026-10-08).
  const processStepItems = courseNextSteps?.steps ?? (isOrganisationQuote
    ? [
        {
          step: '1',
          title: locale === 'de' ? 'Studienberatung' : 'Consultation',
          description:
            locale === 'de'
              ? 'Im ersten Gespräch erfahren wir, was das Team lernen soll und welche Sprachkenntnisse es mitbringt.'
              : 'In a first meeting we find out what your team needs to learn and how much German they already speak.',
        },
        {
          step: '2',
          title: locale === 'de' ? 'Ausbildungsplan' : 'Training plan',
          description:
            locale === 'de'
              ? 'Auf dieser Grundlage stellen wir den Ausbildungsplan für die Mitarbeiterinnen und Mitarbeiter zusammen.'
              : 'On that basis we put together the training plan for your staff.',
        },
        {
          step: '3',
          title: locale === 'de' ? 'Unverbindliches Angebot' : 'No-obligation quote',
          description:
            locale === 'de'
              ? 'Danach erhält die Firma unser Angebot. Beratung und Angebot sind stets unverbindlich.'
              : 'You then receive our quote. Neither the consultation nor the quote commits you to anything.',
        },
      ]
    : isGroupQuote
      ? [
          {
            step: '1',
            title: locale === 'de' ? 'Anfrage senden' : 'Send your enquiry',
            description:
              locale === 'de'
                ? 'Schreib uns, wie groß deine Gruppe ist, wie alt die Teilnehmenden sind, wann ihr kommen möchtet und was dir wichtig ist.'
                : 'Tell us how big your group is, how old the participants are, when you would like to come and what matters to you.',
          },
          {
            step: '2',
            title: locale === 'de' ? 'Programm abstimmen' : 'Shape the programme',
            description:
              locale === 'de'
                ? 'Gemeinsam mit dir planen wir Unterricht, Kulturprogramm und Unterkunft.'
                : 'Together with you, we plan the lessons, the culture programme and the accommodation.',
          },
          {
            step: '3',
            title: locale === 'de' ? 'Angebot erhalten' : 'Receive your quote',
            description:
              locale === 'de'
                ? 'Du erhältst ein unverbindliches Angebot mit allen Leistungen und Kosten.'
                : 'You receive a no-obligation quote listing everything that is included and what it costs.',
          },
        ]
      : /*
         * Placement first, registration second.
         *
         * These ran the other way round — "Complete registration", then "Confirm
         * placement" — which contradicts the site's own rule that every format
         * starts from a placement. You cannot pick a course before you know your
         * level, so the old order asked the reader to commit and then find out
         * what they had committed to. Placement is the Klett online test or an
         * in-person placement (/placement-test); complete beginners skip it.
         */
        [
          {
            step: '1',
            title: locale === 'de' ? 'Einstufung machen' : 'Take the placement test',
            description:
              locale === 'de'
                ? 'Mach den kostenlosen Online-Test oder komm zur Einstufung bei uns vorbei. Wenn du noch gar kein Deutsch sprichst, beginnst du direkt bei A1.'
                : 'Do the free online test, or come to the school and take the placement test in person. If you do not speak any German yet, you start straight at A1.',
          },
          {
            step: '2',
            title: locale === 'de' ? 'Termin buchen' : 'Book your start date',
            description:
              locale === 'de'
                ? 'Such dir einen Starttermin aus und schick uns deine Anmeldung.'
                : 'Choose a start date and send us your registration.',
          },
          {
            step: '3',
            title: locale === 'de' ? 'Start vorbereiten' : 'Get ready to start',
            description:
              locale === 'de'
                ? 'Plane deine Zeit und leg deine Unterlagen bereit. Wenn du noch eine Unterkunft in Bremen brauchst, vermitteln wir dir gern ein Zimmer.'
                : 'Plan your time and get your documents ready. If you still need somewhere to live in Bremen, we are happy to arrange a room for you.',
          },
        ]);

  // "For whom" bullets were identical on all nine pages. An organiser needs
  // different reassurance than a learner picking a start date.
  const audienceTitle = courseAudience?.title ?? (isOrganisationQuote
    ? locale === 'de'
      ? 'Für Firmen und ihre Mitarbeitenden'
      : 'For companies and their staff'
    : isGroupQuote
      ? locale === 'de'
        ? 'Für Schulklassen und Gruppen'
        : 'For school classes and groups'
      : locale === 'de'
        ? 'Für wen der Kurs gedacht ist'
        : 'Who the course is for');

  const audienceBullets = courseAudience?.bullets ?? (isOrganisationQuote
    ? [
        locale === 'de' ? 'Den Lehrplan legen wir gemeinsam mit der Firma fest.' : 'We agree the syllabus with your company.',
        // CASA states this requirement plainly on the Firmenunterricht page.
        locale === 'de'
          ? 'Die Teilnehmenden sollten ungefähr auf demselben Sprachniveau sein.'
          : 'The participants should be at roughly the same language level.',
        locale === 'de'
          ? 'Wir begleiten die sprachliche und die interkulturelle Qualifikation.'
          : 'We support both the language and the intercultural side of their training.',
      ]
    : isGroupQuote
      ? [
          locale === 'de' ? 'Inhalte und Tempo stimmen wir mit dir ab.' : 'We agree the content and pace with you.',
          locale === 'de' ? 'Unterkunft und Kulturprogramm organisieren wir für dich.' : 'We organise the accommodation and the culture programme for you.',
          locale === 'de' ? 'Von der Anfrage bis zur Abreise hast du eine feste Ansprechperson.' : 'From your first enquiry until the day you leave, you have one person to talk to.',
        ]
      : [
          locale === 'de' ? 'Klare Lernziele pro Woche' : 'Clear weekly learning goals',
          locale === 'de' ? 'Praxisorientierte Aufgaben und Feedback' : 'Practice tasks with direct feedback',
          locale === 'de' ? 'Nächste Schritte Richtung Prüfung oder Alltag' : 'Next steps towards an exam or everyday life',
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(courseSchema) }} />

      {/*
        CASA Gruppen takes the HOMEPAGE hero, not the course-detail one.

        The shared course hero puts a bordered "Course info" card on the right —
        lessons/week, level range, lead time. Those are a learner's facts, and
        this reader is an organiser buying a trip for other people, so the panel
        both said the wrong things and made the one genuinely distinct product on
        the site look like another catalogue row.

        THE PICTURE (Ina's idea, 2026-10-09): the Bremen Town Musicians, drawn in
        code on the night hero like the income ring, the street, the staircase
        and the telc seals. The four packages are named after them, and the
        monument stacks them as the packages stack: Esel at the bottom, then
        Hund, Katze, Hahn. Each animal is labelled with its package and opens
        it. Same composition as HeroAPhotoLed (HeroSurface + HeroLede) — one
        eyebrow, one headline, one sentence, one button — with the drawing where
        the photograph of a CASA group at the monument was.
      */}
      {isGroupQuote ? (
        <HeroSurface themeClassName="hero-theme-plain" archetype="A" breadcrumbs={breadcrumbs} className={`overflow-x-clip ${nightHero.night}`}>
          <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
            <HeroLede
              eyebrow="CASA Gruppen"
              title={locale === 'de' ? 'Mit der ganzen Klasse nach Bremen' : 'Bring the whole class to Bremen'}
              description={
                locale === 'de'
                  ? 'Unterricht, Gastfamilie, Mittagessen in der Kantine und Nachmittagsprogramm buchst du bei uns im Komplettpaket. Du bringst die Gruppe mit, und ab der Ankunft kümmern wir uns um alles.'
                  : 'You book the lessons, the host family, lunch in the canteen and the afternoon programme with us in one go. You bring the group, and from the moment you arrive we take care of everything.'
              }
              ctas={[
                {
                  label: locale === 'de' ? 'Gruppenangebot anfragen' : 'Request a group quote',
                  href: '/contact?topic=group-booking',
                  kind: 'primary',
                },
              ]}
              className="lg:py-6"
            />
            <BremenMusiciansHero
              label={
                locale === 'de'
                  ? 'Die Bremer Stadtmusikanten, nach denen unsere vier Gruppenpakete heißen: der Esel unten, darauf Hund, Katze und Hahn.'
                  : 'The Bremen Town Musicians, after whom our four group packages are named: the donkey at the bottom, then the dog, the cat and the rooster.'
              }
              packages={GRUPPEN_PACKAGES_BY_STACK.map((item) => ({
                slug: item.slug,
                animal: item.animal[locale],
                descriptor: item.descriptor[locale],
                voice: MUSICIAN_VOICES[item.slug][locale],
              }))}
            />
          </div>
        </HeroSurface>
      ) : (
      <HeroCUtilityRail
        eyebrow={locale === 'de' ? 'Kursdetail' : 'Course detail'}
        title={detail.course.name}
        description={detail.course.narrative?.promise || (locale === 'de' ? 'Schritt für Schritt von einer Niveaustufe zur nächsten.' : 'Step by step from one level to the next.')}
        breadcrumbs={breadcrumbs}
        infoTitle={locale === 'de' ? 'Kursinfo' : 'Course info'}
        infoItems={infoItems}
        /*
          The hero card no longer repeats `contactLine` on quote-only formats —
          the decision rail below names that person properly, with an avatar and
          an address, so saying it here too was the same fact twice on one page.
          A quoted format still needs its own line, because "confirmed during
          registration" is false where there is nothing to register for.
        */
        notes={
          interestCourse
            ? locale === 'de'
              ? 'Einen festen Termin gibt es noch nicht. Melde dein Interesse an, dann melden wir uns, sobald die Gruppe steht.'
              : 'There are no fixed dates yet. Register your interest and we will get in touch once the group is complete.'
            : archetype.cta === 'request-quote'
            ? locale === 'de'
              ? 'Umfang und Preis bestätigen wir im Angebot.'
              : 'We confirm the scope and the price in our quote.'
            : locale === 'de'
              ? 'Termine und freie Plätze bestätigen wir dir bei der Anmeldung.'
              : 'We confirm the dates and your place when you register.'
        }
        ctas={[primaryDecisionCta, secondaryDecisionCta]}
        photo={{
          ...coursePhoto,
          caption: coursePhoto.caption,
        }}
        photoWide={courseHeroPhoto === coursePhoto ? undefined : { ...courseHeroPhoto, caption: courseHeroPhoto.caption }}
        themeClassName="hero-theme-courses"
      />
      )}

      <section className="py-16 md:py-20">
        <Container className="space-y-12 md:space-y-14">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            {/*
              `space-y-16 md:space-y-24`, up from 12/14.

              Measured on /courses/intensive-german: Learning goals, Course
              dates and Costs and conditions sat 56px apart — three h2-led
              sections, each with its own hairline and its own internal rhythm,
              separated by less than the gap between two paragraphs of the FAQ.
              They read as one continuous run rather than as three answers to
              three different questions. The page's bands elsewhere sit 128–192px
              apart (py-16 to py-24 each side); 64/96px is the same scale applied
              inside a column that shares the frame with a sticky rail.

              `min-w-0`: below xl this is the grid's only, implicit, column, and a
              grid item's min-width defaults to its content. The testimonial
              carousel's track is three full-width slides long, so the column
              grew to ~554px and every phone scrolled sideways.
            */}
            <div className="min-w-0 space-y-16 md:space-y-24">
              {archetype.sections.map((sectionKey) => {
                switch (sectionKey) {
                case 'module-catalogue':
                  return <SpecialCourseCatalogue key={sectionKey} locale={locale} />;

                case 'group-packages':
                  // Firmenunterricht shares this archetype and has no packages.
                  return isGroupQuote ? <GruppenPackages key={sectionKey} locale={locale} /> : null;

                case 'term-table':
                  return (
                  <CourseTermTable
                    key={sectionKey}
                    groups={termGroups}
                    locale={locale}
                    note={
                      detail.course.slug === 'bildungszeit'
                        ? locale === 'de'
                          ? 'In der Bildungszeit besuchst du zwei Intensivkurse gleichzeitig, vormittags von Montag bis Freitag, 9 bis 12:30 Uhr, und nachmittags von Montag bis Donnerstag, 13 bis 17:30 Uhr. Einsteigen kannst du an jedem Montag.'
                          : 'During Bildungszeit you attend two intensive courses at the same time, in the morning from Monday to Friday, 09:00–12:30, and in the afternoon from Monday to Thursday, 13:00–17:30. You can join on any Monday.'
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
                    practiceTitle={locale === 'de' ? 'Das übst du' : 'What you practise'}
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

                case 'testimonials': {
                  /*
                    A quoted product is bought by an organiser, not a learner —
                    this archetype's own rationale says so. The generic three-up
                    put an evening-course learner and a telc candidate in front
                    of a teacher planning a school trip, including one quote
                    opening "I hated language courses my entire life".

                    CASA has the right voice on file: Elena, the accompanying
                    teacher of a school group from Siberia, writing about the
                    host families. One real quote from the actual buyer beats
                    three from people who are not.
                  */
                  if (archetype.cta === 'request-quote') {
                    /*
                      socialProofForCourse returns this course's own voices
                      first and then every other one, so a plain [0] is only
                      correct when the course actually has one. Filter, so a
                      quote-only course with nothing on file renders nothing
                      rather than borrowing an unrelated learner.
                    */
                    const [story] = socialProof.filter(
                      (entry) => entry.courseSlug === getCourseContentSlug(slug)
                    );
                    if (!story) return null;

                    /*
                      The heading names the voice. Elena accompanied a school
                      group; on Firmenunterricht the quote is Majd's, about
                      CASA's teachers, so that page says no more than that.
                    */
                    return (
                      <HumanStoryBlock
                        key={sectionKey}
                        eyebrow={
                          locale === 'de'
                            ? isGroupQuote
                              ? 'Aus einer Gruppenreise'
                              : 'Erfahrungen'
                            : isGroupQuote
                              ? 'From a group visit'
                              : 'Experiences'
                        }
                        title={
                          locale === 'de'
                            ? isGroupQuote
                              ? 'Was eine begleitende Lehrkraft berichtet'
                              : 'Was Teilnehmende über CASA sagen'
                            : isGroupQuote
                              ? 'What an accompanying teacher wrote'
                              : 'What participants say about CASA'
                        }
                        quote={story.quote}
                        person={story.personDisplay}
                        context={story.country}
                        // The course's own quote photo; the group walk only where the
                        // quote is a group's (it stood beside a Firmenunterricht quote too).
                        photo={
                          pageConfig.photos[`${coursePhotoKey}Quote`] ?? {
                            src: '/media/casa/group-course-walking-bremen.jpg',
                            alt:
                              locale === 'de'
                                ? 'Eine CASA-Gruppe unterwegs in Bremen'
                                : 'A CASA group out in Bremen',
                          }
                        }
                      />
                    );
                  }

                  return (
                  <TestimonialGrid
                    key={sectionKey}
                    title={locale === 'de' ? 'Was Lernende über CASA sagen' : 'What learners say about CASA'}
                    description={
                      locale === 'de'
                        ? 'Lernende erzählen, wie sie ihren Kurs bei uns erlebt haben.'
                        : 'Learners describe what their course with us was like.'
                    }
                    cards={testimonialCards}
                    locale={locale}
                  />
                  );
                }
                case 'related-courses':
                  return (
                  <section key={sectionKey} className="space-y-5">
                    <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)]">
                      {locale === 'de' ? 'Andere Kurse bei CASA' : 'Other courses at CASA'}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {related.map((course) => {
                        const relatedPhoto = pageConfig.photos[getCoursePhotoKey(course.slug)] ?? pageConfig.photos.supportCard;

                        return (
                          <Link
                            key={course.id}
                            href={getCoursePath(course.slug)}
                            className="group grid overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/75 transition-all hover:-translate-y-0.5 hover:ring-[var(--casa-blue)]/35 sm:grid-cols-[11.5rem_minmax(0,1fr)] md:grid-cols-1"
                          >
                            {/* A 16:9 band on top, except at sm where one card fills the row and a
                                ~4:3 cell sits beside the text (crop pass, 2026-10-02): the
                                8.5rem column made a square that cut heads. */}
                            <div className="casa-media-overlay relative aspect-[16/9] sm:aspect-auto sm:min-h-full md:aspect-[16/9] md:min-h-0">
                              <Image
                                src={relatedPhoto.src}
                                alt={relatedPhoto.alt}
                                fill
                                sizes="(min-width: 768px) 40vw, (min-width: 640px) 12rem, 92vw"
                                className="object-cover"
                              />
                            </div>
                            <div className="p-4">
                              <h3 className="text-lg font-bold leading-tight text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">{course.name}</h3>
                              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--casa-muted)]">
                                {course.narrative?.promise || (locale === 'de' ? 'Ein Deutschkurs bei CASA in Bremen.' : 'A German course at CASA in Bremen.')}
                              </p>
                              <p className="mt-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                                {course.level_min || 'A1'} - {course.level_max || 'C1'}
                                {/* 0 is the "no published weekly load" sentinel, not a figure. */}
                                {course.lessons_per_week > 0
                                  ? ` · ${course.lessons_per_week} ${locale === 'de' ? 'UE pro Woche' : 'lessons a week'}`
                                  : null}
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
              // Neutral in German: this card serves learners and organisers.
              infoTitle={locale === 'de' ? 'Auf einen Blick' : 'At a glance'}
              infoItems={decisionItems.length > 0 ? decisionItems : infoItems}
              /*
                No `notes`. It was `contactLine` — "Your contact: Ina Eismann,
                Group programmes." — which is the row directly below it, in
                prose, without the avatar or the address. One statement of who
                answers, not two.
              */
              /*
                No `deadlineIso`. It was the term's start date, which is not a
                deadline CASA publishes, and on a term already under way it read
                "Anmeldung geschlossen" on every course page. Without one the
                badge says what is true: registration is rolling.
              */
              // Gated on the CTA policy, not the slug, so Firmenunterricht is
              // covered too: neither page has anything to register for.
              showDeadline={archetype.cta !== 'request-quote' && !interestCourse}
              // An interest list has no registration window; the rail offers the list instead.
              action={interestCourse ? { label: primaryDecisionCta.label, href: primaryDecisionCta.href } : undefined}
              /*
                The named owner of this format, from CASA's 2026-09-08
                allocation in config/content/contacts.ts. Every routed format has
                one; a format without a `contactKey` renders no row rather than
                falling back to a name that does not handle it.
              */
              contact={courseContactKey ? getCasaContact(courseContactKey, locale) : null}
            />
          </div>
        </Container>
      </section>
      {interestCourse ? <InterestDialog course={interestCourse} locale={locale} /> : null}
    </main>
  );
}
