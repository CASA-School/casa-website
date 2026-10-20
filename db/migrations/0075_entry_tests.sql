-- The test on the first day of an intensive course (2026-10-20; docs/ENTRY_TEST.md). New learners of the
-- A2, B1 and B1+ classes write a short test on their phone, the morning and the afternoon classes each in
-- their own sitting; the office opens it in the Tagesplan and gives the teachers its code. It ran on Google
-- (Apps Script + Sheets) until now; the results go to the learner's record and an Excel download.
--
-- One sitting per day, session and test. Its 4-digit code releases a paused phone (one that left the page).
CREATE TABLE IF NOT EXISTS entry_test_sittings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  on_date date NOT NULL,
  session text NOT NULL CONSTRAINT entry_test_sittings_session_check CHECK (session IN ('morning', 'afternoon')),
  /* Named after the course that writes it: a2 checks A1, b1 checks A2, b1plus checks B1. */
  test text NOT NULL CONSTRAINT entry_test_sittings_test_check CHECK (test IN ('a2', 'b1', 'b1plus')),
  code text NOT NULL CONSTRAINT entry_test_sittings_code_check CHECK (code ~ '^[0-9]{4}$'),
  minutes smallint NOT NULL DEFAULT 40 CONSTRAINT entry_test_sittings_minutes_check CHECK (minutes BETWEEN 5 AND 180),
  /* Open while opened_at is set and closed_at is not; reopening clears closed_at. */
  opened_at timestamptz,
  closed_at timestamptz,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (on_date, session, test)
);

-- One learner's attempt: on the phone, or typed in by the office from the paper booklet.
CREATE TABLE IF NOT EXISTS entry_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sitting_id uuid NOT NULL REFERENCES entry_test_sittings (id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'phone' CONSTRAINT entry_test_attempts_source_check CHECK (source IN ('phone', 'paper')),
  /* sha256 of the phone's token; the token itself is never stored. */
  token_hash text UNIQUE,
  name text NOT NULL,
  email text,
  /* The learner, when the e-mail is one of the class's (or of exactly one person). */
  person_id uuid REFERENCES people (id) ON DELETE SET NULL,
  version text NOT NULL CONSTRAINT entry_test_attempts_version_check CHECK (version IN ('A', 'B')),
  status text NOT NULL CONSTRAINT entry_test_attempts_status_check CHECK (status IN ('running', 'paused', 'submitted', 'expired')),
  /* One entry per answer slot, '' when blank. */
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  /* Per multiple-choice task, its options in this attempt's order: {"1": ["C", "A", "D", "B"], …}. */
  option_order jsonb,
  answered smallint NOT NULL DEFAULT 0,
  interruptions smallint NOT NULL DEFAULT 0,
  /* [{"at": "…", "what": "Seite verlassen"}, …] */
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  code_tries smallint NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deadline timestamptz,
  last_seen_at timestamptz,
  submitted_at timestamptz,
  /* Points (2 per correct answer), the maximum, and the two parts; set on submit. */
  score smallint,
  max_score smallint,
  grammar smallint,
  reading smallint,
  blank smallint,
  entered_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  /* The result on the learner's record (0066), written when the attempt is submitted and matched. */
  person_test_id uuid REFERENCES person_tests (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS entry_test_attempts_email_key ON entry_test_attempts (sitting_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS entry_test_attempts_sitting_idx ON entry_test_attempts (sitting_id, started_at);
CREATE INDEX IF NOT EXISTS entry_test_sittings_open_idx ON entry_test_sittings (on_date) WHERE opened_at IS NOT NULL AND closed_at IS NULL;
