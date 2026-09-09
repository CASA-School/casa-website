-- People, typed facts, flags, and FileMaker links.
--
-- WHY THIS MIGRATION EXISTS
--
-- 0006 gave the workspace four queues. It also gave it FileMaker's oldest
-- problem in miniature: the same human who enquires, registers and sits the
-- placement test is three unrelated rows, and there is no record that says
-- "this is one person". docs/FILEMAKER_LESSONS.md §1 measures what that costs
-- after fifteen years — 501 probable duplicates, two identity keys on 72
-- tables — and this is the moment to not start down that road, while the
-- queues hold demo data.
--
-- Four things, each a rule from that document made concrete:
--
--   1. A `people` table, and typed contact channels. Every queue row links to a
--      person. Duplicate detection is a FLAG a person resolves by linking, never
--      a merge a script performs (§1.2).
--   2. Typed facts where 0006 stored text: birth_date is a date, nationality is
--      an ISO code against `countries`, the declared level is a code against
--      `levels`, salutation and accommodation are enums (§2.4, §4.4). The raw
--      submitted text is kept beside the typed value — nothing is "fixed"
--      silently (§11).
--   3. `filemaker_links` replaces the single opaque `external_ref` string with
--      the source triplet the migration model uses (§1.4).
--   4. `record_flags`: one place for "this row needs a look and here is why".
--
-- The raw-plus-typed pattern is deliberate and asymmetric: where the public form
-- already constrains a value (salutation, accommodation type, exam part) the
-- column simply becomes the enum; where it does not (nationality is a name,
-- level is a string the catalogue happened to offer), the raw text survives.

-- ------------------------------------------------------------- vocabularies

DO $$
BEGIN
  CREATE TYPE salutation AS ENUM ('mr', 'ms', 'mx', 'neutral');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE accommodation_type AS ENUM ('flat', 'host');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ISO 3166-1 alpha-2. `name_en` is exactly what the public form submits
