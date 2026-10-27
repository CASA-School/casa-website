-- 0092 — People, staff and organisations: what SchoolMan holds and the bridge left behind (2026-10-27).
--
-- Rahman: „map everything properly so every data is transferred properly to our new system." The
-- completeness review of this area sorted every SchoolMan field in use that no reader read. What it
-- found missing is a fact SchoolMan keeps once, at its real source; here it gets a home of its own.
-- The learner facts (passport number, a birth year alone, mother tongue, country of birth) had their
-- columns since 0029 and need none.

-- The mother tongue the bridge once copied from SchoolMan's generated label (`MotherTongue_1`:
-- „011 - Turkish/Türkisch", „000 - other/andere") becomes the language itself, and nothing where it
-- said „other"; the bridge now reads the language's id (`_ID_Mothertongue`).
UPDATE people SET mother_tongue = CASE
    WHEN mother_tongue ~ '^\d{3} - [^/]*/' THEN nullif(btrim(regexp_replace(mother_tongue, '^\d{3} - [^/]*/', '')), 'andere')
    ELSE nullif(btrim(regexp_replace(mother_tongue, '^\d{3} - ', '')), '')
  END
 WHERE mother_tongue ~ '^\d{3} - ';

-- A bank account's two addresses, for a transfer abroad (`BankAccount.AddressAccountOwner`,
-- `AddressBank`), and an organisation's own account (`BankAccount._ID_Management` with no person: an
-- agency's, a company's). An account belongs to a person or to an organisation, never both.
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS holder_address text,
  ADD COLUMN IF NOT EXISTS bank_address text,
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations (id) ON DELETE CASCADE;
ALTER TABLE bank_accounts ALTER COLUMN person_id DROP NOT NULL;
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_owner_check;
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_owner_check CHECK (num_nonnulls(person_id, organisation_id) = 1);
CREATE INDEX IF NOT EXISTS bank_accounts_organisation_idx ON bank_accounts (organisation_id) WHERE organisation_id IS NOT NULL;

-- A note on an e-mail address (`Email.CommentUseMail`): a person's on the address, an organisation's on
-- its own address.
ALTER TABLE emails ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS email_note text;

-- Who the main contact at an organisation is (`Management._ID_ContactPerson`; before 2023
-- `Agency._ID_ContactAgent`, `Corporate._ID_Contact_Person`). One at most.
ALTER TABLE organisation_contacts ADD COLUMN IF NOT EXISTS is_main boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS organisation_contacts_main_key ON organisation_contacts (organisation_id) WHERE is_main;

-- A company that commissions courses (SchoolMan's `Contractor`, „Auftraggeber": a university, a
-- training provider). `contractor` stays what 0061 made it, a builder („Handwerk und Umbau").
ALTER TABLE organisations DROP CONSTRAINT IF EXISTS organisations_relation_check;
ALTER TABLE organisations ADD CONSTRAINT organisations_relation_check CHECK (
  relation IS NULL OR relation IN ('internship', 'multiplier', 'activity', 'supplier', 'health_insurer', 'tandem_school', 'contractor', 'association', 'publisher',
                                   'commissioning_body')
);

-- Whether a colleague keeps a time sheet (`StaffMember._ID_TimeSheet`: SchoolMan's nightly balance runs
-- only for those who do). Unknown is null.
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS keeps_time_sheet boolean;

-- The time sheet's remaining facts: the hours carried into a year (`SingleYearStaff.OverhangWorkTime`) and
-- the day a month was approved (`SingleMonthStaff.DateApproval`). The month's „comment" is not one: SchoolMan's
-- balance script writes „<month> <year> <date> aktualisiert – <account>" into it, on all 672 that have one.
ALTER TABLE staff_time_years ADD COLUMN IF NOT EXISTS carried_hours numeric(8, 2);
ALTER TABLE staff_time_months ADD COLUMN IF NOT EXISTS approved_on date;

-- The target hours per weekday within a contract period (`WeekDayWorkTime`, the period its
-- `DateTargetWorkTime`'s): where reception's real week lives. ISO weekdays, 1 Monday.
CREATE TABLE IF NOT EXISTS staff_target_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  valid_from date,
  valid_to date,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  hours numeric(4, 2) CHECK (hours BETWEEN 0 AND 24),
  starts_at time,
  ends_at time,
  break_minutes smallint CHECK (break_minutes >= 0),
  filemaker_id text UNIQUE,
  CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS staff_target_days_member_idx ON staff_target_days (staff_member_id, valid_from);

-- Time worked outside the lessons, per colleague and day (`AdminWork`): its kind (`TypeWorkReference`;
-- never `TypeWork_1`, a free text that holds personal notes), the hours or the time from–to, a comment,
-- the exam or course it was for. A teacher's correction of a day (`SingleDayStaff.Adjustment`, from the
-- Klassenbuch) becomes one of these when the office adopts it; it is not kept twice.
CREATE TABLE IF NOT EXISTS staff_work_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  on_date date NOT NULL,
  kind text CHECK (kind IN ('teaching', 'administration', 'correction', 'material', 'placement', 'exam', 'short_time', 'compensation')),
  hours numeric(5, 2),
  starts_at time,
  ends_at time,
  note text,
  exam_session_id uuid REFERENCES exam_sessions (id) ON DELETE SET NULL,
  course_id uuid REFERENCES courses (id) ON DELETE SET NULL,
  filemaker_id text UNIQUE
);
CREATE INDEX IF NOT EXISTS staff_work_entries_member_idx ON staff_work_entries (staff_member_id, on_date);

-- A leave request (`DateHoliday`) with its kind (`HolidayReference`: Tarifurlaub, Sonderurlaub,
-- unbezahlter Urlaub, Ausgleich Überstunden, Schließzeit, Mutterschaft, Elternzeit), from–to, its working
-- days and those approved (`SingleDateHoliday`, approved by hand one day at a time). The days marked away
-- for Kursplanung stay `staff_absences`; this is the request, with `staff_private`.
CREATE TABLE IF NOT EXISTS staff_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  kind text CHECK (kind IN ('holiday', 'special', 'unpaid', 'overtime', 'closure', 'maternity', 'parental')),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  days date[] NOT NULL DEFAULT '{}',
  approved_days date[] NOT NULL DEFAULT '{}',
  note text,
  filemaker_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (ends_on >= starts_on),
  CHECK (approved_days <@ days)
);
CREATE INDEX IF NOT EXISTS staff_leave_requests_member_idx ON staff_leave_requests (staff_member_id, starts_on);

-- A colleague's training (`TrainingStaffMember`, its session `SingleDateTraining`, its kind
-- `TrainingReference`: Didaktik, Prüferschulung, EDV, Ersthelfer, Datenschutz, Brandschutz,
-- Qualitätsmanagement), which SchoolMan started keeping in 2026.
CREATE TABLE IF NOT EXISTS staff_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members (id) ON DELETE CASCADE,
  kind text CHECK (kind IN ('didactics', 'examiner', 'it', 'first_aid', 'data_protection', 'fire_safety', 'quality')),
  title text,
  on_date date,
  starts_at time,
  ends_at time,
  filemaker_id text UNIQUE
);
CREATE INDEX IF NOT EXISTS staff_trainings_member_idx ON staff_trainings (staff_member_id, on_date);
