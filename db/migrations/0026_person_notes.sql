-- Notes on a person (2026-10-15): the person page carries the same „Notizen und
-- Verlauf" as the inbox records, so `staff_notes` accepts the person as a subject.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes
  ADD CONSTRAINT staff_notes_entity_check CHECK (
    entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person'])
  );
