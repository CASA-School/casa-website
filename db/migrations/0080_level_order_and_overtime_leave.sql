-- 0080 — Levels in their order, and SchoolMan's overtime days off (2026-10-22).
--
-- „B1+ is a level after B1 and before B2" (Rahman): lists ordered by the level code's text put „B1+.1"
-- before „B1.1" — '+' sorts before '.' byte by byte (the „C" collation), and other collations treat both
-- as ignorable. `level_rank()` is the order of the levels themselves; a list sorts by it, then by the text.
CREATE OR REPLACE FUNCTION level_rank(code text) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(
    array_position(ARRAY['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C1H', 'C2'], split_part(code, '.', 1)) * 10
      + CASE WHEN split_part(code, '.', 2) ~ '^\d$' THEN split_part(code, '.', 2)::int ELSE 0 END,
    999)
$$;

-- SchoolMan marks a colleague's day off as ill, on holiday, or absent with a kind (`SingleDayStaff._ID_Absence`,
-- `_ID_AbsenceDetail`): Tarifurlaub, unbezahlter Urlaub, Sonderurlaub, Abbau Überstunden, Krank, off sick,
-- Anderes. The absent days were not read, so the board showed Jana Öz and Claus Schmidt free on 26–30 October
-- and Christian Hetzner on 19–20 November („AÜ"). The overtime days get a reason of their own; the rest fall
-- under Urlaub, Krank and Sonstiges (scripts/filemaker/read_absences.py).
ALTER TABLE staff_absences DROP CONSTRAINT IF EXISTS teacher_absences_reason_check;
ALTER TABLE staff_absences ADD CONSTRAINT teacher_absences_reason_check
  CHECK (reason = ANY (ARRAY['Urlaub', 'Krank', 'Fortbildung', 'Freistellung', 'Elternzeit', 'Überstunden', 'Sonstiges']));
