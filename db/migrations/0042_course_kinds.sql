-- The kinds of course SchoolMan has that the website does not sell on its own (Rahman, 2026-10-17):
-- exam preparation (`Prüfungsvorbereitung`, about 15 a year, mostly before C1 Hochschule), private
-- lessons (`Einzelunterricht`), junior courses and online courses. They are the workspace's: not
-- published (`is_active` false keeps them off the website's lists), after CASA's three in every list.
-- Special courses, groups' and companies' courses already have their types.

INSERT INTO course_types (slug, name, name_de, short_code, format, level_min, level_max, lessons_per_week, pricing_mode, teaching_mode, is_active, position, filemaker_id)
VALUES
  ('exam-preparation', 'Exam Preparation', 'Prüfungsvorbereitung', 'PrepEx', 'exam preparation', 'B1', 'C1', 0, 'fixed', 'in_person', false, 35, 7),
  ('private-lessons', 'Private Lessons', 'Einzelunterricht', 'Einzel', 'private', 'A1', 'C1', 0, 'on_request', 'in_person', false, 80, 4),
  ('junior', 'Junior Course', 'Juniorkurs', 'Junior', 'junior', 'A1', 'B2', 0, 'on_request', 'in_person', false, 90, 9),
  ('online', 'Online Course', 'Online-Kurs', 'Online', 'online', 'A1', 'C1', 0, 'on_request', 'online', false, 100, 15)
ON CONFLICT (slug) DO NOTHING;

-- SchoolMan's type numbers on the types that have them: what the course import matches on.
UPDATE course_types SET filemaker_id = 12 WHERE slug = 'bildungszeit' AND filemaker_id IS NULL;
