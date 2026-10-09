'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowRight, X } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { NEW_SITE_NOTICE } from '@/config/site-notice';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

/**
 * "Our new website is here" — see `src/config/site-notice.ts` for why it
 * exists, why it sits in a corner and how to remove it.
 *
 * Bottom-left, because CLARA's launcher holds the bottom-right corner. On a
 * phone it starts as a one-line pill and opens into the card on a tap, so it
 * never covers a third of a small screen.
 *
 * It appears only once the visitor has scrolled past the hero, and steps aside
 * again at the top and while the footer is in view. Shown on arrival, it sat
 * on every hero's main button at 1280x720 and 1366x768 ("Kurs finden",
 * "Unterkunft anfragen"), and the footer holds the Impressum and privacy links.
 */

const copy = {
  de: {
    label: 'Hinweis zur neuen Website',
    pill: 'Unsere neue Website',
    title: 'Unsere neue Website ist da!',
    body: 'Wir verbessern sie gerade weiter. Fehlt dir etwas oder klappt etwas nicht?',
    link: 'Sag uns Bescheid',
    close: 'Hinweis schließen',
  },
  en: {
    label: 'About our new website',
    pill: 'Our new website',
    title: 'Our new website is here!',
    body: 'We’re still improving it. Is something missing, or not working as it should?',
    link: 'Let us know',
    close: 'Close this notice',
  },
} as const;

/*
 * Closed for the rest of the visit, in memory only. Navigation between pages is
 * client-side, so this holds until the tab is reloaded or reopened. Nothing is
 * written to the browser: the privacy policy (§5) states that the public site
 * stores nothing there, not even in local storage.
 */
let closedThisVisit = false;
const closeListeners = new Set<() => void>();

function subscribeToClose(onChange: () => void) {
  closeListeners.add(onChange);
  return () => {
    closeListeners.delete(onChange);
  };
}

function closeForThisVisit() {
  closedThisVisit = true;
  closeListeners.forEach((listener) => listener());
}

/** Below this, the hero and its button still fill the lower screen. */
const PAST_HERO = 0.45;

function subscribeToScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  window.addEventListener('resize', onChange);
  return () => {
    window.removeEventListener('scroll', onChange);
    window.removeEventListener('resize', onChange);
  };
}

const readPastHero = () => window.scrollY > window.innerHeight * PAST_HERO;

/** Pages where the notice would only be in the way. */
function isQuietPath(pathname: string) {
  return pathname === '/contact' || pathname.startsWith('/registration') || pathname.startsWith('/placement-test/test');
}

export function NewSiteNotice({ contentLocale }: { contentLocale: ContentLocale }) {
  const text = copy[contentLocale === 'de' ? 'de' : 'en'];
  const pathname = usePathname() ?? '/';
  const [expanded, setExpanded] = useState(false);
  const [footerInView, setFooterInView] = useState(false);

  // Not server-rendered: the notice is no part of any page a search engine reads.
  const dismissed = useSyncExternalStore(subscribeToClose, () => closedThisVisit, () => true);
  const pastHero = useSyncExternalStore(subscribeToScroll, readPastHero, () => false);
  const showing = NEW_SITE_NOTICE.enabled && !dismissed && !isQuietPath(pathname);
  const inView = pastHero && !footerInView;

  useEffect(() => {
    if (!showing || typeof IntersectionObserver === 'undefined') return;
    const footer = document.querySelector('[data-site-footer]');
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterInView(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, [showing, pathname]);

  if (!showing) return null;

  const closeButton = (className?: string) => (
    <button
      type="button"
      onClick={closeForThisVisit}
      aria-label={text.close}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--casa-muted)] transition-colors duration-150 hover:bg-[var(--casa-ground)] hover:text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]',
        className
      )}
    >
      <X className="size-4" aria-hidden />
    </button>
  );

  return (
    <aside
      aria-label={text.label}
      inert={!inView}
      className={cn(
        'fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-40 transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none print:hidden sm:bottom-6 sm:left-6',
        inView ? 'opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      )}
    >
      {/* Phone, closed: one line, clear of CLARA's launcher. */}
      <div
        className={cn(
          'items-center gap-0.5 rounded-full bg-white py-1 pl-1 pr-1 shadow-[var(--shadow-modal)] sm:hidden',
          expanded ? 'hidden' : 'flex'
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          className="flex min-h-8 items-center gap-2 rounded-full pl-2.5 pr-1.5 text-[0.8125rem] font-semibold text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
        >
          <span aria-hidden className="casa-logo-stripe h-2 w-4 rounded-full" />
          {text.pill}
        </button>
        {closeButton()}
      </div>

      {/* The card: always on a wider screen, after a tap on a phone. */}
      <div
        className={cn(
          'relative w-[min(19.5rem,calc(100vw-6rem))] overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-modal)] sm:block',
          expanded ? 'block' : 'hidden'
        )}
      >
        <span aria-hidden className="casa-logo-stripe block h-[3px]" />
        <div className="py-4 pl-5 pr-12">
          <p className="font-display text-[1.0625rem] font-semibold leading-snug text-[var(--casa-ink)]">{text.title}</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--casa-muted)]">{text.body}</p>
          <Link
            href={`/contact?topic=${NEW_SITE_NOTICE.feedbackTopic}`}
            onClick={closeForThisVisit}
            className="group mt-3 inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2"
          >
            {text.link}
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </Link>
        </div>
        {closeButton('absolute right-2.5 top-3.5')}
      </div>
    </aside>
  );
}
