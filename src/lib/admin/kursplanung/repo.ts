import 'server-only';

import type { PoolClient } from 'pg';

import { query, queryFirst, withTransaction } from '../db';
import type { PlanContext } from './fit';
import {
  isAbsenceReason,
  isLevel,
  isShift,
  isWeekday,
  type Absence,
  type Assignment,
  type CourseGroup,
  type Teacher,
} from './types';
import { addDays, planningWeeks, weekdayOf, weeksBetween, weekStartOf, type PlanningWeek } from './weeks';

/**
 * Reads for the course-planning board.
 *
 * Dates leave Postgres as `yyyy-mm-dd` strings (`to_char`), never as Date
 * objects: `pg` would otherwise hand back a local-midnight Date for a `date`
 * column, and the board compares dates as strings all day.
 */

const MONTH = /^\d{4}-\d{2}$/;

/** Today in Bremen, `yyyy-mm-dd`. */
export const planToday = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/**
 * The month the screen shows: the requested one when valid, else the planning month today falls in —
 * its course block (0079); a weekend looks ahead to the coming week. Without groups that month gives
 * way to the next one that has them, else the last. (Until 2026-10-22 it opened on the last month with
 * groups, November 2027, once lesson days were made a year ahead.)
 */
export async function resolvePlanMonth(requested?: string): Promise<string> {
  if (requested && MONTH.test(requested)) return requested;
  const today = planToday();
  const monday = weekdayOf(today) ? weekStartOf(today) : addDays(weekStartOf(today), 7);
  const row = await queryFirst<{ now: string; month: string | null }>(
    `WITH now AS (SELECT planning_month_of($1::date) AS m)
     SELECT to_char(now.m, 'YYYY-MM') AS now,
            coalesce((SELECT to_char(min(month), 'YYYY-MM') FROM course_groups WHERE month >= now.m),
                     (SELECT to_char(max(month), 'YYYY-MM') FROM course_groups)) AS month
       FROM now`,
    [monday]
  );
  return row?.month ?? row?.now ?? today.slice(0, 7);
}

/**
 * A planning month's weeks: CASA's course block, from the intensive start that opens it to the next
 * one (`planning_month_start`, 0079) — 26 October to 20 November for November 2026, as the planners'
 * sheet runs it. Weeks after the fourth in which none of the month's groups is taught (the Christmas
 * break at the end of December's block) are left off.
 */
export async function planWeeks(month: string): Promise<PlanningWeek[]> {
  const row = await queryFirst<{ start: string; next: string; last: string | null }>(
    `WITH w AS (SELECT planning_month_start($1::date) AS start, planning_month_start(($1::date + interval '1 month')::date) AS next)
     SELECT to_char(w.start, 'YYYY-MM-DD') AS start, to_char(w.next, 'YYYY-MM-DD') AS next,
            (SELECT to_char(max(d.on_date), 'YYYY-MM-DD')
               FROM course_days d JOIN course_groups g ON g.id = d.group_id
              WHERE g.month = $1::date AND NOT d.cancelled AND d.on_date >= w.start AND d.on_date < w.next) AS last
       FROM w`,
    [`${month}-01`]
  );
  if (!row) return planningWeeks(month);
  const next = row.next > row.start ? row.next : addDays(row.start, 28);
  const taught = row.last ? addDays(weekStartOf(row.last), 7) : next;
  const end = [next, taught > addDays(row.start, 28) ? taught : addDays(row.start, 28)].sort()[0];
  return weeksBetween(row.start, end);
}

type TeacherRow = {
  id: string;
  short_name: string;
  full_name: string;
  contract: 'employed' | 'freelance';
  weekly_units: string | null;
  morning_days: string[];
  afternoon_days: string[];
  days_per_week: number;
  levels: string[];
  note: string | null;
  filemaker_staff_id: string | null;
  cover_only: boolean;
  teaching_from: string | null;
  on_board: boolean;
};

