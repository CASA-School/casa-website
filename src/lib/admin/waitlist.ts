import 'server-only';

import type { PoolClient } from 'pg';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import type { Bilingual } from './i18n';
import { sittingWords } from './exams';
import { setQueueStatus } from './queues';

/**
 * The waiting list (2026-10-16, migration 0031; docs/ADMIN_WORKSPACE.md §Waiting list).
 *
 * A level group within a course start — "B1.1, Intensive mornings from 26 Oct" — has places:
 * groups × places per group (14 unless set). Booked places are counted from the bookings, an offered
 * place is held for the learner it was offered to, and what is left is free. When a level is full,
 * learners queue for it in order; when a place frees up, the first in the queue is up; when the
 * queue is long, a second group of the level adds places.
 *
 * Nothing here is stored that can be counted: places taken, free places and a learner's position
 * are worked out on every read, so they cannot go stale the way SchoolMan's stored counters did.
 */

export const DEFAULT_PLACES_PER_GROUP = 14;

export const WAITLIST_STATUSES = ['waiting', 'offered', 'booked', 'declined', 'withdrawn'] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];
export const OPEN_WAITLIST_STATUSES: readonly WaitlistStatus[] = ['waiting', 'offered'];

export const WAITLIST_STATUS_LABELS: Record<WaitlistStatus, Bilingual> = {
  waiting: { de: 'Wartet', en: 'Waiting' },
  offered: { de: 'Platz angeboten', en: 'Place offered' },
  booked: { de: 'Gebucht', en: 'Booked' },
  declined: { de: 'Abgesagt', en: 'Declined' },
  withdrawn: { de: 'Von der Liste genommen', en: 'Taken off the list' },
};

export type WaitlistSource = 'office' | 'registration' | 'booking';
export const WAITLIST_SOURCE_LABELS: Record<WaitlistSource, Bilingual> = {
  office: { de: 'Im Büro eingetragen', en: 'Added in the office' },
  registration: { de: 'Anmeldung über die Website', en: 'Website registration' },
  booking: { de: 'Weiter nach einem Kurs', en: 'Continuing after a course' },
};

/** Why an entry leaves the list without a booking. Stored in English, read in the reader's language. */
export const CLOSE_REASONS = ['no_longer_interested', 'other_course', 'no_reply', 'other'] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number] | 'no_place';
/** `no_place` is set by the "no place this time" letter, not chosen in the dialog. */
export const CLOSE_REASON_LABELS: Record<CloseReason, Bilingual> = {
  no_longer_interested: { de: 'Kein Interesse mehr', en: 'No longer interested' },
  other_course: { de: 'Anderen Kurs gebucht', en: 'Booked another course' },
  no_reply: { de: 'Keine Antwort', en: 'No reply' },
  other: { de: 'Sonstiges', en: 'Other' },
  no_place: { de: 'Kein Platz frei geworden', en: 'No place became free' },
};

export type Session = 'morning' | 'afternoon' | 'evening';

