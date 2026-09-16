import { assignmentAt, courseDays, fit, halfOf, type PlanContext } from './fit';
import type { Assignment, CourseGroup } from './types';

/**
 * Filling the month from the pairs.
 *
 * A course's two regular teachers hold its two halves of the week. Laying them
 * down for every week is the monthly set-up in one move; anything that does
 * not fit — an absence, a weekday the person does not work, a day already
 * planned — is simply left open for the board to show.
 */
export function assignmentsFromPairs(ctx: PlanContext, groups?: readonly CourseGroup[]): Assignment[] {
  const out: Assignment[] = [];
  const seen = new Set<string>();

  for (const week of ctx.weeks) {
    for (const group of groups ?? ctx.groups) {
      for (const date of courseDays(group, week)) {
        const teacherId = halfOf(group, date) === 0 ? group.teacherFirst : group.teacherSecond;
        if (!teacherId) continue;
        if (assignmentAt(ctx, group.id, date)) continue;
        const key = `${group.id}|${date}`;
        if (seen.has(key)) continue;

        // Fit against the plan as it grows, so a teacher is not laid on two
        // courses of one shift on the same day by their own pairs.
        const grown: PlanContext = { ...ctx, assignments: [...ctx.assignments, ...out] };
        if (!fit(grown, teacherId, group, date).ok) continue;

        out.push({ groupId: group.id, onDate: date, teacherId, isSubstitute: false, isTentative: false });
        seen.add(key);
      }
    }
  }
  return out;
}
