import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { HeroBEditorial } from '@/components/heroes';
import {
  ComparisonModule,
  GuidedPicker,
  ProofBand,
} from '@/components/sections';
import { CoursesFormatSelector } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getCoursePhoto } from '@/config/courses/course-photos';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCoursePath } from '@/lib/content/course-routes';
import { getCourseFinderData, getCourseRegistrationCatalog, getPageHero } from '@/lib/content/repository';
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

  const [hero, finderData, registrationCatalog] = await Promise.all([
    Promise.resolve(getPageHero('courses', locale)),
    getCourseFinderData(locale),
    getCourseRegistrationCatalog(locale),
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

  const guidedItems = featuredCourses.map((course) => {
    /*
      Resolved from the course, never from its position in this list. The list
      is sorted by lessons_per_week and re-filtered by the ?level / ?schedule /
      ?goal params, so a positional lookup made a card's photograph change when
      the visitor filtered. See getCoursePhoto for the measurements.
    */
    const photo = getCoursePhoto(course.slug, locale);

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

      {/* Section 1: Guided Picker Shortlist */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30">
        <Container>
          {/*
            Moved here from the removed route-finder section. It reports on the
            hero's course filter, so it belongs immediately above the results it
            is describing rather than a section away from them.
          */}
          {fallbackToRecommended ? (
            <article className="mb-8 rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/45 px-4 py-3 text-sm text-[var(--casa-ink)]">
              {locale === 'de'
                ? 'Keine exakte Kombination gefunden. Wir zeigen die besten verfügbaren Optionen.'
                : 'No exact match found for this combination. Showing the best available options.'}
            </article>
          ) : null}
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
            /*
              The accepted card design (Variant C on
              /design-system/course-format-variants). It is also the only
              presentation that emits per-item DOM ids, so course anchors keep
              working from the nav and from deep links.
            */
            presentation="courseSignalCards"
          />
        </Container>
      </section>

      {/*
        Section 3: Practical facts before choosing.

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

      {/* Section 6: Format Comparison Modules */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30">
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

        </Container>
      </section>

      {/* Section 7: Proof Band */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
        <Container>
          <ProofBand locale={locale} />
        </Container>
      </section>

    </main>
  );
}
