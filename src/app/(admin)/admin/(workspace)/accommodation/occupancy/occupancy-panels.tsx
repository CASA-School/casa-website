'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { placeFromPlanAction } from '../actions';
import { Icon } from '@/components/admin/icons';
import { Avatar, euros } from '@/components/admin/list';
import { SidePanel } from '@/components/admin/side-panel';
import { Button, Select } from '@/components/admin/ui';
import { weekPlan } from '@/lib/admin/cleaning-plan';
import { pick, wsLocale, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import type { OccupancyFlat, OccupancyHold, OccupancyRoom, OccupancyStay, PlaceableStay } from '@/lib/admin/occupancy';
import { cn } from '@/lib/utils';

const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const plus = (iso: string, n: number) => new Date(noon(iso).getTime() + n * 86_400_000).toISOString().slice(0, 10);
export const between = (a: string, b: string) => Math.round((noon(b).getTime() - noon(a).getTime()) / 86_400_000);
export const fmt = (iso: string, lang: WsLang, options: Intl.DateTimeFormatOptions) => noon(iso).toLocaleDateString(wsLocale(lang), { ...options, timeZone: 'UTC' });
const tr = (lang: WsLang) => (de: string, en: string) => (lang === 'en' ? en : de);

const link =
  'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[0.84rem] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4';
const primary = cn(link, 'bg-[var(--fm-navy)] text-white hover:opacity-90');
const secondary = cn(link, 'bg-white text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset hover:bg-ws-sunk [&_svg]:text-[var(--casa-muted)]');

export type Item = { kind: 'stay'; stay: OccupancyStay } | { kind: 'hold'; hold: OccupancyHold };
export type FreeBed = { flat: OccupancyFlat; room: OccupancyRoom; day: string; until: string | null };
export type FlatDuties = Record<string, { from: string | null; duties: { name: Bilingual }[] }>;

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.75rem] font-semibold text-[var(--casa-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[0.92rem] font-bold text-[var(--casa-ink)]">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ws-line-soft py-3 first:border-t-0">
      <h3 className="px-6 pb-1.5 text-[0.76rem] font-bold text-[var(--casa-muted)]">{title}</h3>
      {children}
    </section>
  );
}

