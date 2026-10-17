-- An exam booking's letters (2026-10-17; docs/LETTERS.md §Exam letters).
--
-- SchoolMan's `Confirmation.Exam_Booking` (401 in 2026) confirms the exam and asks for the fee within
-- a week, and says nothing about the venue, the ID or what happens on a no-show; its invitations
-- (`InvitationExam.Student_Booking_telcB2`/`_telcC1`) are circulars with every candidate's address on
-- one letter, the venue and times typed into the text; `ErgebnisseDa_Exam` says the results can be
-- collected. Here each is a letter about one exam booking. The receipt, the reminder, the overview
-- and the cancellation are the booking letters there are; an exam's waiting list writes the course
-- waiting list's three letters.

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_kind_check;
ALTER TABLE letters ADD CONSTRAINT letters_kind_check CHECK (kind IN (
  'offer',
  'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
  'exam_confirmation', 'exam_invitation', 'exam_results',
  'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request'
));

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_subject_check;
ALTER TABLE letters ADD CONSTRAINT letters_subject_check CHECK (
  (kind = 'offer') = (offer_id IS NOT NULL)
  AND (kind IN ('booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
                'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
                'exam_confirmation', 'exam_invitation', 'exam_results'))
      = (booking_id IS NOT NULL)
  AND (kind IN ('waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place')) = (waitlist_entry_id IS NOT NULL)
  AND (kind IN ('registration_test_request', 'registration_deposit_request')) = (registration_id IS NOT NULL)
  AND (kind <> 'learner_confirmation' OR person_id IS NOT NULL)
);

ALTER TABLE letter_texts DROP CONSTRAINT IF EXISTS letter_texts_kind_check;
ALTER TABLE letter_texts ADD CONSTRAINT letter_texts_kind_check CHECK (kind IN (
  'offer',
  'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
  'exam_confirmation', 'exam_invitation', 'exam_results',
  'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request'
));
