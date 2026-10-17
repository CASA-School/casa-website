/**
 * A course start's schedule and room as the forms read and write them (2026-10-17). Pure: the
 * „Termin planen" and „Bearbeiten" forms use it in the browser, the actions on the server.
 *
 * The schedule stores its hours as `HH:MM-HH:MM` (0001's `is_valid_schedule`): a typed en dash, spaces
 * or `9.00` are read as that, and a start with no hours takes its time of day's — what CASA's starts
 * have always run at (the seeds and SchoolMan's courses).
 */

import type { Bilingual } from './i18n';

export type Session = 'morning' | 'afternoon' | 'evening';

export const SESSIONS: readonly Session[] = ['morning', 'afternoon', 'evening'];

/** The hours a time of day runs at: Vormittag, Nachmittag, Abend (the evening terms, 18:30–20:00). */
export const SESSION_TIMES: Record<Session, string> = {
  morning: '09:00-12:30',
  afternoon: '13:00-17:30',
  evening: '18:30-20:00',
};

export const isSession = (value: unknown): value is Session => typeof value === 'string' && (SESSIONS as readonly string[]).includes(value);

const pad = (n: number) => String(n).padStart(2, '0');

/** `9`, `9:00`, `09.00`, `0900` → `09:00`; null when it is no time of day. */
function clock(raw: string): string | null {
  const m = /^(\d{1,2})(?:[:.]?(\d{2}))?$/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? '0');
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

export type TimeRead = { ok: true; time: string } | { ok: false; error: 'missing' | 'invalid' | 'order' };

/**
 * A typed time range as the schedule stores it. Empty: the time of day's hours, or `missing` without
 * one. `09:00 – 12:30`, `9-12.30`, `09:00 bis 12:30` all read as `09:00-12:30`.
 */
export function readTimeRange(raw: string | null | undefined, session: Session | null): TimeRead {
  const value = (raw ?? '').trim();
  if (!value) return session ? { ok: true, time: SESSION_TIMES[session] } : { ok: false, error: 'missing' };
  const parts = value
    .replace(/\s*(?:–|—|‒|−|-|bis|to)\s*/i, '|')
    .replace(/\s*Uhr\s*/gi, '')
    .split('|');
  if (parts.length !== 2) return { ok: false, error: 'invalid' };
  const from = clock(parts[0]);
  const to = clock(parts[1]);
  if (!from || !to) return { ok: false, error: 'invalid' };
  if (to <= from) return { ok: false, error: 'order' };
  return { ok: true, time: `${from}-${to}` };
}

/** The time of day a start's hours fall in, as the board and the waiting list read it. */
export function sessionOfTime(time: string | null | undefined): Session | null {
  const hour = Number(/^(\d{1,2})/.exec(time ?? '')?.[1]);
  if (!Number.isFinite(hour)) return null;
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

type RoomNames = { name: string; nickname: string | null };

/** A room as the team calls it: its city (`Augsburg`), else its name (`EG 8`). */
export const roomName = (room: RoomNames): string => room.nickname || room.name;

/** A room in a list of choices: `Augsburg · EG 8`, the city first. */
export const roomChoice = (room: RoomNames): string => (room.nickname ? `${room.nickname} · ${room.name}` : room.name);

/** The next start from a list: the first that begins today or later, not one under way. */
export function nextStart<T extends { startDate: Date | string }>(starts: readonly T[], today: string): T | null {
  const day = (value: Date | string) => {
    if (typeof value === 'string') return value.slice(0, 10);
    // A Postgres `date` arrives as local midnight.
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  };
  return starts.filter((s) => day(s.startDate) >= today).sort((a, b) => (day(a.startDate) < day(b.startDate) ? -1 : 1))[0] ?? null;
}

export const WEEKDAY_CODES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What „Termin planen" and a start's „Bearbeiten" post about its dates, schedule, room and website. */
export type StartFields = {
  startDate: string;
  endDate: string;
  session: Session | null;
  days: string[];
  time: string;
  title: string | null;
  roomId: string | null;
  onWebsite: boolean;
};

type FormLike = { get(name: string): unknown; getAll(name: string): unknown[] };

const TIME_ERRORS: Record<'missing' | 'invalid' | 'order', Bilingual> = {
  missing: { de: 'Gib eine Uhrzeit an oder wähle eine Tageszeit.', en: 'Give the hours or choose a time of day.' },
  invalid: { de: 'Die Uhrzeit bitte als 09:00-12:30.', en: 'Give the hours as 09:00-12:30.' },
  order: { de: 'Die Uhrzeit endet vor ihrem Beginn.', en: 'The hours end before they begin.' },
};

/** The form read and checked: the hours normalised, an empty time filled from the time of day. */
export function readStartForm(form: FormLike): { ok: true; value: StartFields } | { ok: false; error: Bilingual } {
  const str = (name: string) => String(form.get(name) ?? '').trim();
  const startDate = str('startDate');
  const endDate = str('endDate');
  if (!DATE.test(startDate) || !DATE.test(endDate)) return { ok: false, error: { de: 'Beginn und Ende sind nötig.', en: 'Start and end dates are required.' } };
  if (endDate < startDate) return { ok: false, error: { de: 'Das Ende liegt vor dem Beginn.', en: 'The end is before the start.' } };
  const raw = str('session');
  const session = isSession(raw) ? raw : null;
  const time = readTimeRange(str('time'), session);
  if (!time.ok) return { ok: false, error: TIME_ERRORS[time.error] };
  const days = form
    .getAll('days')
    .map(String)
    .filter((d): d is (typeof WEEKDAY_CODES)[number] => (WEEKDAY_CODES as readonly string[]).includes(d));
  if (!days.length) return { ok: false, error: { de: 'Wähle mindestens einen Tag.', en: 'Choose at least one day.' } };
  const room = str('roomId');
  return {
    ok: true,
    value: {
      startDate,
      endDate,
      session,
      days: WEEKDAY_CODES.filter((d) => days.includes(d)),
      time: time.time,
      title: str('title').slice(0, 120) || null,
      roomId: UUID.test(room) ? room : null,
      onWebsite: form.get('onWebsite') === 'on',
    },
  };
}
