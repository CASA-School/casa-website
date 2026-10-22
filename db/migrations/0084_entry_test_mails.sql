-- 0084 — The mail that gives a start day's teachers their test codes (2026-10-22).
--
-- Rahman: the teachers get their codes, the QR codes and the guide a few days ahead, with the course
-- start mails, in one mail the office checks on a preview page and sends from the workspace. Each mail
-- as sent: the day, the subject and text, who it went to, which tests, who sent it and when.

CREATE TABLE IF NOT EXISTS entry_test_mails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  on_date date NOT NULL,
  subject text NOT NULL,
  intro text NOT NULL,
  recipients jsonb NOT NULL,
  sitting_ids uuid[] NOT NULL DEFAULT '{}',
  sent_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS entry_test_mails_on_date ON entry_test_mails (on_date);
