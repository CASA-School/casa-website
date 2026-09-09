-- Rates recoverable from FileMaker, 2026-09-09.
--
-- Only prices that exist as a value somewhere in FileMaker are here, each with
-- the place it came from:
--
--   * Book prices — BookReference.CostNetReference, the one real price list.
--   * Exam fees — extracted from the Case() inside the script
--     `SetPrice_Exam_NationalAirport` (telc B2 190 both parts / 160 one part;
--     C1 Hochschule 210 / 185). A fee that lived in source code.
--   * Enrolment fee 50 — CostDetailSample, the same in all 23 samples.
--
-- Course and accommodation prices are deliberately NOT seeded. In FileMaker
-- they are typed per course and per cost line: "Kurspreis" appears at 900,
-- 880, 860, 500, 416, 378, 260 and 240 across 171 sample variants, so there is
-- no defensible single value to import. docs/COURSE_FACTS_SOURCE_OF_TRUTH.md
-- governs the published ones; CASA enters the rest once, per period.

INSERT INTO rates (scope, charge_type_code, amount, unit, currency, valid_from, note)
SELECT 'charge_type', 'enrolment_fee', 50, 'item', 'EUR', DATE '2026-01-01', 'FileMaker CostDetailSample: 50 in all 23 samples'
 WHERE NOT EXISTS (SELECT 1 FROM rates WHERE scope = 'charge_type' AND charge_type_code = 'enrolment_fee');

-- Book prices, net, from BookReference. VAT on books in Germany is 7%.
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 23.5, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Aspekte neu B2.1' AND m.isbn = '978-3-12-605027-2'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 23.5, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Aspekte neu B2.2' AND m.isbn = '978-3-12-605028-9'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 29.75, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'TestDaf Training 2015' AND m.isbn = '978-3-930861-60-6'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 22.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Grammatik aktiv B2-C1' AND m.isbn = '978-3-06-122965-8'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 18.5, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Prüfungstraining telc C1 Hochschule' AND m.isbn = '978-3-910223-40-0'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Aspekte Junior B2' AND m.isbn = '978-3-12-605266-5'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 22, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Mit Erfolg zum digitalen Test DaF' AND m.isbn = '978-3-12-676827-6'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 30.75, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Fokus Deutsch B1/B2' AND m.isbn = '978-3-06-021305-4'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 22.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Grammatik aktiv A1-B1' AND m.isbn = '978-3-06-122964-1'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 25.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'B1+ LAB Teil 1 Hybrid' AND m.isbn = '978-3-12-605023-4'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 25.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'B1+ LAB Teil 2 Hybrid' AND m.isbn = '978-3-12-605033-3'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Kontext B1+1' AND m.isbn = '978-3-12-605407-2'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 23.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Netzwerk neu A2.1' AND m.isbn = '978-3-12-607286-1'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 23.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Netzwerk neu A2.2' AND m.isbn = '978-3-12-607287-8'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 23.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Netzwerk neu A1.1' AND m.isbn = '978-3-12-607161-1'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 23.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Netzwerk neu A1.2' AND m.isbn = '978-3-12-607169-7'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 23.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Netzwerk neu B1.1' AND m.isbn = '978-3-12-607290-8'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 23.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Netzwerk neu B1.2' AND m.isbn = '978-3-12-607291-5'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Kontext B1+2' AND m.isbn = '978-3-12-605408-9'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Kontext B2.1' AND m.isbn = '978-3-12-605411-9'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Kontext B2.2' AND m.isbn = '978-3-12-605412-6'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Kontext C1.1' AND m.isbn = '978-3-12-605313-6'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Kontext C1.2' AND m.isbn = '978-3-12-605348-8'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Aspekte neu B2.2' AND m.isbn = '978-3-12-605269-6'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Aspekte neu C1.1' AND m.isbn = '978-3-12-605278-8'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Aspekte neu C1.2' AND m.isbn = '978-3-12-605279-5'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 22.5, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Real Business English B1' AND m.isbn = '978-3-12-501672-9'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 23.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Real Business English B1' AND m.isbn = '978-3-12-501671-2'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 24.5, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Klasse! A2 - Deutsch für Jugendliche' AND m.isbn = '978-3-12-607307-3'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 17.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Klasse! A2 - Deutsch für Jugendliche' AND m.isbn = '978-3-12-607132-1'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 26.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Klasse! A2 - Deutsch für Jugendliche' AND m.isbn = '978-3-12-607137-6'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 15.99, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Grammatik aktiv B1+' AND m.isbn = '978-3-06-122966-5'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 45.9, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Diagnose? Deutsch! – Fachsprache Medizin' AND m.isbn = '978-3-9823750-0-7'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 22.0, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Mit Erfolg zu telc Deutsch B2' AND m.isbn = '978-3-12-676868-9'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 30.5, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Schritte plus Neu 5+6' AND m.isbn = '978-3-19-341085-6'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);
INSERT INTO rates (scope, material_id, amount, unit, currency, vat_rate, valid_from, note)
SELECT 'material', m.id, 28.5, 'item', 'EUR', 7.00, DATE '2026-01-01', 'FileMaker BookReference'
  FROM materials m WHERE m.title = 'Einfach zum Studium! Deutsch für den Hochschulzugang C1' AND m.isbn = '978-3-910223-64-6'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'material' AND r.material_id = m.id);

-- Exam fees. Two rates per exam: the fee depends on how many parts are sat,
-- which is what the `parts` column is for.
INSERT INTO rates (scope, exam_type_id, parts, amount, unit, currency, valid_from, note)
SELECT 'exam_type', e.id, 2, 190, 'item', 'EUR', DATE '2026-01-01', 'FileMaker script SetPrice_Exam_NationalAirport'
  FROM exam_types e WHERE e.name ILIKE 'telc%B2'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'exam_type' AND r.exam_type_id = e.id AND r.parts = 2)
 LIMIT 1;
INSERT INTO rates (scope, exam_type_id, parts, amount, unit, currency, valid_from, note)
SELECT 'exam_type', e.id, 1, 160, 'item', 'EUR', DATE '2026-01-01', 'FileMaker script SetPrice_Exam_NationalAirport'
  FROM exam_types e WHERE e.name ILIKE 'telc%B2'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'exam_type' AND r.exam_type_id = e.id AND r.parts = 1)
 LIMIT 1;
INSERT INTO rates (scope, exam_type_id, parts, amount, unit, currency, valid_from, note)
SELECT 'exam_type', e.id, 2, 210, 'item', 'EUR', DATE '2026-01-01', 'FileMaker script SetPrice_Exam_NationalAirport'
  FROM exam_types e WHERE e.name ILIKE '%C1%'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'exam_type' AND r.exam_type_id = e.id AND r.parts = 2)
 LIMIT 1;
INSERT INTO rates (scope, exam_type_id, parts, amount, unit, currency, valid_from, note)
SELECT 'exam_type', e.id, 1, 185, 'item', 'EUR', DATE '2026-01-01', 'FileMaker script SetPrice_Exam_NationalAirport'
  FROM exam_types e WHERE e.name ILIKE '%C1%'
   AND NOT EXISTS (SELECT 1 FROM rates r WHERE r.scope = 'exam_type' AND r.exam_type_id = e.id AND r.parts = 1)
 LIMIT 1;
