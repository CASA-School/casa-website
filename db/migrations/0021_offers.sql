-- 0021 — offers (docs/OFFERS.md).
--
-- WHAT FILEMAKER DOES TODAY (read live, 2026-10-13)
--
-- `Offer` (396 records since 2022) holds the recipient — Corporate, Agency,
-- Group, or a Contact + PreBooking for one learner — a subject, and a row of
-- checkboxes for language, level, course type, accommodation and catering that
-- describe the offer and drive nothing. The prices are lines in
-- `CostDetailSample` (1,771 rows): a fee type from `CostDetailReference`, a
-- German label typed over it, unit × price. The button `MakeOffer_De/_En` runs
-- `WriteOfferLetter.Parameter_Offer`, which writes the lines into a TEXT field
-- of a new `Letter` record; the team then edits that text by hand and emails
-- it as a PDF. Measured consequences, each of which this schema removes:
--
--   * The letter and the offer disagree. Offer 37602 totals 1,560 € in its
--     lines; the letter sent from it says 1,370 €, with lines the offer does
--     not have. The letter is a copy, not a view.
--   * German and English disagree. The German label is typed, the English one
--     comes from the fee type, so "Verwaltungsgebühr" filed under Transfer is
--     printed as "Transfer" in an English offer.
--   * There is no group. An offer is per person; the escort gets a second
--     offer, the escort's costs are spread over the students by hand
--     ("Umlage begleitende Lehrkraft 2 × 60"), and nothing knows how many
--     people the group has or what it costs in total.
--   * Every price is typed. "Kurspreis" alone has 171 variants. The stored
--     `TotalAmount` is empty on all 396 offers.
--   * No status, no validity, no follow-up: whether an offer was accepted is
--     not recorded anywhere.
--
-- WHAT THIS ADDS
--
--   rates.variant   which version of a priced thing: a student or an adult
--                   ticket, a culture programme's size, the group price of a
--                   room. Group offers price from `rates` like everything else.
--   organisations   the schools, agencies, companies and public bodies CASA
--                   makes offers to, so "earlier offers to Vivimondo" is a query.
--   offers          one per offer, with the group (participants, escorts,
--                   dates) and the builder's choices; a status and a validity.
--   offer_lines     the priced lines, each with a fee type (so both languages
--                   and the accounting category come from one place), the
--                   list price it was computed from, and the agreed price.
--   offer_versions  the document exactly as it was sent, frozen.
--   offer_texts     the standard opening and closing, per language. An offer
--                   uses them until somebody changes its text on the letter;
--                   "Save as standard" changes them for every offer after.

-- ---------------------------------------------------------- rates.variant

ALTER TABLE rates ADD COLUMN IF NOT EXISTS variant text;

COMMENT ON COLUMN rates.variant IS
  'Which version of the priced thing: student/adult (tickets), small/medium/large (culture), group (room, materials, fees for group offers). Matched exactly: a lookup without a variant never gets a variant rate.';

/* Same function, one more narrowing condition. The old signature is dropped
   first: CREATE OR REPLACE with a different argument list adds an overload,
   and two applicable_rate()s would make every positional call ambiguous. */
DROP FUNCTION IF EXISTS applicable_rate(
  rate_scope, date, uuid, uuid, uuid, text, text, text, text, text, text, numeric, smallint
);

