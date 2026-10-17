-- The German names the workspace shows in German (2026-10-17): the two types that had none.
UPDATE course_types SET name_de = 'Bildungszeit' WHERE slug = 'bildungszeit' AND name_de IS NULL;
UPDATE course_types SET name_de = 'Deutsch für Pflege und Medizin' WHERE slug = 'medical-german' AND name_de IS NULL;