-- (both come from the `country-list` package), so intake can look a name up
-- and either find one code or flag the row. `filemaker_flag_id` is filled when
-- the FileMaker `Flag` table is imported; its `CountryLong_1` carries the ISO
-- code, so the join is mechanical.
CREATE TABLE IF NOT EXISTS countries (
  code char(2) PRIMARY KEY,
  name_en text NOT NULL,
  name_de text NOT NULL,
  filemaker_flag_id integer,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS countries_name_en_idx ON countries (lower(name_en));
CREATE INDEX IF NOT EXISTS countries_name_de_idx ON countries (lower(name_de));

INSERT INTO countries (code, name_en, name_de) VALUES
  ('AD', 'Andorra', 'Andorra'),
  ('AE', 'United Arab Emirates (the)', 'Vereinigte Arabische Emirate'),
  ('AF', 'Afghanistan', 'Afghanistan'),
  ('AG', 'Antigua and Barbuda', 'Antigua und Barbuda'),
  ('AI', 'Anguilla', 'Anguilla'),
  ('AL', 'Albania', 'Albanien'),
  ('AM', 'Armenia', 'Armenien'),
  ('AO', 'Angola', 'Angola'),
  ('AQ', 'Antarctica', 'Antarktis'),
  ('AR', 'Argentina', 'Argentinien'),
  ('AS', 'American Samoa', 'Amerikanisch-Samoa'),
  ('AT', 'Austria', 'Österreich'),
  ('AU', 'Australia', 'Australien'),
  ('AW', 'Aruba', 'Aruba'),
  ('AX', 'Åland Islands', 'Ålandinseln'),
  ('AZ', 'Azerbaijan', 'Aserbaidschan'),
  ('BA', 'Bosnia and Herzegovina', 'Bosnien und Herzegowina'),
  ('BB', 'Barbados', 'Barbados'),
  ('BD', 'Bangladesh', 'Bangladesch'),
  ('BE', 'Belgium', 'Belgien'),
  ('BF', 'Burkina Faso', 'Burkina Faso'),
  ('BG', 'Bulgaria', 'Bulgarien'),
  ('BH', 'Bahrain', 'Bahrain'),
  ('BI', 'Burundi', 'Burundi'),
  ('BJ', 'Benin', 'Benin'),
  ('BL', 'Saint Barthélemy', 'St. Barthélemy'),
  ('BM', 'Bermuda', 'Bermuda'),
  ('BN', 'Brunei Darussalam', 'Brunei Darussalam'),
  ('BO', 'Bolivia (Plurinational State of)', 'Bolivien'),
  ('BQ', 'Bonaire, Sint Eustatius and Saba', 'Karibische Niederlande'),
  ('BR', 'Brazil', 'Brasilien'),
  ('BS', 'Bahamas (The)', 'Bahamas'),
  ('BT', 'Bhutan', 'Bhutan'),
  ('BV', 'Bouvet Island', 'Bouvetinsel'),
  ('BW', 'Botswana', 'Botsuana'),
  ('BY', 'Belarus', 'Belarus'),
  ('BZ', 'Belize', 'Belize'),
  ('CA', 'Canada', 'Kanada'),
  ('CC', 'Cocos (Keeling) Islands (the)', 'Kokosinseln'),
  ('CD', 'Congo (the Democratic Republic of the)', 'Kongo-Kinshasa'),
  ('CF', 'Central African Republic (the)', 'Zentralafrikanische Republik'),
  ('CG', 'Congo (the)', 'Kongo-Brazzaville'),
  ('CH', 'Switzerland', 'Schweiz'),
  ('CI', 'Côte d''Ivoire', 'Côte d’Ivoire'),
  ('CK', 'Cook Islands (the)', 'Cookinseln'),
  ('CL', 'Chile', 'Chile'),
  ('CM', 'Cameroon', 'Kamerun'),
  ('CN', 'China', 'China'),
  ('CO', 'Colombia', 'Kolumbien'),
  ('CR', 'Costa Rica', 'Costa Rica'),
  ('CU', 'Cuba', 'Kuba'),
  ('CV', 'Cabo Verde', 'Cabo Verde'),
  ('CW', 'Curaçao', 'Curaçao'),
  ('CX', 'Christmas Island', 'Weihnachtsinsel'),
  ('CY', 'Cyprus', 'Zypern'),
  ('CZ', 'Czechia', 'Tschechien'),
  ('DE', 'Germany', 'Deutschland'),
  ('DJ', 'Djibouti', 'Dschibuti'),
  ('DK', 'Denmark', 'Dänemark'),
  ('DM', 'Dominica', 'Dominica'),
  ('DO', 'Dominican Republic (the)', 'Dominikanische Republik'),
  ('DZ', 'Algeria', 'Algerien'),
  ('EC', 'Ecuador', 'Ecuador'),
  ('EE', 'Estonia', 'Estland'),
  ('EG', 'Egypt', 'Ägypten'),
  ('EH', 'Western Sahara*', 'Westsahara'),
  ('ER', 'Eritrea', 'Eritrea'),
  ('ES', 'Spain', 'Spanien'),
  ('ET', 'Ethiopia', 'Äthiopien'),
  ('FI', 'Finland', 'Finnland'),
  ('FJ', 'Fiji', 'Fidschi'),
  ('FK', 'Falkland Islands (the) [Malvinas]', 'Falklandinseln'),
  ('FM', 'Micronesia (Federated States of)', 'Mikronesien'),
  ('FO', 'Faroe Islands (the)', 'Färöer'),
  ('FR', 'France', 'Frankreich'),
  ('GA', 'Gabon', 'Gabun'),
  ('GB', 'United Kingdom of Great Britain and Northern Ireland (the)', 'Vereinigtes Königreich'),
  ('GD', 'Grenada', 'Grenada'),
  ('GE', 'Georgia', 'Georgien'),
  ('GF', 'French Guiana', 'Französisch-Guayana'),
  ('GG', 'Guernsey', 'Guernsey'),
  ('GH', 'Ghana', 'Ghana'),
  ('GI', 'Gibraltar', 'Gibraltar'),
  ('GL', 'Greenland', 'Grönland'),
  ('GM', 'Gambia (the)', 'Gambia'),
  ('GN', 'Guinea', 'Guinea'),
  ('GP', 'Guadeloupe', 'Guadeloupe'),
  ('GQ', 'Equatorial Guinea', 'Äquatorialguinea'),
  ('GR', 'Greece', 'Griechenland'),
  ('GS', 'South Georgia and the South Sandwich Islands', 'Südgeorgien und die Südlichen Sandwichinseln'),
  ('GT', 'Guatemala', 'Guatemala'),
  ('GU', 'Guam', 'Guam'),
  ('GW', 'Guinea-Bissau', 'Guinea-Bissau'),
  ('GY', 'Guyana', 'Guyana'),
  ('HK', 'Hong Kong', 'Sonderverwaltungsregion Hongkong'),
  ('HM', 'Heard Island and McDonald Islands', 'Heard und McDonaldinseln'),
  ('HN', 'Honduras', 'Honduras'),
  ('HR', 'Croatia', 'Kroatien'),
  ('HT', 'Haiti', 'Haiti'),
  ('HU', 'Hungary', 'Ungarn'),
  ('ID', 'Indonesia', 'Indonesien'),
  ('IE', 'Ireland', 'Irland'),
  ('IL', 'Israel', 'Israel'),
  ('IM', 'Isle of Man', 'Isle of Man'),
  ('IN', 'India', 'Indien'),
  ('IO', 'British Indian Ocean Territory (the)', 'Britisches Territorium im Indischen Ozean'),
  ('IQ', 'Iraq', 'Irak'),
  ('IR', 'Iran (Islamic Republic of)', 'Iran'),
  ('IS', 'Iceland', 'Island'),
  ('IT', 'Italy', 'Italien'),
  ('JE', 'Jersey', 'Jersey'),
  ('JM', 'Jamaica', 'Jamaika'),
  ('JO', 'Jordan', 'Jordanien'),
  ('JP', 'Japan', 'Japan'),
  ('KE', 'Kenya', 'Kenia'),
  ('KG', 'Kyrgyzstan', 'Kirgisistan'),
  ('KH', 'Cambodia', 'Kambodscha'),
  ('KI', 'Kiribati', 'Kiribati'),
  ('KM', 'Comoros (the)', 'Komoren'),
  ('KN', 'Saint Kitts and Nevis', 'St. Kitts und Nevis'),
  ('KP', 'Korea (the Democratic People''s Republic of)', 'Nordkorea'),
  ('KR', 'Korea (the Republic of)', 'Südkorea'),
  ('KW', 'Kuwait', 'Kuwait'),
  ('KY', 'Cayman Islands (the)', 'Kaimaninseln'),
  ('KZ', 'Kazakhstan', 'Kasachstan'),
  ('LA', 'Lao People''s Democratic Republic (the)', 'Laos'),
  ('LB', 'Lebanon', 'Libanon'),
  ('LC', 'Saint Lucia', 'St. Lucia'),
  ('LI', 'Liechtenstein', 'Liechtenstein'),
  ('LK', 'Sri Lanka', 'Sri Lanka'),
  ('LR', 'Liberia', 'Liberia'),
  ('LS', 'Lesotho', 'Lesotho'),
  ('LT', 'Lithuania', 'Litauen'),
  ('LU', 'Luxembourg', 'Luxemburg'),
  ('LV', 'Latvia', 'Lettland'),
  ('LY', 'Libya', 'Libyen'),
  ('MA', 'Morocco', 'Marokko'),
  ('MC', 'Monaco', 'Monaco'),
  ('MD', 'Moldova (the Republic of)', 'Republik Moldau'),
  ('ME', 'Montenegro', 'Montenegro'),
  ('MF', 'Saint Martin (French part)', 'St. Martin'),
  ('MG', 'Madagascar', 'Madagaskar'),
  ('MH', 'Marshall Islands (the)', 'Marshallinseln'),
  ('MK', 'North Macedonia', 'Nordmazedonien'),
  ('ML', 'Mali', 'Mali'),
  ('MM', 'Myanmar', 'Myanmar'),
  ('MN', 'Mongolia', 'Mongolei'),
  ('MO', 'Macao', 'Sonderverwaltungsregion Macau'),
  ('MP', 'Northern Mariana Islands (the)', 'Nördliche Marianen'),
  ('MQ', 'Martinique', 'Martinique'),
  ('MR', 'Mauritania', 'Mauretanien'),
  ('MS', 'Montserrat', 'Montserrat'),
  ('MT', 'Malta', 'Malta'),
  ('MU', 'Mauritius', 'Mauritius'),
  ('MV', 'Maldives', 'Malediven'),
  ('MW', 'Malawi', 'Malawi'),
  ('MX', 'Mexico', 'Mexiko'),
  ('MY', 'Malaysia', 'Malaysia'),
  ('MZ', 'Mozambique', 'Mosambik'),
  ('NA', 'Namibia', 'Namibia'),
  ('NC', 'New Caledonia', 'Neukaledonien'),
  ('NE', 'Niger (the)', 'Niger'),
  ('NF', 'Norfolk Island', 'Norfolkinsel'),
  ('NG', 'Nigeria', 'Nigeria'),
  ('NI', 'Nicaragua', 'Nicaragua'),
  ('NL', 'Netherlands (Kingdom of the)', 'Niederlande'),
  ('NO', 'Norway', 'Norwegen'),
  ('NP', 'Nepal', 'Nepal'),
  ('NR', 'Nauru', 'Nauru'),
  ('NU', 'Niue', 'Niue'),
  ('NZ', 'New Zealand', 'Neuseeland'),
  ('OM', 'Oman', 'Oman'),
  ('PA', 'Panama', 'Panama'),
  ('PE', 'Peru', 'Peru'),
  ('PF', 'French Polynesia', 'Französisch-Polynesien'),
  ('PG', 'Papua New Guinea', 'Papua-Neuguinea'),
  ('PH', 'Philippines (the)', 'Philippinen'),
  ('PK', 'Pakistan', 'Pakistan'),
  ('PL', 'Poland', 'Polen'),
  ('PM', 'Saint Pierre and Miquelon', 'St. Pierre und Miquelon'),
  ('PN', 'Pitcairn', 'Pitcairninseln'),
  ('PR', 'Puerto Rico', 'Puerto Rico'),
  ('PS', 'Palestine, State of', 'Palästinensische Autonomiegebiete'),
  ('PT', 'Portugal', 'Portugal'),
  ('PW', 'Palau', 'Palau'),
  ('PY', 'Paraguay', 'Paraguay'),
  ('QA', 'Qatar', 'Katar'),
  ('RE', 'Réunion', 'Réunion'),
  ('RO', 'Romania', 'Rumänien'),
  ('RS', 'Serbia', 'Serbien'),
  ('RU', 'Russian Federation (the)', 'Russland'),
  ('RW', 'Rwanda', 'Ruanda'),
  ('SA', 'Saudi Arabia', 'Saudi-Arabien'),
  ('SB', 'Solomon Islands', 'Salomonen'),
  ('SC', 'Seychelles', 'Seychellen'),
  ('SD', 'Sudan (the)', 'Sudan'),
  ('SE', 'Sweden', 'Schweden'),
  ('SG', 'Singapore', 'Singapur'),
  ('SH', 'Saint Helena, Ascension and Tristan da Cunha', 'St. Helena'),
  ('SI', 'Slovenia', 'Slowenien'),
  ('SJ', 'Svalbard and Jan Mayen', 'Spitzbergen und Jan Mayen'),
  ('SK', 'Slovakia', 'Slowakei'),
  ('SL', 'Sierra Leone', 'Sierra Leone'),
  ('SM', 'San Marino', 'San Marino'),
  ('SN', 'Senegal', 'Senegal'),
  ('SO', 'Somalia', 'Somalia'),
  ('SR', 'Suriname', 'Suriname'),
  ('SS', 'South Sudan', 'Südsudan'),
  ('ST', 'Sao Tome and Principe', 'São Tomé und Príncipe'),
  ('SV', 'El Salvador', 'El Salvador'),
  ('SX', 'Sint Maarten (Dutch part)', 'Sint Maarten'),
  ('SY', 'Syrian Arab Republic (the)', 'Syrien'),
  ('SZ', 'Eswatini', 'Eswatini'),
  ('TC', 'Turks and Caicos Islands (the)', 'Turks- und Caicosinseln'),
  ('TD', 'Chad', 'Tschad'),
  ('TF', 'French Southern Territories (the)', 'Französische Süd- und Antarktisgebiete'),
  ('TG', 'Togo', 'Togo'),
  ('TH', 'Thailand', 'Thailand'),
  ('TJ', 'Tajikistan', 'Tadschikistan'),
  ('TK', 'Tokelau', 'Tokelau'),
  ('TL', 'Timor-Leste', 'Timor-Leste'),
  ('TM', 'Turkmenistan', 'Turkmenistan'),
  ('TN', 'Tunisia', 'Tunesien'),
  ('TO', 'Tonga', 'Tonga'),
  ('TR', 'Türkiye', 'Türkei'),
  ('TT', 'Trinidad and Tobago', 'Trinidad und Tobago'),
  ('TV', 'Tuvalu', 'Tuvalu'),
  ('TW', 'Taiwan (Province of China)', 'Taiwan'),
  ('TZ', 'Tanzania, the United Republic of', 'Tansania'),
  ('UA', 'Ukraine', 'Ukraine'),
  ('UG', 'Uganda', 'Uganda'),
  ('UM', 'United States Minor Outlying Islands (the)', 'Amerikanische Überseeinseln'),
  ('US', 'United States of America (the)', 'Vereinigte Staaten'),
  ('UY', 'Uruguay', 'Uruguay'),
  ('UZ', 'Uzbekistan', 'Usbekistan'),
  ('VA', 'Holy See (the)', 'Vatikanstadt'),
  ('VC', 'Saint Vincent and the Grenadines', 'St. Vincent und die Grenadinen'),
  ('VE', 'Venezuela (Bolivarian Republic of)', 'Venezuela'),
  ('VG', 'Virgin Islands (British)', 'Britische Jungferninseln'),
  ('VI', 'Virgin Islands (U.S.)', 'Amerikanische Jungferninseln'),
  ('VN', 'Viet Nam', 'Vietnam'),
  ('VU', 'Vanuatu', 'Vanuatu'),
  ('WF', 'Wallis and Futuna', 'Wallis und Futuna'),
  ('WS', 'Samoa', 'Samoa'),
  ('YE', 'Yemen', 'Jemen'),
  ('YT', 'Mayotte', 'Mayotte'),
  ('ZA', 'South Africa', 'Südafrika'),
  ('ZM', 'Zambia', 'Sambia'),
  ('ZW', 'Zimbabwe', 'Simbabwe')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de;

-- CASA's own level scale — the single place it is defined in the database.
-- Mirrors CASA_LEVEL_SEQUENCE in src/config/calculator/pricing.ts; a test
-- keeps the two in step. `filemaker_level_step_id` maps to LevelStepReference
-- (13 rows: FileMaker splits B1+ into B1+1/B1+2 and has a C1.3 we do not).
-- Where FileMaker has two ids for our one band, the LOWER id is stored here
-- and the split is decided once, in this table, not in every consumer (§5.2).
CREATE TABLE IF NOT EXISTS levels (
  code text PRIMARY KEY,
  cefr text NOT NULL,
  sort_order integer NOT NULL UNIQUE,
  filemaker_level_step_id integer
);

INSERT INTO levels (code, cefr, sort_order, filemaker_level_step_id) VALUES
  ('A1.1', 'A1', 1, 1),
  ('A1.2', 'A1', 2, 2),
  ('A2.1', 'A2', 3, 3),
  ('A2.2', 'A2', 4, 4),
  ('B1.1', 'B1', 5, 5),
  ('B1.2', 'B1', 6, 6),
  ('B1+',  'B1', 7, 7),
  ('B2.1', 'B2', 8, 9),
  ('B2.2', 'B2', 9, 10),
  ('C1.1', 'C1', 10, 11),
  ('C1.2', 'C1', 11, 12)
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------------------- people

-- One row per human, from first contact. "Student" is not a second key; it is
-- a state a person is in (FileMaker's _ID_Student exists only after conversion,
-- and 8,385 of 15,344 persons never got one — §1.1).
--
-- `merged_into`: when two rows turn out to be one person, a staff member LINKS
-- the duplicate to the survivor. Both rows and both histories stay; reads
-- resolve through canonical_person_id(). Nothing is deleted and no foreign key
-- is rewritten, so the link is reversible and the record of "this came in under
-- a duplicate" survives (§1.2).
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salutation salutation,
  first_name text NOT NULL,
  last_name text,
  birth_date date,
  nationality_code char(2) REFERENCES countries (code),
  -- What was actually submitted, kept even when the code resolved.
  nationality_raw text,
  merged_into uuid REFERENCES people (id) ON DELETE SET NULL,
  -- 'public-site', 'staff:<uuid>', 'demo-seed', 'migration-0007'
  created_by text NOT NULL DEFAULT 'public-site',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT people_not_self_merged CHECK (merged_into IS NULL OR merged_into <> id)
);
CREATE INDEX IF NOT EXISTS people_name_idx ON people (lower(last_name), lower(first_name));
CREATE INDEX IF NOT EXISTS people_birth_date_idx ON people (birth_date) WHERE birth_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS people_merged_into_idx ON people (merged_into) WHERE merged_into IS NOT NULL;

