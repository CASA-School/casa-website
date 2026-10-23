-- 0085 — A letter sent by mail from the workspace (2026-10-23).
--
-- Rahman: every letter the workspace makes goes out from the workspace's mail screen — the letter as a PDF,
-- a short mail, the sender's signature, sent directly after a review or opened in Outlook. Each mail sent
-- directly is kept: which letter, to whom, the subject and the text, with or without the signature, who
-- sent it and when. The letter itself is `letters` (it records `sent_via = 'email'`); a letter mailed twice
-- has two rows here.

CREATE TABLE IF NOT EXISTS letter_mails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters (id) ON DELETE CASCADE,
  recipients text[] NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  signature boolean NOT NULL DEFAULT false,
  sent_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS letter_mails_letter ON letter_mails (letter_id, sent_at DESC);
