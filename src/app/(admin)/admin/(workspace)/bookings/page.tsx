import Link from 'next/link';

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
 * is what the team looks at first.
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
        eyebrow="School"
        title="Bookings"
        description="Who is booked on what, and what is still owed."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-xl border border-ws-line bg-white p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/bookings?filter=${f.key}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
              aria-current={f.key === filter ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                f.key === filter
                  ? 'bg-[var(--casa-ink-deep)] text-white'
                  : 'text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'text-xs',
                  f.key === filter ? 'text-white/70' : 'text-[var(--casa-text-subtle)]'
                )}
              >
                {counts[f.key]}
              </span>
            </Link>
          ))}
        </div>
        <form method="get" action="/admin/bookings" className="flex w-full max-w-xs gap-2">
          <input type="hidden" name="filter" value={filter} />
          <Input
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder="Name or course"
            aria-label="Search bookings"
          />
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
                  <Cell
                    align="right"
                    className={cn(
                      'text-sm font-semibold',
                      balance > 0
                        ? 'text-[var(--casa-warning-text)]'
                        : balance < 0
                          ? 'text-[var(--casa-danger-text)]'
                          : 'text-[var(--casa-success-text)]'
                    )}
                  >
                    {money(balance, b.currency)}
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
