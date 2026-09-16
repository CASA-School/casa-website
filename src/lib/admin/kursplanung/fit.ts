import { SHIFT_INFO, type Absence, type Assignment, type CourseGroup, type Teacher } from './types';
import { weekStartOf, weekdayOf, type PlanningWeek } from './weeks';

/**
 * Does this piece fit here?
 *
 * The three questions the board asks before it lets a teacher land on a course
 * day, in the order a planner asks them: is the person there at all (absence,
 * weekday), are they already teaching somewhere in this shift, and do they
 * have a day left this week. Level and shift are not blockers — teaching
 * outside one's level is allowed with a warning, teaching in the other shift
 * is allowed and shown as a substitution — because the last-minute cover that
 * this tool exists for is exactly the case where the rules bend.
 */

export type PlanContext = {
  teachers: readonly Teacher[];
  groups: readonly CourseGroup[];
  assignments: readonly Assignment[];
  absences: readonly Absence[];
  weeks: readonly PlanningWeek[];
};

export type Fit =
  | { ok: true; substitute: boolean; levelMatch: boolean }
  | { ok: false; reason: string };

export const assignmentKey = (groupId: string, onDate: string) => `${groupId}|${onDate}`;

export function teacherById(ctx: PlanContext, id: string): Teacher | undefined {
  return ctx.teachers.find((t) => t.id === id);
}

/** The dates a group teaches in a week: the first 5 (morning) or 4 (afternoon). */
export function courseDays(group: Pick<CourseGroup, 'shift'>, week: PlanningWeek): readonly string[] {
  return week.days.slice(0, SHIFT_INFO[group.shift].days);
}

/** 0 for the first half of the week, 1 for the second — which of the pair holds it. */
export function halfOf(group: Pick<CourseGroup, 'shift'>, date: string): 0 | 1 {
  const dow = weekdayOf(date);
  const index = dow ? ['Mo', 'Di', 'Mi', 'Do', 'Fr'].indexOf(dow) : 0;
  return index < SHIFT_INFO[group.shift].half ? 0 : 1;
}

export function absenceOn(ctx: PlanContext, teacherId: string, date: string): Absence | undefined {
  return ctx.absences.find((a) => a.teacherId === teacherId && a.onDate === date);
}

export function assignmentAt(ctx: PlanContext, groupId: string, date: string): Assignment | undefined {
  return ctx.assignments.find((a) => a.groupId === groupId && a.onDate === date);
}

/** Distinct dates a teacher is assigned in the week starting `weekStart`. */
export function usedDays(ctx: PlanContext, teacherId: string, weekStart: string): Set<string> {
  const used = new Set<string>();
  for (const a of ctx.assignments) {
    if (a.teacherId === teacherId && weekStartOf(a.onDate) === weekStart) used.add(a.onDate);
  }
  return used;
}

export type Remaining = {
  rest: number;
  used: number;
  max: number;
  /** Absent on every day they could otherwise work this week. */
  awayAll: boolean;
};

/** How many days a teacher still has in a week: the length of their piece. */
export function remainingDays(ctx: PlanContext, teacher: Teacher, weekStart: string): Remaining {
  const week = ctx.weeks.find((w) => w.start === weekStart);
  const span = Math.max(...teacher.shifts.map((s) => SHIFT_INFO[s].days));
  const possible = (week?.days ?? []).slice(0, span).filter((d) => {
    const dow = weekdayOf(d);
    return dow !== null && teacher.weekdays.includes(dow);
  });
  const absent = possible.filter((d) => absenceOn(ctx, teacher.id, d)).length;
  const used = usedDays(ctx, teacher.id, weekStart).size;
  const max = teacher.daysPerWeek;
  return {
    rest: Math.max(0, Math.min(max, possible.length - absent) - used),
    used,
    max,
    awayAll: possible.length > 0 && absent === possible.length,
  };
}

export function fit(ctx: PlanContext, teacherId: string, group: CourseGroup, date: string): Fit {
  const teacher = teacherById(ctx, teacherId);
  if (!teacher || !teacher.isActive) return { ok: false, reason: 'nicht im Kollegium' };

  const absence = absenceOn(ctx, teacherId, date);
  if (absence) return { ok: false, reason: absence.reason };

  const dow = weekdayOf(date);
  if (!dow) return { ok: false, reason: 'Wochenende' };
  if (!teacher.weekdays.includes(dow)) return { ok: false, reason: `nicht am ${dow}` };

  const current = assignmentAt(ctx, group.id, date);
  const here = current?.teacherId === teacherId;

  const elsewhere = ctx.assignments.some(
    (a) =>
      a.teacherId === teacherId &&
      a.onDate === date &&
      a.groupId !== group.id &&
      ctx.groups.find((g) => g.id === a.groupId)?.shift === group.shift
  );
  if (elsewhere) return { ok: false, reason: 'schon verplant' };

  if (!here && remainingDays(ctx, teacher, weekStartOf(date)).rest <= 0) {
    return { ok: false, reason: 'Woche voll' };
  }

  return {
    ok: true,
    substitute: !teacher.shifts.includes(group.shift),
    levelMatch: teacher.levels.includes(group.level),
  };
}

/**
 * The dates a piece would cover if laid down at `fromDate`: consecutive course
 * days of the group, while they are free (or already this teacher's), while
 * the teacher fits, and no more than the teacher has left — or `limit`.
 */
export function span(
  ctx: PlanContext,
  teacherId: string,
  group: CourseGroup,
  fromDate: string,
  limit?: number
): string[] {
  const teacher = teacherById(ctx, teacherId);
  if (!teacher) return [];
  const week = ctx.weeks.find((w) => w.start === weekStartOf(fromDate));
  if (!week) return [];
  const days = courseDays(group, week);
  const rest0 = remainingDays(ctx, teacher, week.start).rest;
  const rest = limit === undefined ? rest0 : Math.min(limit, rest0);

  const out: string[] = [];
  let newDays = 0;
  for (let i = days.indexOf(fromDate); i >= 0 && i < days.length && newDays < rest; i++) {
    const date = days[i];
    const current = assignmentAt(ctx, group.id, date);
    if (current && current.teacherId !== teacherId) break;
    if (!fit(ctx, teacherId, group, date).ok) break;
    out.push(date);
    if (!current) newDays++;
  }
  return out;
}
