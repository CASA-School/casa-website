# Mapping completeness — bookings, courses, tests, intake, exams, offers (2026-10-27)

Read-only. Sources: `gaps.txt` / `tables-not-covered.txt`, the profiles in `output/filemaker/`, the field
definitions and all 1,360 scripts in `casa-schoolman-scripts`, the readers/importers on `admin` (fc78aed),
the local workspace database and its `schoolman_records` copy, `output/filemaker/vocabularies.md`, the
Klassenbuch's FileMaker contract, and **a few column reads from SchoolMan** through `fm_read.column`
(SelectionDetail, Project, Contractor; Booking `_ID_Course/_ID_Contractor/_ID_Project/_ID_ExamReference/
_ID_Exam/_ID_Corporate/_ID_ShownUp/_ID_Success`; Course `CapGroup/Supplement/Incentive*/_ID_Exam/_ID_Location/
_ID_ClassRoom/_ID_StaffMember`; TestStudent `_ID_Test/_ID_TestReference`; PreBooking `_ID_Exam/_ID_ExamReference/
_ID_Local/_ID_Platform`; SingleDayCalendar and SingleWeekCalendar flags). Counts and codes only.

"recent" = filled on records created since 2025 (from `gaps.txt`).

**Note for anyone joining the copy:** in `schoolman_records`, `record_id` is FileMaker's internal record id,
not the table's key. Join on `data->>'__ID_<Table>'` (a first join on `record_id` gave nonsense).

---

## 1. Summary

This review covers:
- 208 gap fields in 11 tables;
- 3 fields outside the gap list (2 MAP, 1 COPY);
- 43 not-covered tables (§3).

| Verdict | Gap fields | Not-covered tables |
| --- | ---: | ---: |
| MAP | 31 | 3, plus one field of `Contact` |
| ALREADY | 8 | 13 |
| COPY | 74 | 5 |
| PLUMBING | 64 | 11 |
| ABANDONED | 27 | 6 |
| DECIDE | 4 | 5 |

The most important missing facts, in order:

1. **The waiting list loses most of its entries.** Since 2025, 1,078 people joined SchoolMan's waiting
   list. Three things go wrong:
   - **Exam waits are dropped.** 406 rows wait for an **exam**: the pre-booking names an exam sitting
     (`PreBooking._ID_Exam`), not a course. The reader keeps only rows whose pre-booking names a course.
     `waitlist_entries.exam_session_id` already exists.
   - **The person is missing on the waiting-list row.** 369 rows have no `_ID_Person` on the
     `WaitingRoom` row. Their pre-booking has the person, but the reader takes the person from the row
     only.
   - **Booked entries look open.** 205 rows have no `_ID_Booking`, although their pre-booking became a
     booking.

   As a result, 282 entries are still waiting, never booked, and none of them reach the workspace. The
   learner sample also cuts them, because a waiting person usually has no booking yet.
2. **Teacher outcomes are not on the booking.**
   - `Booking._ID_Success` (with or without success) decides whether the learner gets a
     *Teilnahmezertifikat* or a *Teilnahmebescheinigung*. It is on 150 bookings of 2026 and 363 of 2025.
   - The Klassenbuch writes the teacher's level confirmation (`_ID_LevelConfirmed`) and level approval
     (`_ID_LevelApproved`), on 6,783 and 4,390 recent bookings. The gap list skipped both because they
     are auto-entered with a default of 4.
3. **The university programme is not on the booking.** `Booking._ID_Project` has three values:
   HereStudies, Prime and in touch (the `Project` table). All three belong to the university contract
   (company 763). The field is on 412 bookings of 2026 and 488 of 2025. The workspace has no column for
   it, so it cannot tell which programme to invoice.
4. **What an enquirer asked for is not brought across.** SchoolMan keeps this on four fields that do not
   come over:
   - the wanted course period and accommodation, as `DateOffer` rows on the pre-booking (about 800 a
     year, used in the waiting-list and down-payment letters);
   - whether they are already in Germany (`PreBooking._ID_Local`, 996 recent);
   - the exam they asked for (`PreBooking._ID_Exam`, 448 recent);
   - how they got in touch (`Contact._ID_TypeContactReference`, 537 recent).
5. **Exam sittings come across only when a learner of the sample has booked them.** Every SchoolMan
   sitting ahead, with its places, should come across. Today 5 of the 8 telc B2 sittings ahead are not
   linked to a workspace sitting.
6. **Course facts are missing or read from copies.**
   - The course's place (`_ID_Location`: Dobben, online group, one-to-one online, in-house) does not come
     across.
   - The exam a preparation course leads to (`_ID_Exam`, on 36 of 39 recent prep courses) does not come
     across.
   - The teacher's course note (`CommentOnCourse`, written by the Klassenbuch, 62 recent) does not come
     across.
   - The reader takes the level from the label copies `LevelShort` and `LevelShown` instead of the ids
     `_ID_Level` and `_ID_LevelStepReference`.
7. **Some offers lack their date or recipient.** 149 imported offers have no sent date (they predate
   the letters); `Offer.DateOfEmission` has it. Offers made from a party's screen (`_ID_Management`,
   `_ID_Institution`) are dropped as having "no recipient".
8. **Tests lose their kind and their course.**
   - The test kind is read from a text copy and is lost when the test was entered on the pre-booking
     screen (`_ID_Test`, about 630 recent).
   - Tests should be tied to their course through `_ID_Course`, because **`TestStudent._ID_Booking` is
     corrupt**: 2,034 of 3,843 point to a booking that no longer exists (§6).
9. **CASA's closures are already in SchoolMan.** `SingleDayCalendar._ID_Holiday`, without the
   legal-holiday flag, has the closures through 2028, including Easter 2027, 22.03.–02.04. The
   workspace keeps them hand-typed in `src/config/school-closures.ts`, which ends at Christmas 2026.

---

## 2. Gap fields per table

### Booking (22,488 rows; 6,850 since 2025): 66 fields

The four `_ID_<Airport/Station/BusStop>` links are **not transfers**. `InternationalAirport`,
`CentralStation`, `NationalAirport` and `BusStop` are SchoolMan's **business lines**
(`PlatformReference`):

| Table | Business line |
| --- | --- |
| `InternationalAirport` | intensive courses (summer and junior courses, school classes) |
| `CentralStation` | evening courses, English and Spanish |
| `NationalAirport` | TestDaF and the other exams |
| `BusStop` | closed groups |

