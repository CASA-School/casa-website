import 'server-only';

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

export async function listTeachers(): Promise<Teacher[]> {
  const rows = await query<TeacherRow>(
    `SELECT id, short_name, full_name, contract, shifts, days_per_week, weekdays, levels,
            note, filemaker_staff_id, is_active
       FROM teachers
      ORDER BY short_name COLLATE "C"`
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
  teacher_first: string | null;
  teacher_second: string | null;
  room_id: string | null;
  filemaker_course_id: string | null;
};

export async function listGroups(month: string): Promise<CourseGroup[]> {
  const rows = await query<GroupRow>(
    `SELECT id, to_char(month, 'YYYY-MM-DD') AS month, shift, level, phase, group_index,
            registrations, teacher_first, teacher_second, room_id, filemaker_course_id
       FROM course_groups
      WHERE month = $1::date
      ORDER BY shift, level, phase, group_index`,
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
            registrations: r.registrations,
            teacherFirst: r.teacher_first,
            teacherSecond: r.teacher_second,
            roomId: r.room_id,
            filemakerCourseId: r.filemaker_course_id,
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
    `SELECT a.group_id, to_char(a.on_date, 'YYYY-MM-DD') AS on_date, a.teacher_id,
            a.is_substitute, a.is_tentative
       FROM plan_assignments a
       JOIN course_groups g ON g.id = a.group_id
      WHERE g.month = $1::date AND a.on_date >= $2::date AND a.on_date < $3::date`,
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
    `SELECT teacher_id, to_char(on_date, 'YYYY-MM-DD') AS on_date, reason
       FROM teacher_absences
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

export type PlanMonthSummary = {
  groups: number;
  morning: number;
  afternoon: number;
  teachers: number;
  assignments: number;
  /** Course days the month asks for: groups × days per week × weeks. */
  courseDays: number;
};

export async function planMonthSummary(month: string): Promise<PlanMonthSummary> {
  const plan = await loadPlan(month);
  const morning = plan.groups.filter((g) => g.shift === 'morning').length;
  const afternoon = plan.groups.length - morning;
  const courseDays = plan.weeks.length * (morning * 5 + afternoon * 4);
  return {
    groups: plan.groups.length,
    morning,
    afternoon,
    teachers: plan.teachers.filter((t) => t.isActive).length,
    assignments: plan.assignments.length,
    courseDays,
  };
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
    await client.query(
      `DELETE FROM plan_assignments
        WHERE group_id = ANY($1::uuid[]) AND on_date = ANY($2::date[])`,
      [groupIds, days]
    );
    for (const a of assignments) {
      await client.query(
        `INSERT INTO plan_assignments (group_id, on_date, teacher_id, is_substitute, is_tentative, changed_by)
         VALUES ($1, $2::date, $3, $4, $5, $6)`,
        [a.groupId, a.onDate, a.teacherId, a.isSubstitute, a.isTentative, changedBy]
      );
    }
  });
}

/* ------------------------------------------------------------- teachers */

export type { TeacherRules } from './repo-types';
import type { TeacherRules } from './repo-types';

export async function updateTeacherRules(id: string, rules: TeacherRules): Promise<void> {
  await query(
    `UPDATE teachers
        SET short_name = $2, contract = $3, shifts = $4, days_per_week = $5, weekdays = $6, levels = $7,
            note = $8, updated_at = timezone('utc', now())
      WHERE id = $1`,
    [id, rules.shortName, rules.contract, [...rules.shifts], rules.daysPerWeek, [...rules.weekdays], [...rules.levels], rules.note]
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
      `DELETE FROM teacher_absences
        WHERE teacher_id = $1 AND on_date >= $2::date AND on_date < $3::date AND filemaker_ref IS NULL`,
      [teacherId, from, to]
    );
    for (const a of absences) {
      await client.query(
        `INSERT INTO teacher_absences (teacher_id, on_date, reason, created_by)
         VALUES ($1, $2::date, $3, $4)
         ON CONFLICT (teacher_id, on_date) DO UPDATE SET reason = EXCLUDED.reason`,
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
}

/** Removes a group only when nothing is planned in it. Returns false otherwise. */
export async function removeGroupIfEmpty(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM course_groups g
      WHERE g.id = $1 AND NOT EXISTS (SELECT 1 FROM plan_assignments a WHERE a.group_id = g.id)
      RETURNING id`,
    [id]
  );
  return rows.length > 0;
}

/** Adds assignments that do not exist yet; existing cells are left alone. Returns how many were added. */
export async function insertMissingAssignments(assignments: readonly Assignment[], changedBy: string): Promise<number> {
  let added = 0;
  await withTransaction(async (client) => {
    for (const a of assignments) {
      const r = await client.query(
        `INSERT INTO plan_assignments (group_id, on_date, teacher_id, is_substitute, is_tentative, changed_by)
         VALUES ($1, $2::date, $3, $4, $5, $6)
         ON CONFLICT (group_id, on_date) DO NOTHING`,
        [a.groupId, a.onDate, a.teacherId, a.isSubstitute, a.isTentative, changedBy]
      );
      added += r.rowCount ?? 0;
    }
  });
  return added;
}
