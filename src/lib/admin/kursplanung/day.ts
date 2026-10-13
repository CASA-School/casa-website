import 'server-only';

import { query } from '../db';

import { loadPlan } from './repo';
import { analysePlan } from './rules';
import { planMonthOf } from './weeks';

/**
 * One day of teaching, for Today: who is away, and what the plan still lacks
 * — FileMaker's home calendar lit "VacantTeacher" and "ConflictTeacher" up on
 * the day they applied, and so does this. The board's own rules decide
 * (`analysePlan`), so Today and the board never disagree.
 */

export type TeachingDay = {
  /** The planning month the day belongs to, `YYYY-MM`, for the link into the board. */
  month: string;
  away: { name: string; reason: string }[];
  /** Course days nobody is planned for. */
  open: number;
  /** Someone planned while away, twice at once, on a day they do not work, or over their contract. */
  conflicts: number;
};

/**
 * The teaching of each of `dates` (a week): the plan of every planning month
 * they touch is read once and analysed once.
 */
export async function teachingOn(dates: readonly string[]): Promise<Map<string, TeachingDay>> {
  const months = [...new Set(dates.map(planMonthOf))];
  const [plans, away] = await Promise.all([
    Promise.all(months.map(async (month) => [month, await loadPlan(month)] as const)),
    query<{ on_date: string; name: string; reason: string }>(
      `SELECT to_char(a.on_date, 'YYYY-MM-DD') AS on_date, t.short_name AS name, a.reason
         FROM teacher_absences a JOIN teachers t ON t.id = a.teacher_id
        WHERE a.on_date = ANY($1::date[])
        ORDER BY t.short_name`,
      [dates]
    ),
  ]);
  const issues = new Map(plans.map(([month, plan]) => [month, plan.groups.length ? analysePlan(plan).issues : []]));

  return new Map(
    dates.map((date) => {
      const month = planMonthOf(date);
      const onDay = (issues.get(month) ?? []).filter((i) => i.onDate === date);
      return [
        date,
        {
          month,
          away: away.filter((a) => a.on_date === date).map(({ name, reason }) => ({ name, reason })),
          open: onDay.filter((i) => i.code === 'offen').length,
          conflicts: new Set(onDay.filter((i) => i.severity === 'hard').map((i) => `${i.groupId}|${i.code}`)).size,
        },
      ];
    })
  );
}
