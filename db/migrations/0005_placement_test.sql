-- CASA Einstufungstest — attempts, responses, and placement decisions.
--
-- Replaces the external Klett placement links with CASA's own instrument. See
-- docs/PLACEMENT_TEST_IMPLEMENTATION.md for the assessment design and
-- docs/PLACEMENT_TEST_OPEN_DECISIONS.md for what CASA still has to decide.
--
-- THREE THINGS THIS SCHEMA DELIBERATELY DOES NOT DO
--
-- 1. It stores no answer key. Keys live in the versioned item bank in the
--    repository (src/config/placement/content/), so scoring is reproducible
--    from a git ref and a re-score after a key correction is a code change with
--    a diff, not an untracked UPDATE.
--
-- 2. It carries no staff-review tables. CLAUDE.md forbids reintroducing auth,
--    roles, or dashboard surfaces to this repo; review belongs to the CASA
--    dashboard workspace. The website persists the attempt and hands it off via
--    PLACEMENT_RESULT_WEBHOOK_URL.
--
-- 3. It sets no retention policy. Retention periods are an open CASA decision
--    with a privacy owner attached, and a made-up interval in a migration is
--    worse than none: it looks approved. The columns needed to enforce one
--    (created_at, submitted_at) are here so a policy can be applied later
--    without a schema change.

CREATE TABLE IF NOT EXISTS placement_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Opaque, learner-facing. Doubles as the resume key and the result URL
  -- segment, so it must be unguessable: the result exposes a person's language
  -- level, which is personal data.
  token text NOT NULL UNIQUE,

  locale text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'in_progress',
  phase text NOT NULL DEFAULT 'intake',

  -- Unscored self-report: prior learning, goal, last contact with German.
  -- Kept because it is the only context a reviewer has for a surprising
  -- result, not because it influences the score. It must not: an old
  -- certificate or a self-reported level is explicitly not a placement.
  intake jsonb,

  -- Which module the router chose, and which boundary module (if any) was
  -- served. Stored rather than recomputed so a later policy change cannot
  -- rewrite the history of what this learner was actually asked.
  router_target_level text,
  boundary_module_id text,

  -- The full decision record from finalise.ts, including confidence, skill
  -- profile, review reasons, and the rationale trail.
  decision jsonb,

  -- The policy version that scored this attempt. Cut scores are pilot
  -- hypotheses and will move; without this column an old attempt becomes
  -- uninterpretable the first time they do.
  policy_version integer,
  release_mode text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'placement_attempts_status_check') THEN
    ALTER TABLE placement_attempts ADD CONSTRAINT placement_attempts_status_check
      CHECK (status IN ('in_progress', 'submitted', 'abandoned'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'placement_attempts_phase_check') THEN
    ALTER TABLE placement_attempts ADD CONSTRAINT placement_attempts_phase_check
      CHECK (phase IN ('intake', 'router', 'level', 'boundary', 'writing', 'complete'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'placement_attempts_locale_check') THEN
    ALTER TABLE placement_attempts ADD CONSTRAINT placement_attempts_locale_check
      CHECK (locale IN ('en', 'de'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS placement_attempts_status_created_idx
  ON placement_attempts (status, created_at DESC);

-- Objective responses.
--
-- UNIQUE (attempt_id, item_id) is the idempotency guarantee the assessment
-- spec requires: autosave, a double-tapped button, and a retried request after
-- a dropped connection all converge on one row via ON CONFLICT, so refreshing
-- can never create a duplicate response or double-count an item.
CREATE TABLE IF NOT EXISTS placement_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES placement_attempts (id) ON DELETE CASCADE,
  item_id text NOT NULL,

  -- The learner's answer, shaped by response type. No key, no verdict:
  -- correctness is derived at scoring time from the item bank, so a key
  -- correction re-scores old attempts correctly instead of leaving them frozen
  -- against a mistake.
  value jsonb NOT NULL,

  -- The option order this learner actually saw. Item analysis cannot separate a
  -- genuinely tempting distractor from a position effect without it.
  option_order jsonb,

  answered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT placement_responses_unique_item UNIQUE (attempt_id, item_id)
);

CREATE INDEX IF NOT EXISTS placement_responses_attempt_idx
  ON placement_responses (attempt_id);

-- Writing production.
--
-- Never automatically graded. v1 policy is explicit that AI must not make the
-- writing or speaking decision, so there is no score column here at all —
-- adding one later would need a decision, which is the point.
CREATE TABLE IF NOT EXISTS placement_writing_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES placement_attempts (id) ON DELETE CASCADE,
  prompt_id text NOT NULL,
  text text NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT placement_writing_unique_attempt UNIQUE (attempt_id)
);

COMMENT ON TABLE placement_attempts IS
  'One learner sitting of the CASA placement test. `decision` holds the engine recommendation; it is not a confirmed placement while release_mode is shadow.';
COMMENT ON TABLE placement_responses IS
  'Objective answers. UNIQUE (attempt_id, item_id) makes autosave idempotent.';
COMMENT ON TABLE placement_writing_submissions IS
  'Learner writing. Intentionally has no score column: automatic grading is prohibited in v1.';
COMMENT ON COLUMN placement_attempts.token IS
  'Unguessable resume + result key. Exposes a language level, so treat as personal data.';
COMMENT ON COLUMN placement_attempts.policy_version IS
  'Cut scores are pilot hypotheses. Without this an old attempt cannot be re-read.';