Each booking has one empty shell record on its line. That record holds only the links back to the
booking and the person; its gap fields are `Today`, timestamps and copied keys. Its purpose is to give
each line its own working screen. The link says nothing that the course type and the exam link do not
already say.

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Platform` | 6,849 | ALREADY | Business line: 1 intensive, 4 evening/special/company, 2 exam, 6 closed group | `bookings.course_type_id` → `course_types.format`; exam bookings via `exam_session_id` | Set to a constant by each `Go_Booking_<Line>`; PlatformReference |
| `_ID_StatusStudent` | 6,817 | COPY | Rookie/Runner/LastDance/Unicorn, worked out from the periods | The workspace's own register views (0028) | `ActualizeIDEnrolmentDone_Booking` (nightly) and `ActualizeFirstBooking_Booking` set it with `Case(cal_min_StartDate…)`. Rahman: not important |
| `_ID_Editable` | 6,815 | COPY | 2 when an agency or contractor is set, else 1 | — | `ActualizeIDEnrolmentDone_Booking`: `Case(_ID_Agency or _ID_Contractor; 2; 1)` |
| `_ID_CourseLanguage` | 6,631 | PLUMBING | Taught language: 1 German on 20,927, 2 English on 38 | — | Constant 1 in the `NewBookingStudent*` scripts |
| `ScheduleBookingClassBook` | 6,603 | COPY | Class-book line text | — | `ScheduleBooking.Exam.Type…_Booking`; the Klassenbuch displays it |
| `ScheduleBookingInvoice_1` | 6,524 | COPY | Invoice line text | — | Same script |
| `ScheduleBookingShort_1` / `_2` | 6,453 | COPY | Short schedule text (de/en) | — | `SetScheduleNationalAirport_OnServer` and others |
| `_ID_Level` | 6,049 | COPY | Level chosen on the booking header | Period: `booking_periods.level_code` | `ActualizeDateBooking_Booking` copies it into `DateBooking::_ID_Level` |
| `_ID_DayTimeReference` | 6,043 | COPY | Time of day chosen on the header | Course or period (see DateBooking) | Same script → `DateBooking::_ID_DayTimeReference` |
| `_ID_Course` | 6,028 | COPY | The booking's current course | `booking_periods.course_id` | **Measured:** equals the latest period's course on 20,159 of 20,188 bookings that have a course and a period; 20 name an earlier period's course, 9 a course no period has. `Write_ID_Course_Booking` → `ActualizeDateBooking_Booking`. The Klassenbuch reads it |
| `ScheduleBooking_1` / `_2` | 5,980 | COPY | Schedule text (de/en) | — | `ScheduleBooking.*` scripts |
| `_ID_PriceCourseSet` | 5,846 | PLUMBING | "Course price written" flag | Charges come with `CostDetail` | `WriteCoursePrice*_Booking` sets 1 |
| `_ID_Prolongation` | 5,747 | ALREADY | 1 = the learner has booked here before (a follow-on); 2 = first booking | Derivable from the person's earlier bookings, which come with every chosen learner | `Go_Booking_*` and `ExtensionStudent.Duplicate_Booking` set 1; `NewBookingStudent*` set 2. `RightLevel_Booking.V10`: "hat bereits Kurse bei uns belegt" |
| `ScheduleBookingLong_1` / `_2` | 5,645 | COPY | Long schedule text | — | `ScheduleBooking.*` |
| `count_Absence`, `count_AbsenceRate`, `count_Illness`, `count_Excuse`, `count_UnExcuse`, `count_Presence`, `count_PresenceRate` | 5,034 each | COPY | Attendance counts and rates | `booking_attendance` (computed there) | `PresenceClassroom.ReplaceAll_Booking`: `PatternCount(List(SingleDateStudent::_ID_Presence…))` |
| `_ID_VeryFirstBooking` / `_ID_VeryLastBooking` | 4,898 / 4,897 | COPY | First or last booking of the learner | Derivable from periods | `ActualizeIDEnrolmentDone_Booking` (nightly) |
| `count_ID_Agreement` | 4,842 | COPY | Number of agreements | Count of agreements | Same script: `Count(Agreement…)` |
| `_ID_InternationalAirport` | 4,689 | PLUMBING | Link to the booking's empty intensive-line record | — | 1:1 (15,072 distinct of 15,076); written at creation |
| `write_PresenceSymbol` | 4,435 | COPY | Attendance symbols as text | — | `PresenceClassroom.*` |
| `_ID_Client` | 4,336 | PLUMBING | Customer number copied from the person | `Person._ID_Client` is already read (0061) | `Go_Booking_*` copy `$_ID_Client` |
| `_ID_LongTerm` | 3,928 | PLUMBING | Price-calculation switch: 1 LongTerm (117.50/112.50 € a week), 2 ShortTerm (week table) | The resulting charges come from `CostDetail` | `WriteCoursePriceInternationalAirport_Booking`: dialog "LongTerm oder ShortTerm?" |
| `_ID_Selected` | 3,528 | PLUMBING | Selection mark | — | `SelectAllBooking` |
| `count_ID_SingleDateStudent`, `count_Delay`, `count_DelayUnit` | 3,215 / 2,573 / 2,360 | COPY | Attendance-row count and minutes late | `booking_attendance` | `PresenceClassroom.*` |
| `VeryLastBooking` / `VeryFirstBooking` | 2,376 / 1,712 | COPY | Text "LastBooking" / "FirstBooking" | — | Nightly script |
| `_ID_Welcome` | 2,244 | PLUMBING | Always 1, set when made by `NewBookingStudent*` | — | Read by no script and no relationship; one value |
| `_ID_Project` | 1,346 | **MAP** | The university programme: 1 HereStudies, 2 Prime, 3 in touch (`Project`, all on company 763). 2118–2120 (47, 2021–22, company 605) are dead ids | New `bookings.programme_code` and a small `programmes` vocabulary (from `Project`) | **Measured:** 2026: 412×1, 159×2; 2025: 488×1, 288×2. Copied to the next booking by `Go_Booking_*` and `NewBookingStudent_Course` |
| `_ID_CentralStation` | 1,265 | PLUMBING | Evening-line shell link | — | as `_ID_InternationalAirport` |
| `List_Agreement` | 1,149 | COPY | Agreement levels as text | — | Nightly script |
| `_ID_MissingItemReference` | 1,133 | ALREADY | Ticked "missing details" (SelectionDetail list 21: 1 course dates, 2 level, 3 address, 4 phone, 5 e-mail, 6 homeland, 7 birth date, 8 placement result, 9 birthplace, 10 mother tongue, 11 ID number, 12 bank details, 13 birth country) | The workspace works out what is missing from the record (`missingFromRecord`, `booking-letters.ts`); the letter sent carries what was asked | Typed on the layout (no script writes it); read by `MissingItem.Platform.V10` to write the letter |
| `_ID_Contractor` | 878 | COPY | The commissioning body: 1 Uni (companies 763, 605), 2 OBS (company 44), 3 (company 768/2210) | Derivable from the payer company (`payer_organisation_id`) | `Actualize.IDContractor…_Booking` copies `Corporate::_ID_Contractor`. **Measured:** 1↔763/605, 2↔44, 3↔768. Fell from 773 (2025) to 96 (2026); 511 recent university bookings have none |
| `_ID_ExamReference` | 796 | COPY | Exam type of the booking | `exam_sessions.exam_type_id` | **Measured:** set only on bookings with `_ID_Exam`, with one exception. `Go_PreBooking_Booking.Parameter` |
| `_ID_LevelStep` | 734 | COPY | The course's step (A1.1…) at booking time | `booking_periods.level_code` (computed by `step()`) | `NewBookingStudent_Course` and `ExtensionGroup` copy it from the course |
| `_ID_ShownUp` | 501 | **DECIDE** | 1 attended, 2 did not attend (a colleague's tick, mostly on intensive bookings) | `bookings.shown_up`, or worked out from attendance | Typed by hand. **Measured:** 461 in 2025, 43 in 2026. It went quiet once the Klassenbuch began recording attendance |
| `_ID_Success` | 500 | **MAP** | 1 with success, 2 without (SelectionDetail list 6). Decides the certificate: `CertificateText` = "Teilnahmezertifikat" when 1 | New `bookings.course_result` (`passed` / `not_passed`) | **Measured:** 2026: 30×1, 120×2; 2025: 64×1, 299×2. Typed on the Certificate layout |
| `_ID_NationalAirport` | 415 | PLUMBING | Exam-line shell link | — | as above |
| `_ID_LearningAgreement` | 405 | COPY | "An agreement exists" flag | Agreements themselves | `NewLearningAgreement_Booking.Parameter` sets 1 |
| `_ID_ScheduleCheck` | 211 | PLUMBING | Whether the schedule text holds the period's dates | — | `CheckSchedule_Booking` |
| `Balance.Com.Number`, `Balance.Gross.Number`, `Balance.Net.Number` | 209 / 202 / 202 | COPY | Stored balances | The workspace computes open money (`open-money.ts`) | `ActualizeBalance_Booking` |
| `_ID_Local` | 156 | ABANDONED | Inland or abroad, copied from the pre-booking | The fact is on PreBooking (MAP there) | `Go_PreBooking_Booking.Parameter` sets it from `$_ID_Local`, which is never set (bookings.md) |
| `_ID_ApplicationInternet` | 65 | ABANDONED | "Online registration?" (1 yes, 2 no), asked only on the direct-booking path | Website registrations: `source_registration_id` | `NewBookingStudent*` dialog; 65 of 6,850 recent |
| `_ID_Selection` | 53 | PLUMBING | Selection mark | — | `Restrain.ID_Selected_Booking` |
| `_DurationWeek` | 42 | ABANDONED | Weeks, typed | Follows from period dates | No script; 4,550 old, 42 recent |
| `_ID_BusStop` | 36 | PLUMBING | Closed-group shell link | — | as above |
| `_ID_PriceAccommodationSet` | 30 | PLUMBING | "Accommodation price written" flag | — | `WriteAccommodationPrice` |
| `_ID_Responsibility` | 30 | ABANDONED | The colleague responsible (`StaffSchool._ID_Staff.manual`) | — | 30 of 6,850 recent |
| `_ID_Contact` | 28 | PLUMBING | Back-link to the enquiry | `PreBooking._ID_Booking` (read) | `Go_PreBooking_Booking.Parameter` |
| `_ID_Clearing` | 12 | ABANDONED | Unknown; value 1 only | — | 20 ever; no script, no relationship |
| `_ID_WaitingRoom` | 10 | PLUMBING | Back-link to the waiting list | `WaitingRoom._ID_Booking` / `PreBooking._ID_Booking` | No writer |
| `CommentOnBooking` | 4 | **MAP** | The teacher's booking note, written by the Klassenbuch (`Booking_API`, "notes") | A `staff_notes` row on the booking, as `FinalNote` is | Klassenbuch filemaker-contract §2.2; 4 rows |
| `_ID_Test` | 2 | ABANDONED | — | — | Last used 2025 |
| `_ID_CourseStartMailSent` | 2 | ABANDONED | — | The course-start mail is a `Letter` row | Last used 2025 |

### DateBooking (20,206; 6,055 since 2025): 10 fields

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Person` | 6,055 | PLUMBING | The booking's person | Via `_ID_Booking` (complete: 1 orphan of 20,298) | `Set_ID_Person_Booking`, `NewDateBooking_Booking` |
| `_ID_Platform` | 6,053 | COPY | Line | — | `NewDateBooking*` |
| `_ID_Level` | 6,051 | **MAP** | The period's own level band (1 A1 … 5 C1, 3,5 B1+, 7 CH, 8 SK) | `booking_periods.level_code`, **only when the period has no course here** (1,161 such periods; bridge-gaps §2) | `ActualizeDateBooking_Booking` copies the booking's choice. Otherwise the course gives it |
| `_ID_DayTimeReference` | 5,816 | **MAP** | The period's time of day (2 morning, 4 afternoon, 5 evening) | New `booking_periods.day_time_code`, for course-less periods | Same script |
| `_ID_Client` | 3,828 | PLUMBING | Customer number | — | copy |
| `_ID_Empty` | 3,461 | PLUMBING | Calendar-row marker | — | `FillRowCalendar…_DateBooking` |
| `_ID_Corporate` | 1,249 | COPY | Company, from the booking | `bookings.payer_organisation_id` | `NewDateBooking*` copy `$_ID_Corporate` |
| `_ID_Agency` | 1,047 | COPY | Agency, from the booking | same | same |
| `_ID_Project` | 704 | COPY | Programme (1/2) copied from `Booking._ID_Project` | MAP on Booking | `ActualizeDateBooking_Booking` |
| `_ID_Group` | 237 | COPY | Group, from the booking | `bookings.group_visit_id` | `Actualize.IDBooking.IDGroup_Booking` |

