import Link from 'next/link';
import { BookingLightDot } from '@/components/admin/booking-light';
import { dayRange, euros, ListBar, ListEmpty, ListGroup, RecordName } from '@/components/admin/list';
import { Icon } from '@/components/admin/icons';
import { Pagination } from '@/components/admin/pagination';
import { RowActions, type RowAction } from '@/components/admin/row-actions';
import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import {
  BOOKING_STATUS_LABELS,
  bookingTypeChoices,
  bookingYearList,
  PAYER_LABELS,
  type Payer,
  bookingCounts,
  bookingLight,
  bookingLightLabel,
  listBookings,
  type BookingFilter,
  type BookingListItem,
} from '@/lib/admin/bookings';
import { groupByMonth, monthHeading } from '@/lib/admin/days';
import { requireModule } from '@/lib/admin/guard';
import { addDays } from '@/lib/admin/offers/stay';
import { todayInputValue, toDateInputValue } from '@/lib/dates';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { isUuid } from '@/lib/admin/ids';
import { organisationName } from '@/lib/admin/organisations';
import { pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { SessionMark } from '@/components/admin/session-mark';
import { BookingFilters } from './booking-filters';
import { owesMoney } from '@/lib/admin/open-money';
import { mailHref } from '@/lib/admin/mail/href';

/**
 * Bookings.
 *
 * A booking is created from a person or a registration, never from here — the
 * list is where you find one. Every row carries the team's colour from SchoolMan
 * (docs/schoolman/bookings.md) as a dot before the name, its word on hover: green
 * all good, yellow under observation, grey until paid in full, red cancelled —
 * the team reads the colours, not the words (Rahman, 2026-10-18), and yellow is
 * set from the dot on the learner's or the booking's page. The views are the
 * team's work lists: what is running (ending soon first), what is coming
 * (starting soon first), what is still owed (most first), the follow-ups due,
 * then the past and the cancelled. The tabs carry the counts; the line above
 * says only the sum owed.
 *
 * Money is two figures: the total charged, and the balance still open — the
 * one the team looks at first, in a calm amber while something is owed and a
 * quiet "Paid" once it is settled. Paid is total minus balance and needs no
 * column of its own.
 *
 * In months (Rahman, 2026-10-21: „add year and month … upcoming, ongoing and past, so the bookings with
 * money from the past could be quickly followed up with … an action button"): what is coming after the
 * next two weeks by the month it starts, the past with what is still owed first and then by the month
 * it ended, all and cancelled by the month they start. Each row ends in its actions — a payment, a
 * reminder, the confirmation, an e-mail, the learner — with „Erinnern" as a button where money is open
 * and the view is about money.
 */

const VIEWS: { key: BookingFilter; label: Bilingual }[] = [
  { key: 'current', label: { de: 'Laufend', en: 'Current' } },
  { key: 'upcoming', label: { de: 'Kommend', en: 'Upcoming' } },
  { key: 'unclear', label: { de: 'Zahlung offen', en: 'Unpaid' } },
  { key: 'followup', label: { de: 'Wiedervorlage', en: 'Follow-up' } },
  { key: 'past', label: { de: 'Vergangen', en: 'Past' } },
  { key: 'cancelled', label: { de: 'Storniert', en: 'Cancelled' } },
  { key: 'all', label: { de: 'Alle', en: 'All' } },
];

/** Two weeks: "soon" for a course that starts or ends — the team's NewStart and End lists. */
const SOON_DAYS = 14;

/** Still owed: a booking that is not cancelled with more charged than paid. */
const owes = (b: BookingListItem) => b.status !== 'cancelled' && owesMoney(b.charged - b.paid);

const money = (n: number, currency: string) =>
  currency === 'EUR'
    ? euros(n)
    : new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

function when(b: BookingListItem, lang: WsLang): string {
  const from = toDateInputValue(b.startDate);
  const to = toDateInputValue(b.endDate);
  return from && to ? dayRange(from, to, lang) : '';
}

/** When a reminder went out: „erinnert 12.3.2025", under what is still open. */
const remindedOn = (b: BookingListItem, lang: WsLang) =>
  b.remindedAt ? new Date(b.remindedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Berlin' }) : null;

function Balance({ b, t, lang }: { b: BookingListItem; t: T; lang: WsLang }) {
  if (b.charged === 0 && b.paid === 0) return null;
  const open = b.charged - b.paid;
  if (Math.abs(open) < 0.005) return <span className="text-[0.8rem] text-[var(--casa-text-subtle)]">{t('Bezahlt', 'Paid')}</span>;
  // A leftover under 5 € counts as paid (`owesMoney`): said, quietly, not chased.
  if (open > 0 && !owesMoney(open)) {
    return (
      <span className="text-[0.8rem] text-[var(--casa-text-subtle)]">
        {t('Bezahlt', 'Paid')} <span className="text-[0.72rem]">· {t(`Rest ${money(open, b.currency)}`, `${money(open, b.currency)} left`)}</span>
      </span>
    );
  }
  // A cancelled booking owes nothing more; only a credit — a refund due — is still news.
  if (open > 0 && b.status === 'cancelled') return null;
  if (open > 0) {
    const reminded = remindedOn(b, lang);
    return (
      <>
        <span className="font-semibold text-[#9a5b00]">{money(open, b.currency)}</span>
        {reminded ? <span className="block text-[0.72rem] font-normal text-[var(--casa-muted)]">{t(`erinnert ${reminded}`, `reminded ${reminded}`)}</span> : null}
      </>
    );
  }
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
  // From an organisation's page: only the bookings it pays (2026-10-20).
  const rawPayer = firstParam(params.org);
  const payerId = rawPayer && isUuid(rawPayer) ? rawPayer : undefined;
  // The filters at the side (2026-10-21): the year (of a booking's first day), who pays, the course type.
  const rawYear = firstParam(params.year);
  const year = rawYear && /^\d{4}$/.test(rawYear) ? Number(rawYear) : undefined;
  const rawPayerKind = firstParam(params.payer);
  const payer = (['self', 'agency', 'company'] as const).find((p) => p === rawPayerKind) as Payer | undefined;
  const rawType = firstParam(params.type);
  const typeId = rawType === 'exam' || (rawType && isUuid(rawType)) ? rawType : undefined;
  const narrow = { payerId, year, payer, typeId };

  const [{ items, total }, counts, payerName, { t, lang }, user, years, types] = await Promise.all([
    listBookings({ filter, search, limit: PAGE_SIZE, offset: offsetFor(page), ...narrow }),
    bookingCounts(narrow),
    payerId ? organisationName(payerId) : Promise.resolve(null),
    getI18n(),
    requireModule('bookings'),
    bookingYearList(narrow),
    bookingTypeChoices(),
  ]);
  const canEdit = canAccess(user, 'bookings', 'edit');
  const typeName = typeId === 'exam' ? t('Prüfungen', 'Exams') : types.find((ty) => ty.id === typeId)?.name;

  // Running ones split by whether they end within two weeks; coming ones start with the next two weeks,
  // then go by month; the past starts with what is still owed. A view about money or follow-ups is one list.
  const soon = addDays(todayInputValue(), SOON_DAYS);
  const endsSoon = (b: BookingListItem) => (toDateInputValue(b.endDate) || '9999') <= soon;
  const startsSoon = (b: BookingListItem) => (toDateInputValue(b.startDate) || '9999') <= soon;
  const months = (rows: BookingListItem[], at: (b: BookingListItem) => Date | null) => [
    ...groupByMonth(
      rows.filter((b) => at(b)),
      (b) => at(b)!
    ).map(({ month, rows: inMonth }) => ({ key: month, label: monthHeading(month, lang), rows: inMonth })),
    { key: 'undated', label: t('Ohne Termin', 'No dates'), rows: rows.filter((b) => !at(b)) },
  ];
  // Who needs a room is „Aufenthalte" (/admin/accommodation/stays), where a stay is also placed.
  const groups = (
    filter === 'current'
      ? [
          { key: 'ending', label: t('Enden bald', 'Ending soon'), rows: items.filter(endsSoon) },
          { key: 'running', label: t('Laufen weiter', 'Running on'), rows: items.filter((b) => !endsSoon(b)) },
        ]
      : filter === 'upcoming'
        ? [
            { key: 'starting', label: t('Starten bald', 'Starting soon'), rows: items.filter(startsSoon) },
            ...months(
              items.filter((b) => !startsSoon(b)),
              (b) => b.startDate
            ),
          ]
        : filter === 'past'
          ? [
              { key: 'owing', label: t('Noch offen', 'Still owed'), rows: items.filter(owes) },
              ...months(
                items.filter((b) => !owes(b)),
                (b) => b.endDate
              ),
            ]
          : filter === 'all' || filter === 'cancelled'
            ? months(items, (b) => b.startDate)
            : [{ key: filter, label: '', rows: items }]
  ).filter((g) => g.rows.length);
  // The step the view is for, as a button: a reminder where money is the question.
  const remindHere = filter === 'unclear' || filter === 'past';
  const actionsOf = (b: BookingListItem): { primary: RowAction | null; actions: RowAction[] } => {
    const remind: RowAction = { label: t('Zahlungserinnerung', 'Payment reminder'), href: `/admin/bookings/${b.id}/letter?kind=reminder`, icon: Icon.mail };
    const primary = canEdit && remindHere && owes(b) ? { ...remind, label: t('Erinnern', 'Remind') } : null;
    const actions: RowAction[] = [
      ...(canEdit && b.status !== 'cancelled'
        ? [{ label: t('Zahlung erfassen', 'Record payment'), href: `/admin/bookings/${b.id}?pay=1`, icon: Icon.money }]
        : []),
      ...(canEdit && owes(b) && !primary ? [remind] : []),
      ...(canEdit ? [{ label: t('Buchungsbestätigung', 'Booking confirmation'), href: `/admin/bookings/${b.id}/letter?kind=confirmation`, icon: Icon.statement }] : []),
      ...(b.personEmail
        ? [{ label: t(`E-Mail an ${b.personName}`, `Email ${b.personName}`), href: mailHref('person', b.personId, { subject: b.number, address: b.personEmail, back: '/admin/bookings' }), icon: Icon.mail, divide: canEdit }]
        : []),
      { label: t('Zur Person', 'Open the learner'), href: `/admin/people/${b.personId}`, icon: Icon.person, divide: !b.personEmail && canEdit },
    ];
    return { primary, actions };
  };
  const span = 5;
  const hide = 'hidden md:table-cell';
  // The total gives way first on a narrower screen: the balance is the figure the team acts on.
  const hideLg = 'hidden lg:table-cell';
  // A view's address keeps the filters; `without` drops one of them, for its label's ×.
  const query = (key: BookingFilter, without?: 'year' | 'payer' | 'type' | 'org') =>
    new URLSearchParams(
      Object.entries({
        filter: key === 'current' ? undefined : key,
        org: without === 'org' ? undefined : payerId,
        year: without === 'year' || !year ? undefined : String(year),
        payer: without === 'payer' ? undefined : payer,
        type: without === 'type' ? undefined : typeId,
      }).filter((e): e is [string, string] => Boolean(e[1]))
    ).toString();
  const href = (key: BookingFilter, without?: 'year' | 'payer' | 'type' | 'org') => {
    const q = query(key, without);
    return `/admin/bookings${q ? `?${q}` : ''}`;
  };
  const chips = [
    payerId ? { key: 'org' as const, label: t(`Bezahlt von ${payerName ?? '…'}`, `Paid by ${payerName ?? '…'}`) } : null,
    year ? { key: 'year' as const, label: String(year) } : null,
    payer ? { key: 'payer' as const, label: pick(lang, PAYER_LABELS[payer]) } : null,
    typeName ? { key: 'type' as const, label: typeName } : null,
  ].filter((c): c is { key: 'org' | 'year' | 'payer' | 'type'; label: string } => c !== null);

  return (
    <>
      <PageHeader title={t('Buchungen', 'Bookings')} />

      {/* The filters in force, each with its ×: the list says what it is narrowed to, the panel changes it. */}
      {chips.length ? (
        <p className="-mt-3 mb-5 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pr-1.5 pl-3 text-[0.8rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line">
              {chip.label}
              <Link
                href={href(filter, chip.key)}
                aria-label={t(`Filter „${chip.label}" entfernen`, `Remove the filter “${chip.label}”`)}
                className="grid size-5 place-items-center rounded-full text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)] [&_svg]:size-3"
              >
                {Icon.close}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <Card bleed>
        <ListBar
          tabs={VIEWS.map((v) => ({ key: v.key, label: pick(lang, v.label), href: href(v.key), count: counts[v.key] }))}
          active={filter}
          search={{
            action: '/admin/bookings',
            value: search,
            placeholder: t('Name, Buchungsnummer (auch SchoolMan) oder Kurs', 'Name, booking number (SchoolMan too) or course'),
            keep: { filter: filter === 'current' ? undefined : filter, org: payerId, year: year ? String(year) : undefined, payer, type: typeId },
          }}
          end={
            <BookingFilters
              base={{ filter: filter === 'current' ? undefined : filter, org: payerId, q: search || undefined }}
              year={year}
              payer={payer}
              typeId={typeId}
              years={years}
              types={types}
              payers={(['self', 'agency', 'company'] as const).map((value) => ({ value, label: pick(lang, PAYER_LABELS[value]) }))}
              canTotals={canAccess(user, 'prices', 'view')}
            />
          }
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
              { label: t('Gesamt', 'Total'), align: 'right' as const, className: `w-[8rem] ${hideLg}` },
              { label: t('Offen', 'Balance'), align: 'right' as const, className: 'w-[8.5rem]' },
              { label: '', className: remindHere && canEdit ? 'w-[8rem]' : 'w-[3.5rem]' },
            ]}
          >
            {groups.map((group) => [
              group.label ? <ListGroup key={group.key} label={group.label} count={group.rows.length} span={span} /> : null,
              ...group.rows.map((b) => {
                const light = bookingLight(b);
                const lightLabel = pick(lang, bookingLightLabel(b));
                const aboutText = [
                  b.courseTypeName,
                  b.groupName ? t(`Gruppe ${b.groupName}`, `Group ${b.groupName}`) : null,
                  b.status === 'reserved' ? pick(lang, BOOKING_STATUS_LABELS.reserved) : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                // The course's part of the day as its colour, before its name (2026-10-21).
                const about = aboutText ? (
                  <>
                    {b.session && b.courseTypeName ? <SessionMark session={b.session} lang={lang} className="mr-1.5" /> : null}
                    {aboutText}
                  </>
                ) : null;
                return (
                <TableRow key={b.id} interactive>
                  <Cell href={`/admin/bookings/${b.id}`} className="max-w-0">
                    {/* The team's colour before the name, as SchoolMan colours the record; its word on hover. */}
                    <span className="flex items-center gap-2.5">
                      <span className="relative z-20 inline-flex">
                        <BookingLightDot light={light} label={lightLabel} size="md" />
                      </span>
                      <RecordName name={b.personName} reference={b.number} about={about || undefined} />
                    </span>
                  </Cell>
                  <Cell className={`text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums ${hide}`}>{when(b, lang)}</Cell>
                  <Cell align="right" className={`whitespace-nowrap text-[#2b3546] tabular-nums ${hideLg}`}>
                    {b.charged !== 0 ? money(b.charged, b.currency) : null}
                  </Cell>
                  <Cell align="right" className="whitespace-nowrap tabular-nums">
                    <Balance b={b} t={t} lang={lang} />
                  </Cell>
                  <Cell align="right">
                    <RowActions label={t(`Aktionen: ${b.personName}, ${b.number}`, `Actions: ${b.personName}, ${b.number}`)} {...actionsOf(b)} />
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
