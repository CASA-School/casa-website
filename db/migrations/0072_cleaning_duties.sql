-- A CASA flat's Putzplan, kept the clean way (2026-10-19; docs/ADMIN_WORKSPACE.md §WG-Belegung).
-- SchoolMan stores a row per room per week (`SingleWeekCleaning`, 0068) pointing at a numbered job — and
-- the numbers point at other flats' jobs (0069). Here a flat has its duties — „Bad", „Küche 1",
-- „Flur & Müll" — each with its tasks, in an order; the weeks are worked out: from the Monday the plan
-- counts from, each week every room moves one duty on. Nothing per week is stored, so the plan never
-- runs out at the end of a year.

CREATE TABLE IF NOT EXISTS cleaning_duties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES accommodations (id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 1,
  name_de text NOT NULL,
  name_en text,
  /* What the duty is, one task a line, as on the flat's notice. */
  tasks text[] NOT NULL DEFAULT '{}',
  /* SchoolMan's task group (`CleaningDetail._ID_CleaningJobReference`) the duty was made from. */
  filemaker_ref text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT cleaning_duties_name_check CHECK (length(btrim(name_de)) BETWEEN 1 AND 80)
);
CREATE INDEX IF NOT EXISTS cleaning_duties_place_idx ON cleaning_duties (accommodation_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS cleaning_duties_filemaker_key ON cleaning_duties (accommodation_id, filemaker_ref) WHERE filemaker_ref IS NOT NULL;

-- The Monday the rotation counts from.
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS cleaning_from date;

-- SchoolMan's task lists become the duties: a group of tasks is one duty, named by what it holds as the
-- flats name them (Bad, Gäste-WC, Flur & Müll, Küche 1, Küche 2), in the order SchoolMan numbered them.
-- `import-rest.mjs` does the same for a flat read across later.
INSERT INTO cleaning_duties (accommodation_id, position, name_de, name_en, tasks, filemaker_ref)
SELECT accommodation_id,
       row_number() OVER (PARTITION BY accommodation_id ORDER BY filemaker_ref)::smallint,
       CASE WHEN bool_or(job_de ILIKE '%dusch%') THEN 'Bad'
            WHEN bool_or(job_de ILIKE '%toilette%') THEN 'Gäste-WC'
            WHEN bool_or(job_de ILIKE '%flur%') THEN 'Flur & Müll'
            WHEN bool_or(job_de ILIKE '%herd%') THEN 'Küche 1'
            ELSE 'Küche 2' END,
       CASE WHEN bool_or(job_de ILIKE '%dusch%') THEN 'Bathroom'
            WHEN bool_or(job_de ILIKE '%toilette%') THEN 'Guest toilet'
            WHEN bool_or(job_de ILIKE '%flur%') THEN 'Corridor & rubbish'
            WHEN bool_or(job_de ILIKE '%herd%') THEN 'Kitchen 1'
            ELSE 'Kitchen 2' END,
       array_agg(btrim(regexp_replace(job_de, '\s+', ' ', 'g')) ORDER BY filemaker_id),
       filemaker_ref
  FROM cleaning_jobs
 WHERE filemaker_ref IS NOT NULL
 GROUP BY accommodation_id, filemaker_ref
ON CONFLICT DO NOTHING;

UPDATE accommodations SET cleaning_from = DATE '2026-01-05'
 WHERE cleaning_from IS NULL AND id IN (SELECT accommodation_id FROM cleaning_duties);
