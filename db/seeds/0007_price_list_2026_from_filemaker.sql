-- The 2026 price list, from SchoolMan's booking scripts (DDR 2026-07-06, read
-- 2026-10-13), and the lessons of the terms 0006 brought.
--
--   WriteCoursePriceInternationalAirport_Booking — the intensive course:
--     1–10 weeks 145 / 280 / 405 / 520 / 625 / 730 / 835 / 940 / 1057,50 /
--     1175 € ("ShortTerm"), 117,50 € a week beyond ("LongTerm").
--   WriteCoursePriceCentralStation_Booking — 7 € a lesson for the evening
--     course, 8 € for the special courses (68 lessons 476 €, 24 lessons 192 €).
--   WriteAccommodationPrice — rent for whole weeks: 200 / 340 / 460 € for one
--     to three, 145 € a week from four (580 € for four); on the first stay
--     the placement fee 50 € and the deposit 580 €.
-- The enrolment fee, the books and the exams came with 0004.
--
-- Imported once (data_imports, migration 0023): every later price is entered
-- in the workspace, Settings → Prices, and a release never puts back a price
-- CASA has changed or removed.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM data_imports WHERE name = 'price-list-2026') THEN
    RETURN;
  END IF;

  INSERT INTO rates (scope, course_type_id, amount, unit, min_quantity, max_quantity, valid_from, note)
  SELECT 'course_type', t.id, v.amount, 'item', v.weeks, v.weeks, DATE '2026-01-01', 'SchoolMan WriteCoursePriceInternationalAirport_Booking, 2026'
    FROM course_types t
   CROSS JOIN (VALUES (1, 145), (2, 280), (3, 405), (4, 520), (5, 625), (6, 730), (7, 835), (8, 940), (9, 1057.50), (10, 1175)) AS v(weeks, amount)
   WHERE t.slug = 'intensive-german';

  INSERT INTO rates (scope, course_type_id, amount, unit, valid_from, note)
  SELECT 'course_type', t.id, v.amount, v.unit::rate_unit, DATE '2026-01-01', v.note
    FROM course_types t
    JOIN (VALUES
      ('intensive-german', 117.50, 'week', 'SchoolMan: LongTerm, beyond ten weeks'),
      ('evening-german', 7, 'lesson', 'SchoolMan WriteCoursePriceCentralStation_Booking, 2026'),
      ('special-courses', 8, 'lesson', 'SchoolMan WriteCoursePriceCentralStation_Booking, 2026')
    ) AS v(slug, amount, unit, note) ON v.slug = t.slug;

  INSERT INTO rates (scope, charge_type_code, amount, unit, min_quantity, max_quantity, valid_from, note)
  SELECT 'charge_type', 'accommodation_rent', v.amount, 'item', v.weeks, v.weeks, DATE '2026-01-01', 'SchoolMan WriteAccommodationPrice, 2026'
    FROM (VALUES (1, 200), (2, 340), (3, 460)) AS v(weeks, amount);

  INSERT INTO rates (scope, charge_type_code, amount, unit, valid_from, note)
  VALUES
    ('charge_type', 'accommodation_rent', 145, 'week', DATE '2026-01-01', 'SchoolMan WriteAccommodationPrice, 2026: from four weeks'),
    ('charge_type', 'accommodation_placement_fee', 50, 'item', DATE '2026-01-01', 'SchoolMan WriteAccommodationPrice: first stay'),
    ('charge_type', 'deposit', 580, 'item', DATE '2026-01-01', 'SchoolMan WriteAccommodationPrice: Deponat, first stay');

  INSERT INTO data_imports (name) VALUES ('price-list-2026');
END $$;

-- The terms' lessons, as FileMaker counts them (Course.cal_NumberLesson).
UPDATE course_instances i SET lessons = v.lessons
  FROM course_types t,
       (VALUES (DATE '2026-08-24', '["Mon", "Wed"]', 68), (DATE '2026-08-25', '["Tue", "Thu"]', 68),
               (DATE '2027-01-04', '["Mon", "Wed"]', 54), (DATE '2027-01-05', '["Tue", "Thu"]', 56)) AS v(start_date, days, lessons)
 WHERE t.id = i.course_type_id AND t.slug = 'evening-german'
   AND i.start_date = v.start_date AND i.schedule -> 'days' = v.days::jsonb AND i.lessons IS NULL;
