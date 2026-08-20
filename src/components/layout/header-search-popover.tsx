'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  HelpCircle,
  Loader2,
  Newspaper,
  Search,
  X,
} from 'lucide-react';

import type { ContentLocale } from '@/lib/content/types';
import type { PublicSearchResponse, PublicSearchResult, PublicSearchResultType } from '@/lib/search/public-search';
import { cn } from '@/lib/utils';

type HeaderSearchPopoverProps = {
  locale: ContentLocale;
  isActive?: boolean;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

const copy = {
  en: {
    open: 'Open site search',
    close: 'Close search',
    title: 'Search CASA',
    placeholder: 'Search courses, exams, FAQ, news...',
    suggestions: 'Popular searches',
    destinations: 'Quick links',
    results: 'Results',
    noResults: 'No quick matches. Try the full search page.',
    error: 'Quick search is unavailable. Open the full search page.',
    loading: 'Searching...',
    viewAll: 'View all results',
    searchPage: 'Open search page',
    destinationLinks: [
      { label: 'Courses', href: '/courses', icon: BookOpen },
      { label: 'Exams', href: '/exams', icon: CalendarDays },
      { label: 'FAQ', href: '/faq', icon: HelpCircle },
      { label: 'Accommodation', href: '/accommodation', icon: Building2 },
    ],
    suggestionLinks: [
      { label: 'telc B2 dates', query: 'telc b2 dates' },
      { label: 'Visa intensive', query: 'visa intensive' },
      { label: 'Host family', query: 'host family' },
    ],
    typeLabels: {
      courses: 'Course',
      exams: 'Exam',
      faq: 'FAQ',
      news: 'News',
    },
  },
  de: {
    open: 'Seitensuche öffnen',
    close: 'Suche schließen',
    title: 'CASA durchsuchen',
    placeholder: 'Kurse, Prüfungen, FAQ, News suchen...',
    suggestions: 'Beliebte Suchen',
    destinations: 'Direktzugriff',
    results: 'Treffer',
    noResults: 'Keine schnellen Treffer. Nutzen Sie die volle Suchseite.',
    error: 'Schnellsuche ist nicht verfügbar. Öffnen Sie die Suchseite.',
    loading: 'Suche läuft...',
    viewAll: 'Alle Ergebnisse ansehen',
    searchPage: 'Suchseite öffnen',
    destinationLinks: [
      { label: 'Kurse', href: '/courses', icon: BookOpen },
      { label: 'Prüfungen', href: '/exams', icon: CalendarDays },
      { label: 'FAQ', href: '/faq', icon: HelpCircle },
      { label: 'Unterkunft', href: '/accommodation', icon: Building2 },
    ],
    suggestionLinks: [
      { label: 'telc B2 Termine', query: 'telc b2 termine' },
      { label: 'Visum Intensiv', query: 'visum intensivkurs' },
      { label: 'Gastfamilie', query: 'gastfamilie' },
    ],
    typeLabels: {
      courses: 'Kurs',
      exams: 'Prüfung',
      faq: 'FAQ',
      news: 'News',
    },
  },
} as const;

const resultIcons: Record<PublicSearchResultType, typeof BookOpen> = {
  courses: BookOpen,
  exams: CalendarDays,
  faq: HelpCircle,
  news: Newspaper,
};

function buildSearchHref(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return '/search';
  }

  return `/search?q=${encodeURIComponent(trimmed)}&scope=all`;
}

function flattenResults(results: PublicSearchResponse | null) {
  if (!results) {
    return [];
  }

  return [
    ...results.groups.courses,
    ...results.groups.exams,
    ...results.groups.faq,
    ...results.groups.news,
  ].slice(0, 5);
}

function ResultRow({
  result,
  label,
  onNavigate,
}: {
  result: PublicSearchResult;
  label: string;
  onNavigate: () => void;
}) {
  const Icon = resultIcons[result.type];

  return (
    <Link
      href={result.href}
      onClick={onNavigate}
      className="group flex items-start gap-3 rounded-xl border border-[color:var(--casa-sand)] bg-white px-3 py-2.5 text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/35 hover:bg-[var(--casa-warm-soft)]/35"
    >
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-bold">{result.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-[var(--casa-muted)]">{result.snippet}</span>
      </span>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--casa-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--casa-accent-text)]" />
    </Link>
  );
}

