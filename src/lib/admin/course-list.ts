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
  /** Who teaches it, most days first (short names). */
  teachers: string[];
  /** SchoolMan's course numbers of its groups. */
  numbers: string[];
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The Monday of the week a day falls in. */
function mondayOf(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
}

export async function listCourses(when: 'current' | 'past', today: string): Promise<CourseListRow[]> {
  const starts = await query<{
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
  }>(
    `SELECT i.id, coalesce(nullif(trim(t.name_de), ''), t.name) AS type_name, t.slug, t.format, i.title,
            to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date,
            i.session, i.schedule, i.on_website
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
      WHERE i.status <> 'cancelled' AND NOT (t.slug = ANY($2::text[]))
        AND ${when === 'past' ? `i.end_date < $1::date AND i.end_date >= $1::date - 365` : `i.end_date >= $1::date AND i.start_date <= $1::date + 183`}
      ORDER BY i.start_date ${when === 'past' ? 'DESC' : 'ASC'}, t.position, i.id`,
    [today, [...BOOKED_INTO_OTHER_COURSES]]
  );
  if (!starts.length) return [];
  const byStart = new Map(starts.map((s) => [s.id, s]));
  // In the starts' order (by date), each start's courses in their own order.
  const order = new Map(starts.map((s, i) => [s.id, i]));
  const groups = (await levelGroups(starts.map((s) => s.id)))
    .filter((g) => !g.cancelled)
    .map((g, i) => ({ g, i }))
    .sort((a, b) => order.get(a.g.courseInstanceId)! - order.get(b.g.courseInstanceId)! || a.i - b.i)
    .map(({ g }) => g);
  const ids = groups.map((g) => g.courseId);

  const [weekly, teachers, numbers] = await Promise.all([
    query<{ course_id: string; monday: string; n: number }>(
      `WITH c AS (
         SELECT k.id, i.start_date, i.end_date FROM courses k JOIN course_instances i ON i.id = k.course_instance_id WHERE k.id = ANY($1::uuid[])
       ), w AS (
         SELECT c.id AS course_id, gs::date AS monday
           FROM c, generate_series(date_trunc('week', c.start_date)::date, c.end_date, interval '7 days') gs
       )
       -- Bookings made here, and on top SchoolMan's learners that week (0050), while bookings are made there.
       SELECT w.course_id, to_char(w.monday, 'YYYY-MM-DD') AS monday,
              (count(DISTINCT b.id) + coalesce(max(l.learners), 0))::int AS n
         FROM w
         LEFT JOIN booking_periods p ON p.course_id = w.course_id AND p.start_date <= w.monday + 6 AND p.end_date >= w.monday
         LEFT JOIN bookings b ON b.id = p.booking_id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
         LEFT JOIN course_week_learners l ON l.course_id = w.course_id AND l.monday = w.monday
        GROUP BY w.course_id, w.monday
        ORDER BY w.course_id, w.monday`,
      [ids]
    ),
    query<{ course_id: string; name: string; n: number }>(
      `SELECT d.course_id, coalesce(nullif(trim(m.short_name), ''), concat_ws(' ', p.first_name, left(p.last_name, 1))) AS name, count(*)::int AS n
         FROM course_days d JOIN staff_members m ON m.id = d.teacher_id LEFT JOIN people p ON p.id = m.person_id
        WHERE d.course_id = ANY($1::uuid[]) AND NOT d.cancelled
        GROUP BY d.course_id, 2
        ORDER BY d.course_id, n DESC, 2`,
      [ids]
    ),
    query<{ id: string; numbers: string[] | null; number: string | null }>(
      `SELECT id, filemaker_group_ids AS numbers, filemaker_course_id AS number FROM courses WHERE id = ANY($1::uuid[])`,
      [ids]
    ),
  ]);

  const weeksOf = new Map<string, { monday: string; n: number }[]>();
  for (const w of weekly) weeksOf.set(w.course_id, [...(weeksOf.get(w.course_id) ?? []), { monday: w.monday, n: w.n }]);
  const teachersOf = new Map<string, string[]>();
  for (const r of teachers) teachersOf.set(r.course_id, [...(teachersOf.get(r.course_id) ?? []), r.name]);
  const numbersOf = new Map(numbers.map((r) => [r.id, r.numbers?.length ? r.numbers : r.number ? [r.number] : []]));
  const thisMonday = mondayOf(today);

  return groups.map((g) => {
    const s = byStart.get(g.courseInstanceId)!;
    const phase: CoursePhase = s.end_date < today ? 'past' : s.start_date <= today ? 'running' : 'upcoming';
    const weeks = weeksOf.get(g.courseId) ?? [];
    const index = weeks.findIndex((w) => w.monday === thisMonday);
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
      teachers: teachersOf.get(g.courseId) ?? [],
      numbers: numbersOf.get(g.courseId) ?? [],
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
