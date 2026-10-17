-- The money of the learners brought across from SchoolMan (2026-10-17; docs/ADMIN_WORKSPACE.md
-- §Learners from SchoolMan). Rahman: bring the money too. A charge keeps its `CostDetail`, a payment
-- its `PaymentIn` (or, a refund to the learner, its `PaymentOut`), so a second read updates rather
-- than doubles them and a line SchoolMan no longer has can go.
ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS filemaker_cost_detail_id text;
CREATE UNIQUE INDEX IF NOT EXISTS booking_charges_filemaker_key ON booking_charges (filemaker_cost_detail_id) WHERE filemaker_cost_detail_id IS NOT NULL;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS filemaker_payment_id text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_filemaker_key ON payments (filemaker_payment_id) WHERE filemaker_payment_id IS NOT NULL;