const toTeacher = (r: TeacherRow): Teacher => ({
  id: r.id,
  shortName: r.short_name,
  fullName: r.full_name,
  contract: r.contract,
  weeklyUnits: r.weekly_units === null ? null : Number(r.weekly_units),
  days: { morning: r.morning_days.filter(isWeekday), afternoon: r.afternoon_days.filter(isWeekday) },
  shifts: [...(r.morning_days.length ? ['morning' as const] : []), ...(r.afternoon_days.length ? ['afternoon' as const] : [])],
  daysPerWeek: r.days_per_week,
  coverOnly: r.cover_only,
  from: r.teaching_from,
  levels: r.levels.filter(isLevel),
  note: r.note,
  filemakerStaffId: r.filemaker_staff_id,
  isActive: r.on_board,
});

/**
 * The teaching staff: the staff register's members with the role Unterricht (0039), or anyone the plan
 * still names. The name is the person's; employed or freelance is the contract that runs today. On the
 * board (`isActive`) is who is on the register, active as a teacher, teaches in a morning or an afternoon,
 * and teaches intensive courses — or has no course types set yet (0083: Bettina W. and Connie teach
 * evenings, Julia online courses; Fatma, Kathrin and Ulrich are not teaching).
 */
export async function listTeachers(): Promise<Teacher[]> {
  const rows = await query<TeacherRow>(
    `SELECT s.id, s.short_name, btrim(p.first_name || ' ' || coalesce(p.last_name, '')) AS full_name,
            CASE WHEN (SELECT c.kind FROM staff_contracts c
                        WHERE c.staff_member_id = s.id AND (c.valid_from IS NULL OR c.valid_from <= current_date)
                          AND (c.valid_to IS NULL OR c.valid_to >= current_date)
                        ORDER BY c.valid_from DESC NULLS LAST LIMIT 1) = 'freelance' THEN 'freelance' ELSE 'employed' END AS contract,
            (SELECT c.weekly_units FROM staff_contracts c
              WHERE c.staff_member_id = s.id AND (c.valid_from IS NULL OR c.valid_from <= current_date)
                AND (c.valid_to IS NULL OR c.valid_to >= current_date)
              ORDER BY c.valid_from DESC NULLS LAST LIMIT 1) AS weekly_units,
            s.morning_days, s.afternoon_days, s.days_per_week, s.levels, s.note, s.filemaker_staff_id, s.cover_only,
            to_char(s.teaching_from, 'YYYY-MM-DD') AS teaching_from,
            (s.is_active AND s.teaching_active AND cardinality(s.morning_days) + cardinality(s.afternoon_days) > 0
              AND (cardinality(s.course_kinds) = 0 OR 'intensive' = ANY (s.course_kinds))) AS on_board
       FROM staff_members s
       JOIN people p ON p.id = s.person_id
      WHERE EXISTS (SELECT 1 FROM staff_member_roles r WHERE r.staff_member_id = s.id AND r.role_code = 'teaching')
         OR EXISTS (SELECT 1 FROM course_days d WHERE d.teacher_id = s.id AND d.group_id IS NOT NULL)
      ORDER BY s.short_name COLLATE "C"`
  );
  return rows.map(toTeacher);
}

type GroupRow = {
  id: string;
  month: string;
  shift: string;
  level: string;
  phase: '1' | '2';
  group_index: number;
  registrations: number;
  live: number | null;
  teacher_first: string | null;
  teacher_second: string | null;
  room_id: string | null;
  filemaker_course_id: string | null;
  course_start: string | null;
  course_end: string | null;
  course_id: string | null;
  schoolman_number: string | null;
};

