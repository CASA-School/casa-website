'use client';

import type { ReactNode, RefObject } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import type { ContentLocale } from '@/lib/content/types';

/**
 * The app shell for a running placement test.
 *
 * WHY THIS IS NOT A PAGE LAYOUT
 *
 * Measured on a 375x667 phone before this existed: an 80px sticky site navbar, a
 * 721px site footer, a floating assistant button over the answer area, and the
 * Next button 272px below the fold. Every one of ~28 items needed a scroll to
 * reach the button. That is not a small polish problem — it is the difference
 * between an assessment people finish and one they abandon.
 *
 * So the running test is built as an app surface instead:
 *
 *   ┌─────────────────────────┐
 *   │ header   (fixed height) │  logo + exit, 56px
 *   ├─────────────────────────┤
 *   │ content (scrolls)       │  the only scrolling region
 *   ├─────────────────────────┤
 *   │ action bar (pinned)     │  the primary action, always reachable
 *   └─────────────────────────┘
 *
 * `100dvh` rather than `100vh`: on mobile Safari and Chrome the URL bar collapses
 * on scroll, and `vh` is fixed to the *largest* viewport, so a `100vh` shell puts
 * its action bar under the browser chrome at rest. `dvh` tracks the real height.
 * `svh` is the fallback for older engines — the small viewport, which is the safe
 * end to err toward for a bar that must stay reachable.
 *
 * Only the content region scrolls (`overscroll-contain`), which is what makes it
 * feel like an app rather than a document: the header and the answer button do
 * not drift, and a rubber-band scroll at the end of a long reading text does not
 * pull the whole page.
 *
 * SHORT VIEWPORTS. A landscape phone is 375px tall, and the header plus the
 * action bar were eating 160px of that — leaving 197px of reading area, measured.
 * Everything chrome-side tightens under `max-height: 480px` to hand ~45px back.
 * The item still scrolls there and that is fine; what must not happen is the
 * answer button leaving the screen, and it does not.
 */

export function TestShell({
  locale,
  header,
  children,
  action,
  scrollRef,
  wide = false,
}: {
  locale: ContentLocale;
  /** Progress rail and any per-phase notice. Sits above the scroll region. */
  header?: ReactNode;
  children: ReactNode;
  /** The primary action. Pinned; never scrolls out of reach. */
  action?: ReactNode;
  /**
   * Handed down so the runner can reset the scroll position when the item
   * changes. The shell owns the only scrolling element, so it has to be the one
   * to expose it — `window.scrollTo` would do nothing here.
   */
  scrollRef?: RefObject<HTMLDivElement | null>;
  /** Intake can use three columns on desktop; item screens stay reading-width. */
  wide?: boolean;
}) {
  const frameWidth = wide ? 'max-w-6xl' : 'max-w-2xl';

  return (
    <div
      className="flex h-[100svh] flex-col overflow-hidden bg-[var(--casa-canvas)] text-[var(--casa-ink)] supports-[height:100dvh]:h-[100dvh]"
      data-casa-placement="shell"
    >
      {/* ---- top bar --------------------------------------------------- */}
      <header className="shrink-0 border-b border-[color:var(--casa-sand)] bg-white">
        <div
          className={cn(
            'mx-auto flex h-12 w-full items-center justify-between gap-3 px-4 sm:h-14 sm:px-6 [@media(max-height:480px)]:h-10',
            frameWidth
          )}
        >
          {/* Not a link on mobile: a logo that navigates away mid-test is a way
              to lose an attempt by mis-tap. Leaving is the explicit control. */}
          <span className="flex items-center" aria-label="CASA">
            <Logo className="h-6 w-auto sm:h-7" />
          </span>

          <Link
            href="/placement-test"
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold',
              'text-[var(--casa-muted)] transition-colors hover:bg-[var(--casa-canvas)] hover:text-[var(--casa-ink)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30'
            )}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {locale === 'de' ? 'Beenden' : 'Exit'}
          </Link>
        </div>

        {header ? (
          <div
            className={cn(
              'mx-auto w-full border-t border-[color:var(--casa-sand)]/60 px-4 py-2 sm:px-6 sm:py-2.5 [@media(max-height:480px)]:py-1',
              frameWidth
            )}
          >
            {header}
          </div>
        ) : null}
      </header>

      {/* ---- the one scrolling region ---------------------------------- */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 overflow-y-auto overscroll-contain"
        data-casa-placement="scroll-region"
      >
        {/*
          `m-auto`, not `justify-center`. Both centre a short item in a tall
          viewport — a one-line prompt with four options left ~350px of dead space
          below it on an iPad — but `justify-center` on an overflow container
          clips the *top* of content taller than the box, which is exactly what a
          long reading stimulus is. Auto margins collapse to zero instead, so a
          tall item top-aligns and scrolls normally.
        */}
        <div
          className={cn(
            'm-auto w-full px-4 py-4 sm:px-6 sm:py-6 [@media(max-height:480px)]:py-2',
            frameWidth
          )}
        >
          {children}
        </div>
      </div>

      {/* ---- pinned action -------------------------------------------- */}
      {action ? (
        <div
          className={cn(
            'shrink-0 border-t border-[color:var(--casa-sand)] bg-white/95 backdrop-blur-sm',
            // Home-indicator clearance on iPhone. `max()` so a browser that
            // reports no inset still gets real padding.
            'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
            '[@media(max-height:480px)]:pb-[max(0.375rem,env(safe-area-inset-bottom))]'
          )}
          data-casa-placement="action-bar"
        >
          <div
            className={cn(
              'mx-auto flex w-full items-center gap-3 px-4 pt-2.5 sm:px-6 sm:pt-3 [@media(max-height:480px)]:pt-1.5',
              frameWidth
            )}
          >
            {action}
          </div>
        </div>
      ) : null}
    </div>
  );
}
