'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import type { LegalSection } from '@/lib/content/legal-document';
import { cn } from '@/lib/utils';

type LegalContentsProps = {
  sections: LegalSection[];
  label: string;
  /** „25 Abschnitte": the phone's closed list says how long the document is. */
  summary: string;
};

/**
 * The line a section's heading has to pass to count as the one being read. A heading reached
 * through its link lands about 224px down (scroll padding plus the `:target` margin), so the
 * line sits below that.
 */
const READING_LINE = 260;

/**
 * A long legal text's table of contents: beside the text on a desktop, where it stays in view
 * and marks the section being read, and folded above the text on a phone.
 */
export function LegalContents({ sections, label, summary }: LegalContentsProps) {
  const [current, setCurrent] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const foldRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((heading): heading is HTMLElement => heading !== null);
    if (headings.length === 0) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      let reading: string | null = null;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top - READING_LINE > 0) break;
        reading = heading.id;
      }
      setCurrent(reading);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sections]);

  // Keeps the marked entry in the upper part of the list's own scroll area, without moving the page.
  useEffect(() => {
    const list = listRef.current;
    const entry = current ? list?.querySelector<HTMLElement>(`[data-section="${current}"]`) : null;
    if (!list || !entry) return;
    const top = entry.offsetTop - list.offsetTop;
    const reach = list.clientHeight * 0.6;
    if (top < list.scrollTop + 24) list.scrollTop = Math.max(0, top - 24);
    else if (top + entry.offsetHeight > list.scrollTop + reach) list.scrollTop = top + entry.offsetHeight - reach;
  }, [current]);

  const entries = (onPick?: () => void) =>
    sections.map((section) => {
      const isCurrent = section.id === current;
      return (
        <li key={section.id} data-section={section.id}>
          <a
            href={`#${section.id}`}
            onClick={onPick}
            aria-current={isCurrent ? 'location' : undefined}
            className={cn(
              'grid grid-cols-[1.75rem_minmax(0,1fr)] gap-1 rounded-md py-1.5 pr-2 text-sm leading-snug transition-colors',
              'border-l-2 pl-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-button-focus-ring)]',
              isCurrent
                ? 'border-[var(--casa-ink)] font-semibold text-[var(--casa-ink)]'
                : 'border-transparent text-[var(--casa-muted)] hover:text-[var(--casa-ink)]',
            )}
          >
            <span className="tabular-nums">{section.number}.</span>
            <span className="line-clamp-2">{section.title}</span>
          </a>
        </li>
      );
    });

  return (
    <>
      <details
        ref={foldRef}
        className="group mb-6 rounded-[var(--casa-radius-card)] bg-white shadow-[var(--shadow-soft)] lg:hidden print:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold text-[var(--casa-ink)] [&::-webkit-details-marker]:hidden">
          <span>
            {label}
            <span className="ml-2 font-normal text-[var(--casa-muted)]">{summary}</span>
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ol className="border-t border-[color:var(--casa-sand)] px-3 py-3">
          {entries(() => {
            if (foldRef.current) foldRef.current.open = false;
          })}
        </ol>
      </details>

      <nav aria-label={label} className="hidden lg:block print:hidden">
        <div className="sticky top-32">
          <p className="mb-3 pl-3.5 text-sm font-semibold text-[var(--casa-ink)]">{label}</p>
          <ol ref={listRef} className="max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain pb-2">
            {entries()}
          </ol>
        </div>
      </nav>
    </>
  );
}
