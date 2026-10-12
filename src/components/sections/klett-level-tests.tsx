import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';

import { levelKeyFromLabel, levelTokens } from '@/config/brand/tokens';
import { CEFR_BANDS, cefrLevel } from '@/config/content/cefr-levels';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { pick, pickTree } from '@/lib/cms/copy';

/**
 * The six Klett online placement tests, one per level — the first thing on the
 * placement page, so a learner can start straight away (Rahman, 2026-10-12:
 * "easier for students to get there and start with the level tests", until
 * CASA's own test is ready).
 *
 * Back on the public site since 2026-10-01: CASA's own test is not finished
 * (src/lib/placement/availability.ts), so placement works as it did on the old
 * casa-bremen.de — the learner takes Klett's test and emails the result to
 * online@. The URLs are the old site's, re-checked on 2026-10-01 (HTTP 200).
 *
 * Each tile is one link, the level in its colour on the CEFR ramp, A1 marked as
 * where to begin. No Klett artwork (its image rights are unsettled). Each opens
 * Klett's site in a new window with `noopener noreferrer`, which the privacy
 * policy's section on external links relies on.
 */
const KLETT_LEVEL_TESTS = [
  { level: 'A1', series: 'Netzwerk neu', url: 'https://einstufungstests.klett-sprachen.de/eks/einstufungstest-netzwerkneu-a1/' },
  { level: 'A2', series: 'Netzwerk neu', url: 'https://einstufungstests.klett-sprachen.de/eks/einstufungstest-netzwerkneu-a2/' },
  { level: 'B1', series: 'Netzwerk neu', url: 'https://einstufungstests.klett-sprachen.de/eks/einstufungstest-netzwerkneu-b1/' },
  { level: 'B1+', series: 'Kontext', url: 'https://einstufungstests.klett-sprachen.de/eks/test-kontext-b1-plus/' },
  { level: 'B2', series: 'Kontext', url: 'https://einstufungstests.klett-sprachen.de/eks/test-kontext-b2/' },
  { level: 'C1', series: 'Kontext', url: 'https://einstufungstests.klett-sprachen.de/eks/kontext-c1-test/' },
] as const;

type KlettLevelTestsProps = {
  locale: ContentLocale;
  className?: string;
};

export function KlettLevelTests({ locale, className }: KlettLevelTestsProps) {
  const copy =
    pickTree(locale, { de: {
          title: 'Die Einstufungstests',
          intro:
            'Für die Tests verlässt du unsere Website. Die Links führen zum Testportal des Klett Verlags, mit dessen Lehrwerken wir auf diesen Stufen arbeiten. Dort findest du Aufgaben zum Lese- und Hörverstehen, zum Wortschatz und zur Grammatik der jeweiligen Stufe. Viel Erfolg!',
          start: 'Test starten',
          startHere: 'Hier starten',
          label: (level: string) => `${level}-Test starten, öffnet das Testportal von Klett in einem neuen Fenster`,
          textbook: 'Lehrwerk',
        }, en: {
          title: 'The placement tests',
          intro:
            'To take the tests, you leave our website. The links go to the test portal of the publisher Klett, whose textbooks we use at these levels. There you’ll find tasks on reading and listening, vocabulary and grammar for each level. Good luck!',
          start: 'Start the test',
          startHere: 'Start here',
          label: (level: string) => `Start the ${level} test, opens Klett’s test portal in a new window`,
          textbook: 'Textbook',
        } });

  return (
    <section id="klett-level-tests" aria-labelledby="klett-level-tests-title" className={cn('scroll-mt-28 min-w-0', className)}>
      <h2 id="klett-level-tests-title" className="sr-only">
        {copy.title}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {KLETT_LEVEL_TESTS.map((test) => {
          const key = levelKeyFromLabel(test.level);
          const level = cefrLevel(test.level);
          const first = test.level === 'A1';
          return (
            <li key={test.level} className="min-w-0">
              <a
                href={test.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={copy.label(test.level)}
                className={cn(
                  'group flex h-full flex-col rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)] transition-[box-shadow,transform] duration-200 hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] motion-safe:hover:-translate-y-0.5 sm:p-5',
                  first && 'ring-2 ring-[color:var(--casa-sun)]'
                )}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className="inline-flex h-11 min-w-12 items-center justify-center rounded-xl px-2.5 text-lg font-bold leading-none"
                    style={(key ? { background: levelTokens[key].surface, color: levelTokens[key].ink } : undefined) as CSSProperties | undefined}
                  >
                    {test.level}
                  </span>
                  {first ? (
                    <span className="rounded-full bg-[var(--casa-sun-tint)] px-2.5 py-1 text-xs font-semibold text-[var(--casa-sun-text)]">{copy.startHere}</span>
                  ) : null}
                </span>
                {level ? <span className="mt-3 text-sm font-semibold leading-snug text-[var(--casa-ink)]">{pick(locale, CEFR_BANDS[level.band])}</span> : null}
                <span className="mt-1 text-xs text-[var(--casa-muted)]">
                  {copy.textbook}: {test.series}
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-[var(--casa-accent-text)]">
                  {copy.start}
                  {/* Up and to the right: it opens another site. The icon set draws ExternalLink as a share mark. */}
                  <ArrowRight className="h-4 w-4 -rotate-45 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">{copy.intro}</p>
    </section>
  );
}
