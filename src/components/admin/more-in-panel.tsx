'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { wsLocale } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

import { Icon } from './icons';
import { useWsLang } from './lang';
import { SidePanel } from './side-panel';
import type { Tint } from './ui';

/**
 * One row of a long record list, drawn on the server: what the panel searches (`search`), groups by month
 * (`at`), narrows by (`chip`) and adds up per month (`amount`, in euros).
 */
export type PanelRow = { key: string; node: ReactNode; search?: string; at?: string; chip?: string; amount?: number };

/** The button that opens the rest — the look „Ganzer Verlauf" and „Alle Briefe" set (2026-10-20). */
const TRIGGER =
  'flex h-10 items-center gap-2 rounded-xl bg-[#f6f8fb] px-3.5 text-[0.82rem] font-semibold text-[var(--casa-ink)] ring-1 ring-[#e1e7ef] ring-inset transition-colors outline-none hover:bg-[#eef2f7] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40';

/**
 * A long record list kept short (2026-10-20, Rahman: „see where there is a long list … show a few … and the
 * rest in sidebar"). The page shows what matters now; this is the button under it, „Alle 208", and the
 * panel it opens: every row, found by a word, narrowed by a chip, under its month with the month's sum.
 */
export function MoreInPanel({
  rows,
  title,
  label,
  icon,
  tint = 'ink',
  chips,
  listClassName = '-mx-4',
  className,
}: {
  rows: readonly PanelRow[];
  title: string;
  /** The button's words: „Alle Auszahlungen", „Frühere Aufenthalte". The count follows by itself. */
  label: string;
  icon?: ReactNode;
  tint?: Tint;
  /** The kinds the rows can be narrowed to, in order; a row names its own in `chip`. */
  chips?: readonly { key: string; label: string }[];
  listClassName?: string;
  className?: string;
}) {
  if (!rows.length) return null;
  return (
    <SidePanel
      title={title}
      icon={icon}
      tint={tint}
      width="lg"
      trigger={
        <>
          <span>{label}</span>
          <span className="text-[0.76rem] font-semibold text-[var(--casa-muted)] tabular-nums">{rows.length}</span>
          <span aria-hidden="true" className="ml-auto text-[var(--casa-muted)] [&_svg]:size-4">
            {Icon.chevronRight}
          </span>
        </>
      }
      triggerClassName={cn(TRIGGER, className ?? 'w-full')}
    >
      <PanelList rows={rows} chips={chips} listClassName={listClassName} />
    </SidePanel>
  );
}

/** The same button as a link, where „all" is a list of its own (an agency's bookings in the Buchungen list). */
export function MoreLink({ href, label, count, className }: { href: string; label: string; count: number; className?: string }) {
  return (
    <Link href={href} className={cn(TRIGGER, className ?? 'w-full')}>
      <span>{label}</span>
      <span className="text-[0.76rem] font-semibold text-[var(--casa-muted)] tabular-nums">{count}</span>
      <span aria-hidden="true" className="ml-auto text-[var(--casa-muted)] [&_svg]:size-4">
        {Icon.chevronRight}
      </span>
    </Link>
  );
}

