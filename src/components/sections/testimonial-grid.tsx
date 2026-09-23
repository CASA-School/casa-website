'use client';

import { CasaImage as Image } from '@/components/ui/casa-image';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
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

function TestimonialTile({ card, locale }: { card: TestimonialCard; locale: ContentLocale }) {
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
              {locale === 'de' ? 'Stimme' : 'Story'}
            </div>
          </div>
        </figure>
      ) : null}
      <blockquote className="flex flex-1 flex-col p-6 md:p-7">
        {/*
          A quotation mark glyph rather than a photograph. Without an image the
          tile needs something to open on, and the mark is honest about what the
          card is: someone's words, not their portrait.
        */}
        <span aria-hidden className="mb-4 block h-7 font-display text-4xl leading-none text-[var(--casa-accent-text)]">
          &ldquo;
        </span>
        <p className="text-base leading-relaxed text-[var(--casa-ink)]">
          {card.quote}
        </p>
        <footer className="mt-auto pt-6">
          <div className="border-t border-[color:var(--casa-sand)] pt-4">
            <p className="text-sm font-semibold text-[var(--casa-ink)]">{card.person}</p>
            <p className="mt-1 min-h-10 text-xs leading-5 text-[var(--casa-muted)]">{card.country}</p>
          </div>
        </footer>
      </blockquote>
    </article>
  );
}

export function TestimonialGrid({ title, description, cards, featuredQuote, className, locale = 'en' }: TestimonialGridProps) {
  const headingId = useId();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [perView, setPerView] = useState(1);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const stories = useMemo(() => {
    if (!featuredQuote || cards.some(card => card.person === featuredQuote.person && card.quote === featuredQuote.quote)) return cards;
    return [...cards, { id: 'featured-voice', person: featuredQuote.person, country: featuredQuote.role, quote: featuredQuote.quote }];
  }, [cards, featuredQuote]);
  const last = Math.max(0, stories.length - perView);
  const current = Math.min(active, last);
  const de = locale === 'de';

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateVisibility = () => setTabVisible(!document.hidden);
    const element = track.current;
    if (!element) return;
    const updateSize = () => {
      const first = element.firstElementChild as HTMLElement | null;
      if (first) setPerView(Math.max(1, Math.round(element.clientWidth / first.getBoundingClientRect().width)));
    };
    const resize = new ResizeObserver(updateSize);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 });
    resize.observe(element);
    observer.observe(element);
    updateMotion();
    updateVisibility();
    updateSize();
    motion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      resize.disconnect();
      observer.disconnect();
      motion.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  function goTo(index: number) {
    const element = track.current;
    const child = element?.children[index] as HTMLElement | undefined;
    if (element && child) element.scrollTo({ left: child.offsetLeft, behavior: reducedMotion ? 'instant' : 'smooth' });
  }

  useEffect(() => {
    if (!last || paused || hovered || focused || reducedMotion || !inView || !tabVisible) return;
    const timer = window.setInterval(() => {
      const element = track.current;
      const child = element?.children[current >= last ? 0 : current + 1] as HTMLElement | undefined;
      if (element && child) element.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
    }, 9000);
    return () => window.clearInterval(timer);
  }, [current, last, paused, hovered, focused, reducedMotion, inView, tabVisible]);

  const controlClass = 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)]';

  return (
    <section
      data-reveal="true"
      aria-labelledby={headingId}
      aria-roledescription={de ? 'Karussell' : 'carousel'}
      // `min-w-0`: the track below is every slide laid end to end, so as a grid or
      // flex item this section would otherwise widen its column past the screen.
      className={cn('min-w-0', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    >
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="casa-tricolor-rule block h-1 w-24 rounded-full" aria-hidden />
          <h2 id={headingId} className="mt-3 text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
        </div>
        {last > 0 && (
          <div className="flex items-center gap-2">
            {!reducedMotion && <button type="button" className={cn(controlClass, 'w-auto px-3 text-xs font-semibold')} onClick={() => setPaused(value => !value)} aria-label={paused ? (de ? 'Automatischen Wechsel starten' : 'Start automatic rotation') : (de ? 'Automatischen Wechsel pausieren' : 'Pause automatic rotation')}>
              {paused ? (de ? 'Abspielen' : 'Play') : 'Pause'}
            </button>}
            <button type="button" className={controlClass} aria-label={de ? 'Vorherige Stimmen' : 'Previous stories'} onClick={() => { setPaused(true); goTo(current <= 0 ? last : current - 1); }}><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-10 text-center text-xs font-semibold tabular-nums text-[var(--casa-muted)]">{current + 1} / {last + 1}</span>
            <button type="button" className={controlClass} aria-label={de ? 'Nächste Stimmen' : 'Next stories'} onClick={() => { setPaused(true); goTo(current >= last ? 0 : current + 1); }}><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      <div
        ref={track}
        className="relative mt-5 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto overscroll-x-contain px-1 pb-5 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerDown={() => setPaused(true)}
        onScroll={() => {
          const element = track.current;
          const first = element?.firstElementChild as HTMLElement | undefined;
          if (element && first) setActive(Math.round(element.scrollLeft / (first.getBoundingClientRect().width + 16)));
        }}
      >
        {stories.map((card, index) => (
          <div key={card.id} role="group" aria-roledescription={de ? 'Stimme' : 'slide'} aria-label={`${index + 1} / ${stories.length}`} className="flex min-w-0 shrink-0 basis-full snap-start md:basis-[calc((100%-1rem)/2)] xl:basis-[calc((100%-2rem)/3)]">
            <TestimonialTile card={card} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}
