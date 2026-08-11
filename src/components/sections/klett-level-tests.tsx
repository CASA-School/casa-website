'use client';

import { ExternalLink } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

type KlettLevelTest = {
  id: string;
  level: string;
  provider: string;
  url: string;
  description: {
    en: string;
    de: string;
  };
};

const klettLevelTests: KlettLevelTest[] = [
  {
    id: 'a1',
    level: 'A1',
    provider: 'Netzwerk neu',
    url: 'https://einstufungstests.klett-sprachen.de/eks/einstufungstest-netzwerkneu-a1/',
    description: {
      en: 'Beginner entry-level check.',
      de: 'Einstiegstest für Anfänger.',
    },
  },
  {
    id: 'a2',
    level: 'A2',
    provider: 'Netzwerk neu',
    url: 'https://einstufungstests.klett-sprachen.de/eks/einstufungstest-netzwerkneu-a2/',
    description: {
      en: 'Foundation progression checkpoint.',
      de: 'Niveautest nach Grundstufe.',
    },
  },
  {
    id: 'b1',
    level: 'B1',
    provider: 'Netzwerk neu',
    url: 'https://einstufungstests.klett-sprachen.de/eks/einstufungstest-netzwerkneu-b1/',
    description: {
      en: 'Independent learner readiness.',
      de: 'Stand für selbstständige Sprachverwendung.',
    },
  },
  {
    id: 'b1plus',
    level: 'B1+',
    provider: 'Kontext',
    url: 'https://einstufungstests.klett-sprachen.de/eks/test-kontext-b1-plus/',
    description: {
      en: 'Bridge level before B2.',
      de: 'Übergangsniveau vor B2.',
    },
  },
  {
    id: 'b2',
    level: 'B2',
    provider: 'Kontext',
    url: 'https://einstufungstests.klett-sprachen.de/eks/test-kontext-b2/',
    description: {
      en: 'Upper-intermediate placement.',
      de: 'Einstufung für fortgeschrittene Lernende.',
    },
  },
  {
    id: 'c1',
    level: 'C1',
    provider: 'Kontext',
    url: 'https://einstufungstests.klett-sprachen.de/eks/kontext-c1-test/',
    description: {
      en: 'Advanced academic/professional level.',
      de: 'Fortgeschrittenes Niveau für Studium und Beruf.',
    },
  },
];

type KlettLevelTestsProps = {
  locale: ContentLocale;
  className?: string;
};

export function KlettLevelTests({ locale, className }: KlettLevelTestsProps) {
  const copy =
    locale === 'de'
      ? {
          eyebrow: 'Online-Einstufung',
          title: 'Klett-Einstufungstests',
          description:
            'Die offiziellen Klett-Tests werden in einem neuen Browserfenster geöffnet.',
          launch: 'Test starten',
          providerLabel: 'Quelle',
          openHint: 'Öffnet Klett in einem neuen Fenster',
        }
      : {
          eyebrow: 'Online placement',
          title: 'Klett placement tests',
          description: 'Official Klett tests open in a new browser window.',
          launch: 'Start test',
          providerLabel: 'Source',
          openHint: 'Opens Klett in a new window',
        };

  return (
    <section id="klett-level-tests" className={cn('rounded-3xl border border-[color:var(--casa-sand)] bg-white p-7 shadow-[var(--shadow-soft)]', className)}>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{copy.eyebrow}</p>
      <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
      <h2 className="mt-2 text-3xl font-black text-[var(--casa-ink)]">{copy.title}</h2>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{copy.description}</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {klettLevelTests.map((test) => (
          <article
            key={test.id}
            className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/40 p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50/80"
          >
            <div className="space-y-3">
              <div>
                <span className="inline-flex items-center rounded-lg bg-[var(--casa-blue)]/10 px-2 py-0.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                  {test.level}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--casa-ink)]">{test.provider}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--casa-text-subtle)]">
                  {copy.providerLabel}: Klett Sprachen
                </p>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                {locale === 'de' ? test.description.de : test.description.en}
              </p>
            </div>
            <div className="mt-5">
              <a
                href={test.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'default' }) + ' h-11 rounded-lg bg-[var(--casa-ink-deep)] px-4 font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)] no-underline inline-flex items-center gap-1.5'}
              >
                {copy.launch}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
