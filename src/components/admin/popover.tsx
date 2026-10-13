'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * A value that opens a small panel when clicked — the offers module's way of
 * changing one thing (docs/OFFERS.md §Design), for the rest of the workspace.
 *
 * The panel's content is server-rendered and usually a form: its choices are
 * submit buttons carrying the field's name and value, so the server action
 * receives exactly what a select would have sent. A submit inside closes it;
 * so do Escape and a click elsewhere. Near the foot of the window it opens
 * upwards.
 */
export function Popover({
  label,
  trigger,
  children,
  width = 300,
  align = 'left',
  disabled,
}: {
  /** The panel's heading, and the trigger's accessible name. */
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  width?: number;
  /** Which edge the panel lines up with: `right` for a value near the right of the screen. */
  align?: 'left' | 'right';
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  if (disabled) return <div>{trigger}</div>;

  const toggle = () => {
    const box = wrap.current?.getBoundingClientRect();
    if (!open && box) setUp(window.innerHeight - box.bottom < 320 && box.top > window.innerHeight - box.bottom);
    setOpen((v) => !v);
  };

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${label}: change`}
        onClick={toggle}
        className={cn(
          'block w-full rounded-lg text-left transition-colors outline-none hover:bg-[#f6f9fc] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
          open && 'bg-[#f6f9fc]'
        )}
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          style={{ width }}
          onSubmitCapture={() => setTimeout(() => setOpen(false), 0)}
          className={cn(
            'absolute z-40 max-w-[calc(100vw-2rem)]',
            align === 'right' ? 'right-0' : 'left-0',
            'overflow-hidden rounded-xl bg-white text-sm shadow-[0_24px_56px_-22px_rgba(15,23,42,0.42),0_0_0_1px_rgba(15,23,42,0.08)]',
            up ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
          )}
        >
          <p className="border-b border-ws-line-soft px-3.5 py-2.5 text-xs font-bold text-[var(--casa-muted)]">{label}</p>
          <div className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

/** One choice in a panel: a submit button carrying the field's value. */
export function PopoverChoice({
  name,
  value,
  current,
  children,
}: {
  name: string;
  value: string;
  current: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      aria-pressed={current}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
        current ? 'bg-[#e3f4fc] text-[#075985]' : 'text-[var(--casa-ink)] hover:bg-ws-sunk'
      )}
    >
      <span className="min-w-0">{children}</span>
      {current ? <span aria-hidden="true">✓</span> : null}
    </button>
  );
}
