-- The cleaning plan as SchoolMan numbers it (2026-10-18). A week gives each room of a CASA flat a job by its
-- number (`SingleWeekCleaning._ID_CleaningJobReference`, 1 … 5); the task lists (`CleaningDetail`) are grouped
-- under ids of their own. SchoolMan holds nothing that ties the two, so both are kept as they are.
ALTER TABLE cleaning_weeks ADD COLUMN IF NOT EXISTS job_number smallint;
