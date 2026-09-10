'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

/**
 * Collapses the sidebar to icons.
 *
 * The state lives on `<html data-workspace-nav>` and the collapsing itself is
 * CSS in `globals.css`. That is deliberate: the rail's links and groups are
 * server-rendered, and threading a "collapsed" prop through every one of them
 * — or wrapping the whole shell in a context provider — would make a dozen
 * components care about a piece of chrome. A data attribute and descendant
 * selectors let them stay ignorant.
 *
 * `src/app/(admin)/layout.tsx` sets the attribute before first paint from the
 * same localStorage key, so a colleague who works collapsed does not watch the
 * rail fold itself on every navigation.
 */

const KEY = 'casa-workspace-nav';
const EVENT = 'casa-workspace-nav-change';

export function SidebarToggle() {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const collapsed = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.workspaceNav === 'collapsed',
    () => false
  );

  const toggle = () => {
    const next = collapsed ? 'expanded' : 'collapsed';
    document.documentElement.dataset.workspaceNav = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Private window or blocked storage: it still toggles for this session.
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={collapsed}
      title={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
      className={cn(
        'hidden w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
        'text-ws-on-panel-muted transition-colors hover:bg-white/6 hover:text-ws-on-panel',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-marker)]/70 lg:flex'
      )}
    >
      <span aria-hidden="true" className="shrink-0">
        <svg
          viewBox="0 0 16 16"
          className={cn('h-4 w-4 transition-transform', collapsed ? 'rotate-180' : '')}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2.5" width="12" height="11" rx="1.4" />
          <path d="M6.25 2.5v11" />
          <path d="m11.5 6.25-1.75 1.75 1.75 1.75" />
        </svg>
      </span>
      <span data-nav-label>{collapsed ? 'Expand' : 'Collapse'}</span>
    </button>
  );
}
