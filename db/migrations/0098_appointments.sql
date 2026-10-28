-- Termine: the team's appointments (Rahman, 2026-10-28).
--
-- The placement test in person is one kind: Tuesday to Thursday, twelve half-hour times from
-- 09:30 to 17:00, two learners each (src/lib/appointments/placement-schedule.ts), booked by the
-- learner on the placement page — the website never puts a third person into a time; the team
-- may. The others are written in by the team: a course consultation, a group consultation, any
-- other appointment. Each can be assigned to a colleague, who finds it under „Meine Termine";
-- everyone sees every appointment and whose it is, so a colleague's appointments are covered
-- while they are away. Ina's group consultations booked on the website stay requests on their
-- enquiries (group_appointments, 0015) and are shown beside these.

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'placement'
    CONSTRAINT appointments_kind_check CHECK (kind IN ('placement', 'consultation', 'group_consultation', 'other')),
  starts_at timestamptz NOT NULL,
  minutes integer NOT NULL DEFAULT 30 CONSTRAINT appointments_minutes_check CHECK (minutes BETWEEN 5 AND 480),
  -- With whom: the learner, the group leader, the visitor.
  first_name text NOT NULL CONSTRAINT appointments_first_name_check CHECK (btrim(first_name) <> ''),
  last_name text,
  email text,
  phone text,
  locale text NOT NULL DEFAULT 'de' CONSTRAINT appointments_locale_check CHECK (locale IN ('de', 'en')),
  note text,
  -- booked → came or missed once the time has passed; cancelled gives a placement place back.
  status text NOT NULL DEFAULT 'booked'
    CONSTRAINT appointments_status_check CHECK (status IN ('booked', 'came', 'missed', 'cancelled')),
  -- website: the learner booked it; staff: a colleague wrote it in.
  source text NOT NULL DEFAULT 'website'
    CONSTRAINT appointments_source_check CHECK (source IN ('website', 'staff')),
  -- The colleague it is for; nobody means the team.
  assigned_to uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS appointments_starts_idx ON appointments (starts_at) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS appointments_assigned_idx ON appointments (assigned_to, starts_at) WHERE status <> 'cancelled';

COMMENT ON TABLE appointments IS
  'The team''s appointments: placement tests in person (two places per time, booked on the website), consultations and others, each optionally assigned to a colleague.';