/** A start's time of day: its own `session`, or read from the schedule's time ("09:00-12:30"). */
export function sessionOf(session: string | null, schedule: { time?: string } | null): Session | null {
  if (session === 'morning' || session === 'afternoon' || session === 'evening') return session;
  const hour = Number(/^(\d{1,2})/.exec(schedule?.time ?? '')?.[1]);
  if (!Number.isFinite(hour)) return null;
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

/** What is left in a level group: free places, never below zero — an overbooked group is full. */
export const freePlaces = (g: { places: number; booked: number; offered: number }) => Math.max(0, g.places - g.booked - g.offered);

/** The free place's signal: someone is waiting and a place is there for them. */
export const placeForNext = (g: { places: number; booked: number; offered: number; waiting: number }) =>
  g.waiting > 0 && freePlaces(g) > 0;

// ------------------------------------------------------------------ reads

/** Booked places per start and level: bookings that are not cancelled, with a period there. */
const BOOKED = `
  SELECT bp.course_instance_id, bp.level_code, count(DISTINCT bp.booking_id)::int AS n
    FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
   WHERE b.deleted_at IS NULL AND b.status <> 'cancelled' AND bp.level_code IS NOT NULL
   GROUP BY bp.course_instance_id, bp.level_code`;

/** Open entries per start and level, split into waiting and offered. */
const QUEUED = `
  SELECT course_instance_id, level_code,
         count(*) FILTER (WHERE status = 'waiting')::int AS waiting,
         count(*) FILTER (WHERE status = 'offered')::int AS offered
    FROM waitlist_entries WHERE status IN ('waiting', 'offered')
   GROUP BY course_instance_id, level_code`;

/**
 * Kursplanung's groups of an intensive start's level (docs/KURSPLANUNG.md §Course starts): the board's
 * level and phase in the planning month the start opens — `kursplanung/course-link.ts`, in SQL — and,
 * for a `.1` level, in the start's own shift (a `.2` joiner sits in the previous start's class, in the
 * other one). Needs `k` (level_code), `ci` and `ct` in scope.
 */
const PLANNED = `(SELECT count(*)::int FROM course_groups g
                   WHERE ct.format = 'intensive'
                     AND g.month = date_trunc('month', ci.start_date + 14)::date
                     AND g.level = regexp_replace(k.level_code, '\\.[12]$', '')
                     AND g.phase = CASE WHEN k.level_code ~ '\\.2$' THEN '2' ELSE '1' END
                     AND (g.phase = '2' OR g.shift = coalesce(
                           CASE WHEN ci.session IN ('morning', 'afternoon') THEN ci.session END,
                           CASE WHEN substring(ci.schedule->>'time' from '^\\d{1,2}')::int < 12 THEN 'morning'
                                WHEN substring(ci.schedule->>'time' from '^\\d{1,2}')::int < 17 THEN 'afternoon' END,
                           g.shift)))`;

export type LevelGroup = {
  courseInstanceId: string;
  levelCode: string;
  groups: number;
  placesPerGroup: number;
  places: number;
  booked: number;
  offered: number;
  waiting: number;
  /** Whether places were set for this level, or it is the default (one group of 14). */
  set: boolean;
};

type GroupRow = {
  course_instance_id: string;
  level_code: string;
  groups: number | null;
  places_per_group: number | null;
  booked: number | null;
  offered: number | null;
  waiting: number | null;
  planned?: number | null;
};

const toGroup = (r: GroupRow): LevelGroup => {
  // Kursplanung's groups for the level count too: a group opened on the board is a group here.
  const groups = Math.max(r.groups ?? 1, r.planned ?? 0);
  const placesPerGroup = r.places_per_group ?? DEFAULT_PLACES_PER_GROUP;
  return {
    courseInstanceId: r.course_instance_id,
    levelCode: r.level_code,
    groups,
    placesPerGroup,
    places: groups * placesPerGroup,
    booked: r.booked ?? 0,
    offered: r.offered ?? 0,
    waiting: r.waiting ?? 0,
    set: r.groups !== null || (r.planned ?? 0) > 0,
  };
};

/**
 * The level groups of the given starts that have anything: places set, bookings or a queue. Sorted
 * by start, then level. A level with nothing yet is one group of 14, and appears once used.
 */
export async function levelGroups(courseInstanceIds: readonly string[]): Promise<LevelGroup[]> {
  if (courseInstanceIds.length === 0) return [];
  const rows = await query<GroupRow & { sort_order: number }>(
    `WITH booked AS (${BOOKED}), queued AS (${QUEUED}),
          keys AS (
            SELECT course_instance_id, level_code FROM course_level_places WHERE course_instance_id = ANY($1::uuid[])
            UNION SELECT course_instance_id, level_code FROM booked WHERE course_instance_id = ANY($1::uuid[])
            UNION SELECT course_instance_id, level_code FROM queued WHERE course_instance_id = ANY($1::uuid[])
          )
     SELECT k.course_instance_id, k.level_code, p.groups, p.places_per_group,
            b.n AS booked, q.offered, q.waiting, l.sort_order, ${PLANNED} AS planned
       FROM keys k
       JOIN levels l ON l.code = k.level_code
       JOIN course_instances ci ON ci.id = k.course_instance_id
       JOIN course_types ct ON ct.id = ci.course_type_id
       LEFT JOIN course_level_places p ON p.course_instance_id = k.course_instance_id AND p.level_code = k.level_code
       LEFT JOIN booked b ON b.course_instance_id = k.course_instance_id AND b.level_code = k.level_code
       LEFT JOIN queued q ON q.course_instance_id = k.course_instance_id AND q.level_code = k.level_code
      ORDER BY k.course_instance_id, l.sort_order`,
    [courseInstanceIds]
  );
  return rows.map(toGroup);
}

/** One level group, with the default when nothing was set or booked yet. */
export async function levelGroup(courseInstanceId: string, levelCode: string): Promise<LevelGroup> {
  const [found] = (await levelGroups([courseInstanceId])).filter((g) => g.levelCode === levelCode);
  return (
    found ?? {
      courseInstanceId,
      levelCode,
      groups: 1,
      placesPerGroup: DEFAULT_PLACES_PER_GROUP,
      places: DEFAULT_PLACES_PER_GROUP,
      booked: 0,
      offered: 0,
      waiting: 0,
      set: false,
    }
  );
}

export type CourseStart = {
  id: string;
  courseTypeName: string;
  startDate: Date;
  endDate: Date;
  session: Session | null;
  time: string | null;
  days: string[];
  title: string | null;
  status: string;
  roomName: string | null;
  /** Bookings in this start whose period has no level yet: they hold places no level counts. */
  withoutLevel: number;
};

export async function getCourseStart(id: string): Promise<CourseStart | null> {
  const row = await queryFirst<{
    id: string;
    course_type_name: string;
    start_date: Date;
    end_date: Date;
    session: string | null;
    schedule: { days?: string[]; time?: string } | null;
    title: string | null;
    status: string;
    room_name: string | null;
    without_level: string;
  }>(
    `SELECT i.id, t.name AS course_type_name, i.start_date, i.end_date, i.session, i.schedule, i.title, i.status,
            coalesce(r.nickname, r.name) AS room_name,
            (SELECT count(DISTINCT bp.booking_id) FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
              WHERE bp.course_instance_id = i.id AND bp.level_code IS NULL
                AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS without_level
       FROM course_instances i
       JOIN course_types t ON t.id = i.course_type_id
       LEFT JOIN rooms r ON r.id = i.room_id
      WHERE i.id = $1`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id,
    courseTypeName: row.course_type_name,
    startDate: row.start_date,
    endDate: row.end_date,
    session: sessionOf(row.session, row.schedule),
    time: row.schedule?.time ?? null,
    days: Array.isArray(row.schedule?.days) ? row.schedule.days : [],
    title: row.title,
    status: row.status,
    roomName: row.room_name,
    withoutLevel: Number(row.without_level),
  };
}

export type WaitlistEntry = {
  id: string;
  personId: string;
  personName: string;
  email: string | null;
  courseInstanceId: string;
  courseTypeName: string;
  startDate: Date;
  session: Session | null;
  levelCode: string;
  status: WaitlistStatus;
  /** Place in the queue, 1 first; null once closed. */
  position: number | null;
  joinedAt: Date;
  source: WaitlistSource;
  registrationId: string | null;
  note: string | null;
  offeredAt: Date | null;
  offeredByName: string | null;
  closedAt: Date | null;
  closeReason: string | null;
  bookingId: string | null;
};

type EntryRow = {
  id: string;
  person_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  course_instance_id: string;
  course_type_name: string;
  start_date: Date;
  session: string | null;
  schedule: { time?: string } | null;
  level_code: string;
  status: WaitlistStatus;
  position: number | null;
  joined_at: Date;
  source: WaitlistSource;
  registration_id: string | null;
  note: string | null;
  offered_at: Date | null;
  offered_by_name: string | null;
  closed_at: Date | null;
  close_reason: string | null;
  booking_id: string | null;
};

/** Entries with their position among the open ones of the same start and level. */
const ENTRIES = `
  SELECT w.id, canonical_person_id(w.person_id) AS person_id, p.first_name, p.last_name,
         (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
         w.course_instance_id, t.name AS course_type_name, i.start_date, i.session, i.schedule,
         w.level_code, w.status,
         CASE WHEN w.status IN ('waiting', 'offered')
              THEN row_number() OVER (PARTITION BY w.course_instance_id, w.level_code, (w.status IN ('waiting', 'offered')) ORDER BY w.rank, w.joined_at)
         END::int AS position,
         w.joined_at, w.source, w.registration_id, w.note, w.offered_at, ou.name AS offered_by_name,
         w.closed_at, w.close_reason, w.booking_id
    FROM waitlist_entries w
    JOIN people p ON p.id = w.person_id
    JOIN course_instances i ON i.id = w.course_instance_id
    JOIN course_types t ON t.id = i.course_type_id
    LEFT JOIN staff_users ou ON ou.id = w.offered_by`;

const toEntry = (r: EntryRow): WaitlistEntry => ({
  id: r.id,
  personId: r.person_id,
  personName: [r.first_name, r.last_name].filter(Boolean).join(' '),
  email: r.email,
  courseInstanceId: r.course_instance_id,
  courseTypeName: r.course_type_name,
  startDate: r.start_date,
  session: sessionOf(r.session, r.schedule),
  levelCode: r.level_code,
  status: r.status,
  position: r.position,
  joinedAt: r.joined_at,
  source: r.source,
  registrationId: r.registration_id,
  note: r.note,
  offeredAt: r.offered_at,
  offeredByName: r.offered_by_name,
  closedAt: r.closed_at,
  closeReason: r.close_reason,
  bookingId: r.booking_id,
});

/** A start's queues: the open entries in order, then the closed ones, latest first. */
export async function startEntries(courseInstanceId: string): Promise<WaitlistEntry[]> {
  const rows = await query<EntryRow>(
    `SELECT * FROM (${ENTRIES} WHERE w.course_instance_id = $1) x
      ORDER BY (status IN ('waiting', 'offered')) DESC, level_code, position NULLS LAST, closed_at DESC`,
    [courseInstanceId]
  );
  return rows.map(toEntry);
}

/** Everything a person is or was waiting for, linked records included, the open ones first. */
export async function personEntries(canonicalPersonId: string): Promise<WaitlistEntry[]> {
  const rows = await query<EntryRow>(
    `SELECT * FROM (${ENTRIES}) x
      WHERE canonical_person_id(x.person_id) = $1
      ORDER BY (status IN ('waiting', 'offered')) DESC, joined_at DESC`,
    [canonicalPersonId]
  );
  return rows.map(toEntry);
}

export type WaitlistView = 'free' | 'waiting' | 'offered' | 'started' | 'closed';

/**
 * The waiting-list screen. `free`: queues where a place is free for the next learner; `waiting` and
 * `offered`: open entries of starts still ahead; `started`: open entries whose course has begun —
 * to move to a later start or close; `closed`: the last 200 that left the list.
 */
export async function listEntries(view: WaitlistView, search?: string): Promise<WaitlistEntry[]> {
  const params: unknown[] = [];
  const conditions: string[] = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(first_name ILIKE $1 OR last_name ILIKE $1 OR course_type_name ILIKE $1 OR level_code ILIKE $1)`);
  }
  const open = `status IN ('waiting', 'offered')`;
  if (view === 'closed') conditions.push(`NOT ${open}`);
  else if (view === 'started') conditions.push(`${open} AND start_date <= current_date`);
  else if (view === 'offered') conditions.push(`status = 'offered' AND start_date > current_date`);
  else if (view === 'waiting') conditions.push(`${open} AND start_date > current_date`);
  else {
    // Queues with a free place: worked out from the same numbers as a start's page.
    conditions.push(`${open} AND start_date > current_date AND (course_instance_id, level_code) IN (
      SELECT g.course_instance_id, g.level_code FROM (
        SELECT q.course_instance_id, q.level_code, q.waiting, q.offered,
               coalesce(p.groups, 1) * coalesce(p.places_per_group, ${DEFAULT_PLACES_PER_GROUP}) AS places,
               coalesce(b.n, 0) AS booked
          FROM (${QUEUED}) q
          LEFT JOIN course_level_places p ON p.course_instance_id = q.course_instance_id AND p.level_code = q.level_code
          LEFT JOIN (${BOOKED}) b ON b.course_instance_id = q.course_instance_id AND b.level_code = q.level_code
      ) g WHERE g.waiting > 0 AND g.places - g.booked - g.offered > 0)`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = view === 'closed' ? 'closed_at DESC LIMIT 200' : 'start_date, course_type_name, level_code, position';
  const rows = await query<EntryRow>(`SELECT * FROM (${ENTRIES}) x ${where} ORDER BY ${order}`, params);
  return rows.map(toEntry);
}

export type WaitlistCounts = Record<WaitlistView, number>;

/** The counts for the screen's views and the overview: waiting, free places for the next, offered, begun. */
export async function waitlistCounts(): Promise<WaitlistCounts> {
  const views: WaitlistView[] = ['free', 'waiting', 'offered', 'started'];
  const lists = await Promise.all(views.map((v) => listEntries(v)));
  return {
    free: new Set(lists[0].map((e) => `${e.courseInstanceId}:${e.levelCode}`)).size,
    waiting: lists[1].length,
    offered: lists[2].length,
    started: lists[3].length,
    closed: 0,
  };
}

/**
 * The wizard's view of the starts ahead: places per level with the waiting learners in order, so a
 * full level — or one with a queue in front of the learner — shows before anything is booked.
 */
export async function upcomingLevelPlaces(): Promise<Map<string, Record<string, { places: number; booked: number; offered: number; queue: string[]; offeredTo: string[] }>>> {
  const starts = await query<{ id: string }>(
    `SELECT id FROM course_instances WHERE end_date >= current_date AND status <> 'cancelled'`
  );
  const ids = starts.map((s) => s.id);
  const [groups, queued] = await Promise.all([
    levelGroups(ids),
    ids.length
      ? query<{ course_instance_id: string; level_code: string; person_id: string; status: WaitlistStatus }>(
          `SELECT course_instance_id, level_code, canonical_person_id(person_id) AS person_id, status FROM waitlist_entries
            WHERE course_instance_id = ANY($1::uuid[]) AND status IN ('waiting', 'offered') ORDER BY rank, joined_at`,
          [ids]
        )
      : Promise.resolve([]),
  ]);
  const out = new Map<string, Record<string, { places: number; booked: number; offered: number; queue: string[]; offeredTo: string[] }>>();
  for (const g of groups) {
    const levels = out.get(g.courseInstanceId) ?? {};
    levels[g.levelCode] = { places: g.places, booked: g.booked, offered: g.offered, queue: [], offeredTo: [] };
    out.set(g.courseInstanceId, levels);
  }
  for (const q of queued) {
    const level = out.get(q.course_instance_id)?.[q.level_code];
    if (level) (q.status === 'offered' ? level.offeredTo : level.queue).push(q.person_id);
  }
  return out;
}

/** All level codes, in teaching order. */
export async function levelCodes(): Promise<string[]> {
  const rows = await query<{ code: string }>(`SELECT code FROM levels ORDER BY sort_order`);
  return rows.map((r) => r.code);
}

export type StartBooking = {
  id: string;
  personId: string;
  personName: string;
  levelCode: string | null;
  status: 'reserved' | 'confirmed' | 'completed' | 'cancelled';
  charged: number;
  paid: number;
  observationReason: string | null;
};

/** Who is booked into a start, by level: the learners a level's places are counted from. */
export async function startBookings(courseInstanceId: string): Promise<StartBooking[]> {
  const rows = await query<{
    id: string;
    person_id: string;
    first_name: string;
    last_name: string | null;
    level_code: string | null;
    status: StartBooking['status'];
    charged: string;
    paid: string;
    observation_reason: string | null;
  }>(
    `SELECT DISTINCT ON (b.id) b.id, b.person_id, p.first_name, p.last_name, bp.level_code, b.status::text AS status, b.observation_reason,
            coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0) AS charged,
            coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS paid
       FROM booking_periods bp
       JOIN bookings b ON b.id = bp.booking_id
       JOIN people p ON p.id = b.person_id
      WHERE bp.course_instance_id = $1 AND b.deleted_at IS NULL AND b.status <> 'cancelled'
      ORDER BY b.id, bp.start_date`,
    [courseInstanceId]
  );
  return rows
    .map((r) => ({
      id: r.id,
      personId: r.person_id,
      personName: [r.first_name, r.last_name].filter(Boolean).join(' '),
      levelCode: r.level_code,
      status: r.status,
      charged: Number(r.charged),
      paid: Number(r.paid),
      observationReason: r.observation_reason,
    }))
    .sort((a, b) => a.personName.localeCompare(b.personName));
}

/** The starts ahead, for moving a wish to another one: "Intensive German · 26.10.26 · Vormittag". */
export async function upcomingStarts(): Promise<{ id: string; courseTypeName: string; startDate: Date; session: Session | null }[]> {
  const rows = await query<{ id: string; name: string; start_date: Date; session: string | null; schedule: { time?: string } | null }>(
    `SELECT i.id, t.name, i.start_date, i.session, i.schedule
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
      WHERE i.end_date >= current_date AND i.status <> 'cancelled'
      ORDER BY i.start_date, t.position, t.name`
  );
  return rows.map((r) => ({ id: r.id, courseTypeName: r.name, startDate: r.start_date, session: sessionOf(r.session, r.schedule) }));
}

// -------------------------------------------------------------- mutations

type Refusal = { ok: false; reason: Bilingual };
type Result = { ok: true; id?: string } | Refusal;
const refuse = (de: string, en: string): Refusal => ({ ok: false, reason: { de, en } });

/** A course start's words for the history: "Intensive German from 2026-10-26, B1.1". */
async function startWords(courseInstanceId: string): Promise<{ course: string; start: string }> {
  const row = await queryFirst<{ name: string; start_date: string }>(
    `SELECT t.name, to_char(i.start_date, 'YYYY-MM-DD') AS start_date
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id WHERE i.id = $1`,
    [courseInstanceId]
  );
  return { course: row?.name ?? '', start: row?.start_date ?? '' };
}

/** Puts a learner in the queue of a start's level, at the end. One open place per person and level. */
export async function addToWaitlist(
  input: {
    personId: string;
    courseInstanceId: string;
    levelCode: string;
    source: WaitlistSource;
    registrationId?: string | null;
    note?: string | null;
  },
  actor: StaffUser
): Promise<Result> {
  const already = await queryFirst<{ id: string }>(
    `SELECT id FROM waitlist_entries
      WHERE canonical_person_id(person_id) = canonical_person_id($1) AND course_instance_id = $2 AND level_code = $3
        AND status IN ('waiting', 'offered')`,
    [input.personId, input.courseInstanceId, input.levelCode]
  );
  if (already) return refuse('Diese Person steht für diesen Kurs schon auf der Warteliste.', 'This person is already on the waiting list for this course.');
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO waitlist_entries (person_id, course_instance_id, level_code, rank, source, registration_id, note, created_by)
     VALUES ($1, $2, $3, extract(epoch FROM now()), $4, $5, $6, $7) RETURNING id`,
    [input.personId, input.courseInstanceId, input.levelCode, input.source, input.registrationId ?? null, input.note ?? null, actor.id]
  );
  const words = await startWords(input.courseInstanceId);
  await logActivity({
    actor,
    entity: 'person',
    entityId: input.personId,
    action: 'waitlist_joined',
    detail: { entry: row!.id, level: input.levelCode, ...words },
  });
  // A registration answered with a place in the queue is done: the queue carries it from here.
  if (input.registrationId) await setQueueStatus({ entity: 'course_registration', id: input.registrationId, status: 'done', actor });
  return { ok: true, id: row!.id };
}

