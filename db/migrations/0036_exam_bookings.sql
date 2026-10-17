-- Exam bookings (Rahman, 2026-10-17: "yes build the exam bookings"; docs/ADMIN_WORKSPACE.md §Exams).
--
-- An exam candidate is booked like a learner — the same booking, number, cost lines, payments and
-- letters — but what is booked is one exam sitting and the parts taken, not a course's weeks.
-- SchoolMan keeps exams on their own business line (`NationalAirport`, a shell of `Booking`) and
-- the candidate's day as a copied `SingleDateStudent` row; here the booking points at the sitting,
-- and its day is the sitting's, never a copy that can drift.
--
-- A sitting's places are `exam_sessions.capacity`. Free = capacity − booked − offered, worked out
-- each time, never stored. A full sitting has a waiting list: the course waiting list's own table,
-- whose entries are now about a course start's level OR an exam sitting.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS exam_session_id uuid REFERENCES exam_sessions (id) ON DELETE RESTRICT,
  -- full = written and oral; a part = one of them (telc sells them separately, at a lower fee).
  ADD COLUMN IF NOT EXISTS exam_parts text,
  ADD COLUMN IF NOT EXISTS source_exam_registration_id uuid REFERENCES exam_registrations (id) ON DELETE SET NULL,
  -- Reported to telc for the sitting (before its deadline): who did it and when.
  ADD COLUMN IF NOT EXISTS exam_filed_at timestamptz,
  ADD COLUMN IF NOT EXISTS exam_filed_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_exam_parts_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_exam_parts_check CHECK (exam_parts IN ('full', 'written', 'oral'));

-- An exam booking names its sitting and its parts, and is not a course booking.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_exam_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_exam_check CHECK (
  (exam_session_id IS NULL) = (exam_parts IS NULL)
  AND (exam_session_id IS NULL OR (course_type_id IS NULL AND source_registration_id IS NULL))
  AND (exam_session_id IS NOT NULL OR (source_exam_registration_id IS NULL AND exam_filed_at IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_source_exam_registration_key ON bookings (source_exam_registration_id) WHERE source_exam_registration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_exam_session_idx ON bookings (exam_session_id) WHERE exam_session_id IS NOT NULL;

-- A booking's days, whatever was booked: a course's periods, or the exam's sitting. What the
-- bookings list, its filters and its dates read, so an exam shows on the day it is sat.
CREATE OR REPLACE VIEW booking_days AS
  SELECT booking_id, start_date, end_date FROM booking_periods
  UNION ALL
  SELECT b.id, (s.starts_at AT TIME ZONE 'Europe/Berlin')::date, (s.ends_at AT TIME ZONE 'Europe/Berlin')::date
    FROM bookings b JOIN exam_sessions s ON s.id = b.exam_session_id;

-- The waiting list, for a sitting too.
ALTER TABLE waitlist_entries
  ALTER COLUMN course_instance_id DROP NOT NULL,
  ALTER COLUMN level_code DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS exam_session_id uuid REFERENCES exam_sessions (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS exam_parts text,
  ADD COLUMN IF NOT EXISTS exam_registration_id uuid REFERENCES exam_registrations (id) ON DELETE SET NULL;

ALTER TABLE waitlist_entries DROP CONSTRAINT IF EXISTS waitlist_entries_exam_parts_check;
ALTER TABLE waitlist_entries ADD CONSTRAINT waitlist_entries_exam_parts_check CHECK (exam_parts IN ('full', 'written', 'oral'));

ALTER TABLE waitlist_entries DROP CONSTRAINT IF EXISTS waitlist_entries_subject_check;
ALTER TABLE waitlist_entries ADD CONSTRAINT waitlist_entries_subject_check CHECK (
  (exam_session_id IS NULL AND course_instance_id IS NOT NULL AND level_code IS NOT NULL AND exam_parts IS NULL AND exam_registration_id IS NULL)
  OR (exam_session_id IS NOT NULL AND course_instance_id IS NULL AND level_code IS NULL AND exam_parts IS NOT NULL AND registration_id IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_exam_open_unique
  ON waitlist_entries (person_id, exam_session_id) WHERE status IN ('waiting', 'offered') AND exam_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS waitlist_entries_exam_queue_idx
  ON waitlist_entries (exam_session_id, rank) WHERE status IN ('waiting', 'offered') AND exam_session_id IS NOT NULL;
