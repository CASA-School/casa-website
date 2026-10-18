-- A booking made in the workspace gets its stay record (2026-10-18; docs/ADMIN_WORKSPACE.md §Accommodation).
-- Until now a stay booked here lived on the booking alone (`bookings.accommodation_*`), so the stays list
-- („Aufenthalte") never showed it and it could not be placed. From now on the booking keeps one stay record in
-- step with it (`syncOwnStay`, src/lib/admin/bookings.ts); this gives the bookings made so far theirs.
INSERT INTO booking_stays (booking_id, starts_on, ends_on, accommodation_type_code, room_type_code, catering_code)
SELECT b.id, b.accommodation_from, b.accommodation_to, b.accommodation_type_code, b.accommodation_room_type_code, b.accommodation_catering_code
  FROM bookings b
 WHERE b.filemaker_booking_id IS NULL
   AND b.accommodation_type_code IS NOT NULL AND b.accommodation_from IS NOT NULL AND b.accommodation_to IS NOT NULL
   AND b.accommodation_to >= b.accommodation_from
   AND NOT EXISTS (SELECT 1 FROM booking_stays s WHERE s.booking_id = b.id);
