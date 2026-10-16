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
  exclude,
}: {
  href: string;
  icon: ReactNode;
  /** Shown as the browser tooltip — the label, for when the rail is icons only. */
  title?: string;
  children: ReactNode;
  /** Nested destinations under this one. */
  items?: { href: string; label: string }[];
  /** Current only on its own path. */
  exact?: boolean;
  /** Paths under this one that are their own item: Courses is `/admin/catalogue`, and Exams lives under it. */
  exclude?: readonly string[];
}) {
  const pathname = usePathname();
  const active = (exact ? pathname === href : isCurrent(pathname, href)) && !exclude?.some((path) => isCurrent(pathname, path));
  const childCurrent = items?.some((i) => isCurrent(pathname, i.href)) ?? false;
  const branchOpen = active || childCurrent;
  // One highlight on the screen: the item you are on. A parent whose child is
  // current reads as the branch (white text), not as a second filled row.
  const here = active && !childCurrent;

  return (
    <div className="shrink-0">
      <Link
        href={href}
        title={title}
        aria-current={here ? 'page' : undefined}
        className={cn(
          'group relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[0.85rem] whitespace-nowrap transition-colors duration-150 lg:overflow-hidden',
          'outline-none focus-visible:ring-2 focus-visible:ring-white/40',
          here
            ? 'bg-white/[0.1] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
            : branchOpen
              ? 'font-semibold text-white hover:bg-white/[0.06]'
              : 'font-medium text-white/68 hover:bg-white/[0.06] hover:text-white'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'shrink-0 transition-colors duration-150 [&_svg]:size-[17px]',
            here ? 'text-[#8fd6ff]' : branchOpen ? 'text-white/85' : 'text-white/42 group-hover:text-white/80'
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
              'hidden text-white/40 transition duration-150 lg:inline',
              branchOpen ? 'rotate-90 opacity-70' : 'opacity-0 group-hover:opacity-100'
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
          className="mt-0.5 mb-1.5 ml-[1.2rem] hidden space-y-0.5 border-l border-white/[0.1] pl-2.5 lg:block"
        >
          {items.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'flex h-7 items-center gap-2 rounded-lg px-2.5 text-[0.82rem] transition-colors duration-150',
                    'outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                    current
                      ? 'bg-white/[0.1] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                      : 'font-medium text-white/55 hover:bg-white/[0.05] hover:text-white'
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
        className="group/label mt-5 mb-1 hidden w-full items-center justify-between rounded-md px-2.5 py-0.5 text-[0.72rem] font-semibold tracking-[0.02em] text-white/38 transition-colors hover:text-white/70 lg:flex"
      >
        {label}
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={cn('h-2.5 w-2.5 opacity-0 transition group-hover/label:opacity-100', open ? '' : '-rotate-90 opacity-100')}
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
