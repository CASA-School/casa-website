-- More of a booking's letters (Rahman, 2026-10-16: "check the types of letters. there are more types";
-- docs/LETTERS.md). SchoolMan writes 128 kinds; these are the ones the workspace has the data for,
-- by how often they went out in 2026: the letter for the embassy (visa), the show-up letters (first
-- and last call), missing information, the payment reminder, the payments overview, the course-start
-- letter, the enrolment confirmation (SchoolMan's student card) and the cancellation confirmation.
-- All are about one booking.

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_kind_check;
ALTER TABLE letters ADD CONSTRAINT letters_kind_check CHECK (kind IN (
  'offer',
  'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
  'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place'
));

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_subject_check;
ALTER TABLE letters ADD CONSTRAINT letters_subject_check CHECK (
  (kind = 'offer') = (offer_id IS NOT NULL)
  AND (kind IN ('booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
                'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation'))
      = (booking_id IS NOT NULL)
  AND (kind IN ('waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place')) = (waitlist_entry_id IS NOT NULL)
);

ALTER TABLE letter_texts DROP CONSTRAINT IF EXISTS letter_texts_kind_check;
ALTER TABLE letter_texts ADD CONSTRAINT letter_texts_kind_check CHECK (kind IN (
  'offer',
  'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
  'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place'
));
