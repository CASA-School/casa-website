'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

import { useWsLang } from './lang';

/**
 * Collapses the sidebar to icons.
 *
 * The state lives on `<html data-workspace-nav>` and the folding itself is CSS
 * in `globals.css`. That is deliberate: the rail's links and groups are
 * server-rendered, and threading a "collapsed" prop through every one of them
 * — or wrapping the whole shell in a context provider — would make a dozen
 * components care about a piece of chrome. A data attribute and descendant
 * selectors let them stay ignorant.
 *
 * It sits in the sidebar's head, beside the logo, and stays there when the
 * sidebar is folded to icons — the one thing in the head that does.
 *
 * `src/app/(admin)/layout.tsx` sets the attribute before first paint from the
 * same localStorage key, so a colleague who works collapsed does not watch the
 * rail fold itself on every navigation.
 */

const KEY = 'casa-workspace-nav';
const EVENT = 'casa-workspace-nav-change';

export function SidebarToggle() {
  const { t } = useWsLang();
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
      aria-label={collapsed ? t('Seitenleiste ausklappen', 'Expand the sidebar') : t('Seitenleiste einklappen', 'Collapse the sidebar')}
      title={collapsed ? t('Seitenleiste ausklappen', 'Expand the sidebar') : t('Seitenleiste einklappen', 'Collapse the sidebar')}
      className={cn(
        'hidden size-8 shrink-0 items-center justify-center rounded-lg text-white/50',
        'transition-colors hover:bg-white/[0.07] hover:text-white',
        'outline-none focus-visible:ring-2 focus-visible:ring-white/40 lg:flex'
      )}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2.5" width="12" height="11" rx="1.4" />
        <path d="M6.25 2.5v11" />
        <path d={collapsed ? 'm9.75 6.25 1.75 1.75-1.75 1.75' : 'm11.5 6.25-1.75 1.75 1.75 1.75'} />
      </svg>
    </button>
  );
}