DROP TRIGGER IF EXISTS people_set_updated_at ON people;
CREATE TRIGGER people_set_updated_at
  BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Follows merged_into to the surviving row. Depth-capped so a cycle, which the
-- application refuses to create, could never hang a query.
CREATE OR REPLACE FUNCTION canonical_person_id(p uuid) RETURNS uuid
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE chain AS (
    SELECT id, merged_into, 0 AS depth FROM people WHERE id = p
    UNION ALL
    SELECT ppl.id, ppl.merged_into, chain.depth + 1
      FROM people ppl JOIN chain ON ppl.id = chain.merged_into
     WHERE chain.depth < 10
  )
  SELECT id FROM chain ORDER BY depth DESC LIMIT 1
$$;

-- Contact channels: one table per channel, one owner column. FileMaker's
-- Email table has 20–30 optional owner columns and 98% of Contacts link to none
-- of its rows (§1.3). `normalized` is what duplicate detection compares.
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  address text NOT NULL,
  normalized text NOT NULL,
  kind text NOT NULL DEFAULT 'personal',
  is_primary boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (person_id, normalized)
);
CREATE INDEX IF NOT EXISTS emails_normalized_idx ON emails (normalized);

CREATE TABLE IF NOT EXISTS phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  number text NOT NULL,
  normalized text NOT NULL,
  kind text NOT NULL DEFAULT 'mobile',
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (person_id, normalized)
);
CREATE INDEX IF NOT EXISTS phones_normalized_idx ON phones (normalized);

