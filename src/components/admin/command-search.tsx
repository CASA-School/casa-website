'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';

import { Popover } from 'radix-ui';
import { pick, type Bilingual } from '@/lib/admin/i18n';
import type { SearchGroup, SearchHit, SearchKind } from '@/lib/admin/search';
import { foldSearch, matchesShortcut, searchTokens } from '@/lib/admin/search-query';
import { cn } from '@/lib/utils';

import type { Shortcut } from './command-shortcuts';
import { Icon } from './icons';
import { useWsLang } from './lang';
import { readRecent } from './nav-trail';

const KINDS: Record<SearchKind, { label: Bilingual; icon: ReactNode }> = {
  person: { label: { de: 'Teilnehmende', en: 'Students' }, icon: Icon.people },
  booking: { label: { de: 'Buchungen', en: 'Bookings' }, icon: Icon.bookings },
  course: { label: { de: 'Kurse', en: 'Courses' }, icon: Icon.catalogue },
  exam: { label: { de: 'Prüfungstermine', en: 'Exam sittings' }, icon: Icon.award },
  staff: { label: { de: 'Mitarbeitende', en: 'Staff' }, icon: Icon.team },
  organisation: { label: { de: 'Organisationen', en: 'Organisations' }, icon: Icon.globe },
  group: { label: { de: 'Gruppen', en: 'Groups' }, icon: Icon.group },
  offer: { label: { de: 'Angebote', en: 'Offers' }, icon: Icon.offers },
  place: { label: { de: 'Unterkünfte', en: 'Accommodation' }, icon: Icon.home },
  room: { label: { de: 'Räume', en: 'Rooms' }, icon: Icon.rooms },
  enquiry: { label: { de: 'Anfragen', en: 'Enquiries' }, icon: Icon.enquiries },
  registration: { label: { de: 'Anmeldungen', en: 'Registrations' }, icon: Icon.registrations },
  application: { label: { de: 'Bewerbungen', en: 'Job applications' }, icon: Icon.applications },
  letter: { label: { de: 'Briefe', en: 'Letters' }, icon: Icon.mail },
};

type WorkList = { href: string; label: string };
type Answer = { groups: SearchGroup[]; views?: WorkList[] };
type Row = { key: string; href: string; title: string; detail?: string; icon: ReactNode };
type Section = { id: string; label: string; rows: Row[] };

/** Asked once a letter has rested this long: a word typed quickly is one request, not five. */
const DEBOUNCE = 120;

async function ask<T>(body: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/admin/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(`search ${response.status}`);
  return ((await response.json()) as { data: T }).data;
}

const hitRow = (hit: SearchHit): Row => ({ key: `${hit.kind}:${hit.id}`, href: hit.href, title: hit.title, detail: hit.detail, icon: KINDS[hit.kind].icon });
const shortcutRow = (prefix: string, s: Shortcut): Row => ({ key: `${prefix}:${s.href}`, href: s.href, title: s.label, icon: s.icon });

