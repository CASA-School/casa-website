import Link from 'next/link';

import { Icon } from '@/components/admin/icons';
import { Pagination } from '@/components/admin/pagination';
import {
  Badge,
  Card,
  Cell,
  DateText,
  EmptyState,
  Input,
  PageHeader,
  Table,
  TableRow,
  TINTS,
} from '@/components/admin/ui';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONES,
  bookingCounts,
  listBookings,
  type BookingFilter,
} from '@/lib/admin/bookings';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { cn } from '@/lib/utils';

const FILTERS: { key: BookingFilter; label: string }[] = [
  { key: 'current', label: 'Current' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

const money = (n: number, currency: string) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    n
  );

/**
 * Bookings.
 *
 * A booking is created from a person or a registration, never from here — the
 * list is where you find one. Tabs split by time and state; the balance column
 * is what the team looks at first, so it is the one coloured value in a row:
 * yellow while something is open, green once it is paid.
 */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawFilter = firstParam(params.filter);
  const filter: BookingFilter = FILTERS.some((f) => f.key === rawFilter)
    ? (rawFilter as BookingFilter)
    : 'current';
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const [{ items, total }, counts] = await Promise.all([
    listBookings({ filter, search, limit: PAGE_SIZE, offset: offsetFor(page) }),
    bookingCounts(),
  ]);

  return (
    <>
      <PageHeader
        title="Bookings"
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-ws-line bg-white p-1 [scrollbar-width:none]">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/bookings?filter=${f.key}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
              aria-current={f.key === filter ? 'page' : undefined}
              className={cn(
                'inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-[0.8rem] font-bold whitespace-nowrap transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                f.key === filter
                  ? 'bg-[var(--casa-ink-deep)] text-white'
                  : 'text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'text-xs font-semibold',
                  f.key === filter ? 'text-white/65' : 'text-[var(--casa-text-subtle)]'
                )}
              >
                {counts[f.key]}
              </span>
            </Link>
          ))}
        </div>
        <form method="get" action="/admin/bookings" className="flex w-full gap-2 sm:w-auto">
          <input type="hidden" name="filter" value={filter} />
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
              placeholder="Name or course"
              aria-label="Search bookings"
              className="pl-9"
            />
          </div>
        </form>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={search ? 'Nothing matches that search' : 'No bookings here'}
          description={
            search ? 'Try a shorter term.' : 'Bookings are created from a person or a registration.'
          }
        />
      ) : (
        <Card bleed>
          <Table
            head={[
              'Person',
              'Course',
              'Dates',
              'Status',
              { label: 'Charged', align: 'right' },
              { label: 'Paid', align: 'right' },
              { label: 'Balance', align: 'right' },
            ]}
          >
            {items.map((b) => {
              const balance = b.charged - b.paid;
              return (
                <TableRow key={b.id} interactive>
                  <Cell href={`/admin/bookings/${b.id}`} className="font-semibold">
                    {b.personName}
                  </Cell>
                  <Cell className="text-sm">{b.courseTypeName ?? '—'}</Cell>
                  <Cell className="text-sm text-[var(--casa-text-subtle)]">
                    {b.startDate ? (
                      <>
                        <DateText value={b.startDate} compact /> –{' '}
                        <DateText value={b.endDate} compact />
                      </>
                    ) : (
                      '—'
                    )}
                  </Cell>
                  <Cell>
                    <Badge tone={BOOKING_STATUS_TONES[b.status]}>
                      {BOOKING_STATUS_LABELS[b.status]}
                    </Badge>
                  </Cell>
                  <Cell align="right" className="text-sm">
                    {money(b.charged, b.currency)}
                  </Cell>
                  <Cell align="right" className="text-sm">
                    {money(b.paid, b.currency)}
                  </Cell>
                  <Cell align="right">
                    {/* Colour only where something is owed either way; a
                        settled booking is a plain number. */}
                    <span
                      className={cn(
                        'inline-flex rounded-lg px-2 py-0.5 text-sm font-extrabold',
                        balance > 0 ? TINTS.sun : balance < 0 ? TINTS.red : 'text-[var(--casa-text-subtle)]'
                      )}
                    >
                      {money(balance, b.currency)}
                    </span>
                  </Cell>
                </TableRow>
              );
            })}
          </Table>
        </Card>
      )}

      <Pagination basePath="/admin/bookings" page={page} total={total} params={params} />
    </>
  );
}
