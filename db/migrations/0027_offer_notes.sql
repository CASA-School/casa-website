-- Notes on an offer (2026-10-15): the offer page carries the same „Notizen und
-- Verlauf" as every other record — what the school said on the phone, what to
-- change in the next version — so `staff_notes` accepts the offer as a subject.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes
  ADD CONSTRAINT staff_notes_entity_check CHECK (
    entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person', 'offer'])
  );
