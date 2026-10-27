-- 0090 — SchoolMan's records as SchoolMan holds them, kept current by the sync service (2026-10-27).
--
-- Rahman: the bridge reads SchoolMan through FileMaker Pro on his laptop, and an hour or more of it ran
-- every time something changed; the whole idea of the WorkspaceSync account was a faster, better link.
-- The sync service (scripts/schoolman-sync) reads the 68 `Sync_<Table>` layouts over the Data API —
-- only what changed, every minute; everything once a night — and sends the records to
-- /api/schoolman/sync, which keeps them here. The bridge's steps then read these rows instead of
-- FileMaker Pro (docs/FILEMAKER_BRIDGE.md §9).
--
-- A row is one SchoolMan record: the Data API's record id (unique per table, also where SchoolMan's
-- own key is doubled or empty), its modification count and the fields of its Sync_ layout, as the Data
-- API returns them. `updated_at` moves only when the fields did. A record SchoolMan no longer has goes
-- when the night's complete read no longer lists it.

CREATE TABLE IF NOT EXISTS schoolman_records (
  source_table text NOT NULL,
  record_id text NOT NULL,
  mod_id text,
  data jsonb NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (source_table, record_id)
);

CREATE INDEX IF NOT EXISTS schoolman_records_updated_idx ON schoolman_records (source_table, updated_at);

-- Per table: how many records, when the last batch came and when the last complete read did.
CREATE TABLE IF NOT EXISTS schoolman_sync_tables (
  source_table text PRIMARY KEY,
  records integer NOT NULL DEFAULT 0,
  last_batch_at timestamptz,
  last_complete_at timestamptz
);

-- A bridge run from this copy instead of FileMaker Pro on the office Mac (scripts/filemaker/bridge-mirror.mjs).
ALTER TABLE bridge_runs DROP CONSTRAINT IF EXISTS bridge_runs_source_check;
ALTER TABLE bridge_runs ADD CONSTRAINT bridge_runs_source_check CHECK (source IN ('schoolman', 'schoolman-copy'));
