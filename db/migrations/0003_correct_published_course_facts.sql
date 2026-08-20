-- Correct the course facts that did not match casa-bremen.de, and clear the
-- placeholder course instances.
--
-- Findings and sources: docs/CONTENT_PARITY_WITH_CASA_BREMEN_DE.md.
--
-- Three separate problems, all of which reached the public site:
--
-- 1. Evening German rendered "from 378 EUR". 378 EUR is the *spring* trimester;
--    CASA publishes 476 EUR for the Herbsttrimester that is currently on sale.
--    src/config/calculator/pricing.ts already carried both figures and defaulted
--    to 476 -- only the database row was wrong. It is a per-trimester price, not
--    an entry point, so pricing_mode becomes 'fixed': "from 476 EUR" would
--    understate a fee that does not scale down.
--
-- 2. Both seeded course_instances were written relative to now(), so they
--    described terms that CASA does not run (13 Apr - 6 Jul 2026 for an evening
--    course whose real Herbsttrimester is 24 Aug - 16 Dec 2026). Deleted here;
--    db/seeds/0001_public_baseline.sql now seeds the published term table.
--
-- 3. visa_eligible was NULL for the evening course, which the UI renders as
--    "Please ask". CASA's published requirement is 20 lessons a week for at
--    least three months. An evening course is 4 UE a week, so it cannot meet it
--    -- that is arithmetic on two published figures, not an inference, and a
--    visitor planning a language visa deserves the straight answer. Formats
--    where the answer genuinely needs staff confirmation stay NULL.

UPDATE course_types
   SET default_price = 476,
       pricing_mode  = 'fixed',
       visa_eligible = false,
       name          = 'German in the Evening'
 WHERE slug = 'evening-german';

UPDATE course_types
   SET name = 'Intensive German'
 WHERE slug = 'intensive-german';

-- Placeholder instances from the pre-2026-08 seed. Identified by the two
-- location strings that seed used and that no real CASA record uses.
DELETE FROM course_instances
 WHERE location IN ('CASA Bremen Campus', 'CASA City Classroom');

-- Courses CASA does not offer. These only ever existed as development
-- placeholders; if a row reached a database, retire it rather than deleting it,
-- because course_instances references course_types with ON DELETE RESTRICT.
UPDATE course_types
   SET is_active = false
 WHERE slug IN ('university-prep', 'business-german', 'summer-intensive', 'integration-german');

-- CASA publishes no weekly load, no dates and no price for German for Medical,
-- and none for Firmenunterricht either. 0 is the "not published" sentinel; the
-- facts rail renders it as "On request", never as the number 0.
UPDATE course_types
   SET lessons_per_week = 0,
       default_price    = 0,
       pricing_mode     = 'on_request'
 WHERE slug = 'medical-german';

UPDATE course_types
   SET lessons_per_week = 0
 WHERE slug = 'in-company';

-- Educational leave requires B1 to join ("Ab einem Niveau von B1 kannst du
-- teilnehmen"), not A2.
UPDATE course_types
   SET level_min = 'B1'
 WHERE slug = 'bildungszeit';
