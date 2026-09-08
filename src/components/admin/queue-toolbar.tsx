import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Icon } from './icons';
import { Button, Input } from './ui';
import { STATUS_LABELS, WORK_STATUSES, type WorkStatus } from '@/lib/admin/queues';

/**
 * Filter chips plus a search box, above every queue.
 *
 * The filter is a link per state, not a select: the current filter has to be
 * visible without opening anything, the counts belong beside the labels, and a
 * URL that carries the filter means a staff member can bookmark "my open
 * enquiries" and send it to a colleague.
 *
 * "Open" is first and is the default. It is the only view that answers the
 * question staff actually arrive with, and defaulting to "all" would greet
 * someone with two years of closed records.
 */

export type QueueFilter = WorkStatus | 'open' | 'all';

const FILTER_ORDER: readonly QueueFilter[] = ['open', ...WORK_STATUSES, 'all'];

const FILTER_LABELS: Record<QueueFilter, string> = {
  open: 'Open',
  ...STATUS_LABELS,
  all: 'Everything',
};

export function QueueToolbar({
  basePath,
  active,
  counts,
  search,
  searchPlaceholder,
}: {
  basePath: string;
  active: QueueFilter;
  /** Per-status totals, plus `open` and `all`. Missing keys render no count. */
  counts: Partial<Record<QueueFilter, number>>;
  search?: string;
  searchPlaceholder: string;
}) {
  const hrefFor = (filter: QueueFilter) => {
    const params = new URLSearchParams();
    if (filter !== 'open') params.set('status', filter);
    if (search) params.set('q', search);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
        {FILTER_ORDER.filter(
          // A state nobody has used is noise. `open` and `all` always show.
          (filter) => filter === 'open' || filter === 'all' || (counts[filter] ?? 0) > 0
        ).map((filter) => {
          const isActive = filter === active;
          const count = counts[filter];

          return (
            <Link
              key={filter}
              href={hrefFor(filter)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                isActive
                  ? 'bg-[var(--casa-ink-deep)] text-white'
                  : 'border border-ws-line bg-white text-[var(--casa-text-subtle)] hover:border-ws-line-firm hover:text-[var(--casa-ink)]'
              )}
            >
              {FILTER_LABELS[filter]}
              {typeof count === 'number' ? (
                <span className={isActive ? 'text-white/70' : 'text-[var(--casa-text-subtle)]'}>
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <form action={basePath} className="flex w-full gap-2 sm:w-auto">
        {active !== 'open' ? <input type="hidden" name="status" value={active} /> : null}
        <div className="relative flex-1 sm:w-64">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--casa-text-subtle)]"
          >
            {Icon.search}
          </span>
          <Input
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder={searchPlaceholder}
            aria-label="Search"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
    </div>
  );
}

/** Reads the `status` search param into a filter, defaulting to `open`. */
export function parseFilter(raw: string | string[] | undefined): QueueFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (value === 'all') return 'all';
  if (value && (WORK_STATUSES as readonly string[]).includes(value)) {
    return value as WorkStatus;
  }

  return 'open';
}
