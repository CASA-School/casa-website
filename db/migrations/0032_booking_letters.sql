-- Letters for bookings and the waiting list (Rahman, 2026-10-16; docs/LETTERS.md).
--
-- SchoolMan's most written letters after offers: the booking confirmation, the receipt of a
-- payment (Empfangsbestätigung), and the waiting list's three — you are on the list, a place is
-- free, no place this time (443 of those in 2026). In SchoolMan each is a text a script writes once
-- into `Letter` and the team edits; the receipt's script also changes the booking while writing.
-- Here, as for offers, a letter is built from its record and kept exactly as it went out, and the
-- record it is about is one foreign key.

ALTER TABLE letters
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS waitlist_entry_id uuid REFERENCES waitlist_entries (id) ON DELETE RESTRICT;

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_kind_check;
ALTER TABLE letters ADD CONSTRAINT letters_kind_check CHECK (kind IN (
  'offer', 'booking_confirmation', 'payment_receipt', 'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place'
));

-- Exactly one record per letter, the one its kind names.
ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_subject_check;
ALTER TABLE letters ADD CONSTRAINT letters_subject_check CHECK (
  (kind = 'offer') = (offer_id IS NOT NULL)
  AND (kind IN ('booking_confirmation', 'payment_receipt')) = (booking_id IS NOT NULL)
  AND (kind IN ('waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place')) = (waitlist_entry_id IS NOT NULL)
);

-- A booking's second confirmation (after a change) is its version 2.
CREATE UNIQUE INDEX IF NOT EXISTS letters_booking_version_key ON letters (booking_id, kind, version) WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS letters_waitlist_version_key ON letters (waitlist_entry_id, kind, version) WHERE waitlist_entry_id IS NOT NULL;

ALTER TABLE letter_texts DROP CONSTRAINT IF EXISTS letter_texts_kind_check;
ALTER TABLE letter_texts ADD CONSTRAINT letter_texts_kind_check CHECK (kind IN (
  'offer', 'booking_confirmation', 'payment_receipt', 'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place'
));
