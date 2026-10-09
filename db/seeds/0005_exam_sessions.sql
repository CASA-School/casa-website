-- telc exam days, 2026-10-09.
--
-- The same seven sessions as `buildExamSessions()` in
-- src/config/content/public-fixtures.ts, with the same ids, so a site running on
-- the database shows the dates the fallback shows. Without this file the exam
-- pages read "Wird bekannt gegeben" as soon as DATABASE_URL was set: the
-- baseline seeded the exam types but never a session. Found by comparing every
-- public page with and without a database before connecting the production one.
--
-- Times are the hours CASA publishes, as UTC instants (Bremen is UTC+2 until
-- 25 October, UTC+1 after). New sessions are entered in the workspace, not here.

INSERT INTO exam_sessions (id, exam_type_id, starts_at, ends_at, registration_deadline, capacity, status)
SELECT s.id::uuid, t.id, s.starts_at::timestamptz, s.ends_at::timestamptz, s.deadline::date, 28, 'scheduled'
FROM (
  VALUES
    ('40000000-0000-4000-8000-000000010001', 'telc_b2', '2026-08-21T07:00:00Z', '2026-08-21T15:00:00Z', '2026-07-20'),
    ('40000000-0000-4000-8000-000000010002', 'telc_b2', '2026-10-16T07:00:00Z', '2026-10-16T15:00:00Z', '2026-09-15'),
    ('40000000-0000-4000-8000-000000010003', 'telc_b2', '2026-11-13T08:00:00Z', '2026-11-13T16:00:00Z', '2026-10-12'),
    ('40000000-0000-4000-8000-000000020001', 'telc_c1_hochschule', '2026-09-04T06:30:00Z', '2026-09-04T15:00:00Z', '2026-08-03'),
    ('40000000-0000-4000-8000-000000020002', 'telc_c1_hochschule', '2026-10-02T06:30:00Z', '2026-10-02T15:00:00Z', '2026-09-01'),
    ('40000000-0000-4000-8000-000000020003', 'telc_c1_hochschule', '2026-10-30T07:30:00Z', '2026-10-30T16:00:00Z', '2026-09-29'),
    ('40000000-0000-4000-8000-000000020004', 'telc_c1_hochschule', '2026-11-27T07:30:00Z', '2026-11-27T16:00:00Z', '2026-10-26')
) AS s (id, code, starts_at, ends_at, deadline)
JOIN exam_types t ON t.code = s.code
ON CONFLICT (id) DO NOTHING;
