# Workspace mapping review: what the sync misses or reads wrongly — 2026-10-26

Answer to the website session's request. Read-only; nothing in SchoolMan was changed.

**Sources:**
- full field definitions of the 67 tables from the server's design export of 26.10 (auto-enter type, stored or unstored, formula);
- all 1,360 scripts (export 29.09, `casa-schoolman-scripts/scripts`), parsed for data writes (find-mode `Set Field` excluded), record creation and deletion;
- counts read from SchoolMan on 26.10 (non-empty values overall, and for records created before vs. since 2025);
- the server's access log for what runs at night.

Field names, counts and script names only, no personal data. Points already in `bridge-gaps.md` are not repeated.

---

## 1. Most important: the night jobs mark thousands of records as "changed" every night

Every listed change field is an auto-enter modification value, and no script sets one directly (checked: zero `Set Field` on any of them). But FileMaker moves a modification stamp whenever a script writes **any** field, even with the same value. The server's night jobs do that on a large scale. Measured for the night of 25./26.10:

| Table | Change field | Records "changed" by the night run | Job and time | What is really written |
|---|---|---|---|---|
| **Person** | TimestampChange | **15,482 of 15,539** (all) | `ActualizeBirthDay_Person`, 00:07: **Show All Records, then Replace Field Contents** | `DateOfBirth` with itself, three search fields |
| **Booking** | TimeStampOfChange | 924 | `SetScheduleBooking_OnServer` 00:00 and `ActualizeIDEnrolmentDone_Booking` 00:25 | schedule texts, `ZStartDate`/`ZEndDate`, about 20 stored `cal_*` copies, `_ID_StatusStudent`, `_ID_Editable`, first/last booking |
| **SingleDateStudent** | TimeStampOfChange | 468, all newly created | `MakeSingleDateStudent`, 00:45 | creates today's attendance rows (§3) |
| **DateAccommodation** | TimeStampOfChange | 121 | `ActualizeBirthDay_Person`, `ActualizeIDEnrolmentDone_Booking` | search fields, `_ID_StatusAccommodation` |
| **DateBooking** | DateOfChange (date only) | 1,319 "today" | the same two | names, search fields, `_ID_EnrolmentDone` |
| **Corporate, Agency, Accommodation, StaffMember** | DateOfChange (date only) | **all records, every day** (790/790, 121/121, 141/142, 82/82) | `SetSearchFieldInstitution…_OnServer` | display and search names |
| **Course** | DateOfChange (date only) | 165 "today" | `SetScheduleCourse_OnServer` 00:20, `DeactivatePastCourse_Course` 00:25 | schedule texts, `_ID_Active`, `_ID_Bookable` |

**Consequences for the poller:**
- "Changed today" on the date-only tables returns every Corporate, Agency, Accommodation and StaffMember record every day.
- Person returns all 15.5k at about 00:07.
- Fingerprinting (as planned) is the right answer. Build the fingerprint only from the fields you read: Person's night writes touch `DateOfBirth` (same value) and search fields you don't read, so the fingerprint stays equal.
- Expect the wave between 00:00 and 01:05. A pass after 02:00 sees it settled.

## 2. Change fields that don't work as listed

| Table | Listed | Problem | Use instead |
|---|---|---|---|
| **Group** | `TimeStampOfChange` | It is a **creation** timestamp (auto-enter CreationTimestamp). It never moves on an edit. | `DateOfChange` (ModificationDate) |
| **SingleMonthStaff** | `TimeStampOfChange` | No auto-enter; **empty in all 2,810 rows** | `DateOfChange` (ModificationDate) |
| **WeekDay** | `DateOfChange` | A Timestamp field with no auto-enter; **empty in all 11,838 rows** | none. Treat WeekDay like the "no change field" tables (§7). |
| Commission, CostDetailSample, Instalment, ServiceDetail, ServiceDetailReference, ServiceDetailSpecificationReference | `DateOfChange`, listed as a date | These are **Timestamp** fields (ModificationTimestamp) | poll them to the second |

All other change fields are correct: real ModificationTimestamp (25 tables) or ModificationDate (the date-only ones).

