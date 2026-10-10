'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  describeSlotsAction,
  heartbeatAction,
  leaveEditorAction,
  listChangesAction,
  undoReleaseAction,
} from '@/app/(admin)/admin/(editor)/website/actions';
import type { EditorPageGroup } from '@/config/cms/editor-pages';
import { localizeHref, toInternalPath } from '@/i18n/pathnames';
import type { ContentLocale } from '@/lib/content/types';
import type { ChangeItem, PresenceEntry, SearchHit, SlotState } from '@/lib/cms/editor-types';
import type { CmsLocale } from '@/lib/cms/locales';
import { dataSource, isDataKey, type FromPage, type Rect, type SlotMarker, type ToPage } from '@/lib/cms/protocol';
import { cn } from '@/lib/utils';

import { AskDialog } from './ask-dialog';
import styles from './editor.module.css';
import { HistoryDrawer } from './history-drawer';
import { LanguageMenu } from './language-menu';
import { PagePicker } from './page-picker';
import { Avatar, I, IconButton, plural } from './parts';
import { ReviewDialog } from './review-dialog';
import { TextPopover } from './text-popover';

/**
 * The website editor.
 *
 * The real public page fills the screen in an iframe, in draft mode. The page
 * tells the editor which texts it shows (edit-bridge.tsx); the editor answers
 * with their names and states, and opens a popup beside any text that is
 * clicked. One slim bar above holds the page, the language, the width, who
 * else is here, and one primary action: review what is waiting and publish it.
 */

type Level = 'view' | 'edit' | 'full';
type Selection = { key: string; rect: Rect | null; text: string };
type Toast = { message: string; undo?: string } | null;

const DEVICE_WIDTH = { desktop: '100%', tablet: '820px', phone: '390px' } as const;

const sameRect = (a: Rect | null, b: Rect) =>
  Boolean(a) && Math.abs(a!.x - b.x) < 0.5 && Math.abs(a!.y - b.y) < 0.5 && Math.abs(a!.width - b.width) < 0.5 && Math.abs(a!.height - b.height) < 0.5;

const DATA_SCREENS: Record<string, { label: string; href: string }> = {
  Prices: { label: 'Types & prices', href: '/admin/settings/setup' },
  'Course dates': { label: 'Courses', href: '/admin/catalogue' },
  'Course types': { label: 'Types & prices', href: '/admin/settings/setup' },
};

