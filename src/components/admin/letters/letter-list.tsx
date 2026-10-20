'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DateText } from '@/components/admin/date-text';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { SidePanel } from '@/components/admin/side-panel';
import { wsLocale } from '@/lib/admin/i18n';
import type { LetterKind } from '@/lib/admin/letters/types';
import { cn } from '@/lib/utils';

import { LetterKindIcon } from './letter-kind';

/** One letter in a record's list, its words already in the page's language. */
export type LetterRow = {
  id: string;
  kind: LetterKind;
  /** What kind of letter, in words: „Buchungsbestätigung". */
  kindLabel: string;
  /** Its subject, where the list names letters by it (a learner's, an organisation's). */
  subject?: string | null;
  /** Who sent it. */
  by?: string | null;
  /** „Fassung 2" and the like. */
  note?: string | null;
  sentAt: string;
};

/**
 * A record's letters without the wall (2026-10-20, Rahman: „briefe also has similar issues … show a few,
 * like comments, and show the rest in sidebar"). SchoolMan's letters came across with the learners: 37 on
 * one booking, 87 on one learner, 864 on one organisation. The card or tab shows the newest few; „Alle
 * Briefe" opens every one at the side, by month, narrowed to one kind or found by a word.
 *
 * `side` is the narrow column's list (a booking, a registration); `tab` the record tab's rows.
 */
export function LetterList({
  rows,
  total,
  variant,
  title,
}: {
  rows: LetterRow[];
  /** How many there are in all, when fewer were loaded. */
  total?: number;
  variant: 'side' | 'tab';
  title: string;
}) {
  const { t } = useWsLang();
  const shown = variant === 'side' ? 5 : 8;
  const all = Math.max(total ?? 0, rows.length);
  return (
    <>
      <ul className={variant === 'side' ? '-my-1 space-y-0.5' : 'py-1.5'}>
        {rows.slice(0, shown).map((row) => (
          <li key={row.id}>
            <LetterLine row={row} variant={variant} />
          </li>
        ))}
      </ul>
      {rows.length > shown ? (
        <SidePanel
          title={title}
          icon={Icon.mail}
          tint="blue"
          width="lg"
          trigger={
            <>
              <span>{t('Alle Briefe', 'All letters')}</span>
              <span className="text-[0.76rem] font-semibold text-[var(--casa-muted)] tabular-nums">{all}</span>
              <span aria-hidden="true" className="ml-auto text-[var(--casa-muted)] [&_svg]:size-4">
                {Icon.chevronRight}
              </span>
            </>
          }
          triggerClassName={cn(
            'flex h-10 items-center gap-2 rounded-xl bg-[#f6f8fb] px-3.5 text-[0.82rem] font-semibold text-[var(--casa-ink)] ring-1 ring-[#e1e7ef] ring-inset transition-colors outline-none hover:bg-[#eef2f7] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
            variant === 'side' ? 'mt-4 w-full' : 'mx-4 mt-1 mb-4 w-[calc(100%-2rem)]'
          )}
        >
          <AllLetters rows={rows} total={all} />
        </SidePanel>
      ) : null}
    </>
  );
}

