'use client';

import { useCallback, useRef, useState } from 'react';
import { usePathname } from '@/i18n/navigation';

import { AssistantWidget, type AssistantMessage } from '@/components/assistant/AssistantWidget';
import { useSiteCopy } from '@/components/cms/site-copy-provider';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

/** How long the panel takes to leave (globals.css, `clara-panel-out`). */
const CLOSE_MS = 160;

/** Standalone CLARA avatar — the full launcher icon. */
function ClaraIcon() {
  return (
    <span
      className="clara-avatar relative inline-flex h-12 w-12 shrink-0 rounded-xl border border-white/50 bg-white shadow-[var(--shadow-soft)] md:h-14 md:w-14"
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="22" fill="url(#claraIconHead)" />
        <circle cx="24" cy="28" r="4" fill="#0f172a" className="clara-eye" />
        <circle cx="40" cy="28" r="4" fill="#0f172a" className="clara-eye clara-eye-delay" />
        <path d="M22 41C24.8 44 28 45.4 32 45.4C36 45.4 39.2 44 42 41" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M17 18C21.2 12.5 26.1 9.6 32 9.6C37.9 9.6 42.8 12.5 47 18" stroke="#009fe3" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="15" r="4.5" fill="var(--casa-sun)" className="clara-orbit" />
        <defs>
          <linearGradient id="claraIconHead" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ebf8ff" />
            <stop offset="1" stopColor="#dbeafe" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

export function AssistantLauncher({ contentLocale }: { contentLocale: ContentLocale }) {
  const { say } = useSiteCopy();
  const pathname = usePathname() ?? '/';
  const [openOn, setOpenOn] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  /*
   * The conversation lives here, not in the panel: closed, or on another page, it is still there
   * when CLARA is opened again. In memory only, gone with the tab (privacy policy §5 and §17).
   */
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  /*
   * Open on one page only. Following a link, or going back, closes CLARA: she was left open on
   * the homepage after a visitor picked an answer, and was still open when they came back
   * (Rahman, 2026-10-29). It used to compare the page with the one she was opened on, which hid
   * her elsewhere but brought her back on that page.
   */
  if (openOn !== null && openOn !== pathname) {
    setOpenOn(null);
    setClosing(false);
  }

  const isOpen = openOn === pathname;

  const closeNow = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setOpenOn(null);
    setClosing(false);
  }, []);

  const close = useCallback(
    (returnFocus = true) => {
      if (closeTimer.current) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        closeNow();
      } else {
        setClosing(true);
        closeTimer.current = window.setTimeout(closeNow, CLOSE_MS);
      }
      if (returnFocus) buttonRef.current?.focus({ preventScroll: true });
    },
    [closeNow]
  );

  return (
    <>
      {isOpen ? (
        <AssistantWidget
          locale={contentLocale}
          messages={messages}
          onMessages={setMessages}
          closing={closing}
          onClose={close}
        />
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen && !closing ? close() : setOpenOn(pathname))}
        className={cn(
          'fixed right-3 z-40 rounded-xl p-0 transition-transform duration-200 ease-casa hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2 sm:right-6',
          // Above the safe area on phones, a little higher from `sm`.
          'bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-6',
          isOpen && !closing && 'ring-2 ring-[var(--casa-blue)]/30 ring-offset-2'
        )}
        aria-expanded={isOpen && !closing}
        aria-controls="casa-assistant-panel"
        aria-label={say(contentLocale, 'CLARA öffnen', 'Open CLARA assistant')}
      >
        <ClaraIcon />
        <span className="sr-only">CLARA</span>
      </button>
    </>
  );
}
