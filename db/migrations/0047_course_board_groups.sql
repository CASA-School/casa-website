-- An intensive course's board groups (2026-10-17; docs/ADMIN_WORKSPACE.md §Lesson days).
--
-- Kursplanung's board plans the intensive courses' lesson days. When a course's days are made — from
-- its weekly plan on the course page, or read from SchoolMan — its groups on the board are made too, so
-- the board shows them: the month its start opens (phase 1) and the next (phase 2), in its shift, at
-- its level, one per parallel group. A group the board already has is left as it is;
-- `link_course_groups()` gives it its course.
CREATE OR REPLACE FUNCTION make_course_board_groups(course uuid) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO course_groups (month, shift, level, phase, group_index, course_id)
  SELECT (date_trunc('month', i.start_date + 14) + m.add)::date, s.shift, left(c.level_code, -2), m.phase, g, c.id
    FROM courses c
    JOIN course_instances i ON i.id = c.course_instance_id
    JOIN course_types t ON t.id = i.course_type_id
    CROSS JOIN LATERAL (
      SELECT coalesce(
               CASE WHEN coalesce(c.session, i.session) IN ('morning', 'afternoon') THEN coalesce(c.session, i.session) END,
               CASE WHEN substring(i.schedule->>'time' from '^\d{1,2}')::int < 12 THEN 'morning'
                    WHEN substring(i.schedule->>'time' from '^\d{1,2}')::int < 17 THEN 'afternoon' END) AS shift
    ) s
    CROSS JOIN (VALUES (interval '0 months', '1'), (interval '1 month', '2')) AS m(add, phase)
    CROSS JOIN generate_series(1, least(greatest(c.groups, 1), 9)) AS g
   WHERE c.id = course AND t.format = 'intensive' AND c.status <> 'cancelled' AND i.status <> 'cancelled'
     AND s.shift IS NOT NULL AND c.level_code LIKE '%.1'
     -- The board's levels (0014's `course_groups_level_check`).
     AND left(c.level_code, -2) IN ('A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C1H')
  ON CONFLICT (month, shift, level, phase, group_index) DO NOTHING;
$$;
