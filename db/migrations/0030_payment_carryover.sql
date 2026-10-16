-- Carry-over (Rahman, 2026-10-16; docs/schoolman/money.md): a credit on one booking — an
-- overpayment, or what is left of a cancelled one — moved to another booking of the same learner.
--
-- SchoolMan records it as a payment of the kind "carry-over" (4,836 of them), on one side only.
-- Here it is two payment lines written together: minus on the booking the credit leaves, plus on
-- the booking it goes to. Both carry the same `transfer_id`, so voiding one voids the other, and
-- each names the booking on the other side.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS transfer_id uuid,
  ADD COLUMN IF NOT EXISTS counterpart_booking_id uuid REFERENCES bookings (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS payments_transfer_idx ON payments (transfer_id) WHERE transfer_id IS NOT NULL;