/** An entry is a course start's level (`course_instance_id`, `level_code`) or an exam sitting (`exam_session_id`, 0036). */
type EntryCore = {
  id: string;
  person_id: string;
  course_instance_id: string | null;
  level_code: string | null;
  exam_session_id: string | null;
  status: WaitlistStatus;
};

async function entryCore(id: string): Promise<EntryCore | undefined> {
  return queryFirst<EntryCore>(
    `SELECT id, person_id, course_instance_id, level_code, exam_session_id, status FROM waitlist_entries WHERE id = $1`,
    [id]
  );
}

async function logEntry(actor: StaffUser, entry: EntryCore, action: string, extra: Record<string, unknown> = {}) {
  const words = entry.exam_session_id ? await sittingWords(entry.exam_session_id) : await startWords(entry.course_instance_id ?? '');
  await logActivity({ actor, entity: 'person', entityId: entry.person_id, action, detail: { entry: entry.id, level: entry.level_code, ...words, ...extra } });
}

/** A place is offered: it is held for this learner until they are booked, decline, or the offer is taken back. */
export async function offerPlace(id: string, actor: StaffUser): Promise<Result> {
  const entry = await entryCore(id);
  if (!entry || entry.status !== 'waiting') return refuse('Dieser Eintrag wartet nicht mehr.', 'This entry is no longer waiting.');
  await query(`UPDATE waitlist_entries SET status = 'offered', offered_at = now(), offered_by = $2 WHERE id = $1 AND status = 'waiting'`, [id, actor.id]);
  await logEntry(actor, entry, 'waitlist_offered');
  return { ok: true };
}

