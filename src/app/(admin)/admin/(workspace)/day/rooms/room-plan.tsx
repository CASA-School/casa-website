'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { Search } from '../courses/courses-table';
import { floorName, groupName, LessonPanel, shortName, together, type LessonEditing } from '../lesson-panel';
import { useWsLang } from '@/components/admin/lang';
import type { DayLesson } from '@/lib/admin/day-plan';
import { SESSION_LABELS, SESSIONS, type Session } from '@/lib/admin/day-plan-labels';
import { pick } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

const FIRST = 8;
const LAST = 21;
const SPAN = (LAST - FIRST) * 60;
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const at = (hhmm: string) => Math.min(100, Math.max(0, ((minutes(hhmm) - FIRST * 60) / SPAN) * 100));

/** A lesson's block, by the part of the day — and by what needs a look, before that. */
const BLOCK: Record<Session, string> = {
  morning: 'border-[#0f8a7a] bg-[#e1f4f0] text-[#0b4a41]',
  afternoon: 'border-[#2f6fd6] bg-[#e4eefc] text-[#12305f]',
  evening: 'border-[#6d4ed6] bg-[#ece7fb] text-[#2e1f63]',
};

/**
 * The rooms through the day (2026-10-19, Rahman: the room plan on a page of its own, "elegant so they
 * don't get confused"): SchoolMan's ClassroomToday without its grid of codes. A row per room, floor by
 * floor, the hours across with the half hours faint, each class a block in its part of the day's colour
 * with its course and teacher; cover in amber, a missing teacher in red, a cancelled class striped. A
 * free room is plain to see. The search lights up what it finds; a click opens the class at the side.
 */
