-- The rest of SchoolMan's learner ledger (2026-10-18; docs/schoolman/money.md, docs/ADMIN_WORKSPACE.md
-- §Money from SchoolMan): payment plans, an agency's commission on a booking, money paid out, invoices.
-- SchoolMan's money tables are a learner ledger beside finance's DATEV, not the accounts; these are read
-- here as they are, next to the charges and payments (0054). Sums are never carried: totals are worked out.

-- A payment plan: the parts a booking is paid in, each with its day and whether it came (`Instalment`).
CREATE TABLE IF NOT EXISTS booking_instalments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 1,
  /* „1. Rate", „Anzahlung" — as SchoolMan names it. */
  label text,
  due_on date,
  amount numeric(10, 2) NOT NULL,
  paid boolean,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_instalments_filemaker_key ON booking_instalments (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_instalments_booking_idx ON booking_instalments (booking_id, position);

-- An agency's commission on one charge of a booking (`Commission`): the charge, its amount, the share, the
-- commission, and whether it has been paid out.
CREATE TABLE IF NOT EXISTS booking_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  charge_id uuid REFERENCES booking_charges (id) ON DELETE SET NULL,
  description text,
  base_amount numeric(10, 2),
  percentage numeric(5, 2),
  amount numeric(10, 2) NOT NULL,
  paid boolean,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT booking_commissions_percentage_check CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100))
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_commissions_filemaker_key ON booking_commissions (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_commissions_booking_idx ON booking_commissions (booking_id);

-- Money paid out (`PaymentOut`): rent to a host, commission to an agency, a payment straight to an agency.
-- A refund to the learner is a payment below zero on the booking (0054), not here.
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  booking_id uuid REFERENCES bookings (id) ON DELETE SET NULL,
  accommodation_id uuid REFERENCES accommodations (id) ON DELETE SET NULL,
  organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  amount numeric(10, 2) NOT NULL,
  paid_on date,
  method text,
  note text,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT payouts_kind_check CHECK (kind IN ('host_rent', 'agency_commission', 'agency_direct', 'other'))
);
CREATE UNIQUE INDEX IF NOT EXISTS payouts_filemaker_key ON payouts (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payouts_booking_idx ON payouts (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payouts_accommodation_idx ON payouts (accommodation_id, paid_on) WHERE accommodation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payouts_organisation_idx ON payouts (organisation_id, paid_on) WHERE organisation_id IS NOT NULL;

-- An invoice (`Invoice`): its number, day, to whom, and what it is about. The charges it covers carry its
-- number (`booking_charges.invoice_number`, SchoolMan stamps it on them), and its total is theirs.
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  issued_on date,
  booking_id uuid REFERENCES bookings (id) ON DELETE SET NULL,
  person_id uuid REFERENCES people (id) ON DELETE SET NULL,
  organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  /* The recipient as the invoice addressed them, and its subject. */
  recipient text,
  subject text,
  /* SchoolMan's own figure, on the few invoices that have one; else the charges' sum. */
  amount numeric(10, 2),
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_filemaker_key ON invoices (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS invoices_booking_idx ON invoices (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS invoices_number_idx ON invoices (number);

ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS invoice_number text;
