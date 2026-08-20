-- Set pricing_mode and visa_eligible on the course rows created by
-- db/seeds/0001_public_baseline.sql.
--
-- Migration 0002 added both columns and set them on the rows that existed at
-- the time. The seed did not list either column, so every course it inserted
-- afterwards took the 'from' default -- and the three formats CASA quotes per
-- enquiry (German for Groups, Firmenunterricht, German for Medical) carry
-- default_price 0, which 'from' renders to a visitor as "from 0 EUR".
--
-- The seed now lists both columns, so a fresh database is correct without this
-- migration. This corrects the databases that were already seeded.
--
-- visa_eligible: true only where CASA publishes the claim (intensive, 20 UE a
-- week for three months or more). false where the arithmetic on two published
-- figures settles it (evening 4 UE, special courses 2 UE -- neither can reach a
-- 20 UE/week requirement). NULL everywhere the answer needs staff confirmation,
-- because the UI renders NULL as "Please ask" and never as a No.

UPDATE course_types SET pricing_mode = 'from',       visa_eligible = true  WHERE slug = 'intensive-german';
UPDATE course_types SET pricing_mode = 'fixed',      visa_eligible = false WHERE slug = 'evening-german';
UPDATE course_types SET pricing_mode = 'fixed',      visa_eligible = false WHERE slug = 'special-courses';
UPDATE course_types SET pricing_mode = 'from'                              WHERE slug = 'bildungszeit';
UPDATE course_types SET pricing_mode = 'on_request', visa_eligible = NULL  WHERE slug = 'german-for-groups';
UPDATE course_types SET pricing_mode = 'on_request', visa_eligible = NULL  WHERE slug = 'in-company';
UPDATE course_types SET pricing_mode = 'on_request', visa_eligible = NULL  WHERE slug = 'medical-german';
