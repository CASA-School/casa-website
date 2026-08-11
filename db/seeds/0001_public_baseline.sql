INSERT INTO course_types (
  slug,
  name,
  format,
  level_min,
  level_max,
  lessons_per_week,
  default_price,
  currency,
  is_active
)
SELECT 'intensive-german', 'Intensive German', 'intensive', 'A1', 'C1', 20, 520, 'EUR', true
WHERE NOT EXISTS (
  SELECT 1 FROM course_types WHERE slug = 'intensive-german'
);

INSERT INTO course_types (
  slug,
  name,
  format,
  level_min,
  level_max,
  lessons_per_week,
  default_price,
  currency,
  is_active
)
SELECT 'evening-german', 'German in the Evening', 'evening', 'A1', 'C1', 4, 378, 'EUR', true
WHERE NOT EXISTS (
  SELECT 1 FROM course_types WHERE slug = 'evening-german'
);

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
  is_active
)
VALUES
  (
    '10000000-0000-4000-8000-000000000003',
    'special-courses',
    'Special Courses',
    'Modular',
    'A2',
    'C1',
    8,
    460,
    'EUR',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000008',
    'german-for-groups',
    'German for Groups',
    'Speaking Focus',
    'A2',
    'C1',
    6,
    360,
    'EUR',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'in-company',
    'Firmenunterricht',
    'Custom Corporate',
    'A1',
    'C1',
    4,
    1200,
    'EUR',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    'business-german',
    'Business German',
    'Professional',
    'B1',
    'C1',
    8,
    540,
    'EUR',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'bildungszeit',
    'Bildungszeit German',
    'Intensive Block',
    'A2',
    'C1',
    25,
    640,
    'EUR',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    'university-prep',
    'University Preparation',
    'Academic German',
    'B2',
    'C1',
    14,
    860,
    'EUR',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'medical-german',
    'German for Medical',
    'Professional',
    'B2',
    'C1',
    12,
    980,
    'EUR',
    true
  )
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

DO $$
DECLARE
  v_intensive_id uuid;
  v_evening_id uuid;
BEGIN
  SELECT id INTO v_intensive_id FROM course_types WHERE slug = 'intensive-german';
  SELECT id INTO v_evening_id FROM course_types WHERE slug = 'evening-german';

  IF v_intensive_id IS NOT NULL THEN
    INSERT INTO course_instances (
      course_type_id,
      start_date,
      end_date,
      capacity,
      schedule,
      location,
      status
    )
    SELECT
      v_intensive_id,
      (now() + interval '1 week')::date,
      (now() + interval '9 weeks')::date,
      15,
      '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-12:30"}'::jsonb,
      'CASA Bremen Campus',
      'scheduled'
    WHERE NOT EXISTS (
      SELECT 1
      FROM course_instances
      WHERE course_type_id = v_intensive_id
        AND start_date = (now() + interval '1 week')::date
    );
  END IF;

  IF v_evening_id IS NOT NULL THEN
    INSERT INTO course_instances (
      course_type_id,
      start_date,
      end_date,
      capacity,
      schedule,
      location,
      status
    )
    SELECT
      v_evening_id,
      (now() + interval '2 weeks')::date,
      (now() + interval '14 weeks')::date,
      12,
      '{"days":["Mon","Wed"],"time":"18:30-20:00"}'::jsonb,
      'CASA City Classroom',
      'scheduled'
    WHERE NOT EXISTS (
      SELECT 1
      FROM course_instances
      WHERE course_type_id = v_evening_id
        AND start_date = (now() + interval '2 weeks')::date
    );
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
    'info@casa-bremen.de',
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
    'info@casa-bremen.de',
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
    'info@casa-bremen.de',
    true,
    true
  )
ON CONFLICT (id) DO NOTHING;
