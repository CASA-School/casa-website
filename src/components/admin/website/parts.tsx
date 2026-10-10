'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { diffWords } from '@/lib/cms/diff';
import type { LocaleStatus } from '@/lib/cms/editor-types';
import { cn } from '@/lib/utils';

import styles from './editor.module.css';

/**
 * Small pieces the website editor's screens share: icons on the workspace's
 * 16-unit grid (components/admin/icons.tsx draws the rail's), the status dot,
 * the word diff, and the modal frame.
 */

const box = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const I = {
  back: (
    <svg {...box} className="h-4 w-4">
      <path d="M6.5 3.5 2.5 8l4 4.5M2.5 8h11" />
    </svg>
  ),
  page: (
    <svg {...box} className="h-4 w-4">
      <path d="M9.25 1.75H4.4a.9.9 0 0 0-.9.9v10.7a.9.9 0 0 0 .9.9h7.2a.9.9 0 0 0 .9-.9V5Z" />
      <path d="M9.25 1.75V5h3.25M5.75 8.5h4.5M5.75 11h3" />
    </svg>
  ),
  chevron: (
    <svg {...box} className="h-3.5 w-3.5">
      <path d="m4 6 4 4 4-4" />
    </svg>
  ),
  globe: (
    <svg {...box} className="h-4 w-4">
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2a9.5 9.5 0 0 1 0 12M8 2a9.5 9.5 0 0 0 0 12" />
    </svg>
  ),
  desktop: (
    <svg {...box} className="h-4 w-4">
      <rect x="1.75" y="2.5" width="12.5" height="8.5" rx="1.2" />
      <path d="M5.5 13.75h5M8 11v2.75" />
    </svg>
  ),
  tablet: (
    <svg {...box} className="h-4 w-4">
      <rect x="3.25" y="1.75" width="9.5" height="12.5" rx="1.3" />
      <path d="M7.25 12h1.5" />
    </svg>
  ),
  phone: (
    <svg {...box} className="h-4 w-4">
      <rect x="4.75" y="1.75" width="6.5" height="12.5" rx="1.3" />
      <path d="M7.5 12h1" />
    </svg>
  ),
  sparkle: (
    <svg {...box} className="h-4 w-4">
      <path d="M8 1.75 9.3 6.2 13.75 7.5 9.3 8.8 8 13.25 6.7 8.8 2.25 7.5 6.7 6.2Z" />
      <path d="M13 1.75v2.5M11.75 3h2.5" />
    </svg>
  ),
  history: (
    <svg {...box} className="h-4 w-4">
      <path d="M2.25 8a5.75 5.75 0 1 0 1.7-4.1L2.25 5.6" />
      <path d="M2.25 2.25V5.6H5.6M8 4.75V8l2.25 1.5" />
    </svg>
  ),
  close: (
    <svg {...box} className="h-4 w-4">
      <path d="M12 4 4 12M4 4l8 8" />
    </svg>
  ),
  lock: (
    <svg {...box} className="h-3.5 w-3.5">
      <rect x="3.25" y="7" width="9.5" height="7" rx="1.3" />
      <path d="M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2" />
    </svg>
  ),
  check: (
    <svg {...box} className="h-3.5 w-3.5" strokeWidth={2}>
      <path d="m3.25 8.25 3 3 6.5-6.5" />
    </svg>
  ),
  comment: (
    <svg {...box} className="h-4 w-4">
      <path d="M2.5 4.4a.9.9 0 0 1 .9-.9h9.2a.9.9 0 0 1 .9.9v5.2a.9.9 0 0 1-.9.9H6.75L3.5 13.25V10.5h-.1a.9.9 0 0 1-.9-.9V4.4Z" />
    </svg>
  ),
  link: (
    <svg {...box} className="h-3.5 w-3.5">
      <path d="M6.75 9.25a2.75 2.75 0 0 0 4 .1l2-2a2.8 2.8 0 0 0-4-4l-.85.85" />
      <path d="M9.25 6.75a2.75 2.75 0 0 0-4-.1l-2 2a2.8 2.8 0 0 0 4 4l.85-.85" />
    </svg>
  ),
  data: (
    <svg {...box} className="h-4 w-4">
      <ellipse cx="8" cy="3.75" rx="5.25" ry="2" />
      <path d="M2.75 3.75v8.5c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2v-8.5M2.75 8c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2" />
    </svg>
  ),
  calendar: (
    <svg {...box} className="h-4 w-4">
      <rect x="2" y="3.5" width="12" height="10" rx="1.3" />
      <path d="M2 6.5h12M5.5 2.25v2.5M10.5 2.25v2.5" />
    </svg>
  ),
  pointer: (
    <svg {...box} className="h-4 w-4">
      <path d="m3 2.75 4.25 10.5 1.6-4.4 4.4-1.6Z" />
    </svg>
  ),
  search: (
    <svg {...box} className="h-4 w-4">
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 3.25 3.25" />
    </svg>
  ),
  external: (
    <svg {...box} className="h-3.5 w-3.5">
      <path d="M9.5 2.5h4v4M13.5 2.5 7.75 8.25M6.5 3.5H3.4a.9.9 0 0 0-.9.9v7.2a.9.9 0 0 0 .9.9h7.2a.9.9 0 0 0 .9-.9V9.5" />
    </svg>
  ),
} as const;

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4 animate-spin motion-reduce:animate-none', className)} aria-hidden>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const STATUS_LABEL: Record<LocaleStatus, string> = {
  live: 'Live',
  draft: 'Draft',
  upcoming: 'Waiting to go live',
  stale: 'Needs update',
  missing: 'Not written yet',
};

