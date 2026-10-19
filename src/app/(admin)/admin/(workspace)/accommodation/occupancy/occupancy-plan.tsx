'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Avatar } from '@/components/admin/list';
import { SidePanel } from '@/components/admin/side-panel';
import { pick, wsLocale, type WsLang } from '@/lib/admin/i18n';
import type { OccupancyFlat, OccupancyHold, OccupancyRoom, OccupancyStay } from '@/lib/admin/occupancy';
import { cn } from '@/lib/utils';

const DAYS = 28;
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const plus = (iso: string, n: number) => new Date(noon(iso).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const between = (a: string, b: string) => Math.round((noon(b).getTime() - noon(a).getTime()) / 86_400_000);
const fmt = (iso: string, lang: WsLang, options: Intl.DateTimeFormatOptions) => noon(iso).toLocaleDateString(wsLocale(lang), { ...options, timeZone: 'UTC' });
const weekend = (iso: string) => noon(iso).getUTCDay() % 6 === 0;
function isoWeek(iso: string): number {
  const d = noon(iso);
  const thursday = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * 86_400_000);
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4, 12));
  const firstThursday = new Date(jan4.getTime() + (3 - ((jan4.getUTCDay() + 6) % 7)) * 86_400_000);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

type Item = { kind: 'stay'; stay: OccupancyStay } | { kind: 'hold'; hold: OccupancyHold };
const itemFrom = (i: Item) => (i.kind === 'stay' ? i.stay.from : i.hold.from);
const itemTo = (i: Item) => (i.kind === 'stay' ? i.stay.to : i.hold.to);

/**
 * Who lives in which room of CASA's flats, four weeks at a time (Rahman, 2026-10-19: "a similar
 * interface [to the Raumplan] for CASA WGs"). A band for each flat, a row for each of its rooms with a
 * line for each bed, the days across; a learner's stay runs from the middle of the day they arrive to
 * the middle of the day they leave, so one leaving and one arriving on the same day share it. Living
 * there now in teal, still to come in blue, gone in grey, a room held for a group hatched in amber. A
 * free bed is an empty line. The search lights up a learner; a stay opens at the side.
 */
