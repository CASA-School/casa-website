-- Einstufungstermine: the in-person placement test by appointment (Rahman, 2026-10-28).
--
-- Tuesday to Thursday, twelve half-hour times from 09:30 to 17:00, two places each
-- (src/lib/appointments/placement-schedule.ts holds the times). A learner books on the
-- placement page and the place is theirs at once; the team sees the day's appointments in
-- the Tagesplan and adds the ones made by phone or at the desk. The website never books more
-- than two people into a time; the team may.

CREATE TABLE IF NOT EXISTS placement_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL,
  first_name text NOT NULL CONSTRAINT placement_appointments_first_name_check CHECK (btrim(first_name) <> ''),
  last_name text,
  email text,
  phone text,
  locale text NOT NULL DEFAULT 'de' CONSTRAINT placement_appointments_locale_check CHECK (locale IN ('de', 'en')),
  note text,
  -- booked → came or missed once the time has passed; cancelled gives the place back.
  status text NOT NULL DEFAULT 'booked'
    CONSTRAINT placement_appointments_status_check CHECK (status IN ('booked', 'came', 'missed', 'cancelled')),
  -- website: the learner booked it; staff: a colleague wrote it in.
  source text NOT NULL DEFAULT 'website'
    CONSTRAINT placement_appointments_source_check CHECK (source IN ('website', 'staff')),
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS placement_appointments_starts_idx
  ON placement_appointments (starts_at) WHERE status <> 'cancelled';

COMMENT ON TABLE placement_appointments IS
  'In-person placement test appointments: two places per time, booked on the website or by the team.';
