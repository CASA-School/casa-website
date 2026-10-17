-- The order course types are listed in (Rahman, 2026-10-17): CASA's three kinds of course first —
-- intensive, evening, special courses — and the rest after. Every workspace list reads `position`,
-- like the other vocabularies; a new type without one comes last.
--
-- Bildungszeit is not a course of its own: a learner with a Bildungsschein sits in two intensive
-- courses at once, morning and afternoon (Superintensiv, 40 lessons a week). SchoolMan agrees: of its
-- 1,331 courses none has the type Superintensivkurs; 138 of its 164 Superintensiv bookings are a pair,
-- one person on one start date in a morning and an afternoon intensive course. The row stays for the
-- website's page and its price, listed after the courses. A group's course (German for groups) is an
-- intensive course of 20 lessons a week with its own group.

ALTER TABLE course_types ADD COLUMN IF NOT EXISTS position smallint NOT NULL DEFAULT 100;

UPDATE course_types SET position = CASE slug
    WHEN 'intensive-german' THEN 10
    WHEN 'evening-german' THEN 20
    WHEN 'special-courses' THEN 30
    WHEN 'german-for-groups' THEN 40
    WHEN 'medical-german' THEN 50
    WHEN 'in-company' THEN 60
    WHEN 'bildungszeit' THEN 70
    ELSE position
  END;