export function WebsiteEditor({
  user,
  level,
  locales,
  pages,
  publicOrigin,
  previewBase,
  initialPath,
  aiEnabled,
}: {
  user: { name: string; initials: string };
  level: Level;
  locales: CmsLocale[];
  pages: readonly EditorPageGroup[];
  publicOrigin: string;
  previewBase: string;
  initialPath: string;
  aiEnabled: boolean;
}) {
  const [src, setSrc] = useState(() => previewBase + encodeURIComponent(initialPath));
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<{ path: string; title: string; lang: string } | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [selection, setSelection] = useState<Selection | null>(null);
  const [workLocale, setWorkLocale] = useState(locales.find((locale) => locale.source)?.code ?? 'de');
  const [device, setDevice] = useState<keyof typeof DEVICE_WIDTH>('desktop');
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [panel, setPanel] = useState<null | 'pages' | 'language' | 'review' | 'ask' | 'history'>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [touched, setTouched] = useState(false);
  const [layout, setLayout] = useState({ canvas: { width: 0, height: 0 }, frame: { x: 0, y: 0 } });

  const iframe = useRef<HTMLIFrameElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const pendingReveal = useRef<string | null>(null);
  const live = useRef({ path: null as string | null, key: null as string | null });
  const toastTimer = useRef<number | undefined>(undefined);

  const pageOrigin = publicOrigin || (typeof window === 'undefined' ? '' : window.location.origin);
  const canEdit = level !== 'view';

  const post = useCallback(
    (message: ToPage) => iframe.current?.contentWindow?.postMessage(message, pageOrigin || window.location.origin),
    [pageOrigin]
  );

  const notify = useCallback((message: string, undo?: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 10_000 : 4_000);
  }, []);

  const loadSlots = useCallback(async (wanted: string[]) => {
    const editable = wanted.filter((key) => !isDataKey(key));
    if (!editable.length) return;
    const result = await describeSlotsAction(editable);
    if (result.ok) setSlots((previous) => ({ ...previous, ...Object.fromEntries(result.slots.map((slot) => [slot.key, slot])) }));
  }, []);

  const applyChanges = useCallback((result: Awaited<ReturnType<typeof listChangesAction>>) => {
    if (!result.ok) return;
    setChanges(result.changes);
    setPendingApprovals(result.releases.filter((release) => release.state === 'pending').length);
  }, []);
  const refreshChanges = useCallback(() => listChangesAction().then(applyChanges), [applyChanges]);
  const keysRef = useRef<string[]>([]);
  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);
  /** After a publish, a decision, an undo or new drafts: the page and every state on it. */
  const afterRelease = useCallback(
    (reloadPage: boolean) => {
      void refreshChanges();
      void loadSlots(keysRef.current);
      if (reloadPage) iframe.current?.contentWindow?.postMessage({ type: 'cms:reload' } satisfies ToPage, pageOrigin || window.location.origin);
    },
    [refreshChanges, loadSlots, pageOrigin]
  );

  // Messages from the page in the preview.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow) return;
      if (event.origin !== (publicOrigin || window.location.origin)) return;
      const message = event.data as FromPage;
      switch (message?.type) {
        case 'cms:ready': {
          setLoading(false);
          setPage({ path: message.path, title: message.title, lang: message.lang });
          setKeys(message.keys);
          setSelection(null);
          void loadSlots(message.keys);
          const reveal = pendingReveal.current;
          if (reveal && message.keys.includes(reveal)) {
            pendingReveal.current = null;
            setSelection({ key: reveal, rect: null, text: '' });
            iframe.current?.contentWindow?.postMessage({ type: 'cms:reveal', key: reveal } satisfies ToPage, event.origin);
          }
          break;
        }
        case 'cms:keys':
          setKeys(message.keys);
          void loadSlots(message.keys);
          break;
        case 'cms:select':
          setTouched(true);
          setPanel(null);
          setSelection({ key: message.key, rect: message.rect, text: message.text });
          if (!isDataKey(message.key)) void loadSlots([message.key]);
          break;
        case 'cms:rect':
          setSelection((current) =>
            current && current.key === message.key && message.rect && !sameRect(current.rect, message.rect)
              ? { ...current, rect: message.rect }
              : current
          );
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [publicOrigin, loadSlots]);

  // Where the iframe sits inside the canvas, for anchoring popups to its texts.
  useEffect(() => {
    const measure = () => {
      const area = canvas.current?.getBoundingClientRect();
      const frame = iframe.current?.getBoundingClientRect();
      if (!area || !frame) return;
      setLayout({ canvas: { width: area.width, height: area.height }, frame: { x: frame.left - area.left, y: frame.top - area.top } });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (canvas.current) observer.observe(canvas.current);
    if (iframe.current) observer.observe(iframe.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [device]);

  // Markers on the page: names, drafts, comments, colleagues.
  const lang = page?.lang ?? 'de';
  const markers = useMemo(() => {
    const out: Record<string, SlotMarker> = {};
    for (const key of keys) {
      if (isDataKey(key)) {
        out[key] = { label: `From ${dataSource(key)}` };
        continue;
      }
      const slot = slots[key];
      if (!slot) continue;
      const status = slot.locales[lang]?.status;
      out[key] = {
        label: slot.label,
        state: status === 'draft' || status === 'upcoming' || status === 'stale' ? status : undefined,
        comments: slot.comments || undefined,
        lockedBy: presence.find((other) => other.key === key)?.initials,
      };
    }
    return out;
  }, [keys, slots, presence, lang]);

  const markersJson = JSON.stringify(markers);
  useEffect(() => post({ type: 'cms:markers', markers: JSON.parse(markersJson) as Record<string, SlotMarker> }), [markersJson, post]);
  useEffect(() => post({ type: 'cms:select', key: selection?.key ?? null }), [selection?.key, post]);

  // Presence: every fifteen seconds, and whenever the open text changes.
  const openKey = selection && !isDataKey(selection.key) ? selection.key : null;
  useEffect(() => {
    live.current = { path: page?.path ?? null, key: openKey };
  }, [page?.path, openKey]);

  // A new array only when someone arrived, left or moved: the markers repaint on it.
  const applyPresence = useCallback((result: Awaited<ReturnType<typeof heartbeatAction>>) => {
    if (!result.ok) return;
    setPresence((current) => (JSON.stringify(current) === JSON.stringify(result.others) ? current : result.others));
  }, []);
  const beat = useCallback(() => heartbeatAction(live.current).then(applyPresence), [applyPresence]);

  useEffect(() => {
    heartbeatAction({ path: page?.path ?? null, key: openKey }).then(applyPresence);
  }, [applyPresence, page?.path, openKey]);

  useEffect(() => {
    listChangesAction().then(applyChanges);
    const presenceTimer = window.setInterval(() => void beat(), 15_000);
    const changesTimer = window.setInterval(() => void refreshChanges(), 45_000);
    const leave = () => void leaveEditorAction();
    window.addEventListener('pagehide', leave);
    return () => {
      window.clearInterval(presenceTimer);
      window.clearInterval(changesTimer);
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, [applyChanges, beat, refreshChanges]);

  // ⌘K opens the page list.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPanel((current) => (current === 'pages' ? null : 'pages'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function openPath(path: string) {
    setPanel(null);
    setSelection(null);
    setLoading(true);
    setSrc(`${publicOrigin}${path}`);
  }

  function reveal(key: string, path: string | null) {
    setPanel(null);
    if (keys.includes(key)) {
      setSelection({ key, rect: null, text: '' });
      void loadSlots([key]);
      post({ type: 'cms:reveal', key });
      return;
    }
    pendingReveal.current = key;
    openPath(localizeHref(path ?? '/courses/intensive-german', 'de'));
  }

  function pickLanguage(code: string) {
    setPanel(null);
    setWorkLocale(code);
    const locale = locales.find((candidate) => candidate.code === code);
    if (!locale?.routed || !page) return;
    const target = localizeHref(toInternalPath(page.path).internalPath, code as ContentLocale);
    if (target !== page.path) openPath(target);
  }

  async function undo(releaseId: string) {
    const result = await undoReleaseAction({ id: releaseId });
    if (!result.ok) return notify(result.error);
    notify('Taken back off the site');
    afterRelease(true);
  }

  const pageNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of pages) for (const entry of group.pages) map.set(toInternalPath(entry.path).internalPath, entry.name);
    return map;
  }, [pages]);
  const internalPath = page ? toInternalPath(page.path).internalPath : null;
  const pageName = (internalPath && pageNames.get(internalPath)) || page?.title.replace(/\s*\|\s*CASA Bremen\s*$/, '') || 'Loading…';

  const draftPaths = useMemo(
    () => new Set(changes.flatMap((change) => (change.path ? [localizeHref(change.path, 'de')] : []))),
    [changes]
  );

  const editableKeys = keys.filter((key) => !isDataKey(key) && slots[key]);
  const completion = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const { code } of locales) {
      if (!editableKeys.length) {
        out[code] = null;
        continue;
      }
      const done = editableKeys.filter((key) => {
        const state = slots[key]?.locales[code];
        return state && state.value && state.status !== 'stale' && state.status !== 'missing';
      }).length;
      out[code] = Math.round((done / editableKeys.length) * 100);
    }
    return out;
  }, [editableKeys, slots, locales]);

  const workLabel = locales.find((locale) => locale.code === workLocale)?.label ?? workLocale;
  const selectedSlot = selection && !isDataKey(selection.key) ? slots[selection.key] : undefined;
  const anchor = selection?.rect
    ? { x: layout.frame.x + selection.rect.x, y: layout.frame.y + selection.rect.y, width: selection.rect.width, height: selection.rect.height }
    : null;
  const others = presence.filter((other) => other.path);
  const reviewCount = changes.length + (level === 'full' ? pendingApprovals : 0);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ws-canvas text-[var(--casa-ink)]">
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-3 border-b border-ws-line bg-white px-3 sm:px-4">
        <div className="relative flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-[var(--casa-text-subtle)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]"
          >
            {I.back}
            <span className="hidden md:inline">Workspace</span>
          </Link>
          <span aria-hidden className="hidden h-6 w-px bg-ws-line md:block" />
          <button
            type="button"
            onClick={() => setPanel(panel === 'pages' ? null : 'pages')}
            aria-expanded={panel === 'pages'}
            className="inline-flex h-10 min-w-0 items-center gap-2.5 rounded-xl border border-ws-line bg-white px-3 transition-colors hover:border-ws-line-firm"
          >
            <span className="text-[var(--casa-text-subtle)]">{I.page}</span>
            <span className="truncate text-sm font-bold">{pageName}</span>
            <span className="hidden truncate text-[0.8rem] text-[var(--casa-text-subtle)] xl:inline">{page?.path}</span>
            <span className="hidden rounded-md border border-ws-line px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--casa-text-subtle)] lg:inline">⌘K</span>
            <span className="text-[var(--casa-text-subtle)]">{I.chevron}</span>
          </button>
          {panel === 'pages' ? (
            <PagePicker
              pages={pages}
              currentPath={page?.path ?? ''}
              draftPaths={draftPaths}
              onOpen={openPath}
              onReveal={(hit: SearchHit) => reveal(hit.key, hit.path)}
              onClose={() => setPanel(null)}
            />
          ) : null}
        </div>

        <div className="relative hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => setPanel(panel === 'language' ? null : 'language')}
            aria-expanded={panel === 'language'}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ws-sunk px-3 text-[0.8rem] font-semibold hover:text-[var(--casa-ink)]"
          >
            <span className="text-[var(--casa-text-subtle)]">{I.globe}</span>
            {workLabel}
            <span className="text-[var(--casa-text-subtle)]">{I.chevron}</span>
          </button>
          {panel === 'language' ? (
            <LanguageMenu locales={locales} current={workLocale} completion={completion} onPick={pickLanguage} onClose={() => setPanel(null)} />
          ) : null}
          <div role="radiogroup" aria-label="Preview width" className="inline-flex rounded-lg bg-ws-sunk p-0.5">
            {(['desktop', 'tablet', 'phone'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={device === option}
                aria-label={option[0].toUpperCase() + option.slice(1)}
                title={option[0].toUpperCase() + option.slice(1)}
                onClick={() => setDevice(option)}
                className={cn(
                  'grid h-8 w-9 place-items-center rounded-md transition-colors',
                  device === option ? 'bg-white text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(15,23,42,0.14)]' : 'text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]'
                )}
              >
                {I[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5">
          {others.length ? (
            <div className="mr-1 hidden -space-x-1.5 sm:flex">
              {others.slice(0, 4).map((other) => (
                <Avatar
                  key={other.staffId}
                  initials={other.initials}
                  tone={other.path === page?.path ? 'sun' : 'ink'}
                  size={28}
                  title={`${other.name}${other.path === page?.path ? ' · on this page' : ''}`}
                />
              ))}
            </div>
          ) : null}
          {aiEnabled && canEdit ? (
            <button
              type="button"
              onClick={() => setPanel('ask')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:bg-[var(--casa-blue-tint)]"
            >
              {I.sparkle}
              <span className="hidden sm:inline">Ask</span>
            </button>
          ) : null}
          <IconButton label="History" active={panel === 'history'} onClick={() => setPanel(panel === 'history' ? null : 'history')}>
            {I.history}
          </IconButton>
          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                setSelection(null);
                setPanel('review');
              }}
              disabled={reviewCount === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--casa-ink-deep)] pr-4 pl-3.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)] transition-colors hover:bg-[var(--casa-ink-deep-hover)] disabled:bg-ws-line-firm disabled:shadow-none"
            >
              {reviewCount > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--casa-sun)] px-1.5 text-[0.7rem] font-bold text-[var(--casa-ink)] tabular-nums">
                  {reviewCount}
                </span>
              ) : null}
              <span className="hidden sm:inline">{level === 'full' ? 'Review & publish' : 'Review & send'}</span>
              <span className="sm:hidden">Review</span>
            </button>
          ) : null}
          <span className="ml-1 hidden sm:block">
            <Avatar initials={user.initials} size={32} title={user.name} />
          </span>
        </div>
      </header>

      <div ref={canvas} className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full justify-center px-3 pt-3 pb-3 sm:px-5 sm:pt-4">
          <div
            className={cn(
              'flex h-full max-w-full flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_28px_56px_-30px_rgba(15,23,42,0.38)] ring-1 ring-[rgba(15,23,42,0.05)]',
              styles.frame
            )}
            style={{ width: DEVICE_WIDTH[device] }}
          >
            <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ws-line-soft px-3.5 text-xs font-medium text-[var(--casa-text-subtle)]">
              <span aria-hidden>{I.lock}</span>
              <span className="truncate">
                casa-bremen.de{page?.path === '/' ? '' : page?.path}
              </span>
              {changes.length ? (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--casa-sun-tint)] px-2.5 py-0.5 font-semibold text-[#5c4900]">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#d4a800]" />
                  Draft preview
                </span>
              ) : null}
            </div>
            <div className="relative min-h-0 flex-1">
              {loading ? <div className={cn('absolute inset-x-0 top-0 z-10 h-0.5', styles.shimmer)} aria-hidden /> : null}
              <iframe
                ref={iframe}
                src={src}
                title="Website preview"
                onLoad={() => setLoading(false)}
                className="h-full w-full border-0 bg-white"
              />
            </div>
          </div>
        </div>

        {!touched && editableKeys.length && !selection ? (
          <div
            className={cn(
              'pointer-events-none absolute bottom-6 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-ws-line bg-white px-4 py-2.5 text-[0.8rem] font-semibold text-[var(--casa-muted)] shadow-[0_12px_28px_-16px_rgba(15,23,42,0.35)]',
              styles.fade
            )}
          >
            {I.pointer}
            Click any text to edit it
          </div>
        ) : null}

        {selectedSlot && anchor ? (
          <TextPopover
            key={selectedSlot.key}
            slot={selectedSlot}
            anchor={anchor}
            bounds={layout.canvas}
            locales={locales}
            initialLocale={workLocale === lang || !locales.find((locale) => locale.code === workLocale)?.routed ? workLocale : lang}
            pageLocale={lang}
            canEdit={canEdit}
            lockedBy={presence.find((other) => other.key === selectedSlot.key) ?? null}
            aiEnabled={aiEnabled}
            onPreview={(locale, value) => locale === lang && post({ type: 'cms:preview', key: selectedSlot.key, value })}
            onSaved={(slot) => {
              if (slot) setSlots((previous) => ({ ...previous, [slot.key]: slot }));
              void refreshChanges();
            }}
            onClose={() => setSelection(null)}
            notify={notify}
          />
        ) : null}

        {selection && isDataKey(selection.key) && anchor ? (
          <DataCard source={dataSource(selection.key)} text={selection.text} anchor={anchor} bounds={layout.canvas} onClose={() => setSelection(null)} />
        ) : null}

        {panel === 'history' ? (
          <HistoryDrawer
            level={level}
            locales={locales}
            onClose={() => setPanel(null)}
            onChanged={() => afterRelease(true)}
            notify={notify}
          />
        ) : null}

        {toast ? (
          <div
            role="status"
            className={cn(
              'absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-[var(--casa-ink-deep)] py-2.5 pr-2.5 pl-4 text-sm font-medium whitespace-nowrap text-white shadow-[0_20px_40px_-18px_rgba(13,20,32,0.6)]',
              styles.pop
            )}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--casa-success-surface)]">{I.check}</span>
            {toast.message}
            {toast.undo ? (
              <button type="button" onClick={() => void undo(toast.undo!)} className="h-8 rounded-lg bg-white/10 px-3 text-[0.8rem] font-semibold hover:bg-white/20">
                Undo
              </button>
            ) : null}
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10">
              {I.close}
            </button>
          </div>
        ) : null}
      </div>

      {panel === 'review' ? (
        <ReviewDialog
          level={level}
          locales={locales}
          onClose={() => setPanel(null)}
          notify={notify}
          onFixTranslation={(key, locale) => {
            setWorkLocale(locale);
            const slot = slots[key];
            reveal(key, slot?.path ?? changes.find((change) => change.key === key)?.path ?? null);
          }}
          onDone={(message, releaseId) => {
            setPanel(null);
            notify(message, level === 'full' ? releaseId : undefined);
            afterRelease(true);
          }}
          onChanged={() => afterRelease(true)}
        />
      ) : null}

      {panel === 'ask' ? (
        <AskDialog
          pageKeys={editableKeys}
          locales={locales}
          onClose={() => setPanel(null)}
          onApplied={(count) => {
            setPanel(null);
            notify(`${plural(count, 'draft', 'drafts')} added`);
            afterRelease(true);
          }}
        />
      ) : null}
    </div>
  );
}

