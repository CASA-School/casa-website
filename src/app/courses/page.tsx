import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { HeroBEditorial } from '@/components/heroes';
import {
  ProofBand,
} from '@/components/sections';
import { CourseFormatRows } from '@/components/sections/course-format-rows';
import { CoursesFormatSelector } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getCoursePhoto } from '@/config/courses/course-photos';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCoursePath } from '@/lib/content/course-routes';
import { CEFR_LADDER, countsForField, filterCourses } from '@/lib/content/course-finder';
import { getCourseFinderData, getPageHero } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'German Courses',
  description:
    'Explore CASA course formats with human-centered guidance, clear comparisons, and practical next steps.',
  path: '/courses',
  keywords: ['CASA courses', 'German course Bremen', 'Course formats A1 C1'],
});

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
          scheduled: 'Planned starts',
        };

  if (tags.length === 0) {
    return locale === 'de' ? 'Planbare Starttermine' : 'Planned starts';
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

function buildSelectorCopy(course: SelectorCourseLike, locale: 'en' | 'de', scheduleTags: string[]) {
  const fallbackOutcomes =
    locale === 'de'
      ? ['Mehr Sicherheit im Sprechen', 'Strukturierte Lernroutine', 'Klare nächste Lernschritte']
      : ['Stronger speaking confidence', 'Structured learning routine', 'Clear next learning steps'];

  const normalizedSlug = course.slug.toLowerCase();
  const baseBestFor =
    course.narrative?.audience ||
    (locale === 'de' ? 'Internationale Lernende mit klaren Zielen.' : 'International learners with clear goals.');

  const baseSchedule = formatScheduleTags(scheduleTags, locale);
  const baseIntensity =
    locale === 'de'
      ? `${course.lessons_per_week} Lektionen/Woche`
      : `${course.lessons_per_week} lessons/week`;
  const baseOutcomes = course.narrative?.outcomes?.slice(0, 5) ?? fallbackOutcomes;

  if (normalizedSlug.includes('intensive')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Lernende mit schnellem Fortschrittsziel für Studium, Beruf oder Visumsplanung.'
          : 'Learners who need rapid progress for studies, career, or visa planning.',
      schedule:
        locale === 'de'
          ? 'Monatliche Starts, abwechselnd am Vormittag und am Nachmittag'
          : 'Monthly starts, alternating morning and afternoon cohorts',
      intensity: locale === 'de' ? '20 Lektionen/Woche (45 Min. pro Lektion)' : '20 lessons/week (45 minutes each)',
      outcomes: baseOutcomes,
      facts: locale === 'de'
          ? [
              'Gebühren: 4 Wochen 520 EUR, 8 Wochen (komplettes Niveau) 940 EUR, jede weitere Woche 117,50 EUR.',
              'Einmalige Einschreibegebühr: 50 EUR. Lehrmaterial: 23,99 bis 26,99 EUR.',
              'Ein ganzes Niveau dauert im Intensivformat in der Regel etwa 8 bis 9 Wochen.',
            ]
          : [
              'Fees: 4 weeks EUR 520, 8 weeks (full level) EUR 940, each additional week EUR 117.50.',
              'One-time enrollment fee: EUR 50. Textbooks: EUR 23.99 to EUR 26.99.',
              'In intensive format, one full CEFR level usually takes around 8 to 9 weeks.',
            ],
    };
  }

  if (normalizedSlug.includes('evening')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Berufstätige und Auszubildende, die nach der Arbeit strukturiert lernen möchten.'
          : 'Working professionals and trainees who need structured progress after work.',
      schedule:
        locale === 'de'
          ? 'Ganzjährig, in der Regel 2 Abende/Woche (Mo/Mi oder Di/Do), 18:30 bis 20:00 Uhr'
          : 'Year-round, usually 2 evenings/week (Mon/Wed or Tue/Thu), 18:30 to 20:00',
      intensity: locale === 'de' ? 'Halbes Niveau in ca. 3,5 Monaten' : 'Half-level progression in about 3.5 months',
      outcomes: baseOutcomes,
      facts: locale === 'de'
          ? [
              'Kursgebühr pro Trimester: 476 EUR plus Lehrwerk (variiert je nach Niveaustufe).',
              'A1.1 startet am Kursbeginn; mit Vorkenntnissen ist ein Einstieg oft auch laufend möglich (bei freien Plätzen).',
              'Innerhalb eines Jahres sind typischerweise etwa 1,5 Niveaustufen (CEFR) möglich.',
            ]
          : [
              'Course fee per trimester: EUR 476 plus textbook (varies by level).',
              'A1.1 starts at term start; with prior knowledge, joining ongoing classes is often possible (if seats are open).',
              'Within one year, learners typically complete around 1.5 CEFR sub-levels.',
            ],
    };
  }

  if (normalizedSlug.includes('medical')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Ärztinnen, Ärzte und medizinische Fachkräfte mit Ziel klinischer Sprachsicherheit.'
          : 'Doctors and healthcare professionals preparing for clinical communication.',
      schedule: locale === 'de' ? 'Freitags, 13:00 bis 16:30 Uhr, 26.06. bis 28.08.2026' : 'Fridays, 13:00 to 16:30, 26 Jun to 28 Aug 2026',
      intensity: baseIntensity,
      outcomes: baseOutcomes,
      facts:
        locale === 'de'
          ? [
              'Schwerpunkt auf Patientengesprächen, Anamnese, Übergaben und Dokumentation.',
              'Fachsprache wird über Fallbeispiele und Rollenspiele gefestigt.',
              'Kursgebühr: 400 EUR, plus 50 EUR Einschreibegebühr bei Erstanmeldung.',
            ]
          : [
              'Focus areas include consultations, case history language, handovers, and documentation.',
              'Medical language is trained through role-plays and case-based practice.',
              'Course fee: EUR 400, plus EUR 50 enrollment fee for first-time registration.',
            ],
    };
  }

  if (normalizedSlug.includes('bildungszeit')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Berufstätige, die Bildungszeit oder AZAV-bezogene Deutschförderung planen.'
          : 'Employees planning educational leave or AZAV-related German training.',
      schedule: locale === 'de' ? 'Kompakte Tagesblöcke nach bestätigter Planung' : 'Compact daytime blocks after confirmed planning',
      intensity: baseIntensity,
      outcomes: baseOutcomes,
      facts:
        locale === 'de'
          ? [
              'Das Format ist auf kurze, wirksame Lernphasen mit hoher Unterrichtsdichte ausgerichtet.',
              'Typischer Fokus: spürbarer Fortschritt in begrenzter Zeit.',
              'CASA klärt vor der Anmeldung, ob Bildungszeit/AZAV für den konkreten Fall passt.',
            ]
          : [
              'The format is designed for short, high-impact phases with high lesson density.',
              'Typical focus: visible progress within a limited time window.',
              'CASA confirms whether Bildungszeit/AZAV fits the specific case before registration.',
            ],
    };
  }

  if (normalizedSlug.includes('in-company') || normalizedSlug.includes('company')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Unternehmen, die Team-Kommunikation auf Deutsch im Arbeitsalltag verbessern wollen.'
          : 'Company teams that need stronger German communication at work.',
      schedule: locale === 'de' ? 'Nach Teambedarf: vor Ort, online oder hybrid' : 'Based on team needs: on-site, online, or hybrid',
      intensity: baseIntensity,
      outcomes: baseOutcomes,
      facts: locale === 'de'
          ? [
              'Einstieg über Bedarfsanalyse mit Lernzielen pro Rolle oder Abteilung.',
              'Branchenspezifisches Vokabular wird direkt in Meetings und Prozessen geübt.',
              'Unterrichtszeiten lassen sich an Schicht- oder Projektlogik anpassen.',
            ]
          : [
              'Starts with needs analysis and role-specific learning targets.',
              'Industry vocabulary is trained directly in meeting and workflow scenarios.',
              'Schedules can be adapted to shift plans and project cycles.',
            ],
    };
  }

  if (normalizedSlug.includes('special')) {
    return {
      bestFor:
        locale === 'de'
          ? 'Lernende mit klaren Schwerpunkten wie Schreiben, Sprechen oder Grammatik.'
          : 'Learners who want targeted progress in one skill area (speaking, writing, or grammar).',
      schedule: baseSchedule,
      intensity: baseIntensity,
      outcomes: baseOutcomes,
      facts:
        locale === 'de'
          ? [
              'Kompakte Module setzen gezielt an konkreten Lernlücken an.',
              'Gut kombinierbar mit Intensiv- oder Abendkursen.',
              'Praxisorientiertes Feedback sorgt für schnellen Transfer in den Alltag.',
            ]
          : [
              'Compact modules focus on specific learning gaps quickly.',
              'Easy to combine with intensive or evening pathways.',
              'Practice-first feedback helps transfer skills to daily life fast.',
            ],
    };
  }

  return {
    bestFor: baseBestFor,
    schedule: baseSchedule,
    intensity: baseIntensity,
    outcomes: baseOutcomes,
    facts:
      locale === 'de'
        ? [
            'CASA begleitet den Lernweg von A1 bis C1 mit klaren Niveauzielen.',
            'Eine Einstufung hilft, das passende Startlevel festzulegen.',
            'Starttermine und Plätze werden durch das Office-Team bestätigt.',
          ]
        : [
            'CASA supports progression from A1 to C1 with clear level milestones.',
            'Placement support helps define your strongest starting point.',
            'Start dates and seat availability are confirmed with the office team.',
          ],
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
  const featuredCourses = filterCourses(finderData.courses, activeFacets).slice(0, 6);

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
        (locale === 'de' ? 'Klarer Sprachaufbau mit betreuten Lernschritten.' : 'Structured language growth with supported steps.'),
      bestFor: course.narrative?.audience || (locale === 'de' ? 'Geeignet für internationale Lernende' : 'Best for: international learners'),
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
    Options carry a live count, and one that would return nothing is disabled
    rather than offered. The count is computed with that field held out (see
    countsForField), so "Evening (2)" is a promise about what clicking it does
    given everything else already selected — not a number from the full
    catalogue that a second filter then contradicts.
  */
  const levelValues = [...CEFR_LADDER];
  const levelCounts = countsForField(finderData.courses, 'level', levelValues, activeFacets);
  const scheduleCounts = countsForField(finderData.courses, 'schedule', [...SCHEDULE_VALUES], activeFacets);
  const goalCounts = countsForField(finderData.courses, 'goal', [...GOAL_VALUES], activeFacets);

  const scheduleLabels: Record<(typeof SCHEDULE_VALUES)[number], string> = {
    intensive: locale === 'de' ? 'Intensiv' : 'Intensive',
    evening: locale === 'de' ? 'Abend' : 'Evening',
    daytime: locale === 'de' ? 'Tagsüber' : 'Daytime',
    flexible: locale === 'de' ? 'Nach Absprache' : 'By arrangement',
  };
  const goalLabels: Record<(typeof GOAL_VALUES)[number], string> = {
    exam: locale === 'de' ? 'Prüfung' : 'Exam prep',
    medical: locale === 'de' ? 'Medizin' : 'Medical',
    professional: locale === 'de' ? 'Beruflich' : 'Professional',
    general: locale === 'de' ? 'Allgemein' : 'General',
  };

  const withCount = (label: string, count: number) => `${label} (${count})`;

  const quickChooserFields = [
    {
      key: 'level',
      label: locale === 'de' ? 'Niveau' : 'Level',
      options: [
        { label: locale === 'de' ? 'Alle' : 'All', value: '' },
        ...levelValues.map((value) => ({
          label: value,
          value,
          count: levelCounts[value] ?? 0,
          disabled: (levelCounts[value] ?? 0) === 0,
        })),
      ],
    },
    {
      key: 'schedule',
      label: locale === 'de' ? 'Zeitplan' : 'Schedule',
      options: [
        { label: locale === 'de' ? 'Beliebig' : 'Any', value: '' },
        ...SCHEDULE_VALUES.map((value) => ({
          label: withCount(scheduleLabels[value], scheduleCounts[value] ?? 0),
          value,
          count: scheduleCounts[value] ?? 0,
          disabled: (scheduleCounts[value] ?? 0) === 0,
        })),
      ],
    },
    {
      key: 'goal',
      label: locale === 'de' ? 'Ziel' : 'Goal',
      options: [
        { label: locale === 'de' ? 'Beliebig' : 'Any', value: '' },
        ...GOAL_VALUES.map((value) => ({
          label: withCount(goalLabels[value], goalCounts[value] ?? 0),
          value,
          count: goalCounts[value] ?? 0,
          disabled: (goalCounts[value] ?? 0) === 0,
        })),
      ],
    },
  ];

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Kurse' : 'Courses' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <HeroBEditorial
        eyebrow={hero.eyebrow}
        title={locale === 'de' ? 'Kursformate für Ihre Ziele' : 'Course formats for your goals'}
        description={locale === 'de' ? 'Entdecken Sie CASA-Kursformate mit menschlicher Orientierung, klaren Vergleichen und praktischen nächsten Schritten.' : 'Explore CASA course formats with human-centered guidance, clear comparisons, and practical next steps.'}
        photo={pageConfig.photos.thumbA}
        ctas={pageConfig.ctas}
        proofItems={[]}
        breadcrumbs={breadcrumbs}
        useQuickChooser={rhythm.allowQuickChooser}
        chooser={{
          title: locale === 'de' ? 'Kursfinder' : 'Course finder',
          description:
            locale === 'de'
              ? 'Wählen Sie Niveau, Zeitplan und Ziel. Wir zeigen passende Kurse sofort.'
              : 'Pick level, schedule, and goal. We show matching courses instantly.',
          badgeLabel: locale === 'de' ? 'Lernroute' : 'Learning route',
          summaryLabel: locale === 'de' ? 'Ihre Auswahl' : 'Your selection',
          fields: quickChooserFields,
          submitLabel: locale === 'de' ? 'Kurse filtern' : 'Filter courses',
          submitHref: '/courses',
          secondaryLabel: locale === 'de' ? 'Alle Kurse' : 'View all courses',
          secondaryHref: '/courses',
          initialValues: {
            level: selectedLevel,
            schedule: selectedSchedule,
            goal: selectedGoal,
          },
        }}
        themeClassName="hero-theme-courses"
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
          <div className="mx-auto max-w-[46rem] text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
              {locale === 'de' ? 'Kursauswahl' : 'Course shortlist'}
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-white md:text-4xl">
              {locale === 'de' ? 'Unsere Kursformate im Überblick' : 'Every format we teach'}
            </h2>
            <p className="mx-auto mt-5 max-w-measure text-base leading-relaxed text-white/72 md:text-lg">
              {locale === 'de'
                ? 'Sechs Wege zum gleichen Ziel. Der Unterschied liegt im Rhythmus, nicht im Anspruch.'
                : 'Six routes to the same goal. What differs is the rhythm, not the standard.'}
            </p>
          </div>

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
                  ? 'Ändern Sie einen Filter, oder lassen Sie uns Ihr Niveau gemeinsam bestimmen.'
                  : 'Change one filter, or let us work out your level together.'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-[var(--casa-ink-deep)]"
                >
                  {locale === 'de' ? 'Filter zurücksetzen' : 'Clear filters'}
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
        Deliberately absent: the "EUR 50 enrolment fee" and "EUR 23.99-26.99
        textbook" figures that buildSelectorCopy renders elsewhere on this page.
        Neither appears in the verified table, and CLAUDE.md forbids shipping a
        course number that is not verified there.

        No photographs. The six format cards above already carry the page's
        images, and four short facts do not need illustrating.
      */}
      <section className="py-16 md:py-24 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30">
        <Container className="space-y-10 md:space-y-12">
          <div className="mx-auto max-w-[46rem] text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
              {locale === 'de' ? 'Vor der Anmeldung' : 'Before you enrol'}
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-[var(--casa-ink)] md:text-4xl">
              {locale === 'de' ? 'Vier Dinge, die Sie vorher wissen sollten' : 'Four things worth knowing first'}
            </h2>
            <p className="mx-auto mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
              {locale === 'de'
                ? 'Erst die Fragen, die für alle Formate gelten — dann der Vergleich der Formate selbst.'
                : 'First the questions that apply to every format, then the formats themselves compared.'}
            </p>
          </div>

          <ul className="mx-auto grid max-w-[76rem] gap-x-10 gap-y-10 md:grid-cols-2 md:gap-y-12">
            {[
              {
                title: locale === 'de' ? 'Ihr Niveau steht am Anfang' : 'Your level comes first',
                body:
                  locale === 'de'
                    ? 'Jeder Kurs setzt eine Einstufung voraus. Der Einstufungstest ist kostenlos und dauert wenige Minuten — er entscheidet, in welcher Gruppe Sie starten.'
                    : 'Every format starts from a placement. The test is free and takes a few minutes, and it decides which group you join.',
                linkHref: '/placement-test',
                linkLabel: locale === 'de' ? 'Zum Einstufungstest' : 'Take the placement test',
              },
              {
                title: locale === 'de' ? 'Wie schnell ein Niveau vergeht' : 'How long a level takes',
                body:
                  locale === 'de'
                    ? 'Im Intensivkurs dauert eine komplette Niveaustufe etwa 8 bis 9 Wochen bei 20 UE pro Woche. Im Abendkurs sind es rund 3,5 Monate für ein halbes Niveau, also etwa 1,5 Stufen pro Jahr.'
                    : 'Intensive covers a full CEFR level in about 8 to 9 weeks at 20 lessons a week. Evening covers half a level in roughly 3.5 months — around 1.5 levels a year.',
              },
              {
                title: locale === 'de' ? 'Prüfungsvorbereitung ist ein eigener Kurs' : 'Exam preparation is a separate course',
                body:
                  locale === 'de'
                    ? 'Die Vorbereitung auf telc gehört ausdrücklich nicht zum Intensivprogramm. Wer ein Zertifikat braucht, bucht sie zusätzlich.'
                    : 'Preparing for a telc certificate is explicitly not part of the intensive programme. If you need the certificate, book it alongside.',
                linkHref: '/exams',
                linkLabel: locale === 'de' ? 'Prüfungen ansehen' : 'See exams',
              },
              {
                title: locale === 'de' ? 'Zwei Formate ohne Listenpreis' : 'Two formats are quoted individually',
                body:
                  locale === 'de'
                    ? 'Deutsch für Gruppen und Firmenunterricht werden nach Bedarf zusammengestellt und individuell angeboten — beim Gruppenkurs inklusive Unterkunft, Kulturprogramm und Nahverkehrsticket.'
                    : 'German for Groups and Firmenunterricht are built to a brief and quoted individually — the group programme including accommodation, a culture programme and a transit pass.',
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
                  ? 'Wählen Sie ein Format und sehen Sie Rhythmus, Lernumfang und typische Ergebnisse.'
                  : 'Pick a format to see its rhythm, weekly load and likely outcomes.'
              }
              items={selectorItems}
              labels={{
                signature: locale === 'de' ? 'Kursentscheidung' : 'Course decision',
                bestFor: locale === 'de' ? 'Am besten geeignet für' : 'Best for',
                schedule: locale === 'de' ? 'Kursrhythmus' : 'Schedule rhythm',
                intensity: locale === 'de' ? 'Lernumfang' : 'Learning load',
                outcomes: locale === 'de' ? 'Wahrscheinliche Lernergebnisse' : 'Likely outcomes',
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
      <section className="py-16 md:py-24 bg-[var(--casa-surface-wash)]/30">
        <Container>
          <ProofBand locale={locale} />
        </Container>
      </section>

    </main>
  );
}