export async function listGroups(month: string): Promise<CourseGroup[]> {
  const rows = await query<GroupRow>(
    // Each group with its course's first and last day: the board plans no day outside them. Its
    // learners, live (2026-10-17, Rahman): in the planning month's busiest week, SchoolMan's for this
    // group (0051) or the bookings brought across into it (0052), whichever is more — the one holds the
    // other — plus, for a course of one group, the bookings made here. A group of no course keeps the
    // number typed for it.
    `SELECT g.id, to_char(g.month, 'YYYY-MM-DD') AS month, g.shift, g.level, g.phase, g.group_index,
            g.registrations, live.n AS live, g.teacher_first, g.teacher_second, g.room_id, g.filemaker_course_id,
            to_char(i.start_date, 'YYYY-MM-DD') AS course_start, to_char(i.end_date, 'YYYY-MM-DD') AS course_end,
            g.course_id, coalesce(c.filemaker_group_ids[g.group_index], c.filemaker_course_id) AS schoolman_number
       FROM course_groups g
       LEFT JOIN courses c ON c.id = g.course_id
       LEFT JOIN course_instances i ON i.id = c.course_instance_id
       LEFT JOIN LATERAL (
         SELECT max(
                  greatest(
                    coalesce((SELECT l.learners FROM course_week_learners l
                               WHERE l.course_id = c.id AND l.group_index = g.group_index AND l.monday = w.monday), 0),
                    (SELECT count(DISTINCT b.id) FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
                      WHERE bp.course_id = c.id AND b.filemaker_booking_id IS NOT NULL AND b.deleted_at IS NULL AND b.status <> 'cancelled'
                        AND coalesce(bp.group_index, 1) = g.group_index AND bp.start_date <= w.monday + 6 AND bp.end_date >= w.monday))
                  + CASE WHEN c.groups > 1 THEN 0 ELSE
                      (SELECT count(DISTINCT b.id) FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
                        WHERE bp.course_id = c.id AND b.filemaker_booking_id IS NULL AND b.deleted_at IS NULL AND b.status <> 'cancelled'
                          AND bp.start_date <= w.monday + 6 AND bp.end_date >= w.monday)
                    END)::int AS n
           FROM (SELECT gs::date AS monday
                   FROM generate_series(planning_month_start(g.month), planning_month_start((g.month + interval '1 month')::date) - 1, interval '7 days') gs) w
          WHERE c.id IS NOT NULL
       ) live ON true
      WHERE g.month = $1::date
      ORDER BY g.shift, level_rank(g.level), g.phase, g.group_index`,
    [`${month}-01`]
  );
  return rows.flatMap((r) =>
    isShift(r.shift) && isLevel(r.level)
      ? [
          {
            id: r.id,
            month: r.month,
            shift: r.shift,
            level: r.level,
            phase: r.phase,
            groupIndex: r.group_index,
            registrations: r.live ?? r.registrations,
            live: r.live !== null,
            typedRegistrations: r.registrations,
            teacherFirst: r.teacher_first,
            teacherSecond: r.teacher_second,
            roomId: r.room_id,
            filemakerCourseId: r.filemaker_course_id,
            courseStart: r.course_start,
            courseEnd: r.course_end,
            courseId: r.course_id,
            schoolmanNumber: r.schoolman_number,
          },
        ]
      : []
  );
}

/** The planning month's date range, half-open: [first Monday, the Monday after its last week). */
export async function planRange(month: string): Promise<[string, string]> {
  const weeks = await planWeeks(month);
  return [weeks[0].start, addDays(weeks[weeks.length - 1].start, 7)];
}

