-- 0095 — What SchoolMan knows about a place, its rooms, its held beds and its Wohnungsgeberbestätigungen
-- that the bridge did not read (2026-10-27; docs/schoolman/accommodation.md, the completeness review).
-- Rahman: „map everything properly so every data is transferred properly to our new system".

-- A place. Whether pets live there (`Accommodation._ID_Animal`, 1 ja / 2 nein, the field in use since 2024;
-- `_ID_Pet` before it); `pets` keeps which animals. Its Wohnungsgeber, as printed on the
-- Wohnungsgeberbestätigung (`Landlord` when `_ID_Landlord` is set, else `Header.Text`): name and address,
-- a line each. What the host offers (`Management._ID_AccommodationTypeOffer / …CateringOffer / …RoomOffer`
-- since 2025, `Accommodation._ID_AccommodationTypeOffer` before): codes of the three vocabularies, in their
-- order; every write takes them through the vocabulary, so only codes that exist are kept.
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS has_pets boolean;
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS landlord text;
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS offered_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS offered_catering text[] NOT NULL DEFAULT '{}';
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS offered_room_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE accommodations DROP CONSTRAINT IF EXISTS accommodations_landlord_check;
ALTER TABLE accommodations ADD CONSTRAINT accommodations_landlord_check CHECK (landlord IS NULL OR length(btrim(landlord)) BETWEEN 1 AND 500);
COMMENT ON COLUMN accommodations.has_pets IS 'Pets live in the household (SchoolMan _ID_Animal, else _ID_Pet); pets says which.';
COMMENT ON COLUMN accommodations.landlord IS 'The Wohnungsgeber printed on the Wohnungsgeberbestätigung: name and address, a line each.';
COMMENT ON COLUMN accommodations.offered_types IS 'accommodation_types.code the host offers, in the vocabulary''s order.';
COMMENT ON COLUMN accommodations.offered_catering IS 'catering_options.code the host offers, in the vocabulary''s order.';
COMMENT ON COLUMN accommodations.offered_room_types IS 'accommodation_room_types.code the host offers, in the vocabulary''s order.';

-- A room's number in its place (`Room._ID_InternalRoom`): the „Zimmernummer in der Wohngemeinschaft" on the
-- check-in and check-out letters, on all 32 rooms of CASA's flats. The name stays as typed.
ALTER TABLE accommodation_rooms ADD COLUMN IF NOT EXISTS number smallint;
ALTER TABLE accommodation_rooms DROP CONSTRAINT IF EXISTS accommodation_rooms_number_check;
ALTER TABLE accommodation_rooms ADD CONSTRAINT accommodation_rooms_number_check CHECK (number IS NULL OR number BETWEEN 1 AND 99);

-- Beds held at a place (`DateRent`) are for a group visit, or for the learners of an intensive-course term
-- (`_ID_Session`, made by SchoolMan's „Intensiv" reservation): then which part of the day
-- (`Session._ID_DayTimeReference` 2 Vormittag, 4 Nachmittag, 5 Abend), and never a group. Whom the host
-- takes for them (`DateRent.Comment`: Mädchen/Frau → female, Jungs/Mann → male, egal → any,
-- Betreuer(in) → group_leader); a comment that says more stays the note.
ALTER TABLE accommodation_reservations ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'group_visit';
ALTER TABLE accommodation_reservations ADD COLUMN IF NOT EXISTS course_session text;
ALTER TABLE accommodation_reservations ADD COLUMN IF NOT EXISTS accepts text;
ALTER TABLE accommodation_reservations DROP CONSTRAINT IF EXISTS accommodation_reservations_purpose_check;
ALTER TABLE accommodation_reservations ADD CONSTRAINT accommodation_reservations_purpose_check CHECK (
  purpose IN ('group_visit', 'course_term')
  AND (course_session IS NULL OR course_session IN ('morning', 'afternoon', 'evening'))
  AND (purpose = 'course_term' OR course_session IS NULL)
  AND (purpose = 'group_visit' OR group_visit_id IS NULL)
);
ALTER TABLE accommodation_reservations DROP CONSTRAINT IF EXISTS accommodation_reservations_accepts_check;
ALTER TABLE accommodation_reservations ADD CONSTRAINT accommodation_reservations_accepts_check CHECK (accepts IS NULL OR accepts IN ('female', 'male', 'any', 'group_leader'));

-- The stay a letter is about: a Wohnungsgeberbestätigung (`StatementLandlord._ID_DateAccommodation`)
-- certifies one stay, and a booking can hold two at the same place.
ALTER TABLE letters ADD COLUMN IF NOT EXISTS booking_stay_id uuid REFERENCES booking_stays (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS letters_booking_stay_idx ON letters (booking_stay_id) WHERE booking_stay_id IS NOT NULL;
