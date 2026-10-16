-- Booking numbers (Rahman, 2026-10-16: "yes give bookings their own numbers").
--
-- What a learner writes on a bank transfer and finance matches payments by: "B-2026-0042", the year
-- the booking was made and a running number in that year. Like an offer's number (2026-014), with a
-- B so the two never read alike, and unlike SchoolMan's "1 | 23456 | 26" (business line, record
-- id, course year), so the two systems' numbers cannot be confused while both run.
--
-- Handed out by the database on insert — under an advisory lock, so two bookings made at the same
-- moment never get one number — whoever inserts: the booking wizard, a seed, a test, the bridge.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS number_year smallint,
  ADD COLUMN IF NOT EXISTS number_seq integer;

-- The bookings there are, numbered in the order they were made.
WITH numbered AS (
  SELECT id,
         extract(year FROM created_at)::smallint AS y,
         row_number() OVER (PARTITION BY extract(year FROM created_at) ORDER BY created_at, id) AS n
    FROM bookings
   WHERE number_seq IS NULL
)
UPDATE bookings b SET number_year = numbered.y, number_seq = numbered.n FROM numbered WHERE b.id = numbered.id;

CREATE OR REPLACE FUNCTION assign_booking_number() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.number_seq IS NULL THEN
    NEW.number_year := extract(year FROM now() AT TIME ZONE 'Europe/Berlin')::smallint;
    PERFORM pg_advisory_xact_lock(hashtext('bookings.number'), NEW.number_year);
    SELECT coalesce(max(number_seq), 0) + 1 INTO NEW.number_seq FROM bookings WHERE number_year = NEW.number_year;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_assign_number ON bookings;
CREATE TRIGGER bookings_assign_number BEFORE INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION assign_booking_number();

ALTER TABLE bookings
  ALTER COLUMN number_year SET NOT NULL,
  ALTER COLUMN number_seq SET NOT NULL,
  ADD COLUMN IF NOT EXISTS number text GENERATED ALWAYS AS ('B-' || number_year::text || '-' || lpad(number_seq::text, 4, '0')) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_number_key ON bookings (number_year, number_seq);
CREATE INDEX IF NOT EXISTS bookings_number_idx ON bookings (number);
