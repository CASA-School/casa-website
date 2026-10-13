import type { ReactNode } from 'react';

import { ListBar, ListEmpty, ListGroup, Owner, Status } from '@/components/admin/list';
import { ButtonLink, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { firstParam } from '@/lib/admin/paging';
import {
  listPlacementAttempts,
  placementCounts,
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
 * The line under the title is not decoration. Every one of the 163 items in
 * the bank is `PILOT_UNREVIEWED` (CLAUDE.md rule 6) and the engine is in shadow
 * mode, so a teacher reading this screen has to know that the level in the
 * "Recommended" column is a course recommendation from an unreviewed
 * instrument — not a measurement they are being asked to rubber-stamp. It sits
 * as one quiet line, so it is read once and does not shout on every visit.
 *
 * The list is the workspace's one list design (docs/ADMIN_WORKSPACE.md §Lists):
 * the views across the top of the card, rows grouped by the day they came in
 * (rule 8), the latest few first — `?show=all` lists every attempt in the view.
 * It says only what the tab does not: on "Awaiting a teacher" every row needs a
 * teacher, so there is no decision column; a fully answered test is the normal
 * case, so only a partial one is noted; the language a test was taken in is a
 * column only when the rows differ in it. An attempt carries no name until a
 * teacher attaches a person to the decision, so the rows have nothing to name.
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

/** "Today", "Yesterday", or "Thu 8 Oct" (with the year when it is not this one). */
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
    day: 'numeric',
    month: 'short',
    ...(year === Number(today.slice(0, 4)) ? {} : { year: 'numeric' }),
  });
}

const STAGE_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  abandoned: 'Abandoned',
};

const language = (locale: string) => (locale === 'de' ? 'German' : 'English');

type Column = { label: string; align?: 'left' | 'right'; className?: string };

