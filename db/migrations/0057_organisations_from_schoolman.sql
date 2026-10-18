-- Organisations: agencies, companies, schools and offices, as SchoolMan keeps them (2026-10-18;
-- docs/ADMIN_WORKSPACE.md §Organisations, docs/schoolman/organisations.md). Rahman: focus on corporate,
-- management, agencies — there are dependencies there.
--
-- SchoolMan's party is a `Management` record with roles hanging off it (`Agency`, `Corporate`,
-- `Institution` for the name); the workspace keeps one `organisations` row per party, linked to all of
-- them in `filemaker_links`. Its own address, e-mail and phone; whether it is active; an agency's
-- agreement. Never `Management`'s comments: they hold credentials (organisations.md).
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS agreement text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS note text;

-- The people who work there (SchoolMan's `Person` rows linked to the party, with their job title).
ALTER TABLE organisation_contacts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE organisation_contacts ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE organisation_contacts ADD COLUMN IF NOT EXISTS filemaker_person_id text;
CREATE UNIQUE INDEX IF NOT EXISTS organisation_contacts_filemaker_key
  ON organisation_contacts (organisation_id, filemaker_person_id) WHERE filemaker_person_id IS NOT NULL;

-- Who pays a booking, when it is not the learner: the agency or the company itself, not only a name.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payer_organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bookings_payer_organisation_idx ON bookings (payer_organisation_id) WHERE payer_organisation_id IS NOT NULL;

-- An agency's commission: a share of a kind of charge (SchoolMan's `CommissionDetail`).
CREATE TABLE IF NOT EXISTS agency_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  charge_type_code text REFERENCES charge_types(code) ON DELETE SET NULL,
  percentage numeric(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  note text,
  filemaker_id text,
  created_by uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS agency_commissions_filemaker_key ON agency_commissions (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agency_commissions_organisation_idx ON agency_commissions (organisation_id);

ALTER TABLE filemaker_links DROP CONSTRAINT IF EXISTS filemaker_links_entity_check;
ALTER TABLE filemaker_links ADD CONSTRAINT filemaker_links_entity_check CHECK (entity = ANY (ARRAY[
  'person', 'enquiry', 'course_registration', 'exam_registration', 'placement_review', 'room', 'location',
  'course_instance', 'booking', 'payment', 'organisation'
]));
