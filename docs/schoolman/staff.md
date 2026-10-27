# Staff, working time and holidays

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only. This area
holds personal and HR data; nothing here is meant for the workspace without a decision.

## The tables

| Table | Rows | 2026 (own date) | What a row is |
| --- | ---: | --- | --- |
| `StaffMember` | 82 | 8 new | A teacher or office colleague: login 95%, active as teacher / administration, salary status, level taught |
| `Purview` | 90 | 8 new | What a colleague is responsible for |
| `DateTargetWorkTime` | 313 | 30 new | Contracted hours a week (93%), teaching hours (67%), from–to |
| `WeekDayWorkTime` | 1,329 | 109 new | Target hours per weekday |
| `SingleDayStaff` | 86,664 | 19,471 days in 2026 | **One colleague, one day**: generated for the whole year; absence, illness, holiday, hours |
| `SingleMonthStaff` | 2,810 | — | The monthly time sheet: running balance of work and holidays, approval |
| `SingleYearStaff` | 268 | — | The year: holiday days, overtime carried over |
| `DateHoliday`, `SingleDateHoliday` | 1,094, 8,978 | 231 / 3,103 new | A holiday request and its days |
| `AdminWork` | 14,483 | about 3,000 a year | Admin time on a day, by kind (teaching, administration, correction, material, test, exam …) |
| `SalaryDetail` | 189 | none since 2020 | Salary details — unused |
| `Hades` | 171 | 2 | Staff moved out — the trash (`MakeShadow_StaffMember`, `BackToLife_Hades`) |

## How it is made

The days are generated ahead (`MakeWorkTimeTeacherSingleDay.Once`, `…SingleMonth.Once`); holidays
become one row per day (`SetSingleDateHoliday.*`); admin time is entered per day
(`NewAdminWork_SingleDayStaff`). The monthly time sheet is mailed by `SendEmail.TimeSheet_SingleMonthStaff`
over SMTP — one of the scripts with a stored password. Running balances are stored on the month and
the year (`StaticBalance*`), not summed.

## In the workspace today

`staff_users` (the workspace's own accounts and roles), `teachers` and `teacher_absences`
(Kursplanung). No working time, holidays or pay.

## Who works with it

Teachers approve their month and enter daily adjustments in the **Klassenbuch** (`klassenbuch.md`);
**finance** handles the time sheets and pay (Rahman, 2026-10-15). Everything here moves to the new
system in the end, like the rest of SchoolMan — one module at a time.

## For the bridge

The active staff come across by hand, read-only (2026-10-17): `scripts/filemaker/read_staff.py` piped
into `import-staff.mjs` — person, contact, address, HR numbers, bank accounts, `Purview` roles,
`DateTargetWorkTime` contract periods and `DateValidity` licences (docs/ADMIN_WORKSPACE.md §Staff).
Working time is one of the later modules, and the Klassenbuch already reads and writes the teachers'
side of it. Days off come across for Kursplanung (`read_absences.py`): ill, holiday, and since 2026-10-22
the days marked absent with their kind (`_ID_Absence`, `_ID_AbsenceDetail` — 1 Tarifurlaub, 2 unbezahlter
Urlaub, 3 Abbau Überstunden, 4 Sonderurlaub, 5 Krank, 6 Anderes, 7 off sick; 1,777 days in 2026).

The staff record's internal section („Intern", 2026-10-22, 0083) comes across with the staff import:
active as a teacher (`_ID_ActiveTeacher`, 1 yes, 2 no), the course types taught
(`_ID_CourseTypeReference`: 1 Intensivkurs, 2 Abendkurs, 3 Sommerkurs, 4 Einzelunterricht, 5 Geschlossene
Gruppe, 7 Prüfungsvorbereitung, 9 Juniorkurs, 10 Firmenunterricht, 11 Spezialkurs, 12 Superintensivkurs,
15 Online Kurs, 16 Zusatzkurs), the weekdays (`_ID_WeekDay`, 2 Monday … 6 Friday) and times of day
(`_ID_DayTimeReference`, 2 vormittags, 4 nachmittags, 5 abends), the levels (`_ID_Level`), employed or
freelance (`_ID_StatusEmployee`). SchoolMan keeps one list of weekdays for all times of day, so it gives
the evening days and a new teacher's first rule; a rule the planners set on the colleague's page is
kept (docs/KURSPLANUNG.md §A teacher's planning). `CommentsOnTeacher` is not read into the workspace. The
time sheet's balances come across since 0082 (`read_time.py`: `SingleMonthStaff`, `SingleYearStaff`);
never read `SingleDayStaff`'s `cal_*` fields, which are calculated and held FileMaker for 45 minutes.

## Open questions

1. When working time moves, does the Klassenbuch keep the teachers' side and the workspace finance's?
Decided: staff tax, pension and health-insurance numbers and bank accounts come along with restricted
access — only the people whose work needs them (`people.md`).

## Completeness review (2026-10-27, migration 0092)

Brought across by the bridge (steps `staff` and `time`), seen in the workspace as docs/ADMIN_WORKSPACE.md §Stunden says:

- the levels a teacher teaches (`_ID_Level`: 1 A1 … 5 C1, 3,5 B1+, 7 C1 Hochschule), added to Kursplanung's while
  nobody set the rules by hand; 6 TestDaF is an exam, and 8 SK / 9 ND are not known yet — both left out;
- whether a colleague keeps a time sheet (`_ID_TimeSheet`: 46 yes, 2 no);
- **trainings** (`TrainingStaffMember`, `SingleDateTraining`, `TrainingReference`): 25, of 17 colleagues;
- **leave requests** (`DateHoliday`, `SingleDateHoliday`, `HolidayReference`): 920 requests of the register's colleagues,
  with their kind (Tarifurlaub, Schließzeit, Sonderurlaub …) and the working days approved;
- the **target hours per weekday** of each contract period (`WeekDayWorkTime`): 1,124 rows;
- the **time worked outside the lessons** (`AdminWork`, its kind from `TypeWorkReference`, never the free text
  `TypeWork_1`): 12,062 entries, 155 of them for an exam sitting here;
- the hours carried into a year (`SingleYearStaff.OverhangWorkTime`; the reader had read `OverhangWorkDay`, empty on
  every row) and the day a month was approved (`SingleMonthStaff.DateApproval`).

Not brought, with the reason: `SingleMonthStaff.CommentOnMonth` is SchoolMan's own stamp („<month> <year> <date>
aktualisiert – <account>", all 672); `SingleDayStaff.Adjustment` is the Klassenbuch's correction, which the office's
adoption copies into `AdminWork` (`SetAdjustment.Loop_SingleDayStaff_SingleMonthStaff`; 382 of 443 found there by
day and hours), and its `CommentAdjustment` holds the kind of sick note (`ak`/`pk`/`kk`, 477 days) — health data,
with `IllnessReference` still to be decided; `_ID_LegalHoliday` is the calendar's. The holidays left still count the
days SchoolMan marks as holiday (`SingleDayStaff._ID_Holiday`): over this year and the two before 3,153 of them are
approved request days, while 224 approved days are not marked and 152 marked days have no approved request — which
is right is for finance to say before the count changes. `DateStaffAtWork` stays out (Rahman, 2026-10-26).
`StaffMember.Login` and `MailAccount` hold passwords and are never read.
