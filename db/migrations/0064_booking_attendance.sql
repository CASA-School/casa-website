-- Attendance beside a booking (2026-10-18; docs/schoolman/klassenbuch.md, docs/ADMIN_WORKSPACE.md
-- §Attendance). Attendance is the Klassenbuch's: teachers record it there, and it writes it into SchoolMan
-- (`SingleDateStudent`, created each morning at „present"). The workspace reads it as it is — whether a learner
-- was there, why not, a sick note, how late — to show a booking's attendance; nothing here writes it.
CREATE TABLE IF NOT EXISTS booking_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  course_day_id uuid REFERENCES course_days (id) ON DELETE SET NULL,
  day date NOT NULL,
  present boolean,
  /* Why not there: ill, excused, unexcused. */
  absence text,
  /* For an illness: a doctor's certificate, or their own word. */
  sick_note text,
  minutes_late smallint,
  lessons numeric(4, 2),
  comment text,
  filemaker_id text,
  CONSTRAINT booking_attendance_absence_check CHECK (absence IS NULL OR absence IN ('ill', 'excused', 'unexcused')),
  CONSTRAINT booking_attendance_sick_note_check CHECK (sick_note IS NULL OR sick_note IN ('certificate', 'self')),
  CONSTRAINT booking_attendance_late_check CHECK (minutes_late IS NULL OR minutes_late BETWEEN 0 AND 600)
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_attendance_filemaker_key ON booking_attendance (filemaker_id) WHERE filemaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_attendance_booking_idx ON booking_attendance (booking_id, day);
