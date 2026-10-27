-- 0096 — Notes on an exam sitting, beside its history (2026-10-27).
--
-- Rahman: the Prüfungen interface „still with a more basic interface". A sitting's page is a record in
-- tabs now, and its last tab is „Notizen und Verlauf" as on a booking or a course: what was changed on the
-- sitting (`staff_activity`, entity `exam_session`) and what the team writes about it — a room booked for
-- the oral part, an examiner who stands in, what telc said on the phone.

ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (
  entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person', 'offer', 'group_visit',
                      'accommodation', 'organisation', 'course', 'exam_session'])
);