export function RoomPlan({
  day,
  today,
  lessons,
  rooms,
  editing,
}: {
  day: string;
  today: string;
  lessons: DayLesson[];
  rooms: { id: string; name: string; floor: number | null }[];
  editing?: Omit<LessonEditing, 'lessons'>;
}) {
  const { t, lang } = useWsLang();
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();

  useEffect(() => {
    if (day !== today) return;
    const tick = () => setNow(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [day, today]);

  const hit = (l: DayLesson) =>
    !needle || [l.label, l.typeName, l.number, l.roomName, l.teacherName, l.replacedTeacherName, ...l.learners.map((p) => p.name)].some((v) => v?.toLowerCase().includes(needle));
  const floors = [...new Set(rooms.map((r) => r.floor))];
  // The plan's rooms with a class that takes place: a class without a room, or in a room off the plan,
  // has its own row below and is no room in use (it read „15 von 14", 2026-10-20).
  const used = rooms.filter((r) => lessons.some((l) => !l.cancelled && l.roomId === r.id)).length;
  // A group taught with others that day sits in their room: it is not without one.
  const homeless = lessons.filter((l) => !l.joins.length && (!l.roomId || !rooms.some((r) => r.id === l.roomId)));
  const hours = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);
  const showNow = now && minutes(now) >= FIRST * 60 && minutes(now) <= LAST * 60;
  const sessions = SESSIONS.filter((s) => lessons.some((l) => l.session === s));
  const doubled = lessons.some(
    (l) => l.roomId && !l.cancelled && lessons.some((o) => o.id !== l.id && !o.cancelled && o.roomId === l.roomId && l.startsAt && l.endsAt && o.startsAt && o.endsAt && o.startsAt < l.endsAt && o.endsAt > l.startsAt)
  );

  const row = (key: string, name: ReactNode, own: DayLesson[], zebra: boolean, room = true) => {
    // Two classes in one room at the same time (SchoolMan does not stop it, 2026-10-20): each gets a lane
    // of its own, so both can be seen and opened, and both are marked; merging them is in their panel.
    const timed = own.filter((l) => l.startsAt && l.endsAt && !l.cancelled).sort((a, b) => a.startsAt!.localeCompare(b.startsAt!));
    const lane = new Map<string, number>();
    const ends: string[] = [];
    for (const l of timed) {
      const free = ends.findIndex((end) => end <= l.startsAt!);
      const index = free === -1 ? ends.length : free;
      ends[index] = l.endsAt!;
      lane.set(l.id, index);
    }
    const lanes = Math.max(1, ends.length);
    const clash = (l: DayLesson) => room && timed.some((o) => o.id !== l.id && o.startsAt! < l.endsAt! && o.endsAt! > l.startsAt!);
    return (
    <div key={key} className={cn('grid grid-cols-[10rem_1fr] border-b border-ws-line-soft last:border-b-0', zebra && 'bg-[#fafbfd]')}>
      <div className="sticky left-0 z-20 flex items-center border-r border-ws-line bg-inherit px-4 py-2">
        <span className={cn('block truncate text-[0.86rem] font-bold', own.length ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]')}>{name}</span>
      </div>
      <div className="relative" style={{ height: `${3.6 + (lanes - 1) * 3.1}rem` }}>
        {own.length === 0 ? <span className="absolute inset-y-0 left-3 flex items-center text-[0.74rem] font-semibold text-[var(--casa-text-subtle)]">{t('frei', 'free')}</span> : null}
        {own.map((l) => {
          // Who sits here with the groups that join it, against the room's seats (0074).
          const total = l.joinedBy.length ? together(l, lessons) : 0;
          const full = total && l.roomMax && total > l.roomMax ? 'over' : total && l.roomCapacity && total > l.roomCapacity ? 'tight' : null;
          const both = clash(l);
          const index = lane.get(l.id) ?? 0;
          return l.startsAt && l.endsAt ? (
            <button
              key={l.id}
              type="button"
              onClick={() => setOpenId(l.id)}
              title={[
                `${l.label} ${l.typeName}`,
                `${l.startsAt}–${l.endsAt}`,
                l.teacherName,
                l.joinedBy.length ? t(`zusammengelegt mit ${l.joinedBy.map(groupName).join(', ')}`, `merged with ${l.joinedBy.map(groupName).join(', ')}`) : null,
                total ? t(`etwa ${total} Lernende · ${l.roomCapacity ?? '?'} Plätze`, `about ${total} learners · ${l.roomCapacity ?? '?'} seats`) : null,
                both ? t('Zur gleichen Zeit eine andere Gruppe im selben Raum', 'Another group in the same room at the same time') : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              style={{
                left: `${at(l.startsAt)}%`,
                width: `${Math.max(3, at(l.endsAt) - at(l.startsAt))}%`,
                top: `${0.375 + index * 3.1}rem`,
                height: `${3.6 - 0.75}rem`,
              }}
              className={cn(
                'absolute z-10 flex min-w-0 flex-col justify-center overflow-hidden rounded-lg border-l-4 px-2.5 text-left leading-tight shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-[transform,box-shadow,opacity] outline-none hover:-translate-y-px hover:shadow-[0_8px_18px_-10px_rgba(15,23,42,0.45)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/50',
                l.cancelled
                  ? 'border-[#b8c0cc] bg-[repeating-linear-gradient(135deg,#f3f5f8_0_6px,#e8ecf1_6px_12px)] text-[var(--casa-muted)]'
                  : l.teacherAway
                    ? 'border-[#d14343] bg-[#fde3e3] text-[#7f1d1d]'
                    : l.substitute
                      ? 'border-[#d99a00] bg-[#ffeec2] text-[#4a3500] ring-1 ring-[#d99a00]/40 ring-inset'
                      : l.session
                        ? BLOCK[l.session]
                        : 'border-[var(--fm-navy)] bg-[#e9effa] text-[#1d2f52]',
                full === 'over' && 'ring-2 ring-[#d14343] ring-inset',
                full === 'tight' && 'ring-2 ring-[#d99a00] ring-inset',
                both && 'outline-2 outline-offset-1 outline-[#d14343] outline-dashed',
                needle && !hit(l) && 'opacity-25',
                needle && hit(l) && 'ring-2 ring-[var(--casa-ink-deep)]'
              )}
            >
              <span className="truncate text-[0.8rem] font-extrabold">
                {l.label} <span className="font-semibold opacity-70">{l.number ? `#${l.number}` : ''}</span>
                {l.joinedBy.length ? <span className="font-semibold"> + {l.joinedBy.map((g) => (g.number ? `#${g.number}` : g.label)).join(', ')}</span> : null}
              </span>
              <span className="truncate text-[0.72rem] font-medium opacity-85">
                {shortName(l.teacherName)}
                {total ? ` · ${total}/${l.roomCapacity ?? '?'}` : ''}
              </span>
            </button>
          ) : null;
        })}
      </div>
    </div>
    );
  };

  // Every other room a shade darker, across the floors: the eye keeps to its row.
  const order = new Map(rooms.map((r, i) => [r.id, i]));
  return (
    <section className="overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-4 py-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.76rem] font-semibold text-[var(--casa-muted)]" aria-label={t('Legende', 'Legend')}>
          {sessions.map((s) => (
            <Legend key={s} swatch={cn('border-l-4', BLOCK[s])}>
              {pick(lang, SESSION_LABELS[s])}
            </Legend>
          ))}
          <Legend swatch="border-l-4 border-[#d99a00] bg-[#ffeec2]">{t('Vertretung', 'Cover')}</Legend>
          <Legend swatch="border-l-4 border-[#d14343] bg-[#fde3e3]">{t('Lehrkraft fehlt', 'Teacher away')}</Legend>
          <Legend swatch="border-l-4 border-[#b8c0cc] bg-[repeating-linear-gradient(135deg,#f3f5f8_0_3px,#e8ecf1_3px_6px)]">{t('Fällt aus', 'Cancelled')}</Legend>
          {doubled ? <Legend swatch="outline-2 outline-offset-1 outline-[#d14343] outline-dashed">{t('Raum doppelt belegt', 'Room double-booked')}</Legend> : null}
          <li className="text-[var(--casa-ink)]">{t(`${used} von ${rooms.length} Räumen belegt`, `${used} of ${rooms.length} rooms in use`)}</li>
        </ul>
        <Search value={q} onChange={setQ} placeholder={t('Name oder Kurs', 'Name or course')} label={t('Im Raumplan suchen', 'Search the room plan')} />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="sticky top-0 z-30 grid grid-cols-[10rem_1fr] border-b border-ws-line bg-[var(--ws-head)]">
            <span className="sticky left-0 z-20 border-r border-ws-line bg-[var(--ws-head)] px-4 py-2 text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Raum', 'Room')}</span>
            <div className="relative h-9">
              {hours.map((h, i) => (
                <span
                  key={h}
                  style={{ left: `${((h - FIRST) / (LAST - FIRST)) * 100}%` }}
                  className={cn('absolute top-2.5 text-[0.74rem] font-bold text-[var(--casa-ink)] tabular-nums', i === 0 ? 'translate-x-1' : i === hours.length - 1 ? '-translate-x-[calc(100%+4px)]' : '-translate-x-1/2')}
                >
                  {String(h).padStart(2, '0')}:00
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            {/* The hours and half hours under the rooms, and now as a line across them. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 left-[10rem]">
              {hours.map((h) => (
                <span key={h} style={{ left: `${((h - FIRST) / (LAST - FIRST)) * 100}%` }} className="absolute inset-y-0 w-px bg-[#e3e8ef]" />
              ))}
              {hours.slice(0, -1).map((h) => (
                <span key={`${h}-half`} style={{ left: `${((h + 0.5 - FIRST) / (LAST - FIRST)) * 100}%` }} className="absolute inset-y-0 w-px bg-[#f0f3f7]" />
              ))}
              {showNow ? (
                <span style={{ left: `${at(now!)}%` }} className="absolute inset-y-0 z-20 w-0.5 bg-[#d14343]">
                  <span className="absolute -top-0 -translate-x-1/2 rounded-full bg-[#d14343] px-1.5 py-px text-[0.66rem] font-bold text-white tabular-nums">{now}</span>
                </span>
              ) : null}
            </div>
            {floors.map((floor) => (
              <div key={String(floor)}>
                <p className="sticky left-0 border-b border-ws-line bg-[#f4f6f9] px-4 py-1.5 text-[0.74rem] font-extrabold text-[var(--casa-ink)]">{floorName(floor, t)}</p>
                {rooms
                  .filter((r) => r.floor === floor)
                  .map((r) => row(r.id, r.name, lessons.filter((l) => l.roomId === r.id), (order.get(r.id) ?? 0) % 2 === 1))}
              </div>
            ))}
            {homeless.length ? (
              <div>
                <p className="border-b border-ws-line bg-[#f4f6f9] px-4 py-1.5 text-[0.74rem] font-extrabold text-[var(--casa-ink)]">{t('Ohne Raum', 'No room')}</p>
                {row('none', '—', homeless, false, false)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {lessons.length === 0 ? <p className="border-t border-ws-line-soft px-5 py-4 text-center text-[0.86rem] text-[var(--casa-muted)]">{t('An diesem Tag ist kein Unterricht.', 'No lessons on this day.')}</p> : null}
      <LessonPanel lesson={lessons.find((l) => l.id === openId) ?? null} day={day} editing={editing ? { ...editing, lessons } : undefined} onClose={() => setOpenId(null)} />
    </section>
  );
}

function Legend({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={cn('inline-block h-3.5 w-5 rounded-[4px]', swatch)} />
      {children}
    </li>
  );
}
