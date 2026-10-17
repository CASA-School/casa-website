import 'server-only';

import type { PoolClient } from 'pg';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import type { Bilingual } from './i18n';
import { resolveCourse } from './courses';
import { sittingWords } from './exams';
import { setQueueStatus } from './queues';

/**
 * The waiting list (2026-10-16, migration 0031; docs/ADMIN_WORKSPACE.md §Waiting list), and the places
 * of a course (0041: one level of a start, SchoolMan's `Course`).
 *
 * A course — "B1, Intensive mornings from 26 Oct" — has places:
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

type Places = {
  places: number;
  booked: number;
  offered: number;
  /** A course not offered for booking — SchoolMan closes a full one — has no free place. */
  bookable?: boolean;
  cancelled?: boolean;
  /** The wizard's word for the same. */
  closed?: boolean;
};

/**
 * What is left in a course: free places, never below zero — an overbooked course is full, and a closed
 * or cancelled one has none, whatever its numbers say.
 */
export const freePlaces = (g: Places) => (g.cancelled || g.closed || g.bookable === false ? 0 : Math.max(0, g.places - g.booked - g.offered));

/** The free place's signal: someone is waiting and a place is there for them. */
export const placeForNext = (g: Places & { waiting: number }) => g.waiting > 0 && freePlaces(g) > 0;

// ------------------------------------------------------------------ reads

/**
 * Booked places per start and level: the most learners in any one week — bookings that are not
 * cancelled, with a period there covering that week. For a learner booked for the whole course it is
 * the same as counting the bookings; a Bildungszeit learner there for a week or two (2026-10-17) takes
 * a place in those weeks only.
 */
const BOOKED = `
  SELECT course_id, max(n)::int AS n FROM (
    SELECT bp.course_id, w.week, count(DISTINCT bp.booking_id) AS n
      FROM booking_periods bp
      JOIN bookings b ON b.id = bp.booking_id
     CROSS JOIN LATERAL generate_series(date_trunc('week', bp.start_date), bp.end_date, interval '7 days') AS w(week)
     WHERE b.deleted_at IS NULL AND b.status <> 'cancelled' AND bp.course_id IS NOT NULL
     GROUP BY bp.course_id, w.week
  ) weekly
  GROUP BY course_id`;

/** Open entries per course, split into waiting and offered. */
const QUEUED = `
  SELECT course_id,
         count(*) FILTER (WHERE status = 'waiting')::int AS waiting,
         count(*) FILTER (WHERE status = 'offered')::int AS offered
    FROM waitlist_entries WHERE status IN ('waiting', 'offered') AND course_id IS NOT NULL
   GROUP BY course_id`;

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

/** A course with its places (0041). The name stays from when a course was a start's level. */
export type LevelGroup = {
  courseId: string;
  courseInstanceId: string;
  /** The step the course starts at; null for a module, a group's or a company's course. */
  levelCode: string | null;
  /** A module's or a group's own name. */
  title: string | null;
  /** The level, else the title: what the course is called on screen. */
  label: string;
  bookable: boolean;
  cancelled: boolean;
  roomName: string | null;
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
  course_id: string;
  course_instance_id: string;
  level_code: string | null;
  title: string | null;
  bookable: boolean;
  status: string;
  room_name: string | null;
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
    courseId: r.course_id,
    courseInstanceId: r.course_instance_id,
    levelCode: r.level_code,
    title: r.title,
    label: r.level_code ?? r.title ?? '—',
    bookable: r.bookable,
    cancelled: r.status === 'cancelled',
    roomName: r.room_name,
    groups,
    placesPerGroup,
    places: groups * placesPerGroup,
    booked: r.booked ?? 0,
    offered: r.offered ?? 0,
    waiting: r.waiting ?? 0,
    set: r.groups !== null || (r.planned ?? 0) > 0,
  };
};

const COURSES = (where: string) => `
  WITH booked AS (${BOOKED}), queued AS (${QUEUED})
  SELECT k.id AS course_id, k.course_instance_id, k.level_code, k.title, k.bookable, k.status, coalesce(r.nickname, r.name) AS room_name,
         k.groups, k.places_per_group, b.n AS booked, q.offered, q.waiting, l.sort_order, ${PLANNED} AS planned
    FROM courses k
    JOIN course_instances ci ON ci.id = k.course_instance_id
    JOIN course_types ct ON ct.id = ci.course_type_id
    LEFT JOIN levels l ON l.code = k.level_code
    LEFT JOIN rooms r ON r.id = k.room_id
    LEFT JOIN booked b ON b.course_id = k.id
    LEFT JOIN queued q ON q.course_id = k.id
   WHERE ${where}
   ORDER BY k.course_instance_id, (k.status = 'cancelled'), l.sort_order NULLS LAST, k.title`;