/** Below tablet width a row keeps the recommendation and its time; the rest waits for the record. */
const WIDE = 'hidden md:table-cell';

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

  const [{ items, total }, counts] = await Promise.all([
    listPlacementAttempts({
      filter,
      limit: showAll ? SHOW_ALL_LIMIT : FIRST_VIEW,
      offset: 0,
    }),
    placementCounts(),
  ]);

  const now = new Date();
  const days: { key: string; items: PlacementListItem[] }[] = [];
  for (const item of items) {
    const key = dayKey.format(item.submittedAt ?? item.createdAt);
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(item);
    else days.push({ key, items: [item] });
  }

  const testing = filter === 'in_progress';
  // A teacher's decision is a column where the view holds decided rows.
  const decided = filter === 'confirmed' || filter === 'all';
  // The same language on every row is noise; it is a column only when the rows differ.
  const languages = new Set(items.map((item) => item.locale)).size > 1;

  const columns: Column[] = testing
    ? [{ label: 'Started' }, ...(languages ? [{ label: 'Language', className: `${WIDE} w-[8rem]` }] : [])]
    : [
        // The level is short; the slack goes after the confidence, so a row reads left to right.
        { label: 'Recommended', className: 'w-[9rem]' },
        { label: 'Confidence', className: WIDE },
        ...(decided
          ? [
              { label: filter === 'confirmed' ? 'Confirmed' : 'Decision', className: `${WIDE} w-[12rem]` },
              { label: 'Teacher', className: `${WIDE} w-[5rem]` },
            ]
          : []),
        ...(languages ? [{ label: 'Language', className: `${WIDE} w-[8rem]` }] : []),
        { label: 'Submitted', className: 'w-[6.5rem]' },
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

      <p className="-mt-2 mb-4 flex items-start gap-2.5 text-[0.8rem] leading-relaxed text-[var(--casa-muted)]">
        <span aria-hidden="true" className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-[#d97706]" />
        <span>
          <span className="font-semibold text-[var(--casa-ink)]">Pilot test, {RELEASE_MODE} mode.</span> Items
          unreviewed, cut scores provisional. A recommendation is evidence to weigh — never a pass, a fail or a
          certificate.
        </span>
      </p>

      <Card
        bleed
        footer={
          items.length > 0 && (total > items.length || showAll) ? (
            <div className="flex items-center justify-between gap-4 text-xs">
              <p className="font-semibold text-[var(--casa-text-subtle)] tabular-nums">
                {total > items.length ? `Latest ${items.length} of ${total}` : `All ${total}`}
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
        <ListBar
          tabs={FILTERS.map((option) => ({
            key: option.key,
            label: option.label,
            href: hrefFor(option.key),
            count: counts[option.key],
          }))}
          active={filter}
        />

        {items.length === 0 ? (
          <ListEmpty title={filter === 'needs_review' ? 'Nothing waiting' : 'Nothing here'} />
        ) : (
          <Table head={columns}>
            {days.flatMap((day, index) => [
              // An unsubmitted attempt sorts last, so a day can come round twice in Everything.
              <ListGroup key={`${day.key}-${index}`} label={dayLabel(day.key, now)} count={day.items.length} span={columns.length} />,
              ...day.items.map((item) => (
                <AttemptRow key={item.id} item={item} testing={testing} decided={decided} filter={filter} languages={languages} />
              )),
            ])}
          </Table>
        )}
      </Card>
    </>
  );
}

const CONFIDENCE_TONE: Record<string, string> = {
  high: 'text-[var(--casa-muted)]',
  medium: 'text-[var(--casa-ink)]',
  low: 'font-semibold text-[#9a5b00]',
};

/** What became of an attempt, in the Everything view: a dot and the word. */
function decision(item: PlacementListItem): ReactNode {
  if (item.confirmedLevel) return <Status tone="positive">{item.confirmedLevel} confirmed</Status>;
  if (!item.recommendedBand) return <Status tone="quiet">Still testing</Status>;
  if (item.needsReview) return <Status tone="accent">Needs a teacher</Status>;
  return <Status tone="neutral">Unconfirmed</Status>;
}

function AttemptRow({
  item,
  testing,
  decided,
  filter,
  languages,
}: {
  item: PlacementListItem;
  testing: boolean;
  decided: boolean;
  filter: PlacementFilter;
  languages: boolean;
}) {
  const href = `/admin/placement/${item.id}`;
  const partial = item.answeredShare !== null && item.answeredShare < 1;
  const at = item.submittedAt ?? item.createdAt;
  const time = <time dateTime={at.toISOString()}>{timeOfDay.format(at)}</time>;
  const languageCell = languages ? (
    <Cell className={`${WIDE} text-[0.84rem] text-[var(--casa-muted)]`}>{language(item.locale)}</Cell>
  ) : null;

  if (testing) {
    return (
      <TableRow interactive>
        <Cell href={href} className="max-w-0 text-[0.84rem] font-medium tabular-nums">
          {time}
          {STAGE_LABELS[item.status] ? (
            <span className="ml-2 text-[0.8rem] font-normal text-[var(--casa-text-subtle)]">{STAGE_LABELS[item.status]}</span>
          ) : null}
        </Cell>
        {languageCell}
      </TableRow>
    );
  }

  return (
    <TableRow interactive>
      <Cell href={href} className="text-[0.95rem] font-bold whitespace-nowrap tabular-nums">
        {item.recommendedBand}
      </Cell>

      <Cell className={`${WIDE} text-[0.84rem] whitespace-nowrap`}>
        {item.confidence ? (
          <span className={CONFIDENCE_TONE[item.confidence]}>
            {CONFIDENCE_COPY[item.confidence as keyof typeof CONFIDENCE_COPY] ?? item.confidence}
          </span>
        ) : null}
        {partial ? (
          <span className="ml-2 text-[0.8rem] text-[#9a5b00]">{Math.round((item.answeredShare ?? 0) * 100)}% answered</span>
        ) : null}
      </Cell>

      {decided ? (
        <>
          <Cell className={`${WIDE} text-[0.84rem] whitespace-nowrap`}>
            {filter === 'confirmed' ? <span className="font-bold">{item.confirmedLevel}</span> : decision(item)}
          </Cell>
          <Cell className={WIDE}>
            <Owner name={item.reviewerName} />
          </Cell>
        </>
      ) : null}

      {languageCell}

      <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)] tabular-nums">{time}</Cell>
    </TableRow>
  );
}
