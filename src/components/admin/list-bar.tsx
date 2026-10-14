'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from './icons';
import { useWsLang } from './lang';

export type ListTab = { key: string; label: string; href: string; count?: number };

/** The top of a list's card: its views on the left, its search on the right. */
export function ListBar({
  tabs,
  active,
  summary,
  search,
}: {
  tabs?: readonly ListTab[];
  active?: string;
  /** For a list without views: what it holds, in a few words ("18 students"), where the tabs would be. */
  summary?: ReactNode;
  search?: {
    action: string;
    value?: string;
    placeholder: string;
    /** Params the search keeps, the current view among them. */
    keep?: Record<string, string | undefined>;
  };
}) {
  const { t } = useWsLang();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-ws-line px-5">
      {tabs?.length ? (
        <nav aria-label={t('Ansichten', 'Views')} className="-mb-px flex max-w-full gap-5 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => {
            const on = tab.key === active;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'inline-flex h-12 shrink-0 items-center gap-1.5 border-b-2 text-[0.84rem] font-semibold whitespace-nowrap transition-colors outline-none',
                  'focus-visible:text-[var(--casa-ink)] focus-visible:underline',
                  on
                    ? 'border-[var(--casa-ink-deep)] text-[var(--casa-ink)]'
                    : 'border-transparent text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                )}
              >
                {tab.label}
                {tab.count ? (
                  <span className={cn('text-xs font-semibold tabular-nums', on ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-text-subtle)]')}>
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      ) : summary ? (
        <p className="py-3.5 text-[0.84rem] font-semibold text-[var(--casa-muted)]">{summary}</p>
      ) : (
        <span />
      )}
      {search ? (
        <form action={search.action} role="search" className="relative w-full py-2 sm:w-64">
          {Object.entries(search.keep ?? {}).map(([name, value]) =>
            value ? <input key={name} type="hidden" name={name} value={value} /> : null
          )}
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--casa-text-subtle)] [&_svg]:h-4 [&_svg]:w-4">
            {Icon.search}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={search.value ?? ''}
            placeholder={search.placeholder}
            aria-label={t('Suchen', 'Search')}
            className="h-8 w-full rounded-lg border border-transparent bg-ws-sunk/80 pr-3 pl-8 text-[0.84rem] font-medium text-[var(--casa-ink)] transition-colors outline-none placeholder:font-normal placeholder:text-[var(--casa-text-subtle)] hover:bg-ws-sunk focus:border-[var(--casa-blue)] focus:bg-white focus:ring-[3px] focus:ring-[var(--casa-blue)]/20"
          />
        </form>
      ) : null}
    </div>
  );
}
