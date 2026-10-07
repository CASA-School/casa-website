import type { Metadata } from 'next';

import { Link } from '@/i18n/navigation';

import { ArrowRight } from 'lucide-react';

import { HeroAPhotoLed } from '@/components/heroes';
import {
  ProofBand,
} from '@/components/sections';
import { CourseFormatRows } from '@/components/sections/course-format-rows';
import { localizePracticalFacts } from '@/config/courses/course-practical-facts';
import { CoursesFormatSelector } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getCoursePhoto } from '@/config/courses/course-photos';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCoursePath } from '@/lib/content/course-routes';
import { CEFR_LADDER, filterCourses } from '@/lib/content/course-finder';
import { getCourseFinderData, getPageHero } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';
import { BandHeading } from '@/components/sections/band-heading';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Deutschkurse in Bremen' : 'German courses in Bremen',
    description: locale === 'de' ? 'Bei CASA gibt es Intensivkurse, Abendkurse und weitere Deutschkurse. Hier findest du den Kurs, der zu deinem Alltag und deinen Zielen passt.' : 'At CASA you’ll find intensive courses, evening courses and other German courses. Find the one that suits your everyday life and your goals.',
    path: '/courses',
    keywords: ['CASA courses', 'German course Bremen', 'Course formats A1 C1'],
  });
}

/*
  The finder's facet values, declared once and reused for validation, for the
  option lists and for the counts — so a value can never be offered in the UI
  that the query-param validator then rejects.
*/
const SCHEDULE_VALUES = ['intensive', 'evening', 'daytime', 'flexible'] as const;
const GOAL_VALUES = ['exam', 'medical', 'professional', 'general'] as const;

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value));
}

function formatScheduleTags(tags: string[], locale: 'en' | 'de') {
  const map: Record<string, string> =
    locale === 'de'
      ? {
          weekdays: 'Werktage',
          morning: 'Vormittag',
          evening: 'Abend',
          hybrid: 'Hybrid',
          scheduled: 'Planbare Starttermine',
        }
      : {
          weekdays: 'Weekdays',
          morning: 'Morning',
          evening: 'Evening',
          hybrid: 'Hybrid',
          scheduled: 'Fixed start dates',
        };

  if (tags.length === 0) {
    return locale === 'de' ? 'Planbare Starttermine' : 'Fixed start dates';
  }

  return tags.map((tag) => map[tag] ?? tag).join(', ');
}

type SelectorCourseLike = {
  slug: string;
  lessons_per_week: number;
  narrative?: {
    audience?: string;
    outcomes?: string[];
  } | null;
};

/*
 * `facts` used to be written out inline in every branch below, in both locales,
 * repeating the same figures that config/courses/course-practical-facts.ts now
 * holds for the detail pages. Two copies of "117.50 EUR per additional week" is
 * one too many -- the next person to correct a price fixes whichever they found
 * first, and the other quietly disagrees.
 *
 * The registry is the single source. `registryFacts` summarises it, so a format
 * with no branch here still gets real facts rather than the "CASA supports
 * progression from A1 to C1" filler that German for Groups was rendering.
 */
