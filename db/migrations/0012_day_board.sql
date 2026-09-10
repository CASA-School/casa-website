-- 0012 — the day board.
--
-- The administration team's daily surface. FileMaker's home screen is a
-- day-by-day operations calendar (`SingleDayCalendar_Overview`), and the team
-- opens it every morning; this is the workspace's equivalent, with the one
-- thing that screen cannot do — anyone writing down what needs doing today.
--
-- Five or six colleagues share the work with divided responsibilities: one
-- registers a student, another completes the payment, another writes a
-- comment. So a task carries an OWNER (nullable — "anyone") and an AREA, and
-- the board can be read either as "the day" or as "what is mine".
--
-- One table on purpose. A task is not a workflow: no stages, no dependencies,
-- no recurrence. Done is a timestamp and a name, so the board answers "who
-- finished it" without a second table (docs/FILEMAKER_LESSONS.md §8).

CREATE TABLE IF NOT EXISTS day_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The day it belongs to. Carried forward by the screen, never by a job:
  -- an unfinished task stays on its date and is listed as overdue.
  on_date date NOT NULL DEFAULT current_date,
  title text NOT NULL CONSTRAINT day_tasks_title_check CHECK (btrim(title) <> ''),
  detail text,
  -- Which part of the operation, so the board separates by colour and a
  -- colleague can read only their own area.
  area text NOT NULL DEFAULT 'other'
    CONSTRAINT day_tasks_area_check CHECK (area IN (
      'students', 'courses', 'accommodation', 'exams', 'finance', 'other'
    )),
  -- Null means anyone on the team.
  assigned_to uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  done_at timestamptz,
  done_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS day_tasks_date_idx ON day_tasks (on_date, area);
CREATE INDEX IF NOT EXISTS day_tasks_open_idx
  ON day_tasks (on_date) WHERE done_at IS NULL;
CREATE INDEX IF NOT EXISTS day_tasks_assignee_idx
  ON day_tasks (assigned_to) WHERE done_at IS NULL;

DROP TRIGGER IF EXISTS day_tasks_set_updated_at ON day_tasks;
CREATE TRIGGER day_tasks_set_updated_at
  BEFORE UPDATE ON day_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
