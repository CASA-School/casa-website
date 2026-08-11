'use client';

import { useState, useSyncExternalStore } from 'react';
import { Search } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

export type UnifiedSearchScope = 'all' | 'courses' | 'exams' | 'faq' | 'news';

type UnifiedSearchPanelProps = {
  locale: ContentLocale;
  defaultScope?: UnifiedSearchScope;
  className?: string;
};

const copy = {
  en: {
    title: 'Search courses, exams, FAQ, and news in one place',
    placeholder: 'Search by level, exam name, visa question, or topic…',
    submit: 'Search',
    inputLabel: 'Search query',
    scopeLabel: 'Search scope',
    scopes: {
      all: 'Everything',
      courses: 'Courses',
      exams: 'Exams',
      faq: 'FAQ',
      news: 'News',
    },
    quickLinks: [
      { label: 'Visa intensive', query: 'visa intensive' },
      { label: 'telc B2 dates', query: 'telc b2 dates' },
      { label: 'Host family', query: 'host family' },
    ],
  },
  de: {
    title: 'Kurse, Prüfungen, FAQ und News an einem Ort durchsuchen',
    placeholder: 'Nach Niveau, Prüfung, Visafrage oder Thema suchen…',
    submit: 'Suchen',
    inputLabel: 'Suchbegriff',
    scopeLabel: 'Suchbereich',
    scopes: {
      all: 'Alles',
      courses: 'Kurse',
      exams: 'Prüfungen',
      faq: 'FAQ',
      news: 'News',
    },
    quickLinks: [
      { label: 'Visum Intensiv', query: 'visum intensivkurs' },
      { label: 'telc B2 Termine', query: 'telc b2 termine' },
      { label: 'Gastfamilie', query: 'gastfamilie' },
    ],
  },
} as const;

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function UnifiedSearchPanel({ locale, defaultScope = 'all', className }: UnifiedSearchPanelProps) {
  const dictionary = copy[locale];
  const [scope, setScope] = useState<UnifiedSearchScope>(defaultScope);
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return (
    <section data-reveal="true" className={cn('rounded-xl border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6', className)}>
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--casa-ink)] md:text-2xl">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
          <Search className="h-4 w-4" aria-hidden="true" />
        </span>
        {dictionary.title}
      </h2>

      <form action="/search" method="get" className="mt-4 flex flex-col gap-3 sm:gap-2">
        <label htmlFor="unified-search-query" className="sr-only">
          {dictionary.inputLabel}
        </label>
        <input type="hidden" name="scope" value={scope} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="unified-search-query"
            type="search"
            name="q"
            placeholder={dictionary.placeholder}
            autoComplete="off"
            enterKeyHint="search"
            className="h-11 w-full rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-3 text-sm text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
          />
          <label htmlFor="unified-search-scope" className="sr-only">
            {dictionary.scopeLabel}
          </label>
          {hydrated ? (
            <Select value={scope} onValueChange={(value) => setScope(value as UnifiedSearchScope)}>
              <SelectTrigger
                id="unified-search-scope"
                aria-label={dictionary.scopeLabel}
                className="h-11 w-full rounded-xl border-[color:var(--casa-sand)] bg-white text-sm font-medium text-[var(--casa-ink)] sm:w-48"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{dictionary.scopes.all}</SelectItem>
                <SelectItem value="courses">{dictionary.scopes.courses}</SelectItem>
                <SelectItem value="exams">{dictionary.scopes.exams}</SelectItem>
                <SelectItem value="faq">{dictionary.scopes.faq}</SelectItem>
                <SelectItem value="news">{dictionary.scopes.news}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <select
              id="unified-search-scope"
              aria-label={dictionary.scopeLabel}
              value={scope}
              onChange={(event) => setScope(event.target.value as UnifiedSearchScope)}
              className="h-11 w-full rounded-xl border border-[color:var(--casa-sand)] bg-white px-3 text-sm font-medium text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] sm:w-48"
            >
              <option value="all">{dictionary.scopes.all}</option>
              <option value="courses">{dictionary.scopes.courses}</option>
              <option value="exams">{dictionary.scopes.exams}</option>
              <option value="faq">{dictionary.scopes.faq}</option>
              <option value="news">{dictionary.scopes.news}</option>
            </select>
          )}
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl casa-button-prism bg-[var(--casa-ink-deep)] px-5 text-sm font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)] sm:min-w-[120px]"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {dictionary.submit}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {dictionary.quickLinks.map((chip) => (
          <a
            key={chip.label}
            href={`/search?q=${encodeURIComponent(chip.query)}&scope=all`}
            className="rounded-full border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/36 px-2.5 py-1 text-[11px] font-semibold text-[var(--casa-muted)] transition-colors hover:border-[var(--casa-blue)]/30 hover:bg-[var(--casa-blue)]/8 hover:text-[var(--casa-ink)]"
          >
            {chip.label}
          </a>
        ))}
      </div>
    </section>
  );
}