-- --------------------------------------------------------------------- flags

-- "This row needs a look, and here is why." One table, typed codes, resolved
-- by a named person. The workspace's version of the migration model's quality
-- issues: nothing is corrected silently; it is flagged and shown (§11).
CREATE TABLE IF NOT EXISTS record_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  code text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  CONSTRAINT record_flags_entity_check CHECK (entity IN (
    'person', 'enquiry', 'course_registration', 'exam_registration',
    'career_application', 'placement_attempt'
  )),
  CONSTRAINT record_flags_code_check CHECK (code IN (
    'duplicate_candidate', 'nationality_unmatched', 'level_unmatched',
    'birth_date_unparsed', 'person_unlinked', 'cohort_withdrawn'
  ))
);
-- One OPEN flag per (row, reason); a resolved one may be raised again later.
CREATE UNIQUE INDEX IF NOT EXISTS record_flags_open_unique
  ON record_flags (entity, entity_id, code) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS record_flags_entity_idx ON record_flags (entity, entity_id);

-- ----------------------------------------------------------- filemaker links

-- Replaces the `external_ref text` columns 0006 reserved. A FileMaker record is
-- identified by (database, layout, recordId) plus the table's own primary key,
-- and a row here is one such record linked to one workspace row — the same
-- shape as casa_student.student_source_links in the migration model, so phase
-- 3 finds the links already made (§1.4; docs/FILEMAKER_BRIDGE.md §5).
CREATE TABLE IF NOT EXISTS filemaker_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  source_database text NOT NULL DEFAULT 'SchoolMan',
  source_layout text NOT NULL,
  source_record_id text NOT NULL,
  source_primary_key text,
  source_mod_id text,
  linked_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  linked_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  CONSTRAINT filemaker_links_entity_check CHECK (entity IN (
    'person', 'enquiry', 'course_registration', 'exam_registration',
    'placement_review'
  )),
  UNIQUE (entity, entity_id, source_database, source_layout)
);
CREATE INDEX IF NOT EXISTS filemaker_links_source_idx
  ON filemaker_links (source_database, source_layout, source_record_id);

