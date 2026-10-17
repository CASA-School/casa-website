-- A lesson day merged with another group (2026-10-17; docs/ADMIN_WORKSPACE.md §Lesson days).
--
-- SchoolMan marks a day „Zusammenlegung" when a group is taught together with another that day — most
-- often because its teacher is away: the group then has no teacher of its own, or its teacher takes
-- both. It is not a day called off, and not one waiting for a teacher.
ALTER TABLE course_days ADD COLUMN IF NOT EXISTS merged boolean NOT NULL DEFAULT false;

-- The first SchoolMan import wrote it as a note.
UPDATE course_days SET merged = true, note = NULL WHERE note = 'Zusammengelegt' AND filemaker_id IS NOT NULL;

-- SchoolMan sometimes records the room or teacher a day replaced as the same one: not a change.
UPDATE course_days SET replaced_room_id = NULL WHERE replaced_room_id = room_id;
UPDATE course_days SET replaced_teacher_id = NULL WHERE replaced_teacher_id = teacher_id;
