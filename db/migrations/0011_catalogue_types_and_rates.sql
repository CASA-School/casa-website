-- 0011 — the background setup: types, and a rate card.
--
-- WHAT FILEMAKER HAS, AND WHAT IT DOES NOT
--
-- Read live on 2026-09-09 (docs/CATALOGUE_AND_PRICING.md has the full survey).
-- SchoolMan has 99 reference tables — a real, careful vocabulary: 14 course
-- types, 6 accommodation types, 5 catering options, 4 room kinds, 4 bed kinds,
-- 5 exams, 10 levels and 13 level steps, 3 day sessions with hours, 34 cost
-- line types in 6 categories, 36 books with ISBN and net price, 2 currencies,
-- 3 teaching modes. Those are ported here, nearly one to one, because they are
-- the school's own language and the team already thinks in them.
--
-- What it does NOT have is a PRICE LIST. Prices live in four places, none of
-- them a table anyone can maintain:
--   1. `Course.CoursePrice` — typed per course instance, 1,318 of them.
--   2. `CostDetail.CostGross` — typed per line, per booking; 76,362 rows.
--   3. `CostDetailSample` — 1,744 rows of per-group cost drafts. "Kurspreis"
--      appears at 900, 880, 860, 500, 416, 378, 260, 240 and 45×32 units;
--      171 distinct (line, price, unit) combinations for a handful of products.
--   4. **Inside a script.** `SetPrice_Exam_NationalAirport` sets the exam fee
--      from a `Case()`: telc B2 two parts 190, one part 160; C1 Hochschule two
--      parts 210, one part 185. The price list is source code, and changing a
--      fee means editing a 28,000-character script.
-- Accommodation has no price anywhere: `Accommodation` carries no money field
-- at all, and rent is typed per cost line.
--
-- So this migration adds the thing FileMaker never had: `rates`, one table
-- where every priced thing has an amount, a unit, a currency, VAT and a
-- VALIDITY PERIOD. A booking's cost line is derived from a rate and stamped
-- with the amount, so the agreement survives a price change (that is why
-- `booking_charges` keeps its own `amount`). Answering "what does an intensive
-- course cost in October" becomes one query instead of a phone call.

-- ------------------------------------------------------- charge vocabulary

-- FileMaker's CostTypeReference (6). The category a cost line belongs to.
CREATE TABLE IF NOT EXISTS charge_categories (
  code text PRIMARY KEY,
  name_en text NOT NULL,
  name_de text NOT NULL,
  position smallint NOT NULL DEFAULT 0,
  filemaker_id integer UNIQUE
);

-- FileMaker's CostDetailReference (34). One row per kind of line that can
-- appear on a booking: enrolment fee, course fee, rent, extra nights, books,
-- transfer, discount, cancellation, deposit …
CREATE TABLE IF NOT EXISTS charge_types (
  code text PRIMARY KEY,
  category_code text NOT NULL REFERENCES charge_categories (code),
  name_en text NOT NULL,
  name_de text NOT NULL,
  -- Office shorthand, as the team writes it on the Booking screen.
  short_de text,
  /* A negative line by nature: cancellation, discount, refund. The sign is a
     property of the type, so a "discount" of +50 cannot be entered. */
  is_credit boolean NOT NULL DEFAULT false,
  /* Whether an agency commission applies. FileMaker's _ID_Commissionable. */
  is_commissionable boolean NOT NULL DEFAULT false,
  vat_rate numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  position smallint NOT NULL DEFAULT 0,
  filemaker_id numeric(6,2) UNIQUE
);

-- --------------------------------------------------- accommodation vocabulary

CREATE TABLE IF NOT EXISTS accommodation_types (
  code text PRIMARY KEY,
  name_en text NOT NULL,
  name_de text NOT NULL,
  short_de text,
  /* CASA's own flats are managed by the school; a host family or hotel is not.
     Different work, different money flow (the school pays the landlord). */
  is_casa_managed boolean NOT NULL DEFAULT false,
  is_bookable boolean NOT NULL DEFAULT true,
  position smallint NOT NULL DEFAULT 0,
  filemaker_id integer UNIQUE
);

CREATE TABLE IF NOT EXISTS catering_options (
  code text PRIMARY KEY,
  name_en text NOT NULL,
  name_de text NOT NULL,
  short_de text,
  position smallint NOT NULL DEFAULT 0,
  filemaker_id integer UNIQUE
);

CREATE TABLE IF NOT EXISTS accommodation_room_types (
  code text PRIMARY KEY,
  name_en text NOT NULL,
  name_de text NOT NULL,
  short_de text,
  /* How many people the room sleeps — the fact FileMaker kept only in the label. */
  sleeps smallint,
  position smallint NOT NULL DEFAULT 0,
  filemaker_id integer UNIQUE
);

-- ------------------------------------------------------- course vocabulary

-- FileMaker's DayTimeReference (3), with the hours it actually carries.
CREATE TABLE IF NOT EXISTS day_times (
  code text PRIMARY KEY,
  name_en text NOT NULL,
  name_de text NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  position smallint NOT NULL DEFAULT 0,
  filemaker_id integer UNIQUE
);