### Course (1,331; 444 since 2025): 35 fields

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_PlatformReference` | 440 | ALREADY | Line, 1 or 4 | course type | Set in find mode by `Find*` scripts, or typed |
| `_ID_Level` | 440 | **MAP** | The level band id (LevelReferenceSchool) | `courses.level_code`. Replace the copy `LevelShort` that `read_courses.py` reads | `LevelShort` is `AUTOENTER(replace): LevelReferenceSchool::LevelShort` (mapping review §4) |
| `_ID_WeekDone` | 439 | PLUMBING | "Course weeks generated" 1/2 | — | `SetSingleDateCourse.Week…`, `Erase*` |
| `ScheduleCourse_1` / `_2` | 439 | COPY | Schedule text | — | `SetScheduleCourse_OnServer` (nightly) |
| `ScheduleCourseShort_1` / `_2` | 439 | COPY | Short text | — | same |
| `_ID_WeekDayNumber` | 437 | COPY | The weekdays as a list | `course_week_plans` | `List(WeekDay::_ID_WeekDayReference)` |
| `_ID_SingleDatesDone` | 437 | PLUMBING | "Lesson days generated" | — | `SetSingleDateCourse.Week.ImportCalendar_Course` |
| `_ID_Location` | 426 | **MAP** | Where it runs: 1 Dobben, 5 in-house, 6 in-house online, 7 online group, 8 one-to-one online (LocationReference) | New `course_instances.location_id` → `locations` (exists; `filemaker_links` LocationReference). Replaces the free-text `location` | **Measured** on courses ending 2025+: Dobben 544; online group 11 (company and special); in-house 1; empty 13. Typed |
| `ScheduleCourse_ClassBook`, `ScheduleCourse_UltraShort`, `ScheduleCourseLong_1` / `_2` | 421 / 383 / 322 | COPY | Texts | — | `ScheduleCourse.*` |
| `_ID_StaffMember` | 307 | ALREADY | **List** of the course's teachers (e.g. two staff ids) | `course_week_plans.teacher_id`, `course_days.teacher_id` | **Measured:** it is a checkbox list naming the WeekDay teachers, sometimes one more |
| `_ID_ClassRoom` | 286 | ALREADY | The course's default room | Per-day rooms (`course_days.room_id` from SingleDateCourse/Occupancy). Optional: fill the empty `courses.room_id` | 313 of 569 recent courses have no WeekDay room; their days carry the room |
| `_ID_CourseCourseStartMailSent` | 274 | COPY | "Start mail sent" | The `Letter` rows that `CourseStartMail*` creates (with `_ID_Course`) | `CourseStartMail.Course_Course` |
| `List_ID_Student` | 239 | COPY | Learner numbers as text | — | `SetScheduleCourse_OnServer` |
| `countIDBookDelivered.yes` / `.no` | 229 | COPY | Books handed out, counted | `booking_charges.handed_out` (0087) | `WriteBookDelivery_DateBooking` |
| `CapGroup` | 202 | PLUMBING | Always 1 (one group), a counter for the weekly total | `courses.groups` comes from places and parallel courses | **Measured:** 1 on 573 of 580 filled courses (2 and 3 once each). Used only in `Total(CapGroup)` / `WeekOfCourse::cal_CapGroup`; not filled on 2027 courses |
| `IncentivePercent` | 87 | **DECIDE** | Teacher bonus percentage on a course, 5 or 7 % | — (pay) | Intensive 5 %, exam prep 7 % or 5 %. `Go_SingleDateCourse.IDIncentive` lists a teacher's lessons on such courses from the timesheet |
| `_ID_LevelStepReference` | 76 | **MAP** | The step of an evening course (A2.2…) | `courses.level_code` for evening. Replace the copy `LevelShown` | `LevelShown` = `AUTOENTER(replace): LevelStepReference_Course::LevelStepReference` |
| `CommentOnCourse` | 62 | **MAP** | Teacher's course note (Klassenbuch `Course_API`) | `staff_notes` (entity course, author "Klassenbuch") | Contract §2.3; bridge-gaps §3 |
| `Supplement` | 57 | **MAP** | Older title or subtitle of a course: module names (grammar, phonetics, conversation …), a company name, and on one-to-one courses **a person's name** | Fallback for `courses.title` when `CourseTitle` is empty. Never show it on the website | **Measured:** 15 recent courses have it without `CourseTitle`; 47 have both; mostly special courses (type 11) |
| `_ID_Incentive` | 48 | **DECIDE** | "Teachers get the bonus" flag on a course (1) | — | 34 courses in 2026, 42 in 2025 |
| `_ID_Exam` | 25 | **MAP** | The sitting an exam-preparation course leads to | New `courses.exam_session_id` (via `exam_sessions.filemaker_exam_id`) | **Measured:** on 36 of 39 recent prep courses, on no other type |
| `NumberLessonToDo` | 5 | ABANDONED | — | — | Last 2025 |
| `CourseTitle_1`, `WeekDayTime_1` / `_2` | 4 / 3 | ABANDONED | — | — | Last 2025 |
| `_ID_TypeTeachingReference` | 2 | ABANDONED | Presence/online/blended | `course_types.teaching_mode` | 8 ever |
| `TextField` | 2 | PLUMBING | Export text of the class list (holds learners' names) | — | `WriteExportNoteBook_Course` |
| `_ID_NoteBookDone` | 2 | PLUMBING | Export done | — | same |
| `Url` | 1 | ABANDONED | — | — | — |

### TestStudent (5,940; 2,239 since 2025): 18 fields

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_LevelSchool` | 2,131 | **MAP** | Level reached (LevelReferenceSchool: 1 A1, 2 A2, 3 B1, 3,5 B1+, 4 B2, 5 C1, 6 TD, 7 CH) | `person_tests.level`. Replace the copy `LevelShort` the reader reads | `LevelShort` = `AUTOENTER(replace)` from the level reference |
| `_ID_PreBooking` | 1,633 | PLUMBING | Test made at the enquiry | The person is on the row (all but 1) | `NewTest_PreBooking` |
| `_ID_TestReference` | 1,274 | **MAP** | Kind of test (TestReference: 1 telc B2, 2 Kontext, 3 Aspekte neu, 4 Netzwerk neu online, 5 level end, 6 grammar, 7 written, 8 oral, 9 lesson end, 10 half-level end, 11 free test) | `person_tests.test` from the id | The label `TestReference` = `AUTOENTER(replace): TestReference::TestReference_1` |
| `_ID_Student` | 1,016 | PLUMBING | Learner number | — | Also mass-overwritten (see §6) |
| `_ID_Test` | 647 | **MAP** | Kind of test, entered on the **pre-booking** screen (the same TestReference ids) | `person_tests.test` when `_ID_TestReference` is empty | **Measured:** the two are almost never both set. Since 2025, about 630 tests have only `_ID_Test`. Relationship `TestReference_Test_PreBooking` |
| `_ID_Platform`, `_ID_InternationalAirport`, `_ID_CentralStation`, `_ID_NationalAirport`, `_ID_Client` | 606 / 493 / 91 / 1 / 186 | PLUMBING | Copied keys | — | `NewTest_Booking` |
| `_ID_Course` | 597 | **MAP** | The course the test was taken in | Resolve `person_tests.booking_id` as the person's booking with a period on this course, instead of `TestStudent._ID_Booking` | `_ID_Booking` is unreliable (§6); `_ID_Course` is set with it by `NewTest_Booking` but is not touched by the mass replace |
| `_ID_Level`, `ZSingleDateTest`, `_ID_CourseTypeReference` | 12 / 12 / 7 | ABANDONED | — | — | Last 2025 |
| `_ID_StaffMember` | 2 | ABANDONED | Tester | `User` text (read) | — |
| `_ID_Selected` | 1 | PLUMBING | — | — | — |
| `Point`, `_ID_Success` | 1 / 1 | ABANDONED | — | — | — |

