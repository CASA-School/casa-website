-- The Tagesplan (Rahman, 2026-10-19): FileMaker's calendar — the screen the team opens first, Cmd+1 —
-- as a page of its own: the day's tasks, who is at reception and in the office, who is away, the
-- lessons by room and teacher, the birthdays (docs/ADMIN_WORKSPACE.md §Tagesplan).

-- The day's tasks, SchoolMan's „WorkFlow" on the calendar: shared by the whole team, on a day, with a
-- time if it has one, for a colleague if it is someone's, and where it stands — chosen, not typed
-- („erledigt" was a word in a text field). The day board's table (0012), which nothing uses since
-- the board was removed (2026-10-14), takes this shape; its rows stay: a title and its detail become
-- the text, one with `done_at` is done. Its areas go: SchoolMan's day has none.
ALTER TABLE day_tasks RENAME COLUMN title TO body;
ALTER TABLE day_tasks RENAME COLUMN assigned_to TO assignee_id;
ALTER TABLE day_tasks RENAME CONSTRAINT day_tasks_title_check TO day_tasks_body_check;
UPDATE day_tasks SET body = body || E'\n' || detail WHERE detail IS NOT NULL AND btrim(detail) <> '';
DROP INDEX IF EXISTS day_tasks_date_idx;
ALTER TABLE day_tasks DROP COLUMN IF EXISTS detail;
ALTER TABLE day_tasks DROP COLUMN IF EXISTS area;
ALTER TABLE day_tasks ALTER COLUMN on_date DROP DEFAULT;
ALTER TABLE day_tasks ADD COLUMN IF NOT EXISTS starts_at time;
ALTER TABLE day_tasks ADD COLUMN IF NOT EXISTS ends_at time;
ALTER TABLE day_tasks ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
/* Who wrote it in SchoolMan, for the tasks read across; a task written here has `created_by`. */
ALTER TABLE day_tasks ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE day_tasks ADD COLUMN IF NOT EXISTS filemaker_id text;
UPDATE day_tasks SET status = 'done' WHERE done_at IS NOT NULL;
ALTER TABLE day_tasks DROP CONSTRAINT IF EXISTS day_tasks_status_check;
ALTER TABLE day_tasks ADD CONSTRAINT day_tasks_status_check CHECK (status IN ('open', 'in_progress', 'done'));
ALTER TABLE day_tasks DROP CONSTRAINT IF EXISTS day_tasks_body_length_check;
ALTER TABLE day_tasks ADD CONSTRAINT day_tasks_body_length_check CHECK (length(body) <= 2000);
ALTER TABLE day_tasks DROP CONSTRAINT IF EXISTS day_tasks_hours_check;
ALTER TABLE day_tasks ADD CONSTRAINT day_tasks_hours_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at);
CREATE UNIQUE INDEX IF NOT EXISTS day_tasks_filemaker_key ON day_tasks (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS day_tasks_day_idx ON day_tasks (on_date, starts_at);
DROP INDEX IF EXISTS day_tasks_open_idx;
CREATE INDEX IF NOT EXISTS day_tasks_open_idx ON day_tasks (on_date) WHERE status <> 'done';

-- Where a colleague of the office works: at reception (front office) or in the office behind it
-- (back office). A teacher has neither. SchoolMan marks reception on the colleague (`_ID_ShiftReception`).
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS desk text;
ALTER TABLE staff_members DROP CONSTRAINT IF EXISTS staff_members_desk_check;
ALTER TABLE staff_members ADD CONSTRAINT staff_members_desk_check CHECK (desk IS NULL OR desk IN ('front', 'back'));

-- A colleague's usual week at the desk: per weekday (1 Monday … 7 Sunday) from when to when. Reception
-- works in standard shifts, so the day shows them by itself.
CREATE TABLE IF NOT EXISTS staff_shifts (
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  PRIMARY KEY (staff_member_id, weekday),
  CONSTRAINT staff_shifts_weekday_check CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT staff_shifts_hours_check CHECK (ends_at > starts_at)
);

-- A colleague's day in the office as it happened — when they came and when they went (SchoolMan's
-- „Oval Office", `SingleDayStaff.HourStart`/`HourEnd`). The office says it itself; reception's shift
-- stands for it until someone writes otherwise.
CREATE TABLE IF NOT EXISTS staff_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  on_date date NOT NULL,
  starts_at time NOT NULL,
  ends_at time,
  note text,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT staff_presence_day_key UNIQUE (staff_member_id, on_date),
  CONSTRAINT staff_presence_hours_check CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS staff_presence_date_idx ON staff_presence (on_date);