/** The offer is taken back — no answer, or a mistake — and the learner keeps their place in the queue. */
export async function takeBackOffer(id: string, actor: StaffUser): Promise<Result> {
  const entry = await entryCore(id);
  if (!entry || entry.status !== 'offered') return refuse('Für diesen Eintrag ist kein Platz angeboten.', 'No place is offered on this entry.');
  await query(`UPDATE waitlist_entries SET status = 'waiting', offered_at = NULL, offered_by = NULL WHERE id = $1 AND status = 'offered'`, [id]);
  await logEntry(actor, entry, 'waitlist_offer_taken_back');
  return { ok: true };
}

/** Off the list without a booking: the learner declined an offered place, or no longer waits. */
export async function closeEntry(id: string, status: 'declined' | 'withdrawn', reason: CloseReason, note: string | null, actor: StaffUser): Promise<Result> {
  const entry = await entryCore(id);
  if (!entry || !OPEN_WAITLIST_STATUSES.includes(entry.status)) return refuse('Dieser Eintrag ist schon abgeschlossen.', 'This entry is already closed.');
  await query(
    `UPDATE waitlist_entries SET status = $2, closed_at = now(), closed_by = $3, close_reason = $4,
            note = CASE WHEN $5::text IS NULL THEN note ELSE concat_ws(E'\n', note, $5::text) END
      WHERE id = $1 AND status IN ('waiting', 'offered')`,
    [id, status, actor.id, reason, note]
  );
  await logEntry(actor, entry, status === 'declined' ? 'waitlist_declined' : 'waitlist_withdrawn', { reason, note });
  return { ok: true };
}

