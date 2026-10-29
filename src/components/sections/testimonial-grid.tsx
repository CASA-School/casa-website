'use client';

import { CasaImage as Image } from '@/components/ui/casa-image';
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ContentLocale } from '@/lib/content/types';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

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
  /** Stars, for a Google review: the tile opens on them instead of a quotation mark. */
  rating?: number;
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

/** How long a card stays before the next one glides in, and how long the glide takes. */
const DWELL_MS = 6500;
const GLIDE_MS = 1100;
const GAP_PX = 16;

/** The stars and „Google-Bewertung" over a review; HumanStoryBlock shows them too. */
export function Stars({ rating, locale }: { rating: number; locale: ContentLocale }) {
  const { say } = useSiteCopy();
  const gradient = useId();
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <span role="img" aria-label={say(locale, '{n} von 5 Sternen', '{n} out of 5 stars', { n: String(rating) })} className="flex items-center gap-1">
        <svg width="0" height="0" aria-hidden className="absolute">
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd84d" />
              <stop offset="100%" stopColor="#f0a500" />
            </linearGradient>
          </defs>
        </svg>
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} viewBox="0 0 20 20" aria-hidden className="h-[1.15rem] w-[1.15rem] drop-shadow-[0_1px_1px_rgba(176,112,0,0.25)]">
            <path
              d="M10 1.6l2.47 5.3 5.8.68-4.3 3.96 1.15 5.73L10 14.42l-5.12 2.85 1.15-5.73-4.3-3.96 5.8-.68L10 1.6z"
              fill={i < Math.round(rating) ? `url(#${gradient})` : '#e7e2d4'}
            />
          </svg>
        ))}
      </span>
      <span className="text-[0.75rem] font-semibold tracking-wide text-[var(--casa-muted)]">{say(locale, 'Google-Bewertung', 'Google review')}</span>
    </div>
  );
}

function TestimonialTile({ card, locale }: { card: TestimonialCard; locale: ContentLocale }) {
  const { say } = useSiteCopy();
  return (
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-soft)]">
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
              {say(locale, 'Stimme', 'Story')}
            </div>
          </div>
        </figure>
      ) : null}
      <blockquote className="flex flex-1 flex-col p-6 md:p-7">
        {/*
          A review opens on its stars; a quote on a quotation mark rather than a photograph. Either
          way the card is honest about what it is: someone's words, not their portrait.
        */}
        {card.rating ? (
          <Stars rating={card.rating} locale={locale} />
        ) : (
          <span aria-hidden className="mb-4 block h-7 font-display text-4xl leading-none text-[var(--casa-accent-text)]">
            &ldquo;
          </span>
        )}
        <p className="text-base leading-relaxed text-[var(--casa-ink)]">
          {card.quote}
        </p>
        <footer className="mt-auto pt-6">
          <div className="border-t border-[color:var(--casa-sand)] pt-4">
            <p className="text-sm font-semibold text-[var(--casa-ink)]">{card.person}</p>
            <p className="mt-1 min-h-10 text-[0.8125rem] leading-5 text-[var(--casa-muted)]">{card.country}</p>
          </div>
        </footer>
      </blockquote>
    </article>
  );
}

/**
 * The testimonials as a carousel that moves by itself (2026-10-20, Rahman: no Pause button, a smooth
 * slide). One card glides in at a time on a long eased transition, and the row loops forward without
 * rewinding: the first cards are repeated after the last, and once the glide reaches them the track
 * jumps back to the start unseen. It holds while a pointer is over it, while it has focus or right
 * after a swipe, and stays still for anyone who prefers reduced motion; arrows and dots move it by hand.
 */