function DataCard({
  source,
  text,
  anchor,
  bounds,
  onClose,
}: {
  source: string;
  text: string;
  anchor: Rect;
  bounds: { width: number; height: number };
  onClose: () => void;
}) {
  const screen = DATA_SCREENS[source];
  const width = 320;
  const left = Math.max(12, Math.min(anchor.x + anchor.width / 2 - width / 2, bounds.width - width - 12));
  const below = bounds.height - (anchor.y + anchor.height) > 200;
  return (
    <div
      role="dialog"
      aria-label={source}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
      className={cn('absolute z-30 rounded-2xl bg-white p-4 shadow-[0_28px_70px_-24px_rgba(15,23,42,0.42),0_0_0_1px_rgba(15,23,42,0.07)]', styles.pop)}
      style={below ? { left, top: anchor.y + anchor.height + 12, width } : { left, bottom: bounds.height - anchor.y + 12, width }}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ws-sunk text-[var(--casa-muted)]">{I.data}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--casa-text-subtle)]">From {source}</p>
          <p className="mt-0.5 truncate text-[0.95rem] font-bold text-[var(--casa-ink)]">{text}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 grid h-8 w-8 place-items-center rounded-lg text-[var(--casa-text-subtle)] hover:bg-ws-sunk">
          {I.close}
        </button>
      </div>
      {screen ? (
        <Link
          href={screen.href}
          target="_blank"
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-ws-line-firm text-[0.8rem] font-semibold text-[var(--casa-ink)] hover:border-[var(--casa-blue)]/45 hover:text-[var(--casa-accent-text)]"
        >
          Open {screen.label}
          {I.external}
        </Link>
      ) : null}
    </div>
  );
}
