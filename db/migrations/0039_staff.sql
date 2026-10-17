-- Everyone who works at CASA (Rahman, 2026-10-17: "build courses and staff so we could assign
-- teachers to courses … understand how staff in FileMaker is and create that data in our own system,
-- a better and much cleaner version"; docs/ADMIN_WORKSPACE.md §Staff).
--
-- SchoolMan spreads one colleague over `Person`, `Management`, `StaffMember`, a second identity
-- `StaffSchool` and `Hades` for those who left; keeps roles, levels and course types as lists in one
-- field; has no employment dates (contract periods carry them, or nothing does); and copies a
-- teacher four times down to the lesson. Here:
--
--   people           the person — name, contact, address, the HR numbers (`person_private`), the bank
--   staff_members    their place at CASA: the name on the board, the teaching rules Kursplanung reads,
--                    the workspace account if they sign in, active or left (Kursplanung's `teachers`)
--   staff_member_roles  what they do, one row per role — teaching is one role among sixteen
--   staff_contracts  the contract periods: kind, from–until, weekly hours and teaching units
--   staff_absences   a day away, for anyone (Kursplanung's `teacher_absences`)
--
-- Who teaches which group on which day stays Kursplanung's (`course_groups`, `plan_assignments`).

ALTER TABLE teachers RENAME TO staff_members;
ALTER TABLE teacher_absences RENAME TO staff_absences;
ALTER TABLE staff_absences RENAME COLUMN teacher_id TO staff_member_id;

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS staff_user_id uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;

-- Each colleague so far gets the person their name says: the first names, and the last word as the
-- surname — to be corrected on their page where it is wrong.
DO $$
DECLARE
  r record;
  pid uuid;
BEGIN
  FOR r IN SELECT id, btrim(full_name) AS name FROM staff_members WHERE person_id IS NULL LOOP
    INSERT INTO people (first_name, last_name, created_by)
    VALUES (
      CASE WHEN r.name ~ '\s' THEN regexp_replace(r.name, '\s+\S+$', '') ELSE r.name END,
      CASE WHEN r.name ~ '\s' THEN regexp_replace(r.name, '^.*\s', '') END,
      'staff-register'
    )
    RETURNING id INTO pid;
    UPDATE staff_members SET person_id = pid WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE staff_members ALTER COLUMN person_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS staff_members_person_key ON staff_members (person_id);
CREATE UNIQUE INDEX IF NOT EXISTS staff_members_user_key ON staff_members (staff_user_id) WHERE staff_user_id IS NOT NULL;

-- ------------------------------------------------------------------ roles

-- SchoolMan's sixteen `PurviewReference` responsibilities, as a vocabulary with a stable code.
CREATE TABLE IF NOT EXISTS staff_roles (
  code text PRIMARY KEY,
  name_de text NOT NULL,
  name_en text NOT NULL,
  position smallint NOT NULL DEFAULT 0
);

INSERT INTO staff_roles (code, name_de, name_en, position) VALUES
  ('teaching', 'Unterricht', 'Teaching', 10),
  ('examiner', 'Prüfer:in', 'Examiner', 20),
  ('placement', 'Einstufung', 'Placement', 30),
  ('exam_office', 'Prüfungsorganisation', 'Exam office', 40),
  ('coach', 'Coaching', 'Coaching', 50),
  ('monitor', 'Betreuung', 'Monitor', 60),
  ('author', 'Material', 'Materials', 70),
  ('front_office', 'Empfang', 'Front office', 80),
  ('back_office', 'Verwaltung', 'Administration', 90),
  ('accommodation', 'Unterkunft', 'Accommodation', 100),
  ('host_families', 'Gastfamilien', 'Host families', 110),
  ('management', 'Leitung', 'Management', 120),
  ('it', 'IT', 'IT', 130),
  ('house', 'Haus', 'Building', 140),
  ('supervision', 'Aufsicht', 'Supervision', 150),
  ('cleaning', 'Reinigung', 'Cleaning', 160)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS staff_member_roles (
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  role_code text NOT NULL REFERENCES staff_roles (code),
  PRIMARY KEY (staff_member_id, role_code)
);

-- Everyone on the board so far teaches.
INSERT INTO staff_member_roles (staff_member_id, role_code)
SELECT id, 'teaching' FROM staff_members
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------- contracts

-- SchoolMan's `DateTargetWorkTime`: a period, its kind (`StatusSalaryReference`: Angestellt, Honorar,
-- Bufdi, Aushilfe, Praktikum — plus a minijob, which SchoolMan has no word for), the weekly hours and
-- the weekly teaching units. A colleague's start and end at CASA are their first and last periods.
CREATE TABLE IF NOT EXISTS staff_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  kind text NOT NULL
    CONSTRAINT staff_contracts_kind_check CHECK (kind IN ('employed', 'freelance', 'minijob', 'temporary', 'federal_volunteer', 'intern')),
  -- Unknown for the periods carried over from the board: SchoolMan never said.
  valid_from date,
  valid_to date,
  weekly_hours numeric(4, 1) CONSTRAINT staff_contracts_hours_check CHECK (weekly_hours IS NULL OR weekly_hours BETWEEN 0 AND 60),
  -- Unterrichtseinheiten (45 minutes) a week, for a teacher.
  weekly_units numeric(4, 1) CONSTRAINT staff_contracts_units_check CHECK (weekly_units IS NULL OR weekly_units BETWEEN 0 AND 60),
  note text,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT staff_contracts_period_check CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS staff_contracts_member_idx ON staff_contracts (staff_member_id, valid_from);

-- The board's employed/freelance, as an open period.
INSERT INTO staff_contracts (staff_member_id, kind)
SELECT id, contract FROM staff_members
WHERE NOT EXISTS (SELECT 1 FROM staff_contracts c WHERE c.staff_member_id = staff_members.id);

ALTER TABLE staff_members DROP COLUMN IF EXISTS contract;
-- The name is the person's now.
ALTER TABLE staff_members DROP COLUMN IF EXISTS full_name;

-- ---------------------------------------------------------- examiners (§2)

-- SchoolMan's `DateValidity`, joined to the exam it is for — there it was joined through two unrelated
-- lists whose ids matched by luck. One row is one licence: the exam, the number, the period.
CREATE TABLE IF NOT EXISTS staff_licences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  exam_type_id uuid NOT NULL REFERENCES exam_types (id) ON DELETE RESTRICT,
  licence_number text,
  valid_from date,
  valid_to date,
  note text,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT staff_licences_period_check CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS staff_licences_member_idx ON staff_licences (staff_member_id);

-- Who examines a sitting, and which part: SchoolMan's `SingleDateExam._ID_StaffMember`, a list in a field.
CREATE TABLE IF NOT EXISTS exam_session_examiners (
  exam_session_id uuid NOT NULL REFERENCES exam_sessions (id) ON DELETE CASCADE,
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE RESTRICT,
  part text NOT NULL DEFAULT 'full'
    CONSTRAINT exam_session_examiners_part_check CHECK (part IN ('full', 'written', 'oral')),
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (exam_session_id, staff_member_id)
);

-- --------------------------------------------- exam sittings (from 0038's work)
-- A sitting is prepared (draft: not on the website), on offer (scheduled: on the registration form
-- until its deadline), or called off (cancelled). The workspace creates and edits them from now on.
ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_status_check;
ALTER TABLE exam_sessions ADD CONSTRAINT exam_sessions_status_check CHECK (status IN ('draft', 'scheduled', 'cancelled'));
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;
