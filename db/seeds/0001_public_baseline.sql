-- Baseline public data.
--
-- EVERY COURSE NUMBER IN THIS FILE IS VERIFIED AGAINST casa-bremen.de.
-- The German pages are the source of truth; see
-- docs/COURSE_FACTS_SOURCE_OF_TRUTH.md and
-- docs/CONTENT_PARITY_WITH_CASA_BREMEN_DE.md.
--
-- This file used to carry development placeholders (special courses at 8
-- lessons / 460 EUR, Firmenunterricht at a 1200 EUR list price, evening German
-- at the spring-trimester 378 EUR, plus two courses CASA does not offer). A
-- placeholder in a seed is not harmless: with DATABASE_URL set, these rows are
-- what the public site renders. Do not add a number here that is not in the
-- source-of-truth doc.
--
-- lessons_per_week = 0 means "CASA publishes no weekly load for this format".
-- The facts rail renders it as "On request", never as the number 0.

-- pricing_mode and visa_eligible are listed explicitly. They were added by
-- migration 0002, after this seed was first written, so a seed that omitted them
-- inserted every new row with the column default 'from' -- which renders
-- "from 0 EUR" for the three formats CASA quotes per enquiry.
INSERT INTO course_types (
  id,
  slug,
  name,
  format,
  level_min,
  level_max,
  lessons_per_week,
  default_price,
  currency,
  pricing_mode,
  visa_eligible,
  is_active
)
VALUES
  -- 20 UE/week, 8-9 weeks per level, 520 EUR / 4 weeks and 940 EUR / 8 weeks.
  ('10000000-0000-4000-8000-000000000001', 'intensive-german', 'Intensive German',    'intensive',        'A1', 'C1', 20, 520, 'EUR', 'from',       true,  true),
  -- 2 x 90 min/week = 4 UE. 476 EUR per trimester (Herbst) plus textbook.
  ('10000000-0000-4000-8000-000000000002', 'evening-german',   'German in the Evening','evening',         'A1', 'C1',  4, 476, 'EUR', 'fixed',      false, true),
  -- One 90-min evening per week over 12 weeks, 192 EUR per module.
  ('10000000-0000-4000-8000-000000000003', 'special-courses',  'Special Courses',     'Modular',          'A2', 'C1',  2, 192, 'EUR', 'fixed',      false, true),
  -- Quoted per enquiry. 20 teaching hours/week is the default, adjustable.
  ('10000000-0000-4000-8000-000000000008', 'german-for-groups','German for Groups',   'Group Package',    'A1', 'C1', 20,   0, 'EUR', 'on_request', NULL,  true),
  -- Everything by arrangement: no published weekly load and no list price.
  ('10000000-0000-4000-8000-000000000006', 'in-company',       'Firmenunterricht',    'Custom Corporate', 'A1', 'C1',  0,   0, 'EUR', 'on_request', NULL,  true),
  -- Two intensive courses in parallel = 40 clock hours/week. Entry from B1.
  ('10000000-0000-4000-8000-000000000005', 'bildungszeit',     'Bildungszeit German', 'Intensive Block',  'B1', 'C1', 40, 280, 'EUR', 'from',       NULL,  true),
  -- B2/C1 entry is published; weekly load, dates and price are not.
  ('10000000-0000-4000-8000-000000000004', 'medical-german',   'German for Medical',  'Professional',     'B2', 'C1',  0,   0, 'EUR', 'on_request', NULL,  true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exam_types (code, name, level, default_fee, currency, is_active)
SELECT 'telc_b2', 'telc Deutsch B2', 'B2', 190, 'EUR', true
WHERE NOT EXISTS (
  SELECT 1 FROM exam_types WHERE code = 'telc_b2'
);

INSERT INTO exam_types (code, name, level, default_fee, currency, is_active)
SELECT 'telc_c1_hochschule', 'telc Deutsch C1 Hochschule', 'C1', 210, 'EUR', true
WHERE NOT EXISTS (
  SELECT 1 FROM exam_types WHERE code = 'telc_c1_hochschule'
);

-- Published course terms.
--
-- These were previously seeded relative to now() -- "start_date = now() + 1
-- week" -- which produced a plausible-looking date that matched nothing CASA
-- publishes, and drifted every time the seed ran. CASA publishes a fixed term
-- table per format; that table is what belongs here.
--
-- Intensive: mornings Mon-Fri 09:00-12:30, afternoons Mon-THU 13:00-17:30.
-- The afternoon cohort is four days, not five. Groups run 10-15 learners.
DO $$
DECLARE
  v_intensive_id   uuid;
  v_evening_id     uuid;
  v_bildungszeit_id uuid;
  v_row            record;
BEGIN
  SELECT id INTO v_intensive_id    FROM course_types WHERE slug = 'intensive-german';
  SELECT id INTO v_evening_id      FROM course_types WHERE slug = 'evening-german';
  SELECT id INTO v_bildungszeit_id FROM course_types WHERE slug = 'bildungszeit';

  IF v_intensive_id IS NOT NULL THEN
    FOR v_row IN
      SELECT * FROM (VALUES
        (DATE '2026-08-31', DATE '2026-10-23', 'morning'),
        (DATE '2026-10-26', DATE '2026-12-18', 'morning'),
        (DATE '2027-01-04', DATE '2027-02-26', 'morning'),
        (DATE '2027-03-01', DATE '2027-04-30', 'morning'),
        (DATE '2026-08-03', DATE '2026-09-24', 'afternoon'),
        (DATE '2026-09-28', DATE '2026-11-19', 'afternoon'),
        (DATE '2026-11-23', DATE '2027-01-28', 'afternoon'),
        (DATE '2027-02-01', DATE '2027-04-01', 'afternoon')
      ) AS t(start_date, end_date, slot)
    LOOP
      INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, location, status)
      SELECT
        v_intensive_id,
        v_row.start_date,
        v_row.end_date,
        15,
        CASE WHEN v_row.slot = 'morning'
          THEN '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-12:30"}'::jsonb
          ELSE '{"days":["Mon","Tue","Wed","Thu"],"time":"13:00-17:30"}'::jsonb
        END,
        'CASA Bremen - Am Dobben',
        'scheduled'
      WHERE NOT EXISTS (
        SELECT 1 FROM course_instances
        WHERE course_type_id = v_intensive_id AND start_date = v_row.start_date
      );
    END LOOP;
  END IF;

  -- Evening: Herbsttrimester. Mon/Wed carries A2.1, A2.2, B1.2, B2.1, B2.2,
  -- C1.1; Tue/Thu carries A1.1, A1.2, B1.1, C1.2.
  IF v_evening_id IS NOT NULL THEN
    FOR v_row IN
      SELECT * FROM (VALUES
        (DATE '2026-08-24', DATE '2026-12-16', '{"days":["Mon","Wed"],"time":"18:30-20:00"}'),
        (DATE '2026-08-25', DATE '2026-12-17', '{"days":["Tue","Thu"],"time":"18:30-20:00"}')
      ) AS t(start_date, end_date, schedule)
    LOOP
      INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, location, status)
      SELECT v_evening_id, v_row.start_date, v_row.end_date, 12, v_row.schedule::jsonb,
             'CASA Bremen - Am Dobben', 'scheduled'
      WHERE NOT EXISTS (
        SELECT 1 FROM course_instances
        WHERE course_type_id = v_evening_id AND start_date = v_row.start_date
      );
    END LOOP;
  END IF;

  -- Bildungszeit runs a morning and an afternoon intensive in parallel, so its
  -- terms are the intensive terms. Learners may join on any Monday inside one.
  IF v_bildungszeit_id IS NOT NULL THEN
    FOR v_row IN
      SELECT * FROM (VALUES
        (DATE '2026-08-31', DATE '2026-10-23'),
        (DATE '2026-10-26', DATE '2026-12-18'),
        (DATE '2027-01-04', DATE '2027-02-26')
      ) AS t(start_date, end_date)
    LOOP
      INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, location, status)
      SELECT v_bildungszeit_id, v_row.start_date, v_row.end_date, 15,
             -- One span, not two: the schedule column takes a single HH:MM-HH:MM
             -- range (is_valid_schedule). Bildungszeit fills the day with a
             -- morning and an afternoon intensive; the page says so in words.
             '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-17:30"}'::jsonb,
             'CASA Bremen - Am Dobben', 'scheduled'
      WHERE NOT EXISTS (
        SELECT 1 FROM course_instances
        WHERE course_type_id = v_bildungszeit_id AND start_date = v_row.start_date
      );
    END LOOP;
  END IF;
