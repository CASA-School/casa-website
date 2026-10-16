-- The waiting list (Rahman, 2026-10-16; docs/schoolman/intake.md, docs/ADMIN_WORKSPACE.md §Waiting list).
--
-- What fills up is a LEVEL GROUP within a course start: "B1.1, Intensive mornings from 26 Oct". It
-- has places — groups × places per group, 14 by default (SchoolMan's `Course.CapStudent`) — and
-- when they are taken, learners queue for it. A long queue is the signal to open a second group of
-- the same level, which is one more group here.
--
-- SchoolMan's `WaitingRoom` is the counter-example: no course on the entry since 2023 (only on the
-- linked pre-booking), no order but creation order, no "place offered" step, nothing that notices a
-- freed place, and no entry ever closed — 87% sit at the default status. Here an entry names its
-- course and level, keeps its order, moves through clear states, and closes itself when the learner
-- is booked into that course. Free places are counted from bookings, never stored.

-- The level a booked period is taught at: what places are counted by.
ALTER TABLE booking_periods
  ADD COLUMN IF NOT EXISTS level_code text REFERENCES levels (code) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS booking_periods_instance_level_idx ON booking_periods (course_instance_id, level_code);

-- Places per course start and level. Without a row a level has one group of 14.
CREATE TABLE IF NOT EXISTS course_level_places (
  course_instance_id uuid NOT NULL REFERENCES course_instances (id) ON DELETE CASCADE,
  level_code text NOT NULL REFERENCES levels (code),
  groups smallint NOT NULL DEFAULT 1 CONSTRAINT course_level_places_groups_check CHECK (groups BETWEEN 0 AND 9),
  places_per_group smallint NOT NULL DEFAULT 14
    CONSTRAINT course_level_places_places_check CHECK (places_per_group BETWEEN 1 AND 40),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  PRIMARY KEY (course_instance_id, level_code)
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  course_instance_id uuid NOT NULL REFERENCES course_instances (id) ON DELETE CASCADE,
  level_code text NOT NULL REFERENCES levels (code),
  -- waiting → offered (a place was offered, no deadline: the team decides when to move on)
  -- → booked (closed by the booking itself) | declined (the learner said no) | withdrawn (taken off).
  status text NOT NULL DEFAULT 'waiting'
    CONSTRAINT waitlist_entries_status_check CHECK (status IN ('waiting', 'offered', 'booked', 'declined', 'withdrawn')),
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  -- The order of the queue: the join time, unless a colleague moved someone (logged with a reason).
  rank double precision NOT NULL,
  -- How they came: from the office, a website registration, or as a learner of an earlier booking.
  source text NOT NULL DEFAULT 'office'
    CONSTRAINT waitlist_entries_source_check CHECK (source IN ('office', 'registration', 'booking')),
  registration_id uuid REFERENCES course_registrations (id) ON DELETE SET NULL,
  note text,
  offered_at timestamptz,
  offered_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  closed_at timestamptz,
  closed_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  close_reason text,
  booking_id uuid REFERENCES bookings (id) ON DELETE SET NULL,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT waitlist_entries_closed_check CHECK ((status IN ('waiting', 'offered')) = (closed_at IS NULL))
);

-- One open place in a queue per person and course level.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_open_unique
  ON waitlist_entries (person_id, course_instance_id, level_code) WHERE status IN ('waiting', 'offered');
CREATE INDEX IF NOT EXISTS waitlist_entries_queue_idx
  ON waitlist_entries (course_instance_id, level_code, rank) WHERE status IN ('waiting', 'offered');
CREATE INDEX IF NOT EXISTS waitlist_entries_person_idx ON waitlist_entries (person_id);