## 3. Attendance: what `SingleDateStudent` really means

- **`MakeSingleDateStudent` (00:45 nightly)** creates the attendance rows **only for today's lessons**, not ahead.
- Every new row gets **`_ID_Presence = 1`**. So "present" means "not marked otherwise", not "confirmed present". Since 2025: 70,633 of 70,633 rows have `_ID_Presence`; `_ID_Absence` is set on 670, `_ID_Excuse` on 1,966, `_ID_IllnessDetail` on 448.
- **`Comment`** is written by the same job with a **system text** ("hat heute Geburtstag" / "hat morgen Geburtstag"). The 924 non-empty comments since 2025 mix these auto texts with teachers' notes. Filter the two fixed texts, or treat them as system notes.
- **`ZSingleDateStudent`** is a **lookup**: the lesson date copied when the row is made. **`NumberLesson`** is an auto-enter copy from `WeekDay`. Both are snapshots (§4).
- Rows not created by the job (exam rows, `NewSingleDateStudent.Loop_Booking`, `MakeOneSingleDateStudent.*`) follow other scripts with the same fields.

## 4. Listed fields that are copies of another table's value (stale by design)

These are stored fields filled by an **auto-enter formula over a related record** (or a lookup). FileMaker fills them when the record is created, or when a field *of the same record* changes. **When the source changes, the copy stays old, and the record's change field does not move.** Read the source (ID plus reference table) instead of the copy.

| Field(s) | Copies | Read instead |
|---|---|---|
| `Course::ZStartDate`, `ZEndDate` | `DateCourse` dates | `DateCourse` (not synced; see §8). Of 1,337 courses: 4 have empty Course dates, 3 differ from every period, 20 have more than one period. |
| `Course::LevelShort`, `LevelShown` | level reference | the level ID and reference table |
| `Commission::CostGross`, `Percentage`, `Commission`, `_ID_Agency`, `_ID_Booking`, `_ID_Corporate`, `_ID_PaymentCommission`, `CostDetail_1` | the CostDetail, Booking, Agency or CommissionDetail at creation | the CostDetail and Booking themselves. A commission does not follow a later price change. |
| `Person::Gender_1`, `CountryBirth_1`, `MotherTongue_1` | reference labels | `_ID_GenderReference` (listed), plus the country and language IDs (not listed; add them) |
| `PaymentIn::CostDetailReference_1`, `MethodPayment_1`; `PaymentOut::MethodPayment_1`, `PaymentOutDetailReference_1` | reference labels | the IDs. Example: `PaymentIn::_ID_CostDetailReference` is filled on 51,134 payments, the label copy only on 43,937. **The ID is not in the list.** |
| `CostDetail::CostDetail_1`, `CostDetailComment_1`; `CostDetailSample::CostDetail_1/_2`; `ServiceDetail::ServiceDetail_1`, `ServiceDetailComment_1`; `Complaint::ComplaintReference_1`; `TestStudent::TestReference`, `LevelShort`; `SingleDateActivity::Activity_1`; `AnimalAtHome::Animal_1`; `Address::ZCountry_1`; `Agreement::LengthDuration`, `Recommendation` | reference labels | the IDs and reference tables |
| `OrderDetail::CostNetUnit`, `OrderDetail_OneLine` | the book reference at order time | fine as a historical price; know that it's a snapshot |
| `Purview::Z_StartDate`, `Z_EndDate` | `DateTargetWorkTime` dates | `DateTargetWorkTime` (listed) |
| `SingleDateCourse::NumberLesson`, `SingleDateStudent::NumberLesson` | `WeekDay::NumberLesson` | as a snapshot of the plan at creation, fine |
| `DayTime::HourStart`, `HourEnd` | the time-of-day default, only once at creation | fine. The real course times are on `WeekDay`; DayTime holds the default unless edited (see the Duplicate fix of 19.10.). |
| Lookups: `BankAccount::BankName`, `Order::Email`, `SingleDateActivity::ZSingleDate`, `SingleDateStudent::ZSingleDateStudent` | value at lookup time | snapshots |

