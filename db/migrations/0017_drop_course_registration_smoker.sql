-- 0017 — the smoker question is gone from the course registration.
--
-- No CASA accommodation allows smoking (Rahman, 2026-09-30), so the answer
-- could never change a placement, and a column that is always false reads as
-- data it is not (docs/FILEMAKER_LESSONS.md, status-as-default). The public
-- form no longer asks, the route no longer sends it, and the privacy policy no
-- longer mentions it.

ALTER TABLE course_registrations DROP COLUMN IF EXISTS smoker;
