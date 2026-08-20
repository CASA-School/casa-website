'use client';

import { CasaImage as Image } from '@/components/ui/casa-image';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ContentLocale } from '@/lib/content/types';

/**
 * `photoSrc` / `photoAlt` are optional, and on learner testimonials they must
 * stay absent.
 *
 * These cards used to be handed one of three synthetic portraits by array
 * position, cycled with a modulo. That was tolerable while the quotes were
 * anonymous archetypes. The quotes are now CASA's real published testimonials
 * with real first names, and pairing a real name with a generated face
 * manufactures a person — exactly what CLAUDE.md hard rule 2 forbids. Without a
 * photo the tile leads with the quote, which is the thing worth reading.
 */
export type TestimonialCard = {
  id: string;
  person: string;
  country: string;
  quote: string;
  photoSrc?: string;
  photoAlt?: string;
  photoCaption?: string;
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
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
        {locale === 'de' ? 'Ausgewählte Stimme' : 'Featured story'}
      </p>
      <span className="casa-tricolor-rule mt-3 block h-1 w-20 rounded-full" aria-hidden />
      {/*
        `text-lg md:text-xl` is a step up from the grid tiles on purpose — this is
        the featured voice. It used to be unbounded, so a 290-character quote set
        at 20px filled eleven lines and made the tile twice the height of the two
        cards beside it. Quotes are trimmed to ~170 characters in the content layer
        now; the clamp is the backstop for the day someone adds a longer one.
      */}
      <blockquote className="mt-4 line-clamp-6 text-lg leading-relaxed text-[var(--casa-ink)] md:text-xl">
        &quot;{quote}&quot;
      </blockquote>
      <div className="mt-6 space-y-1">
        <p className="text-sm font-semibold text-[var(--casa-ink)]">{person}</p>
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{role}</p>
      </div>
    </article>
  );
}

function TestimonialTile({ card, locale }: { card: TestimonialCard; locale: ContentLocale }) {
  return (
    <article className="group h-full overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 transition-transform hover:-translate-y-0.5">
      {card.photoSrc ? (
        <figure>
          <div className="casa-media-overlay relative h-52 md:h-56">
            <Image
              src={card.photoSrc}
              alt={card.photoAlt ?? ''}
              fill
              sizes="(min-width: 1280px) 14vw, (min-width: 768px) 22vw, 92vw"
              className="object-cover"
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-[color:var(--casa-ink-deep)]/65 to-transparent" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-xs font-semibold text-[var(--casa-ink)]">
              <PlayCircle className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" />
              {locale === 'de' ? 'Stimme' : 'Story'}
            </div>
          </div>
        </figure>
      ) : null}
      <blockquote className="space-y-3 p-6">
        {/*
          A quotation mark glyph rather than a photograph. Without an image the
          tile needs something to open on, and the mark is honest about what the
          card is: someone's words, not their portrait.
        */}
        <span aria-hidden className="block text-3xl leading-none text-[var(--casa-accent-text)]">
          &ldquo;
        </span>
        {/*
          No min-height. It existed to stop tiles of wildly different lengths from
          collapsing at different heights; with excerpts in a 100-170 character
          band the grid's own stretch alignment handles that, and the min-height
          only added dead space under the short ones. The clamp stays as a backstop.
        */}
        <p className={cn('text-[0.95rem] leading-relaxed text-[var(--casa-ink)] md:text-base', card.photoSrc ? 'line-clamp-5' : 'line-clamp-6')}>
          {card.quote}
        </p>
        <footer className="text-xs font-semibold text-[var(--casa-muted)]">
          {card.person} · {card.country}
        </footer>
      </blockquote>
    </article>
  );
}

export function TestimonialGrid({ title, description, cards, featuredQuote, className, locale = 'en' }: TestimonialGridProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [page, setPage] = useState(0);
  /*
   * Fill the row.
   *
   * This was a flat `isMobile ? 1 : 2`, which is right when a featured tile takes
   * the third column and wrong when there isn't one: a course page with three
   * cards and three columns still rendered two and hid the third behind a pager,
   * next to an empty column. Nobody clicks to page two of a testimonial carousel
   * to see a card that would have fitted on screen.
   */
  const pageSize = isMobile ? 1 : featuredQuote ? 2 : 3;
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
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
            {locale === 'de' ? 'Stimmen' : 'Stories'}
          </p>
          <span className="casa-tricolor-rule mt-2 block h-1 w-24 rounded-full" aria-hidden />
          <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
