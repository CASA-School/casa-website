'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import ui from './offers.module.css';

function useDismiss(open: boolean, close: () => void, wrap: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, close, wrap]);
}

/**
 * Something on the offer page that opens a panel when clicked — a fact in
 * the head, a row of what is included. The panel has a head (the thing's
 * colour and name), the few controls for that one thing, and a foot; Escape
 * or a click elsewhere closes it, and every change is already saved.
 */
export function ClickPanel({
  label,
  subtitle,
  icon,
  children,
  body,
  foot,
  disabled,
  className,
  openClassName,
  wide,
  block,
}: {
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  /** What is shown, and clicked. */
  children: ReactNode;
  body: (close: () => void) => ReactNode;
  foot?: (close: () => void) => ReactNode;
  disabled?: boolean;
  className: string;
  openClassName?: string;
  wide?: boolean;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss(open, close, wrap);

  if (disabled) return block ? <div className={className}>{children}</div> : <span className={className}>{children}</span>;

  return (
    <div ref={wrap} className={ui.anchor} style={{ display: block ? 'block' : 'inline-block' }}>
      <button type="button" className={`${className} ${open && openClassName ? openClassName : ''}`} aria-expanded={open} aria-label={`${label}: change`} onClick={() => setOpen((v) => !v)}>
        {children}
      </button>
      {open ? (
        <div className={`${ui.pop} ${wide ? ui.popWide : ''}`} role="dialog" aria-label={label}>
          <div className={ui.popHead}>
            {icon}
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{label}</b>
              {subtitle ? <span className={ui.popSub}>{subtitle}</span> : null}
            </span>
          </div>
          <div className={ui.popBody}>{body(close)}</div>
          <div className={ui.popFoot}>
            <span>{foot ? foot(close) : null}</span>
            <button type="button" className={ui.primary} style={{ height: 34 }} onClick={close}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A small menu of actions, behind "⋯". */
export function MoreMenu({ items }: { items: { label: string; onSelect: () => void; danger?: boolean; rule?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss(open, close, wrap);
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
