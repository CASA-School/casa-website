import type { Bilingual } from '../i18n';

import { absenceOn, assignmentKey, courseDays, teacherById, unitsUsed, type PlanContext } from './fit';
import { ABSENCE_LABELS, SHIFT_INFO, WEEKDAY_LABELS, type Shift, type Weekday } from './types';
import { weekdayOf } from './weeks';

/**
 * Everything the plan currently violates.
 *
 * `hard` must be cleared before a week is complete: nobody planned on a day,
 * one person in two courses of the same shift on the same day (unless the
 * two are taught together that day, a „Zusammenlegung"), somebody
 * planned while absent or on a weekday they do not work, more days than the
 * contract allows. `warn` is a planner's judgement call: the other shift
 * without the substitution mark, a level the person is not listed for, a
 * course that sees more than two faces in one week, more teaching units in a
 * week than the contract holds, and a teacher on the same class for a fourth
 * level running (Rahman, 2026-10-22: a class keeps a teacher for at most three
 * full courses). The board shows each on the tile it concerns and nowhere else.
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
  | 'wechsel'
  | 'stunden'
  | 'serie';

export type Issue = {
  severity: IssueSeverity;
  code: IssueCode;
  groupId: string;
  /** Null for a per-week issue (`wechsel`). */
  onDate: string | null;
  weekStart: string;
  shift: Shift;
  teacherId: string | null;
  text: Bilingual;
  /** More than fits on a tile: shown where the issue is read in full (the piece's hover). */
  detail?: Bilingual;
};

export type Analysis = {
  issues: Issue[];
  /** Issues per `assignmentKey(groupId, date)`, for the tile. */
  byKey: Map<string, Issue[]>;
  /** weekStart → teacherId → dates assigned. */
  usage: Map<string, Map<string, Set<string>>>;
};

/** A weekday's English label for an issue's text; the German keeps the code. */
const dayEn = (dow: Weekday | null) => (dow ? WEEKDAY_LABELS[dow].en : '');

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
    /** The same, for days of a „Zusammenlegung": one teacher for two groups on purpose. */
    const mergedDay = new Map<string, number>();

    for (const group of ctx.groups) {
      const faces = new Set<string>();
      const base = { groupId: group.id, weekStart: week.start, shift: group.shift };

      for (const date of courseDays(group, week)) {
        const assignment = ctx.assignments.find((a) => a.groupId === group.id && a.onDate === date);
        if (!assignment) {
          push({ ...base, severity: 'open', code: 'offen', onDate: date, teacherId: null, text: { de: 'offen', en: 'open' } });
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
        if (assignment.merged) mergedDay.set(dayKey, (mergedDay.get(dayKey) ?? 0) + 1);

        const absence = absenceOn(ctx, assignment.teacherId, date);
        if (absence) {
          push({ ...base, severity: 'hard', code: 'abwesend', onDate: date, teacherId: assignment.teacherId, text: { de: `${absence.reason} · ${weekdayOf(date) ?? ''}`, en: `${ABSENCE_LABELS[absence.reason].en} · ${dayEn(weekdayOf(date))}` } });
        }
        const dow = weekdayOf(date);
        if (teacher && dow && !teacher.weekdays.includes(dow)) {
          push({ ...base, severity: 'hard', code: 'wochentag', onDate: date, teacherId: assignment.teacherId, text: { de: `arbeitet nicht am ${dow}`, en: `does not work on ${dayEn(dow)}` } });
        }
        if (teacher && !teacher.shifts.includes(group.shift) && !assignment.isSubstitute) {
          push({ ...base, severity: 'warn', code: 'schicht', onDate: date, teacherId: assignment.teacherId, text: { de: `sonst ${teacher.shifts.map((s) => SHIFT_INFO[s].label.de).join('/')}`, en: `usually ${teacher.shifts.map((s) => SHIFT_INFO[s].label.en.toLowerCase()).join('/')}` } });
        }
        if (teacher && !teacher.levels.includes(group.level)) {
          push({ ...base, severity: 'warn', code: 'niveau', onDate: date, teacherId: assignment.teacherId, text: { de: `${group.level} nicht hinterlegt`, en: `${group.level} not listed` } });
        }
        // The class's levels before this one, most recent first: three running with this teacher make a fourth too many.
        const before = ctx.history?.[group.id] ?? [];
        let run = 0;
        while (run < before.length && before[run].teachers.includes(assignment.teacherId)) run++;
        if (run >= 3) {
          const levels = before.slice(0, run).map((c) => c.level).reverse().join(' · ');
          push({ ...base, severity: 'warn', code: 'serie', onDate: date, teacherId: assignment.teacherId, text: { de: `${run + 1}. Niveau in Folge`, en: `${run + 1}th level running` }, detail: { de: `dieselbe Gruppe schon in ${levels}`, en: `the same class in ${levels} already` } });
        }
        void name;
      }

      if (faces.size > 2) {
        push({ ...base, severity: 'warn', code: 'wechsel', onDate: null, teacherId: null, text: { de: `${faces.size} Lehrkräfte in einer Woche`, en: `${faces.size} teachers in one week` } });
      }
    }

    for (const [dayKey, groupIds] of perDay) {
      // Groups taught together are one class that day: a double booking needs two that are not.
      if (groupIds.length - Math.max(0, (mergedDay.get(dayKey) ?? 0) - 1) < 2) continue;
      const [shift, date, teacherId] = dayKey.split('|');
      const name = teacherById(ctx, teacherId)?.shortName ?? '?';
      for (const groupId of groupIds) {
        push({ severity: 'hard', code: 'doppelt', groupId, onDate: date, weekStart: week.start, shift: shift as Shift, teacherId, text: { de: `${name} doppelt am ${weekdayOf(date) ?? ''}`, en: `${name} double-booked on ${dayEn(weekdayOf(date))}` } });
      }
    }

    // More teaching units than the contract holds: a warning, since a colleague may agree to more.
    for (const teacherId of weekUsage.keys()) {
      const units = teacherById(ctx, teacherId)?.weeklyUnits;
      const used = unitsUsed(ctx, teacherId, week.start);
      if (!units || used <= units) continue;
      for (const a of ctx.assignments) {
        if (a.teacherId !== teacherId || !weekUsage.get(teacherId)?.has(a.onDate)) continue;
        const group = ctx.groups.find((g) => g.id === a.groupId);
        if (!group) continue;
        push({ severity: 'warn', code: 'stunden', groupId: group.id, onDate: a.onDate, weekStart: week.start, shift: group.shift, teacherId, text: { de: `${used} von ${units} UE`, en: `${used} of ${units} units` } });
      }
    }

    for (const [teacherId, dates] of weekUsage) {
      const teacher = teacherById(ctx, teacherId);
      if (!teacher || dates.size <= teacher.daysPerWeek) continue;
      for (const a of ctx.assignments) {
        if (a.teacherId !== teacherId || !dates.has(a.onDate)) continue;
        const group = ctx.groups.find((g) => g.id === a.groupId);
        if (!group) continue;
        push({ severity: 'hard', code: 'kontingent', groupId: group.id, onDate: a.onDate, weekStart: week.start, shift: group.shift, teacherId, text: { de: `${dates.size} Tage statt ${teacher.daysPerWeek}`, en: `${dates.size} days instead of ${teacher.daysPerWeek}` } });
      }
    }
  }

  return { issues, byKey, usage };
}
