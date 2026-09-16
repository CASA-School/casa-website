import { courseDays } from './fit';
import { isShift, type Assignment, type CourseGroup, type Shift, type Teacher } from './types';
import type { PlanningWeek } from './weeks';

/**
 * What the server accepts for one shift-week.
 *
 * The board saves a whole shift-week at a time (docs/KURSPLANUNG.md, "One
 * write"), so the check is about the set, not a single cell: every group is one
 * of this month's groups in this shift, every date is a course day of this
 * week for that shift, every teacher exists and is active, and no group has
 * two teachers on one date. Fit (absence, quota, level) is NOT enforced here —
 * a planner may knowingly save a conflict and fix it next; the board shows it.
 * Enforcing it server-side would make "save with a red ring" impossible, and
 * that is a state the planners live in for hours on a bad Monday.
 */
export type WeekPayload = {
  month: string;
  shift: Shift;
  weekStart: string;
  assignments: readonly Assignment[];
};

export function validateWeekAssignments(
  payload: WeekPayload,
  groups: readonly CourseGroup[],
  teachers: readonly Teacher[],
  weeks: readonly PlanningWeek[]
): string[] {
  const errors: string[] = [];
  if (!isShift(payload.shift)) return ['unknown shift'];

  const week = weeks.find((w) => w.start === payload.weekStart);
  if (!week) return ['weekStart is not a planning week of this month'];

  const shiftGroups = new Map(
    groups.filter((g) => g.shift === payload.shift && g.month.slice(0, 7) === payload.month).map((g) => [g.id, g])
  );
  const active = new Set(teachers.filter((t) => t.isActive).map((t) => t.id));
  const seen = new Set<string>();

  for (const a of payload.assignments) {
    const group = shiftGroups.get(a.groupId);
    if (!group) {
      errors.push(`group ${a.groupId} is not a ${payload.shift} group of ${payload.month}`);
      continue;
    }
    if (!courseDays(group, week).includes(a.onDate)) {
      errors.push(`${a.onDate} is not a course day of the week ${payload.weekStart}`);
    }
    if (!active.has(a.teacherId)) errors.push(`teacher ${a.teacherId} is unknown or inactive`);
    const key = `${a.groupId}|${a.onDate}`;
    if (seen.has(key)) errors.push(`two teachers on ${key}`);
    seen.add(key);
  }
  return errors;
}

/** The assignments of one shift-week, from a month's full set. */
export function weekSlice(
  assignments: readonly Assignment[],
  groups: readonly CourseGroup[],
  shift: Shift,
  week: PlanningWeek
): Assignment[] {
  const ids = new Set(groups.filter((g) => g.shift === shift).map((g) => g.id));
  const days = new Set(week.days);
  return assignments.filter((a) => ids.has(a.groupId) && days.has(a.onDate));
}
