-- Accommodation: host families, CASA's flats and the other places learners stay (2026-10-18;
-- docs/ADMIN_WORKSPACE.md §Accommodation, docs/schoolman/accommodation.md). Rahman: "we are fine with host
-- family privacy" — hosts come across with their own module.
--
-- SchoolMan keeps a place as `Accommodation` (142), its rooms as `Room` (416), the family as `Person` rows
-- with a role (`_ID_Status_Family`: Vater, Mutter, Sohn …), pets in `AnimalAtHome`, beds held for a group
-- in `DateRent`. A learner's stay (`booking_stays`, 0056) now points at its place and room.
CREATE TABLE IF NOT EXISTS accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /* „Familie Meyer", „Die Biber". */
  name text NOT NULL,
  /* host_family: a family's home; casa_flat: one of CASA's own flats; other: a hostel, an apartment. */
  kind text NOT NULL DEFAULT 'host_family',
  /* Whom to call: the host, or the flat's contact. */
  contact_name text,
  email text,
  phone text,
  /* Street, then postcode and town. */
  address text,
  description_de text,
  description_en text,
  smoker boolean,
  /* „Hund, Katze" — what lives there, as the family says it. */
  pets text,
  washing_machine boolean,
  /* SchoolMan's grade of the place (`_ID_Quality`), 1 best. */
  rating smallint,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  filemaker_id text,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT accommodations_kind_check CHECK (kind IN ('host_family', 'casa_flat', 'other')),
  CONSTRAINT accommodations_rating_check CHECK (rating IS NULL OR rating BETWEEN 1 AND 6)
);
CREATE UNIQUE INDEX IF NOT EXISTS accommodations_filemaker_key ON accommodations (filemaker_id) WHERE filemaker_id IS NOT NULL;

-- The people who live there. Only their name and role in the family: no birth date, no papers.
CREATE TABLE IF NOT EXISTS accommodation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES accommodations (id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  role text NOT NULL DEFAULT 'other',
  filemaker_person_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT accommodation_members_role_check CHECK (role IN ('father', 'mother', 'son', 'daughter', 'grandfather', 'grandmother', 'relative', 'friend', 'other')),
  CONSTRAINT accommodation_members_name_check CHECK (first_name IS NOT NULL OR last_name IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS accommodation_members_filemaker_key
  ON accommodation_members (accommodation_id, filemaker_person_id) WHERE filemaker_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS accommodation_members_place_idx ON accommodation_members (accommodation_id);

CREATE TABLE IF NOT EXISTS accommodation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES accommodations (id) ON DELETE CASCADE,
  name text,
  room_type_code text REFERENCES accommodation_room_types (code) ON DELETE SET NULL,
  beds smallint,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT accommodation_rooms_beds_check CHECK (beds IS NULL OR beds BETWEEN 0 AND 20)
);
CREATE UNIQUE INDEX IF NOT EXISTS accommodation_rooms_filemaker_key ON accommodation_rooms (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS accommodation_rooms_place_idx ON accommodation_rooms (accommodation_id);

-- Beds held at a place for a group visit, for a period (SchoolMan's `DateRent`).
CREATE TABLE IF NOT EXISTS accommodation_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES accommodations (id) ON DELETE CASCADE,
  room_id uuid REFERENCES accommodation_rooms (id) ON DELETE SET NULL,
  group_visit_id uuid REFERENCES group_visits (id) ON DELETE SET NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  /* How many of the group it takes: at least, at most. */
  min_people smallint,
  max_people smallint,
  note text,
  filemaker_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT accommodation_reservations_dates_check CHECK (ends_on >= starts_on),
  CONSTRAINT accommodation_reservations_people_check CHECK ((min_people IS NULL OR min_people >= 0) AND (max_people IS NULL OR max_people >= 0))
);
CREATE UNIQUE INDEX IF NOT EXISTS accommodation_reservations_filemaker_key ON accommodation_reservations (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS accommodation_reservations_place_idx ON accommodation_reservations (accommodation_id, starts_on);
CREATE INDEX IF NOT EXISTS accommodation_reservations_group_idx ON accommodation_reservations (group_visit_id) WHERE group_visit_id IS NOT NULL;

-- Where a learner stays: the place and the room, beside the names SchoolMan's import kept (0056).
ALTER TABLE booking_stays ADD COLUMN IF NOT EXISTS accommodation_id uuid REFERENCES accommodations (id) ON DELETE SET NULL;
ALTER TABLE booking_stays ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES accommodation_rooms (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS booking_stays_place_idx ON booking_stays (accommodation_id, starts_on) WHERE accommodation_id IS NOT NULL;

-- Notes on a place, SchoolMan's comments about it among them.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (
  entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person', 'offer', 'group_visit',
                      'accommodation'])
);
