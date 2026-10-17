-- SchoolMan's learners per course, group and week (2026-10-17; docs/ADMIN_WORKSPACE.md §Courses).
--
-- A level's parallel groups sit in separate rooms with separate teachers, and the course list shows
-- them one by one (Rahman). SchoolMan keeps each group as a course of its own, so its learners are
-- counted per group: the group is the position of its SchoolMan number in `courses.filemaker_group_ids`.
-- A course's learners are its groups' together. The next read writes per group.
ALTER TABLE course_week_learners ADD COLUMN IF NOT EXISTS group_index smallint NOT NULL DEFAULT 1;
ALTER TABLE course_week_learners DROP CONSTRAINT IF EXISTS course_week_learners_pkey;
ALTER TABLE course_week_learners ADD PRIMARY KEY (course_id, group_index, monday);
