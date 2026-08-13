'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

import type { ContentLocale } from '@/lib/content/types';

export type LiveReviewItem = {
  id: string;
  quote: string;
  person: string;
  sourceUrl: string;
};

type LiveReviewModuleProps = {
  locale: ContentLocale;
  title?: string;
  reviews: LiveReviewItem[];
  className?: string;
};

const copy = {
  en: {
    title: 'Live review pulse',
    source: 'Source',
  },
  de: {
    title: 'Live Review-Einblick',
    source: 'Quelle',
  },
} as const;

export function LiveReviewModule({ locale, title, reviews, className }: LiveReviewModuleProps) {
  const [index, setIndex] = useState(0);
  const dictionary = copy[locale];
  const current = reviews[index] ?? reviews[0];

  const ratingVisual = useMemo(
    () => Array.from({ length: 5 }, (_, entry) => <Star key={entry} className="h-3.5 w-3.5 fill-[var(--casa-amber)] text-[var(--casa-amber)]" />),
    []
  );

  if (!current) {
    return null;
  }

  return (
    <article className={className}>
      <div className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{title ?? dictionary.title}</p>
          {reviews.length > 1 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIndex((currentIndex) => (currentIndex === 0 ? reviews.length - 1 : currentIndex - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--casa-sand)] text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]"
                aria-label="Previous review"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIndex((currentIndex) => (currentIndex + 1) % reviews.length)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--casa-sand)] text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]"
                aria-label="Next review"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-1">{ratingVisual}</div>
        <blockquote className="mt-2 text-sm leading-relaxed text-[var(--casa-ink)]">&quot;{current.quote}&quot;</blockquote>
        <p className="mt-2 text-xs font-semibold text-[var(--casa-muted)]">{current.person}</p>

        <Link
          href={current.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-xs font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
        >
          {dictionary.source}
        </Link>
      </div>
    </article>
  );
}
