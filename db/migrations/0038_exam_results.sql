-- An exam candidate's result and its handover, and the confirmation of participation (2026-10-17;
-- docs/ADMIN_WORKSPACE.md §Exams).
--
-- telc sends the results about six weeks after the sitting; SchoolMan records none of them — it says
-- "results are here, collect them" (`ErgebnisseDa_Exam`) and certifies participation
-- (`Confirmation.ParticiptionExam_Booking`) without anything saying the candidate came. Here each
-- part the candidate sat has an outcome — passed, failed, or did not come — never free text
-- (docs/FILEMAKER_LESSONS.md §5); the overall result is worked out from the parts, not stored.
-- Points stay on telc's certificate.

CREATE TABLE IF NOT EXISTS exam_results (
  booking_id uuid PRIMARY KEY REFERENCES bookings (id) ON DELETE CASCADE,
  written text CONSTRAINT exam_results_written_check CHECK (written IN ('passed', 'failed', 'absent')),
  oral text CONSTRAINT exam_results_oral_check CHECK (oral IN ('passed', 'failed', 'absent')),
  recorded_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  recorded_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  -- The result and the certificate handed over at the office: when, by whom, and to whom if not the candidate.
  collected_at timestamptz,
  collected_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  collected_note text,
  CONSTRAINT exam_results_some_part CHECK (written IS NOT NULL OR oral IS NOT NULL)
);

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_kind_check;
ALTER TABLE letters ADD CONSTRAINT letters_kind_check CHECK (kind IN (
  'offer',
  'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
  'exam_confirmation', 'exam_invitation', 'exam_results', 'exam_participation',
  'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request'
));

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_subject_check;
ALTER TABLE letters ADD CONSTRAINT letters_subject_check CHECK (
  (kind = 'offer') = (offer_id IS NOT NULL)
  AND (kind IN ('booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
                'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation',
                'exam_confirmation', 'exam_invitation', 'exam_results', 'exam_participation'))
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
  'exam_confirmation', 'exam_invitation', 'exam_results', 'exam_participation',
  'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request'
));

-- A sitting is prepared (draft: not on the website), on offer (scheduled: on the registration form
-- until its deadline), or called off (cancelled). The workspace creates and edits them from now on.
ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_status_check;
ALTER TABLE exam_sessions ADD CONSTRAINT exam_sessions_status_check CHECK (status IN ('draft', 'scheduled', 'cancelled'));
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;
