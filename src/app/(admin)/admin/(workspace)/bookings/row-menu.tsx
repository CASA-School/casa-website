'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { menuPanel } from '@/components/admin/choice-menu';
import { cn } from '@/lib/utils';

/**
 * A ledger line's actions behind „…" (2026-10-20): removing a cost line, voiding a payment. The line
 * stays one line; what can be done to it opens beside its amount.
 *
 * The items are the page's own forms, drawn on the server, each with its `ConfirmSubmit`. Choosing one
 * closes the menu and opens that confirmation, which has to outlive the menu it came from: so the panel
 * is hidden when closed, never taken away, and the form it holds is the one confirming submits.
 * Escape, a click elsewhere or leaving it with Tab close it; near the foot of the window it opens upwards.
 * The card it sits in must not clip it (`overflow="visible"`).
 */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
    const down = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const toggle = () => {
    const box = wrap.current?.getBoundingClientRect();
    if (!open && box) setUp(window.innerHeight - box.bottom < 140 && box.top > window.innerHeight - box.bottom);
    setOpen((v) => !v);
  };

  return (
    <div
      ref={wrap}
      className="relative"
      onBlur={(e) => {
        if (open && !wrap.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        className={cn(
          'grid size-6 place-items-center rounded-md text-[var(--casa-muted)] transition-colors outline-none hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
          open && 'bg-ws-sunk text-[var(--casa-ink)]'
        )}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-4">
          <circle cx="3.5" cy="8" r="1.25" />
          <circle cx="8" cy="8" r="1.25" />
          <circle cx="12.5" cy="8" r="1.25" />
        </svg>
      </button>
      <div
        id={id}
        ref={panel}
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest('button')) setOpen(false);
        }}
        className={cn(
          menuPanel,
          'absolute right-0 z-30 min-w-44 border',
          // Each item is a form with its confirm button: a full-width line, as a menu's items are.
          '[&_[data-dialog=confirm]]:h-auto [&_[data-dialog=confirm]]:w-full [&_[data-dialog=confirm]]:justify-start [&_[data-dialog=confirm]]:px-2.5 [&_[data-dialog=confirm]]:py-2 [&_[data-dialog=confirm]]:text-[0.84rem] [&_[data-dialog=confirm]]:font-medium [&_[data-dialog=confirm]]:!text-[var(--casa-danger-text)]',
          up ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]',
          !open && 'hidden'
        )}
      >
        {children}
      </div>
    </div>
  );
}