/** The courses of the given starts, with their places: by start, then level, a cancelled one last. */
export async function levelGroups(courseInstanceIds: readonly string[]): Promise<LevelGroup[]> {
  if (courseInstanceIds.length === 0) return [];
  return (await query<GroupRow>(COURSES('k.course_instance_id = ANY($1::uuid[])'), [courseInstanceIds])).map(toGroup);
}

/** Some courses with their places, by id. */
export async function courseGroups(courseIds: readonly string[]): Promise<LevelGroup[]> {
  if (courseIds.length === 0) return [];
  return (await query<GroupRow>(COURSES('k.id = ANY($1::uuid[])'), [courseIds])).map(toGroup);
}

/** One course with its places. */
export async function courseGroup(courseId: string): Promise<LevelGroup | null> {
  const [row] = await query<GroupRow>(COURSES('k.id = $1'), [courseId]);
  return row ? toGroup(row) : null;
}

export type CourseStart = {
  id: string;
  courseTypeName: string;
  /** The type's German name (`name_de`), else the English one. */
  courseTypeNameDe: string;
  courseTypeSlug: string;
  startDate: Date;
  endDate: Date;
  session: Session | null;
  time: string | null;
  days: string[];
  title: string | null;
  status: string;
  roomName: string | null;
  onWebsite: boolean;
  /** Bookings in this start whose period has no course yet: they hold places no course counts. */
  withoutLevel: number;
};

