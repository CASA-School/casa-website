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

## For the bridge

Nothing, until it is decided whether working time belongs in the workspace at all. Teachers' names
and absences for planning are already the workspace's own.

## Open questions

1. Does working time stay in SchoolMan, move to an HR tool, or come here?
2. Staff tax, pension and health-insurance numbers sit on `Person` (`people.md`) — who may see them today?
