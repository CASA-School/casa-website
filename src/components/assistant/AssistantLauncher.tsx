'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { cn } from '@/lib/utils';

const COMPACT_VIEWPORT_MEDIA_QUERY = '(max-width: 767px)';

/** Standalone CLARA avatar — the full launcher icon. */
function ClaraIcon({ size }: { size: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'h-14 w-14' : 'h-12 w-12';
  const radius = size === 'md' ? 'rounded-xl' : 'rounded-xl';
  return (
    <span
      className={cn(
        'clara-avatar relative inline-flex shrink-0 border border-white/50 bg-white shadow-[var(--shadow-soft)]',
        dim,
        radius
      )}
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

export function AssistantLauncher() {
  const pathname = usePathname();
  const activePath = pathname ?? '/';
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const isOpen = openPath === activePath;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(COMPACT_VIEWPORT_MEDIA_QUERY);
    const handleChange = () => setIsCompactViewport(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <>
      {isOpen ? <AssistantWidget onClose={() => setOpenPath(null)} /> : null}

      <button
        type="button"
        onClick={() => setOpenPath((current) => (current === activePath ? null : activePath))}
        className={cn(
          // Base: minimal floating icon — no background, no border, no text
          'fixed right-3 z-40 p-0 opacity-100 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2 sm:right-6',
          // Position: sit above safe area on mobile, a bit higher on desktop
          isCompactViewport
            ? 'bottom-[max(0.75rem,env(safe-area-inset-bottom))]'
            : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:bottom-6'
        )}
        aria-expanded={isOpen}
        aria-controls="casa-assistant-panel"
        aria-label="Open CLARA assistant"
      >
        {/* Slightly larger on desktop, compact on mobile */}
        <ClaraIcon size={isCompactViewport ? 'sm' : 'md'} />
        <span className="sr-only">CLARA</span>
      </button>
    </>
  );
}
