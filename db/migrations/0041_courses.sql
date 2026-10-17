-- Courses as SchoolMan has them (Rahman, 2026-10-17; docs/ADMIN_WORKSPACE.md §Courses).
--
-- A course is one level of a start: „B1 · Intensiv · Vormittag · ab 26. Okt." — or one module, one
-- exam preparation, one group's or one company's course. SchoolMan's `Course` is exactly that, with
-- its teacher, room, places, whether it can be booked, its lessons and, for an evening or a special
-- course, its price; a booking sits on one course. The start (`course_instances`) stays what the
-- website shows: a course type's dates and hours, its courses under it.
--
-- `courses` takes over `course_level_places` (0031): the places of a start's level were already a
-- course in all but name. A booked period and a waiting-list place now name their course; their
-- `level_code` stays the learner's own step — a learner joining B1 in its second half sits on the
-- running B1 course at B1.2, as in SchoolMan.

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_instance_id uuid NOT NULL REFERENCES course_instances (id) ON DELETE CASCADE,
  -- The step the course starts at (an intensive course runs it and its second half); none for a module.
  level_code text REFERENCES levels (code),
  -- A module's, an exam preparation's, a group's or a company's course: its own name.
  title text,
  -- Morning, afternoon or evening when it differs from its start's hours.
  session text CONSTRAINT courses_session_check CHECK (session IN ('morning', 'afternoon', 'evening')),
  room_id uuid REFERENCES rooms (id) ON DELETE SET NULL,
  groups smallint NOT NULL DEFAULT 1 CONSTRAINT courses_groups_check CHECK (groups BETWEEN 0 AND 9),
  places_per_group smallint NOT NULL DEFAULT 14 CONSTRAINT courses_places_check CHECK (places_per_group BETWEEN 1 AND 40),
  -- Offered for booking (SchoolMan's `_ID_Bookable`); a course can exist before it is.
  bookable boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'scheduled' CONSTRAINT courses_status_check CHECK (status IN ('scheduled', 'cancelled')),
  -- An evening or special course's own price and lessons; otherwise the price list and the start.
  price numeric(10, 2) CONSTRAINT courses_price_check CHECK (price IS NULL OR price >= 0),
  lessons integer CONSTRAINT courses_lessons_check CHECK (lessons IS NULL OR lessons >= 0),
  -- A group's or a company's own course.
  organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  filemaker_course_id text UNIQUE,
  note text,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- One course per start and level; a second group of a level is `groups`, not another course.
CREATE UNIQUE INDEX IF NOT EXISTS courses_start_level_key ON courses (course_instance_id, level_code) WHERE level_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS courses_start_idx ON courses (course_instance_id);

ALTER TABLE booking_periods ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS booking_periods_course_idx ON booking_periods (course_id);
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS waitlist_entries_course_queue_idx ON waitlist_entries (course_id, rank) WHERE status IN ('waiting', 'offered');

-- Every start's level that has places, a booking or a queue becomes its course.
DO $$
BEGIN
  IF to_regclass('course_level_places') IS NOT NULL THEN
    INSERT INTO courses (course_instance_id, level_code, groups, places_per_group, updated_by, updated_at)
    SELECT course_instance_id, level_code, groups, places_per_group, updated_by, updated_at FROM course_level_places
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

INSERT INTO courses (course_instance_id, level_code)
SELECT DISTINCT course_instance_id, level_code FROM booking_periods WHERE course_instance_id IS NOT NULL AND level_code IS NOT NULL
UNION
SELECT DISTINCT course_instance_id, level_code FROM waitlist_entries WHERE course_instance_id IS NOT NULL AND level_code IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE booking_periods bp SET course_id = c.id
  FROM courses c WHERE bp.course_id IS NULL AND c.course_instance_id = bp.course_instance_id AND c.level_code = bp.level_code;
UPDATE waitlist_entries w SET course_id = c.id
  FROM courses c WHERE w.course_id IS NULL AND c.course_instance_id = w.course_instance_id AND c.level_code = w.level_code;

DROP TABLE IF EXISTS course_level_places;
