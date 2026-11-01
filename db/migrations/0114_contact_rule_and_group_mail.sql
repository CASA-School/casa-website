-- 0114 — Which address a person is written to, and mail to a group (2026-11-01).
--
-- Rahman: „some participants coming through agency — in such informative emails their personal email
-- should be considered as primary email", and „what if a participant has more than one email or phone".
-- A person has as many addresses and numbers as they gave us — each registration adds its own, SchoolMan's
-- come across — spread over their linked records. One rule decides which one the workspace uses, here in
-- SQL so every list, every mail and the group mail ask the same question and get the same answer:
--
--   1. their own address before a shared one. An organisation's address (its own or one of its contacts')
--      or one a colleague marked „Agentur" comes last; one used by three people or more — an agency nobody
--      has entered yet — before that;
--   2. the one a colleague chose (`is_primary`);
--   3. a private address before a work one;
--   4. the newest: the address they gave us last.
--
-- Nothing in the data is reclassified: an organisation entered later changes the answer by itself.
-- Phones the same way, an emergency number (someone else's) never first.

CREATE INDEX IF NOT EXISTS organisations_email_idx ON organisations (lower(trim(email))) WHERE email IS NOT NULL;

-- Whose an address is besides the person's: 2 an organisation's, 1 several people's, 0 their own.
CREATE OR REPLACE FUNCTION email_tier(addr text) RETURNS smallint
LANGUAGE sql STABLE AS $$
  SELECT (CASE
    WHEN EXISTS (SELECT 1 FROM organisations o WHERE lower(trim(o.email)) = addr)
      OR EXISTS (SELECT 1 FROM organisation_contacts c WHERE lower(c.email) = addr) THEN 2
    WHEN (SELECT count(DISTINCT canonical_person_id(e.person_id)) FROM emails e WHERE e.normalized = addr) >= 3 THEN 1
    ELSE 0
  END)::smallint
$$;

-- A person's records: the one kept and every one linked into it. Nearly nobody has a record linked into
-- them, so an index lookup answers first (as `FAMILY` in src/lib/admin/people.ts).
CREATE OR REPLACE FUNCTION person_records(person uuid) RETURNS uuid[]
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM people m WHERE m.merged_into = r.root) THEN person_family(r.root) ELSE ARRAY[r.root] END
    FROM (SELECT coalesce(canonical_person_id(person), person) AS root) r
$$;

-- Every address of a person, once each, in the order of the rule: `rank` 1 is the one written to.
CREATE OR REPLACE FUNCTION person_emails(person uuid)
RETURNS TABLE (id uuid, address text, normalized text, kind text, is_primary boolean, note text, tier smallint, created_at timestamptz, rank integer)
LANGUAGE sql STABLE AS $$
  WITH one AS (
    SELECT DISTINCT ON (e.normalized) e.id, e.address, e.normalized, e.kind, e.is_primary, e.note, e.created_at
      FROM emails e
     WHERE e.person_id = ANY (person_records(person))
     ORDER BY e.normalized, e.is_primary DESC, e.created_at DESC
  ), tiered AS (
    SELECT one.*, (CASE WHEN one.kind = 'agency' THEN 2 ELSE email_tier(one.normalized) END)::smallint AS tier FROM one
  )
  SELECT t.id, t.address, t.normalized, t.kind, t.is_primary, t.note, t.tier, t.created_at,
         (row_number() OVER (ORDER BY t.tier, t.is_primary DESC, (t.kind = 'personal') DESC, t.created_at DESC))::integer AS rank
    FROM tiered t
$$;

CREATE OR REPLACE FUNCTION person_email(person uuid) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT address FROM person_emails(person) ORDER BY rank LIMIT 1
$$;

-- Every number of a person, once each: the chosen one first, a mobile before a landline, never an
-- emergency contact first, the newest before an older one.
CREATE OR REPLACE FUNCTION person_phones(person uuid)
RETURNS TABLE (id uuid, number text, normalized text, kind text, is_primary boolean, created_at timestamptz, rank integer)
LANGUAGE sql STABLE AS $$
  WITH one AS (
    SELECT DISTINCT ON (x.normalized) x.id, x.number, x.normalized, x.kind, x.is_primary, x.created_at
      FROM phones x
     WHERE x.person_id = ANY (person_records(person))
     ORDER BY x.normalized, x.is_primary DESC, x.created_at DESC
  )
  SELECT o.id, o.number, o.normalized, o.kind, o.is_primary, o.created_at,
         (row_number() OVER (ORDER BY (o.kind = 'emergency'), o.is_primary DESC, (o.kind IN ('mobile', 'whatsapp')) DESC, o.created_at DESC))::integer AS rank
    FROM one o
$$;

CREATE OR REPLACE FUNCTION person_phone(person uuid) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT number FROM person_phones(person) ORDER BY rank LIMIT 1
$$;

-- A mail to a group („Rundmail": the learners of the evening courses on Tuesday and Thursday, the
-- teachers …) is about no one record: it is kept by the group's key instead.
ALTER TABLE workspace_mails ADD COLUMN IF NOT EXISTS about_key text;
ALTER TABLE workspace_mails ALTER COLUMN about_id DROP NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_mails_about_check') THEN
    ALTER TABLE workspace_mails ADD CONSTRAINT workspace_mails_about_check CHECK (about_id IS NOT NULL OR about_key IS NOT NULL);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS workspace_mails_about_key ON workspace_mails (about_kind, about_key, sent_at DESC) WHERE about_key IS NOT NULL;
