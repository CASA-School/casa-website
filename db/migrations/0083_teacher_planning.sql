-- 0083 — A teacher's planning, as SchoolMan's internal section and the planners know it (2026-10-22).
--
-- Rahman: „Ayse is planned Monday and Tuesday in the morning and Wednesday and Thursday in the afternoon;
-- Bettina W. and Connie teach evenings only; Fatma, Kathrin and Ulrich are inactive; Julia teaches online
-- courses; Martin only examines; Meike and Milena are substitutes; Claudia F. Monday to Wednesday mornings,
-- Helga Thursday and Friday mornings, Helmut Wednesday and Thursday afternoons; Nilar is employed but not
-- active until February 2027." One list of weekdays for every shift could not say Ayse's week, and nothing
-- said who is on the board at all. SchoolMan's staff record (its „Intern" section) keeps: active as a teacher
-- (`_ID_ActiveTeacher`), the course types taught (`_ID_CourseTypeReference`), weekdays and times of day
-- (`_ID_WeekDay`, `_ID_DayTimeReference`), the levels.
--
-- - `morning_days`, `afternoon_days`, `evening_days`: the weekdays per time of day; they replace `shifts`
--   and `weekdays` (a shift is taught where its days are not empty).
-- - `course_kinds`: what a colleague teaches, SchoolMan's course types; Kursplanung plans those who teach
--   intensive courses (or whose kinds nobody has set yet).
-- - `cover_only`: on the board as a cover, never in a group's regular pair.
-- - `teaching_active`, `teaching_from`: active as a teacher, and from when (still employed, not planned before).
-- - `planning_set_at`, `planning_set_by`: set by hand — the bridge leaves those rules alone from then on.

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS morning_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS afternoon_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evening_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS course_kinds text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cover_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS teaching_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS teaching_from date,
  ADD COLUMN IF NOT EXISTS planning_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS planning_set_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;

ALTER TABLE staff_members DROP CONSTRAINT IF EXISTS staff_members_days_check;
ALTER TABLE staff_members ADD CONSTRAINT staff_members_days_check CHECK (
  morning_days <@ ARRAY['Mo', 'Di', 'Mi', 'Do', 'Fr'] AND afternoon_days <@ ARRAY['Mo', 'Di', 'Mi', 'Do']
  AND evening_days <@ ARRAY['Mo', 'Di', 'Mi', 'Do', 'Fr']);
ALTER TABLE staff_members DROP CONSTRAINT IF EXISTS staff_members_course_kinds_check;
ALTER TABLE staff_members ADD CONSTRAINT staff_members_course_kinds_check CHECK (course_kinds <@ ARRAY[
  'intensive', 'evening', 'special', 'company', 'online', 'exam_prep', 'single', 'closed_group', 'junior', 'summer', 'superintensive', 'extra']);

-- Today's rules, per shift: the weekdays of each shift taught (the afternoon has no Friday).
UPDATE staff_members SET
  morning_days = CASE WHEN 'morning' = ANY (shifts)
                      THEN ARRAY(SELECT v FROM unnest(ARRAY['Mo', 'Di', 'Mi', 'Do', 'Fr']) WITH ORDINALITY o(v, n) WHERE v = ANY (weekdays) ORDER BY n)
                      ELSE '{}' END,
  afternoon_days = CASE WHEN 'afternoon' = ANY (shifts)
                        THEN ARRAY(SELECT v FROM unnest(ARRAY['Mo', 'Di', 'Mi', 'Do']) WITH ORDINALITY o(v, n) WHERE v = ANY (weekdays) ORDER BY n)
                        ELSE '{}' END;

ALTER TABLE staff_members DROP COLUMN IF EXISTS shifts, DROP COLUMN IF EXISTS weekdays;

-- What the planners said, by name; set by hand, so the bridge keeps it.
CREATE OR REPLACE FUNCTION pg_temp.set_planning(first text, last text, changes jsonb) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE staff_members s SET
    morning_days = CASE WHEN changes ? 'morning' THEN ARRAY(SELECT jsonb_array_elements_text(changes -> 'morning')) ELSE s.morning_days END,
    afternoon_days = CASE WHEN changes ? 'afternoon' THEN ARRAY(SELECT jsonb_array_elements_text(changes -> 'afternoon')) ELSE s.afternoon_days END,
    evening_days = CASE WHEN changes ? 'evening' THEN ARRAY(SELECT jsonb_array_elements_text(changes -> 'evening')) ELSE s.evening_days END,
    course_kinds = CASE WHEN changes ? 'kinds' THEN ARRAY(SELECT jsonb_array_elements_text(changes -> 'kinds')) ELSE s.course_kinds END,
    cover_only = coalesce((changes ->> 'cover')::boolean, s.cover_only),
    teaching_active = coalesce((changes ->> 'active')::boolean, s.teaching_active),
    teaching_from = coalesce((changes ->> 'from')::date, s.teaching_from),
    planning_set_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
   FROM people p
  WHERE p.id = s.person_id AND split_part(btrim(p.first_name), ' ', 1) = first AND btrim(p.last_name) = last;
