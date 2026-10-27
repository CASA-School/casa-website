-- 0094 — Money, letters and history: the SchoolMan facts the completeness review found missing (2026-10-27;
-- docs/schoolman/money.md, docs/schoolman/letters-and-history.md, docs/schoolman/bridge-gaps.md).
--
-- Rahman: „Map everything properly so every data is transferred properly to our new system." Each column
-- below is a fact SchoolMan holds on its own record and the bridge did not read; none is a copy of
-- another record's value. Costs and payments stay separate lines; a link between them is a link, never a sum.

-- A payment: the charge it settles (`PaymentIn._ID_CostDetail`), the instalment it paid
-- (`PaymentIn._ID_Instalment`) and the colleague who booked it (`PaymentIn._ID_StaffSchool`, an office
-- account that names a colleague of the register). `recorded_by` stays the workspace account that
-- recorded a payment here.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS charge_id uuid REFERENCES booking_charges (id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS instalment_id uuid REFERENCES booking_instalments (id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by_staff_id uuid REFERENCES staff_members (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS payments_charge_idx ON payments (charge_id) WHERE charge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_instalment_idx ON payments (instalment_id) WHERE instalment_id IS NOT NULL;

-- A charge: the book a book line is for (`CostDetail._ID_BookReference`), and whether it is one of a
-- reversal pair — the line reversed and its „Storno" copy below zero (`_ID_CancellationSet`, the
-- sub-label „Storno"). The pair stays two lines; the booking page shows them as one, cancelled.
ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES materials (id) ON DELETE SET NULL;
ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS reversed boolean NOT NULL DEFAULT false;

-- Rent paid to a host: the days it covers (`PaymentOut.ZStartDate`/`ZEndDate`, typed on the payout).
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS period_start date;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS period_end date;
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_period_check;
ALTER TABLE payouts ADD CONSTRAINT payouts_period_check CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start);

-- An invoice whose number was cancelled (`Invoice._ID_Reversal`), the offer it was made from and the group
-- visit it is for.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled boolean NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES offers (id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS group_visit_id uuid REFERENCES group_visits (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS invoices_organisation_idx ON invoices (organisation_id) WHERE organisation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS invoices_offer_idx ON invoices (offer_id) WHERE offer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS invoices_group_visit_idx ON invoices (group_visit_id) WHERE group_visit_id IS NOT NULL;

-- Every booking a letter names. SchoolMan keeps a list in `Letter._ID_Booking`: a confirmation or a visa
-- letter for several bookings of one learner, or a letter to a whole course (a room change, the course
-- start, an exam invitation) with every learner's booking. One letter, shown on each booking it names;
-- `letters.booking_id` stays the first, for the checks that ask for one.
CREATE TABLE IF NOT EXISTS letter_bookings (
  letter_id uuid NOT NULL REFERENCES letters (id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  PRIMARY KEY (letter_id, booking_id)
);
CREATE INDEX IF NOT EXISTS letter_bookings_booking_idx ON letter_bookings (booking_id);

-- The invoice a letter is (or cancels, or acknowledges a payment of): `Letter._ID_SerialNumberInvoice`.
ALTER TABLE letters ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS letters_invoice_idx ON letters (invoice_id) WHERE invoice_id IS NOT NULL;

-- A certificate of participation sent from SchoolMan as a PDF (`WorkFlowLetter._ID_CertificateDone`): no
-- `Letter` row exists for it, so it is a letter of its booking with only its day and how it went.
-- A SchoolMan letter to a whole course has no one learner: its first booking holds it.
ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_kind_check;
ALTER TABLE letters ADD CONSTRAINT letters_kind_check CHECK (kind IN (
  'offer', 'booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
  'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation', 'exam_confirmation',
  'exam_invitation', 'exam_results', 'exam_participation', 'waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place',
  'learner_confirmation', 'registration_test_request', 'registration_deposit_request', 'registration_later_course', 'participation_certificate',
  'schoolman'
));

ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_subject_check;
ALTER TABLE letters ADD CONSTRAINT letters_subject_check CHECK (
  ((kind = 'offer') = (offer_id IS NOT NULL))
  AND ((kind = 'schoolman') OR ((kind = ANY (ARRAY['booking_confirmation', 'payment_receipt', 'visa_letter', 'showup_first_call', 'showup_last_call', 'missing_items',
       'payment_reminder', 'payments_overview', 'course_start', 'enrolment_certificate', 'cancellation_confirmation', 'exam_confirmation', 'exam_invitation',
       'exam_results', 'exam_participation', 'participation_certificate'])) = (booking_id IS NOT NULL)))
  AND ((kind = ANY (ARRAY['waitlist_confirmation', 'waitlist_place_free', 'waitlist_no_place'])) = (waitlist_entry_id IS NOT NULL))
  AND ((kind = ANY (ARRAY['registration_test_request', 'registration_deposit_request', 'registration_later_course'])) = (registration_id IS NOT NULL))
  AND ((kind <> 'learner_confirmation') OR (person_id IS NOT NULL))
  AND ((kind <> 'schoolman') OR (person_id IS NOT NULL) OR (accommodation_id IS NOT NULL) OR (booking_id IS NOT NULL))
);

-- The kind of a line of SchoolMan's history (`WorkFlow._ID_ProcessReference`, its vocabulary
-- `ProcessReference`): accounting, learning progress, accommodation … A line keeps the code in
-- `staff_activity.detail.process`. „Anfrage" (0) is used on every intake line and missing from
-- SchoolMan's own list; a process SchoolMan adds later comes across with its own names.
CREATE TABLE IF NOT EXISTS history_processes (
  code text PRIMARY KEY,
  name_de text NOT NULL,
  name_en text NOT NULL,
  position smallint NOT NULL DEFAULT 100,
  filemaker_id integer UNIQUE
);
INSERT INTO history_processes (code, name_de, name_en, position, filemaker_id) VALUES
  ('intake', 'Anfrage', 'Enquiry', 1, 0),
  ('accounting', 'Buchhaltung', 'Accounting', 2, 1),
  ('learning', 'Lernentwicklung', 'Learning progress', 3, 2),
  ('accommodation', 'Unterkunft', 'Accommodation', 4, 3),
  ('appointment', 'Tagestermin', 'Appointment', 5, 4),
  ('course_planning', 'Kursplanung', 'Course planning', 6, 5),
  ('course_info', 'Kursinfo', 'Course information', 7, 6),
  ('internship', 'Praktikum', 'Internship', 8, 7),
  ('office_talk', 'Bürogespräch', 'Office talk', 9, 8),
  ('order', 'Bestellung', 'Order', 10, 9),
  ('maintenance', 'Wartung', 'Maintenance', 11, 10),
  ('database', 'Datenbank', 'Database', 12, 11),
  ('exam', 'Prüfung', 'Exam', 13, 12),
  ('hr', 'Personal', 'Staff matters', 14, 13),
  ('uo', 'uO', 'uO', 15, 14)
ON CONFLICT (code) DO NOTHING;

-- Notes on a course (`Comment._ID_Course`): a class's notes, on its course page.
ALTER TABLE staff_notes DROP CONSTRAINT IF EXISTS staff_notes_entity_check;
ALTER TABLE staff_notes ADD CONSTRAINT staff_notes_entity_check CHECK (
  entity = ANY (ARRAY['enquiry', 'course_registration', 'exam_registration', 'career_application', 'placement_attempt', 'booking', 'person', 'offer', 'group_visit',
                      'accommodation', 'organisation', 'course'])
);
