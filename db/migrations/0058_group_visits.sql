-- Group visits: a school class, a company's team or an agency's group that comes to CASA together
-- (2026-10-18; docs/ADMIN_WORKSPACE.md §Groups, docs/schoolman/groups.md). SchoolMan keeps them in
-- `Group` (52 since 2022): a title, the company or agency, how many learners and escorts, their ages,
-- the level, where they come from, when they stay and when they have lessons, how they arrive, and
-- whether it is on (`_ID_StatusGroup`: ja, nein, u.B.). The participants are learners with their own
-- bookings, and a group with its own class has its own courses; both point at the visit.
CREATE TABLE IF NOT EXISTS group_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  /* open: asked, not yet decided (SchoolMan's u.B.); confirmed: it takes place (ja); cancelled: it
     does not (nein). Whether a confirmed visit is over is read from its dates, never stored. */
  status text NOT NULL DEFAULT 'open',
  /* Who comes: the school or company. Through whom, when an agency books it. */
  organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  agency_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  course_type_id uuid REFERENCES course_types (id) ON DELETE SET NULL,
  /* The band the group is taught at, as a course's. */
  level text,
  country_code text REFERENCES countries (code) ON DELETE SET NULL,
  participants integer,
  escorts integer,
  age_from smallint,
  age_to smallint,
  /* The stay, and the lessons within it. */
  arrival date,
  departure date,
  course_from date,
  course_to date,
  /* How and when they arrive and leave: a flight, a train, a meeting point. */
  travel_note text,
  note text,
  filemaker_group_id text,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT group_visits_status_check CHECK (status IN ('open', 'confirmed', 'cancelled')),
  CONSTRAINT group_visits_level_check CHECK (level IS NULL OR level IN ('A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2')),
  CONSTRAINT group_visits_people_check CHECK ((participants IS NULL OR participants >= 0) AND (escorts IS NULL OR escorts >= 0)),
  CONSTRAINT group_visits_ages_check CHECK (
    (age_from IS NULL OR age_from BETWEEN 0 AND 99) AND (age_to IS NULL OR age_to BETWEEN 0 AND 99)
    AND (age_from IS NULL OR age_to IS NULL OR age_to >= age_from)
  ),
  CONSTRAINT group_visits_stay_check CHECK (arrival IS NULL OR departure IS NULL OR departure >= arrival),
  CONSTRAINT group_visits_course_check CHECK (course_from IS NULL OR course_to IS NULL OR course_to >= course_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS group_visits_filemaker_key ON group_visits (filemaker_group_id) WHERE filemaker_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS group_visits_organisation_idx ON group_visits (organisation_id) WHERE organisation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS group_visits_agency_idx ON group_visits (agency_id) WHERE agency_id IS NOT NULL;

-- A participant's booking, and a course the group has to itself.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_visit_id uuid REFERENCES group_visits (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bookings_group_visit_idx ON bookings (group_visit_id) WHERE group_visit_id IS NOT NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS group_visit_id uuid REFERENCES group_visits (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS courses_group_visit_idx ON courses (group_visit_id) WHERE group_visit_id IS NOT NULL;

-- Notes on a visit, SchoolMan's comments about it among them.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (
  entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person', 'offer', 'group_visit'])
);
