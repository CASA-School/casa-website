-- 0024 · B1+ in two halves, as the school runs it.
--
-- B1+ is a level of its own between B1 and B2: a whole term, or its two
-- halves B1+.1 and B1+.2, taught with Kontext B1+1 and B1+2 — the way
-- FileMaker's LevelStepReference has it (B1+1 = 7, B1+2 = 8) and the way every
-- other level is sold (Rahman, 2026-10-13). The workspace books and offers the
-- halves; 'B1+' stays for the whole level, which the public registration form
-- and the placement test still name.

-- Make room after B1+ (sort_order is unique, so in two steps).
UPDATE levels SET sort_order = sort_order + 1000 WHERE sort_order > (SELECT sort_order FROM levels WHERE code = 'B1+');
UPDATE levels SET sort_order = sort_order - 998 WHERE sort_order > 1000;

UPDATE levels SET filemaker_level_step_id = NULL WHERE code = 'B1+';

INSERT INTO levels (code, cefr, sort_order, filemaker_level_step_id, cefr_band, colour_hex)
SELECT v.code, 'B1', b.sort_order + v.n, v.fm, b.cefr_band, b.colour_hex
  FROM levels b, (VALUES ('B1+.1', 1, 7), ('B1+.2', 2, 8)) AS v(code, n, fm)
 WHERE b.code = 'B1+'
ON CONFLICT (code) DO NOTHING;

-- The B1+ books belong to their half.
UPDATE materials SET level_code = 'B1+.1' WHERE level_code = 'B1+' AND part = 1;
UPDATE materials SET level_code = 'B1+.2' WHERE level_code = 'B1+' AND part = 2;
