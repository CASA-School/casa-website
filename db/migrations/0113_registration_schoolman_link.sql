-- 0113 — A website registration and the SchoolMan booking made from it (Rahman, 2026-10-31).
--
-- The parallel phase: a learner registers on the website, a colleague books them in SchoolMan as before,
-- and the sync brings that booking in — under a second person, since the bridge matches people only by
-- their SchoolMan number (FILEMAKER_LESSONS: never by an address alone), and with the Anmeldung still
-- open, though it is booked. Here the two are found to be one: the line points at its booking
-- (`bookings.source_registration_id` / `source_exam_registration_id`, as a booking made in the workspace
-- does), the line is settled (0097's trigger then settles the Anmeldung), and the website's person is
-- linked into SchoolMan's (`merged_into`, as „Verknüpfen" on a person does; „Trennen" undoes it).
--
-- `registration_schoolman_candidates()` finds, for each open line of the last half year, the SchoolMan
-- bookings that may be it; `link_registration_line()` makes one link. The bridge links what is sure at the
-- end of every run (`link_registrations_to_schoolman()`); the Anmeldung shows the rest as a question.
-- docs/ADMIN_WORKSPACE.md §Website registrations and SchoolMan bookings.

-- A colleague's „Nicht dieselbe": that booking is not asked about again for that line.
CREATE TABLE IF NOT EXISTS registration_link_dismissals (
  line_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  dismissed_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  dismissed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (line_id, booking_id)
);

-- What may be the same booking, and why.
--
-- A person is the line's when SchoolMan's has the address it was sent from (`by_email`), its surname and
-- date of birth (`by_birth`), or its first name and surname (`by_name`), all compared folded (`ws_fold`).
-- A booking fits a course line when one of its periods is in the start asked for, or it is the same
-- course type and begins within three days of it (`exact`); it is near when it is the same type, or
-- begins within a week of the start. An exam booking fits when it is the sitting asked for, and is near
-- at another sitting of the same exam. Only SchoolMan's bookings (`filemaker_booking_id`) that point at
-- no line yet, not cancelled, made at most 45 days before the registration came in.
--
-- `sure`: the same sitting or start, made after the registration came in (a day's grace for the clock),
-- and the same person — already linked, or the same address with the same date of birth or full name — and
-- the only such booking for the line and the only such line for the booking. A family writing from one
-- address is never sure: a child shares the surname and the address, not the first name or the birthday.
CREATE OR REPLACE FUNCTION registration_schoolman_candidates(only_registration uuid DEFAULT NULL)
RETURNS TABLE (
  line_kind text,
  line_id uuid,
  registration_id uuid,
  website_person_id uuid,
  booking_id uuid,
  booking_person_id uuid,
  by_email boolean,
  by_birth boolean,
  by_name boolean,
  same_person boolean,
  exact boolean,
  booked_after boolean,
  sure boolean
) LANGUAGE sql STABLE AS $$
  WITH lines AS (
    SELECT 'course'::text AS line_kind, c.id AS line_id, c.registration_id, r.submitted_at, c.person_id AS website_person_id,
           nullif(lower(btrim(c.email)), '') AS email, ws_fold(coalesce(c.first_name, '')) AS first_name, ws_fold(coalesce(c.last_name, '')) AS last_name,
           c.birth_date, coalesce(c.course_type_id, ci.course_type_id) AS type_id, c.course_instance_id AS instance_id, ci.start_date AS wanted,
           NULL::uuid AS sitting_id
      FROM course_registrations c
      JOIN registrations r ON r.id = c.registration_id
      LEFT JOIN course_instances ci ON ci.id = c.course_instance_id
     WHERE (only_registration IS NULL OR c.registration_id = only_registration)
       AND c.status IN ('new', 'in_progress', 'waiting') AND r.status <> 'spam'
       AND r.submitted_at > now() - interval '180 days'
       AND NOT EXISTS (SELECT 1 FROM bookings x WHERE x.source_registration_id = c.id AND x.deleted_at IS NULL)
    UNION ALL
    SELECT 'exam', e.id, e.registration_id, r.submitted_at, e.person_id,
           nullif(lower(btrim(e.email)), ''), ws_fold(coalesce(e.first_name, '')), ws_fold(coalesce(e.last_name, '')),
           e.birth_date, coalesce(e.exam_type_id, es.exam_type_id), NULL, (es.starts_at AT TIME ZONE 'Europe/Berlin')::date,
           e.exam_session_id
      FROM exam_registrations e
      JOIN registrations r ON r.id = e.registration_id
      LEFT JOIN exam_sessions es ON es.id = e.exam_session_id
     WHERE (only_registration IS NULL OR e.registration_id = only_registration)
       AND e.status IN ('new', 'in_progress', 'waiting') AND r.status <> 'spam'
       AND r.submitted_at > now() - interval '180 days'
       AND NOT EXISTS (SELECT 1 FROM bookings x WHERE x.source_exam_registration_id = e.id AND x.deleted_at IS NULL)
  ),
  matched AS (
    SELECT l.line_kind, l.line_id, canonical_person_id(m.person_id) AS person_id,
           bool_or(m.how = 'email') AS by_email, bool_or(m.how = 'birth') AS by_birth, bool_or(m.how = 'name') AS by_name
      FROM lines l
      CROSS JOIN LATERAL (
        SELECT e.person_id, 'email' AS how FROM emails e WHERE l.email IS NOT NULL AND e.normalized = l.email
        UNION ALL
        SELECT p.id, 'birth' FROM people p
         WHERE l.birth_date IS NOT NULL AND l.last_name <> '' AND p.birth_date = l.birth_date AND ws_fold(coalesce(p.last_name, '')) = l.last_name
        UNION ALL
        -- `search_name` holds the folded name (0091), so the surname narrows the scan before anything is folded.
        SELECT p.id, 'name' FROM people p
         WHERE l.first_name <> '' AND l.last_name <> '' AND p.search_name LIKE '%' || l.last_name || '%'
           AND ws_fold(coalesce(p.first_name, '')) = l.first_name AND ws_fold(coalesce(p.last_name, '')) = l.last_name
      ) m
     GROUP BY 1, 2, 3
  ),
  found AS (
    SELECT l.line_kind, l.line_id, l.registration_id, l.website_person_id, b.id AS booking_id, b.person_id AS booking_person_id,
           m.by_email, m.by_birth, m.by_name,
           coalesce(canonical_person_id(l.website_person_id) = m.person_id, false) AS same_person,
           fit.exact,
           b.created_at >= l.submitted_at - interval '1 day' AS booked_after
      FROM lines l
      JOIN matched m ON m.line_kind = l.line_kind AND m.line_id = l.line_id
      JOIN bookings b ON b.person_id = ANY (person_family(m.person_id))
      CROSS JOIN LATERAL (
        SELECT coalesce(CASE
                 WHEN l.line_kind = 'course' THEN
                   coalesce(bool_or(bp.course_instance_id = l.instance_id), false)
                   OR (b.course_type_id = l.type_id AND l.wanted IS NOT NULL AND abs(min(bp.start_date) - l.wanted) <= 3)
                 ELSE b.exam_session_id = l.sitting_id
               END, false) AS exact,
               coalesce(CASE
                 WHEN l.line_kind = 'course' THEN
                   b.course_type_id = l.type_id
                   OR (l.wanted IS NOT NULL AND abs(min(bp.start_date) - l.wanted) <= 7)
                 ELSE (SELECT s.exam_type_id FROM exam_sessions s WHERE s.id = b.exam_session_id) = l.type_id
               END, false) AS near
          FROM booking_periods bp WHERE bp.booking_id = b.id
      ) fit
     WHERE b.filemaker_booking_id IS NOT NULL AND b.deleted_at IS NULL AND b.status <> 'cancelled'
       AND b.source_registration_id IS NULL AND b.source_exam_registration_id IS NULL
       AND (l.line_kind = 'course') = (b.exam_session_id IS NULL)
       AND b.created_at >= l.submitted_at - interval '45 days'
       AND (fit.exact OR fit.near)
       AND NOT EXISTS (SELECT 1 FROM registration_link_dismissals d WHERE d.line_id = l.line_id AND d.booking_id = b.id)
  ),
  judged AS (
    SELECT f.*, (f.exact AND f.booked_after AND (f.same_person OR (f.by_email AND (f.by_birth OR f.by_name)))) AS fits
      FROM found f
  )
  SELECT j.line_kind, j.line_id, j.registration_id, j.website_person_id, j.booking_id, j.booking_person_id,
         j.by_email, j.by_birth, j.by_name, j.same_person, j.exact, j.booked_after,
         j.fits AND count(*) FILTER (WHERE j.fits) OVER (PARTITION BY j.line_id) = 1
                AND count(*) FILTER (WHERE j.fits) OVER (PARTITION BY j.booking_id) = 1 AS sure
    FROM judged j
$$;

-- One link, by a colleague (`by_id`, `by_name`) or by the bridge (both null): the booking points at the
-- line, the line is settled, the website's person is linked into the booking's, and both are written down.
-- False when the line or the booking is no longer free.
CREATE OR REPLACE FUNCTION link_registration_line(p_kind text, p_line uuid, p_booking uuid, p_by_id uuid DEFAULT NULL, p_by_name text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  v_website uuid;
  v_survivor uuid;
  v_registration uuid;
  v_label text;
  v_number text;
BEGIN
  IF p_kind = 'course' THEN
    UPDATE bookings b SET source_registration_id = p_line
     WHERE b.id = p_booking AND b.source_registration_id IS NULL AND b.source_exam_registration_id IS NULL AND b.exam_session_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM bookings x WHERE x.source_registration_id = p_line AND x.deleted_at IS NULL);
    IF NOT FOUND THEN RETURN false; END IF;
    UPDATE course_registrations c SET status = 'done' WHERE c.id = p_line
      RETURNING c.person_id, c.registration_id, concat_ws(' ', c.course_type_label, split_part(coalesce(c.declared_level_raw, c.declared_level_code, ''), ' ', 1))
      INTO v_website, v_registration, v_label;
  ELSIF p_kind = 'exam' THEN
    UPDATE bookings b SET source_exam_registration_id = p_line
     WHERE b.id = p_booking AND b.source_registration_id IS NULL AND b.source_exam_registration_id IS NULL AND b.exam_session_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM bookings x WHERE x.source_exam_registration_id = p_line AND x.deleted_at IS NULL);
    IF NOT FOUND THEN RETURN false; END IF;
    UPDATE exam_registrations e SET status = 'done' WHERE e.id = p_line
      RETURNING e.person_id, e.registration_id, e.exam_type_label INTO v_website, v_registration, v_label;
  ELSE
    RETURN false;
  END IF;

  SELECT canonical_person_id(b.person_id), b.number INTO v_survivor, v_number FROM bookings b WHERE b.id = p_booking;
  v_website := canonical_person_id(v_website);
  -- The website's person becomes the booking's: SchoolMan's keeps its number, its bookings and its name.
  IF v_website IS NOT NULL AND v_survivor IS NOT NULL AND v_website <> v_survivor THEN
    UPDATE people SET merged_into = v_survivor WHERE id = v_website AND merged_into IS NULL;
    UPDATE people SET listed = true WHERE id = v_survivor AND NOT listed;
    UPDATE record_flags f SET resolved_at = now(), resolved_by = p_by_id
     WHERE f.code = 'duplicate_candidate' AND f.resolved_at IS NULL
       AND ((f.entity = 'person' AND f.entity_id IN (v_website, v_survivor))
         OR (f.entity = 'course_registration' AND f.entity_id IN (SELECT c.id FROM course_registrations c WHERE c.registration_id = v_registration))
         OR (f.entity = 'exam_registration' AND f.entity_id IN (SELECT e.id FROM exam_registrations e WHERE e.registration_id = v_registration)));
    INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
    VALUES (p_by_id, coalesce(p_by_name, 'Workspace'), 'person', v_website, 'person_linked', jsonb_build_object('survivor', v_survivor, 'registration', v_registration));
  END IF;

  INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
  VALUES (p_by_id, coalesce(p_by_name, 'Workspace'), 'registration', v_registration, 'registration_linked_schoolman',
          jsonb_build_object('label', nullif(btrim(v_label), ''), 'number', v_number, 'booking', p_booking, 'line', p_line, 'kind', p_kind,
                             'automatic', p_by_id IS NULL));
  RETURN true;
END $$;

-- What the bridge does at the end of every run: every sure match linked. The number linked.
CREATE OR REPLACE FUNCTION link_registrations_to_schoolman() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  m record;
  linked integer := 0;
BEGIN
  FOR m IN SELECT c.line_kind, c.line_id, c.booking_id FROM registration_schoolman_candidates() c WHERE c.sure LOOP
    IF link_registration_line(m.line_kind, m.line_id, m.booking_id) THEN
      linked := linked + 1;
    END IF;
  END LOOP;
  RETURN linked;
END $$;
