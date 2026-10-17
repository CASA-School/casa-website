-- Exam bookings and stays from SchoolMan (2026-10-18; docs/ADMIN_WORKSPACE.md §Learners from SchoolMan).
-- Rahman: go ahead with exam bookings, then accommodation stays.

-- A sitting keeps SchoolMan's exam it is, so an exam booking finds it; a sitting from before the
-- workspace's (they start in August 2026) is made from SchoolMan's when one of its candidates comes
-- across. Past sittings are never on the website (it reads those ahead).
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS filemaker_exam_id text;
CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_filemaker_key ON exam_sessions (filemaker_exam_id) WHERE filemaker_exam_id IS NOT NULL;

-- A booking's stays as SchoolMan keeps them (`DateAccommodation`): when, what kind, which room type and
-- meals, where — a CASA flat by its name, a host family only as such: hosts are people who are not
-- learners and come across only with their own module and a privacy decision —, called off or not, and
-- whether the departure is confirmed. A booking may have more than one (a move, a second stay). The
-- booking's own accommodation fields stay the wish; these are what was arranged.
CREATE TABLE IF NOT EXISTS booking_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  accommodation_type_code text REFERENCES accommodation_types(code),
  room_type_code text REFERENCES accommodation_room_types(code),
  catering_code text REFERENCES catering_options(code),
  place text,
  room text,
  cancelled boolean NOT NULL DEFAULT false,
  departure_confirmed boolean,
  filemaker_id text,
  filemaker_place_id text,
  filemaker_room_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT booking_stays_dates CHECK (starts_on <= ends_on)
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_stays_filemaker_key ON booking_stays (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_stays_booking_idx ON booking_stays (booking_id, starts_on);
CREATE INDEX IF NOT EXISTS booking_stays_dates_idx ON booking_stays (starts_on, ends_on) WHERE NOT cancelled;
