-- The school's vocabulary, ported from FileMaker SchoolMan on 2026-09-09.
--
-- Read live from the reference layouts with the shared credential (GET only).
-- These are CASA's own terms — the team already thinks in them, and every row
-- keeps its FileMaker id so the phase-3 import updates instead of duplicating.
-- Applied to real databases, which is right: this is configuration, not
-- placeholder data. See docs/CATALOGUE_AND_PRICING.md.
--
-- Prices are NOT here. They are rates, entered per period; the ones actually
-- recoverable from FileMaker are in db/seeds/0004_rates_from_filemaker.sql.

-- ------------------------------------------------- charge categories
INSERT INTO charge_categories (code, name_en, name_de, position, filemaker_id) VALUES ('course', 'Course', 'Kurskosten', 1, 1)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, position = EXCLUDED.position;
INSERT INTO charge_categories (code, name_en, name_de, position, filemaker_id) VALUES ('culture', 'Culture', 'Kultur und Freizeit', 2, 2)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, position = EXCLUDED.position;
INSERT INTO charge_categories (code, name_en, name_de, position, filemaker_id) VALUES ('accommodation', 'Accommodation', 'Miete | Verpflegung | Pick-up', 3, 3)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, position = EXCLUDED.position;
INSERT INTO charge_categories (code, name_en, name_de, position, filemaker_id) VALUES ('material', 'Books & material', 'buk | Bücher', 4, 4)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, position = EXCLUDED.position;
INSERT INTO charge_categories (code, name_en, name_de, position, filemaker_id) VALUES ('exam', 'Exam', 'Prüfung', 5, 5)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, position = EXCLUDED.position;
INSERT INTO charge_categories (code, name_en, name_de, position, filemaker_id) VALUES ('other', 'Other', 'Anderes', 6, 6)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, position = EXCLUDED.position;

