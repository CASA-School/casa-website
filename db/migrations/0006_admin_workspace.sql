-- CASA staff workspace — the tables the dashboard at /admin owns.
--
-- WHY THIS EXISTS AT ALL
--
-- Until now every inbound message from the public site left the building
-- immediately: contact enquiries and course/exam registrations were POSTed to a
-- webhook and, with no webhook configured, written to the server log. Nothing
-- was queryable, nothing had a status, and nobody could tell whether a lead had
-- been answered. FileMaker held that answer, by hand, later.
--
-- The workspace replaces the hand-off with a queue. Three principles:
--
-- 1. THE WEBHOOK STAYS. Persisting is added alongside the fan-out, never
--    instead of it, so an existing CASA automation keeps firing. A failed
--    insert must not lose a lead and a failed webhook must not lose a row —
--    each is attempted independently.
--
-- 2. STATUS IS STAFF-OWNED, CONTENT IS VISITOR-OWNED. Nothing here rewrites
--    what a person submitted. Staff add status, assignment and notes beside it.
--
-- 3. NO FILEMAKER MIRROR YET. `external_ref` is the one hook the future bridge
--    needs (docs/ADMIN_WORKSPACE.md). Inventing a copy of FileMaker's field
--    names before the bridge is specified would bake in a guess.

DO $$
BEGIN
  CREATE TYPE staff_role AS ENUM ('owner', 'admin', 'staff');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Shared lifecycle for anything that arrives in a queue and gets worked. One
-- type, rather than three text columns with three different spellings of
-- "done".
DO $$
BEGIN
  CREATE TYPE work_status AS ENUM (
    'new',
    'in_progress',
    'waiting',
    'done',
    'declined',
    'spam'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- --------------------------------------------------------------- staff access

-- Local accounts, not SSO. CASA has no identity provider the website can talk
-- to today, and an admin surface nobody can reach is not safer than one behind
-- a real password — it just moves the work back into email.
--
-- `password_hash` is scrypt, encoded with its own parameters (see
-- src/lib/admin/password.ts), so the cost can be raised later without a
-- migration and without invalidating existing hashes.
CREATE TABLE IF NOT EXISTS staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  role staff_role NOT NULL DEFAULT 'staff',
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  -- "Who is actually using this", not an audit trail. Written coarsely.
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Case-insensitive uniqueness on the login identifier. A functional index
-- rather than the citext extension: one fewer extension to have enabled on the
-- managed server, and every lookup in the app already lowercases.
CREATE UNIQUE INDEX IF NOT EXISTS staff_users_email_key
  ON staff_users (lower(email));

DROP TRIGGER IF EXISTS staff_users_set_updated_at ON staff_users;
CREATE TRIGGER staff_users_set_updated_at
  BEFORE UPDATE ON staff_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Server-side sessions, so signing out actually revokes and a compromised
-- laptop can be cut off without rotating a global secret.
--
-- Only the SHA-256 of the cookie token is stored. A leaked database dump then
-- yields no usable session cookie, and the token has no structure worth
-- guessing — it is 32 random bytes.
CREATE TABLE IF NOT EXISTS staff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL REFERENCES staff_users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_used_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS staff_sessions_user_idx
  ON staff_sessions (staff_user_id);
CREATE INDEX IF NOT EXISTS staff_sessions_expiry_idx
  ON staff_sessions (expires_at);

-- ------------------------------------------------------------------ enquiries

-- Every contact-form submission, including the structured organiser brief that
-- group and company enquiries carry.
--
-- `kind` is derived from `topic_key` at write time rather than read time,
-- because the topic vocabulary is localized on the public site and a workspace
-- filter must not depend on which language the visitor happened to use.
CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The id already returned to the visitor and sent to the webhook. Kept so a
  -- person quoting their confirmation can be found, and so a webhook retry
  -- cannot create a second row.
  request_id uuid NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'general',
  locale text NOT NULL DEFAULT 'en',
  first_name text NOT NULL,
  last_name text,
  email text NOT NULL,
  topic text NOT NULL,
  topic_key text,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'contact-page',
  organiser_brief jsonb,
  status work_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  user_agent text,
  -- Set when the row has been pushed into, or matched against, FileMaker.
  external_ref text,
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT enquiries_kind_check
    CHECK (kind IN ('general', 'group', 'company'))
);

