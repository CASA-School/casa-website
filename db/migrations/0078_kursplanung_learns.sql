-- Kursplanung learns from SchoolMan's lesson days (2026-10-22, docs/KURSPLANUNG.md §What SchoolMan's days teach).
--
-- The teachers' rules came from the September sheet; SchoolMan's lesson days since then show who really
-- teaches which level, on which weekdays and in which shift, and the board warned on 44 such pairs
-- („A1 nicht hinterlegt") that CASA had long decided. And 107 of 117 groups had no pair, so Kurse showed
-- „—" beside a full board. `learn_kursplanung()` closes both, and only ever adds:
-- - a teacher's levels gain every level SchoolMan has them teaching (cover days included: covering a
--   level is teaching it), their weekdays every weekday, their shifts every shift taught as the class's
--   own teacher (a cover in the other shift stays a cover);
-- - a group without a pair gets the teacher who holds most of each half of its weeks that month.
-- Days the board wrote (no `filemaker_id`) teach the rules nothing: a planner who lays a teacher on a level
-- not listed sees the warning they chose to accept. The bridge runs it after every lesson-day import.

CREATE OR REPLACE FUNCTION learn_kursplanung() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  teachers integer;
  pairs integer;
BEGIN
  WITH taught AS (
    SELECT cd.teacher_id,
           array_agg(DISTINCT g.level) AS levels,
           array_agg(DISTINCT g.shift) FILTER (WHERE NOT cd.is_substitute) AS shifts,
           array_agg(DISTINCT (ARRAY['Mo', 'Di', 'Mi', 'Do', 'Fr'])[extract(isodow FROM cd.on_date)::int])
             FILTER (WHERE extract(isodow FROM cd.on_date) <= 5) AS weekdays
      FROM course_days cd
      JOIN course_groups g ON g.id = cd.group_id
     WHERE cd.filemaker_id IS NOT NULL AND cd.teacher_id IS NOT NULL AND NOT cd.cancelled
     GROUP BY cd.teacher_id
  ), learnt AS (
    SELECT s.id,
           ARRAY(SELECT v FROM unnest(ARRAY['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C1H']) WITH ORDINALITY o(v, n)
                  WHERE v = ANY (s.levels) OR v = ANY (t.levels) ORDER BY n) AS levels,
           ARRAY(SELECT v FROM unnest(ARRAY['morning', 'afternoon']) WITH ORDINALITY o(v, n)
                  WHERE v = ANY (s.shifts) OR v = ANY (coalesce(t.shifts, '{}')) ORDER BY n) AS shifts,
           ARRAY(SELECT v FROM unnest(ARRAY['Mo', 'Di', 'Mi', 'Do', 'Fr']) WITH ORDINALITY o(v, n)
                  WHERE v = ANY (s.weekdays) OR v = ANY (coalesce(t.weekdays, '{}')) ORDER BY n) AS weekdays
      FROM staff_members s
      JOIN taught t ON t.teacher_id = s.id
  )
  UPDATE staff_members s
     SET levels = l.levels, shifts = l.shifts, weekdays = l.weekdays, updated_at = timezone('utc', now())
    FROM learnt l
   WHERE l.id = s.id
     AND (cardinality(l.levels) > cardinality(s.levels) OR cardinality(l.shifts) > cardinality(s.shifts)
          OR cardinality(l.weekdays) > cardinality(s.weekdays));
  GET DIAGNOSTICS teachers = ROW_COUNT;

  -- The halves of the week as the board has them: Mo–Mi | Do–Fr in the morning, Mo–Di | Mi–Do in the afternoon.
  -- A pair is two people (Kurse refuses one person in both halves), so the second half goes to whoever
  -- holds most of it after the first.
  WITH days AS (
    SELECT g.id AS group_id, cd.teacher_id,
           CASE WHEN extract(isodow FROM cd.on_date) <= CASE g.shift WHEN 'morning' THEN 3 ELSE 2 END THEN 1 ELSE 2 END AS half
      FROM course_groups g
      JOIN course_days cd ON cd.group_id = g.id
     WHERE (g.teacher_first IS NULL OR g.teacher_second IS NULL)
       AND cd.teacher_id IS NOT NULL AND NOT cd.is_substitute AND NOT cd.cancelled
       AND cd.on_date >= planning_month_start(g.month)
       AND cd.on_date < planning_month_start((g.month + interval '1 month')::date)
  ), counts AS (
    SELECT group_id, half, teacher_id, count(*) AS n FROM days GROUP BY group_id, half, teacher_id
  ), firsts AS (
    SELECT g.id, g.teacher_second,
           coalesce(g.teacher_first,
                    (SELECT c.teacher_id FROM counts c
                      WHERE c.group_id = g.id AND c.half = 1 AND c.teacher_id IS DISTINCT FROM g.teacher_second
                      ORDER BY c.n DESC, c.teacher_id LIMIT 1)) AS first
      FROM course_groups g
     WHERE g.id IN (SELECT group_id FROM counts)
  ), pair AS (
    SELECT f.id, f.first,
           coalesce(f.teacher_second,
                    (SELECT c.teacher_id FROM counts c
                      WHERE c.group_id = f.id AND c.half = 2 AND c.teacher_id IS DISTINCT FROM f.first
                      ORDER BY c.n DESC, c.teacher_id LIMIT 1)) AS second
      FROM firsts f
  )
  UPDATE course_groups g
     SET teacher_first = p.first, teacher_second = p.second
    FROM pair p
   WHERE p.id = g.id
     AND (g.teacher_first IS DISTINCT FROM p.first OR g.teacher_second IS DISTINCT FROM p.second);
  GET DIAGNOSTICS pairs = ROW_COUNT;

  RETURN teachers + pairs;
END;
$$;

SELECT learn_kursplanung();
