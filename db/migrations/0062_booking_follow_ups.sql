-- Follow-ups on a booking — SchoolMan's „Wiedervorlage" (2026-10-18; docs/schoolman/letters-and-history.md,
-- docs/ADMIN_WORKSPACE.md §Follow-ups). SchoolMan's letter scripts set one when a letter goes out — after a
-- booking confirmation, a payment reminder, a cancellation: look at this booking again on a day
-- (`SingleDateControl`, 7,539). It records no text of its own and never that it was done; here a follow-up
-- says why, and is done once a colleague has looked.
CREATE TABLE IF NOT EXISTS booking_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  due_on date NOT NULL,
  reason text NOT NULL,
  done_at timestamptz,
  done_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  /* Who set it in SchoolMan, for one that came from there. */
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  filemaker_id text,
  CONSTRAINT booking_follow_ups_reason_check CHECK (length(btrim(reason)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_follow_ups_filemaker_key ON booking_follow_ups (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_follow_ups_booking_idx ON booking_follow_ups (booking_id, due_on);
CREATE INDEX IF NOT EXISTS booking_follow_ups_open_idx ON booking_follow_ups (due_on) WHERE done_at IS NULL;
