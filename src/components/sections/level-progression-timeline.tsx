'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

type Level = {
  id: string;
  label: string;
  weeks: number;
  lessons: number;
  tuition: number;
  materials: number;
  description: { en: string; de: string };
};

const LEVELS: Level[] = [
  {
    id: 'a1',
    label: 'A1',
    weeks: 8,
    lessons: 160,
    tuition: 460,
    materials: 44.5,
    description: {
      en: 'Absolute beginner. Greetings, basic phrases, numbers, and everyday vocabulary.',
      de: 'Absolute Anfängerstufe. Begrüßungen, Grundphrasen, Zahlen und Alltagsvokabular.',
    },
  },
  {
    id: 'a2',
    label: 'A2',
    weeks: 8,
    lessons: 160,
    tuition: 460,
    materials: 44.5,
    description: {
      en: 'Foundation level. Short conversations, simple directions, and basic written communication.',
      de: 'Grundstufe. Kurze Gespräche, einfache Wegbeschreibungen und grundlegende schriftliche Kommunikation.',
    },
  },
  {
    id: 'b1',
    label: 'B1',
    weeks: 12,
    lessons: 240,
    tuition: 1380,
    materials: 62.38,
    description: {
      en: 'Independent user. Express opinions, handle most travel situations, write simple texts.',
      de: 'Selbstständige Sprachverwendung. Meinungen äußern, Reisesituationen meistern, einfache Texte verfassen.',
    },
  },
  {
    id: 'b2',
    label: 'B2',
    weeks: 12,
    lessons: 240,
    tuition: 1380,
    materials: 62.38,
    description: {
      en: 'Upper-intermediate. Understand complex texts, interact fluently with native speakers.',
      de: 'Gehobene Mittelstufe. Komplexe Texte verstehen und fließend mit Muttersprachlern kommunizieren.',
    },
  },
  {
    id: 'c1',
    label: 'C1',
    weeks: 12,
    lessons: 240,
    tuition: 1510,
    materials: 98.62,
    description: {
      en: 'Advanced. Academic and professional fluency, nuanced expression, complex written production.',
      de: 'Fortgeschrittene Stufe. Akademische und berufliche Sprachkompetenz, nuancierter Ausdruck.',
    },
  },
];

const TOTAL_WEEKS = LEVELS.reduce((s, l) => s + l.weeks, 0);
const TOTAL_LESSONS = LEVELS.reduce((s, l) => s + l.lessons, 0);
const TOTAL_TUITION = LEVELS.reduce((s, l) => s + l.tuition, 0);
const TOTAL_MATERIALS = LEVELS.reduce((s, l) => s + l.materials, 0);

function fmt(n: number) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

type Props = {
  locale?: 'en' | 'de';
  className?: string;
};

export function LevelProgressionTimeline({ locale = 'en', className }: Props) {
  const [active, setActive] = useState<string>('a1');
  const activeLevel = LEVELS.find((l) => l.id === active)!;

  const copy =
    locale === 'de'
      ? {
          eyebrow: 'Ihr Lernweg',
          title: 'Von A1 bis C1 — Schritt für Schritt',
          description: `${TOTAL_WEEKS} Wochen · ${TOTAL_LESSONS} Unterrichtseinheiten · Gesamtbudget ${fmt(TOTAL_TUITION + TOTAL_MATERIALS)}`,
          weeks: 'Wochen',
          lessons: 'UE',
          tuition: 'Kursgebühr',
          materials: 'Lernmaterial',
          total: 'Gesamt',
        }
      : {
          eyebrow: 'Your learning path',
          title: 'From A1 to C1 — step by step',
          description: `${TOTAL_WEEKS} weeks · ${TOTAL_LESSONS} lessons · total budget ${fmt(TOTAL_TUITION + TOTAL_MATERIALS)}`,
          weeks: 'weeks',
          lessons: 'lessons',
          tuition: 'Tuition',
          materials: 'Materials',
          total: 'Total',
        };

  const levelTotal = activeLevel.tuition + activeLevel.materials;

  return (
    <section className={cn('rounded-xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8', className)}>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{copy.eyebrow}</p>
      <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
      <h2 className="mt-2 text-2xl font-black text-[var(--casa-ink)] sm:text-3xl">{copy.title}</h2>
      <p className="mt-2 text-sm text-slate-500">{copy.description}</p>

      {/* Level selector */}
      <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="CEFR levels">
        {LEVELS.map((level, idx) => {
          const isActive = level.id === active;
          return (
            <button
              key={level.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(level.id)}
              className={cn(
                'relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'border-[var(--casa-blue)] bg-[var(--casa-accent-surface)] text-white shadow-[var(--shadow-soft)]'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
              )}
            >
              {/* Connector line between tabs */}
              {idx < LEVELS.length - 1 && (
                <span
                  className="pointer-events-none absolute -right-[9px] top-1/2 z-10 h-px w-2 -translate-y-1/2 bg-slate-300"
                  aria-hidden
                />
              )}
              {level.label}
            </button>
          );
        })}
      </div>

      {/* Active level detail */}
      <div
        role="tabpanel"
        aria-label={`Level ${activeLevel.label} details`}
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        {/* Description */}
        <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-5 sm:col-span-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-[var(--casa-blue)]/10 px-2.5 py-0.5 text-sm font-black tracking-[0.12em] text-[var(--casa-accent-text)]">
              {activeLevel.label}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {locale === 'de' ? activeLevel.description.de : activeLevel.description.en}
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-text-subtle)]">
            {copy.weeks} / {copy.lessons}
          </p>
          <div className="mt-3">
            <p className="text-3xl font-black text-[var(--casa-ink)]">
              {activeLevel.weeks}
              <span className="ml-1 text-sm font-semibold text-[var(--casa-text-subtle)]">{copy.weeks}</span>
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {activeLevel.lessons} {copy.lessons}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-text-subtle)]">{copy.total}</p>
          <div className="mt-3">
            <p className="text-3xl font-black text-[var(--casa-ink)]">{fmt(levelTotal)}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {fmt(activeLevel.tuition)} {copy.tuition} + {fmt(activeLevel.materials)} {copy.materials}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="mb-1.5 flex justify-between text-xs text-[var(--casa-text-subtle)]">
          <span>A1</span>
          <span>C1</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          {LEVELS.map((level) => (
            <span
              key={level.id}
              style={{ width: `${(level.weeks / TOTAL_WEEKS) * 100}%` }}
              className={cn(
                'inline-block h-full transition-all duration-300',
                level.id === active
                  ? 'bg-[var(--casa-blue)]'
                  : 'bg-[var(--casa-blue)]/20'
              )}
            />
          ))}
        </div>
        <p className="mt-1.5 text-right text-xs text-[var(--casa-text-subtle)]">
          {Math.round((LEVELS.findIndex((l) => l.id === active) + 1) * (100 / LEVELS.length))}% {locale === 'de' ? 'des Weges' : 'of the journey'}
        </p>
      </div>
    </section>
  );
}
