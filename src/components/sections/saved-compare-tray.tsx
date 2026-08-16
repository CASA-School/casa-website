'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Scale, Trash2, X } from 'lucide-react';

import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

import type { CompareItem, CompareType } from './compare-utils';
import { clearCompareItems, getCompareItems, removeCompareItem } from './compare-utils';

type SavedCompareTrayProps = {
  type: CompareType;
  locale: ContentLocale;
  comparePath: string;
};

const copy = {
  en: {
    title: 'Saved compare',
    subtitleCourse: 'Compare 2 courses without losing context.',
    subtitleExam: 'Compare 2 exams without losing context.',
    clear: 'Clear',
    compare: 'Compare now',
    compareDisabled: 'Select one more',
    remove: 'Remove',
    guardrail: 'Pick exactly 2 items',
    ready: 'Ready to compare',
  },
  de: {
    title: 'Gemerkter Vergleich',
    subtitleCourse: '2 Kurse vergleichen, ohne Kontext zu verlieren.',
    subtitleExam: '2 Prüfungen vergleichen, ohne Kontext zu verlieren.',
    clear: 'Leeren',
    compare: 'Jetzt vergleichen',
    compareDisabled: 'Noch eine wählen',
    remove: 'Entfernen',
    guardrail: 'Genau 2 Elemente wählen',
    ready: 'Vergleich ist bereit',
  },
} as const;

export function SavedCompareTray({ type, locale, comparePath }: SavedCompareTrayProps) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const sync = () => {
      setItems(getCompareItems(type));
    };

    sync();
    const onUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ type?: CompareType }>;
      if (!customEvent.detail?.type || customEvent.detail.type === type) {
        sync();
      }
    };

    window.addEventListener('casa:compare-updated', onUpdate);

    return () => {
      window.removeEventListener('casa:compare-updated', onUpdate);
    };
  }, [type]);

  const compareHref = useMemo(() => {
    if (items.length === 0) {
      return comparePath;
    }

    const ids = items.map((item) => encodeURIComponent(item.id)).join(',');
    const sectionId = type === 'course' ? 'course-compare-section' : 'exam-compare-section';
    return `${comparePath}?compare=${ids}#${sectionId}`;
  }, [comparePath, items, type]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 sm:inset-x-6">
      <div className="mx-auto max-w-5xl rounded-xl border border-[color:var(--casa-sand)] bg-white/96 p-3 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-2 text-left"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--casa-warm-soft)] text-[var(--casa-ink)]">
              <Scale className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-bold text-[var(--casa-ink)]">{copy[locale].title}</span>
              <span className="block text-xs text-[var(--casa-muted)]">
                {type === 'course' ? copy[locale].subtitleCourse : copy[locale].subtitleExam}
              </span>
              <span className="block text-xs font-semibold text-[var(--casa-muted)]">
                {items.length}/2 {locale === 'de' ? 'gewählt' : 'selected'} · {items.length >= 2 ? copy[locale].ready : copy[locale].guardrail}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                clearCompareItems(type);
                setItems([]);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--casa-sand)] px-3 py-1.5 text-xs font-semibold text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {copy[locale].clear}
            </button>
            {items.length >= 2 ? (
              <Link
                href={compareHref}
                className="inline-flex items-center rounded-full bg-[var(--casa-ink-deep)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]"
              >
                {copy[locale].compare}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center rounded-full bg-[var(--casa-sand)] px-4 py-1.5 text-xs font-semibold text-[var(--casa-ink)]"
              >
                {copy[locale].compareDisabled}
              </button>
            )}
          </div>
        </div>

        <ul
          className={cn(
            'mt-3 grid gap-2 overflow-hidden transition-[max-height,opacity] duration-200',
            expanded ? 'max-h-[220px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--casa-sand)]/80 bg-[var(--casa-bg)] px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--casa-ink)]">{item.title}</p>
                {item.meta ? <p className="text-xs text-[var(--casa-muted)]">{item.meta}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = removeCompareItem(type, item.id);
                  setItems(next);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--casa-sand)] px-2.5 py-1 text-xs font-semibold text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]"
              >
                <X className="h-3.5 w-3.5" />
                {copy[locale].remove}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
