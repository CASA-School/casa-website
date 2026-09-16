-- 0014 — Kursplanung: who teaches which course on which day.
--
-- CASA plans its intensive courses in a spreadsheet: a column per course
-- group, a row per weekday, a first name in each cell. Course starts alternate
-- between the morning and the afternoon shift every month, and a full-time
-- teacher is split across two courses like a puzzle piece — Mo–Mi here, Do–Fr
-- there. The pain is not the monthly plan but the daily change: someone falls
-- ill, someone is on leave, and the person covering must not already be
-- teaching, must not exceed their weekly days, and should keep the course
-- with its own teachers wherever possible.
--
-- Four tables, no workflow. A teacher's RULES (shift, days per week, weekdays,
-- levels) are the shape of their piece; a course group's PAIR is who normally
-- holds it; an assignment is one teacher on one course on one date; an absence
-- is one teacher on one date. Rules and absences are what the board checks.
-- The audit trail is `staff_activity`, as everywhere else in the workspace.
--
-- `teachers` is the school's teaching staff, which is a different set from
-- `staff_users` (the people who sign in here). A teacher may never open the
-- workspace, and an administrator may never teach.
--
-- The FileMaker columns are the bridge's anchors (docs/FILEMAKER_BRIDGE.md):
-- `filemaker_course_id` is `Course.__ID_Course`, which the catalogue also
-- needs (§7 item 6); nothing writes back to FileMaker yet.

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The name on the board, as the planners write it: 'Claudia G', 'Tanja L'.
  short_name text NOT NULL UNIQUE
    CONSTRAINT teachers_short_name_check CHECK (btrim(short_name) <> ''),
  full_name text NOT NULL
    CONSTRAINT teachers_full_name_check CHECK (btrim(full_name) <> ''),
  contract text NOT NULL DEFAULT 'employed'
    CONSTRAINT teachers_contract_check CHECK (contract IN ('employed', 'freelance')),
  -- Which shift(s) the person normally teaches. Placing them in the other one
  -- is allowed and marked as a substitution on the board.
  shifts text[] NOT NULL DEFAULT ARRAY['morning']
    CONSTRAINT teachers_shifts_check CHECK (
      cardinality(shifts) BETWEEN 1 AND 2 AND shifts <@ ARRAY['morning', 'afternoon']
    ),
  -- The length of the piece: how many days a week the contract allows.
  days_per_week smallint NOT NULL DEFAULT 5
    CONSTRAINT teachers_days_per_week_check CHECK (days_per_week BETWEEN 1 AND 5),
  -- Which weekdays are possible at all (some people never work Fridays).
  weekdays text[] NOT NULL DEFAULT ARRAY['Mo', 'Di', 'Mi', 'Do', 'Fr']
    CONSTRAINT teachers_weekdays_check CHECK (
      cardinality(weekdays) >= 1 AND weekdays <@ ARRAY['Mo', 'Di', 'Mi', 'Do', 'Fr']
    ),
  -- The colours of the piece: which course levels the person may take.
  levels text[] NOT NULL DEFAULT ARRAY[]::text[]
    CONSTRAINT teachers_levels_check CHECK (
      levels <@ ARRAY['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C1H']
    ),
  note text,
  filemaker_staff_id text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS course_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The planning month, stored as its first day. The board derives the four
  -- (sometimes five) planning weeks from it.
  month date NOT NULL
    CONSTRAINT course_groups_month_check CHECK (month = date_trunc('month', month)::date),
  shift text NOT NULL
    CONSTRAINT course_groups_shift_check CHECK (shift IN ('morning', 'afternoon')),
  level text NOT NULL
    CONSTRAINT course_groups_level_check CHECK (level IN ('A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C1H')),
  -- '1' = the course starts this month, '2' = its second month. Which shift
  -- carries the starts alternates from month to month.
  phase text NOT NULL
    CONSTRAINT course_groups_phase_check CHECK (phase IN ('1', '2')),
  -- Parallel groups of one level are numbered; the number is a planning
  -- result of the registration count, not a fixed property of the course.
  group_index smallint NOT NULL DEFAULT 1
    CONSTRAINT course_groups_index_check CHECK (group_index BETWEEN 1 AND 9),
  registrations smallint NOT NULL DEFAULT 0
    CONSTRAINT course_groups_registrations_check CHECK (registrations >= 0),
  -- The pair that normally holds the course: first half of the week (Mo–Mi in
  -- the morning, Mo–Di in the afternoon) and second half. The board offers
  -- them first and fills the month from them.
  teacher_first uuid REFERENCES teachers (id) ON DELETE SET NULL,
  teacher_second uuid REFERENCES teachers (id) ON DELETE SET NULL,
  room_id uuid REFERENCES rooms (id) ON DELETE SET NULL,
  filemaker_course_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (month, shift, level, phase, group_index)
);

CREATE INDEX IF NOT EXISTS course_groups_month_idx ON course_groups (month, shift);

CREATE TABLE IF NOT EXISTS plan_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES course_groups (id) ON DELETE CASCADE,
  -- The concrete day, not "week 3, Wednesday": the same fact FileMaker keeps
  -- per date, and what an absence is compared against.
  on_date date NOT NULL,
  teacher_id uuid NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
  -- Yellow on the board: this person is standing in, not the course's own.
  is_substitute boolean NOT NULL DEFAULT false,
  -- A question mark on the board: planned, not yet confirmed by the person.
  is_tentative boolean NOT NULL DEFAULT false,
  changed_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (group_id, on_date)
);

CREATE INDEX IF NOT EXISTS plan_assignments_teacher_date_idx ON plan_assignments (teacher_id, on_date);
CREATE INDEX IF NOT EXISTS plan_assignments_date_idx ON plan_assignments (on_date);

CREATE TABLE IF NOT EXISTS teacher_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers (id) ON DELETE CASCADE,
  on_date date NOT NULL,
  reason text NOT NULL DEFAULT 'Urlaub'
    CONSTRAINT teacher_absences_reason_check CHECK (
      reason IN ('Urlaub', 'Krank', 'Fortbildung', 'Freistellung', 'Elternzeit', 'Sonstiges')
    ),
  -- The FileMaker row this came from, when it came from there; null when a
  -- planner entered it here.
  filemaker_ref text,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (teacher_id, on_date)
);

CREATE INDEX IF NOT EXISTS teacher_absences_date_idx ON teacher_absences (on_date);
