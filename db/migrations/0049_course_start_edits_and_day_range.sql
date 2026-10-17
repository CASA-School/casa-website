-- A course start made in the workspace, and lesson days only inside their course (2026-10-17;
-- docs/ADMIN_WORKSPACE.md §Courses, docs/KURSPLANUNG.md §Lesson days).
--
-- `created_by`: who planned a start here („Termin planen"). The seeds and SchoolMan's import leave it
-- empty. Only a start made here, and never used, may be deleted — the seeds put theirs back on every
-- release, as with exam sittings — and only its dates may be moved.
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;

-- A board day becomes its group's course's day only when it falls inside the course: a planning month
-- opens on the Monday of the week the 1st falls in, which can be before a start's first day or after
-- the previous start's last one. The rest as in 0045.
CREATE OR REPLACE FUNCTION link_course_days() RETURNS void
LANGUAGE sql AS $$
  UPDATE course_days d SET group_id = g.id
    FROM course_groups g
   WHERE d.group_id IS NULL AND d.course_id IS NOT NULL
     AND g.course_id = d.course_id AND g.group_index = d.group_index
     AND d.on_date >= planning_month_start(g.month)
     AND d.on_date < planning_month_start((g.month + interval '1 month')::date)
     AND NOT EXISTS (SELECT 1 FROM course_days o WHERE o.group_id = g.id AND o.on_date = d.on_date);
  UPDATE course_days d SET course_id = g.course_id, group_index = g.group_index
    FROM course_groups g
    JOIN courses c ON c.id = g.course_id
    JOIN course_instances i ON i.id = c.course_instance_id
   WHERE d.group_id = g.id AND d.course_id IS NULL AND g.course_id IS NOT NULL
     AND d.on_date BETWEEN i.start_date AND i.end_date
     AND NOT EXISTS (SELECT 1 FROM course_days o WHERE o.course_id = g.course_id AND o.group_index = g.group_index AND o.on_date = d.on_date);
$$;

-- What the board wrote outside a course before it was refused (a teacher five days before the start):
-- not a lesson day of that course. SchoolMan's own days are left as read.
DELETE FROM course_days d
 USING courses c, course_instances i
 WHERE c.id = d.course_id AND i.id = c.course_instance_id
   AND d.group_id IS NOT NULL AND d.filemaker_id IS NULL
   AND (d.on_date < i.start_date OR d.on_date > i.end_date);
