import { ExternalLink } from 'lucide-react';

import { levelKeyFromLabel, levelTokens } from '@/config/brand/tokens';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

/**
 * The six Klett online placement tests, one per level.
 *
 * Back on the public site since 2026-10-01: CASA's own test is not finished
 * (src/lib/placement/availability.ts), so placement works as it did on the old
 * casa-bremen.de — the learner takes Klett's test and emails the result to
 * online@. The URLs are the old site's, re-checked on 2026-10-01 (HTTP 200).
 *
 * Plain text links with the level and the series name, and no Klett artwork:
 * see the rights note in src/config/content/klett-textbooks.ts. Each opens
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
    locale === 'de'
      ? {
          title: 'Die Einstufungstests',
          intro:
            'Für die Tests verlassen Sie unsere Website: Die Links führen zum Testportal des Klett Verlags, mit dessen Lehrwerken wir auf diesen Stufen arbeiten. Dort erwarten Sie Aufgaben zu Lese- und Hörverstehen, Wortschatz und Grammatik des jeweiligen Niveaus.',
          start: (level: string) => `${level}-Test starten`,
          opens: 'Öffnet das Testportal von Klett in einem neuen Fenster',
          textbook: 'Lehrwerk',
        }
      : {
          title: 'The placement tests',
          intro:
            'The tests take you away from our website: the links lead to the test portal of the publisher Klett, whose textbooks we use at these levels. There you will find tasks on reading and listening, vocabulary and grammar for each level.',
          start: (level: string) => `Start the ${level} test`,
          opens: 'Opens Klett’s test portal in a new window',
          textbook: 'Textbook',
        };

  return (
    <section id="klett-level-tests" className={cn('scroll-mt-28', className)}>
      <h2 className="text-3xl font-bold tracking-tight text-[var(--casa-ink)]">{copy.title}</h2>
      <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{copy.intro}</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KLETT_LEVEL_TESTS.map((test) => {
          const key = levelKeyFromLabel(test.level);
          return (
            <li
              key={test.level}
              className="flex flex-col justify-between rounded-lg border border-[color:var(--casa-sand)] bg-white p-5 shadow-xs"
            >
              <div>
                {/* The shared level ramp makes the six readable at a glance; the
                    label is always there, so colour is never the only signal. */}
                <span
                  className="inline-flex items-center rounded-lg px-2 py-0.5 text-sm font-bold"
                  style={key ? { background: levelTokens[key].surface, color: levelTokens[key].ink } : undefined}
                >
                  {test.level}
                </span>
                <p className="mt-3 text-sm text-[var(--casa-muted)]">
                  {copy.textbook}: <span className="font-semibold text-[var(--casa-ink)]">{test.series}</span>
                </p>
              </div>
              <a
                href={test.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--casa-accent-text)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 rounded-sm"
              >
                {copy.start(test.level)}
                <ExternalLink className="h-4 w-4" aria-hidden />
                <span className="sr-only">({copy.opens})</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
