import Link from 'next/link';

import { PlaceStayForm } from '../accommodation-forms';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { dayRange, ListBar, ListEmpty, RecordName } from '@/components/admin/list';
import { Badge, ButtonLink, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { listStays, placementChoices, stayCounts } from '@/lib/admin/accommodation';
import { isStayView, STAY_VIEW_LABELS, STAY_VIEWS, type AccommodationKind, type StayView } from '@/lib/admin/accommodation-labels';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { firstParam } from '@/lib/admin/paging';
import { cn } from '@/lib/utils';

/**
 * The stays, as the accommodation colleague works them (2026-10-18; docs/schoolman/accommodation.md §The
 * work lists): arriving in the next two weeks, staying now, leaving in the next two weeks, staying on
 * after the course, and those still without a place — CASA's flats or host families, or both. A row is
 * the learner, the stay's dates (and the course's last day where they stay on), and where; in the lists of
 * those arriving and those without a place, „Unterkunft" places it, or moves it, at a place and a room.
 */
export default async function StaysPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('accommodation'), getI18n()]);
  const rawView = firstParam(params.view);
  const view: StayView = isStayView(rawView) ? rawView : 'now';
  const rawKind = firstParam(params.kind);
  const kind: AccommodationKind | undefined = rawKind === 'casa_flat' || rawKind === 'host_family' ? rawKind : undefined;
  const search = firstParam(params.q)?.slice(0, 80);
  // Placing happens where it is due: those arriving and those still without a place (the dialog carries
  // every place, so it is not on every row of the longer lists).
  const canEdit = canAccess(user, 'accommodation', 'edit') && (view === 'arriving' || view === 'unplaced');
  const seesBookings = canAccess(user, 'bookings');
  const [stays, counts, choices] = await Promise.all([listStays({ view, kind, search }), stayCounts(), canEdit ? placementChoices(lang) : Promise.resolve([])]);
  const query = (v: StayView, k: AccommodationKind | undefined) => {
    const q = new URLSearchParams();
    if (v !== 'now') q.set('view', v);
    if (k) q.set('kind', k);
    const s = q.toString();
    return `/admin/accommodation/stays${s ? `?${s}` : ''}`;
  };
  const back = `${query(view, kind)}${search ? `${query(view, kind).includes('?') ? '&' : '?'}q=${encodeURIComponent(search)}` : ''}`;
  const error = firstParam(params.error);
  const hide = 'hidden md:table-cell';
  const kinds: { key: AccommodationKind | undefined; label: string }[] = [
    { key: undefined, label: t('Alle', 'All') },
    { key: 'casa_flat', label: t('CASA-WGs', 'CASA flats') },
    { key: 'host_family', label: t('Gastfamilien', 'Host families') },
  ];

  return (
    <>
      <PageHeader
        title={t('Aufenthalte', 'Stays')}
        actions={
          <ButtonLink href="/admin/accommodation/occupancy" variant="secondary">
            {t('WG-Belegung', 'Flat occupancy')}
          </ButtonLink>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <nav aria-label={t('Art der Unterkunft', 'Kind of place')} className="-mt-2 mb-4 flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <Link
            key={k.label}
            href={query(view, k.key)}
            aria-current={kind === k.key ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1 text-[0.8rem] font-semibold ring-1 ring-inset',
              kind === k.key ? 'bg-[var(--fm-navy)] text-white ring-[var(--fm-navy)]' : 'bg-white text-[#2b3546] ring-ws-line hover:bg-[var(--ws-row-hover)]'
            )}
          >
            {k.label}
          </Link>
        ))}
      </nav>

      <Card bleed>
        <ListBar
          tabs={STAY_VIEWS.map((v) => ({ key: v, label: pick(lang, STAY_VIEW_LABELS[v]), href: query(v, kind), count: counts[v] }))}
          active={view}
          search={{
            action: '/admin/accommodation/stays',
            value: search,
            placeholder: t('Name, Buchung oder Unterkunft', 'Name, booking or place'),
            keep: { view: view === 'now' ? undefined : view, kind },
          }}
        />
        {stays.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : t('Hier ist niemand', 'Nobody here')}>
            {search ? t(`Nichts passt zu „${search}“.`, `Nothing matches “${search}”.`) : null}
          </ListEmpty>
        ) : (
          <Table density="compact"
            head={[
              t('Teilnehmende', 'Student'),
              { label: t('Aufenthalt', 'Stay'), className: 'w-[12rem]' },
              { label: t('Unterkunft', 'Place'), className: `w-[16rem] ${hide}` },
              ...(canEdit ? [{ label: '', className: 'w-[8rem]' }] : []),
            ]}
          >
            {stays.map((s) => (
              <TableRow key={s.stayId} interactive={seesBookings}>
                <Cell href={seesBookings ? `/admin/bookings/${s.bookingId}` : undefined} className="max-w-0">
                  <RecordName name={s.personName} about={[s.bookingNumber, s.typeName ? pick(lang, s.typeName) : null].filter(Boolean).join(' · ')} />
                </Cell>
                <Cell className="text-[0.84rem] text-[#2b3546] tabular-nums">
                  {dayRange(s.from, s.to, lang)}
                  {view === 'after' && s.courseEnd ? (
                    <span className="block text-[0.72rem] text-[var(--casa-muted)]">{t(`Kurs bis ${dayRange(s.courseEnd, s.courseEnd, lang)}`, `Course until ${dayRange(s.courseEnd, s.courseEnd, lang)}`)}</span>
                  ) : null}
                </Cell>
                <Cell className={cn('text-[0.84rem]', hide)}>
                  {s.placeId ? (
                    // Above the row's own link, which opens the booking.
                    <Link href={`/admin/accommodation/${s.placeId}`} className="relative z-20 font-semibold text-[var(--fm-navy)] hover:underline">
                      {s.placeName}
                    </Link>
                  ) : s.placeName ? (
                    s.placeName
                  ) : (
                    <Badge tone="danger">{t('Noch offen', 'Not yet')}</Badge>
                  )}
                  {s.roomName ? <span className="block text-[0.72rem] text-[var(--casa-muted)]">{s.roomName}</span> : null}
                </Cell>
                {canEdit ? (
                  <Cell align="right">
                    <span className="relative z-20">
                    <FormDialog
                      icon={Icon.home}
                      tint="blue"
                      trigger={s.placeId ? t('Ändern', 'Change') : t('Unterkunft', 'Place')}
                      title={t(`Wo wohnt ${s.personName}?`, `Where does ${s.personName} stay?`)}
                      triggerVariant="tertiary"
                      size="sm"
                      width="lg"
                    >
                      <PlaceStayForm stayId={s.stayId} placeId={s.placeId} roomId={s.roomId} choices={choices} back={back} />
                    </FormDialog>
                    </span>
                  </Cell>
                ) : null}
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