export async function listAssignments(month: string): Promise<Assignment[]> {
  const [from, to] = await planRange(month);
  const rows = await query<{
    group_id: string;
    on_date: string;
    teacher_id: string;
    is_substitute: boolean;
    is_tentative: boolean;
    merged: boolean;
    lessons: string | null;
  }>(
    // An assignment is a lesson day of a board group with a teacher (0045), not called off; its units as
    // the day or its course's weekly plan says (course_day_times).
    `SELECT a.group_id, to_char(a.on_date, 'YYYY-MM-DD') AS on_date, a.teacher_id,
            a.is_substitute, a.is_tentative, a.merged, t.lessons
       FROM course_days a
       LEFT JOIN course_day_times t ON t.id = a.id
       JOIN course_groups g ON g.id = a.group_id
      WHERE g.month = $1::date AND a.on_date >= $2::date AND a.on_date < $3::date
        AND a.teacher_id IS NOT NULL AND NOT a.cancelled`,
    [`${month}-01`, from, to]
  );
  return rows.map((r) => ({
    groupId: r.group_id,
    onDate: r.on_date,
    teacherId: r.teacher_id,
    isSubstitute: r.is_substitute,
    isTentative: r.is_tentative,
    merged: r.merged,
    ...(r.lessons === null ? {} : { lessons: Number(r.lessons) }),
  }));
}

export async function listAbsences(month: string): Promise<Absence[]> {
  const [from, to] = await planRange(month);
  const rows = await query<{ teacher_id: string; on_date: string; reason: string }>(
    `SELECT staff_member_id AS teacher_id, to_char(on_date, 'YYYY-MM-DD') AS on_date, reason
       FROM staff_absences
      WHERE on_date >= $1::date AND on_date < $2::date`,
    [from, to]
  );
  return rows.flatMap((r) =>
    isAbsenceReason(r.reason)
      ? [{ teacherId: r.teacher_id, onDate: r.on_date, reason: r.reason }]
      : []
  );
}

/**
 * Who teaches in each shift's plan, this month or the month before — the tray's „Im Plan", ahead of everyone
 * else with days free. Read once with the page, so the tray does not reshuffle while a month is planned.
 */
export async function planRegulars(month: string): Promise<Record<'morning' | 'afternoon', string[]>> {
  const rows = await query<{ shift: string; teacher_id: string }>(
    `SELECT DISTINCT g.shift, d.teacher_id
       FROM course_days d JOIN course_groups g ON g.id = d.group_id
      WHERE g.month IN ($1::date, ($1::date - interval '1 month')::date) AND d.teacher_id IS NOT NULL AND NOT d.cancelled`,
    [`${month}-01`]
  );
  return {
    morning: rows.filter((r) => r.shift === 'morning').map((r) => r.teacher_id),
    afternoon: rows.filter((r) => r.shift === 'afternoon').map((r) => r.teacher_id),
  };
}

/** What teachers teach outside the board in the month's weeks — evening, special and company courses — in units a week. */
export async function listOtherUnits(month: string): Promise<Record<string, Record<string, number>>> {
  const [from, to] = await planRange(month);
  const rows = await query<{ teacher_id: string; monday: string; units: string }>(
    `SELECT d.teacher_id, to_char(date_trunc('week', d.on_date), 'YYYY-MM-DD') AS monday, sum(coalesce(t.lessons, 0)) AS units
       FROM course_days d JOIN course_day_times t ON t.id = d.id
      WHERE d.group_id IS NULL AND d.teacher_id IS NOT NULL AND NOT d.cancelled AND d.on_date >= $1::date AND d.on_date < $2::date
      GROUP BY 1, 2`,
    [from, to]
  );
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) (out[r.teacher_id] ??= {})[r.monday] = Number(r.units);
  return out;
}

/**
 * Each of the month's groups' class in the levels before, most recent first, up to three: its level and
 * its main teachers (a quarter of its days or more, covers left out). A class is followed by its learners:
 * the class before is the one most of them came from — three at least — that ended within three weeks of
 * this one's start (Rahman, 2026-10-22: a teacher keeps a class for at most three full courses).
 */
