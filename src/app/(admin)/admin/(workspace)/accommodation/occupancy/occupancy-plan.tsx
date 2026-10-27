'use client';

import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';

import { between, FlatPanel, fmt, FreeBedPanel, StayPanel, type FlatDuties, type FreeBed, type Item } from './occupancy-panels';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { reservationTitle } from '@/lib/admin/accommodation-labels';
import { pick, type WsLang } from '@/lib/admin/i18n';
import type { OccupancyFlat, OccupancyHold, OccupancyRoom, OccupancyStay, PlaceableStay } from '@/lib/admin/occupancy';
import { cn } from '@/lib/utils';

const DAYS = 28;
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const plus = (iso: string, n: number) => new Date(noon(iso).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const weekend = (iso: string) => noon(iso).getUTCDay() % 6 === 0;
function isoWeek(iso: string): number {
  const d = noon(iso);
  const thursday = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * 86_400_000);
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4, 12));
  const firstThursday = new Date(jan4.getTime() + (3 - ((jan4.getUTCDay() + 6) % 7)) * 86_400_000);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

const itemFrom = (i: Item) => (i.kind === 'stay' ? i.stay.from : i.hold.from);
const itemTo = (i: Item) => (i.kind === 'stay' ? i.stay.to : i.hold.to);

/**
 * Who lives in which room of CASA's flats, four weeks at a time (Rahman, 2026-10-19: "a similar
 * interface [to the Raumplan] for CASA WGs"). A band for each flat, a row for each of its rooms with a
 * line for each bed, the days across; a learner's stay runs from the middle of the day they arrive to
 * the middle of the day they leave, so one leaving and one arriving on the same day share it. Living
 * there now in teal, still to come in blue, gone in grey, a room held for a group hatched in amber.
 *
 * Everything opens at the side: a stay (with its deposit, and another room to move to), a free bed —
 * an empty line, clicked on its day — with the learners still without a room to move in, and a flat's
 * band with who lives there, this week's Putzplan and who comes and goes. The search lights up a learner.
 */
