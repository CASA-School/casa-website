import 'server-only';

import { query, queryFirst } from './db';

/**
 * A colleague's working time over a year, for the tab „Stunden" on their page (Rahman, 2026-10-22: monthly
 * and annual hours, what is achieved, overtime and minus hours, at one look). The hours are SchoolMan's
 * time sheet as the bridge brings it (`staff_time_months`, `staff_time_years`, 0082); the teaching units
 * are the workspace's own lesson days against the contract's units a week. Seen with `staff_private`.
 */

export type TimeMonth = {
  /** `yyyy-mm`. */
  month: string;
  target: number | null;
  worked: number | null;
  /** The month's plus or minus hours. */
  balance: number | null;
  /** The balance carried to the month's end. */
  running: number | null;
  holidayLeft: number | null;
  approved: boolean;
  /**
   * Teaching units held that month (lesson days, not called off), and what the contract holds for it; none
   * for a month before the lesson days the workspace has (SchoolMan's from eight months back).
   */
  units: number | null;
  contractUnits: number | null;
};

export type StaffTime = {
  year: number;
  months: TimeMonth[];
  holidays: number | null;
  holidaysLeft: number | null;
  /** The year's balance as SchoolMan carries it. */
  running: number | null;
  weeklyHours: number | null;
  weeklyUnits: number | null;
  /** Whether SchoolMan's time sheet has anything for the year. */
  hasSheet: boolean;
  /** The years with a time sheet, for the year switch. */
  years: number[];
};

const n = (v: string | null) => (v === null ? null : Number(v));

export async function staffTime(staffId: string, year: number): Promise<StaffTime> {
  const [months, yearRow, units, contract, years, since] = await Promise.all([
    query<{ month: string; target_hours: string | null; worked_hours: string | null; balance_hours: string | null; running_hours: string | null; holiday_days_left: string | null; approved: boolean }>(
      `SELECT to_char(month, 'YYYY-MM') AS month, target_hours, worked_hours, balance_hours, running_hours, holiday_days_left, approved
         FROM staff_time_months WHERE staff_member_id = $1 AND extract(year FROM month) = $2 ORDER BY month`,
      [staffId, year]
    ),
    queryFirst<{ holiday_days: string | null; holiday_days_left: string | null; running_hours: string | null }>(
      `SELECT holiday_days, holiday_days_left, running_hours FROM staff_time_years WHERE staff_member_id = $1 AND year = $2`,
      [staffId, year]
    ),
    query<{ month: string; units: string }>(
      `SELECT to_char(date_trunc('month', d.on_date), 'YYYY-MM') AS month, sum(coalesce(t.lessons, 0)) AS units
         FROM course_days d JOIN course_day_times t ON t.id = d.id
        WHERE d.teacher_id = $1 AND NOT d.cancelled AND extract(year FROM d.on_date) = $2
        GROUP BY 1`,
      [staffId, year]
    ),
    // Each month's contract: the one running on its 15th; its units a week over the month's weekdays.
    query<{ month: string; weekly_hours: string | null; weekly_units: string | null; weekdays: number }>(
      `SELECT to_char(m, 'YYYY-MM') AS month, c.weekly_hours, c.weekly_units,
              (SELECT count(*)::int FROM generate_series(m, (m + interval '1 month' - interval '1 day')::date, interval '1 day') d
                WHERE extract(isodow FROM d) <= 5) AS weekdays
         FROM generate_series(make_date($2, 1, 1), make_date($2, 12, 1), interval '1 month') m
         LEFT JOIN LATERAL (
           SELECT weekly_hours, weekly_units FROM staff_contracts
            WHERE staff_member_id = $1 AND (valid_from IS NULL OR valid_from <= m::date + 14) AND (valid_to IS NULL OR valid_to >= m::date + 14)
            ORDER BY valid_from DESC NULLS LAST LIMIT 1
         ) c ON true`,
      [staffId, year]
    ),
    query<{ year: number }>(
      `SELECT DISTINCT extract(year FROM month)::int AS year FROM staff_time_months WHERE staff_member_id = $1 ORDER BY 1`,
      [staffId]
    ),
    // The first whole month the workspace has every lesson day for: the bridge reads the courses that ended
    // within the last 240 days (read_lesson_days.py), so a month before that holds only some of them.
    queryFirst<{ month: string | null }>(
      `SELECT to_char(greatest(date_trunc('month', min(on_date) + 6), date_trunc('month', current_date - 240) + interval '1 month'), 'YYYY-MM') AS month
         FROM course_days WHERE teacher_id IS NOT NULL`
    ),
  ]);
  const sheet = new Map(months.map((m) => [m.month, m]));
  const taught = new Map(units.map((u) => [u.month, Number(u.units)]));
  const known = (month: string) => since?.month != null && month >= since.month;
  const list: TimeMonth[] = contract.map((c) => {
    const m = sheet.get(c.month);
    const held = known(c.month);
    return {
      month: c.month,
      target: m ? n(m.target_hours) : null,
      worked: m ? n(m.worked_hours) : null,
      balance: m ? n(m.balance_hours) : null,
      running: m ? n(m.running_hours) : null,
      holidayLeft: m ? n(m.holiday_days_left) : null,
      approved: m?.approved ?? false,
      units: held ? (taught.get(c.month) ?? 0) : null,
      contractUnits: !held || c.weekly_units === null ? null : Math.round((Number(c.weekly_units) * c.weekdays) / 5),
    };
  });
  const latest = contract.filter((c) => c.weekly_hours !== null || c.weekly_units !== null).at(-1);
  return {
    year,
    months: list,
    holidays: n(yearRow?.holiday_days ?? null),
    holidaysLeft: n(yearRow?.holiday_days_left ?? null),
    running: n(yearRow?.running_hours ?? null),
    weeklyHours: latest?.weekly_hours ? Number(latest.weekly_hours) : null,
    weeklyUnits: latest?.weekly_units ? Number(latest.weekly_units) : null,
    hasSheet: months.length > 0 || Boolean(yearRow),
    years: years.map((y) => y.year),
  };
}
