-- The website editor (docs/WEBSITE_EDITOR.md).
--
-- The text in the repository is the default for every slot on the public site.
-- These tables hold what staff change on top of it: a working draft per slot
-- and language, releases that publish a set of drafts now, later or after
-- approval, and the revisions each release carries. The live value of a slot is
-- its latest revision whose release went live; with none, the repository text.
-- Nothing here is read by the public site except through that one resolution
-- (src/lib/cms/content.server.ts), so an empty schema is the site as committed.

CREATE TABLE IF NOT EXISTS website_drafts (
  key text NOT NULL,
  locale text NOT NULL,
  value text NOT NULL,
  updated_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (key, locale)
);

-- One publish. `pending` waits for someone with full rights; `scheduled` and
-- `published` both go live at `publish_at`, which is the only thing the public
-- site compares, so a scheduled release needs no job to switch it on.
CREATE TABLE IF NOT EXISTS website_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL CHECK (state IN ('pending', 'scheduled', 'published', 'rejected', 'undone', 'cancelled')),
  note text,
  publish_at timestamptz,
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  decided_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  decided_by_name text,
  decided_at timestamptz
);

CREATE INDEX IF NOT EXISTS website_releases_live_idx
  ON website_releases (state, publish_at);

-- `previous` is the live text when the release was made, kept for the diff and
-- the history; the value that wins is always resolved at read time.
CREATE TABLE IF NOT EXISTS website_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES website_releases (id) ON DELETE CASCADE,
  key text NOT NULL,
  locale text NOT NULL,
  value text NOT NULL,
  previous text,
  UNIQUE (release_id, key, locale)
);

CREATE INDEX IF NOT EXISTS website_revisions_slot_idx
  ON website_revisions (key, locale);

-- A translation the source text has moved past. Written when a German text is
-- published without the others; cleared when that language is published or a
-- colleague confirms it still says the same.
CREATE TABLE IF NOT EXISTS website_stale (
  key text NOT NULL,
  locale text NOT NULL,
  since timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (key, locale)
);

CREATE TABLE IF NOT EXISTS website_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  author_id uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by_name text
);

CREATE INDEX IF NOT EXISTS website_comments_slot_idx
  ON website_comments (key, created_at);

-- Who has the editor open, on which page and which text. A row older than a
-- minute is ignored; the editor refreshes its own every fifteen seconds.
CREATE TABLE IF NOT EXISTS website_presence (
  staff_id uuid PRIMARY KEY REFERENCES staff_users (id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  path text,
  key text,
  seen_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
