-- Learners per course and week, as SchoolMan counts them (2026-10-17; docs/ADMIN_WORKSPACE.md §Courses).
--
-- While bookings are still made in SchoolMan, the course list shows how many learners sit in each
-- course, week by week, as SchoolMan's `Course_List` does: read from its booking periods
-- (`scripts/filemaker/read_course_learners.py`), counts only — no name, no booking. Bookings made in
-- the workspace are counted from `booking_periods` and come on top. Replaced by each read.
CREATE TABLE IF NOT EXISTS course_week_learners (
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  monday date NOT NULL CONSTRAINT course_week_learners_monday_check CHECK (extract(isodow FROM monday) = 1),
  learners integer NOT NULL CONSTRAINT course_week_learners_count_check CHECK (learners >= 0),
  read_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (course_id, monday)
);