export function OccupancyPlan({
  from,
  today,
  flats,
  stays,
  holds,
  placeable,
  duties,
  canPlace,
  back,
}: {
  from: string;
  today: string;
  flats: OccupancyFlat[];
  stays: OccupancyStay[];
  holds: OccupancyHold[];
  placeable: PlaceableStay[];
  duties: FlatDuties;
  canPlace: boolean;
  back: string;
}) {
  const { t, lang } = useWsLang();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Item | null>(null);
  const [bed, setBed] = useState<FreeBed | null>(null);
  const [flatOpen, setFlatOpen] = useState<OccupancyFlat | null>(null);
  const needle = q.trim().toLowerCase();
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => plus(from, i)), [from]);
  const last = days[DAYS - 1];
  const todayIndex = today >= from && today <= last ? between(from, today) : -1;
  const roomsTotal = flats.reduce((n, f) => n + f.rooms.filter((r) => r.active).length, 0);
  const occupiedToday = new Set(stays.filter((s) => s.roomId && s.from <= today && s.to > today).map((s) => s.roomId)).size;
  // Every other room a shade darker, across the flats: the eye keeps to its row.
  const order = new Map(flats.flatMap((f) => f.rooms).map((r, i) => [r.id, i]));

  // A stay's span on the days: from the middle of its first to the middle of its last, cut at the edges.
  const span = (a: string, b: string) => {
    const left = a < from ? 0 : ((between(from, a) + 0.5) / DAYS) * 100;
    const right = b > last ? 100 : ((between(from, b) + 0.5) / DAYS) * 100;
    return { left, width: Math.max(1.6, right - left), cutLeft: a < from, cutRight: b > last };
  };
  const hit = (i: Item) => !needle || (i.kind === 'stay' ? i.stay.name.toLowerCase().includes(needle) : reservationTitle(lang, i.hold).toLowerCase().includes(needle));

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

  // A click on a bed's empty line: the day under the pointer, and until when that line stays free.
  const openBed = (e: MouseEvent<HTMLButtonElement>, flat: OccupancyFlat, room: OccupancyRoom, line: Item[]) => {
    const box = e.currentTarget.getBoundingClientRect();
    const index = e.clientX ? Math.min(DAYS - 1, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * DAYS))) : Math.max(0, todayIndex);
    const day = days[index] < today ? today : days[index];
    const next = line.map(itemFrom).filter((d) => d > day).sort()[0] ?? null;
    setBed({ flat, room, day, until: next });
  };

  const block = (item: Item) => {
    const s = span(itemFrom(item), itemTo(item));
    const stay = item.kind === 'stay' ? item.stay : null;
    const state = stay ? (stay.to <= today ? 'gone' : stay.from > today ? 'coming' : 'here') : 'hold';
    const label = stay ? stay.name : item.kind === 'hold' ? reservationTitle(lang, item.hold) : '';
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

  const roomRow = (flat: OccupancyFlat, room: OccupancyRoom | null, items: Item[], zebra: boolean) => {
    const lines = lanes(items, room?.beds ?? 1);
    return (
      <div key={room?.id ?? `${flat.id}-none`} className={cn('grid grid-cols-[13rem_1fr] border-b border-ws-line-soft last:border-b-0', zebra ? 'bg-[#fafbfd]' : 'bg-white')}>
        <div className="sticky left-0 z-20 flex flex-col justify-center border-r border-ws-line bg-inherit px-4 py-1.5">
          <span className="truncate text-[0.86rem] font-bold text-[var(--casa-ink)]">{room?.name ?? t('Ohne Zimmer', 'No room')}</span>
          {room ? <span className="truncate text-[0.72rem] text-[var(--casa-muted)]">{roomLine(room, lang, t)}</span> : null}
        </div>
        <div className="py-[3px]">
          {lines.map((line, i) => (
            <div key={i} className={cn('group/bed relative h-[30px]', i > 0 && 'border-t border-dashed border-[#e7ebf1]')}>
              {/* The bed itself, under its stays: clicked where it is free, it takes a learner. */}
              {canPlace && room && room.active ? (
                <button
                  type="button"
                  onClick={(e) => openBed(e, flat, room, line)}
                  aria-label={t(`${flat.name}, ${room.name}, Bett ${i + 1}: jemanden einziehen lassen`, `${flat.name}, ${room.name}, bed ${i + 1}: move someone in`)}
                  className="absolute inset-0 z-0 cursor-cell rounded-md outline-none hover:bg-[#e1f4f0]/50 focus-visible:ring-2 focus-visible:ring-[#0f8a7a]/40"
                />
              ) : null}
              {line.map(block)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-4 py-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.76rem] font-semibold text-[var(--casa-muted)]" aria-label={t('Legende', 'Legend')}>
          <Legend swatch="border border-[#0f8a7a] bg-[#d9f1ec]">{t('Wohnt hier', 'Living here')}</Legend>
          <Legend swatch="border border-[#2f6fd6] bg-[#e4eefc]">{t('Kommt noch', 'Arriving')}</Legend>
          <Legend swatch="border border-[#c4cbd6] bg-[#eef1f5]">{t('Abgereist', 'Left')}</Legend>
          <Legend swatch="border border-[#d99a00] bg-[repeating-linear-gradient(135deg,#fff4d9_0_3px,#ffe9b3_3px_6px)]">{t('Für eine Gruppe reserviert', 'Held for a group')}</Legend>
          {todayIndex >= 0 ? <li className="text-[var(--casa-ink)]">{t(`Heute ${occupiedToday} von ${roomsTotal} Zimmern belegt`, `Today ${occupiedToday} of ${roomsTotal} rooms taken`)}</li> : null}
          {canPlace && placeable.length ? (
            <li className="inline-flex h-6 items-center rounded-full bg-[#fff2d6] px-2 text-[#6e4700]">
              {placeable.length === 1 ? t('1 wartet auf ein Zimmer', '1 waiting for a room') : t(`${placeable.length} warten auf ein Zimmer`, `${placeable.length} waiting for a room`)}
            </li>
          ) : null}
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
              const freeToday = flat.rooms.filter((r) => r.active && !stays.some((s) => s.roomId === r.id && s.from <= today && s.to > today)).length;
              return (
                <div key={flat.id} className="relative">
                  {/* The flat's band: it opens the flat at the side. */}
                  <button type="button" onClick={() => setFlatOpen(flat)} className="group/flat grid w-full grid-cols-[13rem_1fr] border-b border-ws-line bg-[#f2f5f9] text-left outline-none hover:bg-[#eaeff6] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--casa-blue)]/40">
                    <span className="sticky left-0 z-20 border-r border-ws-line bg-inherit px-4 py-2">
                      <span className="flex items-center gap-2 text-[0.86rem] font-extrabold text-[var(--casa-ink)] [&_svg]:size-4 [&_svg]:text-[var(--casa-muted)]">
                        {Icon.home}
                        <span className="truncate group-hover/flat:underline">{flat.name}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-3 px-3 text-[0.76rem] text-[var(--casa-muted)]">
                      {flat.address ? <span className="truncate">{flat.address}</span> : null}
                      {todayIndex >= 0 ? (
                        <span className={cn('ml-auto shrink-0 font-semibold', freeToday ? 'text-[#0b6b5e]' : 'text-[var(--casa-muted)]')}>
                          {freeToday === 0 ? t('heute voll', 'full today') : freeToday === 1 ? t('heute 1 Zimmer frei', '1 room free today') : t(`heute ${freeToday} Zimmer frei`, `${freeToday} rooms free today`)}
                        </span>
                      ) : null}
                      <span aria-hidden="true" className={cn('shrink-0 [&_svg]:size-4', todayIndex < 0 && 'ml-auto')}>
                        {Icon.chevronRight}
                      </span>
                    </span>
                  </button>
                  {flat.rooms.map((room) => roomRow(flat, room, own(room.id), (order.get(room.id) ?? 0) % 2 === 1))}
                  {homeless.length ? roomRow(flat, null, homeless, false) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <StayPanel item={open} lang={lang} flats={flats} canPlace={canPlace} back={back} onClose={() => setOpen(null)} />
      <FreeBedPanel bed={bed} candidates={placeable} lang={lang} back={back} onClose={() => setBed(null)} />
      <FlatPanel flat={flatOpen} stays={stays} duties={duties} today={today} lang={lang} onClose={() => setFlatOpen(null)} />
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