export function TestimonialGrid({ title, description, cards, featuredQuote, className, locale = 'en' }: TestimonialGridProps) {
  const { say } = useSiteCopy();
  const headingId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const stories =
    !featuredQuote || cards.some((card) => card.person === featuredQuote.person && card.quote === featuredQuote.quote)
      ? cards
      : [...cards, { id: 'featured-voice', person: featuredQuote.person, country: featuredQuote.role, quote: featuredQuote.quote }];
  const count = stories.length;

  const [perView, setPerView] = useState(1);
  const [step, setStep] = useState(0);
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [heldUntil, setHeldUntil] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const swipeFrom = useRef<number | null>(null);

  const loops = count > perView;
  // The first cards again after the last, so the glide always runs forward.
  const slides = loops ? [...stories, ...stories.slice(0, perView)] : stories;

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateVisibility = () => setTabVisible(!document.hidden);
    const element = viewport.current;
    if (!element) return;
    const measure = () => {
      const first = element.querySelector<HTMLElement>('[data-slide]');
      if (!first) return;
      const width = first.getBoundingClientRect().width;
      setStep(width + GAP_PX);
      setPerView(Math.max(1, Math.round((element.clientWidth + GAP_PX) / (width + GAP_PX))));
    };
    const resize = new ResizeObserver(measure);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 });
    resize.observe(element);
    observer.observe(element);
    updateMotion();
    updateVisibility();
    measure();
    motion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      resize.disconnect();
      observer.disconnect();
      motion.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  // After an unseen jump, the glide comes back on for the next move.
  useEffect(() => {
    if (animate) return;
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  // On a layout that shows every card at once there is nothing to move.
  const position = loops ? index : 0;

  function next() {
    if (!loops) return;
    setAnimate(true);
    setIndex((value) => (value >= count ? 1 : value + 1));
  }

  function previous() {
    if (!loops) return;
    if (position === 0) {
      // Jump unseen to the repeated first card at the end, then glide one back.
      setAnimate(false);
      setIndex(count);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setAnimate(true);
        setIndex(count - 1);
      }));
      return;
    }
    setAnimate(true);
    setIndex((value) => value - 1);
  }

  const hold = () => setHeldUntil(Date.now() + DWELL_MS * 2);

  useEffect(() => {
    if (!loops || hovered || focused || reducedMotion || !inView || !tabVisible) return;
    const wait = Math.max(DWELL_MS, heldUntil - Date.now());
    const timer = window.setTimeout(() => {
      setAnimate(true);
      setIndex((value) => (value >= count ? 1 : value + 1));
    }, wait);
    return () => window.clearTimeout(timer);
  }, [index, count, loops, hovered, focused, reducedMotion, inView, tabVisible, heldUntil]);

  function onGlideEnd() {
    if (position >= count) {
      setAnimate(false);
      setIndex(position - count);
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    swipeFrom.current = event.clientX;
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (swipeFrom.current === null) return;
    const moved = event.clientX - swipeFrom.current;
    swipeFrom.current = null;
    if (Math.abs(moved) < 40) return;
    hold();
    if (moved < 0) next();
    else previous();
  }

  const showing = count ? position % count : 0;
  const controlClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)]';

  return (
    <section
      data-reveal="true"
      aria-labelledby={headingId}
      aria-roledescription={say(locale, 'Karussell', 'carousel')}
      // `min-w-0`: the track below is every slide laid end to end, so as a grid or
      // flex item this section would otherwise widen its column past the screen.
      className={cn('min-w-0', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="casa-tricolor-rule block h-1 w-24 rounded-full" aria-hidden />
          <h2 id={headingId} className="mt-3 text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
        </div>
        {loops && (
          <div className="flex items-center gap-2">
            <button type="button" className={controlClass} aria-label={say(locale, 'Vorherige Stimmen', 'Previous stories')} onClick={() => { hold(); previous(); }}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" className={controlClass} aria-label={say(locale, 'Nächste Stimmen', 'Next stories')} onClick={() => { hold(); next(); }}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={viewport}
        className="relative mt-5 touch-pan-y overflow-hidden px-1 pb-5 pt-1"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeFrom.current = null)}
      >
        <div
          className="flex items-stretch gap-4 will-change-transform"
          style={{
            transform: `translate3d(${-position * step}px, 0, 0)`,
            transition: animate && !reducedMotion ? `transform ${GLIDE_MS}ms cubic-bezier(0.45, 0, 0.15, 1)` : 'none',
          }}
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget) onGlideEnd();
          }}
        >
          {slides.map((card, position) => {
            const repeat = position >= count;
            return (
              <div
                key={repeat ? `${card.id}-again` : card.id}
                data-slide
                role="group"
                aria-roledescription={say(locale, 'Stimme', 'slide')}
                aria-label={`${(position % count) + 1} / ${count}`}
                aria-hidden={repeat || undefined}
                inert={repeat || undefined}
                className="flex min-w-0 shrink-0 basis-full md:basis-[calc((100%-1rem)/2)] xl:basis-[calc((100%-2rem)/3)]"
              >
                <TestimonialTile card={card} locale={locale} />
              </div>
            );
          })}
        </div>
      </div>
      {loops && (
        <div className="mt-1 flex justify-center gap-2" role="group" aria-label={say(locale, 'Stimmen auswählen', 'Choose a story')}>
          {stories.map((card, position) => (
            <button
              key={card.id}
              type="button"
              aria-label={say(locale, 'Stimme {n} von {total}', 'Story {n} of {total}', { n: String(position + 1), total: String(count) })}
              aria-current={position === showing || undefined}
              onClick={() => {
                hold();
                setAnimate(true);
                setIndex(position);
              }}
              className={cn(
                'h-2 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)]',
                position === showing ? 'w-6 bg-[var(--casa-blue)]' : 'w-2 bg-[color:var(--casa-sand)] hover:bg-[var(--casa-muted)]'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
