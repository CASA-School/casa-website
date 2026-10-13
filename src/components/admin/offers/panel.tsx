'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import ui from './offers.module.css';

/**
 * A plain value that opens a small panel when clicked — how everything on the
 * offer page is changed. Escape or a click elsewhere closes it; what was
 * changed is already saved.
 */
export function ClickPanel({
  label,
  children,
  panel,
  disabled,
  align = 'left',
  width,
  as = 'span',
  className,
}: {
  label: string;
  children: ReactNode;
  panel: (close: () => void) => ReactNode;
  disabled?: boolean;
  align?: 'left' | 'right';
  width?: number;
  as?: 'span' | 'row';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
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

  if (disabled) return as === 'row' ? <div className={className}>{children}</div> : <span>{children}</span>;

  const close = () => setOpen(false);
  return (
    <div ref={wrap} className={ui.anchor} style={as === 'row' ? { display: 'block' } : undefined}>
      <button
        type="button"
        className={as === 'row' ? `${className ?? ''} ${open ? ui.itemOpen : ''}` : `${ui.editable} ${open ? ui.editableOpen : ''}`}
        style={as === 'span' ? { border: 0, background: open ? undefined : 'transparent', font: 'inherit', color: 'inherit', textAlign: 'left' } : undefined}
        aria-expanded={open}
        aria-label={as === 'row' ? undefined : `${label}: change`}
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>
      {open ? (
        <div className={`${ui.panel} ${align === 'right' ? ui.panelRight : ''}`} style={width ? { width } : undefined} role="dialog" aria-label={label}>
          <div className={ui.panelHead}>
            <span>{label}</span>
            <button type="button" className={ui.done} onClick={close}>
              Done
            </button>
          </div>
          <div className={ui.panelBody}>{panel(close)}</div>
        </div>
      ) : null}
    </div>
  );
}

/** A small menu of actions, behind "⋯". */
export function MoreMenu({ items }: { items: { label: string; onSelect: () => void; danger?: boolean; rule?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]);
  if (items.length === 0) return null;
  return (
    <div ref={wrap} className={ui.menuWrap}>
      <button type="button" className={ui.ghost} aria-label="More" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        ⋯
      </button>
      {open ? (
        <div className={ui.menu} role="menu">
          {items.map((item, i) => (
            <div key={i}>
              {item.rule ? <div className={ui.menuRule} /> : null}
              <button
                type="button"
                role="menuitem"
                className={`${ui.menuItem} ${item.danger ? ui.menuDanger : ''}`}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
