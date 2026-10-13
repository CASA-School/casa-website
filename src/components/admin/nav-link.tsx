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
  title,
  children,
  items,
  exact,
}: {
  href: string;
  icon: ReactNode;
  /** Shown as the browser tooltip — the label, for when the rail is icons only. */
  title?: string;
  children: ReactNode;
  /** Nested destinations under this one. */
  items?: { href: string; label: string }[];
  /** Current only on its own path: Courses is `/admin/catalogue`, and Exams lives under it. */
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : isCurrent(pathname, href);
  const branchOpen = active || (items?.some((i) => isCurrent(pathname, i.href)) ?? false);

  return (
    <div className="shrink-0">
      <Link
        href={href}
        title={title}
        aria-current={
          active && !items?.some((i) => isCurrent(pathname, i.href)) ? 'page' : undefined
        }
        className={cn(
          'group relative flex items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-[0.45rem] text-sm whitespace-nowrap transition-colors',
          'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
          active
            ? 'bg-[var(--fm-yellow)] font-bold text-[var(--fm-navy)]'
            : 'font-medium text-[var(--casa-muted)] hover:bg-ws-sunk/70 hover:text-[var(--casa-ink)]'
        )}
      >
        {/* "You are here": FileMaker's pale yellow cell with a navy edge. */}
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
            active ? 'text-[var(--fm-navy)]' : 'text-[var(--casa-text-subtle)] group-hover:text-[var(--casa-ink)]'
          )}
        >
          {icon}
        </span>
        <span data-nav-label className="min-w-0 flex-1">
          {children}
        </span>
        {items && items.length > 0 ? (
          <span
            aria-hidden="true"
            data-nav-label
            className={cn(
              'hidden text-[var(--casa-text-subtle)] transition-transform lg:inline',
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
        <ul
          data-nav-children
          className="mt-0.5 mb-1 hidden space-y-0.5 border-l border-ws-line pl-3 ml-[1.15rem] lg:block"
        >
          {items.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.8rem] transition-colors',
                    'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                    current
                      ? 'bg-[var(--fm-yellow)]/70 font-bold text-[var(--fm-navy)]'
                      : 'font-medium text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                  )}
                >
                  <span data-nav-label className="min-w-0 flex-1">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
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
        data-nav-group-label
        className="mt-4 mb-1 hidden w-full items-center justify-between rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--casa-text-subtle)] transition-colors hover:text-[var(--casa-ink)] lg:flex"
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
