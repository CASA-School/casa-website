'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Peek rail — a snapping filmstrip that runs on desktop, not only on mobile.
 *
 * The existing `course-rail-scroll` is a mobile-only overflow strip whose entire
 * CSS is "hide the scrollbar" (globals.css). It has no affordance: on a desktop
 * trackpad nothing tells you the row continues. Three things fix that, and none
 * of them is decoration:
 *
 *   1. PEEK. Cards are sized so the next one is visibly cut by the viewport
 *      edge. A partially visible card is the only honest signal that a row
 *      scrolls — dots and arrows are conventions you have to already know.
 *   2. SNAP. `scroll-snap-type: x mandatory` with `scroll-padding` so a snapped
 *      card lands flush with the rail's left inset rather than under it.
 *   3. STATE. The arrows disable at each end instead of sitting there dead, and
 *      a progress bar tracks real scroll position, so the control reflects the
 *      rail rather than merely gesturing at it.
 *
 * Scrolling uses `scrollBy({ behavior })`, and the behaviour is resolved from
 * `prefers-reduced-motion` at call time rather than baked into CSS, so a user
 * who asked for no motion gets an instant jump instead of a 500ms glide.
 */
export function CardRail({
  children,
  ariaLabel,
  railClassName = '-mx-5 scroll-pl-5 px-5',
  controlsClassName,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  /**
   * Overrides the rail's own inset. The default keeps the strip aligned to the
   * Container it sits in. Pass a bleed here to let the strip escape the
   * container on one side — see the edge-bleed pattern, which aligns the first
   * card to the grid and lets the rest run off the viewport edge.
   */
  railClassName?: string;
  controlsClassName?: string;
}) {
  const railRef = useRef<HTMLUListElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [progress, setProgress] = useState(0);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;

    const max = el.scrollWidth - el.clientWidth;
    // A 1px tolerance: sub-pixel layout means scrollLeft rarely hits max exactly.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    sync();
    el.addEventListener('scroll', sync, { passive: true });

    // Card widths are viewport-derived, so a resize changes both ends.
    const observer = new ResizeObserver(sync);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, [sync]);

  const nudge = useCallback((direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;

    const first = el.querySelector('li');
    // Fall back to 80% of the rail if the card cannot be measured.
    const step = first ? first.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    const max = el.scrollWidth - el.clientWidth;

    /*
     * Assign scrollLeft rather than calling scrollBy({ behavior: 'smooth' }).
     *
     * Measured: with `scroll-snap-type: x mandatory` on this container, the
     * smooth variant of the scroll APIs silently no-ops — the call returns, no
     * error is thrown, and scrollLeft never changes. `behavior: 'auto'` on the
     * same element moves it correctly. Assigning scrollLeft always applies, and
     * the CSS `scroll-smooth` class on the rail supplies the animation, so the
     * easing is a style concern rather than an argument that can be ignored.
     *
     * The class is applied via `motion-safe:`, so a reduced-motion user gets an
     * instant jump with no extra branch here.
     */
    el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + step * direction));
  }, []);

  return (
    <div className="space-y-4">
      <ul
        ref={railRef}
        aria-label={ariaLabel}
        className={cn(
          'course-rail-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2',
          railClassName,
          'motion-safe:scroll-smooth',
          // The rail is focusable so keyboard users can scroll it with arrow keys.
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-4'
        )}
        tabIndex={0}
      >
        {children}
      </ul>

      <div className={cn('flex items-center gap-4', controlsClassName)}>
        <div className="flex gap-2">
          {([-1, 1] as const).map((direction) => {
            const spent = direction === -1 ? atStart : atEnd;

            return (
              <button
                key={direction}
                type="button"
                onClick={() => nudge(direction)}
                /*
                 * Deliberately NOT `disabled`, and this is the important part.
                 *
                 * `disabled` makes the control's usability depend on React state
                 * being correct. If the effect that syncs that state has not run
                 * — hydration still in flight, an error higher in the tree, a
                 * listener that never fired — the button is inert with no way
                 * for the user to recover, and it looks like a broken site
                 * rather than a slow one. Observed exactly that while building
                 * this: the rail was scrolled to its end and `atEnd` was still
                 * false, so the state and the DOM disagreed.
                 *
                 * nudge() clamps to [0, max], so pressing at either end is a
                 * harmless no-op. The button therefore always works, and the
                 * state is used only to DIM it — a hint, not a gate.
                 * aria-disabled announces the same hint without removing the
                 * control from the tab order.
                 */
                aria-disabled={spent}
                aria-label={direction === -1 ? 'Previous courses' : 'Next courses'}
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)] transition-[color,border-color,opacity]',
                  'hover:border-[var(--casa-blue)]/40 hover:text-[var(--casa-accent-text)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2',
                  spent && 'opacity-35'
                )}
              >
                <ArrowRight className={cn('h-4 w-4', direction === -1 && 'rotate-180')} aria-hidden />
              </button>
            );
          })}
        </div>

        {/* Decorative: the arrows already carry the state for assistive tech. */}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--casa-sand)]" aria-hidden>
          <div
            className="h-full rounded-full bg-[var(--casa-ink-deep)] transition-[width,margin] duration-150 ease-out"
            style={{ width: '38%', marginLeft: `${progress * 62}%` }}
          />
        </div>
      </div>
    </div>
  );
}
