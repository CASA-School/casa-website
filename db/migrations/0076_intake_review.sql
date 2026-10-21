-- 0076 — Intake is reviewed before it becomes a learner (Rahman, 2026-10-21).
--
-- „Anyone can contact us, but they shouldn't be directly in Teilnehmende." A website enquiry or
-- registration still creates its person in the same transaction (one human, one row, from first
-- contact: docs/FILEMAKER_LESSONS.md §1.1), but OFF the register: `people.listed` is false until a
-- colleague acts — registers them for a course, puts them on a waiting list, links them to someone
-- already listed, or lists them as a future learner. An agency's or a company's enquiry goes to its
-- organisation instead (`enquiries.organisation_id`). Spam can be deleted (`enquiries.deleted_at`).
-- A registration can be completed or corrected by a colleague; what the visitor sent is kept
-- beside it (`original`). And a registration for a full or closed course can be offered a later
-- start by letter (`registration_later_course`).

ALTER TABLE people ADD COLUMN IF NOT EXISTS listed boolean NOT NULL DEFAULT true;

-- Who only ever wrote to CASA from the website, with nothing done since: off the register.
UPDATE people p SET listed = false
 WHERE p.created_by = 'public-site'
   AND p.deleted_at IS NULL
   AND p.merged_into IS NULL
   AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.person_id = p.id AND b.deleted_at IS NULL)
   AND NOT EXISTS (SELECT 1 FROM waitlist_entries w WHERE w.person_id = p.id)
   AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.person_id = p.id)
   AND NOT EXISTS (SELECT 1 FROM letters l WHERE l.person_id = p.id)
   AND NOT EXISTS (SELECT 1 FROM person_tests t WHERE t.person_id = p.id)
   AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.person_id = p.id)
   AND NOT EXISTS (SELECT 1 FROM people d WHERE d.merged_into = p.id);

CREATE INDEX IF NOT EXISTS people_listed_idx ON people (listed) WHERE NOT listed;

ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS enquiries_organisation_idx ON enquiries (organisation_id) WHERE organisation_id IS NOT NULL;

-- A colleague's corrections: the visitor's own values, kept once, on the first edit.
ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS original jsonb;
ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS edited_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;

-- „Späteren Kurs anbieten": a registration's third letter.
ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_kind_check;
ALTER TABLE letters ADD CONSTRAINT letters_kind_check CHECK (kind IN (
  'offer', 'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation', 'exam_confirmation',
  'exam_invitation', 'exam_results', 'exam_participation', 'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request', 'registration_later_course', 'schoolman'
));

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_subject_check;
ALTER TABLE letters ADD CONSTRAINT letters_subject_check CHECK (
  ((kind = 'offer') = (offer_id IS NOT NULL))
  AND ((kind = 'schoolman') OR ((kind = ANY (ARRAY['booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
       'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation', 'exam_confirmation', 'exam_invitation',
       'exam_results', 'exam_participation'])) = (booking_id IS NOT NULL)))
  AND ((kind = ANY (ARRAY['waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place'])) = (waitlist_entry_id IS NOT NULL))
  AND ((kind = ANY (ARRAY['registration_test_request', 'registration_deposit_request', 'registration_later_course'])) = (registration_id IS NOT NULL))
  AND ((kind <> 'learner_confirmation') OR (person_id IS NOT NULL))
  AND ((kind <> 'schoolman') OR (person_id IS NOT NULL) OR (accommodation_id IS NOT NULL))
);

ALTER TABLE letter_texts DROP CONSTRAINT IF EXISTS letter_texts_kind_check;
ALTER TABLE letter_texts ADD CONSTRAINT letter_texts_kind_check CHECK (kind IN (
  'offer', 'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation', 'exam_confirmation',
  'exam_invitation', 'exam_results', 'exam_participation', 'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request', 'registration_later_course'
));
