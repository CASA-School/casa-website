-- 2026-10-29: the statistics start again from this release (Rahman: „fresh start"). The rows of
-- the first evening were mostly crawlers and checkers with a browser's name, counted before
-- src/lib/site-views.ts asked for what a browser sends when it opens a page. A few rows made
-- between this migration and the new revision going live may still be theirs.
DELETE FROM site_page_views;
