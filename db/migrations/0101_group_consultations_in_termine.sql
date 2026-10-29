-- Ina's group consultations live in Termine (Rahman, 2026-10-29).
--
-- „For Ina's appointment requests, we will use the dashboard direct termine section, my termine so
-- she could confirm and cancel or delay an appointment." A request from the groups page's popup is
-- now an appointment (kind group_consultation, status `requested`), assigned to Ina's account and
-- linked to the enquiry that keeps the organiser's details. Ina confirms it (booked), moves it
-- (Ändern) or cancels it, which gives the time back to the website. No alert mail any more: the
-- request waits in her „Meine Termine". group_appointments (0015) is no longer written; its rows
-- are copied here, and the table is dropped in a later release, once no revision reads it.

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('requested', 'booked', 'came', 'missed', 'cancelled'));

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS enquiry_id uuid REFERENCES enquiries (id) ON DELETE SET NULL;

-- One website request per time: the backstop behind the advisory lock in the route.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_group_request_slot_idx
  ON appointments (starts_at)
  WHERE kind = 'group_consultation' AND source = 'website' AND status IN ('requested', 'booked');

-- The requests made so far. Ahead and not yet done: still a request; done or past: booked.
-- Declined and spam enquiries stay out. Ina's account is the one with her published address
-- (src/config/content/contacts.ts); without one, whoever owned the enquiry.
INSERT INTO appointments (kind, starts_at, minutes, first_name, last_name, email, locale, note, status, source, assigned_to, enquiry_id, created_at)
SELECT 'group_consultation', g.starts_at, 30, e.first_name, e.last_name, e.email,
       CASE WHEN e.locale = 'de' THEN 'de' ELSE 'en' END,
       NULLIF(btrim(regexp_replace(e.message, '^[^\n]*\n\n?', '')), ''),
       CASE WHEN g.starts_at > now() AND e.status <> 'done' THEN 'requested' ELSE 'booked' END,
       'website',
       COALESCE((SELECT u.id FROM staff_users u WHERE lower(u.email) = 'i.eismann@casa-bremen.de' AND u.is_active LIMIT 1), e.assigned_to),
       e.id, g.created_at
  FROM group_appointments g
  JOIN enquiries e ON e.request_id = g.request_id
 WHERE e.status NOT IN ('declined', 'spam')
   AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.enquiry_id = e.id);

COMMENT ON TABLE group_appointments IS
  'Retired by 0101: website group consultations are appointments now. Drop once no revision reads it.';
