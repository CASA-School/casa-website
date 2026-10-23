-- 0087 — A learner's course books handed out (2026-10-23).
--
-- Rahman: in SchoolMan the book line of a booking is red until the books are handed over and green
-- after; many learners book online from abroad, pay, and pick their books up on the first day or a few
-- days before, and the colleague at the desk switches the line from red to green. SchoolMan keeps it as
-- `CostDetail._ID_ProductDelivered` (1 handed out, 2 not yet). Here it is on the book line itself: not
-- handed out until a colleague says so, then when and by whom. A line the bridge brings in as handed
-- out from SchoolMan has no date or colleague — SchoolMan does not record them.

ALTER TABLE booking_charges
  ADD COLUMN IF NOT EXISTS handed_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handed_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS handed_out_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;
