-- 0079 — A planning month is CASA's course block, and C1H is on the board (2026-10-22).
--
-- The planners' sheets („Vormittag November", „Nachmittag November 2026") run November from the
-- intensive start of 26 October to 20 November. A planning month is the block an intensive start opens
-- — the start whose third week falls in the month, as `planMonthOfStart` already names it — up to the
-- next start: four weeks, five at Easter, with the Christmas break at the end of December's. The
-- calendar rule it replaces (the Monday of the week the 1st falls in) put 26–30 October into October,
-- where no group of that start exists, and 23–27 November into November, after the morning had moved
-- on to .2. It stays for a month no intensive start opens yet. docs/KURSPLANUNG.md §Planning months.

CREATE OR REPLACE FUNCTION planning_month_start(month date) RETURNS date
LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    (SELECT min(ci.start_date)
       FROM course_instances ci
       JOIN course_types ct ON ct.id = ci.course_type_id
      WHERE ct.format = 'intensive' AND ci.status <> 'cancelled'
        AND date_trunc('month', ci.start_date + 14) = date_trunc('month', month)),
    CASE extract(isodow FROM date_trunc('month', month)::date)
      WHEN 6 THEN date_trunc('month', month)::date + 2
      WHEN 7 THEN date_trunc('month', month)::date + 1
      ELSE date_trunc('month', month)::date - (extract(isodow FROM date_trunc('month', month)::date)::int - 1)
    END)
$$;

-- The planning month a day belongs to (its first of the month): the one whose block holds it.
CREATE OR REPLACE FUNCTION planning_month_of(day date) RETURNS date
LANGUAGE sql STABLE AS $$
  SELECT m
    FROM (SELECT (date_trunc('month', day) + k * interval '1 month')::date AS m FROM generate_series(-1, 1) AS k) x
   WHERE day >= planning_month_start(m) AND day < planning_month_start((m + interval '1 month')::date)
   ORDER BY m
   LIMIT 1
$$;

-- C1H is SchoolMan's „telc Deutsch C1 Hochschule – Prüfungsvorbereitung": an exam preparation of one
-- block, taught beside the intensive classes and planned with them on the sheet. Its board group is
-- the block's C1H in the course's shift, in the phase that shift has that month.
CREATE OR REPLACE FUNCTION is_c1h_course(course uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses c
      JOIN course_instances i ON i.id = c.course_instance_id
      JOIN course_types t ON t.id = i.course_type_id
     WHERE c.id = course AND t.format = 'exam preparation' AND c.status <> 'cancelled' AND i.status <> 'cancelled'
       AND coalesce(c.title, i.title) ILIKE '%C1 Hochschule%')
$$;

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

  INSERT INTO course_groups (month, shift, level, phase, group_index, course_id)
  SELECT b.month, b.shift, 'C1H',
         coalesce((SELECT o.phase FROM course_groups o WHERE o.month = b.month AND o.shift = b.shift AND o.level <> 'C1H'
                    GROUP BY o.phase ORDER BY count(*) DESC LIMIT 1), '1'),
         1, course
    FROM (SELECT date_trunc('month', i.start_date + 14)::date AS month,
                 coalesce(
                   CASE WHEN coalesce(c.session, i.session) IN ('morning', 'afternoon') THEN coalesce(c.session, i.session) END,
                   CASE WHEN substring(i.schedule->>'time' from '^\d{1,2}')::int < 12 THEN 'morning'
                        WHEN substring(i.schedule->>'time' from '^\d{1,2}')::int < 17 THEN 'afternoon' END) AS shift
            FROM courses c JOIN course_instances i ON i.id = c.course_instance_id
           WHERE c.id = course AND is_c1h_course(course)) b
   WHERE b.shift IS NOT NULL
  ON CONFLICT (month, shift, level, phase, group_index) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION link_course_groups() RETURNS void
LANGUAGE sql AS $$
  UPDATE course_groups g SET course_id = c.id
    FROM courses c
    JOIN course_instances i ON i.id = c.course_instance_id
    JOIN course_types t ON t.id = i.course_type_id
   WHERE g.course_id IS NULL
     AND t.format = 'intensive' AND i.status <> 'cancelled' AND c.status <> 'cancelled'
     AND c.level_code = g.level || '.1'
     AND date_trunc('month', i.start_date + 14)::date = CASE WHEN g.phase = '1' THEN g.month ELSE (g.month - interval '1 month')::date END
     AND coalesce(
           CASE WHEN i.session IN ('morning', 'afternoon') THEN i.session END,
           CASE WHEN substring(i.schedule->>'time' from '^\d{1,2}')::int < 12 THEN 'morning'
                WHEN substring(i.schedule->>'time' from '^\d{1,2}')::int < 17 THEN 'afternoon' END,
           g.shift) = g.shift;

  -- A C1H group typed on the board before its course came across: the block's C1H course in its shift.
  UPDATE course_groups g SET course_id = c.id
    FROM courses c
    JOIN course_instances i ON i.id = c.course_instance_id
   WHERE g.course_id IS NULL AND g.level = 'C1H' AND g.group_index = 1
     AND is_c1h_course(c.id)
     AND date_trunc('month', i.start_date + 14)::date = g.month
     AND coalesce(CASE WHEN coalesce(c.session, i.session) IN ('morning', 'afternoon') THEN coalesce(c.session, i.session) END, g.shift) = g.shift
     AND NOT EXISTS (SELECT 1 FROM course_groups o WHERE o.course_id = c.id);
$$;

-- Days linked under the old months go to the group whose block holds them now.
UPDATE course_days d SET group_id = NULL
  FROM course_groups g
 WHERE d.group_id = g.id AND d.course_id IS NOT NULL
   AND (d.on_date < planning_month_start(g.month) OR d.on_date >= planning_month_start((g.month + interval '1 month')::date));

SELECT make_course_board_groups(c.id) FROM courses c WHERE is_c1h_course(c.id);
SELECT link_course_groups();
SELECT link_course_days();
SELECT learn_kursplanung();
