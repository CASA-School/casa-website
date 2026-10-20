-- A group taught together with another on a day (2026-10-20; docs/ADMIN_WORKSPACE.md §Lesson days).
--
-- Rahman: „the Zusammenlegung happens every now and then for different reasons, especially if a teacher is
-- sick and we have parallel courses of the same level … sometimes for one day, sometimes for several", and
-- with three parallel groups „part of the group goes to one course and part to the other". So a day that
-- joins others points at them: one host, or several when the group is shared out. Who sits where is not
-- recorded; each group keeps its own attendance sheet. The joining day keeps its own room and teacher in
-- `replaced_room_id` / `replaced_teacher_id`, so lifting the merge puts them back.
CREATE TABLE IF NOT EXISTS course_day_merges (
  guest_day_id uuid NOT NULL REFERENCES course_days (id) ON DELETE CASCADE,
  host_day_id uuid NOT NULL REFERENCES course_days (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (guest_day_id, host_day_id),
  CONSTRAINT course_day_merges_not_itself CHECK (guest_day_id <> host_day_id)
);
CREATE INDEX IF NOT EXISTS course_day_merges_host_idx ON course_day_merges (host_day_id);

-- Why: preset „sick" or „holiday" where the absent teacher's day says so.
ALTER TABLE course_days
  ADD COLUMN IF NOT EXISTS merge_reason text
    CONSTRAINT course_days_merge_reason_check CHECK (merge_reason IN ('sick', 'holiday', 'few_learners', 'room', 'other')),
  ADD COLUMN IF NOT EXISTS merge_note text;

-- SchoolMan's merges, linked by one rule, here and after every import of lesson days: a day marked
-- „Zusammenlegung" without a room of its own joins the days of the same level, on the same date, at
-- overlapping times, that have a room (SchoolMan keeps the room only on the host, and often marks only the
-- joining day). Two such days are a group shared out. A day of another level, or with no room anywhere,
-- stays merged without a link. A link whose joining day is no longer merged goes; the reason is preset from
-- the replaced teacher's absence that day.
CREATE OR REPLACE FUNCTION link_course_day_merges() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  linked integer;
BEGIN
  DELETE FROM course_day_merges m USING course_days g WHERE g.id = m.guest_day_id AND NOT g.merged;

  INSERT INTO course_day_merges (guest_day_id, host_day_id)
  SELECT g.id, h.id
    FROM course_days g
    JOIN courses gc ON gc.id = g.course_id
    JOIN course_day_times tg ON tg.id = g.id
    JOIN course_days h ON h.on_date = g.on_date AND h.id <> g.id AND h.room_id IS NOT NULL AND NOT h.cancelled
    JOIN courses hc ON hc.id = h.course_id AND hc.level_code = gc.level_code
    JOIN course_day_times th ON th.id = h.id
   WHERE g.merged AND g.room_id IS NULL AND NOT g.cancelled AND g.filemaker_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM course_day_merges m WHERE m.guest_day_id = g.id)
     AND (tg.starts_at IS NULL OR th.starts_at IS NULL OR (tg.starts_at < th.ends_at AND th.starts_at < tg.ends_at))
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS linked = ROW_COUNT;

  UPDATE course_days g
     SET merge_reason = CASE a.reason WHEN 'Krank' THEN 'sick' WHEN 'Urlaub' THEN 'holiday' END
    FROM staff_absences a
   WHERE g.merge_reason IS NULL AND a.staff_member_id = g.replaced_teacher_id AND a.on_date = g.on_date
     AND a.reason IN ('Krank', 'Urlaub')
     AND EXISTS (SELECT 1 FROM course_day_merges m WHERE m.guest_day_id = g.id);

  RETURN linked;
END;
$$;

SELECT link_course_day_merges();
