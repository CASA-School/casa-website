import Link from 'next/link';

import { pageCount, PAGE_SIZE } from '@/lib/admin/paging';

/**
 * Previous / next, with a position readout.
 *
 * Not numbered pages. A queue is worked from the top and its order changes as
 * records are worked, so "page 7" is not a stable place — it names a different
 * set of records tomorrow. Previous and next are honest about that; the readout
 * gives the sense of scale that numbered pages were really being used for.
 *
 * Renders nothing when everything fits on one page, rather than a disabled
 * control, so a clear queue does not end in dead furniture.
 */
export function Pagination({
  basePath,
  page,
  total,
  params,
}: {
  basePath: string;
  page: number;
  total: number;
  /** The current search params, so the filter and query survive a page change. */
  params: Record<string, string | string[] | undefined>;
}) {
  const pages = pageCount(total);

  if (pages <= 1) {
    return null;
  }

  const hrefFor = (target: number) => {
    const next = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (key === 'page' || value === undefined) continue;
      next.set(key, Array.isArray(value) ? (value[0] ?? '') : value);
    }

    if (target > 1) next.set('page', String(target));

    const query = next.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <nav
      aria-label="Pagination"
      className="mt-5 flex items-center justify-between gap-4 text-xs"
    >
      <p className="text-[var(--casa-text-subtle)]">
        {first}–{last} of {total}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className="rounded-lg border border-ws-line bg-white px-3 py-1.5 font-semibold transition-colors hover:border-ws-line-firm"
          >
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link
            href={hrefFor(page + 1)}
            className="rounded-lg border border-ws-line bg-white px-3 py-1.5 font-semibold transition-colors hover:border-ws-line-firm"
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
