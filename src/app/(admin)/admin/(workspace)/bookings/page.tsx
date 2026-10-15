import { dayRange, euros, ListBar, ListEmpty, ListGroup, RecordName, Status } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONES,
  bookingCounts,
  bookingsOwed,
  listBookings,
  type BookingFilter,
  type BookingListItem,
} from '@/lib/admin/bookings';
import { toDateInputValue } from '@/lib/dates';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { counted, pick, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { Tally } from '@/components/admin/inbox';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * Bookings.
 *
 * A booking is created from a person or a registration, never from here — the
 * list is where you find one. The views split by time; Current and Upcoming
 * read in groups by what is left to do, the reserved ones first, so the group
 * is the status and no row repeats it (docs/ADMIN_WORKSPACE.md §Lists). A
 * Reserved view of its own only repeated those groups, so it went.
 *
 * Money is two figures: the total charged, and the balance still open — the
 * one the team looks at first, in a calm amber while something is owed and a
 * quiet "Paid" once it is settled. Paid is total minus balance and needs no
 * column of its own.
 */

const VIEWS: { key: BookingFilter; label: Bilingual }[] = [
  { key: 'current', label: { de: 'Laufend', en: 'Current' } },
  { key: 'upcoming', label: { de: 'Kommend', en: 'Upcoming' } },
  { key: 'past', label: { de: 'Vergangen', en: 'Past' } },
  { key: 'cancelled', label: { de: 'Storniert', en: 'Cancelled' } },
  { key: 'all', label: { de: 'Alle', en: 'All' } },
];

const STAGES = [
  { key: 'reserved', label: BOOKING_STATUS_LABELS.reserved },
  { key: 'confirmed', label: BOOKING_STATUS_LABELS.confirmed },
] as const;

const money = (n: number, currency: string) =>
  currency === 'EUR'
    ? euros(n)
    : new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

function when(b: BookingListItem, lang: WsLang): string {
  const from = toDateInputValue(b.startDate);
  const to = toDateInputValue(b.endDate);
  return from && to ? dayRange(from, to, lang) : '';
}

function Balance({ b, t }: { b: BookingListItem; t: T }) {
  if (b.charged === 0 && b.paid === 0) return null;
  const open = b.charged - b.paid;
  if (Math.abs(open) < 0.005) return <span className="text-[0.8rem] text-[var(--casa-text-subtle)]">{t('Bezahlt', 'Paid')}</span>;
  if (open > 0) return <span className="font-semibold text-[#9a5b00]">{money(open, b.currency)}</span>;
  return (
    <>
      <span className="font-semibold">{money(-open, b.currency)}</span>
      <span className="ml-1 text-xs text-[var(--casa-text-subtle)]">{t('Guthaben', 'credit')}</span>
    </>
  );
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawFilter = firstParam(params.filter);
  const filter: BookingFilter = VIEWS.some((v) => v.key === rawFilter) ? (rawFilter as BookingFilter) : 'current';
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const [{ items, total }, counts, owed, { t, lang }] = await Promise.all([
    listBookings({ filter, search, limit: PAGE_SIZE, offset: offsetFor(page) }),
    bookingCounts(),
    bookingsOwed(),
    getI18n(),
  ]);

  const grouped = filter === 'current' || filter === 'upcoming';
  const groups = grouped
    ? STAGES.map((stage) => ({ key: stage.key, label: pick(lang, stage.label), rows: items.filter((b) => b.status === stage.key) })).filter(
        (g) => g.rows.length
      )
    : [{ key: filter, label: '', rows: items }];
  // Where the view cannot group, the status stays as a column: a dot and the word.
  const showStatus = filter === 'past' || filter === 'all';
  const span = showStatus ? 5 : 4;
  const hide = 'hidden md:table-cell';
  const href = (key: BookingFilter) => `/admin/bookings${key === 'current' ? '' : `?filter=${key}`}`;

  return (
    <>
      <PageHeader title={t('Buchungen', 'Bookings')} />

      {/* What is running, what is coming, and what is still owed across all of it. */}
      <p className="-mt-3 mb-6 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        <Tally tone="working" n={counts.current} label={t('laufend', 'current')} lang={lang} />
        <Tally tone="new" n={counts.upcoming} label={t('kommend', 'upcoming')} lang={lang} />
        {owed.amount > 0.005 ? (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-2 rounded-full bg-[#e0a100]" />
            <b className="font-semibold text-[#9a5b00] tabular-nums">{euros(owed.amount)}</b>
            {t(
              `offen in ${counted(lang, owed.bookings, 'Buchung', 'Buchungen')}`,
              `owed on ${counted(lang, owed.bookings, 'booking', 'bookings')}`
            )}
          </span>
        ) : null}
      </p>

      <Card bleed>
        <ListBar
          tabs={VIEWS.map((v) => ({ key: v.key, label: pick(lang, v.label), href: href(v.key), count: counts[v.key] }))}
          active={filter}
          search={{
            action: '/admin/bookings',
            value: search,
            placeholder: t('Name oder Kurs', 'Name or course'),
            keep: { filter: filter === 'current' ? undefined : filter },
          }}
        />
        {items.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : t('Hier gibt es keine Buchungen', 'No bookings here')}>
            {search ? t(`Keine Buchung passt zu „${search}“.`, `No booking matches “${search}”.`) : null}
          </ListEmpty>
        ) : (
          <Table
            head={[
              t('Buchung', 'Booking'),
              { label: t('Zeitraum', 'Dates'), className: `w-[13.5rem] ${hide}` },
              ...(showStatus ? [{ label: t('Status', 'Status'), className: `w-[9rem] ${hide}` }] : []),
              { label: t('Gesamt', 'Total'), align: 'right' as const, className: `w-[8rem] ${hide}` },
              { label: t('Offen', 'Balance'), align: 'right' as const, className: 'w-[8.5rem]' },
            ]}
          >
            {groups.map((group) => [
              group.label ? <ListGroup key={group.key} label={group.label} count={group.rows.length} span={span} /> : null,
              ...group.rows.map((b) => (
                <TableRow key={b.id} interactive>
                  <Cell href={`/admin/bookings/${b.id}`} className="max-w-0">
                    <RecordName name={b.personName} about={b.courseTypeName ?? undefined} />
                  </Cell>
                  <Cell className={`text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums ${hide}`}>{when(b, lang)}</Cell>
                  {showStatus ? (
                    <Cell className={hide}>
                      <Status tone={b.status === 'completed' || b.status === 'cancelled' ? 'quiet' : BOOKING_STATUS_TONES[b.status]}>
                        {pick(lang, BOOKING_STATUS_LABELS[b.status])}
                      </Status>
                    </Cell>
                  ) : null}
                  <Cell align="right" className={`whitespace-nowrap text-[#2b3546] tabular-nums ${hide}`}>
                    {b.charged !== 0 ? money(b.charged, b.currency) : null}
                  </Cell>
                  <Cell align="right" className="whitespace-nowrap tabular-nums">
                    <Balance b={b} t={t} />
                  </Cell>
                </TableRow>
              )),
            ])}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/bookings" page={page} total={total} params={params} />
    </>
  );
}
