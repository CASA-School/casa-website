/**
 * A course's part of the day, in SQL, for a list that shows its colour (2026-10-21): when its first lesson
 * begins — before 12 Vormittag, before 17 Nachmittag, else Abend, as the Tagesplan reads a lesson —, else
 * what the course or its start says, and for a booking with no course yet an evening course type. An
 * intensive start keeps no session of its own — its halves are taught in the morning or the afternoon as
 * CASA plans them — and the lesson days say which.
 */
export const courseSessionSql = (course: string, instance: string, type = 'NULL') => `coalesce(
  (SELECT CASE WHEN t.starts_at < '12:00' THEN 'morning' WHEN t.starts_at < '17:00' THEN 'afternoon' ELSE 'evening' END
     FROM course_day_times t WHERE t.course_id = ${course} AND t.starts_at IS NOT NULL ORDER BY t.on_date LIMIT 1),
  (SELECT cs.session FROM courses cs WHERE cs.id = ${course}),
  (SELECT ci.session FROM course_instances ci WHERE ci.id = ${instance}),
  (SELECT 'evening' FROM course_types ct WHERE ct.id = ${type} AND ct.format = 'evening'))`;
