-- 0008 — rooms, locations, and per-module access.
--
-- Two things the workspace needs before it can plan a course rather than only
-- receive a registration for one.
--
-- 1. ROOMS. A cohort runs in a room, and a room has a capacity. FileMaker has
--    this already: `Classroom` (29 rows) → `LocationReference` (8 sites) and
--    `Floor`, with `Course._ID_ClassRoom` and a per-date `SingleDateOccupancy`.
--    The model is ported; its defects are not (docs/FILEMAKER_LESSONS.md §12):
--      - booleans stored as 1/2 (and once as 21) become real booleans;
--      - offices and a "Glaskasten" sat in the classroom table with capacity 0
--        or 2 — `kind` says what a room is, so a course cannot be planned into
--        the accounts office;
--      - `CapStudent` and `MaxStudent` were two capacities with no stated
--        meaning — kept as `capacity` (the planning number) and `capacity_max`
--        (the physical ceiling), both named;
--      - the city nickname (`CityClassRoom`: "Berlin", "Hamburg") is how staff
--        actually refer to rooms, so it is a first-class column, not a comment.
--    `filemaker_links` rows carry the `__ID_Classroom` / `__ID_Location`, so the
--    phase-3 import finds these rows instead of creating them again.
--
-- 2. MODULE ACCESS. Not everyone sees everything. The workspace is a set of
--    modules (enquiries, registrations, placement, applications, people,
--    planning, catalogue, activity, team, settings); a role grants a default
--    set, and `staff_module_access` records per-person exceptions in either
--    direction. The registry of modules and the role defaults live in code
--    (`src/lib/admin/access.ts`) — this table only stores the exceptions, so
--    adding a module is a code change, not a data migration.

-- ------------------------------------------------------------- locations

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  -- 'site' is a building; 'client' is teaching on a customer's premises;
  -- 'online' has no room capacity in the physical sense.
  kind text NOT NULL DEFAULT 'site'
    CONSTRAINT locations_kind_check CHECK (kind IN ('site', 'client', 'online')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (name)
);

DROP TRIGGER IF EXISTS locations_set_updated_at ON locations;
CREATE TRIGGER locations_set_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------- rooms

DO $$ BEGIN
  CREATE TYPE room_kind AS ENUM ('classroom', 'office', 'meeting', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  short_name text,
  -- How staff refer to it ("Berlin", "Hamburg"). Optional; unique where set.
  nickname text,
  -- Floor as a number: -1 cellar, 0 ground, 1 first … Null for online/client.
  floor smallint,
  kind room_kind NOT NULL DEFAULT 'classroom',
  -- The planning number: how many learners a course in this room is planned
  -- for. `capacity_max` is the physical ceiling. Both null for rooms that do
  -- not hold a class.
  capacity smallint CONSTRAINT rooms_capacity_check CHECK (capacity IS NULL OR capacity >= 0),
  capacity_max smallint CONSTRAINT rooms_capacity_max_check
    CHECK (capacity_max IS NULL OR capacity_max >= coalesce(capacity, 0)),
  -- Whether a course may be planned into it. Offices are never bookable.
  is_bookable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  colour text,
  zone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (location_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS rooms_nickname_key
  ON rooms (lower(nickname)) WHERE nickname IS NOT NULL;

DROP TRIGGER IF EXISTS rooms_set_updated_at ON rooms;
CREATE TRIGGER rooms_set_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A cohort runs in a room. Optional: a cohort can be scheduled before the room
-- is decided, and online cohorts have none. The free-text `location` column
-- from 0001 stays for now; the room is the typed fact beside it.
ALTER TABLE course_instances
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS course_instances_room_idx ON course_instances (room_id);

-- filemaker_links learns the new entities.
ALTER TABLE filemaker_links DROP CONSTRAINT IF EXISTS filemaker_links_entity_check;
ALTER TABLE filemaker_links ADD CONSTRAINT filemaker_links_entity_check CHECK (entity IN (
  'person', 'enquiry', 'course_registration', 'exam_registration',
  'placement_review', 'room', 'location', 'course_instance'
));

-- --------------------------------------------------------- module access

-- One row per (person, module) exception. Absence means "the role's default".
CREATE TABLE IF NOT EXISTS staff_module_access (
  staff_user_id uuid NOT NULL REFERENCES staff_users (id) ON DELETE CASCADE,
  module text NOT NULL,
  allowed boolean NOT NULL,
  granted_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (staff_user_id, module)
);
