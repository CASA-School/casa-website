import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { RecordFoot } from '../../bookings/record-foot';
import { CleaningTab } from './cleaning-tab';
import { EditPlaceForm, MemberForm, RoomForm } from '../accommodation-forms';
import { deletePlaceAction, removeMemberAction, removeRoomAction, setPlaceActiveAction } from '../actions';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { dayRange, euros } from '@/components/admin/list';
import { MetaItem, MetaLine, Stat, StatBar, Timeline } from '@/components/admin/record-parts';
import { RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { Badge, Card, DateText, DetailList, IconChip, RecordHeader } from '@/components/admin/ui';
import { LetterList } from '@/components/admin/letters/letter-list';
import { MoreInPanel } from '@/components/admin/more-in-panel';
import { activityFor } from '@/lib/admin/activity';
import { canAccess } from '@/lib/admin/access';
import {
  getPlace,
  placeDeletable,
  placeMembers,
  placePayouts,
  placeReservations,
  placeRooms,
  placeStays,
  roomTypes,
  type PlaceStay,
} from '@/lib/admin/accommodation';
import { ACCOMMODATION_KIND_LABELS, MEMBER_ROLE_LABELS } from '@/lib/admin/accommodation-labels';
import { cleaningTemplates, flatCleaning } from '@/lib/admin/cleaning';
import { berlinDay } from '@/lib/admin/days';
import { requireModule } from '@/lib/admin/guard';
import { num, pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { lettersForPlace } from '@/lib/admin/letters/repo';
import { listNotes } from '@/lib/admin/notes';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { cn } from '@/lib/utils';
import { mailHref } from '@/lib/admin/mail/href';

const yesNo = (v: boolean | null, t: T) => (v === true ? t('Ja', 'Yes') : v === false ? t('Nein', 'No') : null);

/**
 * One place (2026-10-18, migration 0060; docs/ADMIN_WORKSPACE.md §Accommodation), in the record pages'
 * tabs. The head: the name, what it is, whether it is still used, how to reach it, and the figures —
 * rooms, who stays there today, who comes next. Übersicht holds the house (smoker, pets, washing machine,
 * the descriptions), the family, and what has been said about it; then the rooms with who is in them
 * today, the stays there, and the beds held for groups.
 */
export default async function PlacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; error?: string }> }) {
  const [{ id }, { tab, error }, user] = await Promise.all([params, searchParams, requireModule('accommodation')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const place = await getPlace(id);
  if (!place) notFound();
  const { t, lang } = await getI18n();

  const canEdit = canAccess(user, 'accommodation', 'edit');
  const canDelete = canAccess(user, 'accommodation', 'full');
  const seesBookings = canAccess(user, 'bookings');
  const seesGroups = canAccess(user, 'groups');
  const today = berlinDay(new Date());
  const plus = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

  const [members, rooms, stays, reservations, payouts, letters, cleaning, templates, notes, activity, types, deletable] = await Promise.all([
    placeMembers(id),
    placeRooms(id),
    placeStays(id),
    placeReservations(id),
    seesBookings ? placePayouts(id) : Promise.resolve([]),
    seesBookings ? lettersForPlace(id) : Promise.resolve([]),
    place.kind === 'casa_flat' ? flatCleaning(id, today, plus(today, 34)) : Promise.resolve(null),
    place.kind === 'casa_flat' && canEdit ? cleaningTemplates(id) : Promise.resolve([]),
    listNotes('accommodation', id),
    activityFor('accommodation', id),
    canEdit ? roomTypes() : Promise.resolve([]),
    canDelete ? placeDeletable(id) : Promise.resolve(false),
  ]);
  const stayingNow = stays.current.filter((s) => s.from <= today);
  const coming = stays.current.filter((s) => s.from > today);
  const isFamily = place.kind === 'host_family';
  const showsFamily = isFamily || members.length > 0;
  const side = showsFamily || Boolean(place.note);

  const tabs: RecordTab[] = [
    { id: 'overview', label: t('Übersicht', 'Overview'), icon: Icon.overview },
    { id: 'rooms', label: t('Zimmer', 'Rooms'), icon: Icon.home, count: rooms.length },
    ...(stays.current.length + stays.earlierTotal ? [{ id: 'stays', label: t('Belegung', 'Stays'), icon: Icon.people, count: stays.current.length + stays.earlierTotal }] : []),
    ...(reservations.length ? [{ id: 'groups', label: t('Gruppen', 'Groups'), icon: Icon.group, count: reservations.length }] : []),
    ...(payouts.length ? [{ id: 'rent', label: t('Miete', 'Rent'), icon: Icon.money, count: payouts.length }] : []),
    ...(letters.length ? [{ id: 'letters', label: t('Briefe', 'Letters'), icon: Icon.mail, count: letters.length }] : []),
    ...(cleaning ? [{ id: 'cleaning', label: t('Putzplan', 'Cleaning'), icon: Icon.calendar, count: cleaning.duties.length || undefined }] : []),
  ];
  const thisYear = String(new Date().getFullYear());
  const rentThisYear = payouts.filter((p) => p.paidOn?.startsWith(thisYear)).reduce((s, p) => s + p.amount, 0);
  const hidden = <input type="hidden" name="placeId" value={id} />;
  const muted = (text: string) => <span className="font-semibold text-[var(--casa-muted)]">{text}</span>;

  return (
    <RecordTabs tabs={tabs} initial={tab}>
      <RecordHeader
        backHref="/admin/accommodation"
        backLabel={t('Unterkünfte', 'Accommodation')}
        title={place.name}
        avatar={place.name}
        status={!place.isActive ? <Badge tone="quiet">{t('Inaktiv', 'Inactive')}</Badge> : null}
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">
              {pick(lang, ACCOMMODATION_KIND_LABELS[place.kind])}
              {place.contactName && place.contactName !== place.name ? <span className="font-normal text-[var(--casa-muted)]"> · {place.contactName}</span> : null}
            </span>
            <MetaLine>
              {place.phone ? (
                <MetaItem icon={Icon.phone}>
                  <a href={`tel:${place.phone}`} className="hover:text-[var(--casa-ink)] hover:underline">
                    {place.phone}
                  </a>
                </MetaItem>
              ) : null}
              {place.email ? (
                <MetaItem icon={Icon.mail}>
                  <Link href={mailHref('accommodation', place.id)} className="hover:text-[var(--casa-ink)] hover:underline">
                    {place.email}
                  </Link>
                </MetaItem>
              ) : null}
              {place.address ? (
                <MetaItem icon={Icon.home}>
                  {place.address
                    .split(/\r?\n/)
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .join(', ')}
                </MetaItem>
              ) : null}
            </MetaLine>
          </>
        }
        actions={
          canEdit ? (
            <FormDialog icon={Icon.home} tint="ink" trigger={t('Bearbeiten', 'Edit')} title={place.name} width="lg">
              <EditPlaceForm place={place} />
            </FormDialog>
          ) : null
        }
        bar={
          <StatBar>
            <Stat label={t('Zimmer', 'Rooms')}>{rooms.length ? num(lang, rooms.filter((r) => r.isActive).length) : muted(t('keine', 'none'))}</Stat>
            <Stat label={t('Wohnen jetzt', 'Staying now')}>{stayingNow.length ? num(lang, stayingNow.length) : muted(t('niemand', 'nobody'))}</Stat>
            <Stat label={t('Nächste Anreise', 'Next arrival')}>{coming.length ? <DateText value={coming[0].from} /> : muted(t('keine', 'none'))}</Stat>
          </StatBar>
        }
        tabs={<RecordTabList label={t(`${place.name}: Bereiche`, `${place.name}: sections`)} />}
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <RecordTabPanel id="overview">
        <div className={cn('grid gap-4 lg:items-start', side && 'lg:grid-cols-[minmax(0,1fr)_340px]')}>
          <div className="space-y-4">
            <Card title={t('Das Haus', 'The house')} icon={Icon.home} tint="blue">
              <DetailList
                items={[
                  { label: t('Raucherhaushalt', 'Smoking household'), value: yesNo(place.smoker, t) },
                  { label: t('Haustiere', 'Pets'), value: place.pets },
                  { label: t('Waschmaschine', 'Washing machine'), value: yesNo(place.washingMachine, t) },
                  { label: t('Bewertung in SchoolMan', 'Grade in SchoolMan'), value: place.rating ? `${place.rating} / 6` : null },
                  ...(place.descriptionDe ? [{ label: t('Beschreibung', 'Description'), value: <span className="whitespace-pre-line">{place.descriptionDe}</span>, wide: true }] : []),
                  ...(place.descriptionEn
                    ? [{ label: t('Beschreibung (Englisch)', 'Description (English)'), value: <span className="whitespace-pre-line">{place.descriptionEn}</span>, wide: true }]
                    : []),
                ]}
              />
            </Card>
            <Timeline canWrite={canEdit} entity="accommodation" id={id} notes={notes} activity={activity.filter((e) => e.action !== 'accommodation_created')} />
          </div>
          {side ? (
          <div className="space-y-4">
            {showsFamily ? (
              <Card
                title={t('Familie', 'Family')}
                icon={Icon.people}
                tint="green"
                actions={
                  canEdit ? (
                    <FormDialog icon={Icon.person} tint="green" trigger={t('Hinzufügen', 'Add')} title={t('Wer wohnt hier?', 'Who lives here?')} triggerVariant="ghost" size="sm" width="lg">
                      <MemberForm placeId={id} />
                    </FormDialog>
                  ) : undefined
                }
              >
                {members.length ? (
                  <ul className="-my-1 divide-y divide-ws-line-soft">
                    {members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                        <span className="min-w-0 text-sm">
                          <span className="font-semibold text-[var(--casa-ink)]">{m.name}</span>
                          <span className="ml-2 text-[var(--casa-muted)]">{pick(lang, MEMBER_ROLE_LABELS[m.role])}</span>
                        </span>
                        {canEdit ? (
                          <span className="flex items-center gap-1">
                            <FormDialog icon={Icon.person} tint="green" trigger={t('Ändern', 'Change')} title={m.name} triggerVariant="ghost" size="sm" width="lg">
                              <MemberForm placeId={id} member={m} />
                            </FormDialog>
                            {canDelete ? (
                              <form action={removeMemberAction}>
                                {hidden}
                                <input type="hidden" name="memberId" value={m.id} />
                                <ConfirmSubmit title={t('Aus der Familie entfernen?', 'Remove from the family?')} description={m.name} confirmLabel={t('Entfernen', 'Remove')} size="sm" variant="ghost">
                                  {t('Entfernen', 'Remove')}
                                </ConfirmSubmit>
                              </form>
                            ) : null}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--casa-muted)]">{t('Noch niemand eingetragen.', 'Nobody recorded yet.')}</p>
                )}
              </Card>
            ) : null}
            {place.note ? (
              <Card title={t('Notiz', 'Note')} icon={Icon.note} tint="sun">
                <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{place.note}</p>
              </Card>
            ) : null}
          </div>
          ) : null}
        </div>
      </RecordTabPanel>

      <RecordTabPanel id="rooms">
        <Card
          bleed
          title={t('Zimmer', 'Rooms')}
          icon={Icon.home}
          tint="blue"
          actions={
            canEdit ? (
              <FormDialog icon={Icon.home} tint="blue" trigger={t('Zimmer hinzufügen', 'Add room')} title={t('Neues Zimmer', 'New room')} triggerVariant="ghost" size="sm" width="lg">
                <RoomForm placeId={id} types={types} />
              </FormDialog>
            ) : undefined
          }
        >
          {rooms.length ? (
            <ul className="divide-y divide-ws-line-soft">
              {rooms.map((r, i) => {
                const label = r.name || (r.roomType ? pick(lang, r.roomType) : t(`Zimmer ${i + 1}`, `Room ${i + 1}`));
                return (
                  <li key={r.id} className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-3', !r.isActive && 'opacity-60')}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--casa-ink)]">
                        {label}
                        {!r.isActive ? <Badge tone="quiet">{t('Nicht mehr vergeben', 'No longer used')}</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-[0.8rem] text-[var(--casa-muted)]">
                        {[
                          r.name && r.roomType ? pick(lang, r.roomType) : null,
                          r.beds ? t(`${num(lang, r.beds)} ${r.beds === 1 ? 'Bett' : 'Betten'}`, `${num(lang, r.beds)} ${r.beds === 1 ? 'bed' : 'beds'}`) : null,
                          r.occupants.length
                            ? r.occupants.map((o) => t(`${o.name} bis ${o.until.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })}`, `${o.name} until ${o.until.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`)).join(', ')
                            : r.isActive
                              ? t('frei', 'free')
                              : null,
                          r.note,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {canEdit ? (
                      <span className="flex items-center gap-1">
                        <FormDialog icon={Icon.home} tint="blue" trigger={t('Ändern', 'Change')} title={label} triggerVariant="ghost" size="sm" width="lg">
                          <RoomForm placeId={id} room={r} types={types} />
                        </FormDialog>
                        {canDelete ? (
                          <form action={removeRoomAction}>
                            {hidden}
                            <input type="hidden" name="roomId" value={r.id} />
                            <ConfirmSubmit title={t('Dieses Zimmer entfernen?', 'Remove this room?')} description={label} confirmLabel={t('Entfernen', 'Remove')} size="sm" variant="ghost">
                              {t('Entfernen', 'Remove')}
                            </ConfirmSubmit>
                          </form>
                        ) : null}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-[var(--casa-muted)]">{t('Noch kein Zimmer.', 'No room yet.')}</p>
          )}
        </Card>
      </RecordTabPanel>

      {stays.current.length + stays.earlierTotal ? (
        <RecordTabPanel id="stays">
          <Card bleed>
            {stays.current.length ? (
              <Group label={t('Jetzt und kommend', 'Now and coming')} count={stays.current.length}>
                <StayRows stays={stays.current} lang={lang} linked={seesBookings} />
              </Group>
            ) : null}
            {/* Earlier stays a click away; their latest few here only when nothing is current (2026-10-20). */}
            {!stays.current.length && stays.earlier.length ? (
              <Group label={t('Frühere', 'Earlier')} count={stays.earlierTotal}>
                <StayRows stays={stays.earlier.slice(0, EARLIER_SHOWN)} lang={lang} linked={seesBookings} quiet />
              </Group>
            ) : null}
            {stays.earlier.length > (stays.current.length ? 0 : EARLIER_SHOWN) ? (
              <div className="px-4 pt-1 pb-4">
                <MoreInPanel
                  title={t('Frühere Aufenthalte', 'Earlier stays')}
                  label={t('Frühere Aufenthalte', 'Earlier stays')}
                  icon={Icon.person}
                  tint="sun"
                  listClassName="-mx-6"
                  rows={stays.earlier.map((s) => ({
                    key: s.stayId,
                    node: <StayLine stay={s} lang={lang} linked={seesBookings} quiet />,
                    search: [s.personName, s.roomName, s.bookingNumber].filter(Boolean).join(' '),
                    at: `${s.from}T12:00:00Z`,
                  }))}
                />
              </div>
            ) : null}
          </Card>
        </RecordTabPanel>
      ) : null}

      {reservations.length ? (
        <RecordTabPanel id="groups">
          <Card bleed>
            <ul className="py-1.5">
              {reservations.map((r) => {
                const body = (
                  <>
                    <IconChip icon={Icon.group} tint="green" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.88rem] font-semibold text-[var(--casa-ink)]">{r.groupName ?? t('Gruppe', 'Group')}</span>
                      <span className="mt-0.5 block truncate text-[0.78rem] text-[var(--casa-muted)]">
                        {[
                          dayRange(r.from, r.to, lang),
                          r.minPeople || r.maxPeople ? t(`${r.minPeople ?? '?'}–${r.maxPeople ?? '?'} Personen`, `${r.minPeople ?? '?'}–${r.maxPeople ?? '?'} people`) : null,
                          r.roomName,
                          r.note,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={r.id}>
                    {r.groupId && seesGroups ? (
                      <Link href={`/admin/groups/${r.groupId}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </RecordTabPanel>
      ) : null}

      {payouts.length ? (
        <RecordTabPanel id="rent">
          <Card
            bleed
            title={t('Miete an die Unterkunft', 'Rent paid to the place')}
            icon={Icon.money}
            tint="sun"
            actions={<span className="text-[0.8rem] font-semibold text-[var(--casa-muted)] tabular-nums">{t(`${thisYear}: ${euros(rentThisYear)}`, `${thisYear}: ${euros(rentThisYear)}`)}</span>}
          >
            <MoneyRows rows={payouts} lang={lang} linked={seesBookings} />
          </Card>
        </RecordTabPanel>
      ) : null}

      {cleaning ? (
        <RecordTabPanel id="cleaning">
          <CleaningTab placeId={id} plan={cleaning} templates={templates} today={today} canEdit={canEdit} canDelete={canDelete} t={t} lang={lang} />
        </RecordTabPanel>
      ) : null}

      {letters.length ? (
        <RecordTabPanel id="letters">
          <Card bleed>
            <LetterList
              variant="tab"
              title={t('Briefe', 'Letters')}
              rows={letters.map((l) => ({
                id: l.id,
                kind: l.kind,
                kindLabel: pick(lang, LETTER_KIND_LABELS[l.kind]),
                subject: l.subject,
                by: l.sentByName,
                sentAt: new Date(l.sentAt).toISOString(),
              }))}
            />
          </Card>
        </RecordTabPanel>
      ) : null}

      {canEdit ? (
        <RecordFoot>
          <form action={setPlaceActiveAction}>
            {hidden}
            <input type="hidden" name="active" value={place.isActive ? '0' : '1'} />
            <ConfirmSubmit
              title={place.isActive ? t(`${place.name} auf inaktiv setzen?`, `Set ${place.name} inactive?`) : t(`${place.name} wieder aktiv?`, `${place.name} active again?`)}
              description={
                place.isActive
                  ? t('Sie bleibt mit allem erhalten und steht unter „Inaktiv“.', 'It stays with everything and is listed under “Inactive”.')
                  : t('Sie steht wieder unter den aktiven Unterkünften.', 'It is listed with the active places again.')
              }
              confirmLabel={place.isActive ? t('Inaktiv setzen', 'Set inactive') : t('Wieder aktiv', 'Active again')}
            >
              {place.isActive ? t('Inaktiv setzen', 'Set inactive') : t('Wieder aktiv', 'Active again')}
            </ConfirmSubmit>
          </form>
          {deletable ? (
            <form action={deletePlaceAction}>
              {hidden}
              <ConfirmSubmit title={t('Diese Unterkunft löschen?', 'Delete this place?')} description={t('Familie, Zimmer und Notizen werden mit gelöscht.', 'Its family, rooms and notes are deleted with it.')}>
                {t('Löschen', 'Delete')}
              </ConfirmSubmit>
            </form>
          ) : null}
        </RecordFoot>
      ) : null}
    </RecordTabs>
  );
}

function MoneyRows({ rows, lang, linked }: { rows: readonly { id: string; paidOn: string | null; amount: number; bookingId: string | null; bookingNumber: string | null; personName: string | null; note?: string | null }[]; lang: WsLang; linked: boolean }) {
  const day = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB') : '—');
  return (
    <ul className="divide-y divide-ws-line-soft">
      {rows.map((r) => {
        const body = (
          <>
            <span className="w-24 shrink-0 text-[0.82rem] text-[var(--casa-muted)] tabular-nums">{day(r.paidOn)}</span>
            <span className="min-w-0 flex-1 truncate text-[0.86rem]">
              <span className="font-semibold text-[var(--casa-ink)]">{r.personName ?? '—'}</span>
              <span className="text-[var(--casa-muted)]">{[r.bookingNumber, r.note?.split('\n')[0]].filter(Boolean).map((x) => ` · ${x}`).join('')}</span>
            </span>
            <span className="shrink-0 text-[0.86rem] font-semibold tabular-nums">{euros(r.amount)}</span>
          </>
        );
        return (
          <li key={r.id}>
            {linked && r.bookingId ? (
              <Link href={`/admin/bookings/${r.bookingId}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--ws-row-hover)]">
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Group({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <section className="border-t border-ws-line-soft first:border-t-0">
      <h3 className="px-4 pt-3.5 pb-1.5 text-xs font-bold text-[var(--casa-ink)]">
        {label} <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-[var(--ws-head)] px-1.5 py-px text-[0.68rem] font-semibold tabular-nums">{count}</span>
      </h3>
      {children}
    </section>
  );
}

/** The learners at a place: who, when, which room; to the booking for whoever holds Bookings. */
function StayRows({ stays, lang, linked, quiet = false }: { stays: readonly PlaceStay[]; lang: WsLang; linked: boolean; quiet?: boolean }) {
  return (
    <ul className="py-1.5">
      {stays.map((s) => (
        <li key={s.stayId}>
          <StayLine stay={s} lang={lang} linked={linked} quiet={quiet} />
        </li>
      ))}
    </ul>
  );
}

/** How many earlier stays show when nothing is current; the rest are at the side. */
const EARLIER_SHOWN = 8;

/** One stay: who, when, which room, which booking — a link to the booking for whoever may open it. */
function StayLine({ stay: s, lang, linked, quiet = false }: { stay: PlaceStay; lang: WsLang; linked: boolean; quiet?: boolean }) {
  const body = (
    <>
      <span className={cn(quiet && 'opacity-70')}>
        <IconChip icon={Icon.person} tint="sun" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[0.88rem] font-semibold', quiet ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]')}>{s.personName}</span>
        <span className="mt-0.5 block truncate text-[0.78rem] text-[var(--casa-muted)]">{[dayRange(s.from, s.to, lang), s.roomName, s.bookingNumber].filter(Boolean).join(' · ')}</span>
      </span>
    </>
  );
  return linked ? (
    <Link href={`/admin/bookings/${s.bookingId}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]">
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
  );
}
