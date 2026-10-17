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
import { monthStart, nextMonth, planningWeeks } from './weeks';

/**
 * Reads for the course-planning board.
 *
 * Dates leave Postgres as `yyyy-mm-dd` strings (`to_char`), never as Date
 * objects: `pg` would otherwise hand back a local-midnight Date for a `date`
 * column, and the board compares dates as strings all day.
 */

const MONTH = /^\d{4}-\d{2}$/;

/** `yyyy-mm` for the current month, in UTC. */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * The month the screen shows: the requested one when valid, else the latest
 * month that has course groups, else this month.
 */
export async function resolvePlanMonth(requested?: string): Promise<string> {
  if (requested && MONTH.test(requested)) return requested;
  const row = await queryFirst<{ month: string }>(
    `SELECT to_char(max(month), 'YYYY-MM') AS month FROM course_groups`
  );
  return row?.month ?? currentMonth();
}

type TeacherRow = {
  id: string;
  short_name: string;
  full_name: string;
  contract: 'employed' | 'freelance';
  shifts: string[];
  days_per_week: number;
  weekdays: string[];
  levels: string[];
  note: string | null;
  filemaker_staff_id: string | null;
  is_active: boolean;
};

const toTeacher = (r: TeacherRow): Teacher => ({
  id: r.id,
  shortName: r.short_name,
  fullName: r.full_name,
  contract: r.contract,
  shifts: r.shifts.filter(isShift),
  daysPerWeek: r.days_per_week,
  weekdays: r.weekdays.filter(isWeekday),
  levels: r.levels.filter(isLevel),
  note: r.note,
  filemakerStaffId: r.filemaker_staff_id,
  isActive: r.is_active,
});

/**
 * The teaching staff: the staff register's members with the role Unterricht (0039), or anyone the plan
 * still names. The name is the person's; employed or freelance is the contract that runs today.
 */
export async function listTeachers(): Promise<Teacher[]> {
  const rows = await query<TeacherRow>(
    `SELECT s.id, s.short_name, btrim(p.first_name || ' ' || coalesce(p.last_name, '')) AS full_name,
            CASE WHEN (SELECT c.kind FROM staff_contracts c
                        WHERE c.staff_member_id = s.id AND (c.valid_from IS NULL OR c.valid_from <= current_date)
                          AND (c.valid_to IS NULL OR c.valid_to >= current_date)
                        ORDER BY c.valid_from DESC NULLS LAST LIMIT 1) = 'freelance' THEN 'freelance' ELSE 'employed' END AS contract,
            s.shifts, s.days_per_week, s.weekdays, s.levels, s.note, s.filemaker_staff_id, s.is_active
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
            to_char(i.start_date, 'YYYY-MM-DD') AS course_start, to_char(i.end_date, 'YYYY-MM-DD') AS course_end
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
      ORDER BY g.shift, g.level, g.phase, g.group_index`,
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
          },
        ]
      : []
  );
}

/** The planning month's date range, half-open: [start, next start). */
function monthRange(month: string): [string, string] {
  return [monthStart(month), monthStart(nextMonth(month))];
}

export async function listAssignments(month: string): Promise<Assignment[]> {
  const [from, to] = monthRange(month);
  const rows = await query<{
    group_id: string;
    on_date: string;
    teacher_id: string;
    is_substitute: boolean;
    is_tentative: boolean;
  }>(
    // An assignment is a lesson day of a board group with a teacher (0045), not called off.
    `SELECT a.group_id, to_char(a.on_date, 'YYYY-MM-DD') AS on_date, a.teacher_id,
            a.is_substitute, a.is_tentative
       FROM course_days a
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
  }));
}

export async function listAbsences(month: string): Promise<Absence[]> {
  const [from, to] = monthRange(month);
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

/** Everything the board needs for one month, in one round of queries. */
export async function loadPlan(month: string): Promise<PlanContext> {
  const [teachers, groups, assignments, absences] = await Promise.all([
    listTeachers(),
    listGroups(month),
    listAssignments(month),
    listAbsences(month),
  ]);
  return { teachers, groups, assignments, absences, weeks: planningWeeks(month) };
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

/* ------------------------------------------------------------- teachers */

export type { TeacherRules } from './repo-types';
import type { TeacherRules } from './repo-types';

export async function updateTeacherRules(id: string, rules: TeacherRules): Promise<void> {
  await query(
    `UPDATE staff_members
        SET short_name = $2, shifts = $3, days_per_week = $4, weekdays = $5, levels = $6,
            note = $7, updated_at = timezone('utc', now())
      WHERE id = $1`,
    [id, rules.shortName, [...rules.shifts], rules.daysPerWeek, [...rules.weekdays], [...rules.levels], rules.note]
  );
}

/**
 * Replaces a teacher's absences inside a date range: the teacher dialog edits
 * a whole month at once, so the month's rows are rewritten in one transaction.
 * Rows carrying a `filemaker_ref` are kept — those came from FileMaker and are
 * the bridge's to change.
 */
export async function replaceTeacherAbsences(
  teacherId: string,
  from: string,
  to: string,
  absences: readonly Absence[],
  createdBy: string
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM staff_absences
        WHERE staff_member_id = $1 AND on_date >= $2::date AND on_date < $3::date AND filemaker_ref IS NULL`,
      [teacherId, from, to]
    );
    for (const a of absences) {
      await client.query(
        `INSERT INTO staff_absences (staff_member_id, on_date, reason, created_by)
         VALUES ($1, $2::date, $3, $4)
         ON CONFLICT (staff_member_id, on_date) DO UPDATE SET reason = EXCLUDED.reason`,
        [teacherId, a.onDate, a.reason, createdBy]
      );
    }
  });
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
