-- Each time SchoolMan's data is brought into this database (2026-10-19; docs/FILEMAKER_BRIDGE.md §8).
--
-- `infra/azure/bridge.sh` reads SchoolMan on the office Mac and an import job inside Azure writes it
-- here; the job records the run. The workspace shows the last good one („SchoolMan · Stand …"), so a
-- copy is never taken for the live record. Counts only: each step keeps its importer's summary line.
CREATE TABLE IF NOT EXISTS bridge_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'schoolman' CONSTRAINT bridge_runs_source_check CHECK (source IN ('schoolman')),
  read_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ok boolean NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS bridge_runs_finished_idx ON bridge_runs (source, finished_at DESC);
