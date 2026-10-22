import type { Bilingual } from '../i18n';

import { ABSENCE_LABELS, SHIFT_INFO, WEEKDAY_LABELS, type Absence, type Assignment, type CourseGroup, type Teacher, type Weekday } from './types';
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
  /** Units a teacher teaches outside the board — evening, special and company courses — per week: teacherId → Monday → UE. */
  otherUnits?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /**
   * Each group's class in the levels before this one, most recent first (up to three): its level and its
   * main teachers. The class is followed by its learners (`classHistory`, repo.ts).
   */
  history?: Readonly<Record<string, readonly { level: string; teachers: readonly string[] }[]>>;
};

export type Fit =
  | { ok: true; substitute: boolean; levelMatch: boolean }
  | { ok: false; reason: Bilingual };

export const assignmentKey = (groupId: string, onDate: string) => `${groupId}|${onDate}`;

export function teacherById(ctx: PlanContext, id: string): Teacher | undefined {
  return ctx.teachers.find((t) => t.id === id);
}

/** A shift's teaching days in a week: the first 5 (morning) or 4 (afternoon) — the rows of a column. */
export function shiftDays(shift: CourseGroup['shift'], week: PlanningWeek): readonly string[] {
  return week.days.slice(0, SHIFT_INFO[shift].days);
}

/** Whether a date lies inside the group's course; a group of no course has every day of its month. */
export function inCourse(group: Pick<CourseGroup, 'courseStart' | 'courseEnd'>, date: string): boolean {
  return (!group.courseStart || date >= group.courseStart) && (!group.courseEnd || date <= group.courseEnd);
}

/**
 * The dates a group teaches in a week: its shift's days, inside its course — none before a start's
 * first day or after its last, so the board offers no slot and the server takes none there.
 */
export function courseDays(group: Pick<CourseGroup, 'shift' | 'courseStart' | 'courseEnd'>, week: PlanningWeek): readonly string[] {
  return shiftDays(group.shift, week).filter((d) => inCourse(group, d));
}

/** 0 for the first half of the week, 1 for the second — which of the pair holds it. */
export function halfOf(group: Pick<CourseGroup, 'shift'>, date: string): 0 | 1 {
  const dow = weekdayOf(date);
  const index = dow ? ['Mo', 'Di', 'Mi', 'Do', 'Fr'].indexOf(dow) : 0;
  return index < SHIFT_INFO[group.shift].half ? 0 : 1;
}

export function absenceOn(ctx: PlanContext, teacherId: string, date: string): Absence | undefined {
  const absence = ctx.absences.find((a) => a.teacherId === teacherId && a.onDate === date);
  if (absence) return absence;
  // Not active yet (0083): away, as a day off is, until the day they start again.
  const from = ctx.teachers.find((t) => t.id === teacherId)?.from;
  return from && date < from ? { teacherId, onDate: date, reason: 'Freistellung' } : undefined;
}

/** Whether a teacher teaches on a weekday in a shift — or, without a shift, in either. */
export const worksOn = (teacher: Teacher, dow: Weekday, shift?: CourseGroup['shift']): boolean =>
  shift ? teacher.days[shift].includes(dow) : teacher.days.morning.includes(dow) || teacher.days.afternoon.includes(dow);

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

/**
 * The teaching units (UE) a teacher has in a week: the board's days — each its own units, else its shift's —
 * and what they teach outside the board (evening, special and company courses).
 */
export function unitsUsed(ctx: PlanContext, teacherId: string, weekStart: string): number {
  let units = ctx.otherUnits?.[teacherId]?.[weekStart] ?? 0;
  for (const a of ctx.assignments) {
    if (a.teacherId !== teacherId || weekStartOf(a.onDate) !== weekStart) continue;
    const group = ctx.groups.find((g) => g.id === a.groupId);
    units += a.lessons ?? (group ? SHIFT_INFO[group.shift].units : 0);
  }
  return units;
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
  const possible = (week?.days ?? []).filter((d) => {
    const dow = weekdayOf(d);
    return dow !== null && worksOn(teacher, dow);
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

export type DayState = 'free' | 'planned' | 'away' | 'off';

/**
 * A teacher's days of one week in a shift (Mo–Fr in the morning, Mo–Do in the afternoon), as the tray
 * shows them — the planners' sheet names the days someone is „verfügbar", not how many: planned in
 * either shift, away, not a day they work, or free.
 */
export function dayStates(ctx: PlanContext, teacher: Teacher, week: PlanningWeek, shift: CourseGroup['shift']): { date: string; state: DayState }[] {
  const used = usedDays(ctx, teacher.id, week.start);
  return shiftDays(shift, week).map((date) => {
    const dow = weekdayOf(date);
    const state: DayState = absenceOn(ctx, teacher.id, date) ? 'away' : used.has(date) ? 'planned' : dow && worksOn(teacher, dow, shift) ? 'free' : 'off';
    return { date, state };
  });
}

export function fit(ctx: PlanContext, teacherId: string, group: CourseGroup, date: string): Fit {
  if (!inCourse(group, date)) return { ok: false, reason: { de: 'außerhalb des Kurses', en: 'outside the course' } };
  const teacher = teacherById(ctx, teacherId);
  if (!teacher || !teacher.isActive) return { ok: false, reason: { de: 'nicht im Kollegium', en: 'not on the staff' } };

  const absence = absenceOn(ctx, teacherId, date);
  if (absence) return { ok: false, reason: ABSENCE_LABELS[absence.reason] };

  const dow = weekdayOf(date);
  if (!dow) return { ok: false, reason: { de: 'Wochenende', en: 'weekend' } };
  // Not that weekday in any shift: not there. In the other shift only: a cover from there (a double shift).
  if (!worksOn(teacher, dow)) return { ok: false, reason: { de: `nicht am ${dow}`, en: `not on ${WEEKDAY_LABELS[dow].en}` } };

  const current = assignmentAt(ctx, group.id, date);
  const here = current?.teacherId === teacherId;

  const elsewhere = ctx.assignments.some(
    (a) =>
      a.teacherId === teacherId &&
      a.onDate === date &&
      a.groupId !== group.id &&
      ctx.groups.find((g) => g.id === a.groupId)?.shift === group.shift
  );
  if (elsewhere) return { ok: false, reason: { de: 'schon verplant', en: 'already planned' } };

  if (!here && remainingDays(ctx, teacher, weekStartOf(date)).rest <= 0) {
    return { ok: false, reason: { de: 'Woche voll', en: 'week full' } };
  }

  return {
    ok: true,
    substitute: !worksOn(teacher, dow, group.shift),
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
