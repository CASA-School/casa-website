-- Letters to hosts, and how a letter went out (2026-10-18; docs/schoolman/letters-and-history.md,
-- docs/schoolman/accommodation.md). SchoolMan writes a host a letter about a learner's stay
-- (`StatementLandlord`, 752); it comes across as a SchoolMan letter of the place (and of the booking it is
-- about), with no learner as its addressee. `WorkFlowLetter` logs whether a letter was e-mailed or printed.
ALTER TABLE letters ADD COLUMN IF NOT EXISTS accommodation_id uuid REFERENCES accommodations (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS letters_accommodation_idx ON letters (accommodation_id, sent_at DESC) WHERE accommodation_id IS NOT NULL;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS sent_via text;
ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_sent_via_check;
ALTER TABLE letters ADD CONSTRAINT letters_sent_via_check CHECK (sent_via IS NULL OR sent_via IN ('email', 'print'));

-- A SchoolMan letter is to a learner or, now, to a place.
ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_subject_check;
ALTER TABLE letters ADD CONSTRAINT letters_subject_check CHECK (
  ((kind = 'offer') = (offer_id IS NOT NULL))
  AND ((kind = 'schoolman') OR ((kind = ANY (ARRAY['booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
       'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation', 'exam_confirmation', 'exam_invitation',
       'exam_results', 'exam_participation'])) = (booking_id IS NOT NULL)))
  AND ((kind = ANY (ARRAY['waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place'])) = (waitlist_entry_id IS NOT NULL))
  AND ((kind = ANY (ARRAY['registration_test_request', 'registration_deposit_request'])) = (registration_id IS NOT NULL))
  AND ((kind <> 'learner_confirmation') OR (person_id IS NOT NULL))
  AND ((kind <> 'schoolman') OR (person_id IS NOT NULL) OR (accommodation_id IS NOT NULL))
);
