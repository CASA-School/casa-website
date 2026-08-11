-- Course pricing mode and explicit visa eligibility.
--
-- Two products (German for Groups, Firmenunterricht) are quoted per enquiry and
-- have no public price. Before this migration the schema could only express a
-- number, so `default_price` was rendered as "Price from 1200 EUR" for a course
-- CASA quotes individually.
--
-- Visa eligibility was previously inferred in application code from
-- `lessons_per_week >= 15`. CASA's own published guidance is a minimum of 20
-- lessons per week, so that heuristic could publish a false "Yes", and any edit
-- to a course's weekly hours silently changed a regulated claim. It is now an
-- explicit, staff-set column. NULL means "not confirmed" and the UI surfaces it
-- as an invitation to ask, never as a Yes or a No.
--
-- See docs/COURSE_FACTS_SOURCE_OF_TRUTH.md.

ALTER TABLE course_types
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'from',
  ADD COLUMN IF NOT EXISTS visa_eligible boolean;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_types_pricing_mode_check'
  ) THEN
    ALTER TABLE course_types
      ADD CONSTRAINT course_types_pricing_mode_check
      CHECK (pricing_mode IN ('fixed', 'from', 'on_request'));
  END IF;
END $$;

COMMENT ON COLUMN course_types.pricing_mode IS
  'How default_price should be read. on_request products must never render a number.';
COMMENT ON COLUMN course_types.visa_eligible IS
  'Staff-verified student-visa eligibility. NULL = not confirmed. Never inferred.';

-- Correct the figures that did not match casa-bremen.de, and set pricing modes.
-- Verified 2026-08-12; sources in docs/COURSE_FACTS_SOURCE_OF_TRUTH.md.
UPDATE course_types SET default_price = 520, pricing_mode = 'from', visa_eligible = true
  WHERE slug = 'intensive-german';
UPDATE course_types SET default_price = 192, lessons_per_week = 2, pricing_mode = 'fixed'
  WHERE slug = 'special-courses';
UPDATE course_types SET default_price = 280, pricing_mode = 'from'
  WHERE slug = 'bildungszeit';
UPDATE course_types SET pricing_mode = 'fixed'
  WHERE slug = 'medical-german';
UPDATE course_types SET default_price = 0, pricing_mode = 'on_request'
  WHERE slug = 'in-company';

-- 'conversation-lab' held the content of a speaking club while being published
-- at the German for Groups route. The two are different products; the row now
-- carries the real group package.
UPDATE course_types
   SET slug = 'german-for-groups',
       name = 'German for Groups',
       format = 'Group Package',
       level_min = 'A1',
       level_max = 'C1',
       lessons_per_week = 20,
       default_price = 0,
       pricing_mode = 'on_request'
 WHERE slug IN ('conversation-lab', 'german-for-groups');