export async function classHistory(month: string): Promise<Record<string, { level: string; teachers: string[] }[]>> {
  const rows = await query<{ group_id: string; depth: number; level: string; teachers: string[] }>(
    `WITH RECURSIVE
     cls AS (
       SELECT c.id AS course_id, gi AS group_index, c.level_code, i.start_date, i.end_date
         FROM courses c
         JOIN course_instances i ON i.id = c.course_instance_id
         JOIN course_types t ON t.id = i.course_type_id
         CROSS JOIN generate_series(1, greatest(c.groups, 1)) AS gi
        WHERE (t.format = 'intensive' OR is_c1h_course(c.id)) AND i.status <> 'cancelled' AND c.status <> 'cancelled'
          AND i.end_date >= $1::date - 420 AND i.start_date <= $1::date + 62
     ),
     learners AS (
       SELECT DISTINCT bp.course_id, coalesce(bp.group_index, 1) AS group_index, b.person_id
         FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
        WHERE b.deleted_at IS NULL AND b.status <> 'cancelled' AND bp.course_id IN (SELECT course_id FROM cls)
     ),
     link AS (
       SELECT DISTINCT ON (k.course_id, k.group_index) k.course_id, k.group_index, p.course_id AS p_course, p.group_index AS p_group
         FROM cls k
         JOIN cls p ON p.course_id <> k.course_id AND p.end_date BETWEEN k.start_date - 21 AND k.start_date - 1
         JOIN learners lk ON lk.course_id = k.course_id AND lk.group_index = k.group_index
         JOIN learners lp ON lp.course_id = p.course_id AND lp.group_index = p.group_index AND lp.person_id = lk.person_id
        GROUP BY k.course_id, k.group_index, p.course_id, p.group_index
       HAVING count(*) >= 3
        ORDER BY k.course_id, k.group_index, count(*) DESC
     ),
     chain AS (
       SELECT g.id AS group_id, 1 AS depth, l.p_course, l.p_group
         FROM course_groups g JOIN link l ON l.course_id = g.course_id AND l.group_index = g.group_index
        WHERE g.month = $1::date
       UNION ALL
       SELECT ch.group_id, ch.depth + 1, l.p_course, l.p_group
         FROM chain ch JOIN link l ON l.course_id = ch.p_course AND l.group_index = ch.p_group
        WHERE ch.depth < 3
     ),
     taught AS (
       SELECT d.course_id, d.group_index, d.teacher_id
         FROM course_days d
        WHERE (d.course_id, d.group_index) IN (SELECT p_course, p_group FROM chain) AND NOT d.cancelled
        GROUP BY d.course_id, d.group_index, d.teacher_id
       HAVING d.teacher_id IS NOT NULL
          AND count(*) FILTER (WHERE NOT d.is_substitute) * 4 >=
              (SELECT count(*) FROM course_days x WHERE x.course_id = d.course_id AND x.group_index = d.group_index AND NOT x.cancelled)
     )
     SELECT ch.group_id, ch.depth, coalesce(split_part(c.level_code, '.', 1), 'C1H') AS level,
            coalesce(array_agg(t.teacher_id) FILTER (WHERE t.teacher_id IS NOT NULL), '{}') AS teachers
       FROM chain ch
       JOIN courses c ON c.id = ch.p_course
       LEFT JOIN taught t ON t.course_id = ch.p_course AND t.group_index = ch.p_group
      GROUP BY ch.group_id, ch.depth, c.level_code
      ORDER BY ch.group_id, ch.depth`,
    [`${month}-01`]
  );
  const out: Record<string, { level: string; teachers: string[] }[]> = {};
  for (const r of rows) (out[r.group_id] ??= []).push({ level: r.level, teachers: r.teachers });
  return out;
}

/** Everything the board needs for one month, in one round of queries. */
export async function loadPlan(month: string): Promise<PlanContext> {
  const [teachers, groups, assignments, absences, weeks, otherUnits, history] = await Promise.all([
    listTeachers(),
    listGroups(month),
    listAssignments(month),
    listAbsences(month),
    planWeeks(month),
    listOtherUnits(month),
    classHistory(month),
  ]);
  return { teachers, groups, assignments, absences, weeks, otherUnits, history };
}

