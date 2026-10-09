-- Course terms and telc exam days from FileMaker, read 2026-10-09.
--
-- Everything SchoolMan has planned that starts within twelve months (until
-- 2026-10-09 + 1 year), read-only from the `Course` and `Exam` tables:
--   * Intensivkurs mornings (Mon-Fri 09:00-12:30) and afternoons (Mon-Thu
--     13:00-17:30): the terms after the ones 0001 seeded.
--   * Abendkurs: the Wintertrimester 2027 (04.01.-14.04. Mon/Wed,
--     05.01.-15.04. Tue/Thu).
--   * Bildungszeit: the morning intensive terms, as in 0001.
--   * telc Deutsch B2 and telc Deutsch C1 Hochschule: the exam days in
--     `Exam` (ExamReference "B2 telc", "C1 Hochschule"). FileMaker holds no
--     registration deadline; these follow the rule the published dates already
--     use, one month minus one day before the exam.
-- The same rows are in src/config/content/public-fixtures.ts, so the site shows
-- the same dates with or without a database. Safe to run twice.

DO $$
DECLARE
  v_intensive_id    uuid;
  v_evening_id      uuid;
  v_bildungszeit_id uuid;
  v_row             record;
BEGIN
  SELECT id INTO v_intensive_id    FROM course_types WHERE slug = 'intensive-german';
  SELECT id INTO v_evening_id      FROM course_types WHERE slug = 'evening-german';
  SELECT id INTO v_bildungszeit_id FROM course_types WHERE slug = 'bildungszeit';

  FOR v_row IN
    SELECT * FROM (VALUES
      (v_intensive_id, DATE '2027-05-03', DATE '2027-06-25', 15, '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-12:30"}'),
      (v_intensive_id, DATE '2027-06-28', DATE '2027-08-27', 15, '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-12:30"}'),
      (v_intensive_id, DATE '2027-08-30', DATE '2027-10-22', 15, '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-12:30"}'),
      (v_intensive_id, DATE '2027-04-05', DATE '2027-05-27', 15, '{"days":["Mon","Tue","Wed","Thu"],"time":"13:00-17:30"}'),
      (v_intensive_id, DATE '2027-05-31', DATE '2027-07-29', 15, '{"days":["Mon","Tue","Wed","Thu"],"time":"13:00-17:30"}'),
      (v_intensive_id, DATE '2027-08-02', DATE '2027-09-23', 15, '{"days":["Mon","Tue","Wed","Thu"],"time":"13:00-17:30"}'),
      (v_intensive_id, DATE '2027-09-27', DATE '2027-11-18', 15, '{"days":["Mon","Tue","Wed","Thu"],"time":"13:00-17:30"}'),
      (v_evening_id, DATE '2027-01-04', DATE '2027-04-14', 12, '{"days":["Mon","Wed"],"time":"18:30-20:00"}'),
      (v_evening_id, DATE '2027-01-05', DATE '2027-04-15', 12, '{"days":["Tue","Thu"],"time":"18:30-20:00"}'),
      (v_bildungszeit_id, DATE '2027-03-01', DATE '2027-04-30', 15, '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-17:30"}'),
      (v_bildungszeit_id, DATE '2027-05-03', DATE '2027-06-25', 15, '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-17:30"}'),
      (v_bildungszeit_id, DATE '2027-06-28', DATE '2027-08-27', 15, '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-17:30"}'),
      (v_bildungszeit_id, DATE '2027-08-30', DATE '2027-10-22', 15, '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-17:30"}')
    ) AS t(course_type_id, start_date, end_date, capacity, schedule)
  LOOP
    IF v_row.course_type_id IS NOT NULL THEN
      INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, location, status)
      SELECT v_row.course_type_id, v_row.start_date, v_row.end_date, v_row.capacity, v_row.schedule::jsonb,
             'CASA Bremen - Am Dobben', 'scheduled'
      WHERE NOT EXISTS (
        SELECT 1 FROM course_instances
        WHERE course_type_id = v_row.course_type_id AND start_date = v_row.start_date
      );
    END IF;
  END LOOP;
END
$$;

-- Exam days at the hours CASA publishes: B2 about 09:00-17:00, C1 Hochschule
-- about 08:30-17:00, Bremen time, stored as UTC (CET until 28.03.2027, CEST after).
INSERT INTO exam_sessions (id, exam_type_id, starts_at, ends_at, registration_deadline, capacity, status)
SELECT s.id::uuid, t.id, s.starts_at::timestamptz, s.ends_at::timestamptz, s.deadline::date, 28, 'scheduled'
FROM (
  VALUES
    ('40000000-0000-4000-8000-000000010004', 'telc_b2', '2027-01-22T08:00:00Z', '2027-01-22T16:00:00Z', '2026-12-21'),
    ('40000000-0000-4000-8000-000000010005', 'telc_b2', '2027-03-12T08:00:00Z', '2027-03-12T16:00:00Z', '2027-02-11'),
    ('40000000-0000-4000-8000-000000010006', 'telc_b2', '2027-05-21T07:00:00Z', '2027-05-21T15:00:00Z', '2027-04-20'),
    ('40000000-0000-4000-8000-000000010007', 'telc_b2', '2027-06-18T07:00:00Z', '2027-06-18T15:00:00Z', '2027-05-17'),
    ('40000000-0000-4000-8000-000000010008', 'telc_b2', '2027-08-20T07:00:00Z', '2027-08-20T15:00:00Z', '2027-07-19'),
    ('40000000-0000-4000-8000-000000010009', 'telc_b2', '2027-10-08T07:00:00Z', '2027-10-08T15:00:00Z', '2027-09-07'),
    ('40000000-0000-4000-8000-000000020005', 'telc_c1_hochschule', '2027-02-05T07:30:00Z', '2027-02-05T16:00:00Z', '2027-01-04'),
    ('40000000-0000-4000-8000-000000020006', 'telc_c1_hochschule', '2027-03-05T07:30:00Z', '2027-03-05T16:00:00Z', '2027-02-04'),
    ('40000000-0000-4000-8000-000000020007', 'telc_c1_hochschule', '2027-04-09T06:30:00Z', '2027-04-09T15:00:00Z', '2027-03-08'),
    ('40000000-0000-4000-8000-000000020008', 'telc_c1_hochschule', '2027-05-14T06:30:00Z', '2027-05-14T15:00:00Z', '2027-04-13'),
    ('40000000-0000-4000-8000-000000020009', 'telc_c1_hochschule', '2027-06-04T06:30:00Z', '2027-06-04T15:00:00Z', '2027-05-03'),
    ('40000000-0000-4000-8000-000000020010', 'telc_c1_hochschule', '2027-07-02T06:30:00Z', '2027-07-02T15:00:00Z', '2027-06-01'),
    ('40000000-0000-4000-8000-000000020011', 'telc_c1_hochschule', '2027-09-03T06:30:00Z', '2027-09-03T15:00:00Z', '2027-08-02'),
    ('40000000-0000-4000-8000-000000020012', 'telc_c1_hochschule', '2027-10-01T06:30:00Z', '2027-10-01T15:00:00Z', '2027-08-31')
) AS s (id, code, starts_at, ends_at, deadline)
JOIN exam_types t ON t.code = s.code
ON CONFLICT (id) DO NOTHING;
