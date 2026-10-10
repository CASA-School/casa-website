'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { searchAction } from '@/app/(admin)/admin/(editor)/website/actions';
import type { EditorPageGroup } from '@/config/cms/editor-pages';
import type { SearchHit } from '@/lib/cms/editor-types';
import { cn } from '@/lib/utils';

import styles from './editor.module.css';
import { I, Spinner, StatusDot } from './parts';

/**
 * Go to a page, or find a text anywhere on the editable site.
 *
 * Typing filters the pages and, from two letters, searches every editable
 * text in every language; choosing a text opens its page and the text on it.
 */

function Highlight({ text, term }: { text: string; term: string }) {
  const index = text.toLocaleLowerCase('de').indexOf(term.toLocaleLowerCase('de'));
  if (!term || index < 0) return <>{text}</>;
  const start = Math.max(0, index - 60);
  return (
    <>
      {start > 0 ? '…' : ''}
      {text.slice(start, index)}
      <mark className="rounded-[3px] bg-[#fff1a6] px-0.5 text-[var(--casa-ink)]">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  );
}

export function PagePicker({
  pages,
  currentPath,
  draftPaths,
  onOpen,
  onReveal,
  onClose,
}: {
  pages: readonly EditorPageGroup[];
  currentPath: string;
  draftPaths: ReadonlySet<string>;
  onOpen: (path: string) => void;
  onReveal: (hit: SearchHit) => void;
  onClose: () => void;
}) {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  const searchable = term.trim().length >= 2;

  useEffect(() => {
    if (!searchable) return;
    const timer = window.setTimeout(() => {
      searchAction(term).then((result) => {
        setSearching(false);
        if (result.ok) setHits(result.hits);
      });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [term, searchable]);

  const visibleHits = searchable ? hits : [];

  const groups = useMemo(() => {
    const needle = term.trim().toLocaleLowerCase('de');
    return pages
      .map((group) => ({ ...group, pages: group.pages.filter((page) => !needle || page.name.toLocaleLowerCase('de').includes(needle)) }))
      .filter((group) => group.pages.length);
  }, [pages, term]);

  return (
    <>
      <button type="button" aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={onClose} />
      <div
        className={cn(
          'absolute left-4 top-[calc(100%+8px)] z-40 w-[min(780px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-ws-line bg-white shadow-[0_28px_64px_-24px_rgba(15,23,42,0.38)]',
          styles.pop
        )}
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
      >
        <div className="flex items-center gap-3 border-b border-ws-line-soft px-4 py-3 text-[var(--casa-text-subtle)]">
          {I.search}
          <label htmlFor="page-search" className="sr-only">
            Search pages and text
          </label>
          <input
            id="page-search"
            ref={input}
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setSearching(event.target.value.trim().length >= 2);
            }}
            placeholder="Search pages and text"
            className="h-8 flex-1 bg-transparent text-[0.95rem] font-medium text-[var(--casa-ink)] outline-none placeholder:text-[var(--casa-text-subtle)]"
          />
          {searching ? <Spinner /> : null}
        </div>

        <div className="max-h-[min(480px,70dvh)] overflow-y-auto p-3">
          {visibleHits.length ? (
            <section className="mb-2">
              <p className="px-2.5 pt-1 pb-1.5 text-xs font-semibold text-[var(--casa-text-subtle)]">Text on the site</p>
              {visibleHits.map((hit) => (
                <button
                  key={`${hit.key}|${hit.locale}`}
                  type="button"
                  onClick={() => onReveal(hit)}
                  className="block w-full rounded-xl px-2.5 py-2 text-left hover:bg-ws-sunk"
                >
                  <span className="block text-xs font-semibold text-[var(--casa-text-subtle)]">
                    {hit.scope} · {hit.section} · {hit.label}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[0.85rem] leading-relaxed text-[var(--casa-ink)]">
                    <Highlight text={hit.text} term={term.trim()} />
                  </span>
                </button>
              ))}
            </section>
          ) : null}

          <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.group}>
                <p className="px-2.5 pt-2.5 pb-1 text-xs font-semibold text-[var(--casa-text-subtle)]">{group.group}</p>
                {group.pages.map((page) => {
                  const current = page.path === currentPath;
                  return (
                    <button
                      key={page.path}
                      type="button"
                      onClick={() => onOpen(page.path)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                        current ? 'bg-[var(--casa-blue-tint)] font-bold text-[var(--casa-accent-text)]' : 'hover:bg-ws-sunk',
                        page.locked && !current && 'text-[var(--casa-text-subtle)]'
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{page.name}</span>
                      {draftPaths.has(page.path) ? <StatusDot status="draft" /> : null}
                      {page.locked ? <span className="text-[var(--casa-text-subtle)]">{I.lock}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
