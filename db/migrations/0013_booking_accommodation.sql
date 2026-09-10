-- 0013 — accommodation is part of the booking, not just a cost line.
--
-- The wizard asks whether the learner needs accommodation, which kind, which
-- room, what catering and for which dates. Until now the only place that
-- answer landed was a `booking_charges` row, which meant it could only be
-- recorded when a price existed — and CASA has not published accommodation
-- rates yet. So the answer was being thrown away.
--
-- What was booked and what it costs are two different facts. These columns
-- hold the first; a `booking_charges` row of kind 'accommodation' still holds
-- the second, and appears once a rate covers it.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS accommodation_type_code text
    REFERENCES accommodation_types (code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accommodation_room_type_code text
    REFERENCES accommodation_room_types (code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accommodation_catering_code text
    REFERENCES catering_options (code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accommodation_from date,
  ADD COLUMN IF NOT EXISTS accommodation_to date;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_accommodation_dates_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_accommodation_dates_check
  CHECK (accommodation_from IS NULL OR accommodation_to IS NULL
         OR accommodation_from <= accommodation_to);

CREATE INDEX IF NOT EXISTS bookings_accommodation_idx
  ON bookings (accommodation_type_code) WHERE accommodation_type_code IS NOT NULL;

-- A birth date in the future is a typo, not a fact — but it is checked in the
-- server action, not here. `current_date` is not IMMUTABLE, so a CHECK using
-- it changes meaning over time and can fail a dump/restore; and a constraint
-- cannot be added at all while one bad row exists, which is exactly the state
-- a validation gap leaves you in.