Some listed fields have their auto-enter **commented out** (`/* … */`), so they are now plain fields filled by scripts or by hand: `SingleDateCourse::HourStart`, `HourEnd`, `_ID_Classroom`, `_ID_StaffMember`; `SingleDateOccupancy::_ID_Classroom`; `DateRent::ZStartDate`, `ZEndDate`, `DescriptionRent.Short`; `StaffMember::SearchFieldTeacherSurName`, `TeacherFirstName.Surname.Short`; `StatementLandlord::HeaderLandlord`, `UserName`; `Instalment::InstalmentDetail_1`; `WaitingRoom::_ID_Course`; `Agreement::TypeAgreement_1`. Several of these were abandoned when the formula was disabled (§6).

## 5. Unstored calculations in the list, and fields the night jobs overwrite

**Unstored calculations over related records.** Their value changes without the record's own change field moving:
- **`Exam::Exam.ZSingleDate_OneLine`**: exam reference plus `SingleDateExam::ZSingleDate`. `SingleDateExam` (270 rows) is not synced, so an exam date change is invisible. Sync `SingleDateExam`, or recompute.
- **`SingleYearStaff::RemainingHoliday`**: entitlement minus the sum of `SingleDayStaff` holiday flags plus carry-over.
  - It depends on a **global field (the year selected in the session)**, so it is only right for that year.
  - In the 12.10. review it disagreed with the time sheet's own holiday balance for 21 of 47 staff.
  - Don't sync it. Compute it from `SingleDateHoliday` (status 1) and `SingleYearStaff::NumberDayHolidayYear` plus carry-over.

**Listed fields the night jobs overwrite.** Their value means "as of the last night run":
- `Course::_ID_Active` and `_ID_Bookable`: recomputed from the dates by `SetScheduleCourse_OnServer`; `DeactivatePastCourse_Course` sets `_ID_Active` off after the end. A course becomes inactive the night after it ends, not at the end.
- `StaffMember::SearchFieldTeacherFirstName`, `SearchFieldTeacherSurName`, `Accommodation::SearchfieldAccommodation.Institution` and `Agency::InstitutionAgency`: display strings rebuilt every night. A name changed during the day shows the old text until the next night. Read names from `Person` / `Institution`.
- `Person::DateOfBirth`: rewritten with its own value every night (only the timestamp effect, §1).

**Staff fields whose meaning differs from the name** (from the 12.10. timesheet and holiday review):
- **`SingleDayStaff::_ID_Holiday`** is not a reliable holiday marker. 197 approved holiday days are not flagged, and 127 flagged days have no holiday request. The source of truth is `SingleDateHoliday` with `_ID_StatusHoliday = 1` (not synced). The flag only counts when it is exactly 1.
- **`SingleDayStaff::HourStart`, `HourEnd`** can be **pre-filled with the target** by `SetTargetDefault` (11 of 53 staff show it). They are not worked time. Worked time is `AdminWork` entries (not synced) plus lessons × 1.5.
- **`SingleMonthStaff::StaticBalance*`** and **`SingleYearStaff::StaticBalanceWorkRunning`** are **stored snapshots** written by the `SetBalanceRunning*` scripts, not live sums.
  - The server variant does not finalise December in January.
  - The manual `.Once` variant resets the running total each month.
  - They can contradict a fresh sum.

## 6. Listed fields that are abandoned or never filled

**Abandoned:** filled before 2025, empty since 2025 (since-2025 count in brackets).

