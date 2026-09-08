import Link from 'next/link';

import { Pagination } from '@/components/admin/pagination';
import {
  Badge,
  Card,
  Cell,
  DateText,
  EmptyState,
  PageHeader,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { clampPage, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { listPlacementAttempts, type PlacementFilter } from '@/lib/admin/placement';
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
 */
const FILTERS: readonly { key: PlacementFilter; label: string }[] = [
  { key: 'needs_review', label: 'Awaiting a teacher' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'Still testing' },
  { key: 'all', label: 'Everything' },
];

export default async function PlacementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const filter: PlacementFilter = FILTERS.some((f) => f.key === raw)
    ? (raw as PlacementFilter)
    : 'needs_review';
  const page = clampPage(params.page);

  const { items, total } = await listPlacementAttempts({
    filter,
    limit: PAGE_SIZE,
    offset: offsetFor(page),
  });

  return (
    <>
      <PageHeader
        eyebrow="Einstufungstest"
        title="Placement"
        description="CASA's own placement test produces a course recommendation. A teacher confirms the level; the test never does."
      />

      <div className="mb-5 rounded-xl border border-[var(--casa-warning-text)]/28 bg-[var(--casa-warm-soft)] px-5 py-4">
        <p className="text-[0.65rem] font-bold tracking-eyebrow uppercase text-[var(--casa-warning-text)]">
          Pilot instrument · {RELEASE_MODE} mode
        </p>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--casa-ink)]">
          Every item in the bank is awaiting review by two qualified DaF
          reviewers, and the cut scores are pilot hypotheses. Read a
          recommendation as evidence to weigh, not a result to approve — and
          never describe one to a learner as a pass, a fail, or a certificate.
        </p>
      </div>

      <div className="-mx-1 mb-5 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
        {FILTERS.map((option) => {
          const isActive = option.key === filter;

          return (
            <Link
              key={option.key}
              href={
                option.key === 'needs_review'
                  ? '/admin/placement'
                  : `/admin/placement?filter=${option.key}`
              }
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                isActive
                  ? 'bg-[var(--casa-ink-deep)] text-white'
                  : 'border border-ws-line bg-white text-[var(--casa-text-subtle)] hover:border-ws-line-firm hover:text-[var(--casa-ink)]'
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
        <Card bleed>
          <Table
            head={[
              'Recommended',
              'Confidence',
              'Answered',
              'Decision',
              'Language',
              { label: 'Submitted', align: 'right' },
            ]}
          >
            {items.map((item) => (
              <TableRow key={item.id} interactive>
                <Cell href={`/admin/placement/${item.id}`} className="font-semibold">
                  {item.recommendedBand ? (
                    <span className="font-[family-name:var(--font-display)] text-base">
                      {item.recommendedBand}
                    </span>
                  ) : (
                    <span className="text-sm font-normal text-[var(--casa-text-subtle)]">
                      not scored yet
                    </span>
                  )}
                </Cell>
                <Cell className="text-sm">
                  {item.confidence ? (
                    <Badge
                      tone={
                        item.confidence === 'high'
                          ? 'positive'
                          : item.confidence === 'medium'
                            ? 'neutral'
                            : 'warning'
                      }
                    >
                      {CONFIDENCE_COPY[item.confidence as keyof typeof CONFIDENCE_COPY] ??
                        item.confidence}
                    </Badge>
                  ) : (
                    <span className="text-[var(--casa-text-subtle)]">—</span>
                  )}
                </Cell>
                <Cell className="text-sm">
                  {item.answeredShare === null ? (
                    <span className="text-[var(--casa-text-subtle)]">—</span>
                  ) : (
                    `${Math.round(item.answeredShare * 100)}%`
                  )}
                </Cell>
                <Cell className="text-sm">
                  {item.confirmedLevel ? (
                    <span>
                      <Badge tone="positive">{item.confirmedLevel}</Badge>
                      {item.reviewerName ? (
                        <span className="mt-1 block text-xs text-[var(--casa-text-subtle)]">
                          {item.reviewerName}
                        </span>
                      ) : null}
                    </span>
                  ) : item.needsReview ? (
                    <Badge tone="accent">Needs a teacher</Badge>
                  ) : item.recommendedBand ? (
                    <Badge tone="neutral">Unconfirmed</Badge>
                  ) : (
                    <span className="text-[var(--casa-text-subtle)]">in progress</span>
                  )}
                </Cell>
                <Cell className="text-sm text-[var(--casa-text-subtle)]">
                  {item.locale === 'de' ? 'German' : 'English'}
                </Cell>
                <Cell align="right" className="text-xs text-[var(--casa-text-subtle)]">
                  <DateText value={item.submittedAt ?? item.createdAt} compact />
                </Cell>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}

      <Pagination basePath="/admin/placement" page={page} total={total} params={params} />
    </>
  );
}