/**
 * Replaces one shift-week's assignments in a single transaction: the board's
 * only write. `groupIds` are the month's groups of that shift, `days` the
 * week's course days — both resolved by the action, which has already
 * validated the payload against them.
 */
export async function replaceWeekAssignments(
  groupIds: readonly string[],
  days: readonly string[],
  assignments: readonly Assignment[],
  changedBy: string
): Promise<void> {
  if (groupIds.length === 0 || days.length === 0) return;
  await withTransaction(async (client) => {
    // The week's lesson days lose their teachers, then get the board's; a course's day stays a day.
    await client.query(`SELECT link_course_days()`);
    await client.query(
      `UPDATE course_days SET teacher_id = NULL, is_substitute = false, is_tentative = false, changed_by = $3, updated_at = timezone('utc', now())
        WHERE group_id = ANY($1::uuid[]) AND on_date = ANY($2::date[]) AND teacher_id IS NOT NULL`,
      [groupIds, days, changedBy]
    );
    for (const a of assignments) await setDayTeacher(client, a, changedBy);
    // A board day of no course with nothing on it is no day.
    await client.query(
      `DELETE FROM course_days
        WHERE group_id = ANY($1::uuid[]) AND on_date = ANY($2::date[]) AND course_id IS NULL
          AND teacher_id IS NULL AND room_id IS NULL AND NOT cancelled AND note IS NULL`,
      [groupIds, days]
    );
  });
}

/**
 * One board cell: the group's lesson day on that date, made if missing, gets the teacher — never a date
 * outside the group's course (the action has refused it already; this is the floor under it).
 */
async function setDayTeacher(client: PoolClient, a: Assignment, changedBy: string, onlyIfEmpty = false): Promise<number> {
  const r = await client.query(
    `INSERT INTO course_days (group_id, course_id, group_index, on_date, teacher_id, is_substitute, is_tentative, changed_by)
     SELECT g.id, g.course_id, g.group_index, $2::date, $3, $4, $5, $6
       FROM course_groups g
       LEFT JOIN courses c ON c.id = g.course_id
       LEFT JOIN course_instances i ON i.id = c.course_instance_id
      WHERE g.id = $1 AND (i.id IS NULL OR $2::date BETWEEN i.start_date AND i.end_date)
     ON CONFLICT (group_id, on_date) WHERE group_id IS NOT NULL DO UPDATE
       SET teacher_id = EXCLUDED.teacher_id, is_substitute = EXCLUDED.is_substitute, is_tentative = EXCLUDED.is_tentative,
           changed_by = EXCLUDED.changed_by, updated_at = timezone('utc', now())
       ${onlyIfEmpty ? 'WHERE course_days.teacher_id IS NULL' : ''}`,
    [a.groupId, a.onDate, a.teacherId, a.isSubstitute, a.isTentative, changedBy]
  );
  return r.rowCount ?? 0;
}


/* --------------------------------------------------------------- groups */

export async function updateGroup(
  id: string,
  patch: { registrations: number; teacherFirst: string | null; teacherSecond: string | null; filemakerCourseId: string | null }
): Promise<void> {
  await query(
    `UPDATE course_groups
        SET registrations = $2, teacher_first = $3, teacher_second = $4, filemaker_course_id = $5,
            updated_at = timezone('utc', now())
      WHERE id = $1`,
    [id, patch.registrations, patch.teacherFirst, patch.teacherSecond, patch.filemakerCourseId]
  );
}

/** A further parallel group of a level: next index, same registrations split later by the planners. */
export async function addGroup(month: string, shift: string, level: string, phase: '1' | '2'): Promise<void> {
  await query(
    `INSERT INTO course_groups (month, shift, level, phase, group_index)
     SELECT $1::date, $2, $3, $4, coalesce(max(group_index), 0) + 1
       FROM course_groups WHERE month = $1::date AND shift = $2 AND level = $3 AND phase = $4`,
    [`${month}-01`, shift, level, phase]
  );
  await linkGroupsAndDays();
}