### Agreement (664; 422 since 2025): 10 fields

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Course` | 422 | **MAP** | Course the agreement is about | Agreement record (see §5, G8) | `NewLearningAgreement_Booking.Parameter` |
| `_ID_Student`, `_ID_InternationalAirport`, `_ID_Client` | 422 / 419 / 293 | PLUMBING | Copied keys | — | same script |
| `_ID_Level` | 422 | **MAP** | Level band id | Replace the text `Level` that the reader reads (written at the same time, so consistent) | same script |
| `_ID_TextModule` | 406 | COPY | Which standard text modules were chosen | The composed text is in `Agreement_1`, which is read | `SetSelectedTextModule_Agreement` |
| `_ID_StaffMember` | 313 | **MAP** | The **teacher** who made it | Agreement record: `teacher_id` (staff_members.filemaker_staff_id) | Typed (teacher value list); `StaffMember_Agreement` |
| `_ID_LengthDuration` | 309 | **MAP** | Trial period: 1–5 weeks (SelectionDetail 16; 4 weeks on 432) | Agreement: `trial_weeks` integer. Replace the copy `LengthDuration` | `LengthDuration` = `AUTOENTER(replace)` from SelectionDetail |
| `_ID_StaffSchool` | 252 | **MAP** | The office colleague named on it | Agreement: `staff_member_id` (StaffSchool → register, staff agent) | `StaffSchool_Agreement` |
| `_ID_Recommendation` | 179 | **MAP** | 1 repeat the half level, 2 repeat the whole level, 3 repeat a basic level | Agreement: `recommendation` code. Replace the copy `Recommendation` | `Recommendation` = `AUTOENTER(replace)` from SelectionDetail 15 |

### Exam (134; 37 since 2025): 8 fields

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Level` | 35 | ALREADY | Level of the exam | `exam_types.level` (ExamReference has `_ID_Level`) | 7 CH, 4 B2, 6 TD, 9 AS = the exam type |
| `_ID_LanguageReference` | 35 | PLUMBING | Always 1 (German) | — | — |
| `_ID_Active` | 34 | PLUMBING | Shown in lists; past sittings 2 | Derivable from the date | `Sort.Exam_Exam` (find), `Show.IDActive_Exam` |
| `_ID_Bookable` | 25 | **DECIDE** | 1 open for registration, 2 closed (SelectionDetail 4) | `exam_sessions.status` or the registration deadline | Typed |
| `Schedule_1`, `ScheduleShort_1` | 9 | COPY | Texts | — | `ScheduleExam_Exam` |
| `_ID_StaffMember`, `_adjust_IDPurviewReference` | 1 | ABANDONED | Examiners before 2026 | `SingleDateExam._ID_StaffMember` → `exam_session_examiners` (read since 2026-10-26) | Last 2025 |