/**
 * Moves an entry to another place in its queue, with the colleague's reason. The rank is set between
 * the neighbours at the new place, so nobody else's order changes.
 */
export async function moveEntry(id: string, toPosition: number, reason: string, actor: StaffUser): Promise<Result> {
  const entry = await entryCore(id);
  if (!entry || !OPEN_WAITLIST_STATUSES.includes(entry.status)) return refuse('Dieser Eintrag ist schon abgeschlossen.', 'This entry is already closed.');
  // The entry's own queue: its start's level, or its sitting.
  const queue = await query<{ id: string; rank: number }>(
    entry.exam_session_id
      ? `SELECT id, rank FROM waitlist_entries WHERE exam_session_id = $1 AND status IN ('waiting', 'offered') ORDER BY rank, joined_at`
      : `SELECT id, rank FROM waitlist_entries
          WHERE course_instance_id = $1 AND level_code = $2 AND status IN ('waiting', 'offered')
          ORDER BY rank, joined_at`,
    entry.exam_session_id ? [entry.exam_session_id] : [entry.course_instance_id, entry.level_code]
  );
  const from = queue.findIndex((q) => q.id === id) + 1;
  const others = queue.filter((q) => q.id !== id);
  const to = Math.min(Math.max(1, Math.round(toPosition)), queue.length);
  if (to === from) return { ok: true };
  const before = others[to - 2];
  const after = others[to - 1];
  const rank = before && after ? (Number(before.rank) + Number(after.rank)) / 2 : before ? Number(before.rank) + 1 : Number(after.rank) - 1;
  await query(`UPDATE waitlist_entries SET rank = $2 WHERE id = $1`, [id, rank]);
  await logEntry(actor, entry, 'waitlist_moved', { from, to, reason });
  return { ok: true };
}