export async function getCourseStart(id: string): Promise<CourseStart | null> {
  const row = await queryFirst<{
    id: string;
    course_type_name: string;
    course_type_name_de: string;
    course_type_slug: string;
    start_date: Date;
    end_date: Date;
    session: string | null;
    schedule: { days?: string[]; time?: string } | null;
    title: string | null;
    status: string;
    room_name: string | null;
    on_website: boolean;
    without_level: string;
  }>(
    `SELECT i.id, t.name AS course_type_name, coalesce(t.name_de, t.name) AS course_type_name_de, t.slug AS course_type_slug,
            i.start_date, i.end_date, i.session, i.schedule, i.title, i.status, i.on_website,
            coalesce(r.nickname, r.name) AS room_name,
            (SELECT count(DISTINCT bp.booking_id) FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
              WHERE bp.course_instance_id = i.id AND bp.course_id IS NULL
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
    courseTypeNameDe: row.course_type_name_de,
    courseTypeSlug: row.course_type_slug,
    startDate: row.start_date,
    endDate: row.end_date,
    session: sessionOf(row.session, row.schedule),
    time: row.schedule?.time ?? null,
    days: Array.isArray(row.schedule?.days) ? row.schedule.days : [],
    title: row.title,
    status: row.status,
    roomName: row.room_name,
    onWebsite: row.on_website,
    withoutLevel: Number(row.without_level),
  };
}

export type WaitlistEntry = {
  id: string;
  /** The course whose queue it is (0041); the start and level below are what the learner asked for. */
  courseId: string | null;
  personId: string;
  personName: string;
  email: string | null;
  courseInstanceId: string;
  courseTypeName: string;
  /** The type's German name (`name_de`), else the English one. */
  courseTypeNameDe: string;
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
  course_id: string | null;
  person_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  course_instance_id: string;
  course_type_name: string;
  course_type_name_de: string;
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
  SELECT w.id, w.course_id, canonical_person_id(w.person_id) AS person_id, p.first_name, p.last_name,
         (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
         w.course_instance_id, t.name AS course_type_name, coalesce(t.name_de, t.name) AS course_type_name_de, i.start_date, i.session, i.schedule,
         w.level_code, w.status,
         CASE WHEN w.status IN ('waiting', 'offered')
              THEN row_number() OVER (PARTITION BY coalesce(w.course_id::text, w.course_instance_id || w.level_code), (w.status IN ('waiting', 'offered')) ORDER BY w.rank, w.joined_at)
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
  courseId: r.course_id,
  personId: r.person_id,
  personName: [r.first_name, r.last_name].filter(Boolean).join(' '),
  email: r.email,
  courseInstanceId: r.course_instance_id,
  courseTypeName: r.course_type_name,
  courseTypeNameDe: r.course_type_name_de,
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

/**
 * The queues a start's page shows: its courses' queues, and the learners waiting for this start whose
 * course is another's — a `.2` joiner waits on the running course of the start before (`resolveCourse`).
 * The open entries in order, then the closed ones, latest first.
 */
export async function startEntries(courseInstanceId: string): Promise<WaitlistEntry[]> {
  const rows = await query<EntryRow>(
    `SELECT * FROM (${ENTRIES} WHERE w.course_id IN (SELECT id FROM courses WHERE course_instance_id = $1)
                                OR w.course_instance_id = $1) x
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
  else conditions.push(`${open} AND start_date > current_date`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = view === 'closed' ? 'closed_at DESC LIMIT 200' : 'start_date, course_type_name, level_code, position';
  const entries = (await query<EntryRow>(`SELECT * FROM (${ENTRIES}) x ${where} ORDER BY ${order}`, params)).map(toEntry);
  if (view !== 'free') return entries;
  // Queues with a free place: the course each entry waits on (`resolveCourse` named it when it joined —
  // a joiner's is the running course of the start before), counted exactly as a start's page counts it:
  // the board's groups included, a closed or cancelled course full.
  const groups = await courseGroups([...new Set(entries.map((e) => e.courseId).filter((v): v is string => Boolean(v)))]);
  const free = new Set(groups.filter(placeForNext).map((g) => g.courseId));
  return entries.filter((e) => e.courseId && free.has(e.courseId));
}

export type WaitlistCounts = Record<WaitlistView, number>;

/** The counts for the screen's views and the overview: waiting, free places for the next, offered, begun. */
export async function waitlistCounts(): Promise<WaitlistCounts> {
  const views: WaitlistView[] = ['free', 'waiting', 'offered', 'started'];
  const lists = await Promise.all(views.map((v) => listEntries(v)));
  return {
    free: new Set(lists[0].map((e) => e.courseId ?? `${e.courseInstanceId}:${e.levelCode}`)).size,
    waiting: lists[1].length,
    offered: lists[2].length,
    started: lists[3].length,
    closed: 0,
  };
}

/**
 * The wizard's view of the starts ahead: per start and level, the places of the course a learner at
 * that step would sit in (`resolveCourse`'s rule) with the waiting learners in order, so a full course —
 * or one with a queue in front of the learner — shows before anything is booked. An intensive start's
 * second half (`B1.2`) is the running course of the start before, with the day it ends.
 */
export type WizardPlaces = { places: number; booked: number; offered: number; queue: string[]; offeredTo: string[]; until?: string | null; closed?: boolean };

export async function upcomingLevelPlaces(): Promise<Map<string, Record<string, WizardPlaces>>> {
  const starts = await query<{ id: string; start_date: string; end_date: string; format: string }>(
    `SELECT i.id, to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date, t.format
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
      WHERE i.status <> 'cancelled' AND i.end_date >= current_date - 70
      ORDER BY i.start_date`
  );
  const ids = starts.map((s) => s.id);
  const [groups, queued] = await Promise.all([
    levelGroups(ids),
    ids.length
      ? query<{ course_id: string; person_id: string; status: WaitlistStatus }>(
          `SELECT course_id, canonical_person_id(person_id) AS person_id, status FROM waitlist_entries
            WHERE course_id IN (SELECT id FROM courses WHERE course_instance_id = ANY($1::uuid[])) AND status IN ('waiting', 'offered')
            ORDER BY rank, joined_at`,
          [ids]
        )
      : Promise.resolve([]),
  ]);
  const byCourse = new Map<string, WizardPlaces>();
  for (const g of groups) {
    if (g.cancelled) continue;
    // A course not offered for booking (SchoolMan closes a full one) counts as full: no free place.
    byCourse.set(g.courseId, { places: g.places, booked: g.booked, offered: g.offered, queue: [], offeredTo: [], closed: !g.bookable });
  }
  for (const q of queued) {
    const places = byCourse.get(q.course_id);
    if (places) (q.status === 'offered' ? places.offeredTo : places.queue).push(q.person_id);
  }
  const out = new Map<string, Record<string, WizardPlaces>>();
  const today = new Date().toISOString().slice(0, 10);
  for (const start of starts) {
    if (start.end_date < today) continue;
    const levels: Record<string, WizardPlaces> = {};
    for (const g of groups) {
      if (g.courseInstanceId === start.id && g.levelCode && byCourse.has(g.courseId)) levels[g.levelCode] = byCourse.get(g.courseId)!;
    }
    if (start.format === 'intensive') {
      // The second half: the course of the start running on this one's first day.
      const running = [...starts].reverse().find((r) => r.format === 'intensive' && r.start_date < start.start_date && r.end_date >= start.start_date);
      if (running) {
        for (const g of groups) {
          if (g.courseInstanceId !== running.id || !g.levelCode?.endsWith('.1') || !byCourse.has(g.courseId)) continue;
          levels[`${g.levelCode.slice(0, -2)}.2`] = { ...byCourse.get(g.courseId)!, until: running.end_date };
        }
      }
    }
    out.set(start.id, levels);
  }
  return out;
}

/** One start's levels and the places of the course a learner at each would sit in. */
export async function startLevelPlaces(courseInstanceId: string): Promise<Record<string, WizardPlaces>> {
  return (await upcomingLevelPlaces()).get(courseInstanceId) ?? {};
}

/** All level codes, in teaching order. */
export async function levelCodes(): Promise<string[]> {
  const rows = await query<{ code: string }>(`SELECT code FROM levels ORDER BY sort_order`);
  return rows.map((r) => r.code);
}

export type StartBooking = {
  id: string;
  courseId: string | null;
  personId: string;
  personName: string;
  levelCode: string | null;
  status: 'reserved' | 'confirmed' | 'completed' | 'cancelled';
  charged: number;
  paid: number;
  observationReason: string | null;
};

/** Who is booked into a start's courses: the learners a course's places are counted from. */
export async function startBookings(courseInstanceId: string): Promise<StartBooking[]> {
  const rows = await query<{
    id: string;
    course_id: string | null;
    person_id: string;
    first_name: string;
    last_name: string | null;
    level_code: string | null;
    status: StartBooking['status'];
    charged: string;
    paid: string;
    observation_reason: string | null;
  }>(
    `SELECT DISTINCT ON (b.id, bp.course_id) b.id, bp.course_id, b.person_id, p.first_name, p.last_name, bp.level_code, b.status::text AS status, b.observation_reason,
            coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0) AS charged,
            coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS paid
       FROM booking_periods bp
       JOIN bookings b ON b.id = bp.booking_id
       JOIN people p ON p.id = b.person_id
      WHERE bp.course_instance_id = $1 AND b.deleted_at IS NULL AND b.status <> 'cancelled'
      ORDER BY b.id, bp.course_id, bp.start_date`,
    [courseInstanceId]
  );
  return rows
    .map((r) => ({
      id: r.id,
      courseId: r.course_id,
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
export async function upcomingStarts(): Promise<{ id: string; courseTypeName: string; courseTypeNameDe: string; title: string | null; startDate: Date; session: Session | null }[]> {
  const rows = await query<{ id: string; name: string; name_de: string; title: string | null; start_date: Date; session: string | null; schedule: { time?: string } | null }>(
    `SELECT i.id, t.name, coalesce(t.name_de, t.name) AS name_de, i.title, i.start_date, i.session, i.schedule
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
      WHERE i.end_date >= current_date AND i.status <> 'cancelled'
      ORDER BY i.start_date, t.position, t.name`
  );
  return rows.map((r) => ({
    id: r.id,
    courseTypeName: r.name,
    courseTypeNameDe: r.name_de,
    title: r.title,
    startDate: r.start_date,
    session: sessionOf(r.session, r.schedule),
  }));
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
  // The queue is the course's that the learner would sit in (`resolveCourse`).
  const course = await resolveCourse(input.courseInstanceId, input.levelCode, undefined, { actor });
  if (!course) return refuse('Diesen Termin gibt es nicht mehr.', 'That start no longer exists.');
  const already = await queryFirst<{ id: string }>(
    `SELECT id FROM waitlist_entries
      WHERE canonical_person_id(person_id) = canonical_person_id($1) AND (course_id = $2 OR (course_instance_id = $3 AND level_code = $4))
        AND status IN ('waiting', 'offered')`,
    [input.personId, course.courseId, input.courseInstanceId, input.levelCode]
  );
  if (already) return refuse('Diese Person steht für diesen Kurs schon auf der Warteliste.', 'This person is already on the waiting list for this course.');
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO waitlist_entries (person_id, course_instance_id, level_code, course_id, rank, source, registration_id, note, created_by)
     VALUES ($1, $2, $3, $4, extract(epoch FROM now()), $5, $6, $7, $8) RETURNING id`,
    [input.personId, input.courseInstanceId, input.levelCode, course.courseId, input.source, input.registrationId ?? null, input.note ?? null, actor.id]
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
  course_id: string | null;
  course_instance_id: string | null;
  level_code: string | null;
  exam_session_id: string | null;
  status: WaitlistStatus;
};

async function entryCore(id: string): Promise<EntryCore | undefined> {
  return queryFirst<EntryCore>(
    `SELECT id, person_id, course_id, course_instance_id, level_code, exam_session_id, status FROM waitlist_entries WHERE id = $1`,
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
  // The entry's own queue: its course's, or its sitting's.
  const queue = await query<{ id: string; rank: number }>(
    entry.exam_session_id
      ? `SELECT id, rank FROM waitlist_entries WHERE exam_session_id = $1 AND status IN ('waiting', 'offered') ORDER BY rank, joined_at`
      : `SELECT id, rank FROM waitlist_entries WHERE course_id = $1 AND status IN ('waiting', 'offered') ORDER BY rank, joined_at`,
    entry.exam_session_id ? [entry.exam_session_id] : [entry.course_id]
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
  const course = await resolveCourse(courseInstanceId, levelCode, undefined, { actor });
  if (!course) return refuse('Diesen Termin gibt es nicht mehr.', 'That start no longer exists.');
  const clash = await queryFirst<{ id: string }>(
    `SELECT id FROM waitlist_entries WHERE person_id = $1 AND id <> $3 AND (course_id = $2 OR (course_instance_id = $4 AND level_code = $5)) AND status IN ('waiting', 'offered')`,
    [entry.person_id, course.courseId, id, courseInstanceId, levelCode]
  );
  if (clash) return refuse('Für diesen Kurs steht die Person schon auf der Warteliste.', 'The person is already on that course’s waiting list.');
  const from = await startWords(entry.course_instance_id ?? '');
  await query(
    `UPDATE waitlist_entries SET course_instance_id = $2, level_code = $3, course_id = $4, status = 'waiting', offered_at = NULL, offered_by = NULL WHERE id = $1`,
    [id, courseInstanceId, levelCode, course.courseId]
  );
  await logEntry(actor, { ...entry, course_instance_id: courseInstanceId, level_code: levelCode }, 'waitlist_moved_course', {
    fromCourse: from.course,
    fromStart: from.start,
    fromLevel: entry.level_code,
  });
  return { ok: true };
}

/** A course's places: how many groups, how many learners a group takes. */
export async function setPlaces(courseId: string, groups: number, placesPerGroup: number, actor: StaffUser): Promise<void> {
  const row = await queryFirst<{ course_instance_id: string; level_code: string | null }>(
    `UPDATE courses SET groups = $2, places_per_group = $3, updated_by = $4, updated_at = timezone('utc', now())
      WHERE id = $1 RETURNING course_instance_id, level_code`,
    [courseId, groups, placesPerGroup, actor.id]
  );
  if (row) await logActivity({ actor, entity: 'course_instance', entityId: row.course_instance_id, action: 'places_set', detail: { course: courseId, level: row.level_code, groups, placesPerGroup } });
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
      WHERE canonical_person_id(person_id) = canonical_person_id($1)
        AND (course_instance_id = $2 OR course_id IN (SELECT id FROM courses WHERE course_instance_id = $2))
        AND status IN ('waiting', 'offered')
      RETURNING id, person_id, course_id, course_instance_id, level_code, exam_session_id, status`,
    [personId, courseInstanceId, bookingId, actor.id]
  );
  return rows;
}

/** The history lines for entries a booking closed, written after its transaction. */
export async function logClosedByBooking(entries: readonly EntryCore[], bookingId: string, actor: StaffUser): Promise<void> {
  for (const entry of entries) await logEntry(actor, entry, 'waitlist_booked', { booking: bookingId });
}

export type { EntryCore as WaitlistEntryCore };
