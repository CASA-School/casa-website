-- 0089 — Notes on an organisation, beside its history (2026-10-26).
--
-- Rahman: SchoolMan's history about a company or an agency belongs on the organisation's page. The
-- bridge brings the work-log lines that name the organisation (about itself, or about a learner the
-- workspace holds) as `staff_activity` rows of the organisation; the page shows them in „Notizen und
-- Verlauf", where a colleague can also add a note of their own, as on a booking.

ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (
  entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person', 'offer', 'group_visit',
                      'accommodation', 'organisation'])
);
