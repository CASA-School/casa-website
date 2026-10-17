import 'server-only';

import { BOOKED_INTO_OTHER_COURSES } from './catalogue';
import { query } from './db';
import { levelGroups, type LevelGroup } from './waitlist';
import type { PersonMatch } from '@/components/admin/person-picker';

export type { PersonMatch };

/**
 * The course list (2026-10-17; docs/ADMIN_WORKSPACE.md §Courses): one row per course, as SchoolMan's
 * `Course_List` has it — running courses first, then those ahead, the past ones on their own view —
 * with what the team reads there: the learners week by week, who teaches, who waits, the dates, and
 * SchoolMan's course number while both systems run. Places, booked and waiting are `levelGroups`'s,
 * the rules every other screen counts by.
 */

export type CoursePhase = 'running' | 'upcoming' | 'past';

export type CourseListRow = LevelGroup & {
  phase: CoursePhase;
  typeName: string;
  typeSlug: string;
  format: string | null;
  startTitle: string | null;
  startDate: string;
  endDate: string;
  session: 'morning' | 'afternoon' | 'evening' | null;
  time: string | null;
  days: string[];
  onWebsite: boolean;
  /** Learners in the course each week, Monday by Monday: booked here, plus SchoolMan's (0050). */
  weeks: { monday: string; n: number }[];
  /** The week of the course this is (1-based), while it runs. */
  week: number | null;
  /** Learners this week while it runs; before it starts, the most in any week (or the booked places). */
  now: number;
  /** Its groups, each in its own room with its own teachers (Rahman: keep them apart). */
  groupRows: CourseGroupRow[];
  /**
   * Begun with nobody in it and no lesson day: planned in SchoolMan and never held (5034, 5043 in
   * October 2026) — SchoolMan has no cancelled state, so such a course stays „running" there.
   */
  notHeld: boolean;
};

/**
 * One group of a course: its SchoolMan number, room, main teachers and learners. `index` 0 is the
 * course's groups together — before SchoolMan splits a level into its groups (one record, 28 places),
 * or when nothing is known group by group yet. `now` is null when the group's own learners are not
 * known (bookings made here do not name a group); the course's total says them.
 */