/** A stay — or a room held for a group — at the side: who, where, when, the deposit; another room; the way on. */
export function StayPanel({
  item,
  lang,
  flats,
  canPlace,
  back,
  onClose,
}: {
  item: Item | null;
  lang: WsLang;
  flats: OccupancyFlat[];
  canPlace: boolean;
  back: string;
  onClose: () => void;
}) {
  const t = tr(lang);
  const stay = item?.kind === 'stay' ? item.stay : null;
  const hold = item?.kind === 'hold' ? item.hold : null;
  const flat = flats.find((f) => f.id === (stay?.flatId ?? hold?.flatId));
  const room = flat?.rooms.find((r) => r.id === (stay?.roomId ?? hold?.roomId));
  const where = [flat?.name, room?.name ?? t('ohne Zimmer', 'no room')].filter(Boolean).join(' · ');
  const longDay = (iso: string) => fmt(iso, lang, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <SidePanel
      open={item !== null}
      onOpenChange={(o) => !o && onClose()}
      icon={stay ? Icon.home : Icon.group}
      tint={stay ? 'ink' : 'sun'}
      title={stay ? stay.name : (hold?.groupName ?? t('Für eine Gruppe reserviert', 'Held for a group'))}
      subtitle={where}
      footer={
        stay ? (
          <span className="flex flex-wrap gap-2">
            <Link href={`/admin/bookings/${stay.bookingId}`} className={primary}>
              {Icon.bookings}
              {t('Zur Buchung', 'Open the booking')}
            </Link>
            <Link href={`/admin/people/${stay.personId}`} className={secondary}>
              {Icon.person}
              {t('Zur Person', 'Open the person')}
            </Link>
          </span>
        ) : hold?.groupId ? (
          <Link href={`/admin/groups/${hold.groupId}`} className={primary}>
            {Icon.group}
            {t('Zur Gruppe', 'Open the group')}
          </Link>
        ) : null
      }
    >
      {item ? (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 px-6 py-5">
            <Fact label={t('Anreise', 'Arrival')}>{longDay(stay?.from ?? hold!.from)}</Fact>
            <Fact label={t('Abreise', 'Departure')}>
              {longDay(stay?.to ?? hold!.to)}
              {stay?.departureConfirmed ? <span className="mt-0.5 block text-[0.78rem] font-semibold text-[#0b6b5e]">{t('Abreise bestätigt', 'Departure confirmed')}</span> : null}
            </Fact>
            <Fact label={t('Nächte', 'Nights')}>{between(stay?.from ?? hold!.from, stay?.to ?? hold!.to)}</Fact>
            {stay ? <Fact label={t('Buchung', 'Booking')}>{stay.bookingNumber ?? '—'}</Fact> : <Fact label={t('Personen', 'People')}>{hold?.people ?? '—'}</Fact>}
            {stay?.course ? <Fact label={t('Kurs', 'Course')}>{stay.course}</Fact> : null}
            {stay ? <Fact label={t('Kaution', 'Deposit')}>{stay.deposit ? euros(stay.deposit) : t('keine', 'none')}</Fact> : null}
            {stay && (stay.email || stay.phone) ? (
              <div className="col-span-2 flex items-center gap-3 rounded-xl bg-ws-sunk/60 px-3.5 py-3">
                <Avatar name={stay.name} size="sm" />
                <span className="min-w-0 text-[0.84rem]">
                  {stay.email ? (
                    <a href={`mailto:${stay.email}`} className="block truncate font-semibold text-[var(--casa-accent-text)] hover:underline">
                      {stay.email}
                    </a>
                  ) : null}
                  {stay.phone ? <span className="block text-[var(--casa-muted)] tabular-nums">{stay.phone}</span> : null}
                </span>
              </div>
            ) : null}
          </dl>
          {stay && canPlace ? (
            <Section title={t('Zimmer wechseln', 'Change room')}>
              <form action={placeFromPlanAction} onSubmit={() => setTimeout(onClose, 0)} className="flex flex-wrap items-center gap-2 px-6 pb-2">
                <input type="hidden" name="stayId" value={stay.id} />
                <input type="hidden" name="back" value={back} />
                <RoomChoice flats={flats} current={stay.roomId} lang={lang} />
                <Button type="submit" variant="secondary" size="sm">
                  {t('Umziehen', 'Move')}
                </Button>
              </form>
            </Section>
          ) : null}
        </>
      ) : null}
    </SidePanel>
  );
}