END
$$;

INSERT INTO career_positions (
  id,
  slug,
  locale,
  title,
  team,
  location,
  employment_type,
  work_mode,
  short_description,
  description,
  requirements,
  apply_email,
  is_published,
  is_featured
)
VALUES
  (
    '79b868c5-c66b-4288-9be6-000000000041',
    'daf-teacher-bremen',
    'en',
    'German Teacher (DaF)',
    'Academic Team',
    'Bremen',
    'Part-time / Full-time',
    'On-site',
    'Teach international adult learners in small groups from A1 to C1 with communicative, human-centered methods.',
    'You will lead classroom sessions, support placement alignment, and collaborate with the academic coordination team.',
    'DaF/DaZ qualification or equivalent
Classroom teaching experience
Strong communication skills in German and English',
    'bewerbungen@casa-bremen.de',
    true,
    true
  ),
  (
    '79b868c5-c66b-4288-9be6-000000000042',
    'academic-coordinator-bremen',
    'en',
    'Academic Coordinator',
    'Academic Operations',
    'Bremen',
    'Full-time',
    'On-site',
    'Coordinate teaching quality, schedules, and learner progression with teachers and student services.',
    'You will align course planning, support teacher workflows, and help keep progression pathways clear across formats.',
    'Experience in educational coordination
Strong organizational communication
German language school context preferred',
    'bewerbungen@casa-bremen.de',
    true,
    false
  ),
  (
    '79b868c5-c66b-4288-9be6-000000000043',
    'daf-lehrkraft-bremen',
    'de',
    'DaF-Lehrkraft',
    'Akademisches Team',
    'Bremen',
    'Teilzeit / Vollzeit',
    'Präsenz',
    'Unterrichten Sie internationale Lernende in kleinen Gruppen mit kommunikativer Methodik.',
    'Sie planen Unterricht, begleiten Lernfortschritte und arbeiten eng mit Koordination und Student Services zusammen.',
    'DaF/DaZ-Qualifikation oder vergleichbar
Unterrichtserfahrung
Sehr gute Kommunikationsfähigkeit',
    'bewerbungen@casa-bremen.de',
    true,
    true
  )
ON CONFLICT (id) DO NOTHING;