### PreBooking (6,082; 2,556 since 2025): 17 fields

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Address`, `_ID_Phone`, `_ID_Email` | 2,126 / 1,887 / 608 | PLUMBING | Which of the person's records the enquiry used | The records carry `_ID_Person` (set by `NewAddress/Phone/Email_PreBooking`) | — |
| `_ID_Contact` | 1,889 | PLUMBING | Twin `Contact` record | — | `NewContact` |
| `_ID_Student`, `_ID_Client` | 1,767 / 852 | PLUMBING | Copied keys | — | — |
| `_ID_Platform` | 1,151 | COPY | Line, follows from the course type (1↔1, 4↔2/11) | — | Measured: platform × type |
| `_ID_WaitingRoom` | 1,057 | PLUMBING | Back-link to the waiting list, **unreliable** | Use `WaitingRoom._ID_PreBooking` (as the reader does) | 238 pre-bookings point at one waiting-list row and 84 at another (§6) |
| `_ID_Local` | 996 | **MAP** | 1 already in Germany (Inland), 2 abroad (Ausland), SelectionDetail 3 | Intake note on the booking or person; later an `enquiries` field | Typed; 454 / 557 since 2025 |
| `_ID_ExamReference` | 456 | **MAP** | Exam type asked for | With `_ID_Exam` (only 8 have the type without a sitting) | Typed |
| `_ID_Exam` | 448 | **MAP** | The exam sitting asked for, also the **exam waiting list** | `waitlist_entries.exam_session_id`; intake note | **Measured:** 406 of 1,078 waiting-list rows since 2025 wait for an exam this way (147 not booked) |
| `_ID_Institution` | 16 | ABANDONED | Organisation behind the enquiry (some typed letters) | — | 34 ever; 0.6 % of recent |
| `_ID_MissingItem` | 13 | ALREADY | Missing details at intake | `missingFromRecord` | — |
| `_ID_Recommendation_min` / `_max`, `_ID_Responsibility`, `_ID_Project` | 4 / 1 / 3 / 1 | ABANDONED | — | — | — |

### WaitingRoom (1,959; 1,074 since 2025): 5 fields

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Student`, `_ID_Email`, `_ID_Address`, `_ID_Phone`, `_ID_CourseLanguage` | 675 / 586 / 586 / 555 / 543 | PLUMBING | Keys copied from the enquiry | Through `_ID_PreBooking` (100 %) | `Go_Contact_WaitingRoom`, `ExtensionWaitingRoom_WaitingRoom` |

The real gaps here are the links, not these fields: §1 item 1 and §6.

### Offer (397; 164 since 2025): 22 fields

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `DateOfEmission` | 164 | **MAP** | The date on the offer letter | `offers.sent_at` when no letter is known | Typed. **Measured:** 149 imported offers are decided (lapsed/accepted/declined) but have no `sent_at` |
| `_ID_CourseTypeReference`, `_ID_Level`, `_ID_DayTimeReference`, `_ID_Course`, `_ID_LevelStepReference` | 95 / 85 / 76 / 55 / 34 | COPY | What the learner asked for, copied from the pre-booking or booking | The lines carry it as text | `NewOffer_PreBooking`, `NewOffer_Booking` |
| `_ID_CourseLanguage` | 94 | PLUMBING | Always German | — | — |
| `_ID_Institution` | 75 | **MAP** | The party's institution record | Recipient fallback → `offers.organisation_id` (`filemaker_links` Institution, 285) | `NewOffer_Management`, `NewOffer_Group`, `SetHeader_Offer` |
| `_ID_Email` | 70 | COPY | The address used | `Offer.Email` (read) | same scripts |
| `_ID_Contact` | 69 | PLUMBING | Enquiry twin | — | — |
| `_ID_Phone` | 51 | PLUMBING | Phone record | — | — |
| `_ID_Management` | 41 | **MAP** | The party the offer is for (made from its screen) | `offers.organisation_id` (`filemaker_links` Management, 285) | `NewOffer_Management`; such offers fall into "no recipient" (19) |
| `EmailAll` | 41 | COPY | The party's addresses as a list | — | `NewOffer_Management` (`$_ListEmail`) |
| `_ID_AccommodationCatering` / `Type` / `Room` | 16 / 15 / 15 | COPY | Stay wish, copied from the pre-booking | DateOffer wishes (MAP there) | `NewOffer_PreBooking` |
| `_ID_Platform`, `_ID_Client`, `Provenience`, `_ID_CentralStation`, `_ID_WaitingRoom` | 8 / 8 / 8 / 6 / 1 | PLUMBING | Origin keys and screen | — | — |
| `_ID_Template` | 5 | PLUMBING | Template pointer (one value) | Templates are not imported | — |

### DateOffer (5,026; 1,504 since 2025): 14 fields