| Field | Before 2025 | Since 2025 | Newer source |
|---|---|---|---|
| `PaymentOut::_ID_Accommodation` | 1,293 of 3,476 | 0 of 2,993 | `PaymentOut::_ID_DateAccommodation` (1,159 since 2025) |
| `PaymentOut::PaymentOutComment_1` | 1,164 | 0 | `PaymentOut::Comment` (1,514 since 2025) |
| `Invoice::Amount` | 236 of 893 | 8 of 443 | sum of the `CostDetail` rows with the invoice's `_ID_SerialNumberInvoice` (721 cost rows since 2025) |
| `WaitingRoom::_ID_Course` | 401 of 885 | 0 of 1,078 | `_ID_PreBooking` → `PreBooking` (auto-enter disabled) |
| `Agency::_ID_Institution` | 92 of 111 | 0 of 10 | new agencies are not linked to an Institution |
| `Corporate::HeaderCorporate.Text` | 353 of 703 | 0 of 87 | — |
| `DateRent::DescriptionRent.Short` | 195 of 296 | 0 of 251 | — (auto-enter disabled) |
| `StatementLandlord::UserName` | 188 of 490 | 0 of 278 | — (auto-enter disabled) |
| `Accommodation::DescriptionAccommodation_1/_2`, `_ID_AccommodationTypeOffer`, `_ID_Pet` | 36 / 27 / 60 / 26 of 104 | 0 of 38 | — |
| `Purview::_ID_Active` | 26 of 73 | 0 of 17 | — |
| `Complaint::ComplaintReference_1` | 8 of 10 | 0 of 13 | — |
| `SingleDateActivity::HourStart`, `_ID_ActivityReference` | 7 / 22 of 26 | 0 of 5 | — |

**Never filled (0 rows), safe to drop from the layouts:**
- `Address::HouseNumber`
- `Agreement::AgreementComment_1`, `Agreement_3`, `Agreement_4`, `Agreement_5`, `TypeAgreement_1`
- `Comment::Comment_2`, `Subject`
- `CommissionDetail::_ID_Booking`
- `Complaint::CommentNote`, `Complaint_2`
- `DateRent::_ID_Room`
- `Editorial::InstitutionEditorial`
- `PaymentOut::DatePaymentOut`
- `Phone::AreaCode`
- `SingleMonthStaff::TimeStampOfChange`
- `StatementLandlord::FreeField`, `Subject`
- `WeekDay::DateOfChange`
- `WorkFlow::CommentWorkflow`

**Under 1 % filled** (keep only if you need them): `Person::NumberAgeInsurance` 86, `NumberHealthInsurance` 41, `NumberTaxe` 86, `ZSurName2` 34, `_ID_Agency` 151 (of 15,539); `WorkFlow::FollowUp` 116, `HourEnd` 323, `_ID_Group` 52, `_ID_Offer` 32 (of 110k); `SingleDateCourse::_ID_Holiday` 21 (of 34k).

`Letter::FreeField` could not be read through Apple events (probably a container or very long text); check it on the layout.

## 7. Tables without a change field: how to detect changes

| Table | Rows | Changes after creation? | Suggestion |
|---|---|---|---|
| **Letter** | 33,670 | **Yes.** `SendEmail.Parameter_Letter`, `SendEmail.SMTPLoop_Letter` set `Date_LetterSent`, `_ID_LetterSent`, `_ID_EmailSent` later; 150+ scripts write `Subject`/`FreeField` after `New Record`. | new keys above the last one, plus re-read letters **created in the last 14 days** on each pass; nightly full read |
| **WorkFlowLetter** | 19,431 | **Yes.** `SendCertificatePDF.*`, `SendInvoice_Invoice`, `SendEmail_LetterServices` set `_ID_EmailSent` and `FormCommunication` after creation. | the same window (key `DateOfCreation` is a CreationTimestamp) |
| **Order / OrderDetail** | 506 / 2,139 | Order: `_ID_OrderDone` set by `MakeBookOrder*` | small: full read each hour |
| **StatementLandlord** | 768 | rarely (write-once statements) | new keys; nightly full read |
| **DateValidity** | 50 | dates edited by hand | full read each pass (tiny) |
| **Flag** | 206 | countries reference, essentially static | nightly |
| **WeekDay** | 11,838 | edited by course planning (`SetWeekDay_Course`, `DuplicateCourse_Course`, by hand) | re-read the WeekDay rows of courses whose `Course` or `SingleDateCourse` changed, plus nightly |

