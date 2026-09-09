'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The sidebar's navigation pieces — the only client code in the shell.
 *
 * `NavLink` knows whether it is the current page (that needs the pathname).
 * A link with `children` is a parent: its children are nested one level in
 * and shown while the parent or any child is current, so the rail shows the
 * branch you are on and folds the others.
 *
 * `NavGroup` is a collapsible section. It opens itself when a link inside is
 * current, remembers a manual open/close per group in localStorage, and reads
 * as a heading when the sidebar is a horizontal strip on a phone.
 *
 * `/admin` is matched exactly. Every other workspace route starts with it, so a
 * prefix test would light Overview up on every single screen.
 */

const isCurrent = (pathname: string, href: string) =>
  href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export function NavLink({
  href,
  icon,
  badge,
  children,
  items,
}: {
  href: string;
  icon: ReactNode;
  /** A count worth interrupting for. Rendered only when above zero. */
  badge?: number;
  children: ReactNode;
  /** Nested destinations under this one. */
  items?: { href: string; label: string; badge?: number }[];
}) {
  const pathname = usePathname();
  const active = isCurrent(pathname, href);
  const branchOpen = active || (items?.some((i) => isCurrent(pathname, i.href)) ?? false);

  return (
    <div className="shrink-0">
      <Link
        href={href}
        aria-current={
          active && !items?.some((i) => isCurrent(pathname, i.href)) ? 'page' : undefined
        }
        className={cn(
          'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm whitespace-nowrap transition-colors',
          'outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-marker)]/70',
          active
            ? 'bg-white/10 font-semibold text-ws-on-panel'
            : 'text-ws-on-panel-muted hover:bg-white/6 hover:text-ws-on-panel'
        )}
      >
        {/* CASA's sun, and the only saturated warm note on the panel. One accent,
            used once, so "you are here" registers before the label is read. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 -left-2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-ws-marker transition-opacity',
            active ? 'opacity-100' : 'opacity-0'
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'shrink-0 transition-colors',
            active ? 'text-ws-marker' : 'text-ws-on-panel-muted group-hover:text-ws-on-panel'
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">{children}</span>
        <Count value={badge} />
        {items && items.length > 0 ? (
          <span
            aria-hidden="true"
            className={cn(
              'hidden text-ws-on-panel-muted/70 transition-transform lg:inline',
              branchOpen ? 'rotate-90' : ''
            )}
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 3.5 4.5 4.5L6 12.5" />
            </svg>
          </span>
        ) : null}
      </Link>

      {items && items.length > 0 && branchOpen ? (
        <ul className="mt-0.5 hidden space-y-0.5 border-l border-white/10 pl-3 ml-[1.15rem] lg:block">
          {items.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8rem] transition-colors',
                    'outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-marker)]/70',
                    current
                      ? 'font-semibold text-ws-on-panel'
                      : 'text-ws-on-panel-muted hover:text-ws-on-panel'
                  )}
                >
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <Count value={item.badge} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function Count({ value }: { value?: number }) {
  if (!value || value <= 0) return null;
  return (
    <span className="flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-[var(--casa-accent-surface)] px-1.5 text-[0.65rem] font-bold text-white">
      {value > 99 ? '99+' : value}
    </span>
  );
}

const STORAGE_PREFIX = 'casa-workspace-nav:';
const CHANGE_EVENT = 'casa-workspace-nav-change';

function readStored(id: string): 'open' | 'closed' | null {
  try {
    const value = window.localStorage.getItem(STORAGE_PREFIX + id);
    return value === 'open' || value === 'closed' ? value : null;
  } catch {
    return null;
  }
}

function writeStored(id: string, value: 'open' | 'closed') {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + id, value);
  } catch {
    /* private mode or blocked storage: the group still toggles for this render */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function NavGroup({
  id,
  label,
  hrefs,
  children,
}: {
  id: string;
  label: string;
  /** Route prefixes of everything inside; the group opens when one is current. */
  hrefs: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const containsCurrent = hrefs.some((h) => isCurrent(pathname, h));
  // The remembered state lives in localStorage; on the server (and the first
  // client render) it is unknown, which reads as "open".
  const stored = useSyncExternalStore(
    subscribe,
    () => readStored(id),
    () => null
  );

  const open = containsCurrent || stored !== 'closed';

  function toggle() {
    writeStored(id, open ? 'closed' : 'open');
  }

  return (
    <div className="contents lg:block">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`nav-group-${id}`}
        className="mt-5 mb-1 hidden w-full items-center justify-between rounded-md px-2.5 py-1 text-[0.56rem] font-bold tracking-[0.2em] uppercase text-ws-on-panel-muted/70 transition-colors hover:text-ws-on-panel-muted lg:flex"
      >
        {label}
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={cn('h-2.5 w-2.5 transition-transform', open ? '' : '-rotate-90')}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3.5 6 4.5 4.5L12.5 6" />
        </svg>
      </button>
      <div
        id={`nav-group-${id}`}
        className={cn('contents lg:block lg:space-y-0.5', open ? '' : 'lg:hidden')}
      >
        {children}
      </div>
    </div>
  );
}