function PanelList({ rows, chips, listClassName }: { rows: readonly PanelRow[]; chips?: readonly { key: string; label: string }[]; listClassName: string }) {
  const { t, lang } = useWsLang();
  const [chip, setChip] = useState<string>('all');
  const [query, setQuery] = useState('');
  const euro = (n: number) => n.toLocaleString(wsLocale(lang), { style: 'currency', currency: 'EUR' });

  const shownChips = useMemo(
    () => (chips ?? []).map((c) => ({ ...c, n: rows.filter((r) => r.chip === c.key).length })).filter((c) => c.n > 0),
    [chips, rows]
  );
  const groups = useMemo(() => {
    const words = query.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
    const out: { label: string | null; rows: PanelRow[]; sum: number | null }[] = [];
    for (const row of rows) {
      if (chip !== 'all' && row.chip !== chip) continue;
      if (words.length && !words.every((w) => (row.search ?? '').toLocaleLowerCase('de').includes(w))) continue;
      const label = row.at ? new Date(row.at).toLocaleDateString(wsLocale(lang), { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }) : null;
      const last = out.at(-1);
      if (last && last.label === label) last.rows.push(row);
      else out.push({ label, rows: [row], sum: null });
      const group = out.at(-1)!;
      if (row.amount != null) group.sum = (group.sum ?? 0) + row.amount;
    }
    return out;
  }, [rows, chip, query, lang]);

  const choice = (key: string, label: string, n: number) => (
    <button
      key={key}
      type="button"
      aria-pressed={chip === key}
      onClick={() => setChip(key)}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-semibold whitespace-nowrap ring-1 transition-colors outline-none ring-inset focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
        chip === key ? 'bg-[var(--casa-ink-deep)] text-white ring-transparent' : 'bg-white text-[var(--casa-ink)] ring-ws-line hover:bg-ws-sunk'
      )}
    >
      {label}
      <span className={cn('text-[0.72rem] tabular-nums', chip === key ? 'text-white/70' : 'text-[var(--casa-muted)]')}>{n}</span>
    </button>
  );

  return (
    <div className="px-6 pb-8">
      <div className="sticky top-0 z-[2] -mx-6 mb-5 space-y-3 border-b border-ws-line-soft bg-white/95 px-6 pt-4 pb-4 backdrop-blur">
        <SearchBox value={query} onChange={setQuery} placeholder={t('Suchen', 'Search')} />
        {shownChips.length > 1 ? (
          <div role="group" aria-label={t('Art', 'Kind')} className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {choice('all', t('Alle', 'All'), rows.length)}
            {shownChips.map((c) => choice(c.key, c.label, c.n))}
          </div>
        ) : null}
      </div>

      {groups.length ? (
        <div className="space-y-6">
          {groups.map((group, i) => (
            <section key={`${group.label ?? ''}-${i}`} aria-label={group.label ?? undefined}>
              {group.label ? (
                <h3 className="mb-1.5 flex items-center gap-3 text-[0.76rem] font-semibold text-[var(--casa-muted)]">
                  {group.label}
                  <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-[#d3dbe6] to-transparent" />
                  {group.sum != null ? <span className="font-semibold text-[var(--casa-ink)] tabular-nums">{euro(group.sum)}</span> : null}
                </h3>
              ) : null}
              <ul className={listClassName}>
                {group.rows.map((row) => (
                  <li key={row.key}>{row.node}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-[0.86rem] text-[var(--casa-muted)]">{t('Nichts gefunden.', 'Nothing found.')}</p>
      )}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--casa-muted)] [&_svg]:size-4">
        {Icon.search}
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-full border border-ws-line bg-white pr-3 pl-9 text-[0.84rem] outline-none placeholder:text-[var(--casa-text-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
      />
    </label>
  );
}

/**
 * A list kept whole because it is the one staff work from (a group's learners), with a search once it
 * is longer than `from` rows: the rows that do not match are hidden, nothing is taken away.
 */
export function SearchableRows({
  rows,
  from = 15,
  placeholder,
  listClassName,
  searchClassName = 'px-4 pt-3 pb-1',
}: {
  rows: readonly PanelRow[];
  from?: number;
  placeholder: string;
  listClassName?: string;
  searchClassName?: string;
}) {
  const [query, setQuery] = useState('');
  const words = query.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
  const shown = words.length ? rows.filter((r) => words.every((w) => (r.search ?? '').toLocaleLowerCase('de').includes(w))) : rows;
  const { t } = useWsLang();
  return (
    <>
      {rows.length > from ? (
        <div className={searchClassName}>
          <SearchBox value={query} onChange={setQuery} placeholder={placeholder} />
        </div>
      ) : null}
      <ul className={listClassName}>
        {shown.map((row) => (
          <li key={row.key}>{row.node}</li>
        ))}
      </ul>
      {words.length && !shown.length ? <p className="px-4 py-6 text-center text-[0.86rem] text-[var(--casa-muted)]">{t('Nichts gefunden.', 'Nothing found.')}</p> : null}
    </>
  );
}