Since 2024, almost every `DateOffer` row hangs on a **pre-booking**, not on an offer: with a start date from
2024 on, 2,074 course periods and 251 stays, against 98 rows on offers. These rows are the enquirer's **wanted
course period and accommodation**. They are what the waiting-list confirmation
(`ConfirmationWaitingList.Course_WaitingRoom`), the free-place letter and the down-payment letter print.

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Person` | 1,447 | PLUMBING | Copy of the pre-booking's person | — | `NewDateOffer…_PreBooking` |
| `_ID_PreBooking` | 1,441 | **MAP** | The enquiry the wish belongs to | Intake note: "gewünscht 05.01.–27.02.27; Unterkunft …"; waiting entry `note` | `NewDateOffer.IDTypeOfferReference1_PreBooking`, `NewDateAcommodationOffer_PreBooking` |
| `_ID_AccommodationRoom` | 151 | **MAP** | Wished room (1 single, 2 double) | same; on a booking, `bookings.accommodation_room_type_code` if not yet set | Typed |
| `_ID_AccommodationCatering` | 146 | **MAP** | Wished meals (6 none, 3 half board …) | `accommodation_catering_code` | Typed |
| `_ID_AccommodationType` | 60 | **MAP** | Wished kind (2 with Germans/host family, 7 CASA flat) | `accommodation_type_code` | Typed |
| `_ID_Group`, `_ID_CourseTypeReference`, `_ID_Platform` | 45 / 43 / 42 | COPY | A group's offered period, copied from the group | `group_visits` dates | `NewDateOffer.IDTypeOfferReference.Parameter_Group` |
| `_ID_CourseLanguageReference` | 41 | PLUMBING | German | — | — |
| `_ID_Corporate`, `_ID_Agency` | 32 / 4 | COPY | Offer recipient, copied | Offer | `NewDateOffer…_Offer` |
| `_ID_Contact`, `_ID_WaitingRoom` | 10 / 1 | PLUMBING | — | — | — |
| `_ID_Active` | 9 | ABANDONED | — | — | 23 ever |

Note: 2,697 old `DateOffer` rows have no key (mapping review §9). Every row since 2025 has one.

### SingleDateActivity (31; 5 since 2025): 3 fields

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Corporate`, `_ID_Platform`, `_ID_CourseLanguage` | 5 each | PLUMBING | Copied from the group when the activity is made | Via `_ID_Group` (read) | `NewDateActivity_Group` |

### Outside the gap list, but in this area

The gap computation skipped these three fields because they are auto-entered:

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `Booking._ID_LevelConfirmed` | 6,783 | **MAP** | Teacher: is the level right? 1 yes, 2 no, 4 unsure (also the default); 3 on 3,132 older rows (meaning unknown, before the Klassenbuch) | New `bookings.level_confirmed` | Klassenbuch writes it (`Booking_API`, LevelStatus enum). `AUTOENTER(replace): 4` |
| `Booking._ID_LevelApproved` | 4,390 | **MAP** | Teacher: may the learner go up a level? Same codes | New `bookings.level_approved` | same |
| `Booking.CertificateText` | 6,450 | COPY | "Teilnahmezertifikat" when `_ID_Success = 1`, else "Teilnahmebescheinigung" | Follows from `_ID_Success` | `AUTOENTER(replace)` and three scripts |

---

## 3. Not-covered tables of this area

| Table | Rows | What it is | Verdict | What to bring |
| --- | ---: | --- | --- | --- |
| `Contact` | 5,043 | The enquiry's twin of `PreBooking`, created with it (`NewContact`) | COPY, except one field: **MAP** `_ID_TypeContactReference` (how they got in touch: 1 online, 2 e-mail, 3 phone, 4 office visit; partly typed as text, "Email" 420 and "Besuch im Büro" 133 → 2 and 4) | `Sync_Contact`: key, change, `_ID_PreBooking`, `_ID_TypeContactReference`. Into the intake note; 537 recent |
| `WeekOfCourse` | 10,401 | A course week with counts | ABANDONED | 1 new row in 2026. Weeks and teachers are on `WeekDay` and `SingleDateCourse` (read) |
| `Session` | 115 | Term plan: a term per line and time of day (97 intensive, 18 evening) | **DECIDE** | See §5 G13 |
| `LevelStep` | 200 | The level steps run in each intensive term (session, dates, parity) | **DECIDE** | with `Session` |
| `SingleDayOccupancyClassroom` | 5,616 | A room-plan display grid rebuilt from `SingleDateOccupancy` | COPY | `MakeRoomPlan_SingleDayOccupancy`; rooms per day are read from `SingleDateOccupancy` |
| `SingleDayCalendar` | 4,748 | One row per calendar day, 2022–2034. Mostly `_adjust_*` navigation state, plus three flags: `_ID_Holiday`, `_ID_LegalHoliday`, `_ID_PublicSchoolHoliday` | **MAP** (closure days) | Closure day = `_ID_Holiday = 1` and not `_ID_LegalHoliday = 1`. **Measured:** 57 holiday days in 2026–27, including the Easter 2027 closure (22.03.–02.04.) and Christmas 2026 and 2027 |
| `SingleWeekCalendar` | 776 | Weeks; `_ID_Closure` marks closure weeks (21, from 2022 to Christmas 2028) | COPY | The day table carries the same closures |
| `SingleMonthCalendar` | 168 | Month navigation | PLUMBING | — |
| `Item` | 679 | Interface labels per placeholder and language (`NewItem_PlaceHolder`) | PLUMBING | — |
| `BookInUse` | 49 | Which book is used for which course type, level step and time of day | ALREADY | `materials` (`BookReference`, 36 rows with level and part) |
| `Medium` | 129 | Stored files on records: photo, document, teaching material (container fields) | **DECIDE** | Personal documents; storage and privacy are Rahman's call |
| `CodeNumber` (+ `CodeNumberReference`) | 48 (+8) | Personal identifier numbers: car, health and pension insurance, tax ID, telc examiner licence, ID card, passport, customer number | **DECIDE** (staff/people area, not bookings) | Hand to the staff/people review. The examiner licence number would fit `staff_licences` |
| `Project` | 3 | The university programmes HereStudies, Prime, in touch (company 763, 10/2021–12/2022 as typed) | **MAP** (vocabulary for `Booking._ID_Project`) | `Sync_Project` or a code list |
| `Contractor` | 3 | Commissioning bodies: 1 Uni (763), 2 OBS (44), 3 (2210) | COPY (classification of the payer company) | — |
| `CourseTypeReference` | 14 | Course types | ALREADY | `course_types.filemaker_id` |
| `LevelStepReference` | 13 | A1.1 … C1.3 | ALREADY | `levels.filemaker_level_step_id` |
| `LevelReferenceSchool` / `LevelReferenceEuropeanFrame` | 10 / 6 | Bands and the European framework | ALREADY | `BAND` maps in the readers; `levels.cefr` |
| `DayTimeReference` | 3 | Morning, afternoon, evening | ALREADY | `day_times.filemaker_id` |
| `ExamReference` | 5 | TestDaF, (B1), B2 telc, C1 Hochschule, TestAS | ALREADY | `exam_types.filemaker_id` (TestDaF/TestAS: bridge-gaps decision 4) |
| `PartExamReference` | 3 | Written, oral, both | ALREADY | `PART` in `read_exams.py` |
| `TestReference` | 11 | Test kinds | **MAP** (as a code list) | The 11 rows in §2 TestStudent; a constant map in the reader is enough |
| `TypeTeachingReference` | 3 | Presence, online, blended | ALREADY | `course_types.teaching_mode` |
| `LocationReference` | 8 | Course places | ALREADY | `locations` |
| `MissingItemReference` | 10 | Missing details (older list) | ALREADY | `MISSING_ITEMS` |
| `PlatformReference` | 24 | The business lines and their airport/station names | PLUMBING | Lines are course types |
| `SelectionDetail` / `SelectionReference` | 85 / 23 | All small value lists: ja/nein, booking status, Inland/Ausland, bookable, exam part, success, commission payer, day particularity, recommendation, trial weeks, missing details … | PLUMBING (decoded) | The codes used here are listed in §2; the readers keep them as constants |
| `DecisionReference` | 7 | ja, nein, offer, u.B., grau, Undefined | ALREADY | Decoded in the readers |
| `TypeOfferReference` | 3 | Course, accommodation, internship | ALREADY | `read_offers.py` |
| `CourseDetailReference` / `CourseTypeDetailReference` | 5 / 7 | Sub-types (basic grammar, junior, OBS course …) | ABANDONED | No field in use refers to them |
| `LanguageReference` | 16 | Languages | PLUMBING | Course language is always German |
| `DayNameReference`, `MonthNameReference`, `TimeStepReference`, `SequenceReference`, `Start` | 7 / 12 / 3 / 5 / 5 | Calendar names, UI settings | PLUMBING | — |
| `YearOfCalendar` | 11 | Stored yearly statistics (income, load factor, lessons) | COPY | — |
| `EvaluationDetail` / `EvaluationReference`, `DateAbsence` | 2 / 3, 5 | Course evaluations; absences | ABANDONED | — |