/**
 * The same wish, another course: a later start, or the second group's level. The learner keeps the
 * day they joined, so moving does not cost them their turn.
 */
export async function moveToStart(id: string, courseInstanceId: string, levelCode: string, actor: StaffUser): Promise<Result> {
  const entry = await entryCore(id);
  if (!entry || !OPEN_WAITLIST_STATUSES.includes(entry.status)) return refuse('Dieser Eintrag ist schon abgeschlossen.', 'This entry is already closed.');
  if (entry.exam_session_id) return refuse('Ein Prüfungseintrag wechselt den Termin auf der Seite des Termins.', 'An exam entry changes its sitting on the sitting’s page.');
  if (entry.course_instance_id === courseInstanceId && entry.level_code === levelCode) return { ok: true };
  const clash = await queryFirst<{ id: string }>(
    `SELECT id FROM waitlist_entries WHERE person_id = $1 AND course_instance_id = $2 AND level_code = $3 AND status IN ('waiting', 'offered')`,
    [entry.person_id, courseInstanceId, levelCode]
  );
  if (clash) return refuse('Für diesen Kurs steht die Person schon auf der Warteliste.', 'The person is already on that course’s waiting list.');
  const from = await startWords(entry.course_instance_id ?? '');
  await query(
    `UPDATE waitlist_entries SET course_instance_id = $2, level_code = $3, status = 'waiting', offered_at = NULL, offered_by = NULL WHERE id = $1`,
    [id, courseInstanceId, levelCode]
  );
  await logEntry(actor, { ...entry, course_instance_id: courseInstanceId, level_code: levelCode }, 'waitlist_moved_course', {
    fromCourse: from.course,
    fromStart: from.start,
    fromLevel: entry.level_code,
  });
  return { ok: true };
}

