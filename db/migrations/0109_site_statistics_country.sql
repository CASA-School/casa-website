-- 2026-10-29 (Rahman: „countries"): the country of a visit, two letters, looked up from the IP
-- address in DB-IP's free country database on the server (src/lib/site-views.ts). Only the country
-- is kept; the address is not stored, and a country names no one.
ALTER TABLE site_page_views ADD COLUMN IF NOT EXISTS country char(2);
