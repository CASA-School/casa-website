'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { searchWorkspaceAction } from '@/app/(admin)/admin/(workspace)/search/actions';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { pick, type Bilingual } from '@/lib/admin/i18n';
import type { SearchHit, SearchKind } from '@/lib/admin/search';
import { cn } from '@/lib/utils';

import { Icon } from './icons';
import { useWsLang } from './lang';

const GROUPS: { kind: SearchKind; label: Bilingual }[] = [
  { kind: 'person', label: { de: 'Teilnehmende', en: 'Students' } },
  { kind: 'enquiry', label: { de: 'Anfragen', en: 'Enquiries' } },
  { kind: 'course', label: { de: 'Kursanmeldungen', en: 'Course registrations' } },
  { kind: 'exam', label: { de: 'Prüfungsanmeldungen', en: 'Exam registrations' } },
  { kind: 'offer', label: { de: 'Angebote', en: 'Offers' } },
  { kind: 'booking', label: { de: 'Buchungen', en: 'Bookings' } },
  { kind: 'application', label: { de: 'Bewerbungen', en: 'Job applications' } },
];

/**
 * Search, at the top of the sidebar: ⌘K (Ctrl K) or "/" from anywhere, a name,
 * an address or an offer number, and Enter opens the record. One box for the
 * whole workspace instead of knowing which list a person is in
 * (src/lib/admin/search.ts). `rail` is the field in the sidebar, `rail-icon`
 * the magnifier in its phone band.
 */
export function CommandSearch({ variant = 'rail' }: { variant?: 'rail' | 'rail-icon' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searched, setSearched] = useState('');
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const asked = useRef(0);
  const { t, lang } = useWsLang();

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  useEffect(() => {
    const term = text.trim();
    if (term.length < 2) return;
    const ticket = ++asked.current;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const found = await searchWorkspaceAction(term);
        if (ticket !== asked.current) return;
        setHits(found);
        setSearched(term);
        setActive(0);
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [text]);

  const short = text.trim().length < 2;
  const shown = useMemo(() => (short ? [] : hits), [short, hits]);
  const grouped = GROUPS.map((g) => ({ ...g, hits: shown.filter((h) => h.kind === g.kind) })).filter((g) => g.hits.length);
  const ordered = grouped.flatMap((g) => g.hits);

  const go = (hit: SearchHit | undefined) => {
    if (!hit) return;
    setOpen(false);
    setText('');
    setHits([]);
    router.push(hit.href);
  };

  return (
    <>
      {variant === 'rail' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-rail-search
          title={t('Suchen', 'Search')}
          className="flex h-9 w-full items-center gap-2.5 rounded-lg bg-white/[0.07] px-2.5 text-left text-[0.82rem] text-white/55 ring-1 ring-white/10 transition-colors outline-none ring-inset hover:bg-white/[0.1] hover:text-white/80 focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span aria-hidden="true" className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">
            {Icon.search}
          </span>
          <span data-rail-hide className="flex-1 truncate">
            {t('Suchen', 'Search')}
          </span>
          <kbd data-rail-hide className="rounded bg-white/10 px-1.5 font-sans text-[0.66rem] font-semibold text-white/60">
            ⌘K
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={t('Suchen', 'Search')}
          aria-label={t('Suchen', 'Search')}
          className="flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          {Icon.search}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="casa-ws-dialog max-w-xl gap-0 overflow-hidden rounded-3xl p-0 sm:mt-[8vh] sm:self-start" showCloseButton={false}>
          <DialogTitle className="sr-only">{t('Im Arbeitsbereich suchen', 'Search the workspace')}</DialogTitle>
          <DialogDescription className="sr-only">{t('Ein Name, eine E-Mail-Adresse oder eine Angebotsnummer', 'A name, an email address or an offer number')}</DialogDescription>
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
                  setActive((i) => Math.min(i + 1, ordered.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  go(ordered[active]);
                }
              }}
              placeholder={t('Name, E-Mail-Adresse oder Angebotsnummer', 'A name, an email address or an offer number')}
              aria-label={t('Im Arbeitsbereich suchen', 'Search the workspace')}
              className="h-14 flex-1 bg-transparent text-[0.95rem] text-[var(--casa-ink)] outline-none placeholder:text-[var(--casa-text-subtle)]"
            />
            {pending ? <span className="text-xs text-[var(--casa-text-subtle)]">{t('Suche läuft…', 'Searching…')}</span> : null}
          </div>

          <div className="max-h-[56vh] overflow-y-auto py-2" role="listbox" aria-label={t('Ergebnisse', 'Results')}>
            {short ? (
              <p className="px-5 py-6 text-sm text-[var(--casa-text-subtle)]">{t('Teilnehmende, Anfragen, Anmeldungen, Angebote, Buchungen.', 'Students, enquiries, registrations, offers, bookings.')}</p>
            ) : grouped.length === 0 && !pending && searched === text.trim() ? (
              <p className="px-5 py-6 text-sm text-[var(--casa-text-subtle)]">{t(`Nichts gefunden für „${text.trim()}“.`, `Nothing found for “${text.trim()}”.`)}</p>
            ) : (
              grouped.map((group) => (
                <div key={group.kind} className="px-2 pb-1">
                  <p className="px-3 pt-2 pb-1 text-xs font-bold text-[var(--casa-muted)]">{pick(lang, group.label)}</p>
                  {group.hits.map((hit) => {
                    const index = ordered.indexOf(hit);
                    return (
                      <button
                        key={`${hit.kind}:${hit.id}`}
                        type="button"
                        role="option"
                        aria-selected={index === active}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(hit)}
                        className={cn(
                          'flex w-full items-baseline justify-between gap-4 rounded-xl px-3 py-2 text-left transition-colors',
                          index === active ? 'bg-ws-sunk' : 'hover:bg-ws-sunk/60'
                        )}
                      >
                        <span className="min-w-0 truncate text-sm font-semibold text-[var(--casa-ink)]">{hit.title}</span>
                        <span className="min-w-0 shrink truncate text-xs text-[var(--casa-text-subtle)]">{hit.detail}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-4 border-t border-ws-line-soft bg-[#f8fafc] px-5 py-2 text-[0.7rem] text-[var(--casa-text-subtle)]">
            <span>{t('↑ ↓ zum Wählen', '↑ ↓ to move')}</span>
            <span>{t('Enter zum Öffnen', 'Enter to open')}</span>
            <span>{t('Esc zum Schließen', 'Esc to close')}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
