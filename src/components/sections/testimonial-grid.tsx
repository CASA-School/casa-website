'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ContentLocale } from '@/lib/content/types';

export type TestimonialCard = {
  id: string;
  person: string;
  country: string;
  quote: string;
  photoSrc: string;
  photoAlt: string;
  photoCaption: string;
  href?: string;
};

type TestimonialGridProps = {
  title: string;
  description: string;
  cards: TestimonialCard[];
  featuredQuote?: {
    quote: string;
    person: string;
    role: string;
  };
  className?: string;
  locale?: ContentLocale;
};

function FeaturedQuoteTile({
  quote,
  person,
  role,
  locale,
}: {
  quote: string;
  person: string;
  role: string;
  locale: ContentLocale;
}) {
  return (
    <article className="h-full rounded-3xl border border-[color:var(--casa-sand)] bg-[color:var(--casa-warm-soft)] p-6 shadow-[var(--shadow-card)] md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
        {locale === 'de' ? 'Ausgewählte Stimme' : 'Featured story'}
      </p>
      <span className="casa-tricolor-rule mt-3 block h-1 w-20 rounded-full" aria-hidden />
      <blockquote className="mt-4 text-lg leading-relaxed text-[var(--casa-ink)] md:text-xl">
        &quot;{quote}&quot;
      </blockquote>
      <div className="mt-6 space-y-1">
        <p className="text-sm font-semibold text-[var(--casa-ink)]">{person}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-muted)]">{role}</p>
      </div>
    </article>
  );
}

function TestimonialTile({ card, locale }: { card: TestimonialCard; locale: ContentLocale }) {
  return (
    <article className="group h-full overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 transition-transform hover:-translate-y-0.5">
      <figure>
        <div className="casa-media-overlay casa-media-overlay-card relative h-52 md:h-56">
          <Image
            src={card.photoSrc}
            alt={card.photoAlt}
            fill
            sizes="(min-width: 1280px) 14vw, (min-width: 768px) 22vw, 92vw"
            className="object-cover"
          />
          <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-[color:var(--casa-ink-deep)]/65 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[11px] font-semibold text-[var(--casa-ink)]">
            <PlayCircle className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" />
            {locale === 'de' ? 'Stimme' : 'Story'}
          </div>
        </div>
      </figure>
      <div className="space-y-2 p-6">
        <p className="line-clamp-5 min-h-[132px] text-[0.95rem] leading-relaxed text-[var(--casa-ink)] md:text-base">&quot;{card.quote}&quot;</p>
        <p className="text-xs font-semibold text-[var(--casa-muted)]">
          {card.person} - {card.country}
        </p>
      </div>
    </article>
  );
}

export function TestimonialGrid({ title, description, cards, featuredQuote, className, locale = 'en' }: TestimonialGridProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = isMobile ? 1 : 2;
  const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const applyViewport = () => setIsMobile(mediaQuery.matches);
    applyViewport();
    mediaQuery.addEventListener('change', applyViewport);

    return () => {
      mediaQuery.removeEventListener('change', applyViewport);
    };
  }, []);

  const visibleCards = useMemo(() => {
    const start = clampedPage * pageSize;
    return cards.slice(start, start + pageSize);
  }, [cards, clampedPage, pageSize]);

  const canGoPrevious = clampedPage > 0;
  const canGoNext = clampedPage < pageCount - 1;

  return (
    <section data-reveal="true" className={cn('rounded-3xl bg-white px-6 py-8 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 md:px-8 md:py-10', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
            {locale === 'de' ? 'Stimmen' : 'Stories'}
          </p>
          <span className="casa-tricolor-rule mt-2 block h-1 w-24 rounded-full" aria-hidden />
          <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
        </div>

        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => canGoPrevious && setPage((current) => current - 1)}
              disabled={!canGoPrevious}
              aria-label={locale === 'de' ? 'Vorherige Stimmen' : 'Previous stories'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--casa-sand)] text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-warm-soft)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-[var(--casa-muted)]">
              {clampedPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => canGoNext && setPage((current) => current + 1)}
              disabled={!canGoNext}
              aria-label={locale === 'de' ? 'Nächste Stimmen' : 'Next stories'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--casa-sand)] text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-warm-soft)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {isMobile ? (
          <div className="space-y-4">
            {visibleCards.map((card) => (
              <TestimonialTile key={card.id} card={card} locale={locale} />
            ))}
            {featuredQuote ? (
              <FeaturedQuoteTile
                quote={featuredQuote.quote}
                person={featuredQuote.person}
                role={featuredQuote.role}
                locale={locale}
              />
            ) : null}
          </div>
        ) : (
          <div className={cn('grid gap-4 md:grid-cols-2', featuredQuote ? 'lg:grid-cols-3' : undefined)}>
            {visibleCards.map((card) => (
              <TestimonialTile key={card.id} card={card} locale={locale} />
            ))}
            {featuredQuote ? (
              <FeaturedQuoteTile
                quote={featuredQuote.quote}
                person={featuredQuote.person}
                role={featuredQuote.role}
                locale={locale}
              />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
