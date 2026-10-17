-- Learners from SchoolMan (2026-10-17; docs/ADMIN_WORKSPACE.md §Learners from SchoolMan).
--
-- Rahman: bring some of SchoolMan's learners across to see the workspace work with real data. A
-- booking and each of its periods keep SchoolMan's record number, so a second read updates rather
-- than doubles them, and so the course counts can tell an imported booking (already inside
-- SchoolMan's weekly counts, 0050) from one made here.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS filemaker_booking_id text;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_filemaker_booking_key ON bookings (filemaker_booking_id) WHERE filemaker_booking_id IS NOT NULL;

ALTER TABLE booking_periods ADD COLUMN IF NOT EXISTS filemaker_date_booking_id text;
CREATE UNIQUE INDEX IF NOT EXISTS booking_periods_filemaker_key ON booking_periods (filemaker_date_booking_id) WHERE filemaker_date_booking_id IS NOT NULL;

-- One workspace row per SchoolMan record: two people must never claim the same Person.
CREATE UNIQUE INDEX IF NOT EXISTS filemaker_links_source_key ON filemaker_links (entity, source_database, source_layout, source_record_id);

-- A person and every row merged into them (0007's `merged_into`, followed down): what a learner's
-- counts gather over. `x.person_id = ANY(person_family(p.id))` uses the index on `person_id`, where
-- `canonical_person_id(x.person_id) = p.id` ran a recursive lookup for every row of the table — the
-- learner list would not have loaded with a few hundred real learners.
CREATE OR REPLACE FUNCTION person_family(root uuid) RETURNS uuid[]
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE family AS (
    SELECT root AS id, 0 AS depth
    UNION ALL
    SELECT p.id, family.depth + 1 FROM people p JOIN family ON p.merged_into = family.id
     WHERE family.depth < 10
  )
  SELECT array_agg(id) FROM family
$$;
