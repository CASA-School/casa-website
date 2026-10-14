-- 0025 — the workspace in two languages.
--
-- The staff workspace speaks German by default and English on request
-- (Rahman, 2026-10-14: "have it in two languages, the dashboard. the default
-- language should be in german"). The choice is the colleague's and follows
-- them to any computer, so it lives on the account; a cookie set by the same
-- switch covers the sign-in page, where nobody is signed in yet.

ALTER TABLE staff_users
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'de'
    CONSTRAINT staff_users_language_check CHECK (language IN ('de', 'en'));
