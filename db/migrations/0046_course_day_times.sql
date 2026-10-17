-- A lesson day's hours as they are (2026-10-17): its own, else its course's weekly plan for that
-- weekday, else its start's hours, else its board group's shift. What a clash — a teacher or a room
-- taken twice at once — is checked against.
CREATE OR REPLACE VIEW course_day_times AS
SELECT d.id,
       d.course_id,
       d.group_index,
       d.group_id,
       d.on_date,
       coalesce(d.starts_at, p.starts_at, nullif(split_part(i.schedule->>'time', '-', 1), '')::time,
                CASE g.shift WHEN 'morning' THEN time '09:00' WHEN 'afternoon' THEN time '13:00' END) AS starts_at,
       coalesce(d.ends_at, p.ends_at, nullif(split_part(i.schedule->>'time', '-', 2), '')::time,
                CASE g.shift WHEN 'morning' THEN time '12:30' WHEN 'afternoon' THEN time '17:30' END) AS ends_at,
       coalesce(d.lessons, p.lessons) AS lessons,
       d.teacher_id,
       d.room_id,
       d.cancelled
  FROM course_days d
  LEFT JOIN courses c ON c.id = d.course_id
  LEFT JOIN course_instances i ON i.id = c.course_instance_id
  LEFT JOIN course_week_plans p ON p.course_id = d.course_id AND p.group_index = d.group_index AND p.weekday = extract(isodow FROM d.on_date)
  LEFT JOIN course_groups g ON g.id = d.group_id;

-- SchoolMan keeps a level's parallel groups as courses of their own: their numbers, group by group, so
-- each one's lesson days land on their group here.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS filemaker_group_ids text[];
