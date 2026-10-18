-- SchoolMan's waiting list on the workspace's (2026-10-18; docs/schoolman/intake.md, docs/ADMIN_WORKSPACE.md
-- §Waiting list). An entry from SchoolMan's `WaitingRoom` keeps its number, so a re-run finds it, and says
-- where it came from.
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS filemaker_id text;
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_filemaker_key ON waitlist_entries (filemaker_id) WHERE filemaker_id IS NOT NULL;
ALTER TABLE waitlist_entries DROP CONSTRAINT IF EXISTS waitlist_entries_source_check;
ALTER TABLE waitlist_entries ADD CONSTRAINT waitlist_entries_source_check CHECK (source = ANY (ARRAY['office', 'registration', 'booking', 'schoolman']));
