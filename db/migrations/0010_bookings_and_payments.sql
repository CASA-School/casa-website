-- 0010 — bookings, booking periods, payments.
--
-- The first phase-2 table: what FileMaker calls a Booking (22,206 rows) — a
-- person's confirmed place on a course, with dates, a price and the money
-- received against it. Ported from `Booking`, `DateBooking`, `PaymentIn` and
-- `MethodPaymentReference`, read on 2026-09-09. What changed on the way
-- (docs/FILEMAKER_LESSONS.md §11.6):
--
--   * One row states what it is about. `Booking` had 84 `_ID_*` columns and
--     `PaymentIn` 40; here a booking has a person and a course type, a period
--     has a cohort, a payment has a booking. Nothing else.
--   * Dates are rows, not flags. FileMaker marks an extension with
--     `_ID_Prolongation` / `_ID_Extension` and adds `DateBooking` weeks; here an
--     extension is a `booking_periods` row of kind 'extension', and the
--     booking's dates are the min and max over its periods.
--   * No unknown state. `_ID_EnrolmentDone = 5 (???)` was the most common state
--     of a new booking. `booking_status` has four real states and 'reserved'
--     — a place held before confirmation — is a state a person chose.
--   * Money is never deleted. A wrong payment is voided, with a reason and a
--     name, and stays on the record.
--   * Money is lines, as on FileMaker's Booking screen: enrolment fee, course
--     price for N weeks, books, a cancellation as a negative line. The price is
--     therefore a snapshot on the booking (`booking_charges`), because the
--     catalogue changes and the agreement does not (§7.2 counted 157 bookings
--     whose course type disagreed with the course they pointed at). Balance =
--     charges − payments, computed, never stored (§5).
--
-- The Course screen also gave `course_instances` what the catalogue lacked:
-- a level, a session (morning / afternoon / evening) and a title.

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('reserved', 'confirmed', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people (id) ON DELETE RESTRICT,
  course_type_id uuid REFERENCES course_types (id) ON DELETE SET NULL,
  status booking_status NOT NULL DEFAULT 'reserved',
  currency text NOT NULL DEFAULT 'EUR',
  -- Who pays: the learner, an agency, a company, or someone else named.
  payer text NOT NULL DEFAULT 'self'
    CONSTRAINT bookings_payer_check CHECK (payer IN ('self', 'agency', 'company', 'other')),
  payer_name text,
  visa_required boolean NOT NULL DEFAULT false,
  notes text,
  -- The registration this booking was made from, when it was.
  source_registration_id uuid UNIQUE REFERENCES course_registrations (id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES staff_users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS bookings_person_idx ON bookings (person_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS bookings_set_updated_at ON bookings;
CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS booking_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  -- The cohort, when there is one. An extension into a cohort not yet
  -- scheduled has dates but no instance; a flag is raised for it.
  course_instance_id uuid REFERENCES course_instances (id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  kind text NOT NULL DEFAULT 'initial'
    CONSTRAINT booking_periods_kind_check CHECK (kind IN ('initial', 'extension')),
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT booking_periods_date_order_check CHECK (start_date <= end_date)
);
CREATE INDEX IF NOT EXISTS booking_periods_booking_idx ON booking_periods (booking_id, start_date);
CREATE INDEX IF NOT EXISTS booking_periods_instance_idx ON booking_periods (course_instance_id);

-- One line of what is owed. Negative amounts are refunds and cancellations,
-- kept as lines so the history of the agreement is readable.
CREATE TABLE IF NOT EXISTS booking_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  kind text NOT NULL
    CONSTRAINT booking_charges_kind_check CHECK (kind IN (
      'enrolment_fee', 'tuition', 'books', 'exam_fee', 'accommodation', 'deposit',
      'cancellation', 'discount', 'other'
    )),
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CONSTRAINT booking_charges_amount_check CHECK (amount <> 0),
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS booking_charges_booking_idx ON booking_charges (booking_id, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL CONSTRAINT payments_amount_check CHECK (amount <> 0),
  currency text NOT NULL DEFAULT 'EUR',
  -- FileMaker's MethodPaymentReference, six values, kept as they are used.
  method text NOT NULL
    CONSTRAINT payments_method_check CHECK (method IN ('card', 'cash', 'transfer', 'carryover', 'agency', 'offset')),
  received_at date NOT NULL DEFAULT current_date,
  -- What the money was for, in the team's words ("Kurspreis", "Deponat Wohnung").
  subject text NOT NULL,
  reference text,
  recorded_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  voided_at timestamptz,
  voided_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  void_reason text
);
CREATE INDEX IF NOT EXISTS payments_booking_idx ON payments (booking_id, received_at);

-- What the Course screen holds and the catalogue did not.
ALTER TABLE course_instances
  ADD COLUMN IF NOT EXISTS level_code text REFERENCES levels (code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session text
    CONSTRAINT course_instances_session_check CHECK (session IS NULL OR session IN ('morning', 'afternoon', 'evening')),
  ADD COLUMN IF NOT EXISTS title text;

-- Notes, flags and links learn the new entities.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (entity IN (
  'enquiry', 'course_registration', 'exam_registration', 'career_application',
  'placement_attempt', 'booking'
));

ALTER TABLE record_flags DROP CONSTRAINT IF EXISTS record_flags_entity_check;
ALTER TABLE record_flags ADD CONSTRAINT record_flags_entity_check CHECK (entity IN (
  'person', 'enquiry', 'course_registration', 'exam_registration',
  'career_application', 'placement_attempt', 'booking'
));
ALTER TABLE record_flags DROP CONSTRAINT IF EXISTS record_flags_code_check;
ALTER TABLE record_flags ADD CONSTRAINT record_flags_code_check CHECK (code IN (
  'duplicate_candidate', 'nationality_unmatched', 'level_unmatched',
  'birth_date_unparsed', 'person_unlinked', 'cohort_withdrawn', 'period_without_cohort'
));

ALTER TABLE filemaker_links DROP CONSTRAINT IF EXISTS filemaker_links_entity_check;
ALTER TABLE filemaker_links ADD CONSTRAINT filemaker_links_entity_check CHECK (entity IN (
  'person', 'enquiry', 'course_registration', 'exam_registration',
  'placement_review', 'room', 'location', 'course_instance', 'booking', 'payment'
));
