-- Daily, unlinked event counts only; no form values, IPs, URLs or visitor IDs.
-- Collection is disabled by default and requires a privacy review before activation.
CREATE TABLE IF NOT EXISTS registration_metric_counts (
  day date NOT NULL,
  form text NOT NULL CHECK (form IN ('course', 'exam')),
  locale text NOT NULL CHECK (locale IN ('de', 'en')),
  device text NOT NULL CHECK (device IN ('mobile', 'tablet', 'desktop')),
  event text NOT NULL CHECK (event IN ('shown', 'started', 'choice_completed', 'details_completed', 'validation_error', 'submit_error')),
  step text NOT NULL CHECK (step IN ('choice', 'details', 'review')),
  category text NOT NULL CHECK (category IN ('none', 'level', 'date', 'choice', 'contact', 'personal', 'terms', 'other', 'network', 'server')),
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (day, form, locale, device, event, step, category)
);
