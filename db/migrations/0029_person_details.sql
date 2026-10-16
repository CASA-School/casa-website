-- Everything SchoolMan knows about a learner (Rahman, 2026-10-16: "we need all of the information
-- that is there because some of those information are required for telc exams"), and the staff
-- facts that only finance and management may see (docs/schoolman/people.md).
--
-- Typed where a vocabulary exists (the countries), text where it does not, and nothing copied:
-- SchoolMan's derived labels, search helpers and constants stay behind (docs/schoolman/fields.md).

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS second_last_name text,
  ADD COLUMN IF NOT EXISTS nickname text,
  -- When only the year is known (SchoolMan's YearOfBirth, 956 people).
  ADD COLUMN IF NOT EXISTS birth_year smallint
    CONSTRAINT people_birth_year_check CHECK (birth_year BETWEEN 1900 AND 2100),
  ADD COLUMN IF NOT EXISTS birth_place text,
  ADD COLUMN IF NOT EXISTS birth_country_code char(2) REFERENCES countries (code),
  ADD COLUMN IF NOT EXISTS mother_tongue text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS passport_number text;

-- A person's addresses: where they live at home, and where they live in Bremen while here
-- (SchoolMan asks for "deine lokale Postadresse"). One of each; a letter goes to the local one first.
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  kind text NOT NULL CONSTRAINT addresses_kind_check CHECK (kind IN ('home', 'local')),
  street text,
  postcode text,
  city text,
  country_code char(2) REFERENCES countries (code),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (person_id, kind)
);

DROP TRIGGER IF EXISTS addresses_set_updated_at ON addresses;
CREATE TRIGGER addresses_set_updated_at
  BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Protected: read and written only with the module `private_data` (src/lib/admin/access.ts),
-- held by owners and administrators and granted per person — finance, for example.
CREATE TABLE IF NOT EXISTS person_private (
  person_id uuid PRIMARY KEY REFERENCES people (id) ON DELETE CASCADE,
  tax_id text,
  pension_insurance_number text,
  health_insurance_number text,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_by uuid REFERENCES staff_users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  holder text,
  iban text NOT NULL,
  bic text,
  bank_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS bank_accounts_person_idx ON bank_accounts (person_id);