export function OccupancyPlan({ from, today, flats, stays, holds }: { from: string; today: string; flats: OccupancyFlat[]; stays: OccupancyStay[]; holds: OccupancyHold[] }) {
  const { t, lang } = useWsLang();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Item | null>(null);
  const needle = q.trim().toLowerCase();
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => plus(from, i)), [from]);
  const last = days[DAYS - 1];
  const todayIndex = today >= from && today <= last ? between(from, today) : -1;
  const roomsTotal = flats.reduce((n, f) => n + f.rooms.length, 0);
  const occupiedToday = new Set(stays.filter((s) => s.roomId && s.from <= today && s.to > today).map((s) => s.roomId)).size;

  // A stay's span on the days: from the middle of its first to the middle of its last, cut at the edges.
  const span = (a: string, b: string) => {
    const left = a < from ? 0 : ((between(from, a) + 0.5) / DAYS) * 100;
    const right = b > last ? 100 : ((between(from, b) + 0.5) / DAYS) * 100;
    return { left, width: Math.max(1.6, right - left), cutLeft: a < from, cutRight: b > last };
  };
  const hit = (i: Item) => !needle || (i.kind === 'stay' ? i.stay.name.toLowerCase().includes(needle) : (i.hold.groupName ?? '').toLowerCase().includes(needle));

  // Each item on the first line of its room still free when it arrives; a room shows a line per bed at least.
  const lanes = (items: Item[], beds: number | null) => {
    const sorted = [...items].sort((a, b) => itemFrom(a).localeCompare(itemFrom(b)));
    const lines: Item[][] = [];
    for (const item of sorted) {
      const line = lines.find((l) => itemTo(l[l.length - 1]) <= itemFrom(item));
      if (line) line.push(item);
      else lines.push([item]);
    }
    while (lines.length < Math.max(1, beds ?? 1)) lines.push([]);
    return lines;
  };

  const block = (item: Item) => {
    const s = span(itemFrom(item), itemTo(item));
    const stay = item.kind === 'stay' ? item.stay : null;
    const state = stay ? (stay.to <= today ? 'gone' : stay.from > today ? 'coming' : 'here') : 'hold';
    const label = stay ? stay.name : `${item.kind === 'hold' ? (item.hold.groupName ?? t('Gruppe', 'Group')) : ''}`;
    return (
      <button
        key={stay ? stay.id : item.kind === 'hold' ? item.hold.id : ''}
        type="button"
        onClick={() => setOpen(item)}
        title={[label, `${fmt(itemFrom(item), lang, { day: 'numeric', month: 'numeric' })} – ${fmt(itemTo(item), lang, { day: 'numeric', month: 'numeric' })}`].join(' · ')}
        style={{ left: `${s.left}%`, width: `${s.width}%` }}
        className={cn(
          'absolute inset-y-[3px] z-10 flex min-w-0 items-center gap-1.5 overflow-hidden border px-2 text-left text-[0.76rem] leading-none font-semibold transition-[transform,box-shadow,opacity] outline-none hover:-translate-y-px hover:shadow-[0_8px_18px_-10px_rgba(15,23,42,0.45)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/50',
          s.cutLeft ? 'rounded-l-none border-l-0' : 'rounded-l-lg',
          s.cutRight ? 'rounded-r-none border-r-0' : 'rounded-r-lg',
          state === 'here' && 'border-[#0f8a7a] bg-[#d9f1ec] text-[#0b4a41]',
          state === 'coming' && 'border-[#2f6fd6] bg-[#e4eefc] text-[#12305f]',
          state === 'gone' && 'border-[#c4cbd6] bg-[#eef1f5] text-[#5b6577]',
          state === 'hold' && 'border-[#d99a00] bg-[repeating-linear-gradient(135deg,#fff4d9_0_6px,#ffe9b3_6px_12px)] text-[#5c4300]',
          needle && !hit(item) && 'opacity-25',
          needle && hit(item) && 'ring-2 ring-[var(--casa-ink-deep)]'
        )}
      >
        {stay?.departureConfirmed ? <span aria-hidden="true" className="shrink-0 [&_svg]:size-3">{Icon.check}</span> : null}
        <span className="truncate">{label}</span>
        {item.kind === 'hold' && item.hold.people ? <span className="shrink-0 opacity-70">· {item.hold.people}</span> : null}
      </button>
    );
  };

  const roomRow = (key: string, label: ReactNode, sub: string | null, items: Item[], beds: number | null, zebra: boolean) => {
    const lines = lanes(items, beds);
    return (
      <div key={key} className={cn('grid grid-cols-[13rem_1fr] border-b border-ws-line-soft last:border-b-0', zebra ? 'bg-[#fafbfd]' : 'bg-white')}>
        <div className="sticky left-0 z-20 flex flex-col justify-center border-r border-ws-line bg-inherit px-4 py-1.5">
          <span className="truncate text-[0.86rem] font-bold text-[var(--casa-ink)]">{label}</span>
          {sub ? <span className="truncate text-[0.72rem] text-[var(--casa-muted)]">{sub}</span> : null}
        </div>
        <div className="py-[3px]">
          {lines.map((line, i) => (
            <div key={i} className={cn('relative h-[30px]', i > 0 && 'border-t border-dashed border-[#e7ebf1]')}>
              {line.map(block)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Every other room a shade darker, across the flats: the eye keeps to its row.
  const order = new Map(flats.flatMap((f) => f.rooms).map((r, i) => [r.id, i]));
  return (
    <section className="overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-4 py-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.76rem] font-semibold text-[var(--casa-muted)]" aria-label={t('Legende', 'Legend')}>
          <Legend swatch="border border-[#0f8a7a] bg-[#d9f1ec]">{t('Wohnt hier', 'Living here')}</Legend>
          <Legend swatch="border border-[#2f6fd6] bg-[#e4eefc]">{t('Kommt noch', 'Arriving')}</Legend>
          <Legend swatch="border border-[#c4cbd6] bg-[#eef1f5]">{t('Abgereist', 'Left')}</Legend>
          <Legend swatch="border border-[#d99a00] bg-[repeating-linear-gradient(135deg,#fff4d9_0_3px,#ffe9b3_3px_6px)]">{t('Für eine Gruppe reserviert', 'Held for a group')}</Legend>
          {todayIndex >= 0 ? <li className="text-[var(--casa-ink)]">{t(`Heute ${occupiedToday} von ${roomsTotal} Zimmern belegt`, `Today ${occupiedToday} of ${roomsTotal} rooms taken`)}</li> : null}
        </ul>
        <label className="relative flex items-center">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 text-[var(--casa-muted)] [&_svg]:size-4">
            {Icon.search}
          </span>
          <span className="sr-only">{t('In der Belegung suchen', 'Search the occupancy')}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Name oder Gruppe', 'Name or group')}
            className="h-9 w-64 max-w-full rounded-full border border-ws-line bg-white pr-3 pl-9 text-[0.84rem] outline-none placeholder:text-[var(--casa-text-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          {/* The weeks and the days across; today marked. */}
          <div className="grid grid-cols-[13rem_1fr] border-b border-ws-line bg-[var(--ws-head)]">
            <span className="sticky left-0 z-20 row-span-2 flex items-end border-r border-ws-line bg-[var(--ws-head)] px-4 pb-2 text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('WG · Zimmer', 'Flat · room')}</span>
            <div className="grid grid-cols-4 border-b border-ws-line">
              {[0, 1, 2, 3].map((w) => (
                <span key={w} className={cn('px-2 py-1.5 text-center text-[0.74rem] font-bold text-[var(--casa-ink)]', w > 0 && 'border-l border-ws-line')}>
                  {t(`KW ${isoWeek(days[w * 7])}`, `Week ${isoWeek(days[w * 7])}`)}
                  <span className="ml-1.5 font-medium text-[var(--casa-muted)] tabular-nums">
                    {fmt(days[w * 7], lang, { day: 'numeric', month: 'numeric' })}–{fmt(days[w * 7 + 6], lang, { day: 'numeric', month: 'numeric' })}
                  </span>
                </span>
              ))}
            </div>
            <div className="col-start-2 grid" style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}>
              {days.map((d, i) => (
                <span key={d} className={cn('flex flex-col items-center py-1 leading-tight', i % 7 === 0 && i > 0 && 'border-l border-ws-line', weekend(d) && 'bg-[#eef1f5]')}>
                  <span className={cn('text-[0.62rem] font-semibold', weekend(d) ? 'text-[#c81e1e]' : 'text-[var(--casa-muted)]')}>{fmt(d, lang, { weekday: 'short' }).slice(0, 2)}</span>
                  <span
                    className={cn(
                      'mt-0.5 inline-flex size-5 items-center justify-center rounded-full text-[0.72rem] font-bold tabular-nums',
                      i === todayIndex ? 'bg-[var(--casa-ink-deep)] text-white' : weekend(d) ? 'text-[#c81e1e]' : 'text-[var(--casa-ink)]'
                    )}
                  >
                    {fmt(d, lang, { day: 'numeric' })}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* The days as faint columns under the rooms: weekends shaded, weeks ruled, today lit. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 left-[13rem] grid" style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}>
              {days.map((d, i) => (
                <span key={d} className={cn('border-l', i % 7 === 0 ? 'border-[#e3e8ef]' : 'border-[#f1f4f8]', weekend(d) && 'bg-[#f4f6f9]/70', i === todayIndex && 'bg-[#e9f0fb]')} />
              ))}
            </div>

            {flats.length === 0 ? <p className="relative px-5 py-10 text-center text-[0.9rem] text-[var(--casa-muted)]">{t('Keine CASA-WG eingetragen.', 'No CASA flat set up.')}</p> : null}
            {flats.map((flat) => {
              const own = (roomId: string | null) => [
                ...stays.filter((s) => s.flatId === flat.id && s.roomId === roomId).map((stay): Item => ({ kind: 'stay', stay })),
                ...holds.filter((h) => h.flatId === flat.id && h.roomId === roomId).map((hold): Item => ({ kind: 'hold', hold })),
              ];
              const homeless = own(null);
              const freeToday = flat.rooms.filter((r) => !stays.some((s) => s.roomId === r.id && s.from <= today && s.to > today)).length;
              return (
                <div key={flat.id} className="relative">
                  <div className="grid grid-cols-[13rem_1fr] border-b border-ws-line bg-[#f2f5f9]">
                    <div className="sticky left-0 z-20 border-r border-ws-line bg-[#f2f5f9] px-4 py-2">
                      <span className="flex items-center gap-2 text-[0.86rem] font-extrabold text-[var(--casa-ink)] [&_svg]:size-4 [&_svg]:text-[var(--casa-muted)]">
                        {Icon.home}
                        <span className="truncate">{flat.name}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 px-3 text-[0.76rem] text-[var(--casa-muted)]">
                      {flat.address ? <span className="truncate">{flat.address}</span> : null}
                      {todayIndex >= 0 ? (
                        <span className={cn('ml-auto shrink-0 font-semibold', freeToday ? 'text-[#0b6b5e]' : 'text-[var(--casa-muted)]')}>
                          {freeToday === 0 ? t('heute voll', 'full today') : freeToday === 1 ? t('heute 1 Zimmer frei', '1 room free today') : t(`heute ${freeToday} Zimmer frei`, `${freeToday} rooms free today`)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {flat.rooms.map((room) => roomRow(room.id, room.name, roomLine(room, lang, t), own(room.id), room.beds, (order.get(room.id) ?? 0) % 2 === 1))}
                  {homeless.length ? roomRow(`${flat.id}-none`, t('Ohne Zimmer', 'No room'), null, homeless, 1, false) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <StayPanel item={open} lang={lang} flats={flats} onClose={() => setOpen(null)} />
    </section>
  );
}

function roomLine(room: OccupancyRoom, lang: WsLang, t: (de: string, en: string) => string) {
  return [room.type ? pick(lang, room.type) : null, room.beds ? (room.beds === 1 ? t('1 Bett', '1 bed') : t(`${room.beds} Betten`, `${room.beds} beds`)) : null].filter(Boolean).join(' · ') || null;
}

function Legend({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={cn('inline-block h-3.5 w-5 rounded-[4px]', swatch)} />
      {children}
    </li>
  );
}

/** A stay — or a room held for a group — at the side: who, where, from when to when, and the way on. */
function StayPanel({ item, lang, flats, onClose }: { item: Item | null; lang: WsLang; flats: OccupancyFlat[]; onClose: () => void }) {
  const t = (de: string, en: string) => (lang === 'en' ? en : de);
  const flatId = item ? (item.kind === 'stay' ? item.stay.flatId : item.hold.flatId) : null;
  const roomId = item ? (item.kind === 'stay' ? item.stay.roomId : item.hold.roomId) : null;
  const flat = flats.find((f) => f.id === flatId);
  const room = flat?.rooms.find((r) => r.id === roomId);
  const where = [flat?.name, room?.name ?? t('ohne Zimmer', 'no room')].filter(Boolean).join(' · ');
  const longDay = (iso: string) => fmt(iso, lang, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const stay = item?.kind === 'stay' ? item.stay : null;
  const hold = item?.kind === 'hold' ? item.hold : null;
  const link = 'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[0.84rem] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4';
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
            <Link href={`/admin/bookings/${stay.bookingId}`} className={cn(link, 'bg-[var(--fm-navy)] text-white hover:opacity-90')}>
              {Icon.bookings}
              {t('Zur Buchung', 'Open the booking')}
            </Link>
            <Link href={`/admin/people/${stay.personId}`} className={cn(link, 'bg-white text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset hover:bg-ws-sunk')}>
              {Icon.person}
              {t('Zur Person', 'Open the person')}
            </Link>
          </span>
        ) : hold?.groupId ? (
          <Link href={`/admin/groups/${hold.groupId}`} className={cn(link, 'bg-[var(--fm-navy)] text-white hover:opacity-90')}>
            {Icon.group}
            {t('Zur Gruppe', 'Open the group')}
          </Link>
        ) : null
      }
    >
      {item ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 px-6 py-5">
          <Fact label={t('Anreise', 'Arrival')}>{longDay(stay?.from ?? hold!.from)}</Fact>
          <Fact label={t('Abreise', 'Departure')}>
            {longDay(stay?.to ?? hold!.to)}
            {stay?.departureConfirmed ? <span className="mt-0.5 block text-[0.78rem] font-semibold text-[#0b6b5e]">{t('Abreise bestätigt', 'Departure confirmed')}</span> : null}
          </Fact>
          <Fact label={t('Nächte', 'Nights')}>{between(stay?.from ?? hold!.from, stay?.to ?? hold!.to)}</Fact>
          {stay ? <Fact label={t('Buchung', 'Booking')}>{stay.bookingNumber ?? '—'}</Fact> : <Fact label={t('Personen', 'People')}>{hold?.people ?? '—'}</Fact>}
          {stay?.course ? <Fact label={t('Kurs', 'Course')}>{stay.course}</Fact> : null}
          {room ? <Fact label={t('Zimmer', 'Room')}>{[room.name, room.type ? pick(lang, room.type) : null].filter(Boolean).join(' · ')}</Fact> : null}
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
      ) : null}
    </SidePanel>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.75rem] font-semibold text-[var(--casa-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[0.92rem] font-bold text-[var(--casa-ink)]">{children}</dd>
    </div>
  );
}