---

## 4. Fields the readers will need

```json add_to_layouts
{
  "Booking": ["_ID_Success", "_ID_Project", "CommentOnBooking", "_ID_LevelConfirmed", "_ID_LevelApproved"],
  "DateBooking": ["_ID_Level", "_ID_DayTimeReference"],
  "Course": ["_ID_Level", "_ID_LevelStepReference", "_ID_Location", "_ID_Exam", "CommentOnCourse", "Supplement"],
  "TestStudent": ["_ID_LevelSchool", "_ID_TestReference", "_ID_Test", "_ID_Course"],
  "Agreement": ["_ID_Course", "_ID_Level", "_ID_StaffMember", "_ID_StaffSchool", "_ID_LengthDuration", "_ID_Recommendation"],
  "PreBooking": ["_ID_Local", "_ID_Exam", "_ID_ExamReference"],
  "Offer": ["DateOfEmission", "_ID_Management", "_ID_Institution"],
  "DateOffer": ["_ID_PreBooking", "_ID_AccommodationType", "_ID_AccommodationRoom", "_ID_AccommodationCatering"],
  "Contact": ["__ID_Contact", "Timestamp.Change", "_ID_PreBooking", "_ID_TypeContactReference"],
  "Project": ["__ID_Project", "DateOfChange", "Project", "ProjectShort", "_ID_Corporate", "ZStartDate", "ZEndDate", "_ID_Active"],
  "SingleDayCalendar": ["__ID_SingleDayCalendar", "DateOfChange", "ZSingleDayCalendar", "_ID_Holiday", "_ID_LegalHoliday", "_ID_PublicSchoolHoliday"]
}
```

Only if Rahman decides for them (§5 G13 and the DECIDE rows):

```json add_if_decided
{
  "Booking": ["_ID_ShownUp"],
  "Exam": ["_ID_Bookable"],
  "Course": ["_ID_Incentive", "IncentivePercent"],
  "Session": ["__ID_Session", "DateOfChange", "_ID_PlatformReference", "_ID_DayTimeReference", "ZStartSession", "ZEndSession", "_ID_WeekDayReference", "_ID_Parity", "CommentSession"],
  "LevelStep": ["__ID_LevelStep", "_ID_Session", "_ID_PlatformReference", "ZStartDate", "ZEndDate", "_ID_Parity"]
}
```

`Contact`, `Project`, `SingleDayCalendar`, `Session` and `LevelStep` are new `Sync_` layouts. Their change
fields: `Timestamp.Change` (timestamp); `Project.DateOfChange` (timestamp); `SingleDayCalendar.DateOfChange`
(date); `Session.DateOfChange` (date); `LevelStep` has none (use a fingerprint, as for WeekDay).

---

## 5. Implementation notes, per MAP group

**G1 — Waiting list made whole (small; reader and importer; no migration).** In `read_intake.py`:
- **Person:** `WaitingRoom._ID_Person`, else the pre-booking's `_ID_Person`.
- **Booked:** `WaitingRoom._ID_Booking`, else `PreBooking._ID_Booking`.
- **What they wait for:** the pre-booking's course, else its exam (`PreBooking._ID_Exam`).

In `import-intake.mjs`, an exam wait becomes a `waitlist_entries` row with `exam_session_id`. The sitting is
found by `filemaker_exam_id`, or made as a draft, as `import-learners` does. The wished period from
`DateOffer` goes into the entry's `note`. **The learner sample must not cut the waiting list**: the 282
entries since 2025 that never became a booking often belong to people with no booking at all, whom the
sample does not include. Read every waiting row whose pre-booking is
not booked and whose wished period or sitting is still ahead. That rule needs Rahman's yes (bridge-gaps
decision 1).
*Shows:* the course's and the sitting's waiting list, and Kursplanung's signal for a parallel group.

**G2 — Every exam sitting ahead (small; reader and importer; no migration).** `read_exams.py` already reads
every `SingleDateExam` row. Add `Exam._ID_ExamReference` and `NumberPlace`, both already on the layout.
`import-exams.mjs` then creates or links an `exam_sessions` row for each sitting ahead, not only for booked
ones: a draft, with `capacity` from `NumberPlace`. Today it counts them as `notHere` and skips them.
*Shows:* Exams module; the places and the telc list are complete.

**G3 — Teacher outcomes on the booking (migration: 3 columns).**
- `bookings.level_confirmed` and `level_approved`: text yes/no/unsure; code 4 maps to unsure, and 3 maps
  to null.
- `bookings.course_result`: passed / not passed.

`read_learners.py` adds `_ID_LevelConfirmed`, `_ID_LevelApproved` and `_ID_Success`; `import-learners.mjs`
writes them. *Shows:* the booking page, where it replaces „Niveau nicht bestätigt" with the teacher's
answer; Kursplanung's next-level view; a future certificate letter (Zertifikat or Bescheinigung).

**G4 — University programme (migration: `programmes` vocabulary of 3 rows and `bookings.programme_code`).**
Read `Booking._ID_Project`. Map 1/2/3 to HereStudies, Prime and in touch; drop 2118–2120. *Shows:* the
booking's payer section, and a filter in Buchungen for the university's invoices.