CREATE OR REPLACE FUNCTION applicable_rate(
  p_scope rate_scope,
  p_on date,
  p_course_type_id uuid DEFAULT NULL,
  p_exam_type_id uuid DEFAULT NULL,
  p_material_id uuid DEFAULT NULL,
  p_accommodation_type_code text DEFAULT NULL,
  p_catering_code text DEFAULT NULL,
  p_room_type_code text DEFAULT NULL,
  p_charge_type_code text DEFAULT NULL,
  p_level_code text DEFAULT NULL,
  p_day_time_code text DEFAULT NULL,
  p_quantity numeric DEFAULT NULL,
  p_parts smallint DEFAULT NULL,
  p_variant text DEFAULT NULL
) RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT r.id
    FROM rates r
   WHERE r.scope = p_scope
     AND r.valid_from <= p_on
     AND (r.valid_to IS NULL OR r.valid_to >= p_on)
     AND (p_course_type_id IS NULL OR r.course_type_id IS NULL OR r.course_type_id = p_course_type_id)
     AND (p_exam_type_id IS NULL OR r.exam_type_id IS NULL OR r.exam_type_id = p_exam_type_id)
     AND (p_material_id IS NULL OR r.material_id IS NULL OR r.material_id = p_material_id)
     AND (p_accommodation_type_code IS NULL OR r.accommodation_type_code IS NULL OR r.accommodation_type_code = p_accommodation_type_code)
     AND (r.catering_code IS NULL OR r.catering_code = p_catering_code)
     AND (r.room_type_code IS NULL OR r.room_type_code = p_room_type_code)
     AND (p_charge_type_code IS NULL OR r.charge_type_code IS NULL OR r.charge_type_code = p_charge_type_code)
     AND (r.level_code IS NULL OR r.level_code = p_level_code)
     AND (r.day_time_code IS NULL OR r.day_time_code = p_day_time_code)
     AND (r.parts IS NULL OR r.parts = p_parts)
     AND r.variant IS NOT DISTINCT FROM p_variant
     AND (p_quantity IS NULL OR (
           (r.min_quantity IS NULL OR p_quantity >= r.min_quantity)
       AND (r.max_quantity IS NULL OR p_quantity <= r.max_quantity)))
   ORDER BY (r.level_code IS NOT NULL) DESC,
            (r.day_time_code IS NOT NULL) DESC,
            (r.parts IS NOT NULL) DESC,
            (r.min_quantity IS NOT NULL OR r.max_quantity IS NOT NULL) DESC,
            (r.catering_code IS NOT NULL) DESC,
            (r.room_type_code IS NOT NULL) DESC,
            r.valid_from DESC
   LIMIT 1;
$$;

-- The escorts' costs spread over the participants: FileMaker's typed
-- "Umlage begleitende Lehrkraft", now a line the offer computes.
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position)
VALUES ('escort_share', 'other', 'Share of the escorts'' costs', 'Anteil Begleitpersonen', 'Umlage', false, false, 0, true, 330)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------- organisations

CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'school',
  /* Postal address without the name: street, then postcode and town. */
  address text,
  country_code text REFERENCES countries (code) ON DELETE SET NULL,
  /* The person CASA usually writes to there. */
  contact_salutation text NOT NULL DEFAULT 'none',
  contact_first_name text,
  contact_last_name text,
  contact_email text,
  language text NOT NULL DEFAULT 'en',
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT organisations_kind_check
    CHECK (kind IN ('school', 'agency', 'company', 'public_body', 'other')),
  CONSTRAINT organisations_salutation_check CHECK (contact_salutation IN ('ms', 'mr', 'none')),
  CONSTRAINT organisations_language_check CHECK (language IN ('de', 'en'))
);
CREATE INDEX IF NOT EXISTS organisations_name_idx ON organisations (lower(name));

DROP TRIGGER IF EXISTS organisations_set_updated_at ON organisations;
CREATE TRIGGER organisations_set_updated_at
  BEFORE UPDATE ON organisations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------ offers

CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /* The number is year + running number, shown as 2026-014. Unique per year;
     the repository takes an advisory lock to hand out the next one. */
  year smallint NOT NULL,
  seq integer NOT NULL,
  /* A group offer has the builder (participants, escorts, a stay priced from
     the group rates); an individual offer is lines from the price list. */
  kind text NOT NULL DEFAULT 'group',
  status text NOT NULL DEFAULT 'draft',
  language text NOT NULL DEFAULT 'de',
  /* `itemised` prints every line with its amount; `package` lists what is
     included and prints only the price per person (FileMaker's Pauschal). */
  presentation text NOT NULL DEFAULT 'itemised',
  title text NOT NULL DEFAULT '',
  group_name text,
  organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  person_id uuid REFERENCES people (id) ON DELETE SET NULL,
  enquiry_id uuid REFERENCES enquiries (id) ON DELETE SET NULL,
  /* The recipient as the letter addresses them. A copy, so a sent letter does
     not change when the organisation's address does. */
  recipient_name text NOT NULL DEFAULT '',
  contact_salutation text NOT NULL DEFAULT 'none',
  contact_first_name text,
  contact_last_name text,
  contact_email text,
  address text,
  country_code text REFERENCES countries (code) ON DELETE SET NULL,
  arrival date,
  departure date,
  participants integer,
  escorts integer NOT NULL DEFAULT 0,
  /* The builder's choices (course, room, catering, canteen, transit, culture,
     materials, fees, how escorts are charged) and the overrides typed over
     the computed lines. src/lib/admin/offers/types.ts is the shape. */
  stay jsonb NOT NULL DEFAULT '{}'::jsonb,
  /* Null means the language's default text. */
  intro text,
  closing text,
  note text,
  valid_until date,
  owner_id uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  /* Bumped by every save; a save names the revision it started from and is
     refused when someone else saved in between. */
  revision integer NOT NULL DEFAULT 1,
  /* How many times it has been sent; the letter says "2nd version" after a revision. */
  version integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  sent_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  decided_at timestamptz,
  decided_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  decision_note text,
  copied_from uuid REFERENCES offers (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT offers_number_key UNIQUE (year, seq),
  CONSTRAINT offers_kind_check CHECK (kind IN ('group', 'individual')),
  CONSTRAINT offers_status_check CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'withdrawn')),
  CONSTRAINT offers_language_check CHECK (language IN ('de', 'en')),
  CONSTRAINT offers_presentation_check CHECK (presentation IN ('itemised', 'package')),
  CONSTRAINT offers_salutation_check CHECK (contact_salutation IN ('ms', 'mr', 'none')),
  CONSTRAINT offers_people_check CHECK (
    (participants IS NULL OR participants >= 0) AND escorts >= 0
  ),
  CONSTRAINT offers_dates_check CHECK (departure IS NULL OR arrival IS NULL OR departure > arrival)
);
CREATE INDEX IF NOT EXISTS offers_status_idx ON offers (status, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS offers_organisation_idx ON offers (organisation_id) WHERE organisation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS offers_enquiry_idx ON offers (enquiry_id) WHERE enquiry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS offers_person_idx ON offers (person_id) WHERE person_id IS NOT NULL;

DROP TRIGGER IF EXISTS offers_set_updated_at ON offers;
CREATE TRIGGER offers_set_updated_at
  BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS offer_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers (id) ON DELETE CASCADE,
  position smallint NOT NULL,
  /* Who pays it, per person: a participant or an escort. */
  audience text NOT NULL,
  /* `tuition`, `accommodation`, … for computed lines; `manual:…` for typed ones. */
  key text NOT NULL,
  charge_type_code text NOT NULL REFERENCES charge_types (code),
  /* In the offer's language. */
  description text NOT NULL,
  quantity numeric(8,2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'item',
  /* Null only while a computed line has no rate and nobody typed a price;
     an offer in that state cannot be sent. */
  unit_amount numeric(10,2),
  amount numeric(10,2),
  /* What the price list said, so a changed price shows as changed. */
  list_unit_amount numeric(10,2),
  rate_id uuid REFERENCES rates (id) ON DELETE SET NULL,
  CONSTRAINT offer_lines_audience_check CHECK (audience IN ('participant', 'escort')),
  CONSTRAINT offer_lines_key_unique UNIQUE (offer_id, audience, key)
);
CREATE INDEX IF NOT EXISTS offer_lines_offer_idx ON offer_lines (offer_id, position);

/* The document exactly as it went out. Editing an offer afterwards never
   changes what the recipient was sent. */
CREATE TABLE IF NOT EXISTS offer_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers (id) ON DELETE CASCADE,
  version integer NOT NULL,
  document jsonb NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  sent_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  CONSTRAINT offer_versions_unique UNIQUE (offer_id, version)
);

/* The standard texts of the letter. No row means the text written in
   src/lib/admin/offers/document.ts (DEFAULT_TEXT). */
CREATE TABLE IF NOT EXISTS offer_texts (
  language text NOT NULL,
  part text NOT NULL,
  body text NOT NULL,
  updated_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (language, part),
  CONSTRAINT offer_texts_language_check CHECK (language IN ('de', 'en')),
  CONSTRAINT offer_texts_part_check CHECK (part IN ('intro', 'closing'))
);