/** A new board group gets its course, and the course's days in its month get the group (0045). */
export async function linkGroupsAndDays(): Promise<void> {
  await query(`SELECT link_course_groups()`);
  await query(`SELECT link_course_days()`);
}

/** Removes a group only when nothing is planned in it — its course's days stay. Returns false otherwise. */
export async function removeGroupIfEmpty(id: string): Promise<boolean> {
  return withTransaction(async (client) => {
    const planned = await client.query(`SELECT 1 FROM course_days WHERE group_id = $1 AND teacher_id IS NOT NULL LIMIT 1`, [id]);
    if (planned.rowCount) return false;
    await client.query(`DELETE FROM course_days WHERE group_id = $1 AND course_id IS NULL`, [id]);
    const rows = await client.query(`DELETE FROM course_groups WHERE id = $1 RETURNING id`, [id]);
    return (rows.rowCount ?? 0) > 0;
  });
}

/** Adds assignments that do not exist yet; existing cells are left alone. Returns how many were added. */
export async function insertMissingAssignments(assignments: readonly Assignment[], changedBy: string): Promise<number> {
  let added = 0;
  await withTransaction(async (client) => {
    await client.query(`SELECT link_course_days()`);
    for (const a of assignments) added += await setDayTeacher(client, a, changedBy, true);
  });
  return added;
}

/* --------------------------------------------------------------- months */

/** Every planning month that has course groups, `yyyy-mm`, oldest first. */
export async function listPlanMonths(): Promise<string[]> {
  const rows = await query<{ month: string }>(
    `SELECT DISTINCT to_char(month, 'YYYY-MM') AS month FROM course_groups ORDER BY 1`
  );
  return rows.map((r) => r.month);
}

/**
 * The next month from this one: every `.1` course continues as `.2` with its
 * pair, its registrations and its room — the constancy rule the planners
 * apply by hand. The other shift's new courses are not guessed; they are
 * created on the Kurse screen once the registrations are known. Returns how
 * many groups were created (none when the month already has them).
 */
export async function createContinuationMonth(from: string, to: string): Promise<number> {
  const rows = await query<{ n: string }>(
    `WITH ins AS (
       INSERT INTO course_groups (month, shift, level, phase, group_index, registrations, teacher_first, teacher_second, room_id)
       SELECT $2::date, shift, level, '2', group_index, registrations, teacher_first, teacher_second, room_id
         FROM course_groups
        WHERE month = $1::date AND phase = '1'
       ON CONFLICT (month, shift, level, phase, group_index) DO NOTHING
       RETURNING 1
     )
     SELECT count(*)::text AS n FROM ins`,
    [`${from}-01`, `${to}-01`]
  );
  await linkGroupsAndDays();
  return Number(rows[0]?.n ?? 0);
}

/** The assignments of some groups on some dates, as they are right now — for the stale check. */
export async function assignmentsNow(groupIds: readonly string[], days: readonly string[]): Promise<Assignment[]> {
  if (!groupIds.length || !days.length) return [];
  const rows = await query<{ group_id: string; on_date: string; teacher_id: string; is_substitute: boolean; is_tentative: boolean }>(
    `SELECT group_id, to_char(on_date, 'YYYY-MM-DD') AS on_date, teacher_id, is_substitute, is_tentative
       FROM course_days
      WHERE group_id = ANY($1::uuid[]) AND on_date = ANY($2::date[]) AND teacher_id IS NOT NULL AND NOT cancelled`,
    [groupIds, days]
  );
  return rows.map((r) => ({ groupId: r.group_id, onDate: r.on_date, teacherId: r.teacher_id, isSubstitute: r.is_substitute, isTentative: r.is_tentative }));
}