-- ------------------------------------------------ queue tables: typed columns

ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people (id) ON DELETE SET NULL;
ALTER TABLE enquiries DROP COLUMN IF EXISTS external_ref;
CREATE INDEX IF NOT EXISTS enquiries_person_idx ON enquiries (person_id);

-- course_registrations: raw text becomes raw + typed.
ALTER TABLE course_registrations
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'registration-form',
  ADD COLUMN IF NOT EXISTS nationality_code char(2) REFERENCES countries (code),
  ADD COLUMN IF NOT EXISTS declared_level_code text REFERENCES levels (code);
ALTER TABLE course_registrations RENAME COLUMN birth_date TO birth_date_raw;
ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE course_registrations RENAME COLUMN nationality TO nationality_raw;
ALTER TABLE course_registrations RENAME COLUMN current_level TO declared_level_raw;
ALTER TABLE course_registrations
  ALTER COLUMN salutation TYPE salutation USING salutation::salutation,
  ALTER COLUMN accommodation_type TYPE accommodation_type
    USING NULLIF(accommodation_type, '')::accommodation_type;
ALTER TABLE course_registrations DROP COLUMN IF EXISTS external_ref;
CREATE INDEX IF NOT EXISTS course_registrations_person_idx ON course_registrations (person_id);

ALTER TABLE exam_registrations
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'registration-form',
  ADD COLUMN IF NOT EXISTS nationality_code char(2) REFERENCES countries (code);