CREATE INDEX IF NOT EXISTS enquiries_status_idx
  ON enquiries (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_submitted_idx
  ON enquiries (submitted_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_email_idx
  ON enquiries (lower(email));

DROP TRIGGER IF EXISTS enquiries_set_updated_at ON enquiries;
CREATE TRIGGER enquiries_set_updated_at
  BEFORE UPDATE ON enquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------- registrations

-- Course registrations submitted through the public wizard.
--
-- The course type and instance are recorded twice on purpose: by id, so the
-- row joins to the catalogue, and by the label the visitor actually saw. A
-- course instance can be rescheduled or withdrawn after someone registers for
-- it, and "what they signed up for" is not a question a live join can answer.
CREATE TABLE IF NOT EXISTS course_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,

  course_type_id uuid REFERENCES course_types (id) ON DELETE SET NULL,
  course_instance_id uuid REFERENCES course_instances (id) ON DELETE SET NULL,
  course_type_label text,
  course_instance_label text,

  salutation text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  nationality text NOT NULL,
  birth_date text NOT NULL,
  -- Self-declared CEFR sub-level. Not a placement: the Einstufungstest and a
  -- teacher decide the level, and this is only what the learner believes.
  current_level text,

  visa_required boolean NOT NULL DEFAULT false,
  accommodation_required boolean NOT NULL DEFAULT false,
  accommodation_type text,
  smoker boolean NOT NULL DEFAULT false,
  allergies text,
  notes text,

  locale text NOT NULL DEFAULT 'en',
  status work_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  external_ref text,
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS course_registrations_status_idx
  ON course_registrations (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS course_registrations_instance_idx
  ON course_registrations (course_instance_id);
CREATE INDEX IF NOT EXISTS course_registrations_email_idx
  ON course_registrations (lower(email));

DROP TRIGGER IF EXISTS course_registrations_set_updated_at ON course_registrations;
CREATE TRIGGER course_registrations_set_updated_at
  BEFORE UPDATE ON course_registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Exam registrations. Separate table, not a `kind` column on the one above:
-- the two forms ask genuinely different questions (an exam candidate declares
-- their official name and a part of the exam; a course learner declares
-- accommodation and allergies), and a shared table would be half nulls.
CREATE TABLE IF NOT EXISTS exam_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,

  exam_type_id uuid REFERENCES exam_types (id) ON DELETE SET NULL,
  exam_session_id uuid REFERENCES exam_sessions (id) ON DELETE SET NULL,
  exam_type_label text,
  exam_session_label text,
  -- 'full' | 'written' | 'oral' — a telc resit is often one part only.
  registration_type text NOT NULL DEFAULT 'full',

  salutation text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  nationality text NOT NULL,
  birth_date text NOT NULL,
  -- The candidate confirmed the name matches their ID. A telc certificate is
  -- printed from this, so the confirmation is evidence, not a checkbox.
  official_name_confirmed boolean NOT NULL DEFAULT false,

  locale text NOT NULL DEFAULT 'en',
  status work_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  external_ref text,
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS exam_registrations_status_idx
  ON exam_registrations (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS exam_registrations_session_idx
  ON exam_registrations (exam_session_id);

DROP TRIGGER IF EXISTS exam_registrations_set_updated_at ON exam_registrations;
CREATE TRIGGER exam_registrations_set_updated_at
  BEFORE UPDATE ON exam_registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------- placement confirmations

-- A teacher's decision on a placement recommendation.
--
-- 0005_placement_test.sql deliberately carried no review table, because review
-- belonged to "the dashboard workspace" that did not exist yet. This is it.
--
-- The engine's output stays untouched in placement_attempts.decision. This
-- table records what a qualified person decided afterwards, which is the only
-- thing CASA may act on: the test produces a recommendation, never a result.
-- `policy_version` is copied in so a confirmation stays interpretable after the
-- cut scores move.
CREATE TABLE IF NOT EXISTS placement_reviews (
  attempt_id uuid PRIMARY KEY
    REFERENCES placement_attempts (id) ON DELETE CASCADE,
  reviewed_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  -- The level a teacher confirmed, which may differ from the recommendation.
  confirmed_level text NOT NULL,
  -- Free text. Required in practice when confirmed_level differs from the
  -- recommendation; the app enforces that, not the schema, because a
  -- constraint here cannot see the recommendation.
  note text,
  recommended_band text,
  policy_version integer,
  speaking_check_done boolean NOT NULL DEFAULT false,
  decided_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS placement_reviews_set_updated_at ON placement_reviews;
CREATE TRIGGER placement_reviews_set_updated_at
  BEFORE UPDATE ON placement_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------- notes & activity

-- Staff notes, on any queue row. Polymorphic by (entity, entity_id) rather than
-- one notes table per queue: a note is the same object everywhere and the
-- alternative is four identical tables. No FK, deliberately — the trade-off is
-- explicit, and the delete paths above cascade the rows a note could point at.
CREATE TABLE IF NOT EXISTS staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  staff_user_id uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT staff_notes_entity_check
    CHECK (entity IN (
      'enquiry',
      'course_registration',
      'exam_registration',
      'career_application',
      'placement_attempt'
    ))
);

CREATE INDEX IF NOT EXISTS staff_notes_entity_idx
  ON staff_notes (entity, entity_id, created_at DESC);

-- Who changed what. Written by the workspace's mutations, never by hand.
--
-- This is the answer to "who marked this lead done" — the question FileMaker
-- could not answer, and the reason a status column is worth having at all.
CREATE TABLE IF NOT EXISTS staff_activity (
  id bigserial PRIMARY KEY,
  staff_user_id uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  -- Denormalised so the trail survives the account being deleted.
  staff_name text,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS staff_activity_recent_idx
  ON staff_activity (created_at DESC);
CREATE INDEX IF NOT EXISTS staff_activity_entity_idx
  ON staff_activity (entity, entity_id, created_at DESC);

-- ----------------------------------------------------------- career pipeline

-- career_applications (0001) has a free-text `status` defaulting to
-- 'submitted', written by the public apply route. The workspace works it as a
-- queue, so it needs the same vocabulary as the others. The column is left as
-- text and the existing default untouched — the public route still writes
-- 'submitted' and must keep working — with a check constraint that admits both
-- that value and the workspace's.
ALTER TABLE career_applications
  DROP CONSTRAINT IF EXISTS career_applications_status_check;
ALTER TABLE career_applications
  ADD CONSTRAINT career_applications_status_check
  CHECK (status IN (
    'submitted',
    'new',
    'in_progress',
    'waiting',
    'interview',
    'done',
    'declined',
    'spam'
  ));

ALTER TABLE career_applications
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES staff_users (id) ON DELETE SET NULL;
