-- 0082 — A colleague's working time, as SchoolMan keeps it (2026-10-22).
--
-- Rahman: „a tab on the colleague's page with their monthly hours, the year's, how much is achieved,
-- what is overtime and what are minus hours — so management understands it at one look." SchoolMan
-- keeps the time sheet per colleague and month (`SingleMonthStaff`: the month's balance, the balance
-- carried to its end, the holidays left, whether it was approved) and per year (`SingleYearStaff`: the
-- holiday days, those left, the year's balance), and the hours per day (`SingleDayStaff`), from which the
-- bridge sums each month's target and worked hours. Read-only, by the bridge (`read_time.py`); finance
-- keeps working in SchoolMan until working time moves. Seen with the module `staff_private`.

CREATE TABLE IF NOT EXISTS staff_time_months (
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  month date NOT NULL CHECK (month = date_trunc('month', month)::date),
  target_hours numeric(7, 2),
  worked_hours numeric(7, 2),
  balance_hours numeric(7, 2),
  running_hours numeric(8, 2),
  holiday_days_left numeric(5, 1),
  approved boolean NOT NULL DEFAULT false,
  filemaker_ref text UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (staff_member_id, month)
);

CREATE TABLE IF NOT EXISTS staff_time_years (
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  holiday_days numeric(5, 1),
  holiday_days_left numeric(5, 1),
  running_hours numeric(8, 2),
  filemaker_ref text UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (staff_member_id, year)
);