export function HeaderSearchPopover({ locale, isActive }: HeaderSearchPopoverProps) {
  const dictionary = copy[locale];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PublicSearchResponse | null>(null);
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trimmedQuery = query.trim();
  const resultRows = useMemo(() => flattenResults(results), [results]);
  const searchHref = buildSearchHref(query);

  function navigateToSearch() {
    setOpen(false);
    router.push(searchHref);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || trimmedQuery.length < 2) {
      setLoading(false);
      setResults(null);
      setError(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(trimmedQuery)}&scope=all&limit=3`,
          { signal: controller.signal }
        );
        const payload = (await response.json()) as ApiResponse<PublicSearchResponse>;

        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? 'Search failed');
        }

        setResults(payload.data);
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setError(true);
          setResults(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 160);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, trimmedQuery]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="header-search-trigger"
        aria-label={dictionary.open}
        aria-expanded={open}
        aria-controls="header-search-popover"
        title={dictionary.open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--casa-sand)] p-2 text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
          (isActive || open) && 'bg-[var(--casa-surface-subtle)] text-[var(--casa-ink)]'
        )}
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          id="header-search-popover"
          /*
           * The last clause pins the panel to the container's right edge on
           * screens wider than the container. `max()` is load-bearing: the old
           * form was a bare calc against a 1440px literal, and raising the
           * ceiling to 1680 makes that calc go negative between 1536 and 1680 —
           * which would have pushed the panel off the right of the window at
           * exactly the widths 2xl is meant to cover. Below the ceiling it now
           * falls back to the lg gutter instead.
           */
          className="fixed left-4 right-4 top-[calc(5rem+10px)] z-[950] overflow-hidden rounded-xl border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-modal)] sm:left-auto sm:right-8 sm:w-[28rem] lg:right-10 2xl:right-[max(2.5rem,calc((100vw-var(--casa-container-max))/2+2.5rem))]"
        >
          <form
            className="border-b border-[color:var(--casa-sand)] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              navigateToSearch();
            }}
          >
            <label htmlFor="header-search-query" className="sr-only">
              {dictionary.title}
            </label>
            <div className="flex items-center gap-2 rounded-full border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-3 py-1.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden="true" />
              <input
                ref={inputRef}
                id="header-search-query"
                type="search"
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={dictionary.placeholder}
                autoComplete="off"
                enterKeyHint="search"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    navigateToSearch();
                  }
                }}
                className="h-9 min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] focus-visible:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--casa-muted)] transition-colors hover:bg-white hover:text-[var(--casa-ink)]"
                  aria-label={dictionary.close}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </form>

          <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-3">
            {trimmedQuery.length < 2 ? (
              <div className="space-y-4">
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                    {dictionary.destinations}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {dictionary.destinationLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2 rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-3 py-2 text-sm font-bold text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/35 hover:bg-[var(--casa-warm-soft)]/35"
                        >
                          <Icon className="h-4 w-4 text-[var(--casa-accent-text)]" aria-hidden="true" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                    {dictionary.suggestions}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dictionary.suggestionLinks.map((item) => (
                      <Link
                        key={item.query}
                        href={buildSearchHref(item.query)}
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--casa-muted)] transition-colors hover:border-[var(--casa-blue)]/35 hover:text-[var(--casa-ink)]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                    {dictionary.results}
                  </p>
                  {loading ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--casa-muted)]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      {dictionary.loading}
                    </span>
                  ) : null}
                </div>

                {!loading && resultRows.length === 0 ? (
                  <p className="rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-3 py-3 text-sm text-[var(--casa-muted)]">
                    {error ? dictionary.error : dictionary.noResults}
                  </p>
                ) : null}

                {resultRows.map((result) => (
                  <ResultRow
                    key={`${result.type}-${result.id}`}
                    result={result}
                    label={dictionary.typeLabels[result.type]}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </section>
            )}
          </div>

          <div className="border-t border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-3 py-2">
            <Link
              href={searchHref}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--casa-accent-text)] transition-colors hover:bg-white"
            >
              <span>{trimmedQuery ? dictionary.viewAll : dictionary.searchPage}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