/** The typed words marked in a title, matched the way the search matched them (case, accents). */
function Marked({ text, tokens }: { text: string; tokens: readonly string[] }) {
  if (!tokens.length) return <>{text}</>;
  // Fold letter by letter, remembering which letter each folded one came from.
  let folded = '';
  const from: number[] = [];
  [...text].forEach((char, i) => {
    const f = foldSearch(char) || ' ';
    for (const c of f) {
      folded += c;
      from.push(i);
    }
  });
  const chars = [...text];
  const marked = new Array<boolean>(chars.length).fill(false);
  for (const token of tokens) {
    // The start of a word first: „an" marks Anna, not the end of Johann.
    const word = new RegExp(`(?:^|[^\\p{L}\\p{N}])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').exec(folded);
    const at = word ? word.index + word[0].length - token.length : folded.indexOf(token);
    if (at < 0) continue;
    for (let k = at; k < at + token.length && k < from.length; k++) marked[from[k]] = true;
  }
  const parts: { text: string; on: boolean }[] = [];
  chars.forEach((char, i) => {
    const last = parts.at(-1);
    if (last && last.on === marked[i]) last.text += char;
    else parts.push({ text: char, on: marked[i] });
  });
  return (
    <>
      {parts.map((part, i) =>
        part.on ? (
          <mark key={i} className="rounded-[3px] bg-[var(--casa-blue)]/12 text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

/**
 * Search: ⌘K (Ctrl K) or "/" from anywhere (2026-10-18; made forgiving and ranked 2026-10-27).
 *
 * A name with or without its accents, part of a phone number, a booking number, „B1.1 Oktober", an
 * organisation: the records come back grouped by kind, the best group first (src/lib/admin/search.ts),
 * each with the line that tells two of them apart. Keyboard first: ↑ ↓ to move, Enter to open, ⌘ Enter
 * in a new tab, Esc to close. Empty, it offers the records opened last and „Neu …"; typed, also the
 * pages whose name fits. Each letter cancels the request before it.
 *
 * `bar` is the field in the desktop top bar, `rail-icon` the magnifier in the phone's navy band. Both
 * are mounted and CSS shows one, so only the visible one answers the shortcut — otherwise ⌘K would
 * open two dialogs.
 */
export function CommandSearch({ variant = 'bar', pages, creates }: { variant?: 'bar' | 'rail-icon'; pages: readonly Shortcut[]; creates: readonly Shortcut[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState<Answer & { term: string; failed?: boolean }>({ term: '', groups: [] });
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const cache = useRef(new Map<string, Answer>());
  const searchId = useId();
  const list = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { t, lang } = useWsLang();

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!trigger.current?.offsetParent) return;
      if (!open && e.target instanceof Element && e.target.closest('[role="dialog"]')) return;
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open]);

  // Opened: the records opened last, read again — only those this colleague may still open come back.
  useEffect(() => {
    if (!open) return;
    const refs = readRecent();
    if (!refs.length) return;
    const controller = new AbortController();
    ask<{ hits: SearchHit[] }>({ recent: refs }, controller.signal)
      .then((data) => setRecent(data.hits.slice(0, 7)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [open]);

  const term = text.trim();
  useEffect(() => {
    if (term.length < 2) return;
    const cached = cache.current.get(term);
    if (cached) {
      setResult({ term, ...cached });
      setActive(0);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      ask<Answer>({ q: term }, controller.signal)
        .then((data) => {
          cache.current.set(term, data);
          if (cache.current.size > 40) cache.current.delete(cache.current.keys().next().value!);
          setResult({ term, ...data });
          setActive(0);
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ term, groups: [], failed: true });
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const tokens = useMemo(() => searchTokens(term), [term]);
  const short = term.length < 2;
  const sections: Section[] = useMemo(() => {
    if (short) {
      return [
        // The record on screen is not offered again.
        { id: 'recent', label: t('Zuletzt geöffnet', 'Recently opened'), rows: recent.filter((hit) => hit.href !== pathname).slice(0, 6).map(hitRow) },
        { id: 'new', label: t('Neu', 'New'), rows: creates.map((s) => shortcutRow('new', s)) },
      ].filter((s) => s.rows.length);
    }
    const views: Section = { id: 'views', label: t('Passende Arbeitslisten', 'Matching worklists'), rows: (result.views ?? []).map(v => ({ key: v.href, href: v.href, title: v.label, icon: Icon.bookings })) };
    const records = result.groups.map((g) => ({ id: g.kind, label: pick(lang, KINDS[g.kind].label), rows: g.hits.map(hitRow) }));
    const pageRows = pages.filter((p) => matchesShortcut(tokens, p.label, p.keywords)).slice(0, 4);
    const createRows = creates.filter((c) => matchesShortcut(tokens, c.label, c.keywords)).slice(0, 4);
    const shortcuts = [
      { id: 'pages', label: t('Seiten', 'Pages'), rows: pageRows.map((p) => shortcutRow('page', p)) },
      { id: 'new', label: t('Neu', 'New'), rows: createRows.map((c) => shortcutRow('new', c)) },
    ];
    // „Neu …" asked for, or a page named in full („Buchungen"): the shortcut first, then the records.
    const named = ['neu', 'new'].includes(tokens[0] ?? '') || pageRows.some((p) => foldSearch(p.label) === tokens.join(' '));
    return [views, ...(named ? [...shortcuts, ...records] : [...records, ...shortcuts])].filter((s) => s.rows.length);
  }, [short, recent, pathname, creates, result.groups, result.views, pages, tokens, lang, t]);

  const rows = sections.flatMap((s) => s.rows);
  const current = Math.min(active, Math.max(rows.length - 1, 0));
  const settled = !loading && result.term === term;

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [current, sections]);

  const close = () => {
    setOpen(false);
    setText('');
    setActive(0);
  };

  const go = (row: Row | undefined, newTab = false) => {
    if (!row) return;
    if (newTab) {
      window.open(row.href, '_blank', 'noopener');
      return;
    }
    close();
    router.push(row.href);
  };

  // Enter typed before the answer to the last letters came: it opens the first hit of that answer,
  // never a hit left over from the letters before.
  const pendingEnter = useRef<{ term: string; newTab: boolean } | null>(null);
  const enter = (newTab: boolean) => {
    if (!short && result.term !== term) pendingEnter.current = { term, newTab };
    else go(rows[current], newTab);
  };
  useEffect(() => {
    const waiting = pendingEnter.current;
    if (!waiting || result.term !== waiting.term) return;
    pendingEnter.current = null;
    if (waiting.term !== term || !rows.length) return;
    if (waiting.newTab) window.open(rows[0].href, '_blank', 'noopener');
    else {
      setOpen(false);
      setText('');
      setActive(0);
      router.push(rows[0].href);
    }
  }, [result, term, rows, router]);

  const click = (e: MouseEvent<HTMLAnchorElement>, row: Row) => {
    // ⌘/Ctrl/Shift-click and the middle button keep the browser's own way: a new tab or window.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    go(row);
  };

  return (
    <Popover.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <Popover.Trigger asChild>
      {variant === 'bar' ? (
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen(true)}
          title={t('Suchen', 'Search')}
          className="group flex h-9 w-full max-w-[25rem] items-center gap-2.5 rounded-lg bg-white/70 pr-1.5 pl-3.5 text-left text-[0.84rem] text-[var(--casa-text-subtle)] ring-1 ring-ws-line ring-inset transition-[background-color,box-shadow] outline-none hover:bg-white hover:shadow-[0_1px_2px_rgba(16,24,40,0.06)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
        >
          <span aria-hidden="true" className="shrink-0 text-[var(--casa-muted)] [&_svg]:h-4 [&_svg]:w-4">
            {Icon.search}
          </span>
          <span className="flex-1 truncate">{t('Name, Nummer oder Aufgabe …', 'Name, number or task …')}</span>
          <kbd className="rounded-md bg-ws-sunk px-2 py-0.5 font-sans text-[0.66rem] font-semibold text-[var(--casa-muted)] ring-1 ring-ws-line ring-inset">
            ⌘K
          </kbd>
        </button>
      ) : (
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen(true)}
          title={t('Suchen', 'Search')}
          aria-label={t('Suchen', 'Search')}
          className="flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          {Icon.search}
        </button>
      )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={variant === 'bar' ? 'start' : 'end'}
          sideOffset={8}
          collisionPadding={12}
          aria-label={t('Im Arbeitsbereich suchen', 'Search the workspace')}
          className="casa-ws-dialog z-[1000] w-[min(36rem,calc(100vw-24px))] overflow-hidden rounded-xl border border-ws-line bg-white shadow-[0_12px_44px_rgba(16,24,40,0.16)] outline-none"
        >
          <div className="flex items-center gap-3 border-b border-ws-line px-4">
            <span aria-hidden="true" className="text-[var(--casa-text-subtle)]">
              {Icon.search}
            </span>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive(rows.length ? (current + 1) % rows.length : 0);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive(rows.length ? (current - 1 + rows.length) % rows.length : 0);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  enter(e.metaKey || e.ctrlKey);
                }
              }}
              placeholder={t('Name, Nummer, E-Mail, Kurs …', 'Name, number, email, course …')}
              aria-label={t('Im Arbeitsbereich suchen', 'Search the workspace')}
              aria-controls={`${searchId}-results`}
              aria-activedescendant={rows[current] ? `${searchId}-${current}` : undefined}
              autoComplete="off"
              spellCheck={false}
              className="h-14 flex-1 bg-transparent text-[0.95rem] text-[var(--casa-ink)] outline-none placeholder:text-[var(--casa-text-subtle)]"
            />
            {loading ? (
              <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-ws-line border-t-[var(--casa-muted)] motion-reduce:animate-none" />
            ) : null}
          </div>

          <div ref={list} id={`${searchId}-results`} className="max-h-[min(55dvh,30rem)] overflow-y-auto py-2" role="listbox" aria-label={t('Ergebnisse', 'Results')}>
            {sections.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[var(--casa-text-subtle)]">
                {short
                  ? t('Teilnehmende, Buchungen, Kurse, Organisationen, Angebote …', 'Students, bookings, courses, organisations, offers …')
                  : settled
                    ? result.failed
                      ? t('Die Suche hat gerade nicht geantwortet. Tippe weiter oder versuche es noch einmal.', 'The search did not answer just now. Keep typing or try again.')
                      : t(`Nichts gefunden für „${term}“.`, `Nothing found for “${term}”.`)
                    : t('Suche läuft…', 'Searching…')}
              </p>
            ) : (
              sections.map((section) => (
                <div key={section.id} className="px-2 pb-1" role="group" aria-label={section.label}>
                  <p className="px-3 pt-2 pb-1 text-xs font-bold text-[var(--casa-muted)]">{section.label}</p>
                  {section.rows.map((row) => {
                    const index = rows.indexOf(row);
                    const on = index === current;
                    return (
                      <a
                        key={row.key}
                        id={`${searchId}-${index}`}
                        href={row.href}
                        role="option"
                        aria-selected={on}
                        tabIndex={-1}
                        onMouseMove={() => (on ? null : setActive(index))}
                        onClick={(e) => click(e, row)}
                        className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors', on ? 'bg-ws-sunk' : 'hover:bg-ws-sunk/60')}
                      >
                        <span aria-hidden="true" className={cn('shrink-0 [&_svg]:size-4', on ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-text-subtle)]')}>
                          {row.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--casa-ink)]">
                            <Marked text={row.title} tokens={short ? [] : tokens} />
                          </span>
                          {row.detail ? <span className="block truncate text-xs text-[var(--casa-text-subtle)]">{row.detail}</span> : null}
                        </span>
                        {on ? (
                          <kbd aria-hidden="true" className="hidden shrink-0 rounded-md px-1.5 font-sans text-[0.7rem] font-semibold text-[var(--casa-muted)] sm:inline">
                            ↵
                          </kbd>
                        ) : null}
                      </a>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="hidden items-center gap-4 border-t border-ws-line-soft bg-[#f8fafc] px-5 py-2 text-[0.7rem] text-[var(--casa-text-subtle)] sm:flex">
            <span>{t('↑ ↓ zum Wählen', '↑ ↓ to move')}</span>
            <span>{t('Enter zum Öffnen', 'Enter to open')}</span>
            <span>{t('⌘ Enter in neuem Tab', '⌘ Enter in a new tab')}</span>
            <span className="ml-auto">{t('Esc zum Schließen', 'Esc to close')}</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
