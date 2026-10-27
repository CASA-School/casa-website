-- 0091 — The workspace search folds what it compares (2026-10-27).
--
-- Rahman: a search "more advanced and dynamic and intelligent, now that we are having all the data".
-- A colleague types „Muller", „Mueller" or „Müller", „Sahin" for „Şahin", „Strasse" for „Straße",
-- and finds the same person. `ws_fold` is the one rule both sides of the comparison go through: the
-- record's text here, the typed text in `foldSearch` (src/lib/admin/search-query.ts), which does the
-- same steps in the same order and is tested against them.
--
--   1. lower case, Unicode-wide (`pg_c_utf8`, Postgres 17's built-in collation, so the result does not
--      depend on the database's locale: the local container runs C, Azure en_US);
--   2. accents off: decompose (NFD) and drop the combining marks U+0300–U+036F (é→e, ş→s, ö→o, ñ→n);
--   3. the letters that do not decompose: ß→ss, æ→ae, œ→oe, þ→th, ł→l, ø→o, đ→d, ð→d, ı→i;
--   4. ä/ae, ö/oe, ü/ue the same: ae→a, oe→o, ue→u (Müller, Mueller and Muller all read „muller");
--   5. punctuation is a space, except @ . + (an address, „B1.1", „B1+").
--
-- No extension: unaccent and pg_trgm would have to be allow-listed on the Azure server
-- (`azure.extensions`) and created by its administrator, and at CASA's size (thousands of rows, not
-- millions) a scan with this function answers in milliseconds.

CREATE OR REPLACE FUNCTION ws_fold(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT btrim(regexp_replace(
    replace(replace(replace(
      translate(
        replace(replace(replace(replace(
          regexp_replace(normalize(lower(value COLLATE pg_c_utf8), NFD), '[̀-ͯ]', '', 'g'),
          'ß', 'ss'), 'æ', 'ae'), 'œ', 'oe'), 'þ', 'th'),
        'łøđðı', 'loddi'),
      'ae', 'a'), 'oe', 'o'), 'ue', 'u'),
    '[[:space:]!"#$%&''()*,/:;<=>?^_`{|}~\[\]\\\-–—‘’‚“”„«»·]+', ' ', 'g'))
$$;

COMMENT ON FUNCTION ws_fold(text) IS 'The workspace search''s comparison form; mirrors foldSearch in src/lib/admin/search-query.ts.';

-- The two tables large enough for folding on every search to show: ~3,000 people (10 ms a scan) and
-- ~28,000 letters (a quarter of a second). Their folded text is kept beside them, written with the row
-- (`||`, not `concat_ws`, which is not immutable). Should `ws_fold` ever change, rewrite them:
-- `UPDATE people SET first_name = first_name; UPDATE letters SET subject = subject;`.
ALTER TABLE people ADD COLUMN IF NOT EXISTS search_name text GENERATED ALWAYS AS (
  ws_fold(coalesce(first_name, '') || ' ' || coalesce(second_last_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(nickname, ''))
) STORED;

ALTER TABLE letters ADD COLUMN IF NOT EXISTS search_subject text GENERATED ALWAYS AS (ws_fold(coalesce(subject, ''))) STORED;
