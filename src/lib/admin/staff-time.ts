import 'server-only';

import { berlinDay } from './days';
import { query, queryFirst } from './db';
import type { LeaveKind } from './staff-labels';

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
  /**
   * The month's plus or minus hours — only once the month is over: SchoolMan makes the year's time sheets
   * ahead, and a month not yet over carries its whole target as minus hours (Rahman, 2026-10-22: „it shows
   * minus while I should have plus").
   */
  balance: number | null;
  /** The balance carried to the month's end. */
  running: number | null;
  holidayLeft: number | null;
  approved: boolean;
  /** The month is not over yet: the current one or one ahead; its sheet's figures are left out. */
  open: boolean;
  /**
   * Teaching units held that month (lesson days, not called off), and what the contract holds for it; none
   * for a month before the lesson days the workspace has (SchoolMan's from eight months back).
   */
  units: number | null;
  contractUnits: number | null;
  /** The day the month was approved (0092). */
  approvedOn: string | null;
  /** Hours worked outside the lessons (`staff_work_entries`, 0092): the hours, else the time from–to. */
  otherWork: number | null;
};

/** A leave request (0092): its kind, from–to, its working days and how many of them are approved. */
export type LeaveRequest = {
  id: string;
  kind: LeaveKind | null;
  from: string;
  to: string;
  days: number;
  approved: number;
  note: string | null;
};

export type StaffTime = {
  year: number;
  months: TimeMonth[];
  holidays: number | null;
  holidaysLeft: number | null;
  /** The hours carried into the year (0092). */
  carried: number | null;
  weeklyHours: number | null;
  weeklyUnits: number | null;
  /** The leave requests that fall in the year. */
  leave: LeaveRequest[];
  /** Whether SchoolMan's time sheet has anything for the year. */
  hasSheet: boolean;
  /** The years with a time sheet, for the year switch. */
  years: number[];
};

const n = (v: string | null) => (v === null ? null : Number(v));

