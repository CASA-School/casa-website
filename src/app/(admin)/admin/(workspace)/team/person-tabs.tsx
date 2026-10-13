'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The sections of one person's dialog, one at a time.
 *
 * Every panel stays mounted and is only hidden (`inert`, invisible), so a
 * half-typed field survives a look at another tab. The panels are
 * server-rendered forms; this only chooses which one shows. The strip is the
 * registration tabs' segmented look.
 */
export function PersonTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: readonly { id: string; label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`${base}-tab-${next.id}`)?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex gap-0.5 rounded-xl border border-ws-line bg-white p-1"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${base}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'inline-flex h-[30px] items-center rounded-lg px-3.5 text-[0.8rem] font-bold transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                selected
                  ? 'bg-[var(--casa-ink-deep)] text-white'
                  : 'text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {/* Stacked in one grid cell, so the dialog keeps the height of its
          tallest panel and the tabs never move under the pointer. */}
      <div className="grid pt-5">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`${base}-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`${base}-tab-${tab.id}`}
            inert={tab.id !== active}
            className={cn('[grid-area:1/1]', tab.id !== active && 'invisible')}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
