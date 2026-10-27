'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';

import { wsLocale } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

import { Icon } from './icons';
import { useWsLang } from './lang';
import { SidePanel } from './side-panel';

/**
 * What an entry on a record's line of time is: the team's own words, a line of SchoolMan's history by its kind
 * (Buchhaltung, Lernentwicklung … 0094), or a change made here; `order` places it among the panel's choices.
 */
export type TimelineFacet = { key: string; label: string; order: number };

/** One entry, drawn on the server; its kind, time and plain text are what the panel filters and searches by. */
export type TimelineRow = { key: string; facet: TimelineFacet; at: string; search: string; node: ReactNode };

/** Entries the card shows; the rest are a click away in the panel. */
const SHOWN = 5;

/** The thin line the entries' marks sit on. */
const LINE = 'relative space-y-4 before:absolute before:top-3 before:bottom-3 before:left-[13px] before:w-px before:bg-[#d3dbe6]';

/**
 * A record's notes and history without the wall (2026-10-20, Rahman: in some bookings „that section looks
 * very long … make it more advanced and elegant"). With SchoolMan's log brought across, a booking can
 * carry sixty entries. The card keeps the newest five, a long text cut at three lines; the whole line of
 * time opens at the side, by month, narrowed to one kind or found by a word.
 */
export function TimelineEntries({ rows, title }: { rows: TimelineRow[]; title: string }) {
  const { t } = useWsLang();
  const rest = rows.length - SHOWN;
  return (
    <>
      <ol className={cn('mt-5', LINE, '[&_[data-tl-text]]:line-clamp-3')}>
        {rows.slice(0, SHOWN).map((row) => (
          <Fragment key={row.key}>{row.node}</Fragment>
        ))}
      </ol>
      {rest > 0 ? (
        <SidePanel
          title={title}
          icon={Icon.note}
          tint="sun"
          width="lg"
          trigger={
            <>
              <span>{t('Ganzer Verlauf', 'Full history')}</span>
              <span className="text-[0.76rem] font-semibold text-[var(--casa-muted)] tabular-nums">{rows.length}</span>
              <span aria-hidden="true" className="ml-auto text-[var(--casa-muted)] [&_svg]:size-4">
                {Icon.chevronRight}
              </span>
            </>
          }
          triggerClassName="mt-5 flex h-10 w-full items-center gap-2 rounded-xl bg-[#f6f8fb] px-3.5 text-[0.82rem] font-semibold text-[var(--casa-ink)] ring-1 ring-[#e1e7ef] ring-inset transition-colors outline-none hover:bg-[#eef2f7] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
        >
          <History rows={rows} />
        </SidePanel>
      ) : null}
    </>
  );
}

/** The whole line of time: the kinds as a segmented control, a search, and the entries under their month. */
function History({ rows }: { rows: TimelineRow[] }) {
  const { t, lang } = useWsLang();
  const [kind, setKind] = useState<string>('all');
  const [query, setQuery] = useState('');

  // The kinds the entries are of, each with how many, in their order.
  const kinds = useMemo(() => {
    const seen = new Map<string, TimelineFacet & { n: number }>();
    for (const r of rows) {
      const k = seen.get(r.facet.key);
      seen.set(r.facet.key, k ? { ...k, n: k.n + 1 } : { ...r.facet, n: 1 });
    }
    return [...seen.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [rows]);

  const months = useMemo(() => {
    const words = query.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
    const shown = rows.filter((r) => (kind === 'all' || r.facet.key === kind) && words.every((w) => r.search.includes(w)));
    const groups: { label: string; rows: TimelineRow[] }[] = [];
    for (const row of shown) {
      const label = new Date(row.at).toLocaleDateString(wsLocale(lang), { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
      if (groups.at(-1)?.label === label) groups.at(-1)!.rows.push(row);
      else groups.push({ label, rows: [row] });
    }
    return groups;
  }, [rows, kind, query, lang]);

  const choice = (key: string, label: string, n: number) => (
    <button
      key={key}
      type="button"
      aria-pressed={kind === key}
      onClick={() => setKind(key)}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
        kind === key ? 'bg-[var(--casa-ink-deep)] text-white' : 'text-[var(--casa-ink)] hover:bg-ws-sunk'
      )}
    >
      {label}
      <span className={cn('text-[0.72rem] tabular-nums', kind === key ? 'text-white/70' : 'text-[var(--casa-muted)]')}>{n}</span>
    </button>
  );

  return (
    <div className="px-6 pb-8">
      <div className="sticky top-0 z-[2] -mx-6 mb-5 space-y-3 border-b border-ws-line-soft bg-white/95 px-6 pt-4 pb-4 backdrop-blur">
        {kinds.length > 1 ? (
          <div role="group" aria-label={t('Art', 'Kind')} className="inline-flex flex-wrap rounded-full bg-white p-1 ring-1 ring-ws-line">
            {choice('all', t('Alle', 'All'), rows.length)}
            {kinds.map((k) => choice(k.key, k.label, k.n))}
          </div>
        ) : null}
        <label className="relative block">
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--casa-muted)] [&_svg]:size-4">
            {Icon.search}
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Im Verlauf suchen', 'Search the history')}
            aria-label={t('Im Verlauf suchen', 'Search the history')}
            className="h-9 w-full rounded-full border border-ws-line bg-white pr-3 pl-9 text-[0.84rem] outline-none placeholder:text-[var(--casa-text-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
          />
        </label>
      </div>

      {months.length ? (
        <div className="space-y-7">
          {months.map((month) => (
            <section key={month.label} aria-label={month.label}>
              <h3 className="mb-3 flex items-center gap-3 text-[0.76rem] font-semibold text-[var(--casa-muted)]">
                {month.label}
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-[#d3dbe6] to-transparent" />
              </h3>
              <ol className={LINE}>
                {month.rows.map((row) => (
                  <Fragment key={row.key}>{row.node}</Fragment>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-[0.86rem] text-[var(--casa-muted)]">{t('Nichts gefunden.', 'Nothing found.')}</p>
      )}
    </div>
  );
}