export type CourseGroupRow = {
  index: number;
  number: string | null;
  room: string | null;
  /** The main teachers — the week's pair, substitutes left out — at most two. */
  teachers: string[];
  places: number;
  weeks: { monday: string; n: number }[];
  now: number | null;
  /** Its lesson days (not called off): none on a course with learners is a gap to fill. */
  days: number;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The Monday of the week a day falls in. */
function mondayOf(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
}

type StartRow = {
  id: string;
  type_name: string;
  slug: string;
  format: string | null;
  title: string | null;
  start_date: string;
  end_date: string;
  session: string | null;
  schedule: { days?: string[]; time?: string } | null;
  on_website: boolean;
};

const START_COLUMNS = `i.id, coalesce(nullif(trim(t.name_de), ''), t.name) AS type_name, t.slug, t.format, i.title,
            to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date,
            i.session, i.schedule, i.on_website`;

export async function listCourses(when: 'current' | 'past', today: string): Promise<CourseListRow[]> {
  const starts = await query<StartRow>(
    `SELECT ${START_COLUMNS}
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
      WHERE i.status <> 'cancelled' AND NOT (t.slug = ANY($2::text[]))
        AND ${when === 'past' ? `i.end_date < $1::date AND i.end_date >= $1::date - 365` : `i.end_date >= $1::date AND i.start_date <= $1::date + 183`}
      ORDER BY i.start_date ${when === 'past' ? 'DESC' : 'ASC'}, t.position, i.id`,
    [today, [...BOOKED_INTO_OTHER_COURSES]]
  );
  return rowsFor(starts, today);
}

/** One course as the list reads it — its groups, their main teachers, rooms and learners week by week — for its own page. */
export async function courseListRow(courseId: string, today: string): Promise<CourseListRow | null> {
  const starts = await query<StartRow>(
    `SELECT ${START_COLUMNS}
       FROM courses k JOIN course_instances i ON i.id = k.course_instance_id JOIN course_types t ON t.id = i.course_type_id
      WHERE k.id = $1`,
    [courseId]
  );
  return (await rowsFor(starts, today, courseId))[0] ?? null;
}

async function rowsFor(starts: StartRow[], today: string, only?: string): Promise<CourseListRow[]> {
  if (!starts.length) return [];
  const byStart = new Map(starts.map((s) => [s.id, s]));
  // In the starts' order (by date), each start's courses in their own order.
  const order = new Map(starts.map((s, i) => [s.id, i]));
  const groups = (await levelGroups(starts.map((s) => s.id)))
    .filter((g) => (only ? g.courseId === only : !g.cancelled))
    .map((g, i) => ({ g, i }))
    .sort((a, b) => order.get(a.g.courseInstanceId)! - order.get(b.g.courseInstanceId)! || a.i - b.i)
    .map(({ g }) => g);
  const ids = groups.map((g) => g.courseId);

  const [weekly, groupWeekly, days, plans, numbers] = await Promise.all([
    // A course's learners each week: booked here, and SchoolMan's of all its groups (0050, 0051).
    query<{ course_id: string; monday: string; n: number }>(
      `WITH c AS (
         SELECT k.id, i.start_date, i.end_date FROM courses k JOIN course_instances i ON i.id = k.course_instance_id WHERE k.id = ANY($1::uuid[])
       ), w AS (
         SELECT c.id AS course_id, gs::date AS monday
           FROM c, generate_series(date_trunc('week', c.start_date)::date, c.end_date, interval '7 days') gs
       )
       SELECT w.course_id, to_char(w.monday, 'YYYY-MM-DD') AS monday,
              ((SELECT count(DISTINCT b.id) FROM booking_periods p JOIN bookings b ON b.id = p.booking_id
                 WHERE p.course_id = w.course_id AND p.start_date <= w.monday + 6 AND p.end_date >= w.monday
                   AND b.deleted_at IS NULL AND b.status <> 'cancelled')
               + coalesce((SELECT sum(l.learners) FROM course_week_learners l WHERE l.course_id = w.course_id AND l.monday = w.monday), 0))::int AS n
         FROM w
        ORDER BY w.course_id, w.monday`,
      [ids]
    ),
    query<{ course_id: string; group_index: number; monday: string; n: number }>(
      `SELECT course_id, group_index, to_char(monday, 'YYYY-MM-DD') AS monday, learners AS n FROM course_week_learners WHERE course_id = ANY($1::uuid[])`,
      [ids]
    ),
    // Who taught, where, day by day: the main teachers and the room of each group come from these.
    // A day covered by someone else counts for the teacher it was covered for: still the course's own.
    query<{ course_id: string; group_index: number; on_date: string; teacher: string | null; substitute: boolean; replaced: string | null; room: string | null }>(
      `SELECT d.course_id, d.group_index, to_char(d.on_date, 'YYYY-MM-DD') AS on_date,
              coalesce(nullif(trim(m.short_name), ''), concat_ws(' ', p.first_name, left(p.last_name, 1))) AS teacher,
              d.is_substitute OR d.replaced_teacher_id IS NOT NULL AS substitute,
              coalesce(nullif(trim(rm.short_name), ''), nullif(concat_ws(' ', rp.first_name, left(rp.last_name, 1)), '')) AS replaced,
              coalesce(r.nickname, r.name) AS room
         FROM course_days d
         LEFT JOIN staff_members m ON m.id = d.teacher_id LEFT JOIN people p ON p.id = m.person_id
         LEFT JOIN staff_members rm ON rm.id = d.replaced_teacher_id LEFT JOIN people rp ON rp.id = rm.person_id
         LEFT JOIN rooms r ON r.id = d.room_id
        WHERE d.course_id = ANY($1::uuid[]) AND NOT d.cancelled
        ORDER BY d.on_date`,
      [ids]
    ),
    query<{ course_id: string; group_index: number; teacher: string | null; room: string | null }>(
      `SELECT w.course_id, w.group_index, coalesce(nullif(trim(m.short_name), ''), concat_ws(' ', p.first_name, left(p.last_name, 1))) AS teacher,
              coalesce(r.nickname, r.name) AS room
         FROM course_week_plans w
         LEFT JOIN staff_members m ON m.id = w.teacher_id LEFT JOIN people p ON p.id = m.person_id
         LEFT JOIN rooms r ON r.id = w.room_id
        WHERE w.course_id = ANY($1::uuid[])
        ORDER BY w.weekday`,
      [ids]
    ),
    query<{ id: string; numbers: string[] | null; number: string | null }>(
      `SELECT id, filemaker_group_ids AS numbers, filemaker_course_id AS number FROM courses WHERE id = ANY($1::uuid[])`,
      [ids]
    ),
  ]);

  const push = <K, V>(map: Map<K, V[]>, key: K, value: V) => map.set(key, [...(map.get(key) ?? []), value]);
  const weeksOf = new Map<string, { monday: string; n: number }[]>();
  for (const w of weekly) push(weeksOf, w.course_id, { monday: w.monday, n: w.n });
  const groupWeeksOf = new Map<string, Map<string, number>>();
  for (const w of groupWeekly) groupWeeksOf.set(`${w.course_id}|${w.group_index}`, (groupWeeksOf.get(`${w.course_id}|${w.group_index}`) ?? new Map()).set(w.monday, w.n));
  const daysOf = new Map<string, typeof days>();
  for (const d of days) push(daysOf, `${d.course_id}|${d.group_index}`, d);
  const plansOf = new Map<string, typeof plans>();
  for (const w of plans) push(plansOf, `${w.course_id}|${w.group_index}`, w);
  const numbersOf = new Map(numbers.map((r) => [r.id, r.numbers?.length ? r.numbers : r.number ? [r.number] : []]));
  const thisMonday = mondayOf(today);
  const addDays = (day: string, n: number) => iso(new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000));
  const distinct = (names: (string | null)[]) => [...new Set(names.filter((n): n is string => Boolean(n)))];
  const mostOf = (names: (string | null)[]) => {
    const n = new Map<string, number>();
    for (const x of names) if (x) n.set(x, (n.get(x) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([x]) => x);
  };

  return groups.map((g) => {
    const s = byStart.get(g.courseInstanceId)!;
    const phase: CoursePhase = s.end_date < today ? 'past' : s.start_date <= today ? 'running' : 'upcoming';
    const weeks = weeksOf.get(g.courseId) ?? [];
    const index = weeks.findIndex((w) => w.monday === thisMonday);
    // The week the teachers and rooms are read from: this one while it runs, else its first or last.
    const reference = phase === 'running' ? thisMonday : phase === 'upcoming' ? mondayOf(s.start_date) : mondayOf(s.end_date);
    const numbersHere = numbersOf.get(g.courseId) ?? [];
    // Learners group by group only where SchoolMan keeps the groups apart (a number each); the groups
    // as rows at all only where something is known about each — its learners or its own lesson days.
    const perGroupLearners = g.groups > 1 && numbersHere.length >= g.groups;
    const withDays = new Set((days.filter((d) => d.course_id === g.courseId).map((d) => d.group_index)));
    const split = g.groups > 1 && (perGroupLearners || withDays.size > 1);
    const allDays = days.filter((d) => d.course_id === g.courseId);
    const notHeld = phase !== 'upcoming' && allDays.length === 0 && g.booked === 0 && weeks.every((w) => w.n === 0);
    const allGroupRows: CourseGroupRow[] = Array.from({ length: split ? g.groups : 1 }, (_, i) => {
      const key = `${g.courseId}|${i + 1}`;
      const all = split || g.groups <= 1 ? (daysOf.get(key) ?? []) : allDays;
      const inWeek = all.filter((d) => d.on_date >= reference && d.on_date <= addDays(reference, 6));
      // Each day's own teacher: who teaches it, or on a covered day whom it was covered for.
      const own = (list: typeof all) => list.map((d) => (d.substitute ? d.replaced : d.teacher));
      // The main teachers: the week's own pair, else the course's most frequent, else the weekly plan's.
      const teachers = (
        distinct(own(inWeek)).length ? distinct(own(inWeek)) : mostOf(own(all)).length ? mostOf(own(all)) : distinct((plansOf.get(key) ?? []).map((w) => w.teacher))
      ).slice(0, 2);
      const room = mostOf(inWeek.map((d) => d.room))[0] ?? mostOf(all.map((d) => d.room))[0] ?? distinct((plansOf.get(key) ?? []).map((w) => w.room))[0] ?? g.roomName;
      // One row for the course: its learners. A group of a split course: SchoolMan's for that group.
      const counts = groupWeeksOf.get(key);
      const groupWeeks = !split ? weeks : perGroupLearners ? weeks.map((w) => ({ monday: w.monday, n: counts?.get(w.monday) ?? 0 })) : [];
      return {
        index: split ? i + 1 : g.groups > 1 ? 0 : 1,
        number: split ? (numbersHere[i] ?? null) : numbersHere.length ? numbersHere.join(' · ') : null,
        room,
        teachers,
        places: split ? g.placesPerGroup : g.places,
        weeks: groupWeeks,
        now: split && !perGroupLearners ? null : phase === 'running' && index >= 0 ? (groupWeeks[index]?.n ?? 0) : Math.max(0, ...groupWeeks.map((w) => w.n)),
        days: all.length,
      };
    });
    // A parallel group begun with nobody in it and no lesson day of its own was never held either
    // (SchoolMan's 4886, 4945): left out, while the course has another.
    const held = allGroupRows.filter((r) => phase === 'upcoming' || !perGroupLearners || r.days > 0 || r.weeks.some((w) => w.n > 0));
    const groupRows = held.length && !notHeld ? held : allGroupRows;
    // The start's shift, else read from its hours, as the course page does.
    const hour = Number(/^(\d{1,2})/.exec(s.schedule?.time ?? '')?.[1]);
    const session =
      s.session === 'morning' || s.session === 'afternoon' || s.session === 'evening'
        ? s.session
        : Number.isFinite(hour)
          ? hour < 12
            ? 'morning'
            : hour < 17
              ? 'afternoon'
              : 'evening'
          : null;
    return {
      ...g,
      phase,
      typeName: s.type_name,
      typeSlug: s.slug,
      format: s.format,
      startTitle: s.title,
      startDate: s.start_date,
      endDate: s.end_date,
      session,
      time: s.schedule?.time || null,
      days: Array.isArray(s.schedule?.days) ? s.schedule.days : [],
      onWebsite: s.on_website,
      weeks,
      week: phase === 'running' && index >= 0 ? index + 1 : null,
      now: phase === 'running' && index >= 0 ? weeks[index].n : Math.max(g.booked, ...weeks.map((w) => w.n), 0),
      groupRows,
      notHeld,
    };
  });
}

/** The Monday a learner joining a running course would start on: this week's if today is Monday, else the next. */
export function nextJoinMonday(today: string): string {
  const d = new Date(`${today}T12:00:00Z`);
  const shift = (8 - d.getUTCDay()) % 7;
  d.setUTCDate(d.getUTCDate() + shift);
  return iso(d);
}


/** Learners by name or address, marked when they already sit in this course (for its „Buchen"). */
export async function findLearnersForCourse(courseId: string, text: string): Promise<PersonMatch[]> {
  const term = text.trim().toLowerCase().slice(0, 80);
  if (term.length < 2) return [];
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await query<{ id: string; first_name: string; last_name: string | null; email: string | null; bookings: number; booked: boolean }>(
    `SELECT p.id, p.first_name, p.last_name,
            (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
            (SELECT count(*) FROM bookings b WHERE canonical_person_id(b.person_id) = p.id AND b.deleted_at IS NULL)::int AS bookings,
            EXISTS (SELECT 1 FROM bookings b JOIN booking_periods bp ON bp.booking_id = b.id
                     WHERE canonical_person_id(b.person_id) = p.id AND bp.course_id = $2
                       AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS booked
       FROM people p
      WHERE p.deleted_at IS NULL AND p.merged_into IS NULL
        AND NOT EXISTS (SELECT 1 FROM staff_members sm WHERE sm.person_id = p.id)
        AND (lower(concat_ws(' ', p.first_name, p.last_name)) LIKE $1
             OR EXISTS (SELECT 1 FROM emails e WHERE canonical_person_id(e.person_id) = p.id AND lower(e.address) LIKE $1))
      ORDER BY p.updated_at DESC LIMIT 6`,
    [like, courseId]
  );
  return rows.map((r) => ({ id: r.id, name: [r.first_name, r.last_name].filter(Boolean).join(' '), email: r.email, bookings: r.bookings, booked: r.booked }));
}
