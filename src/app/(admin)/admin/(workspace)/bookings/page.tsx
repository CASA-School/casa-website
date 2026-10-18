import { BookingLightDot, BookingLightLabel } from '@/components/admin/booking-light';
import { dayRange, euros, ListBar, ListEmpty, ListGroup, RecordName } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import {
  BOOKING_STATUS_LABELS,
  bookingCounts,
  bookingLight,
  bookingLightLabel,
  bookingsOwed,
  listBookings,
  OBSERVATION_REASON_LABELS,
  type BookingFilter,
  type BookingListItem,
} from '@/lib/admin/bookings';
import { addDays } from '@/lib/admin/offers/stay';
import { todayInputValue, toDateInputValue } from '@/lib/dates';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { pick, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * Bookings.
 *
 * A booking is created from a person or a registration, never from here — the
 * list is where you find one. Every row carries the team's colour from SchoolMan
 * (docs/schoolman/bookings.md): green all good, yellow under observation, grey
 * „Offen" (SchoolMan’s „unklar") until paid in full, red cancelled. The views are the team's work
 * lists: what is running (ending soon first), what is coming (starting soon
 * first), what is still owed (most first), what is under observation and not
 * over, then the past and the cancelled. The tabs carry the counts; the line
 * above says only the sum owed (2026-10-18).
 *
 * Money is two figures: the total charged, and the balance still open — the
 * one the team looks at first, in a calm amber while something is owed and a
 * quiet "Paid" once it is settled. Paid is total minus balance and needs no
 * column of its own.
 */

const VIEWS: { key: BookingFilter; label: Bilingual }[] = [
  { key: 'current', label: { de: 'Laufend', en: 'Current' } },
  { key: 'upcoming', label: { de: 'Kommend', en: 'Upcoming' } },
  { key: 'unclear', label: { de: 'Zahlung offen', en: 'Unpaid' } },
  { key: 'watch', label: { de: 'Unter Beobachtung', en: 'Under observation' } },
  { key: 'followup', label: { de: 'Wiedervorlage', en: 'Follow-up' } },
  { key: 'past', label: { de: 'Vergangen', en: 'Past' } },
  { key: 'cancelled', label: { de: 'Storniert', en: 'Cancelled' } },
  { key: 'all', label: { de: 'Alle', en: 'All' } },
];

/** Two weeks: "soon" for a course that starts or ends — the team's NewStart and End lists. */
const SOON_DAYS = 14;

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
  // A cancelled booking owes nothing more; only a credit — a refund due — is still news.
  if (open > 0 && b.status === 'cancelled') return null;
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

  // Running ones split by whether they end within two weeks, coming ones by whether they start
  // within two weeks; the other views are one list.
  const soon = addDays(todayInputValue(), SOON_DAYS);
  const endsSoon = (b: BookingListItem) => (toDateInputValue(b.endDate) || '9999') <= soon;
  const startsSoon = (b: BookingListItem) => (toDateInputValue(b.startDate) || '9999') <= soon;
  // Who needs a room is „Aufenthalte" (/admin/accommodation/stays), where a stay is also placed.
  const groups =
    filter === 'current'
      ? [
          { key: 'ending', label: t('Enden bald', 'Ending soon'), rows: items.filter(endsSoon) },
          { key: 'running', label: t('Laufen weiter', 'Running on'), rows: items.filter((b) => !endsSoon(b)) },
        ].filter((g) => g.rows.length)
      : filter === 'upcoming'
        ? [
            { key: 'starting', label: t('Starten bald', 'Starting soon'), rows: items.filter(startsSoon) },
            { key: 'later', label: t('Später', 'Later'), rows: items.filter((b) => !startsSoon(b)) },
          ].filter((g) => g.rows.length)
        : [{ key: filter, label: '', rows: items }];
  const span = 5;
  const hide = 'hidden md:table-cell';
  const href = (key: BookingFilter) => `/admin/bookings${key === 'current' ? '' : `?filter=${key}`}`;

  return (
    <>
      <PageHeader title={t('Buchungen', 'Bookings')} />

      {/* What is still owed across all bookings: the one figure the tabs do not carry. */}
      <p className="-mt-3 mb-6 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        {owed.amount > 0.005 ? (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-2 rounded-full bg-[#e0a100]" />
            <b className="font-semibold text-[#9a5b00] tabular-nums">{euros(owed.amount)}</b>
            {t('offen', 'owed')}
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
            placeholder: t('Name, Buchungsnummer oder Kurs', 'Name, booking number or course'),
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
              { label: t('Stand', 'Standing'), className: `w-[12rem] ${hide}` },
              { label: t('Gesamt', 'Total'), align: 'right' as const, className: `w-[8rem] ${hide}` },
              { label: t('Offen', 'Balance'), align: 'right' as const, className: 'w-[8.5rem]' },
            ]}
          >
            {groups.map((group) => [
              group.label ? <ListGroup key={group.key} label={group.label} count={group.rows.length} span={span} /> : null,
              ...group.rows.map((b) => {
                const light = bookingLight(b);
                const lightLabel = pick(lang, bookingLightLabel(b));
                const about = [b.courseTypeName, b.status === 'reserved' ? pick(lang, BOOKING_STATUS_LABELS.reserved) : null].filter(Boolean).join(' · ');
                return (
                <TableRow key={b.id} interactive>
                  <Cell href={`/admin/bookings/${b.id}`} className="max-w-0">
                    <span className="flex items-center gap-2">
                      <span className="md:hidden">
                        <BookingLightDot light={light} label={lightLabel} />
                      </span>
                      <RecordName name={b.personName} reference={b.number} about={about || undefined} />
                    </span>
                  </Cell>
                  <Cell className={`text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums ${hide}`}>{when(b, lang)}</Cell>
                  <Cell className={`max-w-0 ${hide}`}>
                    <BookingLightLabel
                      light={light}
                      label={lightLabel}
                      detail={light === 'watch' && b.observationReason ? pick(lang, OBSERVATION_REASON_LABELS[b.observationReason]) : undefined}
                    />
                  </Cell>
                  <Cell align="right" className={`whitespace-nowrap text-[#2b3546] tabular-nums ${hide}`}>
                    {b.charged !== 0 ? money(b.charged, b.currency) : null}
                  </Cell>
                  <Cell align="right" className="whitespace-nowrap tabular-nums">
                    <Balance b={b} t={t} />
                  </Cell>
                </TableRow>
                );
              }),
            ])}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/bookings" page={page} total={total} params={params} />
    </>
  );
}
