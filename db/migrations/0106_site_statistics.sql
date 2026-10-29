-- Website statistics (2026-10-29): how often each page of the public site is read and where
-- readers come from, counted on the server from the request itself (src/lib/site-views.ts,
-- called by src/proxy.ts). No script runs in the browser and nothing is read from or stored on
-- the reader's device. A row keeps the path, the kind of device (from the user agent, which is
-- not kept), and on the first page of a visit the site it came from: no IP address, no cookie,
-- no identifier, so a row cannot be tied to a person or to another row of the same person.
-- Rows older than 13 months are deleted as new ones arrive. Read on /admin/statistics.

CREATE TABLE IF NOT EXISTS site_page_views (
  id bigserial PRIMARY KEY,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  path text NOT NULL,
  locale text NOT NULL,
  device text NOT NULL CHECK (device IN ('mobile', 'tablet', 'desktop')),
  -- The first page of a visit (opened from outside the site), and the site it came from.
  entry boolean NOT NULL DEFAULT false,
  referrer_host text
);
CREATE INDEX IF NOT EXISTS site_page_views_viewed_at ON site_page_views (viewed_at);
