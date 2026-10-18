-- The last of SchoolMan's smaller areas (2026-10-18; docs/schoolman/README.md §Where the workspace stands).
-- Rahman: continue with the rest.

-- A group visit's programme (`SingleDateActivity`): a day, a time, what they do, where they meet.
CREATE TABLE IF NOT EXISTS group_programme (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_visit_id uuid NOT NULL REFERENCES group_visits (id) ON DELETE CASCADE,
  day date,
  starts_at text,
  activity text NOT NULL,
  meeting_point text,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS group_programme_filemaker_key ON group_programme (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS group_programme_group_idx ON group_programme (group_visit_id, day);

-- What a group visit has booked (`ServiceDetail`): the course, the stay, meals, transfers, the programme …
CREATE TABLE IF NOT EXISTS group_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_visit_id uuid NOT NULL REFERENCES group_visits (id) ON DELETE CASCADE,
  service text NOT NULL,
  detail text,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS group_services_filemaker_key ON group_services (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS group_services_group_idx ON group_services (group_visit_id);

-- Internship places held for a group (`DatePlacement`): where, when, how many.
CREATE TABLE IF NOT EXISTS group_internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_visit_id uuid NOT NULL REFERENCES group_visits (id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  place text,
  starts_on date,
  ends_on date,
  min_people smallint,
  max_people smallint,
  note text,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS group_internships_filemaker_key ON group_internships (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS group_internships_group_idx ON group_internships (group_visit_id);

-- Book orders to a publisher (`Order`, `OrderDetail`): when, done, and each book with its count and net price.
ALTER TABLE organisations DROP CONSTRAINT IF EXISTS organisations_relation_check;
ALTER TABLE organisations ADD CONSTRAINT organisations_relation_check CHECK (
  relation IS NULL OR relation IN ('internship', 'multiplier', 'activity', 'supplier', 'health_insurer', 'tandem_school', 'contractor', 'association', 'publisher')
);
CREATE TABLE IF NOT EXISTS book_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  ordered_on date,
  done boolean,
  email text,
  ordered_by_name text,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS book_orders_filemaker_key ON book_orders (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS book_orders_organisation_idx ON book_orders (organisation_id, ordered_on DESC);
CREATE TABLE IF NOT EXISTS book_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES book_orders (id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials (id) ON DELETE SET NULL,
  title text,
  quantity numeric(8, 2),
  unit_net numeric(10, 2),
  net numeric(10, 2),
  filemaker_id text
);
CREATE UNIQUE INDEX IF NOT EXISTS book_order_lines_filemaker_key ON book_order_lines (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS book_order_lines_order_idx ON book_order_lines (order_id);

-- CASA's keys (`Key`): its number, which door (`KeyTypeReference`: General, Verwaltung, Lehrer, Haustür, Hof,
-- Schrank Dobben; BGS), who holds it.
CREATE TABLE IF NOT EXISTS staff_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text,
  kind text,
  holder_id uuid REFERENCES staff_members (id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_keys_filemaker_key ON staff_keys (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS staff_keys_holder_idx ON staff_keys (holder_id) WHERE holder_id IS NOT NULL;

-- A CASA flat's cleaning plan: its jobs (`CleaningDetail`) and who does which job in which week
-- (`SingleWeekCleaning`, a room of the flat).
CREATE TABLE IF NOT EXISTS cleaning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES accommodations (id) ON DELETE CASCADE,
  job_de text NOT NULL,
  job_en text,
  filemaker_ref text,
  filemaker_id text
);
CREATE UNIQUE INDEX IF NOT EXISTS cleaning_jobs_filemaker_key ON cleaning_jobs (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS cleaning_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES accommodations (id) ON DELETE CASCADE,
  room_id uuid REFERENCES accommodation_rooms (id) ON DELETE SET NULL,
  job_id uuid REFERENCES cleaning_jobs (id) ON DELETE SET NULL,
  starts_on date,
  ends_on date,
  filemaker_id text
);
CREATE UNIQUE INDEX IF NOT EXISTS cleaning_weeks_filemaker_key ON cleaning_weeks (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cleaning_weeks_place_idx ON cleaning_weeks (accommodation_id, starts_on);
