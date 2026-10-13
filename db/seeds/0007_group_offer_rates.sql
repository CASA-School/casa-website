-- The group price list, for group offers (docs/OFFERS.md).
--
-- Source: `Preiskalkulation_Gruppen.xlsx`, sheet Kalkulation — the group
-- coordinator's own workbook (received 2026-08-12, ported in
-- src/lib/pricing/group-pricing.ts). The offers FileMaker holds for 2025–2026
-- use these amounts, typed by hand each time: 145 a week for the course,
-- 450 for two weeks in a double room with half board, 60 a week for the
-- canteen, 25 a week for a student ticket, 30 handling.
--
-- The workbook's three defects do not carry over, because the offer computes
-- each line from its own quantity: materials (B5) are added, a monthly ticket
-- covers four weeks instead of being charged per week, and the room follows
-- the stay's length. Every row is editable under Settings → Types & prices,
-- and a price for 2027 is a new row with its own `valid_from`.
--
-- Matched by variant, so none of these is ever picked for an individual
-- booking: `applicable_rate()` returns a variant rate only to a lookup that
-- names that variant.

-- Course: 20 lessons a week (B4).
INSERT INTO rates (scope, course_type_id, amount, unit, currency, valid_from, note)
SELECT 'course_type', c.id, 145, 'person_week', 'EUR', DATE '2026-01-01', 'Preiskalkulation_Gruppen.xlsx B4: 20 UE a week'
  FROM course_types c WHERE c.slug = 'german-for-groups'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'course_type' AND r.course_type_id = c.id AND r.unit = 'person_week');

-- Materials, once (B5) and handling, once (B32, "muss immer aufgeschlagen werden").
INSERT INTO rates (scope, charge_type_code, variant, amount, unit, currency, valid_from, note)
SELECT 'charge_type', 'teaching_material', 'group', 20, 'item', 'EUR', DATE '2026-01-01', 'Preiskalkulation_Gruppen.xlsx B5'
 WHERE NOT EXISTS (SELECT 1 FROM rates WHERE scope = 'charge_type' AND charge_type_code = 'teaching_material' AND variant = 'group');
INSERT INTO rates (scope, charge_type_code, variant, amount, unit, currency, valid_from, note)
SELECT 'charge_type', 'administrative_charge', 'group', 30, 'item', 'EUR', DATE '2026-01-01', 'Preiskalkulation_Gruppen.xlsx B32'
 WHERE NOT EXISTS (SELECT 1 FROM rates WHERE scope = 'charge_type' AND charge_type_code = 'administrative_charge' AND variant = 'group');

-- Lunch at the canteen on course days, a week (B24).
INSERT INTO rates (scope, charge_type_code, variant, amount, unit, currency, valid_from, note)
SELECT 'charge_type', 'catering', 'canteen', 60, 'person_week', 'EUR', DATE '2026-01-01', 'Preiskalkulation_Gruppen.xlsx B24'
 WHERE NOT EXISTS (SELECT 1 FROM rates WHERE scope = 'charge_type' AND charge_type_code = 'catering' AND variant = 'canteen');

-- Culture programme, a week, by size (B27:B29).
INSERT INTO rates (scope, charge_type_code, variant, amount, unit, currency, valid_from, note)
SELECT 'charge_type', 'culture_programme', v.variant, v.amount, 'person_week', 'EUR', DATE '2026-01-01', 'Preiskalkulation_Gruppen.xlsx B27:B29'
  FROM (VALUES ('small', 40), ('medium', 60), ('large', 100)) AS v (variant, amount)
 WHERE NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'charge_type' AND r.charge_type_code = 'culture_programme' AND r.variant = v.variant);

-- Public transport (B18:B21). A weekly ticket covers one week, a monthly one
-- four; the offer picks the cheapest mix for the stay.
INSERT INTO rates (scope, charge_type_code, variant, amount, unit, currency, valid_from, note)
SELECT 'charge_type', 'travel_ticket', v.variant, v.amount, v.unit::rate_unit, 'EUR', DATE '2026-01-01', 'Preiskalkulation_Gruppen.xlsx B18:B21'
  FROM (VALUES ('student-week', 25, 'week'), ('adult-week', 35, 'week'),
               ('student-month', 75, 'month'), ('adult-month', 100, 'month')) AS v (variant, amount, unit)
 WHERE NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'charge_type' AND r.charge_type_code = 'travel_ticket' AND r.variant = v.variant);

-- Host family, half board, for the whole stay by its length in weeks (A8:B15).
-- Nothing beyond four weeks: the workbook has no price, so an offer for a
-- longer stay shows the line without one until somebody enters it.
INSERT INTO rates (scope, accommodation_type_code, room_type_code, catering_code, variant,
                   min_quantity, max_quantity, amount, unit, currency, valid_from, note)
SELECT 'accommodation', 'with_germans', v.room, 'half_board', 'group', v.weeks, v.weeks, v.amount,
       'item', 'EUR', DATE '2026-01-01', 'Preiskalkulation_Gruppen.xlsx A8:B15, for the whole stay'
  FROM (VALUES ('double', 1, 255), ('double', 2, 450), ('double', 3, 645), ('double', 4, 840),
               ('single', 1, 265), ('single', 2, 550), ('single', 3, 805), ('single', 4, 1060))
       AS v (room, weeks, amount)
 WHERE NOT EXISTS (
   SELECT 1 FROM rates r
    WHERE r.scope = 'accommodation' AND r.accommodation_type_code = 'with_germans'
      AND r.room_type_code = v.room AND r.variant = 'group' AND r.min_quantity = v.weeks);
