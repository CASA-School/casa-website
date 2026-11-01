import Link from 'next/link';
import { redirect } from 'next/navigation';
import { adjustBookingContext, BOOKING_CATEGORIES, validBookingMonth } from '@/lib/admin/booking-context';
import { isSession } from '@/lib/admin/day-plan-labels';
import { BookingOverview } from './booking-overview';
import { berlinDay } from '@/lib/admin/days';
import { bookingPeriod, readBookingTask, validBookingDay, BOOKING_SORT_KEYS, type BookingSort } from '@/lib/admin/booking-query';
import { BookingToolbar } from './booking-toolbar';
import { BookingLightDot } from '@/components/admin/booking-light';
import { dayRange, euros, ListBar, ListEmpty, ListGroup, RecordName } from '@/components/admin/list';
import { Icon } from '@/components/admin/icons';
import { Pagination } from '@/components/admin/pagination';
import { RowActions, type RowAction } from '@/components/admin/row-actions';
import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import {
  BOOKING_STATUS_LABELS,
  bookingProgrammeChoices,
  bookingTypeChoices,
  bookingYearList,
  PAYER_LABELS,
  type Payer,
  bookingCounts,
  bookingCategoryCounts,
  bookingContextFacets,
  bookingDemand,
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
import { clampPage, firstParam, offsetFor } from '@/lib/admin/paging';
import { isUuid } from '@/lib/admin/ids';
import { organisationName } from '@/lib/admin/organisations';
import { pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { SessionMark } from '@/components/admin/session-mark';
import { BookingFilters } from './booking-filters';
import { owesMoney } from '@/lib/admin/open-money';
import { mailHref } from '@/lib/admin/mail/href';

/**
 * Course-first booking worklists. Lifecycle choices live in the shared side panel; time, starting
 * level and entry dates follow the actual schedule. The demand strip counts the entire result;
 * the table keeps chronological booking dates, SchoolMan's lights and the existing money/actions.
 */

const VIEWS: { key: BookingFilter; label: Bilingual }[] = [
  { key: 'current', label: { de: 'Laufend', en: 'Current' } },
  { key: 'upcoming', label: { de: 'Kommend', en: 'Upcoming' } },
  { key: 'unclear', label: { de: 'Zahlung offen', en: 'Unpaid' } },
  { key: 'followup', label: { de: 'Wiedervorlage', en: 'Follow-up' } },
  { key: 'past', label: { de: 'Vergangen', en: 'Past' } },
  { key: 'cancelled', label: { de: 'Storniert', en: 'Cancelled' } },
  { key: 'reserved', label: { de: 'Reserviert', en: 'Reserved' } },
  { key: 'all', label: { de: 'Alle Buchungen', en: 'All bookings' } },
];

/** Two weeks: "soon" for a course that starts or ends — the team's NewStart and End lists. */
const SOON_DAYS = 14;
const BOOKINGS_PER_PAGE = 80;
const CATEGORIES = [
  { key: 'all', label: { de: 'Alle Buchungen', en: 'All bookings' } },
  { key: 'intensive', label: { de: 'Intensiv', en: 'Intensive' } },
  { key: 'evening', label: { de: 'Abend', en: 'Evening' } },
  { key: 'exam', label: { de: 'Prüfungen', en: 'Exams' } },
] as const;

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
  const user = await requireModule('bookings');
  const [types, programmes, facets, { t, lang }] = await Promise.all([bookingTypeChoices(), bookingProgrammeChoices(), bookingContextFacets(), getI18n()]);
  const today = berlinDay(new Date());
  const task = readBookingTask(firstParam(params.q) ?? '', types, today);
  if (task.recognized) {
    const canonical = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, firstParam(value) ?? '']));
    const next = adjustBookingContext(canonical, { ...task.params, q: task.search }, facets);
    redirect(`/admin/bookings?${new URLSearchParams(Object.entries(next).filter(([, value]) => Boolean(value)))}`);
  }
  const rawFilter = firstParam(params.filter);
  const filter: BookingFilter = VIEWS.some(v => v.key === rawFilter) ? rawFilter as BookingFilter : 'all';
  const search = (firstParam(params.q) ?? '').slice(0, 200);
  const page = clampPage(params.page);
  const rawPayer = firstParam(params.org);
  const payerId = rawPayer && isUuid(rawPayer) ? rawPayer : undefined;
  const rawYear = firstParam(params.year);
  const year = rawYear && /^\d{4}$/.test(rawYear) ? Number(rawYear) : undefined;
  const payer = (['self', 'agency', 'company'] as const).find(p => p === firstParam(params.payer)) as Payer | undefined;
  const rawType = firstParam(params.type);
  const typeId = rawType === 'exam' || types.some(type => type.id === rawType) ? rawType : undefined;
  const inferredCategory = typeId === 'exam' ? 'exam' : types.find(type => type.id === typeId)?.slug === 'intensive-german' ? 'intensive' : types.find(type => type.id === typeId)?.slug === 'evening-german' ? 'evening' : 'all';
  const category = BOOKING_CATEGORIES.find(c => c === firstParam(params.category)) ?? inferredCategory;
  const rawSession = firstParam(params.session);
  const session = rawSession && isSession(rawSession) ? rawSession : undefined;
  const month = validBookingMonth(firstParam(params.month));
  const start = validBookingDay(firstParam(params.start));
  const programme = programmes.find(p => p.code === firstParam(params.programme))?.code;
  const rawLevel = (firstParam(params.level) ?? '').toUpperCase();
  const level = /^[ABC][12]\+?(?:\.[12])?$/.test(rawLevel) ? rawLevel : undefined;
  const period = ['month', 'next14'].includes(firstParam(params.period) ?? '') ? firstParam(params.period) : undefined;
  const bounds = period ? bookingPeriod(period, today) : { startFrom: validBookingDay(firstParam(params.from)), startTo: validBookingDay(firstParam(params.to)) };
  const sort = BOOKING_SORT_KEYS.find(key => key === firstParam(params.sort));
  const direction = firstParam(params.dir) === 'desc' ? 'desc' : 'asc';
  const narrow = { payerId, year, payer, typeId, programme, category, session, level, month, start, ...bounds };
  const [{ items, total, months: monthCounts }, counts, categoryCounts, demand, payerName, years] = await Promise.all([
    listBookings({ filter, search, limit: BOOKINGS_PER_PAGE, offset: offsetFor(page, BOOKINGS_PER_PAGE), sort, direction, ...narrow }),
    bookingCounts({ ...narrow, search }),
    bookingCategoryCounts({ payerId, year, payer, programme, ...bounds, search, filter }),
    category === 'all' ? Promise.resolve([]) : bookingDemand({ ...narrow, search, filter }),
    payerId ? organisationName(payerId) : Promise.resolve(null),
    bookingYearList(narrow),
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
    sort ? [{ key: 'sorted', label: '', rows: items }] : filter === 'current'
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
  const values: Record<string, string> = Object.fromEntries(Object.entries({
    filter: filter === 'all' ? undefined : filter, org: payerId, year: year?.toString(), payer, type: typeId, programme,
    category: category === 'all' ? undefined : category, session, level, month, start, period, from: period ? undefined : bounds.startFrom, to: period ? undefined : bounds.startTo,
    sort, dir: sort ? direction : undefined, q: search || undefined,
  }).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const href = (key: BookingFilter, without?: string) => {
    const next: Record<string, string> = { ...values, filter: key === 'all' ? '' : key };
    if (without === 'dates') { delete next.from; delete next.to; }
    else if (without) delete next[without];
    return `/admin/bookings?${new URLSearchParams(Object.entries(next).filter(([, value]) => Boolean(value)))}`;
  };
  const sortHead = (key: BookingSort, label: string) => <Link
    href={`/admin/bookings?${new URLSearchParams({ ...values, sort: key, dir: sort === key && direction === 'asc' ? 'desc' : 'asc' })}`}
    className="inline-flex items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
    aria-label={t(`Nach ${label} sortieren`, `Sort by ${label}`)}
  >{label}<span aria-hidden="true" className="text-[0.7rem] opacity-65">{sort === key ? direction === 'asc' ? '↑' : '↓' : '↕'}</span></Link>;
  const sortDirection = (key: BookingSort) => sort === key ? direction === 'asc' ? 'ascending' as const : 'descending' as const : undefined;
  const chips = [
    filter !== 'all' ? { key: 'filter' as const, label: pick(lang, VIEWS.find(v => v.key === filter)!.label) } : null,
    payerId ? { key: 'org' as const, label: t(`Bezahlt von ${payerName ?? '…'}`, `Paid by ${payerName ?? '…'}`) } : null,
    year ? { key: 'year' as const, label: String(year) } : null,
    payer ? { key: 'payer' as const, label: pick(lang, PAYER_LABELS[payer]) } : null,
    typeName ? { key: 'type' as const, label: typeName } : null,
    programme ? { key: 'programme' as const, label: programmes.find((p) => p.code === programme)?.name ?? programme } : null,
    period ? { key: 'period' as const, label: period === 'next14' ? t('Beginn: nächste 14 Tage', 'Starting in the next 14 days') : t('Beginn in diesem Monat', 'Starting this month') } : null,
    !period && (bounds.startFrom || bounds.startTo) ? { key: 'dates' as const, label: t(`Beginn: ${bounds.startFrom ?? '…'} – ${bounds.startTo ?? '…'}`, `Starts: ${bounds.startFrom ?? '…'} – ${bounds.startTo ?? '…'}`) } : null,
  ].filter(c => c !== null);

  return (
    <>
      <PageHeader title={t('Buchungen', 'Bookings')} />

      <Card bleed className="casa-bookings-list">
        <ListBar
          tabs={CATEGORIES.map(v => {
            const next = adjustBookingContext(values, { category: v.key === 'all' ? '' : v.key }, facets);
            return { key: v.key, label: pick(lang, v.label), href: `/admin/bookings?${new URLSearchParams(Object.entries(next).filter(([, value]) => Boolean(value)))}`, count: categoryCounts[v.key] ?? 0 };
          })}
          active={category}
          search={{
            action: '/admin/bookings',
            value: search,
            placeholder: t('Name, Buchungsnummer (auch SchoolMan) oder Kurs', 'Name, booking number (SchoolMan too) or course'),
            keep: { ...values, q: undefined },
          }}
          end={<BookingFilters
            base={values} year={year} payer={payer} typeId={typeId} programme={programme}
            years={years} types={types} programmes={programmes}
            payers={(['self', 'agency', 'company'] as const).map(value => ({ value, label: pick(lang, PAYER_LABELS[value]) }))}
            startFrom={bounds.startFrom} startTo={bounds.startTo}
            canTotals={canAccess(user, 'prices', 'view')}
            views={[...VIEWS].sort((a, b) => a.key === 'all' ? -1 : b.key === 'all' ? 1 : 0).map(v => ({ key: v.key, label: pick(lang, v.label), count: counts[v.key] }))}
          />}
        />
        <BookingToolbar values={values} facets={facets} today={today} summary={t(`${total} ${total === 1 ? 'Buchung' : 'Buchungen'}`, `${total} ${total === 1 ? 'booking' : 'bookings'}`)} />
        {category !== 'all' ? <BookingOverview values={values} facets={facets} demand={demand} today={today} lang={lang} /> : null}
      {/* The filters in force, each with its ×: the list says what it is narrowed to, the panel changes it. */}
      {chips.length ? (
        <p className="flex flex-wrap items-center gap-1.5 border-b border-ws-line-soft px-5 py-2">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1.5 rounded-md bg-[#f3f6fa] py-1 pr-1.5 pl-3 text-[0.8rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line">
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
          <Link href={`/admin/bookings?${new URLSearchParams({ ...(category === 'all' ? {} : { category }), ...(search ? { q: search } : {}) })}`} className="ml-2 rounded-sm text-xs font-medium text-[var(--casa-muted)] hover:underline">{t('Zurücksetzen', 'Reset')}</Link>
        </p>
      ) : null}

        {items.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : t('Hier gibt es keine Buchungen', 'No bookings here')}>
            {search ? t(`Keine Buchung passt zu „${search}“.`, `No booking matches “${search}”.`) : null}
          </ListEmpty>
        ) : (
          <Table density="compact"
            head={[
              { label: sortHead('name', t('Teilnehmende', 'Student')), sort: sortDirection('name') },
              { label: sortHead('start', t('Zeitraum', 'Dates')), sort: sortDirection('start'), className: `w-[13.5rem] ${hide}` },
              { label: t('Gesamt', 'Total'), align: 'right' as const, className: `w-[8rem] ${hideLg}` },
              { label: sortHead('balance', t('Offen', 'Balance')), sort: sortDirection('balance'), align: 'right' as const, className: 'w-[5.5rem] lg:w-[8.5rem]' },
              { label: '', className: remindHere && canEdit ? 'w-9 lg:w-[8rem]' : 'w-9 sm:w-[3.5rem]' },
            ]}
          >
            {groups.map((group) => [
              group.label ? <ListGroup key={group.key} label={group.label} count={filter === 'all' || filter === 'cancelled' ? monthCounts[group.key] : undefined} span={span} /> : null,
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
                <TableRow key={b.id} interactive className={b.examSessionId ? 'booking-exam' : b.courseFormat === 'intensive' ? 'booking-intensive' : b.courseFormat === 'evening' ? 'booking-evening' : undefined}>
                  <Cell href={`/admin/bookings/${b.id}`} className="max-w-0">
                    {/* The team's colour before the name, as SchoolMan colours the record; its word on hover. */}
                    <span className="flex items-center gap-2.5">
                      <span className="relative z-20 inline-flex">
                        <BookingLightDot light={light} label={lightLabel} size="md" />
                      </span>
                      <span className="min-w-0 sm:hidden"><span className="block text-[0.84rem] leading-snug font-semibold wrap-break-word">{b.personName}</span>{about ? <span className="mt-1 block truncate text-xs text-[var(--casa-muted)]">{about}</span> : null}</span>
                      <span className="hidden min-w-0 sm:block"><RecordName name={b.personName} reference={b.number} about={about || undefined} /></span>
                    </span>
                  </Cell>
                  <Cell className={`text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums ${hide}`}>{when(b, lang)}</Cell>
                  <Cell align="right" className={`whitespace-nowrap text-[#2b3546] tabular-nums ${hideLg}`}>
                    {b.charged !== 0 ? money(b.charged, b.currency) : null}
                  </Cell>
                  <Cell align="right" className="text-xs whitespace-nowrap tabular-nums sm:text-sm">
                    <Balance b={b} t={t} lang={lang} />
                  </Cell>
                  <Cell align="right">
                    <RowActions compact="lg" label={t(`Aktionen: ${b.personName}, ${b.number}`, `Actions: ${b.personName}, ${b.number}`)} {...actionsOf(b)} />
                  </Cell>
                </TableRow>
                );
              }),
            ])}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/bookings" page={page} total={total} params={values} pageSize={BOOKINGS_PER_PAGE} />
    </>
  );
}