function LetterLine({ row, variant }: { row: LetterRow; variant: 'side' | 'tab' }) {
  if (variant === 'side') {
    return (
      <Link href={`/admin/letters/${row.id}`} className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-ws-sunk">
        <LetterKindIcon kind={row.kind} />
        <span className="min-w-0 flex-1 truncate font-semibold">
          {row.kindLabel}
          {row.note ? <span className="font-medium text-[var(--casa-muted)]"> · {row.note}</span> : null}
        </span>
        <span className="shrink-0 text-xs text-[var(--casa-muted)]">
          <DateText value={row.sentAt} compact />
        </span>
      </Link>
    );
  }
  const detail = [row.subject ? row.kindLabel : null, row.note, row.by].filter(Boolean).join(' · ');
  return (
    <Link href={`/admin/letters/${row.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--ws-row-hover)]">
      <LetterKindIcon kind={row.kind} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.88rem] font-semibold text-[var(--casa-ink)]">{row.subject || row.kindLabel}</span>
        {/* The kind under the subject, never twice when there is no subject. */}
        {detail ? <span className="mt-0.5 block truncate text-[0.78rem] text-[var(--casa-muted)]">{detail}</span> : null}
      </span>
      <span className="shrink-0 text-[0.76rem] text-[var(--casa-muted)] tabular-nums">
        <DateText value={row.sentAt} compact />
      </span>
    </Link>
  );
}

/** Every letter: the kinds as chips (the most frequent first), a search, and the letters under their month. */
function AllLetters({ rows, total }: { rows: LetterRow[]; total: number }) {
  const { t, lang } = useWsLang();
  const [kind, setKind] = useState<LetterKind | 'all'>('all');
  const [query, setQuery] = useState('');

  const kinds = useMemo(() => {
    const counts = new Map<LetterKind, { label: string; n: number }>();
    for (const row of rows) {
      const seen = counts.get(row.kind);
      counts.set(row.kind, { label: row.kindLabel, n: (seen?.n ?? 0) + 1 });
    }
    return [...counts.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.n - a.n);
  }, [rows]);

  const months = useMemo(() => {
    const words = query.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
    const groups: { label: string; rows: LetterRow[] }[] = [];
    for (const row of rows) {
      if (kind !== 'all' && row.kind !== kind) continue;
      const text = [row.subject, row.kindLabel, row.by, row.note].filter(Boolean).join(' ').toLocaleLowerCase('de');
      if (!words.every((w) => text.includes(w))) continue;
      const label = new Date(row.sentAt).toLocaleDateString(wsLocale(lang), { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
      if (groups.at(-1)?.label === label) groups.at(-1)!.rows.push(row);
      else groups.push({ label, rows: [row] });
    }
    return groups;
  }, [rows, kind, query, lang]);

  const chip = (key: LetterKind | 'all', label: string, n: number) => (
    <button
      key={key}
      type="button"
      aria-pressed={kind === key}
      onClick={() => setKind(key)}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-semibold whitespace-nowrap ring-1 transition-colors outline-none ring-inset focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
        kind === key ? 'bg-[var(--casa-ink-deep)] text-white ring-transparent' : 'bg-white text-[var(--casa-ink)] ring-ws-line hover:bg-ws-sunk'
      )}
    >
      {label}
      <span className={cn('text-[0.72rem] tabular-nums', kind === key ? 'text-white/70' : 'text-[var(--casa-muted)]')}>{n}</span>
    </button>
  );

  return (
    <div className="px-6 pb-8">
      <div className="sticky top-0 z-[2] -mx-6 mb-5 space-y-3 border-b border-ws-line-soft bg-white/95 px-6 pt-4 pb-4 backdrop-blur">
        <label className="relative block">
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--casa-muted)] [&_svg]:size-4">
            {Icon.search}
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Briefe durchsuchen', 'Search the letters')}
            aria-label={t('Briefe durchsuchen', 'Search the letters')}
            className="h-9 w-full rounded-full border border-ws-line bg-white pr-3 pl-9 text-[0.84rem] outline-none placeholder:text-[var(--casa-text-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
          />
        </label>
        {kinds.length > 1 ? (
          <div role="group" aria-label={t('Art des Briefs', 'Kind of letter')} className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chip('all', t('Alle', 'All'), rows.length)}
            {kinds.map((k) => chip(k.key, k.label, k.n))}
          </div>
        ) : null}
      </div>

      {months.length ? (
        <div className="space-y-6">
          {months.map((month) => (
            <section key={month.label} aria-label={month.label}>
              <h3 className="mb-1.5 flex items-center gap-3 text-[0.76rem] font-semibold text-[var(--casa-muted)]">
                {month.label}
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-[#d3dbe6] to-transparent" />
              </h3>
              <ul className="-mx-4">
                {month.rows.map((row) => (
                  <li key={row.id}>
                    <LetterLine row={row} variant="tab" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {total > rows.length ? (
            <p className="text-center text-[0.8rem] text-[var(--casa-muted)]">
              {t(`Die letzten ${rows.length} von ${total}`, `The latest ${rows.length} of ${total}`)}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="py-10 text-center text-[0.86rem] text-[var(--casa-muted)]">{t('Nichts gefunden.', 'Nothing found.')}</p>
      )}
    </div>
  );
}
