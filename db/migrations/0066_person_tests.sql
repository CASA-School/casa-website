-- A learner's tests (2026-10-18; docs/schoolman/intake.md §Tests, docs/ADMIN_WORKSPACE.md §Tests). SchoolMan's
-- `TestStudent` holds placement and progress tests alike: the online placement tests of the course books
-- (Netzwerk, Aspekte, Kontext), level-end tests, grammar tests, telc. Until now they were notes; here each is a
-- record — when, which test, the level reached, the score — so a learner's level history can be read.
CREATE TABLE IF NOT EXISTS person_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings (id) ON DELETE SET NULL,
  taken_on date,
  test text,
  /* The band reached, as a course's (A1 … C2, B1+). */
  level text,
  /* A percentage, when the result is one; else the result as typed. */
  score smallint,
  result text,
  comment text,
  author_name text,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT person_tests_level_check CHECK (level IS NULL OR level IN ('A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2')),
  CONSTRAINT person_tests_score_check CHECK (score IS NULL OR score BETWEEN 0 AND 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS person_tests_filemaker_key ON person_tests (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS person_tests_person_idx ON person_tests (person_id, taken_on DESC);
