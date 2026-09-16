import { absenceOn, assignmentKey, courseDays, teacherById, type PlanContext } from './fit';
import { SHIFT_INFO, type Shift } from './types';
import { weekdayOf } from './weeks';

/**
 * Everything the plan currently violates.
 *
 * `hard` must be cleared before a week is complete: nobody planned on a day,
 * one person in two courses of the same shift on the same day, somebody
 * planned while absent or on a weekday they do not work, more days than the
 * contract allows. `warn` is a planner's judgement call: the other shift
 * without the substitution mark, a level the person is not listed for, a
 * course that sees more than two faces in one week. The board shows each on
 * the tile it concerns and nowhere else.
 */

export type IssueSeverity = 'hard' | 'warn' | 'open';

export type IssueCode =
  | 'offen'
  | 'doppelt'
  | 'abwesend'
  | 'wochentag'
  | 'kontingent'
  | 'schicht'
  | 'niveau'
  | 'wechsel';

export type Issue = {
  severity: IssueSeverity;
  code: IssueCode;
  groupId: string;
  /** Null for a per-week issue (`wechsel`). */
  onDate: string | null;
  weekStart: string;
  shift: Shift;
  teacherId: string | null;
  text: string;
};

export type Analysis = {
  issues: Issue[];
  /** Issues per `assignmentKey(groupId, date)`, for the tile. */
  byKey: Map<string, Issue[]>;
  /** weekStart → teacherId → dates assigned. */
  usage: Map<string, Map<string, Set<string>>>;
};

export function analysePlan(ctx: PlanContext): Analysis {
  const issues: Issue[] = [];
  const byKey = new Map<string, Issue[]>();
  const usage = new Map<string, Map<string, Set<string>>>();

  const push = (issue: Issue) => {
    issues.push(issue);
    if (issue.onDate) {
      const key = assignmentKey(issue.groupId, issue.onDate);
      byKey.set(key, [...(byKey.get(key) ?? []), issue]);
    }
  };

  for (const week of ctx.weeks) {
    const weekUsage = new Map<string, Set<string>>();
    usage.set(week.start, weekUsage);
    /** `${shift}|${date}|${teacherId}` → groups, to find double bookings. */
    const perDay = new Map<string, string[]>();

    for (const group of ctx.groups) {
      const faces = new Set<string>();
      const base = { groupId: group.id, weekStart: week.start, shift: group.shift };

      for (const date of courseDays(group, week)) {
        const assignment = ctx.assignments.find((a) => a.groupId === group.id && a.onDate === date);
        if (!assignment) {
          push({ ...base, severity: 'open', code: 'offen', onDate: date, teacherId: null, text: 'offen' });
          continue;
        }

        const teacher = teacherById(ctx, assignment.teacherId);
        const name = teacher?.shortName ?? '?';
        faces.add(assignment.teacherId);

        const dates = weekUsage.get(assignment.teacherId) ?? new Set<string>();
        dates.add(date);
        weekUsage.set(assignment.teacherId, dates);

        const dayKey = `${group.shift}|${date}|${assignment.teacherId}`;
        perDay.set(dayKey, [...(perDay.get(dayKey) ?? []), group.id]);

        const absence = absenceOn(ctx, assignment.teacherId, date);
        if (absence) {
          push({ ...base, severity: 'hard', code: 'abwesend', onDate: date, teacherId: assignment.teacherId, text: `${absence.reason} · ${weekdayOf(date) ?? ''}` });
        }
        const dow = weekdayOf(date);
        if (teacher && dow && !teacher.weekdays.includes(dow)) {
          push({ ...base, severity: 'hard', code: 'wochentag', onDate: date, teacherId: assignment.teacherId, text: `arbeitet nicht am ${dow}` });
        }
        if (teacher && !teacher.shifts.includes(group.shift) && !assignment.isSubstitute) {
          push({ ...base, severity: 'warn', code: 'schicht', onDate: date, teacherId: assignment.teacherId, text: `sonst ${teacher.shifts.map((s) => SHIFT_INFO[s].label).join('/')}` });
        }
        if (teacher && !teacher.levels.includes(group.level)) {
          push({ ...base, severity: 'warn', code: 'niveau', onDate: date, teacherId: assignment.teacherId, text: `${group.level} nicht hinterlegt` });
        }
        void name;
      }

      if (faces.size > 2) {
        push({ ...base, severity: 'warn', code: 'wechsel', onDate: null, teacherId: null, text: `${faces.size} Lehrkräfte in einer Woche` });
      }
    }

    for (const [dayKey, groupIds] of perDay) {
      if (groupIds.length < 2) continue;
      const [shift, date, teacherId] = dayKey.split('|');
      const name = teacherById(ctx, teacherId)?.shortName ?? '?';
      for (const groupId of groupIds) {
        push({ severity: 'hard', code: 'doppelt', groupId, onDate: date, weekStart: week.start, shift: shift as Shift, teacherId, text: `${name} doppelt am ${weekdayOf(date) ?? ''}` });
      }
    }

    for (const [teacherId, dates] of weekUsage) {
      const teacher = teacherById(ctx, teacherId);
      if (!teacher || dates.size <= teacher.daysPerWeek) continue;
      for (const a of ctx.assignments) {
        if (a.teacherId !== teacherId || !dates.has(a.onDate)) continue;
        const group = ctx.groups.find((g) => g.id === a.groupId);
        if (!group) continue;
        push({ severity: 'hard', code: 'kontingent', groupId: group.id, onDate: a.onDate, weekStart: week.start, shift: group.shift, teacherId, text: `${dates.size} Tage statt ${teacher.daysPerWeek}` });
      }
    }
  }

  return { issues, byKey, usage };
}
