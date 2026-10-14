import type { ReactNode } from 'react';

import { Meter } from '@/components/admin/ui';
import { wsLocale, type WsLang } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

/**
 * Small pieces the Courses and Exams lists share: the grouping by month,
 * short dates, the seat line, the table that lets a panel open from a cell,
 * and a sentence-case formatter for stored labels that arrive in mixed case
 * ("Intensive Block", "evening").
 */

/** Items in order, split where the key changes. The input is already sorted. */
export function groupRuns<T>(items: readonly T[], key: (item: T) => string): { key: string; items: T[] }[] {
  const groups: { key: string; items: T[] }[] = [];
  for (const item of items) {
    const k = key(item);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(item);
    else groups.push({ key: k, items: [item] });
  }
  return groups;
}

/** `2026-10` for a date, from its local components (a Postgres `date` is local midnight). */
export function monthKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** "October" for a `monthKey` this year, "January 2027" for another; in the workspace's language. */
export function monthLabel(key: string, lang: WsLang, thisYear = new Date().getFullYear()): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(wsLocale(lang), {
    month: 'long',
    ...(year === thisYear ? {} : { year: 'numeric' }),
  });
}

/**
 * "26 Oct", or "Fri 2 Oct" with the weekday. No year: the month group above
 * says which year. Local components, like `DateText`, so a Postgres `date`
 * keeps its day.
 */
export function shortDate(value: Date | string, lang: WsLang, { weekday = false } = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(wsLocale(lang), {
    day: 'numeric',
    month: 'short',
    ...(weekday ? { weekday: 'short' } : {}),
  });
}

/**
 * "Intensive Block" → "Intensive block", "evening" → "Evening",
 * "custom_corporate" → "Custom corporate". A word that is not plain
 * title case (an acronym, a code) is left as written.
 */
export function sentenceCase(value: string): string {
  const words = value.replace(/[_-]+/g, ' ').trim().split(/\s+/);
  return words
    .map((word, index) => {
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return /^[A-Z][a-z]+$/.test(word) ? word.toLowerCase() : word;
    })
    .join(' ');
}

/** A cell of an `OpenTable`: the workspace table's side padding and 20px edges; each cell sets its height. */
export const openCell = 'px-4 align-middle first:pl-5 last:pr-5';

/**
 * The workspace table's look (a quiet head, 20px edges), without a scrolling
 * wrapper on wider screens, so a panel opened from a cell (the room picker)
 * is not clipped by the table. Rows carry no background of their own: the
 * card behind them is white, and a square row corner would otherwise cover
 * the card's rounded border.
 */
export function OpenTable({
  head,
  children,
}: {
  head: readonly { label: ReactNode; align?: 'left' | 'right'; className?: string }[];
  children: ReactNode;
}) {
  return (
    <div className="max-md:overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ws-line-soft">
            {head.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={cn(
                  'px-4 py-2.5 text-xs font-medium whitespace-nowrap text-[var(--casa-text-subtle)] first:pl-5 last:pr-5',
                  column.align === 'right' ? 'text-right' : 'text-left',
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ws-line-soft">{children}</tbody>
      </table>
    </div>
  );
}

/**
 * Taken of capacity, a short bar once anyone has taken a seat, and a note
 * after it (full, nearly full, booked). An empty cohort is a quiet "0 / 15"
 * with no bar: a row of empty bars read as twenty problems.
 */
export function SeatLine({
  taken,
  capacity,
  label,
  warn = false,
  note,
}: {
  taken: number;
  capacity: number;
  label: string;
  warn?: boolean;
  note?: ReactNode;
}) {
  return (
    <span className="flex items-center gap-3 text-[0.84rem] tabular-nums">
      <span
        className={cn(
          'w-12 shrink-0 whitespace-nowrap',
          taken > 0 ? 'font-semibold text-[var(--casa-ink)]' : 'text-[var(--casa-text-subtle)]'
        )}
      >
        {taken}
        <span className="font-normal text-[var(--casa-text-subtle)]"> / {capacity || '?'}</span>
      </span>
      <span className="w-16 shrink-0">
        {taken > 0 ? (
          <Meter value={taken} max={capacity || taken} label={label} tone={warn ? 'warning' : 'accent'} />
        ) : null}
      </span>
      {note ? <span className="shrink-0 text-xs whitespace-nowrap">{note}</span> : null}
    </span>
  );
}
