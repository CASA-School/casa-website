import type { ReactNode } from 'react';

import { Meter } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

/**
 * Small pieces the Courses and Exams lists share: the month column and the
 * grouping behind it, short dates, and a sentence-case formatter for stored
 * labels that arrive in mixed case ("Intensive Block", "evening").
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

/** "Oct 2026" for a `monthKey`. */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/**
 * "26 Oct", or "Fri 02 Oct" with the weekday. No year: the month column
 * beside it says which year, and a range names the end's year only when it
 * differs. Local components, like `DateText`, so a Postgres `date` keeps its day.
 */
export function shortDate(value: Date | string, { weekday = false, year = false } = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    ...(weekday ? { weekday: 'short' } : {}),
    ...(year ? { year: 'numeric' } : {}),
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

/**
 * The agenda column: the month, on the first row of each month only. A month
 * heading row of its own doubled the height of a list that has one or two
 * dates a month; a label in its own column reads as a calendar at no cost.
 */
export function MonthCell({ label }: { label: string | null }) {
  return (
    <td className="w-24 px-4 py-2.5 align-middle text-xs font-extrabold whitespace-nowrap text-[var(--casa-ink)]">
      {label}
    </td>
  );
}

/** Row class: the last row of a month gets the firmer rule, so months read as blocks. */
export function monthEdge(isLast: boolean): string | undefined {
  return isLast ? 'border-ws-line' : undefined;
}

/**
 * The workspace table's look, without a scrolling wrapper on wider screens, so
 * a panel opened from a cell (the room picker) is not clipped by the table.
 * Rows carry no background of their own: the card behind them is white, and a
 * square row corner would otherwise cover the card's rounded border.
 */
export function OpenTable({
  head,
  children,
  className,
}: {
  head: readonly { label: ReactNode; align?: 'left' | 'right'; className?: string }[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-md:overflow-x-auto', className)}>
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ws-line bg-[#f8fafc]">
            {head.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={cn(
                  'px-4 py-2.5 text-xs font-bold whitespace-nowrap text-[var(--casa-muted)]',
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
 * Taken of capacity, the bar beside it on the same line, and a short note
 * after it (full, nearly full, booked). One line, so a row stays one line.
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
    <span className="flex items-center gap-3 text-sm tabular-nums">
      <span className="w-14 shrink-0 whitespace-nowrap text-[var(--casa-ink)]">
        {taken}
        <span className="text-[var(--casa-text-subtle)]"> / {capacity || '?'}</span>
      </span>
      <span className="min-w-10 flex-1">
        <Meter value={taken} max={capacity || taken || 1} label={label} tone={warn ? 'warning' : 'accent'} />
      </span>
      {note ? <span className="shrink-0 text-xs whitespace-nowrap">{note}</span> : null}
    </span>
  );
}