ALTER TABLE exam_registrations RENAME COLUMN birth_date TO birth_date_raw;
ALTER TABLE exam_registrations ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE exam_registrations RENAME COLUMN nationality TO nationality_raw;
ALTER TABLE exam_registrations
  ALTER COLUMN salutation TYPE salutation USING salutation::salutation;
ALTER TABLE exam_registrations DROP COLUMN IF EXISTS external_ref;
CREATE INDEX IF NOT EXISTS exam_registrations_person_idx ON exam_registrations (person_id);

-- A placement ATTEMPT stays anonymous (0005: the learner gives no name, and
-- linking one to a real person is a data-protection decision for CASA). The
-- staff REVIEW may name a person — that is a staff member's decision, made on
-- the review screen and recorded against them. So the link lives here, not on
-- placement_attempts, and it is optional.
ALTER TABLE placement_reviews
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_level_code text REFERENCES levels (code);
UPDATE placement_reviews r SET confirmed_level_code = l.code
  FROM levels l WHERE l.code = r.confirmed_level AND r.confirmed_level_code IS NULL;
CREATE INDEX IF NOT EXISTS placement_reviews_person_idx ON placement_reviews (person_id);

-- Notes on a person, too.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (entity IN (
  'person', 'enquiry', 'course_registration', 'exam_registration',
  'career_application', 'placement_attempt'
));

