-- What SchoolMan knows about a learner beyond their bookings and money (2026-10-17;
-- docs/ADMIN_WORKSPACE.md §Learners from SchoolMan). Rahman: transfer all the data related to
-- students, including the comments about them — first for the sample, to see what is missing.

-- Notes from SchoolMan: their author is a SchoolMan user, not a workspace account, so the name is
-- kept as written; the reference makes a second read update rather than double them.
ALTER TABLE staff_notes ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE staff_notes ADD COLUMN IF NOT EXISTS filemaker_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS staff_notes_filemaker_key ON staff_notes (filemaker_ref) WHERE filemaker_ref IS NOT NULL;

-- Letters SchoolMan wrote: those of a kind the workspace knows keep that kind (so a booking's next
-- letter is worked out from what was really sent); the others are kept as „schoolman", on the
-- booking or only on the person.
ALTER TABLE letters ADD COLUMN IF NOT EXISTS filemaker_letter_id text;
CREATE UNIQUE INDEX IF NOT EXISTS letters_filemaker_key ON letters (filemaker_letter_id) WHERE filemaker_letter_id IS NOT NULL;

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_kind_check;
ALTER TABLE letters ADD CONSTRAINT letters_kind_check CHECK (kind IN (
  'offer',
  'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
  'exam_confirmation', 'exam_invitation', 'exam_results', 'exam_participation',
  'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request',
  'schoolman'
));

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_subject_check;
ALTER TABLE letters ADD CONSTRAINT letters_subject_check CHECK (
  (kind = 'offer') = (offer_id IS NOT NULL)
  AND (kind = 'schoolman' OR (kind IN ('booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
                'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
                'exam_confirmation', 'exam_invitation', 'exam_results', 'exam_participation'))
      = (booking_id IS NOT NULL))
  AND (kind IN ('waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place')) = (waitlist_entry_id IS NOT NULL)
  AND (kind IN ('registration_test_request', 'registration_deposit_request')) = (registration_id IS NOT NULL)
  AND (kind <> 'learner_confirmation' OR person_id IS NOT NULL)
  AND (kind <> 'schoolman' OR person_id IS NOT NULL)
);

-- A learner's bank accounts (for a refund) from SchoolMan's `BankAccount`.
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS filemaker_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS bank_accounts_filemaker_key ON bank_accounts (filemaker_ref) WHERE filemaker_ref IS NOT NULL;

-- SchoolMan's work log on a booking or a person („1. Reminder mit Zahlungsfrist bis … geschickt")
-- goes into the record's history as `schoolman_log` lines: found again by the record they are on.
CREATE INDEX IF NOT EXISTS staff_activity_schoolman_idx ON staff_activity (entity_id) WHERE action = 'schoolman_log';
