'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

/*
 * Drawn inline rather than imported: the icon adapter has no Pause glyph, and a
 * pause mark is two rectangles. Not worth a dependency.
 */
function PauseGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden>
      <rect x="2" y="1.5" width="3" height="9" rx="1" />
      <rect x="7" y="1.5" width="3" height="9" rx="1" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden>
      <path d="M3 1.8v8.4a.8.8 0 0 0 1.22.68l6.4-4.2a.8.8 0 0 0 0-1.36l-6.4-4.2A.8.8 0 0 0 3 1.8Z" />
    </svg>
  );
}

/**
 * The dates ticker under the masthead.
 *
 * A marquee suits the newspaper idiom and fills the band the printed edition
 * puts a red rule in — but moving text is genuinely harder to read, and the
 * readers of this page are learning the language it is written in. Three things
 * resolve that rather than ignore it:
 *
 *   1. NOTHING LIVES ONLY HERE. Every item is stated in full in a rubric below,
 *      so the ticker is a summary, never a source.
 *   2. A REAL PAUSE CONTROL. WCAG 2.2.2 requires a mechanism to pause moving
 *      content that starts on its own and runs past five seconds. Hover-to-pause
 *      is not that mechanism — it does nothing for a keyboard or touch user — so
 *      there is a button, and it is in the tab order.
 *   3. IT NEVER MOVES for `prefers-reduced-motion`. The track has no animation
 *      at all under `motion-reduce`, so it renders as a static row and the pause
 *      button is hidden because there is nothing to pause.
 *
 * The list is rendered twice: the animation translates by exactly -50%, so as
 * the first copy leaves the second is already in place and the loop is seamless.
 * The duplicate is `aria-hidden` so a screen reader hears the dates once.
 */
export function NewsFlashTicker({ items, label }: { items: string[]; label: string }) {
  const [paused, setPaused] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const row = (duplicate: boolean) => (
    <ul
      aria-hidden={duplicate || undefined}
      className="flex shrink-0 items-center gap-10 pr-10"
    >
      {items.map((item, index) => (
        <li key={`${duplicate ? 'dup' : 'row'}-${index}`} className="flex items-center gap-10 whitespace-nowrap">
          <span className="text-sm font-semibold text-white">{item}</span>
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-sun)]" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="relative flex items-center gap-3 overflow-hidden bg-[var(--casa-red)] py-2.5">
      <div className="min-w-0 flex-1 overflow-hidden" role="region" aria-label={label}>
        <div
          className={cn(
            'flex w-max motion-safe:animate-[casa-ticker_38s_linear_infinite]',
            paused && 'motion-safe:[animation-play-state:paused]'
          )}
        >
          {row(false)}
          {row(true)}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        className={cn(
          'mr-4 hidden shrink-0 items-center justify-center rounded-full bg-white/15 p-1.5 text-white transition-colors hover:bg-white/25 motion-safe:flex',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-red)]'
        )}
      >
        {paused ? <PlayGlyph /> : <PauseGlyph />}
        <span className="sr-only">{paused ? 'Resume' : 'Pause'}</span>
      </button>
    </div>
  );
}
