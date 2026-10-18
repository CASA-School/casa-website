-- Offers from SchoolMan (2026-10-18; docs/OFFERS.md §From SchoolMan, docs/schoolman/offers.md). Rahman:
-- map all of FileMaker before anything is pushed; offers after the groups.
--
-- An offer keeps SchoolMan's number (`Offer.__ID_Offer`, the „Offer Nº" its letter printed), so a re-run
-- finds it and a colleague can search by it. A group's offer points at the visit it was made for.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS filemaker_offer_id text;
CREATE UNIQUE INDEX IF NOT EXISTS offers_filemaker_key ON offers (filemaker_offer_id) WHERE filemaker_offer_id IS NOT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS group_visit_id uuid REFERENCES group_visits (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS offers_group_visit_idx ON offers (group_visit_id) WHERE group_visit_id IS NOT NULL;

-- „Ohne Antwort": a sent offer nobody answered. SchoolMan never recorded an answer, and most offers
-- end this way; a colleague records it like a refusal, and it leaves the open list.
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_status_check CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'withdrawn', 'lapsed'));