**G5 — Course facts (small, except one migration).**
- In `read_courses.py`, read `_ID_Level` and `_ID_LevelStepReference` instead of `LevelShort`/`LevelShown`.
  Use the `BAND` map and `levels.filemaker_level_step_id`.
- `_ID_Location` goes to a new `course_instances.location_id` (migration); company and special courses
  are their own starts.
- `_ID_Exam` goes to a new `courses.exam_session_id` (migration).
- `CommentOnCourse` becomes a `staff_notes` row on the course.
- `Supplement` is the title when `CourseTitle` is empty. Workspace only: some name a person.

*Shows:* the course page, Kursplanung, and the exam's page ("Vorbereitungskurs").

**G6 — Level and time of course-less periods (small; one column).** `read_learners.py` adds
`DateBooking._ID_Level` and `_ID_DayTimeReference`. When a period's course is not in the workspace,
`booking_periods.level_code` comes from the band, and a new `booking_periods.day_time_code` from the time of
day. This covers 1,161 periods.

**G7 — Tests (small; no migration).** In `read_learners.py`:
- **Kind:** `_ID_TestReference`, else `_ID_Test`, mapped through the 11-row TestReference list. Fall back
  to the text only for old rows.
- **Level:** `_ID_LevelSchool` through `BAND`.
- **Booking:** the person's own booking whose period is on `_ID_Course`. Never trust `TestStudent._ID_Booking`
  alone; the importer already refuses another person's booking, and that must stay.

*Shows:* the learner's Tests tab.

**G8 — Learning agreements (DECIDE the size).**
- *Small:* enrich the existing note with the course, the teacher, the office colleague, the trial weeks and
  the recommendation. No migration.
- *Proper:* a `learning_agreements` table (booking, course, level, teacher, colleague, trial weeks,
  recommendation code, text, author, date, `filemaker_id`) shown on the booking.

docs/schoolman/bookings.md plans for agreements to move to the Klassenbuch, which may make the table
redundant later. Ask Rahman which.

**G9 — Intake facts (small; no migration).** `read_intake.py` adds `PreBooking._ID_Local`, `_ID_Exam` and
`_ID_ExamReference`; the `DateOffer` wishes by `_ID_PreBooking` (type 1 period; type 2 stay with type, room
and meals); and `Contact._ID_TypeContactReference`. Typed text becomes ids: "Email" → 2, "Besuch im Büro"
→ 4. All of it goes into the existing intake note. A stay wish on a pre-booking that became a booking
fills `bookings.accommodation_*` only where the booking has neither its own wish nor a stay.

**G10 — Offers (small; no migration).** In `read_offers.py`, a recipient may also come from `_ID_Management`
or `_ID_Institution`, both through `filemaker_links`. `DateOfEmission` is the `sent_at` date when no letter
exists.

**G11 — Closures (migration, plus a code change outside the bridge).** A `school_closures` table (from, to,
label) filled from `SingleDayCalendar` closure days, merged into ranges. The website's
`src/config/school-closures.ts` and the lesson-day importer read it. Who keeps the closures — the
workspace or SchoolMan — is Rahman's call. SchoolMan already has them up to 2028; the config stops at
Christmas 2026.

**G12 — Teacher note on a booking (trivial).** `CommentOnBooking` becomes a `staff_notes` row, read where
`FinalNote` is read.

**G13 — DECIDE questions.**
1. **Erschienen** (`_ID_ShownUp`): still a hand-set fact, or worked out from attendance? 461 in 2025, only
   43 in 2026.
2. **Teacher bonus** (`Course._ID_Incentive`, `IncentivePercent` 5/7 %): should the workspace hold which
   courses pay teachers a bonus? It is pay data for staff time.
3. **Exam "gesperrt"** (`Exam._ID_Bookable`): should it close registration for the sitting in the workspace,
   or does the workspace own registration through its places and deadline?
4. **Term plan** (`Session`, `LevelStep`): who owns the course starts while FileMaker books — the
   workspace's Kurstermine, or SchoolMan's term plan read into `course_instances`? This also settles the
   19 SchoolMan courses with no start (bridge-gaps decision 3).
5. **Files and identifiers** (`Medium`, `CodeNumber`): bring the stored documents and personal ID numbers
   at all? Hand to the people/staff review.

---

## 6. Links that run the other way, and defects found

- **`WaitingRoom` → person.** Since 2025, 369 of 1,078 rows have no `_ID_Person`. The person is on the
  pre-booking (`WaitingRoom._ID_PreBooking` is 100 % filled). The reader drops these rows. Fix: G1.
- **`WaitingRoom` → booking.** 205 rows since 2025 have no `_ID_Booking`, although `PreBooking._ID_Booking`
  is set. Fix: G1.
- **`PreBooking._ID_WaitingRoom` is not a usable link.** 238 pre-bookings point at one waiting-list row
  (a 2022 row of another pre-booking) and 84 at a second one. A back-link written from a stale variable
  (`Go_Contact_WaitingRoom` and others). Read `WaitingRoom._ID_PreBooking`, as `read_intake.py` already does.
- **`TestStudent._ID_Booking` and `_ID_Student` are mass-overwritten.**
  - **Extent:** 2,000 tests of 915 different people (2022–2026) point at one booking id, 171947, which no
    longer exists. Of the 3,843 tests with a booking id, 2,034 point at a missing booking.
  - **Cause:** `Go_PreBooking_Booking.Parameter` runs `Replace Field Contents` on the related
    `TestStudent_Booking::_ID_Booking` and `::_ID_Student`. Replace works across the whole found set, not
    one record.
  - **What still holds:** the person link (`_ID_Person`) is intact. The importer links a test only to the
    learner's own booking (0 mismatches locally); keep that rule. Use `_ID_Course` (G7).
- **`Booking._ID_Corporate` holds typed text on 47 bookings** ("uni763"-style: 21 in 2025, 7 in 2026), so
  the payer-company lookup fails. Strip non-digits. This is the organisations area's field; noted here.
- **`Booking._ID_Course` agrees with the periods.** It equals the latest period's course on 20,159 of
  20,188 bookings; 9 point at a course no period has. The periods stay the source. The Klassenbuch reads
  `Booking._ID_Course`, so for those 9 it can show a course the periods do not name.
- **DateBooking → Booking** is complete (1 orphan). **Agreement** → booking and person: 100 %.
  **Offer** recipients also run through `_ID_Management` and `_ID_Institution` (G10).
- **Other tables point back at these records.** `Letter._ID_PreBooking` (2,485), `Letter._ID_WaitingRoom`
  (1,203), `Letter._ID_Agreement` (453), `Letter._ID_Exam` (403) and `WorkFlow._ID_PreBooking` (5,770 since
  2025) tie letters and work-log lines to records of this area. Those fields belong to the letters and
  history review. Once the intake and the waiting list come across, those letters can be filed under them.