/* FileMaker's TypeTeachingReference (3). On the course, not the booking. */
DO $$ BEGIN
  CREATE TYPE teaching_mode AS ENUM ('in_person', 'online', 'blended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- course_types exists since 0001 as the PUBLIC catalogue (slug, price, hours).
-- These columns are the operational facts FileMaker's CourseTypeReference has.
ALTER TABLE course_types
  ADD COLUMN IF NOT EXISTS name_de text,
  ADD COLUMN IF NOT EXISTS short_code text,
  ADD COLUMN IF NOT EXISTS down_payment numeric(10,2),
  ADD COLUMN IF NOT EXISTS teaching_mode teaching_mode NOT NULL DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS filemaker_id integer;
CREATE UNIQUE INDEX IF NOT EXISTS course_types_filemaker_id_key
  ON course_types (filemaker_id) WHERE filemaker_id IS NOT NULL;

-- exam_types exists since 0001. FileMaker's ExamReference adds the short code
-- and which of written / oral / both may be taken separately.
ALTER TABLE exam_types
  ADD COLUMN IF NOT EXISTS short_code text,
  ADD COLUMN IF NOT EXISTS parts_separable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS filemaker_id integer;
CREATE UNIQUE INDEX IF NOT EXISTS exam_types_filemaker_id_key
  ON exam_types (filemaker_id) WHERE filemaker_id IS NOT NULL;

ALTER TABLE levels
  ADD COLUMN IF NOT EXISTS cefr_band text,
  ADD COLUMN IF NOT EXISTS colour_hex text;

-- ----------------------------------------------------- teaching materials

-- FileMaker's BookReference (36) — the one real price table it has.
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  isbn text,
  publisher text,
  level_code text REFERENCES levels (code) ON DELETE SET NULL,
  /* Volume within a series: Netzwerk A1.1 is part 1, A1.2 part 2. */
  part smallint,
  is_active boolean NOT NULL DEFAULT true,
  filemaker_id integer UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (title, isbn)
);
DROP TRIGGER IF EXISTS materials_set_updated_at ON materials;
CREATE TRIGGER materials_set_updated_at
  BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------- the rate card

/* What a rate prices. One rate table rather than one per product, because
   every one answers the same question — amount, per what, when, for whom. */
DO $$ BEGIN
  CREATE TYPE rate_scope AS ENUM (
    'course_type', 'exam_type', 'accommodation', 'material', 'charge_type'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

/* Per what. `week` and `lesson` multiply by duration; `night` by nights;
   `item` is a fixed amount; `person_week` is the group-course unit. */
DO $$ BEGIN
  CREATE TYPE rate_unit AS ENUM ('item', 'week', 'lesson', 'night', 'month', 'person_week');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope rate_scope NOT NULL,
  /* Which thing of that scope. Null means "any" — a default for the scope. */
  course_type_id uuid REFERENCES course_types (id) ON DELETE CASCADE,
  exam_type_id uuid REFERENCES exam_types (id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials (id) ON DELETE CASCADE,
  accommodation_type_code text REFERENCES accommodation_types (code) ON DELETE CASCADE,
  catering_code text REFERENCES catering_options (code) ON DELETE CASCADE,
  room_type_code text REFERENCES accommodation_room_types (code) ON DELETE CASCADE,
  charge_type_code text REFERENCES charge_types (code) ON DELETE CASCADE,
  /* Narrowing conditions. Null means the rate does not care. */
  level_code text REFERENCES levels (code) ON DELETE SET NULL,
  day_time_code text REFERENCES day_times (code) ON DELETE SET NULL,
  /* Duration band, in the rate's own unit: 1–4 weeks at one price, 5+ at another. */
  min_quantity numeric(8,2),
  max_quantity numeric(8,2),
  /* Exam parts: 1 = written or oral alone, 2 = both. FileMaker's Case(). */
  parts smallint,
  amount numeric(10,2) NOT NULL CONSTRAINT rates_amount_check CHECK (amount >= 0),
  unit rate_unit NOT NULL DEFAULT 'item',
  currency text NOT NULL DEFAULT 'EUR',
  vat_rate numeric(5,2) NOT NULL DEFAULT 0,
  /* A price is true for a period. This is the column FileMaker never had, and
     the reason a 2027 price list can be entered in 2026 without touching 2026. */
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  note text,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT rates_period_check CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CONSTRAINT rates_quantity_check CHECK (
    min_quantity IS NULL OR max_quantity IS NULL OR max_quantity >= min_quantity
  ),
  /* Exactly one target, and it must match the scope. A rate that points at
     nothing, or at two things, is the ambiguity that made FileMaker's costs
     unauditable. */
  CONSTRAINT rates_target_check CHECK (
    CASE scope
      WHEN 'course_type' THEN course_type_id IS NOT NULL
      WHEN 'exam_type' THEN exam_type_id IS NOT NULL
      WHEN 'material' THEN material_id IS NOT NULL
      WHEN 'accommodation' THEN accommodation_type_code IS NOT NULL
      WHEN 'charge_type' THEN charge_type_code IS NOT NULL
    END
  )
);
CREATE INDEX IF NOT EXISTS rates_lookup_idx ON rates (scope, valid_from DESC);
CREATE INDEX IF NOT EXISTS rates_course_idx ON rates (course_type_id) WHERE course_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS rates_material_idx ON rates (material_id) WHERE material_id IS NOT NULL;

DROP TRIGGER IF EXISTS rates_set_updated_at ON rates;
CREATE TRIGGER rates_set_updated_at
  BEFORE UPDATE ON rates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

/* Which rate applies on a date, for the narrowest match. Ordering is the
   whole point: a rate naming the level beats one that does not, a rate with a
   quantity band beats an open one, and the latest `valid_from` wins a tie. */
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
  p_parts smallint DEFAULT NULL
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

-- --------------------------------------- booking_charges points at the type

/* 0010 used a CHECK list of nine kinds. The vocabulary is now a table of 34,
   so the column becomes a foreign key. The nine map onto the ported codes. */
ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS charge_type_code text;
ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS rate_id uuid REFERENCES rates (id) ON DELETE SET NULL;
ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS quantity numeric(8,2) NOT NULL DEFAULT 1;
ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS unit_amount numeric(10,2);