export async function staffTime(staffId: string, year: number): Promise<StaffTime> {
  const [months, yearRow, units, contract, years, since, other, leave] = await Promise.all([
    query<{
      month: string;
      target_hours: string | null;
      worked_hours: string | null;
      balance_hours: string | null;
      running_hours: string | null;
      holiday_days_left: string | null;
      approved: boolean;
      approved_on: string | null;
    }>(
      `SELECT to_char(month, 'YYYY-MM') AS month, target_hours, worked_hours, balance_hours, running_hours, holiday_days_left, approved,
              to_char(approved_on, 'YYYY-MM-DD') AS approved_on
         FROM staff_time_months WHERE staff_member_id = $1 AND extract(year FROM month) = $2 ORDER BY month`,
      [staffId, year]
    ),
    queryFirst<{ holiday_days: string | null; holiday_days_left: string | null; carried_hours: string | null }>(
      `SELECT holiday_days, holiday_days_left, carried_hours FROM staff_time_years WHERE staff_member_id = $1 AND year = $2`,
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
    // Per month: hours worked outside the lessons (the hours, else the time from–to).
    query<{ month: string; other: string | null }>(
      `SELECT to_char(on_date, 'YYYY-MM') AS month, sum(coalesce(hours, extract(epoch FROM (ends_at - starts_at)) / 3600)) AS other
         FROM staff_work_entries WHERE staff_member_id = $1 AND extract(year FROM on_date) = $2
        GROUP BY 1`,
      [staffId, year]
    ),
    query<{ id: string; kind: LeaveKind | null; starts_on: string; ends_on: string; days: number; approved: number; note: string | null }>(
      `SELECT id, kind, to_char(starts_on, 'YYYY-MM-DD') AS starts_on, to_char(ends_on, 'YYYY-MM-DD') AS ends_on,
              cardinality(days) AS days, cardinality(approved_days) AS approved, note
         FROM staff_leave_requests
        WHERE staff_member_id = $1 AND starts_on <= make_date($2, 12, 31) AND ends_on >= make_date($2, 1, 1)
        ORDER BY starts_on, ends_on`,
      [staffId, year]
    ),
  ]);
  const extra = new Map(other.map((o) => [o.month, o]));
  const sheet = new Map(months.map((m) => [m.month, m]));
  const taught = new Map(units.map((u) => [u.month, Number(u.units)]));
  const known = (month: string) => since?.month != null && month >= since.month;
  const current = berlinDay(new Date()).slice(0, 7);
  const list: TimeMonth[] = contract.map((c) => {
    const open = c.month >= current;
    const m = open ? undefined : sheet.get(c.month);
    const held = known(c.month);
    return {
      month: c.month,
      target: m ? n(m.target_hours) : null,
      worked: m ? n(m.worked_hours) : null,
      balance: m ? n(m.balance_hours) : null,
      running: m ? n(m.running_hours) : null,
      holidayLeft: m ? n(m.holiday_days_left) : null,
      approved: m?.approved ?? false,
      open,
      units: held ? (taught.get(c.month) ?? 0) : null,
      contractUnits: !held || c.weekly_units === null ? null : Math.round((Number(c.weekly_units) * c.weekdays) / 5),
      approvedOn: m?.approved_on ?? null,
      otherWork: rounded(extra.get(c.month)?.other ?? null),
    };
  });
  const latest = contract.filter((c) => c.weekly_hours !== null || c.weekly_units !== null).at(-1);
  return {
    year,
    months: list,
    holidays: n(yearRow?.holiday_days ?? null),
    holidaysLeft: n(yearRow?.holiday_days_left ?? null),
    carried: n(yearRow?.carried_hours ?? null),
    weeklyHours: latest?.weekly_hours ? Number(latest.weekly_hours) : null,
    weeklyUnits: latest?.weekly_units ? Number(latest.weekly_units) : null,
    leave: leave.map((r) => ({ id: r.id, kind: r.kind, from: r.starts_on, to: r.ends_on, days: r.days, approved: r.approved, note: r.note })),
    hasSheet: months.length > 0 || Boolean(yearRow),
    years: years.map((y) => y.year),
  };
}

const rounded = (v: string | null) => (v === null ? null : Math.round(Number(v) * 100) / 100);

/** A colleague's target week (0092, SchoolMan's `WeekDayWorkTime`): the period running today, else the latest. */
export type TargetWeek = {
  from: string | null;
  to: string | null;
  days: { weekday: number; hours: number | null; start: string | null; end: string | null }[];
  /** Whether they keep a time sheet (`StaffMember._ID_TimeSheet`); null when SchoolMan does not say. */
  keepsTimeSheet: boolean | null;
};

export async function staffTargetWeek(staffId: string): Promise<TargetWeek | null> {
  const [days, member] = await Promise.all([
    query<{ valid_from: string | null; valid_to: string | null; weekday: number; hours: string | null; starts_at: string | null; ends_at: string | null }>(
      `WITH period AS (
         SELECT valid_from, valid_to FROM staff_target_days
          WHERE staff_member_id = $1
          ORDER BY (coalesce(valid_from, '-infinity') <= current_date AND coalesce(valid_to, 'infinity') >= current_date) DESC, valid_from DESC NULLS LAST
          LIMIT 1
       )
       SELECT to_char(d.valid_from, 'YYYY-MM-DD') AS valid_from, to_char(d.valid_to, 'YYYY-MM-DD') AS valid_to, d.weekday, d.hours,
              to_char(d.starts_at, 'HH24:MI') AS starts_at, to_char(d.ends_at, 'HH24:MI') AS ends_at
         FROM staff_target_days d JOIN period p ON p.valid_from IS NOT DISTINCT FROM d.valid_from AND p.valid_to IS NOT DISTINCT FROM d.valid_to
        WHERE d.staff_member_id = $1
        ORDER BY d.weekday`,
      [staffId]
    ),
    queryFirst<{ keeps_time_sheet: boolean | null }>(`SELECT keeps_time_sheet FROM staff_members WHERE id = $1`, [staffId]),
  ]);
  if (!days.length && member?.keeps_time_sheet == null) return null;
  return {
    from: days[0]?.valid_from ?? null,
    to: days[0]?.valid_to ?? null,
    days: days.map((d) => ({ weekday: d.weekday, hours: n(d.hours), start: d.starts_at, end: d.ends_at })),
    keepsTimeSheet: member?.keeps_time_sheet ?? null,
  };
}