function buildSelectorCopy(course: SelectorCourseLike, locale: 'en' | 'de', scheduleTags: string[]) {
  const practical = localizePracticalFacts(course.slug, locale);
  const registryFacts = practical
    ? [
        practical.fees?.length
          ? `${locale === 'de' ? 'Kosten' : 'Costs'}: ${practical.fees
              .map((fee) => `${fee.label} ${fee.amount}`)
              .join(' · ')}`
          : practical.feeNote,
        ...practical.conditions.slice(0, 2),
      ].filter((entry): entry is string => Boolean(entry))
    : [];
  const fallbackOutcomes =
    locale === 'de'
      ? ['Mehr Sicherheit im Sprechen', 'Strukturierte Lernroutine', 'Klare nächste Lernschritte']
      : ['More confidence in speaking', 'A structured learning routine', 'Clear next steps in your learning'];

  const normalizedSlug = course.slug.toLowerCase();
  const baseBestFor =
    course.narrative?.audience ||
    (locale === 'de' ? 'Internationale Lernende mit klaren Zielen.' : 'International learners with clear goals.');

  const baseSchedule = formatScheduleTags(scheduleTags, locale);
  // 0 is the "CASA publishes no weekly load" sentinel (German for Medical,
  // Firmenunterricht), and printed as "0 Lektionen/Woche" it read as no lessons.
  // Same wording as the course page's facts rail.
  const baseIntensity =
    course.lessons_per_week > 0
      ? locale === 'de'
        ? `${course.lessons_per_week} Unterrichtseinheiten pro Woche`
        : `${course.lessons_per_week} lessons a week`
      : locale === 'de'
        ? 'Nach Absprache'
        : 'By arrangement';
  const baseOutcomes = course.narrative?.outcomes?.slice(0, 5) ?? fallbackOutcomes;

  if (normalizedSlug.includes('intensive')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Alle, die für Studium, Beruf oder Visum schnell vorankommen möchten.'
          : 'Anyone who wants to make quick progress for study, work or a visa.',
      schedule:
        locale === 'de'
          ? 'Neue Kurse jeden Monat, abwechselnd am Vormittag und am Nachmittag'
          : 'New courses every month, alternating between mornings and afternoons',
      intensity: locale === 'de' ? '20 Unterrichtseinheiten à 45 Minuten pro Woche' : '20 lessons of 45 minutes a week',
      outcomes: baseOutcomes,
      facts: registryFacts,
    };
  }

  if (normalizedSlug.includes('evening')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Berufstätige und Auszubildende, die nach der Arbeit strukturiert lernen möchten.'
          : 'Working people and trainees who want to learn in a structured way after work.',
      schedule:
        locale === 'de'
          ? 'Das ganze Jahr über, meist zweimal pro Woche (Mo/Mi oder Di/Do) von 18:30 bis 20:00 Uhr'
          : 'All year round, usually twice a week (Mon/Wed or Tue/Thu) from 18:30 to 20:00',
      intensity: locale === 'de' ? 'Ein halbes Niveau in etwa 3,5 Monaten' : 'Half a level in about 3.5 months',
      outcomes: baseOutcomes,
      facts: registryFacts,
    };
  }

  if (normalizedSlug.includes('medical')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Ärztinnen, Ärzte und medizinische Fachkräfte, die im Klinikalltag sicher Deutsch sprechen möchten.'
          : 'Doctors and healthcare professionals who want to speak German confidently in everyday clinical work.',
      /*
       * NOT the Friday dates that used to be here.
       *
       * "26.06.-28.08.2026" came from a news post that
       * docs/COURSE_FACTS_SOURCE_OF_TRUTH.md records as checked and INCONCLUSIVE:
       * it would not render its article body on direct fetch and no longer
       * appears in the live /aktuelles list. CASA publishes no dates, no weekly
       * hours and no fee for this course, and course-practical-facts.ts already
       * says so honestly. This was the one place the site still asserted them.
       */
      schedule:
        locale === 'de'
          ? 'Termine und Umfang pro Gruppe, auf Anfrage'
          : 'Dates and weekly hours per group, on request',
      intensity: baseIntensity,
      outcomes: baseOutcomes,
      facts: registryFacts,
    };
  }

  if (normalizedSlug.includes('bildungszeit')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Berufstätige, die Bildungszeit oder AZAV-bezogene Deutschförderung planen.'
          : 'Employees planning their Bildungszeit or AZAV-related German training.',
      schedule: locale === 'de' ? 'Kompakte Tagesblöcke nach Absprache' : 'Compact daytime blocks by arrangement',
      intensity: baseIntensity,
      outcomes: baseOutcomes,
      facts: registryFacts,
    };
  }

  if (normalizedSlug.includes('in-company') || normalizedSlug.includes('company')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Unternehmen, deren Teams im Arbeitsalltag besser auf Deutsch kommunizieren sollen.'
          : 'Companies whose teams need to communicate better in German at work.',
      schedule: locale === 'de' ? 'Je nach Bedarf vor Ort, online oder hybrid' : 'On site, online or hybrid, as needed',
      intensity: baseIntensity,
      outcomes: baseOutcomes,
      facts: registryFacts,
    };
  }

  if (normalizedSlug.includes('special')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Alle, die gezielt an Schreiben, Sprechen oder Grammatik arbeiten möchten.'
          : 'Anyone who wants to focus on their writing, speaking or grammar.',
      schedule: baseSchedule,
      intensity: baseIntensity,
      outcomes: baseOutcomes,
      facts: registryFacts,
    };
  }

  return {
    bestFor: baseBestFor,
    schedule: baseSchedule,
    intensity: baseIntensity,
    outcomes: baseOutcomes,
    facts: registryFacts,
  };
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; schedule?: string; goal?: string }>;
}) {
  const locale = await getContentLocale();
  const { level, schedule, goal } = await searchParams;
  const rhythm = getLayoutRhythm('courses-index');
  const pageConfig = getPublicPageConfig('courses', locale);

  const [hero, finderData] = await Promise.all([
    Promise.resolve(getPageHero('courses', locale)),
    getCourseFinderData(locale),
  ]);

  const selectedLevelCandidate = typeof level === 'string' ? level.toUpperCase() : '';
  const selectedLevel = (CEFR_LADDER as readonly string[]).includes(selectedLevelCandidate)
    ? selectedLevelCandidate
    : '';
  const selectedScheduleCandidate = typeof schedule === 'string' ? schedule.toLowerCase() : '';
  const selectedSchedule = SCHEDULE_VALUES.includes(selectedScheduleCandidate as (typeof SCHEDULE_VALUES)[number])
    ? selectedScheduleCandidate
    : '';
  const selectedGoalCandidate = typeof goal === 'string' ? goal.toLowerCase() : '';
  const selectedGoal = GOAL_VALUES.includes(selectedGoalCandidate as (typeof GOAL_VALUES)[number])
    ? selectedGoalCandidate
    : '';

  const activeFacets = {
    level: selectedLevel || undefined,
    schedule: selectedSchedule || undefined,
    goal: selectedGoal || undefined,
  };

  /*
    No silent fallback. This used to show the whole catalogue whenever a filter
    matched nothing, with a small notice underneath — so a control that excluded
    everything looked identical to one that did nothing, which is exactly how
    "Evening" managed to match no courses for as long as it did. An empty result
    is now shown as empty, and the counts on each option mean a visitor can see
    that before clicking.
  */
  /*
   * No slice.
   *
   * This used to take the first six, which silently dropped a real format the
   * moment CASA had a seventh -- and it did: seeding Bildungszeit into the
   * database pushed German for Medical out of the format selector while its card
   * still linked from the same page. A catalogue page that hides one of the
   * things it is cataloguing is worse than a slightly longer list, and the
   * filters above already narrow it when a reader wants that.
   */
  const featuredCourses = filterCourses(finderData.courses, activeFacets);

  /*
   * The heading said "Six routes" as a literal, and went wrong as soon as a
   * seventh format existed. Spelled from the array so it cannot drift again.
   */
  const courseCountWord = (() => {
    const words: Record<number, { en: string; de: string }> = {
      1: { en: 'One', de: 'Ein' },
      2: { en: 'Two', de: 'Zwei' },
      3: { en: 'Three', de: 'Drei' },
      4: { en: 'Four', de: 'Vier' },
      5: { en: 'Five', de: 'Fünf' },
      6: { en: 'Six', de: 'Sechs' },
      7: { en: 'Seven', de: 'Sieben' },
      8: { en: 'Eight', de: 'Acht' },
    };

    return words[featuredCourses.length] ?? { en: String(featuredCourses.length), de: String(featuredCourses.length) };
  })();

  const courseRows = featuredCourses.map((course) => {
    /*
      Resolved from the course, never from its position in this list. The list
      is sorted by lessons_per_week and re-filtered by the ?level / ?schedule /
      ?goal params, so a positional lookup made a card's photograph change when
      the visitor filtered. See getCoursePhoto for the measurements.
    */
    const photo = getCoursePhoto(course.slug, locale);
    const nextStart = finderData.nextStartByCourseId[course.id];

    return {
      /*
        `course-<slug>`, matching the homepage, so a deep link like
        #course-evening-german resolves on either page rather than only on one.
      */
      id: `course-${course.slug}`,
      title: course.name,
      description:
        course.narrative?.promise ||
        (locale === 'de' ? 'Klarer Sprachaufbau mit betreuten Lernschritten.' : 'Clear progress in German, with support at every step.'),
      bestFor: course.narrative?.audienceInPromise
        ? ''
        : course.narrative?.audience || (locale === 'de' ? 'Geeignet für internationale Lernende' : 'Suitable for international learners'),
      outcomes: course.narrative?.outcomes ?? [],
      href: getCoursePath(course.slug),
      ctaLabel: locale === 'de' ? 'Kursplan ansehen' : 'View course plan',
      /* Omitted rather than shown as "TBD" — a kicker reading TBD is noise. */
      meta: nextStart
        ? `${locale === 'de' ? 'Nächster Start' : 'Next start'}: ${formatDate(nextStart, locale)}`
        : undefined,
      media: {
        src: photo.src,
        alt: photo.alt,
      },
    };
  });

  const selectorItems = featuredCourses.map((course) => {
    const copy = buildSelectorCopy(course, locale, finderData.scheduleTagsByCourseId[course.id] || []);

    return {
      id: course.id,
      title: course.name,
      bestFor: copy.bestFor,
      schedule: copy.schedule,
      intensity: copy.intensity,
      outcomes: copy.outcomes,
      facts: copy.facts,
    };
  });

  /*
    NO COURSE FINDER. The level/schedule/goal panel is gone at CASA's request —
    seven formats do not need a facet search, and the ink-deep band below lists
    every one of them with its own facts.

    The QUERY PARAMS still work. `activeFacets` above continues to narrow
    `courseRows`, so `/courses?goal=exam` remains a valid link and the honest
    empty state below still has a job. What went is the UI that offered the
    filter, plus the per-option counts that existed only to label its chips.
  */

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Kurse' : 'Courses' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      {/*
        THE SITE'S STANDARD HERO. This was HeroBEditorial, whose own h1 resolved
        to 51.2px at weight 900 against the 64px/700 every other index now
        renders, and which put the course finder where the photograph goes.

        THE FINDER MOVED OUT, it was not deleted — it is the section directly
        below, with the same props and the same `course-finder-filter` test id.
        It was never really hero furniture: a three-field filter that rewrites
        the page's own query params is the first thing you DO on this page, not
        the thing that tells you where you are. In the hero it also had to be
        the photograph's replacement, so /courses was the one index with no
        photograph at all.
      */}
      <HeroAPhotoLed
        eyebrow={hero.eyebrow}
        title={locale === 'de' ? 'Finde deinen Deutschkurs' : 'Find your German course'}
        description={locale === 'de' ? 'Ob du neu anfängst, neben der Arbeit lernst oder dich auf ein bestimmtes Ziel vorbereitest, wir helfen dir, den passenden Deutschkurs zu finden.' : 'Whether you are starting out, learning alongside work or working towards a specific goal, we can help you find the right German course.'}
        photo={pageConfig.photos.thumbA}
        ctas={pageConfig.ctas.slice(0, 1)}
        breadcrumbs={breadcrumbs}
      />


      {/*
        Section 1: the formats.

        Same composition as the homepage, via the same component. Both pages
        present the same six formats, so they present them the same way — and
        `CourseFormatRows` is shared rather than copied, because this codebase
        has twice been bitten by two pages drawing "the same" thing with their
        own markup (ProofBand's two widths, and a course's photograph changing
        between surfaces).

        Two deliberate differences from the homepage. All six formats get a row
        rather than four flagships plus a rail: this is the index, and ranking
        formats is a homepage editorial choice that would be a strange thing for
        an index to do. And the band is ink-deep, which gives /courses the
        two-surface rhythm it did not have — every band on the page was the same
        wash, top to bottom.
      */}
      <section className="bg-[var(--casa-ink-deep)] py-20 text-white md:py-32">
        <Container className="space-y-12 md:space-y-14">
          <BandHeading
            eyebrow={locale === 'de' ? 'Kursauswahl' : 'Choosing a course'}
            title={locale === 'de' ? 'Unsere Kursformate im Überblick' : 'Our course formats at a glance'}
            description={
              locale === 'de'
                ? `${courseCountWord.de} Wege zum gleichen Ziel. Der Unterschied liegt im Rhythmus, nicht im Anspruch.`
                : `${courseCountWord.en} ways to reach the same goal. What changes is the rhythm; the standard stays the same.`
            }
          />

          {/*
            An honest empty state. The page used to answer an empty filter by
            rendering the entire catalogue under a small "no exact match" note,
            which made a filter that excluded everything indistinguishable from
            one that did nothing. If a combination has no courses it now says so
            and offers the way back.
          */}
          {courseRows.length === 0 ? (
            <div className="mx-auto max-w-[46rem] rounded-xl border border-white/20 bg-white/5 px-6 py-8 text-center">
              <p className="text-base font-bold text-white">
                {locale === 'de'
                  ? 'Für diese Kombination gibt es derzeit keinen Kurs.'
                  : 'No course matches that combination right now.'}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/72">
                {locale === 'de'
                  ? 'Ändere einen Filter, oder lass uns dein Niveau gemeinsam bestimmen.'
                  : 'Change one filter, or let us work out your level together.'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-[var(--casa-ink-deep)]"
                >
                  {locale === 'de' ? 'Filter zurücksetzen' : 'Reset filters'}
                </Link>
                <Link
                  href="/placement-test"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-[var(--casa-ink-deep)]"
                >
                  {locale === 'de' ? 'Einstufungstest' : 'Placement test'}
                </Link>
              </div>
            </div>
          ) : (
            <CourseFormatRows rows={courseRows} tone="dark" />
          )}
        </Container>
      </section>

      {/*
        Section 2: Practical facts before choosing.

        This replaced a "The Human Difference" band whose copy — "Support on
        Every Step of Your Journey", "Human learning journeys need clear
        guidance" — asserted warmth without telling anyone anything. On an index
        page the reader has just met six formats and has concrete unanswered
        questions, so the band now answers them.

        EVERY NUMBER HERE IS FROM docs/COURSE_FACTS_SOURCE_OF_TRUTH.md.

        The 50 EUR enrolment fee and the 23.99-26.99 EUR textbook range used to be
        withheld from this band as unverified. Both are published on
        casa-bremen.de -- the 50 EUR fee on three separate pages -- and are now in
        the verified table, so buildSelectorCopy's figures reach the reader instead
        of being built and dropped by a component that ignored the prop.

        No photographs. The six format cards above already carry the page's
        images, and four short facts do not need illustrating.
      */}
      <section className="py-16 md:py-24 border-t border-[color:var(--casa-sand)]/40">
        <Container className="space-y-10 md:space-y-12">
          <BandHeading
            tone="light"
            eyebrow={locale === 'de' ? 'Vor der Anmeldung' : 'Before you register'}
            title={locale === 'de' ? 'Vier Dinge, die du vorher wissen solltest' : 'Four things worth knowing first'}
            description={
              locale === 'de'
                ? 'Hier findest du Antworten zur Einstufung, zum Lerntempo und zur Prüfungsvorbereitung.'
                : 'Here you’ll find answers about placement, the pace of learning and exam preparation.'
            }
          />

          <ul className="mx-auto grid max-w-[76rem] gap-x-10 gap-y-10 md:grid-cols-2 md:gap-y-12">
            {[
              {
                title: locale === 'de' ? 'Dein Niveau steht am Anfang' : 'Your level comes first',
                body:
                  locale === 'de'
                    ? 'Wenn du schon Deutsch sprichst, hilft uns die Einstufung bei der Kurswahl. Mach einen kostenlosen Online-Test und schick uns dein Ergebnis, oder komm persönlich bei uns vorbei.'
                    : 'If you already speak some German, a placement test helps us choose the right course for you. Take a free online test and send us your result, or come and see us in person.',
                linkHref: '/placement-test',
                linkLabel: locale === 'de' ? 'Zum Einstufungstest' : 'Take the placement test',
              },
              {
                title: locale === 'de' ? 'Wie lange ein Niveau dauert' : 'How long a level takes',
                body:
                  locale === 'de'
                    ? 'Im Intensivkurs mit 20 Unterrichtseinheiten pro Woche dauert eine komplette Niveaustufe etwa 8 bis 9 Wochen. Im Abendkurs schaffst du in rund 3,5 Monaten ein halbes Niveau, also etwa 1,5 Stufen im Jahr.'
                    : 'In the intensive course, with 20 lessons a week, a complete level takes about 8–9 weeks. In the evening course, you complete half a level in around 3.5 months, which is about 1.5 levels a year.',
              },
              {
                title: locale === 'de' ? 'Prüfungsvorbereitung ist ein eigener Kurs' : 'Exam preparation is a separate course',
                body:
                  locale === 'de'
                    ? 'Die Vorbereitung auf eine telc-Prüfung ist nicht im Intensivkurs enthalten. Wenn du ein Zertifikat brauchst, kannst du zusätzlich einen Vorbereitungskurs buchen.'
                    : 'Preparation for a telc exam is not part of the intensive course. If you need a certificate, you can book a preparation course as well.',
                linkHref: '/exams',
                linkLabel: locale === 'de' ? 'Prüfungen ansehen' : 'See the exams',
              },
              {
                title: locale === 'de' ? 'Zwei Formate ohne Listenpreis' : 'Two formats with no fixed price',
                body:
                  locale === 'de'
                    ? 'Den Unterricht für Gruppen und den Firmenunterricht stellen wir nach Bedarf zusammen und machen dafür ein eigenes Angebot. Beim Gruppenkurs gehören Unterkunft, Kulturprogramm und ein Nahverkehrsticket dazu.'
                    : 'We plan classes for groups and in-company teaching around what you need and send you an individual quote. For groups, accommodation, a culture programme and a public transport ticket are part of the package.',
                linkHref: '/contact',
                linkLabel: locale === 'de' ? 'Angebot anfragen' : 'Request a quote',
              },
            ].map((fact) => (
              <li key={fact.title} className="border-t border-[color:var(--casa-sand)] pt-6">
                <h3 className="text-lg font-bold leading-snug text-[var(--casa-ink)]">{fact.title}</h3>
                <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{fact.body}</p>
                {fact.linkHref ? (
                  <Link
                    href={fact.linkHref}
                    className="casa-cta-link group/cta mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--casa-ink)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text)] hover:underline"
                  >
                    {fact.linkLabel}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1"
                      aria-hidden
                    />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>

          {/*
            The child block. The band above states what to know before choosing;
            this answers the question that follows from it, which is why it sits
            inside the same band on the same surface with a subordinate heading
            rather than opening a new section.
          */}
          <div className="mx-auto max-w-[76rem] border-t border-[color:var(--casa-sand)] pt-10 md:pt-12">
            <CoursesFormatSelector
              title={
                locale === 'de'
                  ? 'Und so läuft jedes Format konkret ab'
                  : 'And here is how each format actually runs'
              }
              description={
                locale === 'de'
                  ? 'Wähle ein Format und sieh dir Rhythmus, Lernumfang und typische Ergebnisse an.'
                  : 'Choose a format and see its rhythm, workload and typical results.'
              }
              items={selectorItems}
              labels={{
                signature: locale === 'de' ? 'Kursentscheidung' : 'Choosing a course',
                bestFor: locale === 'de' ? 'Geeignet für' : 'Suitable for',
                schedule: locale === 'de' ? 'Kursrhythmus' : 'Course rhythm',
                intensity: locale === 'de' ? 'Lernumfang' : 'Workload',
                outcomes: locale === 'de' ? 'Was du erreichen kannst' : 'What you can achieve',
                facts: locale === 'de' ? 'So läuft dieses Format bei CASA' : 'How this format works at CASA',
              }}
            />
          </div>
        </Container>
      </section>

      {/*
        Section 3: Proof band.

        Continues the wash from the band above rather than switching to white.
        The proof panel is itself a painted ink slab, so a white band around it
        made a third surface in three consecutive sections — wash, white, ink —
        and the white strip read as a gap rather than as a section. On the wash
        the slab sits on one continuous ground, and the hairline is gone with
        it: there is no longer a surface change for a rule to mark.
      */}
      <section className="py-16 md:py-24">
        <Container>
          <ProofBand locale={locale} />
        </Container>
      </section>

    </main>
  );
}
