-- Lesson days (Rahman, 2026-10-17; docs/ADMIN_WORKSPACE.md §Lesson days).
--
-- SchoolMan generates every lesson day of a course (`SingleDateCourse`) from its weekly plan (`WeekDay`:
-- each weekday's hours, lessons, teacher and room), and a day is where things change: another teacher
-- when someone is ill (962 of ~5,650 days in 2026 differ from the plan; 445 record who was replaced),
-- another room (most courses use 2–7 rooms over their run, in its room calendar `SingleDateOccupancy`).
--
-- Here one table holds every lesson day of every course, and Kursplanung's board is the planning view
-- of the intensive courses' days: what the board called an assignment (0014's `plan_assignments`) is a
-- lesson day with a teacher. A board group (month, shift, level, phase, group) belongs to a course — the
-- intensive start that month, or the one before for a second half — and its days are that course's.
-- Lesson content, homework and attendance stay the Klassenbuch's.

-- A course's weekly plan, per group: what its days are generated from.
CREATE TABLE IF NOT EXISTS course_week_plans (
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  group_index smallint NOT NULL DEFAULT 1,
  -- ISO weekday: 1 Monday … 7 Sunday.
  weekday smallint NOT NULL CONSTRAINT course_week_plans_weekday_check CHECK (weekday BETWEEN 1 AND 7),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  lessons numeric(4, 1) NOT NULL DEFAULT 0 CONSTRAINT course_week_plans_lessons_check CHECK (lessons >= 0),
  teacher_id uuid REFERENCES staff_members (id) ON DELETE SET NULL,
  room_id uuid REFERENCES rooms (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (course_id, group_index, weekday),
  CONSTRAINT course_week_plans_hours_check CHECK (ends_at > starts_at)
);

-- The board's groups name their course.
ALTER TABLE course_groups ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS course_groups_course_idx ON course_groups (course_id);

CREATE TABLE IF NOT EXISTS course_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The course and its group; a board group's day before its course is known has only the group.
  course_id uuid REFERENCES courses (id) ON DELETE CASCADE,
  group_index smallint NOT NULL DEFAULT 1,
  -- Set null when the board removes an empty group; a day of no course goes with it (`removeGroupIfEmpty`).
  group_id uuid REFERENCES course_groups (id) ON DELETE SET NULL,
  on_date date NOT NULL,
  -- Null: the course's hours and lessons.
  starts_at time,
  ends_at time,
  lessons numeric(4, 1) CONSTRAINT course_days_lessons_check CHECK (lessons IS NULL OR lessons >= 0),
  teacher_id uuid REFERENCES staff_members (id) ON DELETE RESTRICT,
  -- The board's marks: someone from the other shift or by hand (yellow), not yet confirmed (`?`).
  is_substitute boolean NOT NULL DEFAULT false,
  is_tentative boolean NOT NULL DEFAULT false,
  -- Who the plan had, when someone else teaches (SchoolMan's `_ID_PersonSubstituted`).
  replaced_teacher_id uuid REFERENCES staff_members (id) ON DELETE SET NULL,
  room_id uuid REFERENCES rooms (id) ON DELETE SET NULL,
  replaced_room_id uuid REFERENCES rooms (id) ON DELETE SET NULL,
  cancelled boolean NOT NULL DEFAULT false,
  cancel_reason text,
  note text,
  filemaker_id text UNIQUE,
  changed_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT course_days_owner_check CHECK (course_id IS NOT NULL OR group_id IS NOT NULL),
  CONSTRAINT course_days_hours_check CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS course_days_course_key ON course_days (course_id, group_index, on_date) WHERE course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS course_days_group_key ON course_days (group_id, on_date) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_days_date_idx ON course_days (on_date);
CREATE INDEX IF NOT EXISTS course_days_teacher_idx ON course_days (teacher_id, on_date);
CREATE INDEX IF NOT EXISTS course_days_room_idx ON course_days (room_id, on_date);

-- Each board group's course: the intensive start opening the month (phase 1) or the month before
-- (phase 2) — `kursplanung/course-link.ts` — in the group's shift, at the level's first half. Run after
-- the board makes groups, and after courses are made.
CREATE OR REPLACE FUNCTION link_course_groups() RETURNS void
LANGUAGE sql AS $$
  UPDATE course_groups g SET course_id = c.id
    FROM courses c
    JOIN course_instances i ON i.id = c.course_instance_id
    JOIN course_types t ON t.id = i.course_type_id
   WHERE g.course_id IS NULL
     AND t.format = 'intensive' AND i.status <> 'cancelled' AND c.status <> 'cancelled'
     AND c.level_code = g.level || '.1'
     AND date_trunc('month', i.start_date + 14)::date = CASE WHEN g.phase = '1' THEN g.month ELSE (g.month - interval '1 month')::date END
     AND coalesce(
           CASE WHEN i.session IN ('morning', 'afternoon') THEN i.session END,
           CASE WHEN substring(i.schedule->>'time' from '^\d{1,2}')::int < 12 THEN 'morning'
                WHEN substring(i.schedule->>'time' from '^\d{1,2}')::int < 17 THEN 'afternoon' END,
           g.shift) = g.shift;
$$;

SELECT link_course_groups();

-- The board's assignments become lesson days with a teacher.
DO $$
BEGIN
  IF to_regclass('plan_assignments') IS NOT NULL THEN
    INSERT INTO course_days (course_id, group_index, group_id, on_date, teacher_id, is_substitute, is_tentative, changed_by, updated_at)
    SELECT g.course_id, g.group_index, a.group_id, a.on_date, a.teacher_id, a.is_substitute, a.is_tentative, a.changed_by, a.updated_at
      FROM plan_assignments a JOIN course_groups g ON g.id = a.group_id
    ON CONFLICT DO NOTHING;
    DROP TABLE plan_assignments;
  END IF;
END $$;

-- A planning month's first Monday — `kursplanung/weeks.ts` `monthStart`: the Monday of the week the 1st
-- falls in, or the following Monday when the 1st is a weekend day.
CREATE OR REPLACE FUNCTION planning_month_start(month date) RETURNS date
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE extract(isodow FROM date_trunc('month', month)::date)
           WHEN 6 THEN date_trunc('month', month)::date + 2
           WHEN 7 THEN date_trunc('month', month)::date + 1
           ELSE date_trunc('month', month)::date - (extract(isodow FROM date_trunc('month', month)::date)::int - 1)
         END
$$;

-- Keeps the two keys of a day together: a course's day in a board group's month gets the group, and a
-- board day gets its group's course once the group has one. Run after anything makes days or groups.
CREATE OR REPLACE FUNCTION link_course_days() RETURNS void
LANGUAGE sql AS $$
  UPDATE course_days d SET group_id = g.id
    FROM course_groups g
   WHERE d.group_id IS NULL AND d.course_id IS NOT NULL
     AND g.course_id = d.course_id AND g.group_index = d.group_index
     AND d.on_date >= planning_month_start(g.month)
     AND d.on_date < planning_month_start((g.month + interval '1 month')::date)
     AND NOT EXISTS (SELECT 1 FROM course_days o WHERE o.group_id = g.id AND o.on_date = d.on_date);
  UPDATE course_days d SET course_id = g.course_id, group_index = g.group_index
    FROM course_groups g
   WHERE d.group_id = g.id AND d.course_id IS NULL AND g.course_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM course_days o WHERE o.course_id = g.course_id AND o.group_index = g.group_index AND o.on_date = d.on_date);
$$;

SELECT link_course_days();
