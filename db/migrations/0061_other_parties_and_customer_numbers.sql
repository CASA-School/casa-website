-- The rest of SchoolMan's parties, and a learner's customer number (2026-10-18; docs/schoolman/organisations.md,
-- docs/schoolman/learner-transfer.md). Rahman: continue with the rest.
--
-- An organisation can be more than a client: it takes interns, sends learners our way, runs an afternoon
-- activity, supplies something, insures, partners in a tandem, rebuilds a room, or is the Förderverein.
-- SchoolMan says so with `Management._ID_StatusManagementReference`; here it is the organisation's relation.
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS relation text;
ALTER TABLE organisations DROP CONSTRAINT IF EXISTS organisations_relation_check;
ALTER TABLE organisations ADD CONSTRAINT organisations_relation_check CHECK (
  relation IS NULL OR relation IN ('internship', 'multiplier', 'activity', 'supplier', 'health_insurer', 'tandem_school', 'contractor', 'association')
);

-- SchoolMan's customer number for a learner (`Person._ID_Client`, copied onto their bookings), kept as it is
-- until finance says whether it is the accounting's debtor number.
ALTER TABLE people ADD COLUMN IF NOT EXISTS customer_number text;
