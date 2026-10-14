'use client';

import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from './icons';
import { useWsLang } from './lang';

export type ListTab = { key: string; label: string; href: string; count?: number };

type ListSearchProps = {
  action: string;
  value?: string;
  placeholder: string;
  /** Params the search keeps, the current view among them. */
  keep?: Record<string, string | undefined>;
};

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
  search?: ListSearchProps;
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
      {search ? <ListSearch {...search} /> : null}
    </div>
  );
}

/**
 * A list's search: a magnifier until it is wanted (Rahman, 2026-10-14: "use
 * search icon so it is not taking a lot of space"), then a field that opens
 * beside it. It stays open while a search is in force, with a cross that clears
 * it; empty, it folds back on Escape or when the focus leaves it. Enter submits.
 */
function ListSearch({ action, value, placeholder, keep }: ListSearchProps) {
  const { t } = useWsLang();
  const applied = Boolean(value);
  const [open, setOpen] = useState(applied);
  const input = useRef<HTMLInputElement>(null);
  const kept = Object.entries(keep ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]));
  const cleared = `${action}${kept.length ? `?${new URLSearchParams(kept)}` : ''}`;

  const fold = () => {
    if (!applied && !input.current?.value) setOpen(false);
  };

  return (
    <form
      action={action}
      role="search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) fold();
      }}
      className={cn(
        'relative my-2 flex h-9 items-center rounded-full transition-[width,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none',
        open
          ? 'w-full bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-ws-line ring-inset focus-within:ring-2 focus-within:ring-[var(--casa-blue)]/35 sm:w-64'
          : 'w-9'
      )}
    >
      {kept.map(([name, held]) => (
        <input key={name} type="hidden" name={name} value={held} />
      ))}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => input.current?.focus());
        }}
        tabIndex={open ? -1 : 0}
        aria-label={t('Suchen', 'Search')}
        aria-expanded={open}
        title={t('Suchen', 'Search')}
        className={cn(
          'absolute left-0 grid size-9 shrink-0 place-items-center rounded-full text-[var(--casa-muted)] transition-colors outline-none [&_svg]:size-4',
          open ? 'pointer-events-none' : 'hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40'
        )}
      >
        {Icon.search}
      </button>
      <input
        ref={input}
        type="search"
        name="q"
        defaultValue={value ?? ''}
        placeholder={placeholder}
        aria-label={t('Suchen', 'Search')}
        tabIndex={open ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !e.currentTarget.value) {
            e.currentTarget.blur();
            setOpen(false);
          }
        }}
        className={cn(
          'h-full w-full min-w-0 bg-transparent pr-9 pl-9 text-[0.84rem] font-medium text-[var(--casa-ink)] outline-none placeholder:font-normal placeholder:text-[var(--casa-text-subtle)] [&::-webkit-search-cancel-button]:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      {applied ? (
        <Link
          href={cleared}
          aria-label={t('Suche löschen', 'Clear the search')}
          title={t('Suche löschen', 'Clear the search')}
          className="absolute right-1.5 grid size-6 place-items-center rounded-full text-[var(--casa-text-subtle)] transition-colors outline-none hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-3"
        >
          {Icon.close}
        </Link>
      ) : null}
    </form>
  );
}
