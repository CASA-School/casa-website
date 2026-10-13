-- 0022 — letters (docs/LETTERS.md).
--
-- Every letter CASA sends from the workspace, kept exactly as it went out. The
-- offer is the first kind; enrolment confirmations, visa invitations and
-- attendance certificates are the next ones, and each is a new `kind`, not a
-- new table.
--
-- WHAT FILEMAKER DOES TODAY
--
-- `Letter` has 82 `_ID_*` columns (docs/FILEMAKER_LESSONS.md §3.2) and its
-- body is a text field a script writes once and the team edits by hand, so a
-- letter and the record it came from drift apart (offer 37602: 1,560 € in the
-- offer, 1,370 € in its letter). Here a letter is built from its record by
-- code, and what is stored is the result at the moment it was sent.
--
-- WHAT THIS ADDS
--
--   letters        one row per letter sent: its kind, the record it is about,
--                  whom it was addressed to, and the document as it went out
--                  (`document`, read by the workspace's letter sheet).
--   letter_texts   the standard texts of each kind of letter per language —
--                  an offer's opening and closing. A letter uses them until
--                  somebody changes its text; "Save as standard" changes them
--                  for every letter of that kind after.

CREATE TABLE IF NOT EXISTS letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  /* The record the letter is about: exactly one, named by the kind. A new kind
     of letter adds its record's column here and to the check below, so every
     link is a foreign key and every letter says what it is about. */
  offer_id uuid REFERENCES offers (id) ON DELETE RESTRICT,
  /* The record's own count: an offer's second version is its second letter. */
  version integer NOT NULL DEFAULT 1,
  language text NOT NULL,
  /* Whom it was addressed to, so "every letter to Vivimondo" is a query. */
  organisation_id uuid REFERENCES organisations (id) ON DELETE SET NULL,
  person_id uuid REFERENCES people (id) ON DELETE SET NULL,
  recipient_name text NOT NULL,
  email text,
  subject text NOT NULL,
  /* The document as it went out: the shape in src/lib/admin/letters/types.ts,
     with its `schema` number, so a letter sent today still reads after the
     shape changes. */
  document jsonb NOT NULL,
  /* What it was built from (for an offer: the draft, its lines and totals). */
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  sent_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  CONSTRAINT letters_kind_check CHECK (kind IN ('offer')),
  CONSTRAINT letters_subject_check CHECK ((kind = 'offer') = (offer_id IS NOT NULL)),
  CONSTRAINT letters_language_check CHECK (language IN ('de', 'en')),
  CONSTRAINT letters_version_check CHECK (version >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS letters_offer_version_key ON letters (offer_id, version) WHERE offer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS letters_organisation_idx ON letters (organisation_id, sent_at DESC) WHERE organisation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS letters_person_idx ON letters (person_id, sent_at DESC) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS letters_sent_idx ON letters (sent_at DESC);

/* No row means the text written in code (each kind's DEFAULT_TEXT). */
CREATE TABLE IF NOT EXISTS letter_texts (
  kind text NOT NULL,
  language text NOT NULL,
  part text NOT NULL,
  body text NOT NULL,
  updated_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (kind, language, part),
  CONSTRAINT letter_texts_kind_check CHECK (kind IN ('offer')),
  CONSTRAINT letter_texts_language_check CHECK (language IN ('de', 'en')),
  CONSTRAINT letter_texts_part_check CHECK (part ~ '^[a-z_]{2,40}$')
);
