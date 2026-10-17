-- Whether a start is offered on the website (2026-10-17). Every start was; a start the workspace makes
-- for its own courses — an exam preparation, a special module or a company's course read from
-- SchoolMan — is not, until someone decides it should be. The website's lists of dates and its
-- registration form read only starts that are on it.
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS on_website boolean NOT NULL DEFAULT true;
