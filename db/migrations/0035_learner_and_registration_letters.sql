-- A learner's confirmation of several bookings, and the letters to a website registration (Rahman,
-- 2026-10-17: "build the multi-booking confirmation and registration letters next"; docs/LETTERS.md).
--
-- SchoolMan's `ConfirmationStudentIndividual` (915 in 2026) confirms the bookings a colleague ticks
-- on a learner — a course, an exam, a stay — in one letter; here it is about the learner
-- (`person_id`), with the bookings it covers kept in its `source`. `NewLetter.SendTest` and
-- `NewLetterDownPayment` (about 440) answer a registration from the website before there is a
-- booking: they ask for the placement-test result, or for the down payment; here they are about the
-- registration (`registration_id`).

ALTER TABLE letters
  ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES course_registrations (id) ON DELETE RESTRICT;

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_kind_check;
ALTER TABLE letters ADD CONSTRAINT letters_kind_check CHECK (kind IN (
  'offer',
  'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
  'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request'
));

-- Exactly one record per letter. A learner's confirmation is about the person it is addressed to.
ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_subject_check;
ALTER TABLE letters ADD CONSTRAINT letters_subject_check CHECK (
  (kind = 'offer') = (offer_id IS NOT NULL)
  AND (kind IN ('booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
                'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation'))
      = (booking_id IS NOT NULL)
  AND (kind IN ('waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place')) = (waitlist_entry_id IS NOT NULL)
  AND (kind IN ('registration_test_request', 'registration_deposit_request')) = (registration_id IS NOT NULL)
  AND (kind <> 'learner_confirmation' OR person_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS letters_registration_version_key ON letters (registration_id, kind, version) WHERE registration_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS letters_learner_version_key ON letters (person_id, kind, version) WHERE kind = 'learner_confirmation';

ALTER TABLE letter_texts DROP CONSTRAINT IF EXISTS letter_texts_kind_check;
ALTER TABLE letter_texts ADD CONSTRAINT letter_texts_kind_check CHECK (kind IN (
  'offer',
  'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
  'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request'
));
