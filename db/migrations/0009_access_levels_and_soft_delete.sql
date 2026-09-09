-- 0009 — access levels per module, and soft delete on people.
--
-- ACCESS LEVELS. 0008 stored a per-person module exception as a boolean. The
-- owner's rule is finer: some people may edit but not delete. An exception now
-- carries a LEVEL — none / view / edit / full — and `full` is what deletion
-- and other irreversible actions require. Role defaults stay in code
-- (src/lib/admin/access.ts): owner and admin are `full` everywhere, staff are
-- `edit` on their modules. Guards ask `requireModule(module, level)`.
--
-- SOFT DELETE. FileMaker lets staff delete a person outright, and the trail
-- goes with them (docs/FILEMAKER_LESSONS.md §8). Here a delete sets
-- `deleted_at`; every read filters it out, the row and its history stay, and
-- an owner can restore. Rooms already have `is_active` for the same purpose.

ALTER TABLE staff_module_access
  ADD COLUMN IF NOT EXISTS level text;

UPDATE staff_module_access
   SET level = CASE WHEN allowed THEN 'edit' ELSE 'none' END
 WHERE level IS NULL;

ALTER TABLE staff_module_access
  ALTER COLUMN level SET NOT NULL,
  DROP COLUMN IF EXISTS allowed;

ALTER TABLE staff_module_access DROP CONSTRAINT IF EXISTS staff_module_access_level_check;
ALTER TABLE staff_module_access
  ADD CONSTRAINT staff_module_access_level_check
  CHECK (level IN ('none', 'view', 'edit', 'full'));

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS people_deleted_idx ON people (deleted_at) WHERE deleted_at IS NOT NULL;
