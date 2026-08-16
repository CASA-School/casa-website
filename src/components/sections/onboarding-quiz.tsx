'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { getCoursePath } from '@/lib/content/course-routes';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

type OnboardingQuizProps = {
  locale: ContentLocale;
  availableSlugs: string[];
};

type QuizState = {
  goal: 'general' | 'exam' | 'career';
  schedule: 'intensive' | 'evening' | 'flexible';
  level: 'beginner' | 'intermediate' | 'advanced';
};

const copy = {
  en: {
    eyebrow: 'Fast route finder',
    title: '3 questions to find your best course path',
    description: 'Answer three quick questions and jump to the most relevant next step.',
    questions: {
      goal: 'Your main goal?',
      schedule: 'Preferred schedule?',
      level: 'Current level?',
    },
    options: {
      general: 'Daily communication',
      exam: 'Exam success',
      career: 'Career/professional use',
      intensive: 'Intensive',
      evening: 'Evening',
      flexible: 'Flexible',
      beginner: 'A1-A2',
      intermediate: 'B1-B2',
      advanced: 'C1+',
    },
    recommendation: 'Recommended next step',
    openPath: 'Open path',
  },
  de: {
    eyebrow: 'Schneller Wegfinder',
    title: '3 Fragen zum passenden Kursweg',
    description: 'Beantworten Sie drei kurze Fragen und gehen Sie direkt zum besten nächsten Schritt.',
    questions: {
      goal: 'Ihr Hauptziel?',
      schedule: 'Bevorzugter Zeitplan?',
      level: 'Aktuelles Niveau?',
    },
    options: {
      general: 'Alltagskommunikation',
      exam: 'Prüfungserfolg',
      career: 'Beruflicher Fokus',
      intensive: 'Intensiv',
      evening: 'Abend',
      flexible: 'Flexibel',
      beginner: 'A1-A2',
      intermediate: 'B1-B2',
      advanced: 'C1+',
    },
    recommendation: 'Empfohlener nächster Schritt',
    openPath: 'Pfad öffnen',
  },
} as const;

function pickRoute(state: QuizState, availableSlugs: Set<string>) {
  if (state.level === 'beginner') {
    return {
      href: '/placement-test',
      labelEn: 'Book placement first',
      labelDe: 'Einstufung zuerst buchen',
    };
  }

  if (state.goal === 'exam') {
    return {
      href: '/exams',
      labelEn: 'Go to exam pathway',
      labelDe: 'Zum Prüfungsweg',
    };
  }

  if (state.goal === 'career') {
    if (availableSlugs.has('business-german')) {
      return { href: getCoursePath('business-german'), labelEn: 'Explore business German', labelDe: 'Business-Deutsch ansehen' };
    }

    if (availableSlugs.has('medical-german')) {
      return { href: getCoursePath('medical-german'), labelEn: 'Explore medical German', labelDe: 'Medizin-Deutsch ansehen' };
    }
  }

  if (state.schedule === 'evening' && availableSlugs.has('evening-german')) {
    return { href: getCoursePath('evening-german'), labelEn: 'See evening format', labelDe: 'Abendformat ansehen' };
  }

  if (state.schedule === 'intensive' && availableSlugs.has('intensive-german')) {
    return { href: getCoursePath('intensive-german'), labelEn: 'See intensive format', labelDe: 'Intensivformat ansehen' };
  }

  return { href: '/courses', labelEn: 'View all courses', labelDe: 'Alle Kurse ansehen' };
}

export function OnboardingQuiz({ locale, availableSlugs }: OnboardingQuizProps) {
  const [state, setState] = useState<QuizState>({
    goal: 'general',
    schedule: 'intensive',
    level: 'intermediate',
  });

  const dictionary = copy[locale];
  const route = useMemo(
    () => pickRoute(state, new Set(availableSlugs)),
    [availableSlugs, state]
  );

  return (
    <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-7">
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{dictionary.eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{dictionary.title}</h2>
      <p className="mt-3 text-base text-[var(--casa-muted)] md:text-lg">{dictionary.description}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-[var(--casa-ink)]">{dictionary.questions.goal}</legend>
          {(['general', 'exam', 'career'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setState((current) => ({ ...current, goal: value }))}
              className={cn(
                'w-full rounded-xl border px-3 py-2 text-left text-sm font-medium',
                state.goal === value
                  ? 'border-[var(--casa-blue)]/35 bg-[var(--casa-blue)]/10 text-[var(--casa-ink)]'
                  : 'border-[color:var(--casa-sand)] text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]'
              )}
            >
              {dictionary.options[value]}
            </button>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-[var(--casa-ink)]">{dictionary.questions.schedule}</legend>
          {(['intensive', 'evening', 'flexible'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setState((current) => ({ ...current, schedule: value }))}
              className={cn(
                'w-full rounded-xl border px-3 py-2 text-left text-sm font-medium',
                state.schedule === value
                  ? 'border-[var(--casa-blue)]/35 bg-[var(--casa-blue)]/10 text-[var(--casa-ink)]'
                  : 'border-[color:var(--casa-sand)] text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]'
              )}
            >
              {dictionary.options[value]}
            </button>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-[var(--casa-ink)]">{dictionary.questions.level}</legend>
          {(['beginner', 'intermediate', 'advanced'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setState((current) => ({ ...current, level: value }))}
              className={cn(
                'w-full rounded-xl border px-3 py-2 text-left text-sm font-medium',
                state.level === value
                  ? 'border-[var(--casa-blue)]/35 bg-[var(--casa-blue)]/10 text-[var(--casa-ink)]'
                  : 'border-[color:var(--casa-sand)] text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]'
              )}
            >
              {dictionary.options[value]}
            </button>
          ))}
        </fieldset>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--casa-warm-soft)]/30 px-4 py-3">
        <p className="text-sm font-semibold text-[var(--casa-ink)]">
          {dictionary.recommendation}: <span className="font-bold">{locale === 'de' ? route.labelDe : route.labelEn}</span>
        </p>
        <Link
          href={route.href}
          className="inline-flex rounded-full bg-[var(--casa-ink-deep)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]"
        >
          {dictionary.openPath}
        </Link>
      </div>
    </section>
  );
}