/** Any room of the flats, the flat with it: the choice posts both. */
function RoomChoice({ flats, current, lang }: { flats: OccupancyFlat[]; current: string | null; lang: WsLang }) {
  const t = tr(lang);
  const rooms = flats.flatMap((f) => f.rooms.filter((r) => r.active).map((r) => ({ flat: f, room: r })));
  const [value, setValue] = useState(current ?? rooms[0]?.room.id ?? '');
  const flatId = rooms.find((x) => x.room.id === value)?.flat.id ?? '';
  return (
    <>
      <input type="hidden" name="accommodationId" value={flatId} />
      <label className="min-w-0 flex-1">
        <span className="sr-only">{t('Zimmer', 'Room')}</span>
        <Select name="roomId" value={value} onChange={(e) => setValue(e.target.value)}>
          {flats.map((f) => (
            <optgroup key={f.id} label={f.name}>
              {f.rooms
                .filter((r) => r.active)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.type ? ` · ${pick(lang, r.type)}` : ''}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
      </label>
    </>
  );
}

/**
 * A free bed at the side (2026-10-19, Rahman: "let them place a stay from a free bed"): which room, from
 * which day and until when it is free, and every learner still without a room in a flat — those whose stay
 * fits the free time first and marked so, then the nearest arrivals. „Einziehen" places the stay there; the server checks the
 * room has a bed for the whole stay.
 */
export function FreeBedPanel({ bed, candidates, lang, back, onClose }: { bed: FreeBed | null; candidates: PlaceableStay[]; lang: WsLang; back: string; onClose: () => void }) {
  const t = tr(lang);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const fits = (s: PlaceableStay) => !!bed && s.from >= bed.day && (bed.until === null || s.to <= bed.until);
  const list = bed
    ? candidates
        .filter((s) => !needle || s.name.toLowerCase().includes(needle))
        .sort((a, b) => Number(fits(b)) - Number(fits(a)) || Math.abs(between(bed.day, a.from)) - Math.abs(between(bed.day, b.from)))
        .slice(0, 20)
    : [];
  return (
    <SidePanel
      open={bed !== null}
      onOpenChange={(o) => {
        if (!o) {
          setQ('');
          onClose();
        }
      }}
      icon={Icon.home}
      tint="green"
      title={bed ? t(`Freies Bett · ${bed.room.name}`, `Free bed · ${bed.room.name}`) : ''}
      subtitle={
        bed
          ? `${bed.flat.name} · ${t(`frei ab ${fmt(bed.day, lang, { weekday: 'short', day: 'numeric', month: 'numeric' })}`, `free from ${fmt(bed.day, lang, { weekday: 'short', day: 'numeric', month: 'short' })}`)}${
              bed.until ? t(` bis ${fmt(bed.until, lang, { weekday: 'short', day: 'numeric', month: 'numeric' })}`, ` until ${fmt(bed.until, lang, { weekday: 'short', day: 'numeric', month: 'short' })}`) : ''
            }`
          : undefined
      }
    >
      {bed ? (
        <>
          <div className="px-6 pt-4">
            <label className="relative flex items-center">
              <span aria-hidden="true" className="pointer-events-none absolute left-3 text-[var(--casa-muted)] [&_svg]:size-4">
                {Icon.search}
              </span>
              <span className="sr-only">{t('Nach Namen suchen', 'Search by name')}</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('Name', 'Name')}
                className="h-9 w-full rounded-full border border-ws-line bg-white pr-3 pl-9 text-[0.84rem] outline-none placeholder:text-[var(--casa-text-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
              />
            </label>
          </div>
          <Section title={t('Noch ohne Zimmer in einer WG', 'Still without a room in a flat')}>
            {list.length ? (
              <ul>
                {list.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-6 py-2.5">
                    <Avatar name={s.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.88rem] font-semibold text-[var(--casa-ink)]">{s.name}</span>
                      <span className="block truncate text-[0.76rem] text-[var(--casa-muted)] tabular-nums">
                        {fmt(s.from, lang, { day: 'numeric', month: 'numeric' })} – {fmt(s.to, lang, { day: 'numeric', month: 'numeric', year: '2-digit' })}
                        {' · '}
                        {t(`${between(s.from, s.to)} Nächte`, `${between(s.from, s.to)} nights`)}
                        {s.roomType ? ` · ${pick(lang, s.roomType)}` : ''}
                      </span>
                      {fits(s) ? (
                        <span className="mt-0.5 inline-flex h-5 items-center rounded-md bg-[#e1f4f0] px-1.5 text-[0.7rem] font-bold text-[#0b4a41]">{t('passt', 'fits')}</span>
                      ) : null}
                    </span>
                    <form action={placeFromPlanAction} onSubmit={() => setTimeout(onClose, 0)}>
                      <input type="hidden" name="stayId" value={s.id} />
                      <input type="hidden" name="accommodationId" value={bed.flat.id} />
                      <input type="hidden" name="roomId" value={bed.room.id} />
                      <input type="hidden" name="back" value={back} />
                      <Button type="submit" size="sm" variant={fits(s) ? 'primary' : 'secondary'}>
                        {t('Einziehen', 'Move in')}
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-3 text-[0.86rem] text-[var(--casa-muted)]">{t('Niemand wartet auf ein Zimmer in einer WG.', 'Nobody is waiting for a room in a flat.')}</p>
            )}
          </Section>
        </>
      ) : null}
    </SidePanel>
  );
}

/** A flat at the side: who lives there now, this week's Putzplan, who comes and goes; the way to it. */
export function FlatPanel({
  flat,
  stays,
  duties,
  today,
  lang,
  onClose,
}: {
  flat: OccupancyFlat | null;
  stays: OccupancyStay[];
  duties: FlatDuties;
  today: string;
  lang: WsLang;
  onClose: () => void;
}) {
  const t = tr(lang);
  const own = flat ? stays.filter((s) => s.flatId === flat.id) : [];
  const active = flat ? flat.rooms.filter((r) => r.active) : [];
  const plan = flat ? duties[flat.id] : undefined;
  const thisWeek = plan?.from ? weekPlan(active, plan.duties, plan.from, today) : [];
  const soon = plus(today, 14);
  const moves = [
    ...own.filter((s) => s.from > today && s.from <= soon).map((s) => ({ day: s.from, kind: 'in' as const, s })),
    ...own.filter((s) => s.to >= today && s.to <= soon).map((s) => ({ day: s.to, kind: 'out' as const, s })),
  ].sort((a, b) => a.day.localeCompare(b.day));
  const roomName = (id: string | null) => flat?.rooms.find((r) => r.id === id)?.name ?? t('ohne Zimmer', 'no room');
  return (
    <SidePanel
      open={flat !== null}
      onOpenChange={(o) => !o && onClose()}
      icon={Icon.home}
      tint="ink"
      title={flat?.name ?? ''}
      subtitle={flat?.address ?? undefined}
      footer={
        flat ? (
          <span className="flex flex-wrap gap-2">
            <Link href={`/admin/accommodation/${flat.id}`} className={primary}>
              {Icon.home}
              {t('Zur WG', 'Open the flat')}
            </Link>
            <Link href={`/admin/accommodation/${flat.id}?tab=cleaning`} className={secondary}>
              {Icon.calendar}
              {t('Putzplan', 'Cleaning plan')}
            </Link>
          </span>
        ) : null
      }
    >
      {flat ? (
        <>
          <Section title={t('Wohnen jetzt', 'Living here now')}>
            <ul>
              {active.map((r) => {
                const now = own.filter((s) => s.roomId === r.id && s.from <= today && s.to > today);
                return (
                  <li key={r.id} className="flex items-baseline gap-3 px-6 py-1.5 text-[0.86rem]">
                    <span className="w-[8.5rem] shrink-0 truncate font-semibold text-[var(--casa-ink)]">{r.name}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {now.length ? (
                        now.map((s) => (
                          <span key={s.id} className="block truncate text-[var(--casa-ink)]">
                            {s.name}{' '}
                            <span className="text-[0.76rem] text-[var(--casa-muted)] tabular-nums">{t(`bis ${fmt(s.to, lang, { day: 'numeric', month: 'numeric' })}`, `until ${fmt(s.to, lang, { day: 'numeric', month: 'short' })}`)}</span>
                          </span>
                        ))
                      ) : (
                        <span className="font-semibold text-[#0b6b5e]">{t('frei', 'free')}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title={t('Diese Woche putzt', 'Cleaning this week')}>
            {plan?.duties.length ? (
              <ul>
                {active.map((r, i) => (
                  <li key={r.id} className="flex items-baseline gap-3 px-6 py-1.5 text-[0.86rem]">
                    <span className="w-[8.5rem] shrink-0 truncate text-[var(--casa-muted)]">{r.name}</span>
                    <span className="font-semibold text-[var(--casa-ink)]">{thisWeek[i] ? pick(lang, thisWeek[i]!.name) : t('frei', 'free')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-1.5 text-[0.86rem] text-[var(--casa-muted)]">{t('Noch kein Putzplan.', 'No cleaning plan yet.')}</p>
            )}
          </Section>
          <Section title={t('Kommen und gehen, zwei Wochen', 'Arriving and leaving, two weeks')}>
            {moves.length ? (
              <ul>
                {moves.map((m) => (
                  <li key={`${m.kind}-${m.s.id}`} className="flex items-baseline gap-3 px-6 py-1.5 text-[0.86rem]">
                    <span className="w-[4.5rem] shrink-0 text-[var(--casa-muted)] tabular-nums">{fmt(m.day, lang, { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>
                    <span className={cn('w-[4.5rem] shrink-0 text-[0.76rem] font-bold', m.kind === 'in' ? 'text-[#1d4ea8]' : 'text-[var(--casa-muted)]')}>
                      {m.kind === 'in' ? t('kommt', 'arrives') : t('reist ab', 'leaves')}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-[var(--casa-ink)]">
                      {m.s.name} <span className="font-normal text-[var(--casa-muted)]">· {roomName(m.s.roomId)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-1.5 text-[0.86rem] text-[var(--casa-muted)]">{t('Niemand.', 'Nobody.')}</p>
            )}
          </Section>
        </>
      ) : null}
    </SidePanel>
  );
}