/** Places for a start's level: how many groups, how many learners a group takes. */
export async function setPlaces(courseInstanceId: string, levelCode: string, groups: number, placesPerGroup: number, actor: StaffUser): Promise<void> {
  await query(
    `INSERT INTO course_level_places (course_instance_id, level_code, groups, places_per_group, updated_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (course_instance_id, level_code) DO UPDATE
       SET groups = EXCLUDED.groups, places_per_group = EXCLUDED.places_per_group, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [courseInstanceId, levelCode, groups, placesPerGroup, actor.id]
  );
  await logActivity({ actor, entity: 'course_instance', entityId: courseInstanceId, action: 'places_set', detail: { level: levelCode, groups, placesPerGroup } });
}

/** A second (third …) group of the level: more places, and the queue moves up. */
export async function openGroup(courseInstanceId: string, levelCode: string, actor: StaffUser): Promise<Result> {
  const current = await levelGroup(courseInstanceId, levelCode);
  if (current.groups >= 9) return refuse('Mehr Gruppen gehen nicht.', 'No more groups possible.');
  await query(
    `INSERT INTO course_level_places (course_instance_id, level_code, groups, places_per_group, updated_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (course_instance_id, level_code) DO UPDATE
       SET groups = EXCLUDED.groups, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [courseInstanceId, levelCode, current.groups + 1, current.placesPerGroup, actor.id]
  );
  await logActivity({ actor, entity: 'course_instance', entityId: courseInstanceId, action: 'group_opened', detail: { level: levelCode, groups: current.groups + 1 } });
  return { ok: true };
}

/**
 * Inside a booking's transaction: a learner booked into a start leaves its queues there — booked,
 * with the booking — whatever level they waited for. Returns what closed, for the history.
 */
export async function closeOnBooking(
  client: PoolClient,
  personId: string,
  courseInstanceId: string,
  bookingId: string,
  actor: StaffUser
): Promise<EntryCore[]> {
  const { rows } = await client.query<EntryCore>(
    `UPDATE waitlist_entries
        SET status = 'booked', booking_id = $3, closed_at = now(), closed_by = $4, close_reason = NULL
      WHERE canonical_person_id(person_id) = canonical_person_id($1) AND course_instance_id = $2
        AND status IN ('waiting', 'offered')
      RETURNING id, person_id, course_instance_id, level_code, exam_session_id, status`,
    [personId, courseInstanceId, bookingId, actor.id]
  );
  return rows;
}

/** The history lines for entries a booking closed, written after its transaction. */
export async function logClosedByBooking(entries: readonly EntryCore[], bookingId: string, actor: StaffUser): Promise<void> {
  for (const entry of entries) await logEntry(actor, entry, 'waitlist_booked', { booking: bookingId });
}

export type { EntryCore as WaitlistEntryCore };
