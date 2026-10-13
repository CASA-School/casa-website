import Link from 'next/link';

import { Icon } from '@/components/admin/icons';
import {
  ButtonLink,
  Card,
  Cell,
  EmptyState,
  IconChip,
  PageHeader,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { firstParam } from '@/lib/admin/paging';
import {
  listPlacementAttempts,
  type PlacementFilter,
  type PlacementListItem,
} from '@/lib/admin/placement';
import { CONFIDENCE_COPY } from '@/lib/admin/placement-copy';
import { RELEASE_MODE } from '@/config/placement/policy';

/**
 * The placement review queue.
 *
 * `db/migrations/0005_placement_test.sql` says in its own header that it
 * carries no staff-review tables because "review belongs to the CASA dashboard
 * workspace". This is that surface, and it is the one screen in the workspace
 * that changes an outcome for a learner rather than a status on a record.
 *
 * The banner at the top is not decoration. Every one of the 163 items in the
 * bank is `PILOT_UNREVIEWED` (CLAUDE.md rule 6) and the engine is in shadow
 * mode, so a teacher reading this screen has to know that the number in the
 * "recommended" column is a hypothesis from an unreviewed instrument — not a
 * measurement they are being asked to rubber-stamp.
 *
 * The list says only what the tab does not: on "Awaiting a teacher" every row
 * needs a teacher, so there is no decision column; a fully answered test is
 * the normal case, so only a partial one is noted. Rows are grouped by the day
 * they came in, and the first view holds the latest few — `?show=all` lists
 * every attempt in the tab. An attempt carries no name until a teacher
 * attaches a person to the decision, so the rows have nothing to name.
 */
const FILTERS: readonly { key: PlacementFilter; label: string }[] = [
  { key: 'needs_review', label: 'Awaiting a teacher' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'Still testing' },
  { key: 'all', label: 'Everything' },
];

/** The first view: enough to work from without a 2,000px page. */
const FIRST_VIEW = 25;
/** "Show all" is still bounded, so a mistyped link cannot ask for a million rows. */
const SHOW_ALL_LIMIT = 5000;

const ZONE = 'Europe/Berlin';
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeOfDay = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' });

/** "Today", "Yesterday", or "Thu 08 Oct" (with the year when it is not this one). */
function dayLabel(key: string, now: Date): string {
  const today = dayKey.format(now);
  const yesterday = dayKey.format(new Date(now.getTime() - 86_400_000));
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    ...(year === Number(today.slice(0, 4)) ? {} : { year: 'numeric' }),
  });
}

const STAGE_LABELS: Record<string, string> = {
  in_progress: 'In progress',
  submitted: 'Submitted',
  abandoned: 'Abandoned',
};

