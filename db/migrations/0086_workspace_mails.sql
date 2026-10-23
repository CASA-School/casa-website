-- 0086 — A mail written in the workspace (2026-10-23).
--
-- Rahman: every mail the workspace sends goes through its mail screen — not only letters (0085) and the
-- teachers' test mail (0084), but „Antworten" on an enquiry, a registration or an application, „E-Mail
-- an …" on a learner, a colleague, an organisation, a host, a class or its teacher. Each mail sent
-- directly is kept: what it was about (`about_kind`, `about_id`: a person, an enquiry, a class's day …),
-- to whom, Bcc or not, the subject and the text, with or without the signature, who sent it and when.

CREATE TABLE IF NOT EXISTS workspace_mails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  about_kind text NOT NULL,
  about_id uuid NOT NULL,
  recipients text[] NOT NULL,
  bcc boolean NOT NULL DEFAULT false,
  subject text NOT NULL,
  body text NOT NULL,
  signature boolean NOT NULL DEFAULT false,
  sent_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS workspace_mails_about ON workspace_mails (about_kind, about_id, sent_at DESC);
