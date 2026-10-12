'use client';

import { CasaImage as Image } from '@/components/ui/casa-image';
import { useState } from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';

import { levelTokens, type LevelKey } from '@/config/brand/tokens';
import { CEFR_LEVELS, levelHref } from '@/config/content/cefr-levels';
import { Link } from '@/i18n/navigation';
import { klettTextbookByLevelId, seriesAccent } from '@/config/content/klett-textbooks';
import { cn } from '@/lib/utils';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

/*
 * The levels and what each one means come from config/content/cefr-levels.ts,
 * the source the levels page (/sprachkurse/niveaustufen) shows in full. This
 * overview holds each level's short version and links to its section there
 * (2026-10-12); until then it carried the old page's whole text itself.
 *
 * Weeks in the intensive format: 8–9 for a full level (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md),
 * and for B1+ just as long, which casa-bremen.de does not publish and Rahman
 * confirmed with CASA on 2026-08-13 (the registration offers "B1+ · 8 Wochen").
 */
const LEVELS = CEFR_LEVELS;

/**
 * Shows which Klett textbook a level is taught from. Renders the licensed cover
 * when one is available and a designed stand-in otherwise, so the section works
 * before Klett's image permission is on file. See config/content/klett-textbooks.
 */
function TextbookCard({ levelId, locale, label }: { levelId: string; locale: 'en' | 'de'; label: string }) {
  const { say } = useSiteCopy();
  const book = klettTextbookByLevelId[levelId];

  if (!book) {
    return null;
  }

  const accent = seriesAccent[book.series];
  const coverAlt =
    say(locale, 'Titelbild des Lehrwerks {title} von Ernst Klett Sprachen', 'Cover of the {title} textbook published by Ernst Klett Sprachen', { title: book.title });

  return (
    <div className="flex gap-4 rounded-xl border border-[color:var(--casa-sand)]/70 bg-white p-5 shadow-xs">
      <div className="shrink-0">
        {book.coverPermission === 'granted' && book.coverSrc ? (
          <Image
            src={book.coverSrc}
            alt={coverAlt}
            width={96}
            height={132}
            className="h-[8.25rem] w-24 rounded-lg object-cover shadow-[var(--shadow-card)]"
          />
        ) : (
          // Stand-in until a licensed cover is on file. Deliberately does not
          // imitate Klett's artwork — it reads as a book without pretending to
          // be the real cover.
          <div
            aria-hidden
            className="flex h-[8.25rem] w-24 flex-col justify-between overflow-hidden rounded-lg p-2.5 shadow-[var(--shadow-card)]"
            style={{
              background: `linear-gradient(150deg, ${accent.bg} 0%, color-mix(in srgb, ${accent.bg} 68%, #0f172a) 100%)`,
              borderLeft: `5px solid color-mix(in srgb, ${accent.bg} 55%, #0f172a)`,
            }}
          >
            <span className="text-xs font-semibold uppercase leading-tight tracking-eyebrow text-white/80">
              {book.seriesLabel}
            </span>
            <span className="text-xl font-black leading-none text-white">{book.level}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">{label}</p>
        <p className="mt-2 text-base font-bold leading-tight text-[var(--casa-ink)]">{book.title}</p>
        <p className="mt-1 text-xs text-[var(--casa-muted)]">Ernst Klett Sprachen</p>
        {book.isbn ? <p className="mt-1 text-xs tabular-nums text-[var(--casa-text-subtle)]">ISBN {book.isbn}</p> : null}
        {book.productUrl ? (
          <a
            href={book.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-[var(--casa-accent-text)] hover:underline"
          >
            {say(locale, 'Beim Verlag ansehen', 'View at the publisher')}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

type Props = {
  locale?: 'en' | 'de';
  className?: string;
};

export function LevelProgressionTimeline({ locale = 'en', className }: Props) {
  const { pick, pickTree, say } = useSiteCopy();
  const [active, setActive] = useState<LevelKey>('a1');
  const activeLevel = LEVELS.find((l) => l.id === active)!;

  const copy =
    pickTree(locale, { de: {
          eyebrow: 'Niveaustufen',
          title: 'Was du auf jeder Stufe kannst',
          description:
            'In unserer Schule finden fortlaufend Kurse auf den Niveaustufen A1, A2, B1, B1+, B2 und C1 statt. Wir orientieren uns dabei streng am Gemeinsamen Europäischen Referenzrahmen (GER).',
          pace: 'Im Intensivkurs hast du {course.intensive-german.lessons} Unterrichtseinheiten à 45 Minuten pro Woche. Eine ganze Niveaustufe dauert dort in der Regel 8–9 Wochen, die B1+ genauso lange. Im Abendkurs dauert eine halbe Niveaustufe etwa ein Trimester.',
          paceLabel: 'Dauer pro Niveaustufe',
          weeks: 'Wochen',
          rate: '{course.intensive-german.lessons} UE pro Woche (je 45 Min.)',
          textbook: 'Lehrwerk',
        }, en: {
          eyebrow: 'Levels',
          title: 'What you can do at each level',
          description:
            'At our school, courses run continuously at levels A1, A2, B1, B1+, B2 and C1. We keep strictly to the Common European Framework of Reference for Languages (CEFR).',
          pace: 'On the intensive course, you have {course.intensive-german.lessons} lessons of 45 minutes a week, and a whole level usually takes 8–9 weeks. B1+ takes just as long. On the evening course, half a level takes about one trimester.',
          paceLabel: 'Time per level',
          weeks: 'weeks',
          rate: '{course.intensive-german.lessons} lessons a week (45 min each)',
          textbook: 'Textbook',
        } });

  return (
    <section className={cn('rounded-xl bg-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)] sm:p-8', className)}>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{copy.eyebrow}</p>
      <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
      <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{copy.title}</h2>
      <p className="mt-2 text-sm text-[var(--casa-muted)]">{copy.description}</p>
      <p className="mt-1 text-sm text-[var(--casa-muted)]">{copy.pace}</p>

      {/* Level selector */}
      <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label={say(locale, 'Kursstufen', 'Course levels')}>
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
                  ? 'shadow-[var(--shadow-soft)]'
                  : 'border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] text-[var(--casa-muted)] hover:border-[color:var(--casa-sand)] hover:bg-white'
              )}
              // The selected tab wears its own level colour, so the ramp reads
              // as a progression. `ink` is measured per step because the scale
              // crosses over between B1+ and B2.
              style={
                isActive
                  ? {
                      background: levelTokens[level.id].surface,
                      color: levelTokens[level.id].ink,
                      borderColor: levelTokens[level.id].surface,
                    }
                  : undefined
              }
            >
              {/* Connector line between tabs */}
              {idx < LEVELS.length - 1 && (
                <span
                  className="pointer-events-none absolute -right-[9px] top-1/2 z-10 h-px w-2 -translate-y-1/2 bg-[var(--casa-sand)]"
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
        <div className="flex flex-col gap-3 rounded-xl bg-[var(--casa-surface-wash)] p-5 sm:col-span-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-lg px-2.5 py-0.5 text-sm font-bold tracking-eyebrow"
              style={{
                background: levelTokens[activeLevel.id].surface,
                color: levelTokens[activeLevel.id].ink,
              }}
            >
              {activeLevel.label}
            </span>
            {activeLevel.isBridge ? (
              <span className="text-xs font-semibold text-[var(--casa-text-subtle)]">
                {say(locale, 'Zwischenstufe', 'In-between level')}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-[var(--casa-ink)]">
            {pick(locale, activeLevel.summary)}
          </p>
          <Link
            href={levelHref(activeLevel.label)}
            className="tap-target group inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
          >
            {say(locale, 'Mehr zur Stufe {level}', 'More about {level}', { level: activeLevel.label })}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-col justify-between rounded-xl border border-[color:var(--casa-sand)]/70 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
            {copy.paceLabel}
          </p>
          <div className="mt-3">
            <p className="text-3xl font-black text-[var(--casa-ink)]">
              {activeLevel.weeks}
              <span className="ml-1 text-sm font-semibold text-[var(--casa-text-subtle)]">{copy.weeks}</span>
            </p>
            <p className="mt-0.5 text-sm text-[var(--casa-muted)]">{copy.rate}</p>
          </div>
        </div>

        {/* Textbook card — replaces the former price card. Course fees are
            deliberately not stated here; they will come from the central
            dashboard once it exists. See docs/COURSE_FACTS_SOURCE_OF_TRUTH.md. */}
        <TextbookCard levelId={activeLevel.id} locale={locale} label={copy.textbook} />
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="mb-1.5 flex justify-between text-xs text-[var(--casa-text-subtle)]">
          <span>A1</span>
          <span>C1</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--casa-surface-subtle)]">
          {LEVELS.map((level) => (
            <span
              key={level.id}
              // The bar IS the scale: each segment wears its level's colour, so
              // A1 to C1 reads light-to-deep at a glance.
              style={{
                width: `${100 / LEVELS.length}%`,
                background: levelTokens[level.id].surface,
                opacity: level.id === active ? 1 : 0.55,
              }}
              className="inline-block h-full transition-all duration-300"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
