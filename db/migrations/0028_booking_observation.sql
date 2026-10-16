-- The team's colours on a booking (Rahman, 2026-10-16; docs/schoolman/bookings.md).
--
-- In SchoolMan a booking carries one of four values, each a colour: ja (green, all good),
-- u.B. — unter Beobachtung (yellow, the learner may not have the level, and so on), ??? (grey,
-- not paid) and nein (red, cancelled, no visa, not coming). A colleague sets all four by hand,
-- and "not paid" goes stale: most bookings still at ??? have been paid in full.
--
-- Here only yellow is a colleague's call, and it is stored with its reason, who set it and when.
-- Red is the booking's cancellation (`status`, `cancel_reason`); grey ("unklar") and green follow
-- from the charges and payments, so nobody has to remember to change them.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS observation_reason text
    CONSTRAINT bookings_observation_reason_check
    CHECK (observation_reason IN ('level', 'visa', 'attendance', 'documents', 'other')),
  ADD COLUMN IF NOT EXISTS observation_note text,
  ADD COLUMN IF NOT EXISTS observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS observed_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_observed_idx
  ON bookings (observed_at) WHERE observation_reason IS NOT NULL AND deleted_at IS NULL;