export const statusLabel = (status: LocaleStatus) => STATUS_LABEL[status];

export function StatusDot({ status, className }: { status: LocaleStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        status === 'live' && 'bg-[#2f9e5e]',
        status === 'draft' && 'bg-[var(--casa-sun)] ring-1 ring-[#c99a00]',
        status === 'upcoming' && 'bg-[var(--casa-blue)]',
        status === 'stale' && 'bg-white ring-2 ring-inset ring-[#c99a00]',
        status === 'missing' && 'border border-dashed border-[#8b97aa] bg-transparent',
        className
      )}
    />
  );
}

export function Diff({ before, after, className }: { before: string; after: string; className?: string }) {
  return (
    <p className={cn('text-[0.875rem] leading-relaxed text-[var(--casa-ink)]', className)}>
      {diffWords(before, after).map((part, index) => (
        <span key={index}>
          {index > 0 ? ' ' : null}
          <span
            className={cn(
              part.kind === 'removed' && 'rounded-[3px] bg-[#fde8e9] px-0.5 text-[#a10510] line-through decoration-[#a10510]/50',
              part.kind === 'added' && 'rounded-[3px] bg-[#dff2e6] px-0.5 text-[#0b5c2a]'
            )}
          >
            {part.text}
          </span>
        </span>
      ))}
    </p>
  );
}

/** A modal frame: scrim, focus, Escape. */
export function Modal({
  label,
  onClose,
  children,
  width = 'max-w-[760px]',
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <div
      className={cn('fixed inset-0 z-50 grid place-items-center bg-[rgba(13,20,32,0.46)] p-4 sm:p-6', styles.fade)}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
        className={cn(
          'flex max-h-[calc(100dvh-48px)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_36px_90px_-24px_rgba(13,20,32,0.55)] outline-none',
          width,
          styles.dialog
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  active,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--casa-text-subtle)] transition-colors hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/50',
        active && 'bg-[var(--casa-blue-tint)] text-[var(--casa-accent-text)]',
        className
      )}
    >
      {children}
    </button>
  );
}

export function Avatar({ initials, tone = 'ink', size = 30, title }: { initials: string; tone?: 'ink' | 'sun'; size?: number; title?: string }) {
  return (
    <span
      title={title}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-white',
        tone === 'ink' ? 'bg-ws-panel text-ws-on-panel' : 'bg-[var(--casa-sun)] text-[var(--casa-ink)]'
      )}
    >
      {initials}
    </span>
  );
}

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
