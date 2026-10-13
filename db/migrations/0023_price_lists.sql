-- 0023 · Price lists by year, and a term's lessons.
--
-- A price list is the rows of `rates` that share a `valid_from` (0011): the
-- workspace's Prices screen prepares next year's list as a copy of the one in
-- force and closes the old one the day before (docs/CATALOGUE_AND_PRICING.md
-- §Price lists). Nothing new is needed for that but an index on the date.

CREATE INDEX IF NOT EXISTS rates_valid_from_idx ON rates (valid_from);

/* The evening course and the special courses are priced per lesson, and a
   term's lessons are not its weeks times the lessons a week: holidays fall
   out. FileMaker counts them from its class dates (Course.cal_NumberLesson):
   the 2027 winter term is 54 lessons on Monday and Wednesday and 56 on Tuesday
   and Thursday — 378 € and 392 €. Null: counted from the schedule and the
   school's closures. */
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS lessons integer;
ALTER TABLE course_instances DROP CONSTRAINT IF EXISTS course_instances_lessons_check;
ALTER TABLE course_instances ADD CONSTRAINT course_instances_lessons_check CHECK (lessons IS NULL OR lessons > 0);

/* Data imported once. Seeds run on every release; a price CASA has since
   changed or removed must not come back with the next one, so a seed that
   brings prices records its name here and does nothing a second time. */
CREATE TABLE IF NOT EXISTS data_imports (
  name text PRIMARY KEY,
  imported_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