-- ---------------------------------------------------------------- backfill

-- Existing rows get a person each, 1:1, created_by 'migration-0007'. No
-- deduplication here — that is a human decision (§1.2), and the application
-- raises duplicate_candidate flags for these rows on the next intake pass.
-- Typed values are derived only where the mapping is exact; everything else
-- is left NULL and flagged, never guessed.

-- course registrations
WITH created AS (
  INSERT INTO people (salutation, first_name, last_name, birth_date, nationality_code, nationality_raw, created_by, created_at)
  SELECT r.salutation, r.first_name, r.last_name,
         CASE WHEN r.birth_date_raw ~ '^\d{4}-\d{2}-\d{2}$' THEN r.birth_date_raw::date END,
         c.code, r.nationality_raw, 'migration-0007', r.submitted_at
    FROM course_registrations r
    LEFT JOIN countries c ON lower(c.name_en) = lower(r.nationality_raw)
   WHERE r.person_id IS NULL
  RETURNING id, first_name, last_name, created_at
)
UPDATE course_registrations r SET person_id = created.id
  FROM created
 WHERE r.person_id IS NULL AND r.first_name = created.first_name
   AND r.last_name = created.last_name AND r.submitted_at = created.created_at;

UPDATE course_registrations r SET
  birth_date = CASE WHEN birth_date_raw ~ '^\d{4}-\d{2}-\d{2}$' THEN birth_date_raw::date END,
  nationality_code = (SELECT code FROM countries c WHERE lower(c.name_en) = lower(r.nationality_raw)),
  declared_level_code = (SELECT code FROM levels l WHERE l.code = r.declared_level_raw)
 WHERE birth_date IS NULL AND nationality_code IS NULL AND declared_level_code IS NULL;

INSERT INTO emails (person_id, address, normalized, created_at)
SELECT r.person_id, r.email, lower(trim(r.email)), r.submitted_at
  FROM course_registrations r WHERE r.person_id IS NOT NULL AND r.email <> ''
ON CONFLICT DO NOTHING;
INSERT INTO phones (person_id, number, normalized, created_at)
SELECT r.person_id, r.phone, regexp_replace(r.phone, '[^0-9+]', '', 'g'), r.submitted_at
  FROM course_registrations r WHERE r.person_id IS NOT NULL AND r.phone <> ''
ON CONFLICT DO NOTHING;