-- ------------------------------------------------------ charge types
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('enrolment_fee', 'course', 'Enrolment fee', 'Einschreibegebühr', 'Einschreibung', false, false, 0, true, 10, 1)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('tuition', 'course', 'Course fee', 'Kurspreis', 'Kurspreis', false, true, 0, true, 20, 2)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('accommodation_rent', 'accommodation', 'Accommodation fee', 'Miete Unterkunft', 'Miete Familie', false, false, 19.0, true, 30, 3)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('extra_nights', 'accommodation', 'Extra nights', 'Zusatznächte', 'Zusatznächte', false, false, 19.0, true, 40, 4)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('breakfast', 'accommodation', 'Breakfast', 'Frühstück', 'Verpflegung FS', false, false, 0, true, 50, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('teaching_material', 'material', 'Teaching material', 'Lehrmaterial', 'Lehrmaterial', false, false, 0, true, 60, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('catering', 'accommodation', 'Catering', 'Verpflegung', 'Verpflegung', false, false, 7.0, true, 70, 8)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('transfer', 'accommodation', 'Transfer', 'Transfer', 'Transfer', false, false, 0, true, 80, 9)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('postage', 'other', 'Postage', 'Verschickungskosten', 'Verschickung', false, false, 0, true, 90, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('exam_fee', 'exam', 'Examination fee', 'Examensgebühr', 'Examen', false, false, 0, true, 100, 11)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('bank_fees', 'other', 'Bank fees', 'Bankgebühren', 'Bankgebühren', false, false, 0, true, 110, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('additional_costs', 'other', 'Additional costs', 'Zusatzkosten', 'Zusatzkosten', false, false, 0, true, 120, 13)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('discount', 'course', 'Discount', 'Ermässigung', 'Ermäßigung', true, false, 0, true, 130, 14)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('refund', 'other', 'Reimboursement', 'Rückzahlung', 'Rückzahlung', true, false, 0, true, 140, 16)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('monitoring', 'course', 'Monitoring', 'Monitoring', 'Monitoring', false, false, 0, true, 150, 17)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('culture_programme', 'culture', 'Culture program', 'Kulturprogramm', 'Kultur', false, false, 0, true, 160, 18)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('books', 'material', 'Books', 'Bücher', 'Bücher', false, false, 19.0, true, 170, 20)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('cancellation', 'course', 'Cancellation', 'Storno', 'Storno', true, false, 0, true, 180, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('accommodation_arrangement', 'accommodation', 'Arrangement accommodation', 'Vermittlung Unterkunft', 'Endreinigung', false, false, 0, false, 190, 23)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('deposit', 'accommodation', 'Deposit', 'Deponat', 'Deponat', false, false, 0, true, 200, 24)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('travel_ticket', 'accommodation', 'Ticket', 'Fahrkarte', 'Fahrkarte', false, false, 0, true, 210, 25)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('copy_flat_fee', 'course', 'Copy flat', 'Kopierpauschale', 'Kopien', false, false, 0, true, 220, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('key_deposit', 'accommodation', 'Key deposit', 'Schlüsselkaution', 'Schlüsselkaution', false, false, 0, false, 230, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('carry_over', 'other', 'Carry over', 'Übertrag', 'Übertrag', false, false, 0, true, 240, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('administrative_charge', 'course', 'Administrative charges', 'Bearbeitungsgebühr', 'Bearbeitung', false, false, 0, true, 250, 31)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('travel_expenses', 'other', 'Travel expenses', 'Fahrkosten', 'Fahrtkosten', false, false, 0, false, 260, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('no_show_fee', 'other', 'cancellation expenses', 'Ausfallgebühr', 'cancel', false, false, 0, false, 270, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('agency_contribution', 'other', 'Contribution to Agency', 'Beitrag Agentur', 'Beitrag Agentur', false, false, 0, false, 280, NULL)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('level_test', 'course', 'Level test', 'Einstufung', NULL, false, false, 0, false, 290, 35)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('internship_placement', 'other', 'Internship', 'Praktikumsvermittlung', 'Praktikumsvermittlung', false, false, 0, false, 300, 361)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('accommodation_placement_fee', 'accommodation', 'Placement fee accommodation', 'Vermittlungsgebühr Unterkunft', 'Vermittlungsgebühr Unterkunft', false, false, 0, true, 310, 37)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;
INSERT INTO charge_types (code, category_code, name_en, name_de, short_de, is_credit, is_commissionable, vat_rate, is_active, position, filemaker_id)
VALUES ('room_rent', 'accommodation', 'Rent room', 'Raummiete', 'Raummiete', false, false, 0, true, 320, 38)
ON CONFLICT (code) DO UPDATE SET category_code = EXCLUDED.category_code, name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_credit = EXCLUDED.is_credit, is_commissionable = EXCLUDED.is_commissionable, vat_rate = EXCLUDED.vat_rate, is_active = EXCLUDED.is_active;

-- ----------------------------------------------- accommodation types
INSERT INTO accommodation_types (code, name_en, name_de, short_de, is_casa_managed, is_bookable, position, filemaker_id)
VALUES ('shared_flat', 'Shared apartment', 'Wohngemeinschaft', 'Wg', false, true, 10, NULL)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_casa_managed = EXCLUDED.is_casa_managed, is_bookable = EXCLUDED.is_bookable;
INSERT INTO accommodation_types (code, name_en, name_de, short_de, is_casa_managed, is_bookable, position, filemaker_id)
VALUES ('with_germans', 'with Germans', 'bei Deutschen', 'bD', false, true, 20, 2)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_casa_managed = EXCLUDED.is_casa_managed, is_bookable = EXCLUDED.is_bookable;
INSERT INTO accommodation_types (code, name_en, name_de, short_de, is_casa_managed, is_bookable, position, filemaker_id)
VALUES ('host_family_children', 'Host Family with children', 'Familie mit Kindern', 'Fam+K', false, false, 30, NULL)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_casa_managed = EXCLUDED.is_casa_managed, is_bookable = EXCLUDED.is_bookable;
INSERT INTO accommodation_types (code, name_en, name_de, short_de, is_casa_managed, is_bookable, position, filemaker_id)
VALUES ('private_apartment', 'Private apartment', 'Apartment', 'Ap.', false, false, 40, NULL)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_casa_managed = EXCLUDED.is_casa_managed, is_bookable = EXCLUDED.is_bookable;
INSERT INTO accommodation_types (code, name_en, name_de, short_de, is_casa_managed, is_bookable, position, filemaker_id)
VALUES ('casa_flat', 'CASA Shared flat', 'CASA – WG', 'WG', true, true, 50, 7)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_casa_managed = EXCLUDED.is_casa_managed, is_bookable = EXCLUDED.is_bookable;
INSERT INTO accommodation_types (code, name_en, name_de, short_de, is_casa_managed, is_bookable, position, filemaker_id)
VALUES ('hotel', 'Hotel', 'Hotel', 'Hotel', false, true, 60, NULL)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de, is_casa_managed = EXCLUDED.is_casa_managed, is_bookable = EXCLUDED.is_bookable;

-- --------------------------------------------------- catering options
INSERT INTO catering_options (code, name_en, name_de, short_de, position, filemaker_id)
VALUES ('cooking_facilities', 'with cooking facilities', 'mit Küchenbenutzung', 'KB', 10, 1)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de;
INSERT INTO catering_options (code, name_en, name_de, short_de, position, filemaker_id)
VALUES ('breakfast', 'breakfast', 'Frühstück', 'Frstk', 20, 2)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de;
INSERT INTO catering_options (code, name_en, name_de, short_de, position, filemaker_id)
VALUES ('half_board', 'half board', 'Halbpension', 'HP', 30, 3)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de;
INSERT INTO catering_options (code, name_en, name_de, short_de, position, filemaker_id)
VALUES ('full_board', 'full board', 'Vollpension', 'VP', 40, 4)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de;
INSERT INTO catering_options (code, name_en, name_de, short_de, position, filemaker_id)
VALUES ('none', 'without catering', 'ohne Verpflegung', 'ohne', 50, 6)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, short_de = EXCLUDED.short_de;

-- ------------------------------------------- accommodation room types
INSERT INTO accommodation_room_types (code, name_en, name_de, short_de, sleeps, position, filemaker_id)
VALUES ('single', 'Single room', 'Einzelzimmer', 'EZ', 1, 10, 1)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, sleeps = EXCLUDED.sleeps;
INSERT INTO accommodation_room_types (code, name_en, name_de, short_de, sleeps, position, filemaker_id)
VALUES ('double', 'Double room', 'Doppelzimmer', 'DZ', 2, 20, 2)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, sleeps = EXCLUDED.sleeps;
INSERT INTO accommodation_room_types (code, name_en, name_de, short_de, sleeps, position, filemaker_id)
VALUES ('triple', '3', '3er Zimmer', '3er', 3, 30, 3)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, sleeps = EXCLUDED.sleeps;
INSERT INTO accommodation_room_types (code, name_en, name_de, short_de, sleeps, position, filemaker_id)
VALUES ('own_bathroom', 'BathExtra', 'Bad extra', 'Bad extra', NULL, 40, 5)
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de, sleeps = EXCLUDED.sleeps;

-- ------------------------------------------------------- day sessions
INSERT INTO day_times (code, name_en, name_de, starts_at, ends_at, position, filemaker_id)
VALUES ('morning', 'morning', 'vormittags', '09:00:00', '12:30:00', 10, 2)
ON CONFLICT (code) DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at;
INSERT INTO day_times (code, name_en, name_de, starts_at, ends_at, position, filemaker_id)
VALUES ('afternoon', 'afternoon', 'nachmittags', '13:00:00', '17:30:00', 20, 4)
ON CONFLICT (code) DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at;
INSERT INTO day_times (code, name_en, name_de, starts_at, ends_at, position, filemaker_id)
VALUES ('evening', 'evening', 'abends', '18:30:00', '20:00:00', 30, 5)
ON CONFLICT (code) DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at;

-- --------------------------------------- levels: CEFR band and colour
UPDATE levels SET cefr_band = 'A1', colour_hex = '#002D99' WHERE code = 'A1.1';
UPDATE levels SET cefr_band = 'A1', colour_hex = '#002D99' WHERE code = 'A1.2';
UPDATE levels SET cefr_band = 'A2', colour_hex = '#519AFF' WHERE code = 'A2.1';
UPDATE levels SET cefr_band = 'A2', colour_hex = '#519AFF' WHERE code = 'A2.2';
UPDATE levels SET cefr_band = 'B1', colour_hex = '#00BAFB' WHERE code = 'B1.1';
UPDATE levels SET cefr_band = 'B1', colour_hex = '#00BAFB' WHERE code = 'B1.2';
UPDATE levels SET cefr_band = 'B1', colour_hex = '#DDEF52' WHERE code = 'B1+';
UPDATE levels SET cefr_band = 'B2', colour_hex = '#FFFBAA' WHERE code = 'B2.1';
UPDATE levels SET cefr_band = 'B2', colour_hex = '#FFFBAA' WHERE code = 'B2.2';
UPDATE levels SET cefr_band = 'C1', colour_hex = '#FFD131' WHERE code = 'C1.1';
UPDATE levels SET cefr_band = 'C1', colour_hex = '#FFD131' WHERE code = 'C1.2';
UPDATE levels SET cefr_band = 'C1', colour_hex = '#FFD131' WHERE code = 'C1.3';

-- ------------------------- course types: the operational facts we lacked
UPDATE course_types SET name_de = 'Intensivkurs', short_code = 'Intensiv', down_payment = 200, filemaker_id = 1 WHERE slug = 'intensive-german';
UPDATE course_types SET name_de = 'Abendkurs', short_code = 'Abend', down_payment = 100, filemaker_id = 2 WHERE slug = 'evening-german';
UPDATE course_types SET name_de = 'Geschlossene Gruppe', short_code = 'Gruppe', down_payment = NULL, filemaker_id = 5 WHERE slug = 'german-for-groups';
UPDATE course_types SET name_de = 'Prüfungsvorbereitung', short_code = 'PrepEx', down_payment = NULL, filemaker_id = 7 WHERE slug = 'exam-preparation';
UPDATE course_types SET name_de = 'Firmenunterricht', short_code = 'Firma', down_payment = NULL, filemaker_id = 10 WHERE slug = 'in-company';
UPDATE course_types SET name_de = 'Spezialkurs', short_code = 'Spezial', down_payment = NULL, filemaker_id = 11 WHERE slug = 'special-courses';

-- ------------------------------------------------ teaching materials
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Aspekte neu B2.1', '978-3-12-605027-2', (SELECT code FROM levels WHERE code = 'B2.1'), 1, false, 11)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Aspekte neu B2.2', '978-3-12-605028-9', (SELECT code FROM levels WHERE code = 'B2.2'), 2, false, 12)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('TestDaf Training 2015', '978-3-930861-60-6', (SELECT code FROM levels WHERE code = 'C1.3'), NULL, true, 22)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Grammatik aktiv B2-C1', '978-3-06-122965-8', (SELECT code FROM levels WHERE code = NULL), NULL, true, 46)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Prüfungstraining telc C1 Hochschule', '978-3-910223-40-0', (SELECT code FROM levels WHERE code = NULL), NULL, true, 53)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Aspekte Junior B2', '978-3-12-605266-5', (SELECT code FROM levels WHERE code = NULL), NULL, false, 62)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Mit Erfolg zum digitalen Test DaF', '978-3-12-676827-6', (SELECT code FROM levels WHERE code = 'C1.3'), NULL, true, 71)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Fokus Deutsch B1/B2', '978-3-06-021305-4', (SELECT code FROM levels WHERE code = 'B2.1'), 3, true, 79)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Grammatik aktiv A1-B1', '978-3-06-122964-1', (SELECT code FROM levels WHERE code = NULL), NULL, true, 80)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('B1+ LAB Teil 1 Hybrid', '978-3-12-605023-4', (SELECT code FROM levels WHERE code = 'B1+'), 1, false, 145)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('B1+ LAB Teil 2 Hybrid', '978-3-12-605033-3', (SELECT code FROM levels WHERE code = 'B1+'), 2, false, 146)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Kontext B1+1', '978-3-12-605407-2', (SELECT code FROM levels WHERE code = 'B1+'), 1, true, 147)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Netzwerk neu A2.1', '978-3-12-607286-1', (SELECT code FROM levels WHERE code = 'A2.1'), 1, true, 148)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Netzwerk neu A2.2', '978-3-12-607287-8', (SELECT code FROM levels WHERE code = 'A2.2'), 2, true, 149)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Netzwerk neu A1.1', '978-3-12-607161-1', (SELECT code FROM levels WHERE code = 'A1.1'), 1, true, 150)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Netzwerk neu A1.2', '978-3-12-607169-7', (SELECT code FROM levels WHERE code = 'A1.2'), 2, true, 151)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Netzwerk neu B1.1', '978-3-12-607290-8', (SELECT code FROM levels WHERE code = 'B1.1'), 1, true, 152)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Netzwerk neu B1.2', '978-3-12-607291-5', (SELECT code FROM levels WHERE code = 'B1.2'), 2, true, 153)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Kontext B1+2', '978-3-12-605408-9', (SELECT code FROM levels WHERE code = 'B1+'), 2, true, 154)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Kontext B2.1', '978-3-12-605411-9', (SELECT code FROM levels WHERE code = 'B2.1'), 1, true, 155)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Kontext B2.2', '978-3-12-605412-6', (SELECT code FROM levels WHERE code = 'B2.2'), 2, true, 156)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Kontext C1.1', '978-3-12-605313-6', (SELECT code FROM levels WHERE code = 'C1.1'), 1, true, 157)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Kontext C1.2', '978-3-12-605348-8', (SELECT code FROM levels WHERE code = 'C1.2'), 2, true, 158)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Aspekte neu B2.2', '978-3-12-605269-6', (SELECT code FROM levels WHERE code = 'B2.2'), 2, false, 159)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Aspekte neu C1.1', '978-3-12-605278-8', (SELECT code FROM levels WHERE code = 'C1.1'), 1, false, 160)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Aspekte neu C1.2', '978-3-12-605279-5', (SELECT code FROM levels WHERE code = 'C1.2'), 2, false, 161)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Real Business English B1', '978-3-12-501672-9', (SELECT code FROM levels WHERE code = NULL), NULL, true, 162)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Real Business English B1', '978-3-12-501671-2', (SELECT code FROM levels WHERE code = NULL), NULL, true, 163)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Klasse! A2 - Deutsch für Jugendliche', '978-3-12-607307-3', (SELECT code FROM levels WHERE code = NULL), NULL, true, 164)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Klasse! A2 - Deutsch für Jugendliche', '978-3-12-607132-1', (SELECT code FROM levels WHERE code = NULL), NULL, true, 165)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Klasse! A2 - Deutsch für Jugendliche', '978-3-12-607137-6', (SELECT code FROM levels WHERE code = NULL), NULL, true, 166)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Grammatik aktiv B1+', '978-3-06-122966-5', (SELECT code FROM levels WHERE code = NULL), NULL, true, 167)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Diagnose? Deutsch! – Fachsprache Medizin', '978-3-9823750-0-7', (SELECT code FROM levels WHERE code = NULL), NULL, true, 168)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Mit Erfolg zu telc Deutsch B2', '978-3-12-676868-9', (SELECT code FROM levels WHERE code = NULL), NULL, true, 169)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Schritte plus Neu 5+6', '978-3-19-341085-6', (SELECT code FROM levels WHERE code = NULL), NULL, true, 170)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
INSERT INTO materials (title, isbn, level_code, part, is_active, filemaker_id)
VALUES ('Einfach zum Studium! Deutsch für den Hochschulzugang C1', '978-3-910223-64-6', (SELECT code FROM levels WHERE code = NULL), NULL, true, 171)
ON CONFLICT (title, isbn) DO UPDATE SET level_code = EXCLUDED.level_code, part = EXCLUDED.part, is_active = EXCLUDED.is_active;
