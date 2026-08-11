import type { Metadata } from 'next';

import Image from 'next/image';
import Link from 'next/link';

import { HeroBEditorial } from '@/components/heroes';
import {
  ComparisonModule,
  GuidedPicker,
  OnboardingQuiz,
  ProofBand,
  SavedCompareTray,
} from '@/components/sections';
import { Button } from '@/components/ui/button';
import { CoursesFormatSelector } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCoursePath } from '@/lib/content/course-routes';
import { formatVisaEligibility } from '@/lib/content/course-pricing';
import { getCourseFinderData, getCourseRegistrationCatalog, getPageHero, getSocialProof } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'German Courses',
  description:
    'Explore CASA course formats with human-centered guidance, clear comparisons, and practical next steps.',
  path: '/courses',
  keywords: ['CASA courses', 'German course Bremen', 'Course formats A1 C1'],
});

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
              'Einmalige Einschreibegebühr: 50 EUR. Lehrmaterial: 23,99 EUR bis 26,99 EUR je nach Niveaustufe.',
              'Ein ganzes Niveau dauert im Intensivformat in der Regel etwa 8 bis 9 Wochen.',
            ]
          : [
              'Fees: 4 weeks EUR 520, 8 weeks (full level) EUR 940, each additional week EUR 117.50.',
              'One-time enrollment fee: EUR 50. Textbooks: EUR 23.99 to EUR 26.99 depending on level.',
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
  searchParams: Promise<{ compare?: string; level?: string; schedule?: string; goal?: string }>;
}) {
  const locale = await getContentLocale();
  const { compare, level, schedule, goal } = await searchParams;
  const rhythm = getLayoutRhythm('courses-index');
  const pageConfig = getPublicPageConfig('courses', locale);

  const [hero, finderData, registrationCatalog, stories] = await Promise.all([
    Promise.resolve(getPageHero('courses', locale)),
    getCourseFinderData(locale),
    getCourseRegistrationCatalog(locale),
    Promise.resolve(getSocialProof(locale)),
  ]);

  const selectedLevelCandidate = typeof level === 'string' ? level.toUpperCase() : '';
  const selectedLevel = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(selectedLevelCandidate)
    ? selectedLevelCandidate
    : '';
  const selectedScheduleCandidate = typeof schedule === 'string' ? schedule.toLowerCase() : '';
  const selectedSchedule = ['weekdays', 'evening'].includes(selectedScheduleCandidate)
    ? selectedScheduleCandidate
    : '';
  const selectedGoalCandidate = typeof goal === 'string' ? goal.toLowerCase() : '';
  const selectedGoal = ['exam', 'medical', 'general'].includes(selectedGoalCandidate)
    ? selectedGoalCandidate
    : '';
  const hasActiveQuickFilters = Boolean(selectedLevel || selectedSchedule || selectedGoal);
  const cefrOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const featured = finderData.courses
    .filter((course) => {
      if (selectedLevel) {
        const targetIndex = cefrOrder.indexOf(selectedLevel);
        const minIndex = cefrOrder.indexOf((course.level_min ?? 'A1').toUpperCase());
        const maxIndex = cefrOrder.indexOf((course.level_max ?? 'C1').toUpperCase());
        const safeMinIndex = minIndex === -1 ? 0 : minIndex;
        const safeMaxIndex = maxIndex === -1 ? cefrOrder.length - 1 : maxIndex;

        if (targetIndex < safeMinIndex || targetIndex > safeMaxIndex) {
          return false;
        }
      }

      if (selectedSchedule) {
        const scheduleTags = finderData.scheduleTagsByCourseId[course.id] ?? [];
        if (!scheduleTags.includes(selectedSchedule)) {
          return false;
        }
      }

      if (selectedGoal) {
        const courseCorpus = [
          course.slug,
          course.name,
          course.format ?? '',
          course.narrative?.promise ?? '',
          course.narrative?.audience ?? '',
          ...(course.narrative?.outcomes ?? []),
        ]
          .join(' ')
          .toLowerCase();

        const examFocused = courseCorpus.includes('exam') || courseCorpus.includes('telc');
        const medicalFocused =
          courseCorpus.includes('medical') ||
          courseCorpus.includes('doctor') ||
          courseCorpus.includes('medizin') ||
          courseCorpus.includes('clinic');

        if (selectedGoal === 'exam' && !examFocused) {
          return false;
        }
        if (selectedGoal === 'medical' && !medicalFocused) {
          return false;
        }
        if (selectedGoal === 'general' && (examFocused || medicalFocused)) {
          return false;
        }
      }

      return true;
    })
    .slice(0, 6);

  const fallbackToRecommended = hasActiveQuickFilters && featured.length === 0;
  const featuredCourses =
    featured.length > 0 ? featured : finderData.courses.slice(0, 6);

  const nextOptionByCourseId = Object.fromEntries(
    featuredCourses.map((course) => [course.id, registrationCatalog.optionsByCourseTypeId[course.id]?.[0] ?? null])
  ) as Record<string, (typeof registrationCatalog.optionsByCourseTypeId)[string][number] | null>;

  const courseOverviewPhotos = [
    pageConfig.photos.thumbA,
    pageConfig.photos.thumbB,
    pageConfig.photos.thumbC,
    pageConfig.photos.thumbD,
    pageConfig.photos.thumbE,
    pageConfig.photos.thumbF,
  ];

  const guidedItems = featuredCourses.map((course, index) => {
    const photo = courseOverviewPhotos[index % courseOverviewPhotos.length] ?? pageConfig.photos.thumbA;

    return {
      id: course.id,
      title: course.name,
      description:
        course.narrative?.promise ||
        (locale === 'de' ? 'Klarer Sprachaufbau mit betreuten Lernschritten.' : 'Structured language growth with supported steps.'),
      bestFor: course.narrative?.audience || (locale === 'de' ? 'Geeignet für internationale Lernende' : 'Best for: international learners'),
      href: getCoursePath(course.slug),
      ctaLabel: locale === 'de' ? 'Kursplan ansehen' : 'View course plan',
      meta: `${locale === 'de' ? 'Nächster Start' : 'Next start'}: ${
        finderData.nextStartByCourseId[course.id]
          ? formatDate(finderData.nextStartByCourseId[course.id] as string, locale)
          : locale === 'de'
            ? 'TBD'
            : 'TBD'
      }`,
      deadlineIso: nextOptionByCourseId[course.id]?.startDate ?? null,
      compare: {
        id: course.id,
        title: course.name,
        href: getCoursePath(course.slug),
        meta:
          finderData.nextStartByCourseId[course.id]
            ? `${locale === 'de' ? 'Nächster Start' : 'Next start'} ${formatDate(finderData.nextStartByCourseId[course.id] as string, locale)}`
            : undefined,
      },
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

  const quickChooserFields = [
    {
      key: 'level',
      label: locale === 'de' ? 'Level' : 'Level',
      options: [
        { label: locale === 'de' ? 'Alle' : 'All', value: '' },
        { label: 'A1', value: 'A1' },
        { label: 'A2', value: 'A2' },
        { label: 'B1', value: 'B1' },
        { label: 'B2', value: 'B2' },
        { label: 'C1', value: 'C1' },
      ],
    },
    {
      key: 'schedule',
      label: locale === 'de' ? 'Zeitplan' : 'Schedule',
      options: [
        { label: locale === 'de' ? 'Beliebig' : 'Any', value: '' },
        { label: locale === 'de' ? 'Intensiv' : 'Intensive', value: 'weekdays' },
        { label: locale === 'de' ? 'Abend' : 'Evening', value: 'evening' },
      ],
    },
    {
      key: 'goal',
      label: locale === 'de' ? 'Ziel' : 'Goal',
      options: [
        { label: locale === 'de' ? 'Beliebig' : 'Any', value: '' },
        { label: locale === 'de' ? 'Prüfungsvorbereitung' : 'Exam prep', value: 'exam' },
        { label: locale === 'de' ? 'Medizin' : 'Medical', value: 'medical' },
        { label: locale === 'de' ? 'Allgemein' : 'General', value: 'general' },
      ],
    },
  ];

  const leadStory = stories[0];
  const availableSlugs = finderData.courses.map((course) => course.slug);
  const compareIds = compare ? compare.split(',').map((item) => decodeURIComponent(item)) : [];
  const compareCourses = finderData.courses.filter((course) => compareIds.includes(course.id));

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

      {/* Section 1: Interactive Finder Quiz */}
      <section className="py-16 md:py-20 bg-white">
        <Container className="space-y-6">
          <OnboardingQuiz locale={locale} availableSlugs={availableSlugs} />
          {fallbackToRecommended ? (
            <article className="rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/45 px-4 py-3 text-sm text-[var(--casa-ink)]">
              {locale === 'de'
                ? 'Keine exakte Kombination gefunden. Wir zeigen die besten verfügbaren Optionen.'
                : 'No exact match found for this combination. Showing the best available options.'}
            </article>
          ) : null}
        </Container>
      </section>

      {/* Section 2: Guided Picker Shortlist */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-slate-50/30">
        <Container>
          <GuidedPicker
            eyebrow={locale === 'de' ? 'Kursauswahl' : 'Course shortlist'}
            title={locale === 'de' ? 'Primäre Kursoptionen' : 'Primary course options'}
            description={
              locale === 'de'
                ? 'Die wichtigsten Formate zuerst, damit Ihre Entscheidung leichter fällt.'
                : 'See the key formats first to make decisions faster.'
            }
            items={guidedItems}
            locale={locale}
            compareType="course"
          />
        </Container>
      </section>

      {/* Section 3: Detailed Format Selector Specs */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
        <Container>
          <CoursesFormatSelector
            title={
              locale === 'de'
                ? 'Kursformat-Selektor: So funktioniert jedes Format bei CASA'
                : 'Course format selector: how each format works at CASA'
            }
            description={
              locale === 'de'
                ? 'Auf Basis der CASA-Kursstruktur in Bremen vergleichen Sie Rhythmus, Lernumfang und typische Ergebnisse für jede Lernroute.'
                : 'Based on CASA course structure in Bremen, compare rhythm, workload, and typical outcomes for each learning route.'
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
        </Container>
      </section>

      {/* Section 4: Human Perspective & Course Advising */}
      {leadStory ? (
        <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-slate-50/30">
          <Container className="space-y-12 md:space-y-16">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Der menschliche Unterschied' : 'The Human Difference'}
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-[var(--casa-ink)] sm:text-4xl">
                {locale === 'de' ? 'Unterstützung auf jedem Schritt Ihres Weges' : 'Support on Every Step of Your Journey'}
              </h2>
              <p className="text-base text-[var(--casa-muted)] md:text-lg">
                {locale === 'de'
                  ? 'Erfahren Sie von unseren Teilnehmenden, wie sich das Lernen anfühlt, und wie wir Sie akademisch begleiten.'
                  : 'Hear from our students about their learning experience and see how our academic advisors guide you.'}
              </p>
            </div>

            <div className="rounded-3xl bg-[var(--casa-warm-soft)]/32 border border-[color:var(--casa-sand)]/60 p-6 md:p-10 space-y-12 md:space-y-16 shadow-[var(--shadow-soft)]">
              {/* Part 1: Student Story */}
              <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
                <figure className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)]">
                  <div className="casa-media-overlay relative h-80 md:h-[420px]">
                      <Image
                      src={pageConfig.photos.story.src}
                      alt={pageConfig.photos.story.alt}
                      fill
                      sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 45vw, 95vw"
                      className="object-cover"
                    />
                  </div>
                </figure>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                    {locale === 'de' ? 'Teilnehmerbericht' : 'Student story'}
                  </p>
                  <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
                  <h3 className="mt-3 text-2xl font-extrabold leading-tight text-[var(--casa-ink)] sm:text-3xl">
                    {locale === 'de' ? 'Wie sich der passende Kurs im Alltag anfühlt' : 'How the right course format feels in real life'}
                  </h3>
                  <blockquote className="mt-4 text-lg font-medium leading-relaxed text-[var(--casa-ink)]">
                    &quot;{leadStory.quote}&quot;
                  </blockquote>
                  <p className="mt-3 text-base font-medium text-[var(--casa-muted)]">
                    {leadStory.personDisplay} - {leadStory.country}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">
                    {locale === 'de'
                      ? 'Mit klarer Struktur und passendem Rhythmus entstehen Fortschritt und Sicherheit gleichzeitig.'
                      : 'When structure matches your rhythm, progress and confidence grow together.'}
                  </p>
                  <Button asChild variant="prism" className="mt-7">
                    <Link href={compareCourses.length >= 2 ? '/courses?compare=' + compareCourses.map((course) => course.id).join(',') : '/courses'}>
                      {locale === 'de' ? 'Kurse vergleichen' : 'Compare courses'}
                    </Link>
                  </Button>
                </div>
              </div>

              <hr className="border-[color:var(--casa-sand)]/60" />

              {/* Part 2: Academic Guidance */}
              <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr]">
                <div className="lg:order-1">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                    {locale === 'de' ? 'Kursberatung' : 'Academic guidance'}
                  </p>
                  <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
                  <h3 className="mt-3 text-2xl font-extrabold leading-tight text-[var(--casa-ink)] sm:text-3xl">
                    {locale === 'de' ? 'Persönliche Lernwege brauchen Orientierung' : 'Human learning journeys need clear guidance'}
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                    {locale === 'de'
                      ? 'Unsere Kursberatung verbindet akademische Ziele mit realen Lebenssituationen in Bremen.'
                      : 'Course advising connects academic goals with real-life realities in Bremen.'}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      locale === 'de' ? 'Lehrkräfte geben kontinuierliches Feedback' : 'Teachers provide consistent feedback',
                      locale === 'de' ? 'Kleine Lerngruppen steigern Sprechzeit' : 'Small groups increase speaking time',
                      locale === 'de' ? 'Flexible Pfade für Studium und Beruf' : 'Flexible pathways for study and career',
                    ].map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-base text-[var(--casa-ink)]">
                        <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--casa-blue)]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:order-2">
                  <figure className="overflow-hidden rounded-3xl bg-white/80 shadow-[var(--shadow-card)]">
                    <div className="casa-media-overlay relative h-80 md:h-[420px]">
                      <Image
                        src={pageConfig.photos.guidance.src}
                        alt={pageConfig.photos.guidance.alt}
                        fill
                        sizes="(min-width: 1280px) 42vw, (min-width: 1024px) 45vw, 95vw"
                        className="object-cover"
                      />
                    </div>
                  </figure>
                </div>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* Section 6: Format Comparison Modules */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-slate-50/30">
        <Container className="space-y-12 md:space-y-16">
          <ComparisonModule
            eyebrow={locale === 'de' ? 'Formatvergleich' : 'Format comparison'}
            title={locale === 'de' ? 'Intensivkurs vs Abendkurs' : 'Intensive vs Evening'}
            description={
              locale === 'de'
                ? 'Vergleich für Zeitbudget, Tempo und Lernziele.'
                : 'A practical comparison of time commitment, pace, and outcomes.'
            }
            leftTitle={locale === 'de' ? 'Intensivkurs' : 'Intensive'}
            rightTitle={locale === 'de' ? 'Abendkurs' : 'Evening'}
            rows={[
              {
                label: locale === 'de' ? 'Zeitplan' : 'Schedule',
                left: locale === 'de' ? 'Monatliche Starts, abwechselnd Vormittag/Nachmittag' : 'Monthly starts, alternating morning/afternoon cohorts',
                right: locale === 'de' ? '2 Abende/Woche (Mo/Mi oder Di/Do), 18:30-20:00' : '2 evenings/week (Mon/Wed or Tue/Thu), 18:30-20:00',
              },
              {
                label: locale === 'de' ? 'Geeignet für' : 'Best for',
                left: locale === 'de' ? 'Schneller Fortschritt' : 'Fast progress',
                right: locale === 'de' ? 'Berufsbegleitend' : 'Working professionals',
              },
              {
                label: locale === 'de' ? 'Typischer Outcome' : 'Typical outcome',
                left: locale === 'de' ? 'Schneller Niveausprung' : 'Faster level progression',
                right: locale === 'de' ? 'Stabile Routine' : 'Stable weekly consistency',
              },
              {
                label: locale === 'de' ? 'Wochenumfang' : 'Weekly load',
                left: locale === 'de' ? '20 Lektionen pro Woche' : '20 lessons per week',
                right: locale === 'de' ? '2 Unterrichtsabende pro Woche' : '2 class evenings per week',
              },
              {
                label: locale === 'de' ? 'Lerntempo' : 'Pace',
                left: locale === 'de' ? 'Komplettes Niveau meist in 8-9 Wochen' : 'Full level typically in 8-9 weeks',
                right: locale === 'de' ? 'Halbes Niveau in ca. 3,5 Monaten' : 'Half-level in about 3.5 months',
              },
              {
                label: locale === 'de' ? 'Gebühren' : 'Fees',
                left: locale === 'de' ? '520 EUR (4 Wochen), 940 EUR (8 Wochen), +117,50 EUR je weitere Woche' : 'EUR 520 (4 weeks), EUR 940 (8 weeks), +EUR 117.50 per extra week',
                right: locale === 'de' ? '476 EUR pro Trimester (+ Lehrwerk)' : 'EUR 476 per trimester (+ textbook)',
              },
              {
                label: locale === 'de' ? 'Zusatzkosten' : 'Additional costs',
                left: locale === 'de' ? 'Einmalige Einschreibegebühr 50 EUR + Lehrmaterial 23,99-26,99 EUR' : 'One-time enrollment fee EUR 50 + books EUR 23.99-26.99',
                right: locale === 'de' ? 'Lehrwerk je nach Niveaustufe' : 'Textbook cost depends on level',
              },
            ]}
          />

          {compareCourses.length >= 2 ? (
            <div id="course-compare-section" className="scroll-mt-28">
              <ComparisonModule
                eyebrow={locale === 'de' ? 'Gespeicherter Vergleich' : 'Saved compare'}
                title={locale === 'de' ? 'Ihre ausgewählten Kurse' : 'Your selected courses'}
                description={
                  locale === 'de'
                    ? 'Vergleich aus dem gespeicherten Tray.'
                    : 'Comparison from your saved tray.'
                }
                leftTitle={compareCourses[0]?.name ?? ''}
                rightTitle={compareCourses[1]?.name ?? ''}
                rows={[
                  {
                    label: locale === 'de' ? 'Niveau' : 'Level',
                    left: `${compareCourses[0]?.level_min ?? 'A1'} - ${compareCourses[0]?.level_max ?? 'C1'}`,
                    right: `${compareCourses[1]?.level_min ?? 'A1'} - ${compareCourses[1]?.level_max ?? 'C1'}`,
                  },
                  {
                    label: locale === 'de' ? 'Lektionen/Woche' : 'Lessons/week',
                    left: String(compareCourses[0]?.lessons_per_week ?? '-'),
                    right: String(compareCourses[1]?.lessons_per_week ?? '-'),
                  },
                  {
                    label: locale === 'de' ? 'Nächster Start' : 'Next start',
                    left: finderData.nextStartByCourseId[compareCourses[0]?.id ?? '']
                      ? formatDate(String(finderData.nextStartByCourseId[compareCourses[0]?.id ?? '']), locale)
                      : 'TBD',
                    right: finderData.nextStartByCourseId[compareCourses[1]?.id ?? '']
                      ? formatDate(String(finderData.nextStartByCourseId[compareCourses[1]?.id ?? '']), locale)
                      : 'TBD',
                  },
                  {
                    label: locale === 'de' ? 'Format' : 'Format',
                    left: compareCourses[0]?.format ?? '-',
                    right: compareCourses[1]?.format ?? '-',
                  },
                  {
                    label: locale === 'de' ? 'Preis ab' : 'Price from',
                    left: `${compareCourses[0]?.default_price ?? '-'} ${compareCourses[0]?.currency ?? 'EUR'}`,
                    right: `${compareCourses[1]?.default_price ?? '-'} ${compareCourses[1]?.currency ?? 'EUR'}`,
                  },
                  {
                    label: locale === 'de' ? 'Visa-geeignet' : 'Visa suitable',
                    left: formatVisaEligibility(finderData.visaEligibleByCourseId[compareCourses[0]?.id ?? ''] ?? null, locale),
                    right: formatVisaEligibility(finderData.visaEligibleByCourseId[compareCourses[1]?.id ?? ''] ?? null, locale),
                  },
                  {
                    label: locale === 'de' ? 'Nächster Schritt' : 'Next step',
                    left: (compareCourses[0]?.level_min ?? 'A1').toUpperCase().startsWith('A')
                      ? locale === 'de'
                        ? 'Einstufung zuerst'
                        : 'Book placement first'
                      : locale === 'de'
                        ? 'Zur Kursanmeldung'
                        : 'Reserve course spot',
                    right: (compareCourses[1]?.level_min ?? 'A1').toUpperCase().startsWith('A')
                      ? locale === 'de'
                        ? 'Einstufung zuerst'
                        : 'Book placement first'
                      : locale === 'de'
                        ? 'Zur Kursanmeldung'
                        : 'Reserve course spot',
                  },
                ]}
              />
            </div>
          ) : null}
        </Container>
      </section>

      {/* Section 7: Proof Band */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
        <Container>
          <ProofBand locale={locale} />
        </Container>
      </section>

      <SavedCompareTray type="course" locale={locale} comparePath="/courses" />
    </main>
  );
}
