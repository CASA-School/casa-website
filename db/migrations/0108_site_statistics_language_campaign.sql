-- 2026-10-29: two more facts per page load, both taken from the request itself (src/lib/site-views.ts):
-- the browser's preferred language (the first tag of Accept-Language, „ar", „tr"), and on a visit's
-- first page the campaign its link carried (utm_source / utm_campaign, or „Google Ads" for a click
-- with gclid). Neither says who the reader is.
ALTER TABLE site_page_views ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE site_page_views ADD COLUMN IF NOT EXISTS campaign text;
