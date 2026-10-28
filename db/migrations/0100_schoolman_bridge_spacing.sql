-- 0100 — One bridge start in five minutes at most, and nothing held back is forgotten (2026-10-28).
--
-- 0099 started the job on every change and had a run go round again while SchoolMan kept changing: on a
-- busy morning that is one run after another, each doing the learners again (they read 26 tables, one of
-- which changes with almost every click in SchoolMan). Now a change marks the copy as waiting
-- (`pending_since`); the endpoint starts the job when something waits, no run is going on and the last
-- start was five minutes ago or more; the sync service's tick after every round (once a minute) is what
-- starts the job for changes held back. A run clears the mark when it begins and does one round.

ALTER TABLE schoolman_bridge_state ADD COLUMN IF NOT EXISTS pending_since timestamptz;
