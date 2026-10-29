-- A saved registration must remain visible for follow-up if delivery is interrupted.
ALTER TABLE record_flags DROP CONSTRAINT IF EXISTS record_flags_code_check;
ALTER TABLE record_flags ADD CONSTRAINT record_flags_code_check CHECK (code IN (
  'duplicate_candidate', 'nationality_unmatched', 'level_unmatched',
  'birth_date_unparsed', 'person_unlinked', 'cohort_withdrawn', 'period_without_cohort',
  'registration_staff_notice_unconfirmed', 'registration_receipt_unconfirmed'
));