-- exam registrations
WITH created AS (
  INSERT INTO people (salutation, first_name, last_name, birth_date, nationality_code, nationality_raw, created_by, created_at)
  SELECT r.salutation, r.first_name, r.last_name,
         CASE WHEN r.birth_date_raw ~ '^\d{4}-\d{2}-\d{2}$' THEN r.birth_date_raw::date END,
         c.code, r.nationality_raw, 'migration-0007', r.submitted_at
    FROM exam_registrations r
    LEFT JOIN countries c ON lower(c.name_en) = lower(r.nationality_raw)
   WHERE r.person_id IS NULL
  RETURNING id, first_name, last_name, created_at
)
UPDATE exam_registrations r SET person_id = created.id
  FROM created
 WHERE r.person_id IS NULL AND r.first_name = created.first_name
   AND r.last_name = created.last_name AND r.submitted_at = created.created_at;

UPDATE exam_registrations r SET
  birth_date = CASE WHEN birth_date_raw ~ '^\d{4}-\d{2}-\d{2}$' THEN birth_date_raw::date END,
  nationality_code = (SELECT code FROM countries c WHERE lower(c.name_en) = lower(r.nationality_raw))
 WHERE birth_date IS NULL AND nationality_code IS NULL;

INSERT INTO emails (person_id, address, normalized, created_at)
SELECT r.person_id, r.email, lower(trim(r.email)), r.submitted_at
  FROM exam_registrations r WHERE r.person_id IS NOT NULL AND r.email <> ''
ON CONFLICT DO NOTHING;
INSERT INTO phones (person_id, number, normalized, created_at)
SELECT r.person_id, r.phone, regexp_replace(r.phone, '[^0-9+]', '', 'g'), r.submitted_at
  FROM exam_registrations r WHERE r.person_id IS NOT NULL AND r.phone <> ''
ON CONFLICT DO NOTHING;

-- enquiries: a person with a name and an address, no date of birth
WITH created AS (
  INSERT INTO people (first_name, last_name, created_by, created_at)
  SELECT e.first_name, e.last_name, 'migration-0007', e.submitted_at
    FROM enquiries e WHERE e.person_id IS NULL
  RETURNING id, first_name, created_at
)
UPDATE enquiries e SET person_id = created.id
  FROM created
 WHERE e.person_id IS NULL AND e.first_name = created.first_name AND e.submitted_at = created.created_at;

INSERT INTO emails (person_id, address, normalized, created_at)
SELECT e.person_id, e.email, lower(trim(e.email)), e.submitted_at
  FROM enquiries e WHERE e.person_id IS NOT NULL AND e.email <> ''
ON CONFLICT DO NOTHING;

-- Flags for everything the backfill could not type. The migration raises them;
-- a person clears them.
INSERT INTO record_flags (entity, entity_id, code, detail)
SELECT 'course_registration', id, 'nationality_unmatched', jsonb_build_object('raw', nationality_raw)
  FROM course_registrations WHERE nationality_code IS NULL AND nationality_raw <> ''
ON CONFLICT DO NOTHING;
INSERT INTO record_flags (entity, entity_id, code, detail)
SELECT 'exam_registration', id, 'nationality_unmatched', jsonb_build_object('raw', nationality_raw)
  FROM exam_registrations WHERE nationality_code IS NULL AND nationality_raw <> ''
ON CONFLICT DO NOTHING;
INSERT INTO record_flags (entity, entity_id, code, detail)
SELECT 'course_registration', id, 'level_unmatched', jsonb_build_object('raw', declared_level_raw)
  FROM course_registrations WHERE declared_level_code IS NULL AND declared_level_raw IS NOT NULL AND declared_level_raw <> ''
ON CONFLICT DO NOTHING;
INSERT INTO record_flags (entity, entity_id, code, detail)
SELECT 'course_registration', id, 'birth_date_unparsed', jsonb_build_object('raw', birth_date_raw)
  FROM course_registrations WHERE birth_date IS NULL AND birth_date_raw <> ''
ON CONFLICT DO NOTHING;
INSERT INTO record_flags (entity, entity_id, code, detail)
SELECT 'exam_registration', id, 'birth_date_unparsed', jsonb_build_object('raw', birth_date_raw)
  FROM exam_registrations WHERE birth_date IS NULL AND birth_date_raw <> ''
ON CONFLICT DO NOTHING;