**Cleaner long-term option (a design change, needs Rahman's go):** add one stored `ModificationTimestamp` field to these 8 tables, and to the date-only tables where seconds matter. It costs nothing at runtime and touches no script. It would still move with the night jobs (§1).

## 8. Fields and tables staff use that the list does not bring across

Not in `bridge-gaps.md` or the study pages (counts = non-empty overall; since 2025 where it matters):

**Links that are missing** (the list mostly keeps `_ID_Booking` / `_ID_Person`, but staff and scripts also link by these):

| Table | Field | Filled |
|---|---|---|
| Letter | `_ID_Student` | 28,192 / 33,670 |
| Letter | `_ID_Course` | 12,537 |
| Letter | `_ID_LetterSent` (posted) | 29,051 |
| Letter | `_ID_EmailSent` (emailed) | 28,829 |
| Letter | `Provenience` (which screen made it) | 28,187 |
| Letter | `_ID_PreBooking` | 2,509 |
| Letter | `_ID_WaitingRoom` | 1,211 |
| Letter | `_ID_DateAccommodation` | 1,410 |
| Letter | `_ID_Accommodation` | 1,394 |
| WorkFlow (history) | `_ID_Student` | 93,617 (39,427 of 45,646 since 2025) |
| WorkFlow | `_ID_Course` | 63,848 |
| WorkFlow | `_ID_History` | 62,759 |
| WorkFlow | `_ID_Corporate` | 13,097 |
| WorkFlow | `_ID_DateAccommodation` | 2,710 |
| WorkFlow | `_ID_Management` | 1,506 |
| WorkFlow | `_ID_SerialNumberInvoice` | 465 |
| WorkFlowLetter | `_ID_Booking` | 17,789 / 19,431 |
| WorkFlowLetter | `_ID_Person` | 18,288 |
| WorkFlowLetter | `_ID_Student` | 16,715 |
| WorkFlowLetter | `Email` | 14,035 |
| WorkFlowLetter | `_ID_EmailSent` / `_ID_CertificateDone` (certificates sent) | 2,058 |
| CostDetail | `_ID_Person` | 76,542 |
| CostDetail | `_ID_Student` | 56,727 |
| CostDetail | `_ID_Course` | 48,402 |
| CostDetail | `_ID_CostDetailSet` | 23,902 |
| CostDetail | `_ID_CourseTypeReference` | 21,790 |
| CostDetail | `_ID_Level` | 13,605 |
| CostDetail | `_ID_Corporate` | 7,550 |
| PaymentIn | `_ID_CostDetailReference` | 51,134 (only the label copy is listed) |
| PaymentIn | `_ID_Person` | 48,484 |
| PaymentIn | `_ID_Course` | 29,146 |
| PaymentIn | `_ID_Corporate` | 4,433 |
| PaymentIn | `_ID_Agency` | 1,667 |
| PaymentOut | `_ID_BalanceCount` | 5,775, all 2,993 since 2025 |
| PaymentOut | `_ID_CostDetailReference` | 5,138 |
| PaymentOut | `_ID_Course` | 5,125 |
| Invoice | `_ID_Student` | 935 |
| Invoice | `_ID_Address` | 614 (433 of 443 since 2025) |
| Invoice | `_ID_Email` | 570 |
| Invoice | `_ID_Institution` | 214 |
| Invoice | `_ID_Management` | 228 |
| Offer | `_ID_Institution` | 176 |
| Offer | `_ID_Email` | 158 |
| Offer | `_ID_Phone` | 103 |
| SingleDateStudent | `_ID_Person` | 73,132 (all) |
| SingleDateStudent | `_ID_Course` | 69,145 |
| SingleDateStudent | `_ID_EnrolmentDone` | 12,427 |
| SingleDateStudent | `_ID_ExamReference` | 2,358 |
| DateBooking | `_ID_Platform` | 20,278 |
| DateBooking | `_ID_Corporate` | 3,802 |
| DateBooking | `_ID_Agency` | 1,589 |
| DateBooking | `_ID_Group` | 303 |
| Booking | `_ID_CourseLanguage` | 21,042 |
| PreBooking | `_ID_Contact` | 5,138 |
| PreBooking | `_ID_Address` | 3,319 |
| PreBooking | `_ID_Phone` | 3,033 |
| PreBooking | `_ID_Student` | 2,877 |
| PreBooking | `_ID_Email` | 969 |
| Comment | `_ID_Management` | 520 (most of the non-booking comments) |

**Content that is missing:**
- `SingleMonthStaff::CommentOnMonth`, `BalanceTextMonth`, `DateUpDate`: the time-sheet comment, 636 of 866 months since 2025, written by `SetBalanceRunning&CommentMonth.*`.
- `SingleDayStaff::CommentAdjustment`: 757.
- `Course::_ID_WeekDone`: course weeks generated, 1,303.

**Whole tables not synced and not in the docs:**
- **`DateCourse`** (1,336): a course's period(s), level per period and time of day. It is the real source of course dates (§4). 20 courses have several periods.
- **`DateStaffAtWork`** (1,869): teacher assignments per course and period.
- **`SingleDayCalendar`** (4,748): the calendar day. Legal holiday and closure flags; needed to interpret lesson days and staff targets.
- `WeekOfCourse` (10,401) and `SingleDateExam` (270) for exam dates (§5).
- `SingleDateHoliday` and `AdminWork` are already noted in the gaps doc as "later". They are the sources for holiday and worked time (§5).

## 9. Keys

All 67 keys are auto-enter serial numbers. Measured on 26.10.:

| Table | Problem |
|---|---|
| **DateOffer** | **2,697 of 5,041 rows have no key at all** |
| **Phone** | **158 key values used twice** |
| SingleDateStudent | 10 duplicated keys |
| Key | 4 duplicated keys |
| Management | 4 duplicated keys; one key is 18,217,082,528, a typo-sized value |
| Room | 2 duplicated keys |
| Address, Person, WorkFlow | 1 duplicated key each |
| CostDetail | 3 empty keys |

- **Likely cause:** imports from another file (`ImportSchoolmanCologne` imports Person, Phone, Address, Booking, CostDetail, PaymentIn, WorkFlow, Letter and others; `BasicImportSchoolman_II` imports reference tables) and records from before the serial existed.
- **Upsert by key will merge or drop these rows.** Key on `(table, key, creation timestamp)` for the affected tables, or report them for a clean-up decision.
- **No script resets a serial** (`Set Next Serial Value` is not used).

**Records the server creates or deletes:**
- **Nightly creation:** `MakeSingleDateStudent` (today's attendance rows); every job adds one `Log` row.
- **No night job deletes records.** `DeactivatePastCourse_Course` only clears `_ID_Active`.
- **Generated ahead by hand-run scripts (imports):** `SingleDayStaff` (`MakeWorkTimeTeacherSingleDay.Once`), `SingleMonthStaff` (`MakeWorkTimeTeacherSingleMonth.Once`), `SingleWeekCleaning` (`MakeSingleWeekCleaning.Import_Accommodation`), lesson days (`SetSingleDateCourse.Week.ImportCalendar_Course`).
- **Mass deletion by hand-run scripts:**
  - `EraseSingleDateCourse_Course` and `EraseSingleDateOccupancy_Course` delete all lesson days and room bookings of a course when it is re-planned. The regenerated rows get new keys, so a lesson-day key is not stable across re-planning, and attendance rows keep pointing at the old `_ID_SingleDateCourse`.
  - Single deletes (Delete Record by staff) leave no trace. Only the nightly full read finds them.

---

### Short list for the website session
1. Poll with fingerprints and expect the 00:00–01:05 wave, including all Person records.
2. Change fields:
   - Group → `DateOfChange`;
   - SingleMonthStaff → `DateOfChange`;
   - WeekDay has none;
   - the 6 "DateOfChange" timestamps can be polled to the second.
3. `_ID_Presence = 1` is the default, and `Comment` contains generated birthday notes.
4. Replace label copies with IDs (`PaymentIn::_ID_CostDetailReference`, `Person` country/language IDs); read dates from `DateCourse`, not `Course`.
5. Don't sync `RemainingHoliday` or trust `SingleDayStaff::_ID_Holiday`/`HourStart` for holidays or worked time.
6. Duplicate and empty keys in DateOffer, Phone and 7 more tables.
7. Add the missing link IDs (Letter, WorkFlow, WorkFlowLetter, CostDetail, PaymentIn, Invoice, SingleDateStudent, DateBooking) and `DateCourse`.
