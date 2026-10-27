'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

/**
 * A record page in tabs (2026-10-16, Rahman: "the most important information in the first tab").
 *
 * The record's head stays put — the name, how to reach them, the figures — and under it a strip of
 * tabs, each a category of the record: the first is what a colleague needs most, the rest are a
 * click away instead of a long scroll. Built for every person-like record: learners now, teachers,
 * staff and organisations as their pages arrive.
 *
 * `RecordTabs` holds which tab is open and wraps the page; `RecordTabList` is the strip, placed in
 * `RecordHeader`'s `tabs` slot so it sits on the head's lower edge; each `RecordTabPanel` is one
 * tab's content. Every panel is server-rendered and stays mounted, only hidden, so switching is
 * instant and a half-typed note survives a look elsewhere. The open tab is kept in the address
 * (`?tab=`), so a reload, a shared link or a form that returns to the page lands on the same tab.
 */

export type RecordTab = { id: string; label: string; icon?: ReactNode; count?: number };

type TabsState = { tabs: readonly RecordTab[]; active: string; select: (id: string) => void; base: string };

const TabsContext = createContext<TabsState | null>(null);

// The tab a form was sent from, by record address. A save redirects to the record's plain address
// and the page comes back new; this puts it back on the tab the colleague was working in. Memory
// only, for this visit, and read once.
const returning = new Map<string, string>();

function useTabs(): TabsState {
  const state = useContext(TabsContext);
  if (!state) throw new Error('RecordTabs missing');
  return state;
}

export function RecordTabs({
  tabs,
  initial,
  children,
}: {
  tabs: readonly RecordTab[];
  /** The tab named in the address, read on the server. */
  initial?: string;
  children: ReactNode;
}) {
  const base = useId();
  const first = tabs[0]?.id ?? '';
  const known = (id: string | null | undefined) => (id && tabs.some((tab) => tab.id === id) ? id : null);
  const [active, setActive] = useState(
    () => known(initial) ?? (typeof window === 'undefined' ? null : known(returning.get(window.location.pathname))) ?? first
  );
  useEffect(() => {
    returning.delete(window.location.pathname);
  }, []);

  // Kept in the address without a navigation: the server has every panel already.
  const writeAddress = useCallback(
    (id: string) => {
      const url = new URL(window.location.href);
      if (id === first) url.searchParams.delete('tab');
      else url.searchParams.set('tab', id);
      url.searchParams.delete('error');
      window.history.replaceState(window.history.state, '', url);
    },
    [first]
  );

  const select = useCallback(
    (id: string) => {
      setActive(id);
      writeAddress(id);
    },
    [writeAddress]
  );

  // A form on another tab returns to the record's plain address; put the tab back into it.
  useEffect(() => {
    if (active !== first && new URL(window.location.href).searchParams.get('tab') !== active) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', active);
      window.history.replaceState(window.history.state, '', url);
    }
  });

  return (
    <TabsContext.Provider value={{ tabs, active, select, base }}>
      {/* A submit anywhere on the record, dialogs included (React events follow the tree through portals). */}
      <div className="contents" onSubmitCapture={() => returning.set(window.location.pathname, active)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/** The strip of tabs: icon, label and a count where one helps; a line slides under the open one. */
export function RecordTabList({ label }: { label: string }) {
  const { tabs, active, select, base } = useTabs();
  const listRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const tab = list.querySelector<HTMLElement>(`[data-tab="${active}"]`);
      if (tab) setLine({ left: tab.offsetLeft, width: tab.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [active]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    select(tabs[next].id);
    document.getElementById(`${base}-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className="relative -mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={`${base}-tab-${tab.id}`}
            data-tab={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'group relative inline-flex h-12 shrink-0 items-center gap-2 px-3 text-[0.875rem] font-semibold whitespace-nowrap transition-colors',
              'rounded-t-lg outline-none focus-visible:bg-ws-card-head focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30 focus-visible:ring-inset',
              // The open tab in FileMaker's navy over its line, the others lit on hover: navigation, not a row of
              // labels (2026-10-27). One weight for all, so choosing a tab never shifts the ones after it.
              selected ? 'text-[var(--fm-navy)]' : 'text-[var(--casa-muted)] hover:bg-ws-card-head hover:text-[var(--casa-ink)]'
            )}
          >
            {tab.icon ? (
              <span className={cn('transition-colors', selected ? 'text-[var(--fm-navy)]' : 'text-[#94a1b3] group-hover:text-[var(--casa-muted)]')}>
                {tab.icon}
              </span>
            ) : null}
            {tab.label}
            {tab.count ? (
              <span
                className={cn(
                  'inline-flex min-w-5 justify-center rounded-full px-1.5 py-px text-[0.7rem] font-bold tabular-nums transition-colors',
                  selected ? 'bg-[var(--fm-navy)] text-white' : 'bg-ws-sunk text-[var(--casa-muted)]'
                )}
              >
                {tab.count}
              </span>
            ) : null}
            {/* Without the sliding line (before it is measured), the open tab carries its own. */}
            {selected && !line ? <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-[var(--fm-navy)]" /> : null}
          </button>
        );
      })}
      {line ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-full bg-[var(--fm-navy)] transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ width: line.width - 16, transform: `translateX(${line.left + 8}px)` }}
        />
      ) : null}
    </div>
  );
}

/** One tab's content. Hidden, not unmounted, when another tab is open. */
export function RecordTabPanel({ id, children }: { id: string; children: ReactNode }) {
  const { active, base } = useTabs();
  const selected = id === active;
  return (
    <div
      id={`${base}-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`${base}-tab-${id}`}
      hidden={!selected}
      className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
    >
      {children}
    </div>
  );
}

/** A link to another tab of the same record, such as „Alle anzeigen" under the overview's short list. */
export function RecordTabLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const { select, base } = useTabs();
  return (
    <button
      type="button"
      onClick={() => {
        select(to);
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.getElementById(`${base}-tab-${to}`)?.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
      }}
      className={cn(
        'inline-flex items-center gap-1 text-[0.8rem] font-semibold text-[var(--casa-accent-text)] outline-none hover:text-[var(--casa-accent-text-hover)] focus-visible:underline',
        className
      )}
    >
      {children}
    </button>
  );
}
