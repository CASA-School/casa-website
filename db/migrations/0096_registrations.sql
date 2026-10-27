-- 0096 — One Anmeldung per submission (Rahman, 2026-10-27).
--
-- Meike's test registration — the intensive course from A1 to C1 and telc B2, sent at once — arrived
-- as six course registrations and one exam registration, each with its own status, owner, notes and
-- letters, and nothing on screen tying them together. A person registers once; what they chose are
-- the lines of that one registration.
--
-- `registrations` is the Anmeldung: who sent it, when, in which language, where it stands and who has
-- it. `course_registrations` and `exam_registrations` stay as they are and become its lines: each keeps
-- what was sent for that course or exam and its own outcome (`status`: open, booked/queued = done,
-- declined), while the Anmeldung carries the work. Booking stays per level, one booking per line
-- (`bookings.source_registration_id`), as SchoolMan books follow-on levels.

CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The submission's reference: its first line's request id, so a retried POST stores nothing twice.
  request_id uuid NOT NULL UNIQUE,
  person_id uuid REFERENCES people (id) ON DELETE SET NULL,
  locale text NOT NULL DEFAULT 'de',
  status work_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS registrations_status_idx ON registrations (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS registrations_person_idx ON registrations (person_id);

DROP TRIGGER IF EXISTS registrations_set_updated_at ON registrations;
CREATE TRIGGER registrations_set_updated_at
  BEFORE UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES registrations (id) ON DELETE CASCADE;
ALTER TABLE exam_registrations ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES registrations (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS course_registrations_registration_idx ON course_registrations (registration_id);
CREATE INDEX IF NOT EXISTS exam_registrations_registration_idx ON exam_registrations (registration_id);

-- ------------------------------------------------------------------ backfill

-- What was sent at once: the lines of one person with the same submission time (the public route stores
-- a whole submission in one transaction, at one `now`). A line with no person is a submission of its own.
CREATE TEMP TABLE registration_backfill AS
WITH lines AS (
  SELECT 'course'::text AS kind, r.id AS line_id, r.request_id, r.person_id, r.submitted_at, r.locale,
         r.status::text AS status, r.assigned_to, ci.start_date AS starts
    FROM course_registrations r
    LEFT JOIN course_instances ci ON ci.id = r.course_instance_id
   WHERE r.registration_id IS NULL
  UNION ALL
  SELECT 'exam', r.id, r.request_id, r.person_id, r.submitted_at, r.locale,
         r.status::text, r.assigned_to, (es.starts_at AT TIME ZONE 'Europe/Berlin')::date
    FROM exam_registrations r
    LEFT JOIN exam_sessions es ON es.id = r.exam_session_id
   WHERE r.registration_id IS NULL
), keyed AS (
  SELECT l.*, coalesce(l.person_id::text, l.request_id::text) || '@' || l.submitted_at::text AS submission
    FROM lines l
)
SELECT k.*, s.registration_id
  FROM keyed k
  JOIN (SELECT submission, gen_random_uuid() AS registration_id FROM keyed GROUP BY submission) s USING (submission);

-- The reference is the first course's request id — the one the learner was given — else the exam's.
INSERT INTO registrations (id, request_id, person_id, submitted_at, locale)
SELECT DISTINCT ON (registration_id) registration_id, request_id, person_id, submitted_at, locale
  FROM registration_backfill
 ORDER BY registration_id, (kind = 'course') DESC, starts NULLS LAST, line_id;

-- Where it stands, from its lines: closed when every line is, under way once one was touched.
UPDATE registrations g
   SET status = a.status, assigned_to = a.assigned_to
  FROM (SELECT registration_id,
               (CASE WHEN bool_and(status = 'spam') THEN 'spam'
                     WHEN bool_and(status = 'declined') THEN 'declined'
                     WHEN bool_and(status IN ('done', 'declined', 'spam')) THEN 'done'
                     WHEN bool_or(status <> 'new') THEN 'in_progress'
                     ELSE 'new' END)::work_status AS status,
               (array_agg(assigned_to ORDER BY (kind = 'course') DESC, starts NULLS LAST)
                  FILTER (WHERE assigned_to IS NOT NULL))[1] AS assigned_to
          FROM registration_backfill
         GROUP BY registration_id) a
 WHERE g.id = a.registration_id;

UPDATE course_registrations r SET registration_id = b.registration_id
  FROM registration_backfill b WHERE b.kind = 'course' AND b.line_id = r.id;
UPDATE exam_registrations r SET registration_id = b.registration_id
  FROM registration_backfill b WHERE b.kind = 'exam' AND b.line_id = r.id;

DROP TABLE registration_backfill;

-- ------------------------------------------------------------------ every line has its Anmeldung

-- A line written without one (a script, a test) gets an Anmeldung of its own; the public route writes
-- the Anmeldung first and names it.
CREATE OR REPLACE FUNCTION registration_for_line() RETURNS trigger AS $$
BEGIN
  IF NEW.registration_id IS NULL THEN
    INSERT INTO registrations (request_id, person_id, locale, status, assigned_to, submitted_at)
    VALUES (NEW.request_id, NEW.person_id, NEW.locale, NEW.status, NEW.assigned_to, NEW.submitted_at)
    ON CONFLICT (request_id) DO UPDATE SET request_id = EXCLUDED.request_id
    RETURNING id INTO NEW.registration_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_registrations_registration ON course_registrations;
CREATE TRIGGER course_registrations_registration
  BEFORE INSERT ON course_registrations FOR EACH ROW EXECUTE FUNCTION registration_for_line();
DROP TRIGGER IF EXISTS exam_registrations_registration ON exam_registrations;
CREATE TRIGGER exam_registrations_registration
  BEFORE INSERT ON exam_registrations FOR EACH ROW EXECUTE FUNCTION registration_for_line();

ALTER TABLE course_registrations ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE exam_registrations ALTER COLUMN registration_id SET NOT NULL;

-- And an Anmeldung goes with its last line: none is left empty in the inbox.
CREATE OR REPLACE FUNCTION drop_empty_registration() RETURNS trigger AS $$
BEGIN
  DELETE FROM registrations g
   WHERE g.id = OLD.registration_id
     AND NOT EXISTS (SELECT 1 FROM course_registrations WHERE registration_id = g.id)
     AND NOT EXISTS (SELECT 1 FROM exam_registrations WHERE registration_id = g.id);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_registrations_drop_empty ON course_registrations;
CREATE TRIGGER course_registrations_drop_empty
  AFTER DELETE ON course_registrations FOR EACH ROW EXECUTE FUNCTION drop_empty_registration();
DROP TRIGGER IF EXISTS exam_registrations_drop_empty ON exam_registrations;
CREATE TRIGGER exam_registrations_drop_empty
  AFTER DELETE ON exam_registrations FOR EACH ROW EXECUTE FUNCTION drop_empty_registration();

-- ------------------------------------------------------------------ the Anmeldung follows its lines

-- A line is settled when it is booked or queued (`done`) or declined. The Anmeldung moves to „In Arbeit"
-- once one line is, and to „Erledigt" once all are — whichever path settled it: the booking wizard,
-- the waiting list, an exam booking, „Alle buchen". A colleague can still set its status by hand.
CREATE OR REPLACE FUNCTION settle_registration() RETURNS trigger AS $$
DECLARE
  open_lines integer;
  touched integer;
BEGIN
  SELECT count(*) FILTER (WHERE status IN ('new', 'in_progress', 'waiting')),
         count(*) FILTER (WHERE status <> 'new')
    INTO open_lines, touched
    FROM (SELECT status FROM course_registrations WHERE registration_id = NEW.registration_id
          UNION ALL
          SELECT status FROM exam_registrations WHERE registration_id = NEW.registration_id) l;
  IF open_lines = 0 THEN
    UPDATE registrations SET status = 'done' WHERE id = NEW.registration_id AND status IN ('new', 'in_progress', 'waiting');
  ELSIF touched > 0 THEN
    UPDATE registrations SET status = 'in_progress' WHERE id = NEW.registration_id AND status = 'new';
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_registrations_settle ON course_registrations;
CREATE TRIGGER course_registrations_settle
  AFTER UPDATE OF status ON course_registrations FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION settle_registration();
DROP TRIGGER IF EXISTS exam_registrations_settle ON exam_registrations;
CREATE TRIGGER exam_registrations_settle
  AFTER UPDATE OF status ON exam_registrations FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION settle_registration();

-- Notes on the Anmeldung itself.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (
  entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person', 'offer', 'group_visit',
                      'accommodation', 'organisation', 'course', 'registration'])
);
