import Link from 'next/link';

import { getI18n } from '@/lib/admin/i18n.server';
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
export async function Pagination({
  basePath,
  page,
  total,
  params,
  pageSize = PAGE_SIZE,
}: {
  basePath: string;
  page: number;
  total: number;
  /** The current search params, so the filter and query survive a page change. */
  params: Record<string, string | string[] | undefined>;
  pageSize?: number;
}) {
  const pages = pageCount(total, pageSize);
  const { t } = await getI18n();

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

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={t('Seiten', 'Pagination')}
      className="mt-4 flex items-center justify-between gap-4 text-xs"
    >
      <p className="font-semibold text-[var(--casa-text-subtle)] tabular-nums">
        {t(`${first}–${last} von ${total}`, `${first}–${last} of ${total}`)}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className="inline-flex h-8 items-center rounded-lg border border-ws-line-firm bg-white px-3 font-semibold text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/45 hover:text-[var(--casa-accent-text)]"
          >
            {t('Zurück', 'Previous')}
          </Link>
        ) : null}
        {page < pages ? (
          <Link
            href={hrefFor(page + 1)}
            className="inline-flex h-8 items-center rounded-lg border border-ws-line-firm bg-white px-3 font-semibold text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/45 hover:text-[var(--casa-accent-text)]"
          >
            {t('Weiter', 'Next')}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
