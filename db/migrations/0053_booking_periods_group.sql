-- A period's group (2026-10-17; docs/ADMIN_WORKSPACE.md §Learners from SchoolMan).
--
-- A level's parallel groups are courses of their own in SchoolMan (4775, 5054, 5055), and a learner's
-- period there names theirs: each number's page lists its own learners. Kept as the group's position in
-- `courses.filemaker_group_ids` (as 0051 counts them); empty for a booking made here, which names no
-- group yet — a course page lists those under every group.
ALTER TABLE booking_periods ADD COLUMN IF NOT EXISTS group_index smallint;
