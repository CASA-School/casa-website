'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * A panel that opens from a field — a date picker's calendar — drawn above the page instead of inside
 * it, so no card, collapsible section or dialog that hides its overflow can cut it off (2026-10-17).
 *
 * It is portalled into the dialog the field sits in, when it sits in one: the dialog then still counts
 * a click in the panel as inside, and keeps focus in it. Elsewhere it goes to the body. It is placed
 * with fixed coordinates under the field, or above it when the window has more room there, kept on
 * screen, and follows the field when anything scrolls. Not for panels whose buttons submit the form
 * they open from (`Popover`): outside the form's element they would no longer belong to it.
 */
export function Floating({
  anchor,
  children,
  className,
  panelRef,
  role,
  label,
  gap = 8,
  estimate = 360,
}: {
  /** The field the panel belongs to. */
  anchor: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  /** For a click-outside check: the panel's element. */
  panelRef?: RefObject<HTMLDivElement | null>;
  role?: string;
  label?: string;
  gap?: number;
  /** The panel's usual height, to decide between below and above before it is measured. */
  estimate?: number;
}) {
  const own = useRef<HTMLDivElement>(null);
  const panel = panelRef ?? own;
  const [placed, setPlaced] = useState<{ host: HTMLElement; style: CSSProperties } | null>(null);

  useLayoutEffect(() => {
    let frame = 0;
    const place = () => {
      const field = anchor.current;
      if (!field) return;
      const host = field.closest<HTMLElement>('[data-slot="dialog-content"]') ?? document.body;
      const box = field.getBoundingClientRect();
      // A transformed host (a dialog mid-animation) is the containing block of a fixed element.
      const computed = getComputedStyle(host);
      const contained = host !== document.body && (computed.transform !== 'none' || computed.filter !== 'none');
      const origin = contained ? host.getBoundingClientRect() : { left: 0, top: 0, bottom: window.innerHeight };
      const width = panel.current?.offsetWidth ?? 0;
      const height = panel.current?.offsetHeight || estimate;
      const below = window.innerHeight - box.bottom;
      const up = below < height + gap && box.top > below;
      const left = Math.max(8, Math.min(box.left, window.innerWidth - width - 8));
      setPlaced({
        host,
        style: {
          position: 'fixed',
          zIndex: 1050,
          left: left - origin.left,
          ...(up ? { bottom: origin.bottom - box.top + gap } : { top: box.bottom + gap - origin.top }),
          // Hidden until its own size is known and it can be kept on screen.
          visibility: panel.current ? 'visible' : 'hidden',
        },
      });
      // Measured only once drawn: place it again then.
      if (!panel.current || !panel.current.offsetWidth) frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    document.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [anchor, panel, gap, estimate]);

  if (!placed) return null;
  return createPortal(
    <div ref={panel} role={role} aria-label={label} className={className} style={placed.style} data-menu-host="">
      {children}
    </div>,
    placed.host
  );
}