END $$;

SELECT pg_temp.set_planning('Ayse', 'Telli', '{"morning": ["Mo", "Di"], "afternoon": ["Mi", "Do"], "kinds": ["intensive"]}');
SELECT pg_temp.set_planning('Bettina', 'Waalkes', '{"morning": [], "afternoon": [], "kinds": ["evening"]}');
SELECT pg_temp.set_planning('Cornelia', 'Becker', '{"morning": [], "afternoon": [], "kinds": ["evening"]}');
SELECT pg_temp.set_planning('Fatma', 'Ercan', '{"active": false}');
SELECT pg_temp.set_planning('Julia', 'Tazreiter', '{"morning": [], "afternoon": [], "kinds": ["online"]}');
SELECT pg_temp.set_planning('Kathrin', 'Sinschek', '{"active": false}');
SELECT pg_temp.set_planning('Meike', 'Djuranovic', '{"cover": true}');
SELECT pg_temp.set_planning('Milena', 'Thurow', '{"cover": true}');
SELECT pg_temp.set_planning('Ulrich', 'Imig', '{"active": false}');
SELECT pg_temp.set_planning('Claudia', 'Fecke', '{"morning": ["Mo", "Di", "Mi"], "afternoon": []}');
SELECT pg_temp.set_planning('Helga', 'Eber', '{"morning": ["Do", "Fr"], "afternoon": []}');
SELECT pg_temp.set_planning('Helmut', 'Kehlenbeck', '{"morning": [], "afternoon": ["Mi", "Do"]}');
SELECT pg_temp.set_planning('Nilar', 'Myo', '{"from": "2027-02-01"}');

-- Martin Kirchhofer examines for telc and no longer teaches at CASA: the examiner without the teacher.
INSERT INTO staff_member_roles (staff_member_id, role_code)
SELECT s.id, 'examiner' FROM staff_members s JOIN people p ON p.id = s.person_id
 WHERE split_part(btrim(p.first_name), ' ', 1) = 'Martin' AND btrim(p.last_name) = 'Kirchhofer'
ON CONFLICT DO NOTHING;
DELETE FROM staff_member_roles r USING staff_members s, people p
 WHERE r.staff_member_id = s.id AND p.id = s.person_id AND r.role_code = 'teaching'
   AND split_part(btrim(p.first_name), ' ', 1) = 'Martin' AND btrim(p.last_name) = 'Kirchhofer';
UPDATE staff_members s SET planning_set_at = timezone('utc', now()), teaching_active = false
  FROM people p WHERE p.id = s.person_id AND split_part(btrim(p.first_name), ' ', 1) = 'Martin' AND btrim(p.last_name) = 'Kirchhofer';

-- Kursplanung keeps learning levels from SchoolMan's lesson days, and the pairs of groups without one —
-- but no longer weekdays or shifts: when someone is there is the planners' word (0078 learnt them while
-- nothing else said it; a cover day in the other shift is not a shift).
CREATE OR REPLACE FUNCTION learn_kursplanung() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  teachers integer;
  pairs integer;
BEGIN
  WITH taught AS (
    SELECT cd.teacher_id, array_agg(DISTINCT g.level) AS levels
      FROM course_days cd JOIN course_groups g ON g.id = cd.group_id
     WHERE cd.filemaker_id IS NOT NULL AND cd.teacher_id IS NOT NULL AND NOT cd.cancelled
     GROUP BY cd.teacher_id
  ), learnt AS (
    SELECT s.id,
           ARRAY(SELECT v FROM unnest(ARRAY['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C1H']) WITH ORDINALITY o(v, n)
                  WHERE v = ANY (s.levels) OR v = ANY (t.levels) ORDER BY n) AS levels
      FROM staff_members s JOIN taught t ON t.teacher_id = s.id
  )
  UPDATE staff_members s SET levels = l.levels, updated_at = timezone('utc', now())
    FROM learnt l WHERE l.id = s.id AND cardinality(l.levels) > cardinality(s.levels);
  GET DIAGNOSTICS teachers = ROW_COUNT;

  WITH days AS (
    SELECT g.id AS group_id, cd.teacher_id,
           CASE WHEN extract(isodow FROM cd.on_date) <= CASE g.shift WHEN 'morning' THEN 3 ELSE 2 END THEN 1 ELSE 2 END AS half
      FROM course_groups g
      JOIN course_days cd ON cd.group_id = g.id
      JOIN staff_members sm ON sm.id = cd.teacher_id AND NOT sm.cover_only
     WHERE (g.teacher_first IS NULL OR g.teacher_second IS NULL)
       AND NOT cd.is_substitute AND NOT cd.cancelled
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
