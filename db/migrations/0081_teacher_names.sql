-- 0081 — Teachers are named „Vorname N." (Rahman, 2026-10-22).
--
-- „Some names start with the first name and the last name abbreviated to its first letter with a dot,
-- which is the right way: apply it to all." The board, Kurse, the Tagesplan and the course pages show a
-- teacher by `staff_members.short_name`; it held SchoolMan's abbreviation („Ma.B") on the live register
-- and the September sheet's form („Mariella B") here. Every teacher's becomes the first first name, the
-- last name's initial and a dot: „Mariella B.", „Ayse T.", „Jana Ö.". Two of one name keep a second
-- letter („Claudia Gr."). New teachers are named the same way (staff-labels.ts, import-staff.mjs).
DO $$
DECLARE
  r record;
  label text;
  n integer;
BEGIN
  -- Free the teachers' names first, so one can take a name another held a moment ago.
  UPDATE staff_members s SET short_name = '~' || s.id
   WHERE EXISTS (SELECT 1 FROM staff_member_roles x WHERE x.staff_member_id = s.id AND x.role_code = 'teaching');

  FOR r IN
    SELECT s.id, split_part(btrim(p.first_name), ' ', 1) AS first, btrim(coalesce(p.last_name, '')) AS last
      FROM staff_members s JOIN people p ON p.id = s.person_id
     WHERE s.short_name LIKE '~%'
     ORDER BY 2, 3
  LOOP
    n := 1;
    LOOP
      label := CASE WHEN r.last = '' THEN r.first ELSE r.first || ' ' || left(r.last, n) || '.' END;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM staff_members WHERE short_name = label) OR r.last = '' OR n >= length(r.last);
      n := n + 1;
    END LOOP;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM staff_members WHERE short_name = label) LOOP
      label := regexp_replace(label, ' \d+$', '') || ' ' || n;
      n := n + 1;
    END LOOP;
    UPDATE staff_members SET short_name = label WHERE id = r.id;
  END LOOP;
END $$;
