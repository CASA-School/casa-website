-- 0099 — The bridge runs when SchoolMan changed, and only the steps that read what changed (2026-10-28).
--
-- Rahman: the Azure costs rose with the sync job. It started every five minutes and, whenever anything
-- had changed, ran all twenty steps on all 90 tables (3½ minutes at 1 vCPU / 2 GiB); four of five starts
-- found nothing to do. Now the sync endpoint starts the job when a batch changed the copy, a run does the
-- steps whose tables changed since they last ran (and every later step once an earlier one added or
-- removed records), and everything once a night. scripts/filemaker/bridge-mirror.mjs, docs/schoolman/MIGRATION.md.

-- Per table: a counter that rises with every batch that changed the copy — added, changed or removed a
-- record. A counter, not a time: a batch whose transaction began before a run looked and committed after
-- it would carry an older time, and the run would take it for seen.
ALTER TABLE schoolman_sync_tables ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;

-- The bridge's own state, one row: whether a run is going on, when the endpoint last asked Azure to
-- start one, and when the last run of every step was.
CREATE TABLE IF NOT EXISTS schoolman_bridge_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  running_since timestamptz,
  requested_at timestamptz,
  last_full_at timestamptz
);
INSERT INTO schoolman_bridge_state (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Per step: the SchoolMan tables it read the last time it ran, the version of each then, and the code
-- it ran with. A step runs again when one of those tables moved on or the code changed.
CREATE TABLE IF NOT EXISTS schoolman_bridge_steps (
  step text PRIMARY KEY,
  tables jsonb NOT NULL,
  code text NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
