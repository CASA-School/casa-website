'use client';

import { useCallback, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from 'react';

import { useWsLang } from './lang';

/**
 * The sidebar's right edge, to drag (Rahman, 2026-11-01: „flexible that one could make it bigger or even
 * smaller until it collapses"). Wider or narrower between MIN and MAX; dragged under FOLD it folds to icons
 * — the same fold as `SidebarToggle`, `data-workspace-nav` on `<html>` — and dragged out again it unfolds.
 * A double click folds or unfolds; on the keyboard the arrows change the width, Enter folds.
 *
 * The width is `--ws-rail-w` on `<html>`, kept in localStorage and set before first paint by
 * `src/app/(admin)/layout.tsx`, as the fold is.
 */

const WIDTH_KEY = 'casa-workspace-nav-width';
const NAV_KEY = 'casa-workspace-nav';
const EVENT = 'casa-workspace-nav-change';
const MIN = 208;
const MAX = 360;
const FOLD = 150;
const DEFAULT = 248;
const STEP = 16;

const clamp = (px: number) => Math.round(Math.min(MAX, Math.max(MIN, px)));

function readWidth(): number {
  const value = parseInt(document.documentElement.style.getPropertyValue('--ws-rail-w'), 10);
  return Number.isFinite(value) ? clamp(value) : DEFAULT;
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private window or blocked storage: it still applies for this visit.
  }
}

function applyWidth(px: number, persist: boolean) {
  document.documentElement.style.setProperty('--ws-rail-w', `${px}px`);
  if (persist) store(WIDTH_KEY, String(px));
  window.dispatchEvent(new Event(EVENT));
}

function applyFolded(folded: boolean) {
  document.documentElement.dataset.workspaceNav = folded ? 'collapsed' : 'expanded';
  store(NAV_KEY, folded ? 'collapsed' : 'expanded');
  window.dispatchEvent(new Event(EVENT));
}

const isFolded = () => document.documentElement.dataset.workspaceNav === 'collapsed';

export function SidebarResizer() {
  const { t } = useWsLang();
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  const width = useSyncExternalStore(subscribe, () => (isFolded() ? 0 : readWidth()), () => DEFAULT);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const root = document.documentElement;
    const left = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
    let last = readWidth();
    root.dataset.railResizing = '';
    const move = (e: globalThis.PointerEvent) => {
      const x = e.clientX - left;
      if (x < FOLD) {
        if (!isFolded()) applyFolded(true);
        return;
      }
      if (isFolded()) applyFolded(false);
      last = clamp(x);
      applyWidth(last, false);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      delete root.dataset.railResizing;
      if (!isFolded()) applyWidth(last, true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      applyFolded(!isFolded());
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (isFolded()) {
        if (event.key === 'ArrowRight') applyFolded(false);
        return;
      }
      const next = readWidth() + (event.key === 'ArrowRight' ? STEP : -STEP);
      if (next < MIN) applyFolded(true);
      else applyWidth(clamp(next), true);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t('Breite der Seitenleiste', 'Sidebar width')}
      aria-valuemin={0}
      aria-valuemax={MAX}
      aria-valuenow={width}
      tabIndex={0}
      title={t('Ziehen für die Breite · Doppelklick klappt ein und aus', 'Drag for the width · double-click folds')}
      onPointerDown={onPointerDown}
      onDoubleClick={() => applyFolded(!isFolded())}
      onKeyDown={onKeyDown}
      className="group/resize absolute inset-y-0 -right-1.5 z-30 hidden w-3 cursor-col-resize touch-none outline-none lg:block"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-transparent transition-colors duration-200 group-hover/resize:bg-[#5cc2ff]/80 group-focus-visible/resize:bg-[#5cc2ff] group-active/resize:bg-[#5cc2ff]"
      />
    </div>
  );
}
