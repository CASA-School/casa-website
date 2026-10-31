'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

import { recordFromPath } from '@/lib/admin/record-href';

/**
 * Where a colleague came from (2026-10-27, Rahman: „improvement of page navigation between different
 * entities").
 *
 * The way back above a record („← Mitarbeitende") went to its module's list, wherever the colleague
 * had come from: a learner → their booking → its course → the teacher, and back from the teacher led
 * to the staff list, not to the course. Now the workspace keeps the pages of this visit as a trail —
 * a page opened again cuts the trail back to it, as the browser's own Back would — and the way back
 * names and opens the page before this one, with its filters. Opened fresh (a reload, a link from
 * elsewhere) there is no trail, and the way back is the module's list as before.
 *
 * In memory only, for the visit. What persists is „recently opened" for the search palette: the
 * kind and id of the last records opened, per colleague, in this browser — never a name; the server
 * reads them again, and only what the colleague may still open comes back.
 */

type Entry = { path: string; search: string; label: string | null };

const MAX_TRAIL = 40;
const MAX_RECENT = 12;
const RECENT_KEY = 'casa-ws-recent:';

let trail: Entry[] = [];
let pageLabels = new Map<string, string>();
let recentKey: string | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** What each page's head called it: a head can say so before the tracker has recorded the page. */
const named = new Map<string, string>();

/** A page was opened: the same page again (a tab, a filter, a form's redirect) keeps its place. */
function visit(path: string, search: string) {
  const at = trail.findLastIndex((e) => e.path === path);
  if (at >= 0) trail = [...trail.slice(0, at), { ...trail[at], search }];
  else trail = [...trail, { path, search, label: named.get(path) ?? pageLabels.get(path) ?? null }].slice(-MAX_TRAIL);
  emit();
}

function name(path: string, label: string) {
  named.set(path, label);
  if (named.size > MAX_TRAIL * 2) named.delete(named.keys().next().value!);
  const at = trail.findLastIndex((e) => e.path === path);
  if (at < 0 || trail[at].label === label) return;
  trail = trail.map((e, i) => (i === at ? { ...e, label } : e));
  emit();
}

/**
 * The page before this one. While a new page renders, the tracker has not recorded it yet, so the
 * last entry is where the colleague came from.
 */
function previous(path: string): Entry | null {
  const at = trail.findLastIndex((e) => e.path === path);
  const before = at >= 0 ? trail[at - 1] : trail.at(-1);
  return before && before.path !== path ? before : null;
}

/** The pages of this visit with their names, oldest first, the open one last: where a feedback was sent from (0112). */
export function trailSnapshot(limit = 8): { path: string; title: string }[] {
  return trail.slice(-limit).map((e) => ({ path: `${e.path}${e.search}`, title: e.label ?? named.get(e.path) ?? '' }));
}

export type RecentRef = `${string}:${string}`;

/** The records this colleague opened last in this browser, newest first: `person:<id>`. */
export function readRecent(): RecentRef[] {
  if (!recentKey) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(recentKey) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is RecentRef => typeof v === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function remember(path: string) {
  const record = recordFromPath(path);
  if (!record || !recentKey) return;
  // A course's groups are one course to remember; a registration's page names its kind.
  const ref: RecentRef = `${record.kind}:${record.id}`;
  try {
    window.localStorage.setItem(recentKey, JSON.stringify([ref, ...readRecent().filter((r) => r !== ref)].slice(0, MAX_RECENT)));
  } catch {
    // A private window, or storage switched off: the palette then has nothing recent to offer.
  }
}

/**
 * Records each page of the visit. Mounted once in the shell (inside a Suspense boundary, for
 * `useSearchParams`). `colleague` keys „recently opened", so two colleagues sharing a computer do not
 * see each other's; `pages` names the pages that have no header to name themselves (the overview).
 */
export function NavTrail({ colleague, pages }: { colleague: string; pages: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    recentKey = `${RECENT_KEY}${colleague}`;
    pageLabels = new Map(pages.map((p) => [p.href, p.label]));
  }, [colleague, pages]);

  useEffect(() => {
    visit(pathname, search ? `?${search}` : '');
    remember(pathname);
  }, [pathname, search]);

  return null;
}

/** A page's head says its name for the way back from the next page (PageHeader, RecordHeader). */
export function TrailLabel({ label }: { label: string }) {
  const pathname = usePathname();
  useEffect(() => {
    name(pathname, label);
  }, [pathname, label]);
  return null;
}

/**
 * The way back: to the page before this one when there is one in this visit, else to `href`, the
 * module's list. Its look is the caller's (`className`, `icon`).
 */
export function TrailBackLink({ href, label, fallbackLabel, className, icon }: { href: string; label?: string; fallbackLabel: ReactNode; className: string; icon: ReactNode }) {
  const pathname = usePathname();
  const before = useSyncExternalStore(
    subscribe,
    () => previous(pathname),
    () => null
  );
  const target = before ? { href: `${before.path}${before.search}`, label: before.label } : { href, label: label ?? null };
  return (
    <Link href={target.href} className={className}>
      {icon}
      {target.label ?? fallbackLabel}
    </Link>
  );
}
