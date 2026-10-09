-- The evening course price is a "from" price (Rahman, 2026-10-09).
--
-- FileMaker prices each trimester by its length: the Herbsttrimester 2026 at
-- 476 EUR, the Wintertrimester 2027 at 378 EUR (Mon/Wed) and 392 EUR (Tue/Thu).
-- The site shows one price per course type, so it now reads "ab 378 EUR".
-- Only a row still holding the old published price is changed, so a price
-- staff have since edited in the workspace is left alone.

UPDATE course_types
   SET default_price = 378,
       pricing_mode = 'from'
 WHERE slug = 'evening-german'
   AND default_price = 476
   AND pricing_mode = 'fixed';
