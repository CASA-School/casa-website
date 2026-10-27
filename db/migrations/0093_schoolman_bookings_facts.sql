-- 0093 — What SchoolMan says about bookings, courses and closures that the bridge left behind
-- (2026-10-27, the mapping-completeness review of bookings, courses, tests, intake, exams and offers;
-- docs/schoolman/bridge-gaps.md).
--
-- Rahman: all of SchoolMan's data, as clean facts from their real source. Each column below is one
-- SchoolMan field that teachers or the office fill and that had no place here.

-- A teacher's answers on a booking, written into SchoolMan by the Klassenbuch (`Booking_API`):
-- whether the learner's level is right (`_ID_LevelConfirmed`) and whether they may go up a level
-- (`_ID_LevelApproved`), each yes / no / unsure. SchoolMan auto-enters 4 („unsure") on every new booking,
-- so its 4 cannot be told from a teacher's answer: the bridge brings yes and no, and leaves the rest empty
-- (FILEMAKER_LESSONS §4.6, a default is not a decision). „unsure" is kept for a direct Klassenbuch bridge.
-- `course_result` is `_ID_Success` („mit Erfolg" / „ohne Erfolg", typed on the certificate screen): it
-- decides whether the learner gets a Teilnahmezertifikat or a Teilnahmebescheinigung.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS level_confirmed text CONSTRAINT bookings_level_confirmed_check CHECK (level_confirmed IN ('yes', 'no', 'unsure')),
  ADD COLUMN IF NOT EXISTS level_approved text CONSTRAINT bookings_level_approved_check CHECK (level_approved IN ('yes', 'no', 'unsure')),
  ADD COLUMN IF NOT EXISTS course_result text CONSTRAINT bookings_course_result_check CHECK (course_result IN ('passed', 'not_passed'));

-- The university's programmes (SchoolMan's `Project`, all three on the university's contract): which one
-- a learner is in decides which programme the university is invoiced for (`Booking._ID_Project`).
CREATE TABLE IF NOT EXISTS programmes (
  code text PRIMARY KEY,
  name text NOT NULL,
  position smallint NOT NULL DEFAULT 0,
  filemaker_id integer UNIQUE
);
INSERT INTO programmes (code, name, position, filemaker_id) VALUES
  ('herestudies', 'HereStudies', 10, 1),
  ('prime', 'Prime', 20, 2),
  ('in_touch', 'in touch', 30, 3)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS programme_code text REFERENCES programmes (code) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bookings_programme_idx ON bookings (programme_code) WHERE programme_code IS NOT NULL;

-- A booked period whose course is not here (a past course, or one of a start the workspace does not have)
-- keeps what SchoolMan says about it: the level band (`DateBooking._ID_Level`) and the part of the day
-- (`_ID_DayTimeReference`). A period on a course here takes both from the course.
ALTER TABLE booking_periods
  ADD COLUMN IF NOT EXISTS level_band text CONSTRAINT booking_periods_level_band_check CHECK (level_band IN ('A1', 'A2', 'B1', 'B1+', 'B2', 'C1')),
  ADD COLUMN IF NOT EXISTS day_time_code text REFERENCES day_times (code) ON DELETE SET NULL;

-- Where a course runs (`Course._ID_Location`: Dobben, in-house, an online group, one-to-one online) and,
-- for an exam preparation, the sitting it leads to (`Course._ID_Exam`).
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exam_session_id uuid REFERENCES exam_sessions (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS courses_exam_session_idx ON courses (exam_session_id) WHERE exam_session_id IS NOT NULL;

-- The teacher's note on a course (`Course.CommentOnCourse`, written by the Klassenbuch) is a note on it.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (
  entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person', 'offer', 'group_visit',
                      'accommodation', 'organisation', 'course'])
);

-- CASA's closures as SchoolMan's calendar has them (`SingleDayCalendar._ID_Holiday`, without the legal
-- holidays), as ranges. SchoolMan has them up to 2028. Who keeps the closures from now on — the workspace
-- or SchoolMan — is Rahman's decision; until then the website and the workspace read
-- `src/config/school-closures.ts`.
CREATE TABLE IF NOT EXISTS school_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_on date NOT NULL UNIQUE,
  ends_on date NOT NULL,
  label text,
  source text NOT NULL DEFAULT 'schoolman' CONSTRAINT school_closures_source_check CHECK (source IN ('schoolman', 'office')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT school_closures_order_check CHECK (starts_on <= ends_on)
);