export default async function PlacementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = firstParam(params.filter);
  const filter: PlacementFilter = FILTERS.some((f) => f.key === raw)
    ? (raw as PlacementFilter)
    : 'needs_review';
  const showAll = firstParam(params.show) === 'all';

  const { items, total } = await listPlacementAttempts({
    filter,
    limit: showAll ? SHOW_ALL_LIMIT : FIRST_VIEW,
    offset: 0,
  });

  const now = new Date();
  const days: { key: string; items: PlacementListItem[] }[] = [];
  for (const item of items) {
    const key = dayKey.format(item.submittedAt ?? item.createdAt);
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(item);
    else days.push({ key, items: [item] });
  }

  const testing = filter === 'in_progress';
  const decisionHead =
    filter === 'confirmed' ? 'Confirmed' : filter === 'all' ? 'Decision' : null;
  // Still testing: nothing is scored yet, so the row is when it started and in which language.
  const columns = testing
    ? ['Started', 'Language']
    : [
        'Recommended',
        'Confidence',
        ...(decisionHead ? [decisionHead] : []),
        'Language',
        { label: 'Submitted', align: 'right' as const },
      ];
  const hrefFor = (key: PlacementFilter, all = false) => {
    const query = new URLSearchParams();
    if (key !== 'needs_review') query.set('filter', key);
    if (all) query.set('show', 'all');
    const qs = query.toString();
    return qs ? `/admin/placement?${qs}` : '/admin/placement';
  };

  return (
    <>
      <PageHeader title="Placement" />

      <div className="mb-4 flex items-start gap-3 rounded-3xl border border-ws-line bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <IconChip icon={Icon.attention} tint="sun" />
        <p className="text-sm leading-relaxed text-[var(--casa-ink)]">
          <span className="font-extrabold">Pilot test · {RELEASE_MODE} mode.</span>{' '}
          <span className="text-[var(--casa-text-subtle)]">
            Items unreviewed, cut scores provisional. A recommendation is evidence to weigh — never a
            pass, a fail or a certificate.
          </span>
        </p>
      </div>

      <div className="mb-5 flex max-w-full w-fit gap-0.5 overflow-x-auto rounded-xl border border-ws-line bg-white p-1 [scrollbar-width:none]">
        {FILTERS.map((option) => {
          const isActive = option.key === filter;

          return (
            <Link
              key={option.key}
              href={hrefFor(option.key)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'inline-flex h-[30px] shrink-0 items-center rounded-lg px-3 text-[0.8rem] font-bold whitespace-nowrap transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                isActive
                  ? 'bg-[var(--casa-ink-deep)] text-white'
                  : 'text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={
            filter === 'needs_review'
              ? 'Nothing is waiting on a teacher'
              : 'No attempts to show'
          }
          description={
            filter === 'needs_review'
              ? 'A completed placement test appears here as soon as it is scored.'
              : 'Switch the filter to Everything to see attempts in other states.'
          }
        />
      ) : (
        <Card
          bleed
          footer={
            total > items.length || showAll ? (
              <div className="flex items-center justify-between gap-4 text-xs">
                <p className="font-semibold text-[var(--casa-text-subtle)] tabular-nums">
                  {total > items.length
                    ? `Latest ${items.length} of ${total}`
                    : `All ${total}`}
                </p>
                {showAll ? (
                  total > FIRST_VIEW ? (
                    <ButtonLink href={hrefFor(filter)} size="sm">
                      Show latest {FIRST_VIEW}
                    </ButtonLink>
                  ) : null
                ) : (
                  <ButtonLink href={hrefFor(filter, true)} size="sm">
                    Show all {total}
                  </ButtonLink>
                )}
              </div>
            ) : undefined
          }
        >
          <Table head={columns}>
            {days.flatMap((day) => [
              <tr key={day.key} className="bg-white">
                <th
                  scope="colgroup"
                  colSpan={columns.length}
                  className="px-4 pt-5 pb-2 text-left text-xs font-extrabold text-[var(--casa-ink)]"
                >
                  {dayLabel(day.key, now)}
                </th>
              </tr>,
              ...day.items.map((item) => (
                <AttemptRow key={item.id} item={item} testing={testing} decision={decisionHead} />
              )),
            ])}
          </Table>
        </Card>
      )}
    </>
  );
}

const CONFIDENCE_TONE: Record<string, string> = {
  high: 'text-[var(--casa-text-subtle)]',
  medium: 'text-[var(--casa-ink)]',
  low: 'font-semibold text-[var(--casa-warning-text)]',
};

function AttemptRow({
  item,
  testing,
  decision,
}: {
  item: PlacementListItem;
  testing: boolean;
  decision: 'Confirmed' | 'Decision' | null;
}) {
  const href = `/admin/placement/${item.id}`;
  const partial = item.answeredShare !== null && item.answeredShare < 1;
  const at = item.submittedAt ?? item.createdAt;
  const time = <time dateTime={at.toISOString()}>{timeOfDay.format(at)}</time>;

  if (testing) {
    return (
      <TableRow interactive>
        <Cell href={href} className="w-40 text-sm font-semibold tabular-nums">
          {time}
          {item.status !== 'in_progress' ? (
            <span className="ml-2 text-xs font-normal text-[var(--casa-text-subtle)]">
              {STAGE_LABELS[item.status] ?? item.status}
            </span>
          ) : null}
        </Cell>
        <Cell className="text-sm text-[var(--casa-text-subtle)]">
          {item.locale === 'de' ? 'German' : 'English'}
        </Cell>
      </TableRow>
    );
  }

  return (
    <TableRow interactive>
      <Cell href={href} className="font-extrabold">
        {item.recommendedBand ?? (
          <span className="text-sm font-normal text-[var(--casa-text-subtle)]">Not scored yet</span>
        )}
      </Cell>

      <Cell className="text-sm">
        {item.confidence ? (
          <span className={CONFIDENCE_TONE[item.confidence]}>
            {CONFIDENCE_COPY[item.confidence as keyof typeof CONFIDENCE_COPY] ?? item.confidence}
          </span>
        ) : (
          <span className="text-[var(--casa-text-subtle)]">—</span>
        )}
        {partial ? (
          <span className="ml-2 text-xs text-[var(--casa-warning-text)]">
            {Math.round((item.answeredShare ?? 0) * 100)}% answered
          </span>
        ) : null}
      </Cell>

      {decision ? (
        <Cell className="text-sm">
          {item.confirmedLevel ? (
            <span>
              <span className="font-bold">{item.confirmedLevel}</span>
              {item.reviewerName ? (
                <span className="text-xs text-[var(--casa-text-subtle)]"> · {item.reviewerName}</span>
              ) : null}
            </span>
          ) : item.needsReview ? (
            <span className="font-semibold text-[var(--casa-ink)]">Needs a teacher</span>
          ) : item.recommendedBand ? (
            <span className="text-[var(--casa-text-subtle)]">Unconfirmed</span>
          ) : (
            <span className="text-[var(--casa-text-subtle)]">In progress</span>
          )}
        </Cell>
      ) : null}

      <Cell className="text-sm text-[var(--casa-text-subtle)]">
        {item.locale === 'de' ? 'German' : 'English'}
      </Cell>
      <Cell align="right" className="text-xs text-[var(--casa-text-subtle)] tabular-nums">
        {time}
      </Cell>
    </TableRow>
  );
}
