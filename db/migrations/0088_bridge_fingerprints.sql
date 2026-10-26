-- 0088 — What the bridge wrote last time, so a run writes only what changed (2026-10-26).
--
-- Rahman: the bridge takes about an hour. Reading SchoolMan takes seven minutes and the import on this
-- Mac two; inside Azure it takes an hour, because every row is its own statement and every statement
-- waits about 10 ms for the database, and every run wrote every record again. Each importer now keeps a
-- fingerprint of each record it writes — SchoolMan's data together with what it was matched to here —
-- and passes over a record whose fingerprint is the same as last time. `BRIDGE_FULL=1` writes them all.
-- Only hashes are kept: no name and no value.

CREATE TABLE IF NOT EXISTS bridge_fingerprints (
  step text NOT NULL,
  record text NOT NULL,
  fingerprint text NOT NULL,
  PRIMARY KEY (step, record)
);
