-- The telc preparation courses go on the website (Rahman, 2026-10-31): the exam pages list the next ones
-- and the registration form books them, each term under the exam its title names. The bridge puts new
-- ones on the website as it makes them (scripts/filemaker/import-courses.mjs); these are the ones it made
-- before, off it. A colleague takes a term off again on its start in the workspace.
UPDATE course_instances i
   SET on_website = true
  FROM course_types t
 WHERE t.id = i.course_type_id
   AND t.slug = 'exam-preparation'
   AND i.status = 'scheduled'
   AND NOT i.on_website
   AND i.start_date > current_date
   AND (i.title ~* 'C1\s*(Hochschule|H\M)' OR i.title ~ '\mB2\M');
