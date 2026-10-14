import { ListBar, type ListTab } from './list';
import { capitalise, pick, relativeDays, translator, wsLocale, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import { STATUS_LABELS, WORK_STATUSES, type WorkStatus } from '@/lib/admin/queues';

/**
 * The parts every inbound queue shares (enquiries, registrations,
 * applications), in the workspace's one list design (docs/ADMIN_WORKSPACE.md
 * §Lists): the views and the search across the top of the card, the rows
 * grouped by status, and when each came in.
 *
 * The filter is a link per view, not a select: the URL carries it (`?status=`,
 * `?q=`, `page`), so a colleague can bookmark "open enquiries" and send it on.
 * "Open" is first and the default — the only view that answers the question
 * staff arrive with. It reads in groups (New, In progress, Waiting on them), so
 * those three are not tabs of their own: a tab that only repeats a group of
 * Open goes. The closed states follow when they hold records, then Everything.
 */

export type QueueFilter = WorkStatus | 'open' | 'all';

/** The states a record is still being worked in — the groups of Open. */
const OPEN_STATUSES: readonly WorkStatus[] = ['new', 'in_progress', 'waiting'];

const FILTER_LABELS: Record<QueueFilter, Bilingual> = {
  open: { de: 'Offen', en: 'Open' },
  ...STATUS_LABELS,
  all: { de: 'Alle', en: 'Everything' },
};

export function QueueToolbar({
  basePath,
  active,
  counts,
  search,
  searchPlaceholder,
  lang,
}: {
  basePath: string;
  active: QueueFilter;
  /** Per-status totals, plus `open` and `all`. A zero shows no count. */
  counts: Partial<Record<QueueFilter, number>>;
  search?: string;
  searchPlaceholder: string;
  lang: WsLang;
}) {
  const hrefFor = (filter: QueueFilter) => {
    const params = new URLSearchParams();
    if (filter !== 'open') params.set('status', filter);
    if (search) params.set('q', search);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const filters: QueueFilter[] = [
    'open',
    // A bookmarked `?status=new` still shows where it is.
    ...OPEN_STATUSES.filter((status) => status === active),
    ...WORK_STATUSES.filter((status) => !OPEN_STATUSES.includes(status) && ((counts[status] ?? 0) > 0 || status === active)),
    'all',
  ];

  const tabs: ListTab[] = filters.map((filter) => ({
    key: filter,
    label: pick(lang, FILTER_LABELS[filter]),
    href: hrefFor(filter),
    count: counts[filter],
  }));

  return (
    <ListBar
      tabs={tabs}
      active={active}
      search={{
        action: basePath,
        value: search,
        placeholder: searchPlaceholder,
        keep: { status: active === 'open' ? undefined : active },
      }}
    />
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

/**
 * A queue's rows in groups by status: Open and Everything read in groups, and
 * the group is the status, so no row repeats it. A single-status view is one
 * group its tab already names, so it has no group row.
 */
export function queueGroups<T extends { status: WorkStatus }>(
  items: readonly T[],
  filter: QueueFilter,
  lang: WsLang
): { key: string; label: string; rows: T[] }[] {
  if (filter !== 'open' && filter !== 'all') return [{ key: filter, label: '', rows: [...items] }];

  return WORK_STATUSES.map((status) => ({
    key: status,
    label: pick(lang, STATUS_LABELS[status]),
    rows: items.filter((item) => item.status === status),
  })).filter((group) => group.rows.length > 0);
}

/** A new record older than this has waited too long, and says so. */
const STALE_AFTER_DAYS = 2;

const daysSince = (value: Date) => {
  const midnight = (d: Date) => new Date(d).setHours(0, 0, 0, 0);
  return Math.round((midnight(new Date()) - midnight(value)) / 86_400_000);
};

/**
 * When it came in, as relative time ("Today", "3 days ago"; "Heute", "Vor 3
 * Tagen"). A record still new after two days shows its age in amber, so what
 * is getting old stands out without a column of its own.
 */
export function Received({ at, status, lang }: { at: Date; status: WorkStatus; lang: WsLang }) {
  const label = capitalise(relativeDays(at, lang));
  const stale = status === 'new' && daysSince(at) > STALE_AFTER_DAYS;

  return (
    <time
      dateTime={at.toISOString()}
      title={at.toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' })}
      className={stale ? 'font-semibold text-[#9a5b00]' : undefined}
    >
      {label}
    </time>
  );
}

/** The column heads every queue ends with: who has it, and when it came in. */
export function queueTailHead(lang: WsLang) {
  const t = translator(lang);
  return [
    { label: t('Zuständig', 'Owner'), className: 'hidden w-[4.5rem] md:table-cell' },
    { label: t('Eingegangen', 'Received'), className: 'w-[8.5rem]' },
  ] as const;
}

/** The empty view's one line. */
export function queueEmptyTitle(lang: WsLang, filter: QueueFilter, search?: string): string {
  const t = translator(lang);
  if (search) return t(`Nichts passt zu „${search}“`, `Nothing matches “${search}”`);
  return filter === 'open' ? t('Nichts offen', 'Nothing open') : t('Hier ist nichts', 'Nothing here');
}
