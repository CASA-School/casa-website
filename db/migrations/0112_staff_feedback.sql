-- 0112 — Feedback from the team (Rahman, 2026-10-31).
--
-- The parallel phase: the team keeps working in FileMaker and starts using the workspace beside it.
-- What they notice — something does not work, something FileMaker has is missing here, an idea, a
-- question — should arrive with the screen it was noticed on, not in the corridor. „Feedback" in the
-- top bar sends one from any screen, with screenshots; it lands here and as a mail to admin@
-- (src/lib/admin/feedback-mail.ts). Worked like an inbox record — status, owner, notes — by whoever
-- holds the module `feedback` (access.ts); the sender reads its state and the answer under „Mein Feedback".
-- docs/ADMIN_WORKSPACE.md §Feedback.

CREATE TABLE IF NOT EXISTS staff_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- „#12": how the team names one in conversation.
  number integer GENERATED ALWAYS AS IDENTITY UNIQUE,
  kind text NOT NULL CHECK (kind IN ('problem', 'missing', 'idea', 'question')),
  message text NOT NULL CHECK (char_length(message) <= 5000),
  -- The screen it was sent from: its address in the workspace and its own name.
  page_path text CHECK (page_path IS NULL OR char_length(page_path) <= 500),
  page_title text CHECK (page_title IS NULL OR char_length(page_title) <= 300),
  -- Browser, window, language, the pages before it, errors the page met (feedback.ts `FeedbackContext`).
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  sender_id uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  -- As it was, so feedback from a colleague who has left still says who sent it.
  sender_name text NOT NULL,
  status work_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  -- The answer the sender reads under „Mein Feedback"; seen once they open it there.
  answer text CHECK (answer IS NULL OR char_length(answer) <= 4000),
  answered_at timestamptz,
  answered_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  sender_seen_at timestamptz,
  -- When Microsoft accepted the mail to admin@; empty without mail, or when it failed.
  mailed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS staff_feedback_status_idx ON staff_feedback (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS staff_feedback_sender_idx ON staff_feedback (sender_id, submitted_at DESC);

DROP TRIGGER IF EXISTS staff_feedback_set_updated_at ON staff_feedback;
CREATE TRIGGER staff_feedback_set_updated_at
  BEFORE UPDATE ON staff_feedback FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The screenshots, as the career CVs are kept (career_application_files): the bytes in the database, so
-- a backup holds them and access is the workspace's. Only raster pictures whose first bytes say so.
CREATE TABLE IF NOT EXISTS staff_feedback_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES staff_feedback (id) ON DELETE CASCADE,
  position smallint NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (feedback_id, position)
);

-- The team's notes beside it, as on every inbox record.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (
  entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person', 'offer', 'group_visit',
                      'accommodation', 'organisation', 'course', 'exam_session', 'registration', 'feedback'])
);
