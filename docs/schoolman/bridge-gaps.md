# SchoolMan → workspace: what the bridge still leaves behind

2026-10-20. Read-only desk study: `docs/schoolman/*`, the 17 readers (every `table()`/`column()` argument
extracted per reader), the importers' skip rules, `db/migrations`, the per-table profiles in
`output/filemaker/` and the importer summaries of the first live run (2026-10-20, run 3). Nothing was run against
FileMaker or a database. Counts and field names only.

**How to read the counts.** "Filled" is all rows; "since 2025" is filled on rows created since 2025 (the
profile's `recent`). Where a field is auto-entered (`*`) the count says little about use. Some field
meanings are inferred from the field name and the study pages — these are marked *(?)* and should be
confirmed with the team before anything is built.

**Since 2026-10-26** the FileMaker session's review adds what this page did not have (copied fields that never update, night-job writes, missing tables and link ids, duplicate keys): `mapping-review-2026-10-26.md`. Fixed the same day:
generated birthday texts kept out of attendance comments; a payment without a label copy named by its
charge type (`_ID_CostDetailReference`); refunds' comment from `Comment`; an invoice's amount from its cost
lines when `Invoice::Amount` is empty; the waiting list's course through its pre-booking (0 → 147 entries
locally); lesson days SchoolMan re-planned under new numbers relinked to them (80), and future days it
dropped removed unless changed here, attended or merged. Then: exam parts and examiners (`read_exams.py`); an organisation's
history from the work log (8,977 lines on 178 organisations locally; lines about learners the workspace does
not hold stay in SchoolMan). SchoolMan's teacher plan (`DateStaffAtWork`) matched Kursplanung's pairs in 80 of
90 group-months and was not brought across.

**Since 2026-10-27 (migration 0092, completeness review of people, staff and organisations):** passport numbers,
a birth year alone, mother tongue and countries by their ids, notes on e-mail addresses, a bank account's comment and
addresses, an organisation's own accounts, every internship host, the commissioning bodies, the parties' active flags and
main contacts, the teachers' levels, trainings, leave requests, target hours per weekday and the time worked outside the
lessons come across (people.md, staff.md, organisations.md §Completeness review). Rows marked *(0092)* below are closed.

**The one gap behind most of the others: the sample.** Everything about learners is cut by `sample.py`:
a booked period this week or in the next four weeks, plus this year's group participants. Run 3 brought
673 people of 15,514, 2,338 bookings of 22,488, 2,254 periods of 20,206, 451 stays of 2,465, 9,804
letters of 33,218, 1,696 follow-ups of 7,455. Two kinds of learner fall out of it by design:
**anyone starting more than four weeks ahead** (visa learners book months ahead), and **exam-only
candidates** (an exam booking has no `DateBooking` period, so the sample never sees them).

Since 2026-10-26 the sample reaches every booking from this week on, however far ahead, and the bookings
set to „nein" or „storno" in the last four weeks: a learner moved to January or cancelled had kept their
old place in the workspace (B1.1 #4786 showed 17 where SchoolMan had 15). Exam-only candidates are still
outside.

---

## 1. Learners / people

**Comes across:** the sample's person, e-mails, phones, address, nationality, birth place/country, mother
tongue, occupation, customer number, bank accounts, tests, notes, history, letters.

**Missing fields in use**

| SchoolMan field | Filled · since 2025 | What the team uses it for | Verdict |
| --- | ---: | --- | --- |
| `Person.NumberPassport` | 1,262 · 414 | Passport number for visa letters and telc registration. Rahman decided it comes along (people.md, decision 1) and `people.passport_number` exists (0029). | **done *(0092)*:** read and imported (474 in the sample). |
| `ID_Student` (learner number), `Booking.__ID_Booking` | 7,055 · 2,020 | The SchoolMan learner and booking numbers. They are on receipts, so learners and finance quote them. Both are stored (`filemaker_links`, `bookings.filemaker_booking_id`) but no screen shows them. | **needed for daily work.** The data is there; only the display is missing. |
| `Email.CommentUseMail`, `Phone.CommentUse` | 367 · 32 / 1,481 · 5 | A note on a channel, e.g. "only WhatsApp" *(?)* | e-mail notes **done *(0092)*** (`emails.note`, `organisations.email_note`); `Phone.CommentUse` abandoned (none in 2026) |
| `BankAccount.Comment`, `AddressAccountOwner`, `AddressBank` | 209 · 31 / 65 · 54 / 78 · 60 | Notes on refunds, and the account holder's address for foreign transfers | **done *(0092)*** (`note`, `holder_address`, `bank_address`) |
| `SpecialStudent` (table, no profile) | 53 rows · 12 since 2025 | Unknown. Possibly special needs. *(?)* | **ask the team first.** It may hold health data. |

**Rows left out by the rules (run 3)**

| Left out | Why |
| --- | --- |
| ~14,840 people (15,514 − 673), incl. ~8,100 learners | Outside the sample (decision: whole population vs sample) |
| 9 bookings without a period | Not exams and no dates; what was about them went on the person |
| 6 likely twins | Imported and flagged for a colleague to link (duplicates rule) |

---

## 2. Bookings and periods

**Comes across:** the booking with status (ja/u.B./???/nein mapped), visa needed, payer
(agency/company), group and exam links. The period comes with its dates, course, level (from the
course) and group index.

**Missing fields in use.** The intensive team's working screen holds most of these (screens.md,
InternationalAirport).

| SchoolMan field | Filled · since 2025 | What it is for | Verdict |
| --- | ---: | --- | --- |
| `Booking._ID_LevelConfirmed`*, `_ID_LevelApproved`* | 7,542 · 6,783 / 4,652 · 4,390 | Whether the teacher confirmed the level, set from the Klassenbuch (klassenbuch.md). The workspace shows „Niveau nicht bestätigt" although SchoolMan already holds the teacher's answer. | **needed for daily work.** It decides the next course. |
| `Booking._ID_Success`, `_ID_ShownUp` | 1,981 · 500 / 4,217 · 501 | Whether the course went with or without success, and whether the learner showed up. They drive the certificate and the show-up letters. | **needed for daily work** |
| `Booking._ID_MissingItemReference` | 2,754 · 1,133 (155 combinations) | Which documents are still missing. The missing-information letter (757 sent in 2026) is written from it. | **needed for daily work** |
| `Booking._ID_VisaPaymentDone`* | 20,835 · 6,850 | The visa payment arrived. The receipt script sets it once more than 200 € is paid. | leave in SchoolMan. Compute it from the payments, never import a stale flag. |
| `Booking._ID_Prolongation`, `_ID_LongTerm`, `_ID_Welcome` | 18,779 · 5,747 / 8,295 · 3,928 / 5,059 · 2,244 | Follow-on booking, long-term learner *(?)*, welcome done *(?)* | useful later. Prolongation partly follows from the periods. |
| `Booking._ID_Project`, `DateBooking._ID_Project`, `Booking._ID_Contractor` | 3,748 · 1,346 (7 values) / 1,631 · 704 / 3,964 · 878 (3 values) | A funding or project tag (Bildungszeit, Jobcenter?) and a contractor *(?)* | useful later (reporting, funders). **Ask** what the values are. |
| `Booking._ID_ExamReference` | 2,357 · 796 | Which exam an exam-prep learner aims at | useful later |
| `Booking._ID_LearningAgreement`, `_ID_ScheduleCheck`, `_ID_Local`, `_ID_ApplicationInternet` | 899 · 405 / 1,776 · 211 / 7,317 · 156 / 5,068 · 65 | Agreement exists; schedule checked; inland or abroad; online application | leave in SchoolMan (flags with little left) |
| `Booking.CertificateText`* | 22,088 · 6,450 | The certificate's wording. Already listed as having no place yet. | useful later (with the certificate) |
| `DateBooking._ID_Level`, `_ID_DayTimeReference` | 20,175 · 6,051 / 18,072 · 5,816 | The period's own level and time of day. The bridge takes both from the course instead, so the 1,161 periods without a course keep only their dates. | useful later. Cheap fix for course-less periods. |

**Rows left out by the rules (run 3)**

| Left out | Why |
| --- | --- |
| ~20,150 bookings, ~17,950 periods | Outside the sample |
| 1,161 periods "of a course not here" | They are on courses before the 12-month course window (past courses), or on one of the 19 starts that are not in the workspace (§3). They are kept with dates only. |

---

## 3. Courses and lesson days

**Comes across:** the courses running or ahead, matched onto the starts from seed 0006. Each brings its
type, dates, time of day, level, title, places, price and hours, the learner count per week (1,017
course weeks), the lesson days with teacher, room, substitute and particularity (4,574), and the
weekday plan.

**Missing fields and tables in use**

| SchoolMan | Filled · since 2025 | What it is for | Verdict |
| --- | ---: | --- | --- |
| `Comment` rows with `_ID_Course` | 764 · 380 | Notes on a course. This is 54% of all `Comment` rows. | **across since 0094**: notes on the course page („Notizen“), 133 on 75 courses locally (`read_history.py`) |
| `Course.CommentOnCourse` | 63 · 62 | The teacher's course note, written from the Klassenbuch | useful later (with the Klassenbuch bridge) |
| `WorkFlow` lines with `_ID_Course` | 63,478 · 26,102 | The course log. Lines that also name a learner come across; lines on the course alone do not. Overlap not measured. | useful later |
| `Course._ID_Exam` | 97 · 25 | Links an exam-prep course to its sitting | useful later (Exams) |
| `Course._ID_CourseCourseStartMailSent` | 963 · 274 | The course-start mail has gone out | leave in SchoolMan (the workspace keeps letters) |
| `Course.IncentivePercent`, `_ID_Incentive`, `Supplement` | 202 · 87 / 179 · 48 / 199 · 57 | Unknown *(?)*: a discount, a teacher bonus, or a surcharge | **ask the team** |
| `Course.CapGroup` | 563 · 202 | A second capacity field. Which capacity is the real one is an open question (courses.md). | useful later |
| `Session`, `LevelStep` (tables) | 116 / 200 rows · 28 / 48 new in 2026 | The term plan: terms and the level steps run in each. Today it reaches the workspace only through the hand-made seed 0006. | useful later. The bridge could refresh the starts instead of the seed. |
| `SingleDateCourse` lesson content and homework | — | Written by teachers in the Klassenbuch | leave in SchoolMan (decided: the Klassenbuch's) |

**Rows left out by the rules (run 3)**

| Left out | Why |
| --- | --- |
| 19 courses "without a start of ours" | An intensive or evening course whose first day matches no start in the workspace. The importer makes no starts for these two types, because the starts are the website's. |
| 48 course weeks, 700 lesson days "of a course not here" | They belong to those 19 courses and to courses outside the window |
| 21 lesson days in a closure | Generated inside the Easter 2027 closure. Correct to drop. |
| All courses outside the window (1,166 of 1,331; 165 were read) | Past courses. An open item in ADMIN_WORKSPACE. |
| 0 group courses linked | Every group course ended before the window |

---

## 4. Attendance

**Comes across:** 35,380 attendance rows of the sample's bookings, read only. 10,413 of them sit on a
lesson day the workspace has.

| Gap | Count | Verdict |
| --- | ---: | --- |
| Attendance of learners outside the sample | ~35,000 rows (70,732 − 35,380) | leave in SchoolMan. It is the Klassenbuch's (decided). |
| Absence notices kept in the work log (`WorkFlow._ID_Absence`, `SingleDateAbsence`, `NumberMinute`, `_ID_Excuse`) | 818 · 421 | **across since 0094**: day, lessons, minutes and excused on the history line (591 locally); „Abwesenheit gemeldet“ on the booking's attendance day |
| 24,967 imported rows that point at a lesson day the workspace lacks | — | These follow from "past courses" (§3) |

---

## 5. Exams

**Comes across:** 94 exam bookings of the sample, 14 sittings linked and 9 made (as drafts), and the
licences for the exams in the catalogue.

| Gap | Filled · since 2025 | Verdict |
| --- | ---: | --- |
| **Exam-only candidates.** An exam booking has no period, so the sample never takes in a candidate who is not also in a course. | The exam line has 363 new bookings in 2026; 94 came across | **needed for daily work.** The candidate list, the telc report and the places are incomplete. |
| `SingleDateExam`: the parts of a sitting, each with its day, hours and kind (oral or written), and the examiner on 67 of them | 270 rows · 34 new in 2026 | **needed for daily work.** `exam_session_examiners` exists (0039) and the bridge leaves it empty. |
| `PreBooking._ID_Exam`, `_ID_ExamReference` | 616 · 448 / 741 · 456 | useful later. The exams people asked for at intake. |
| `AdminWork` with `_ID_Exam` | 161 | leave in SchoolMan (working time) |

| Left out (run 3) | Why |
| --- | --- |
| 1 exam booking | TestAS, which the catalogue does not offer |
| 4 staff licences | For exams not in the catalogue (TestDaF / TestAS kind) |

---

## 6. Money

**Comes across:** for the sample's bookings: charges (8,687), payments (6,867), refunds (96),
instalments (414), commission lines (892), payouts (968), invoices (642) and invoice numbers on the
charges (268).

**Missing fields in use**

| SchoolMan field | Filled · since 2025 | What it is for | Verdict |
| --- | ---: | --- | --- |
| `PaymentIn._ID_CostDetail` | 20,245 · 13,439 | Which charge a payment settles. Receipts list it. | **across since 0094** (`payments.charge_id`, 15,252 locally; „für …“ on the payment line) |
| `PaymentIn._ID_Instalment` | 1,045 · 221 | Which instalment a payment paid | **across since 0094** (`payments.instalment_id`, 484 locally; „bezahlt am …“ on the instalment) |
| `PaymentIn._ID_StaffSchool` | 50,336 · 18,870 (41 values) | The office account that booked it; `StaffSchool` names its colleague (completeness review 2026-10-27) | **across since 0094** (`payments.recorded_by_staff_id`, 28,927 locally, 10 colleagues) |
| `CostDetail._ID_Course` | 48,156 · 17,501 | Which course or period a charge belongs to. It matters on bookings with several periods. | useful later |
| `CostDetail._ID_ProductDelivered` | in use (1 / 2) | Books handed out: red until the learner has them, green after | **across since 0087** (`booking_charges.handed_out`) |
| `CostDetail._ID_BookReference` | 33,080 · 12,031 (41 books) | Which book a book charge is for | **across since 0094** (`booking_charges.material_id`, 13,876 locally) |
| `CostDetail._ID_CostDetailReferenceComment`, `_ID_CancellationSet` | 14,715 · 4,915 / 32,857 · 9,192 | A standard sub-label of the charge („Storno“ marks the reversing copy), and the reversal pair (original and copy) | **across since 0094** (`booking_charges.reversed`, 12,772 locally; the sub-label is the comment's source where a line has none). A „Storno“ line's day comes from `DateOfCreation` (its timestamp is the year 1) |
| `PaymentOut.ZStartDate`/`ZEndDate`, `_ID_BankAccount`, `_ID_MethodPayment`, `_ID_Person` | 1,276 · 1,112 / 3,342 · 2,659 / 3,954 · 1,748 / 5,589 · 2,107 | For rent to a host: the period it covers, the account, the method and the payee | **period and method across since 0094** (1,170 periods locally); `_ID_BankAccount` is Rahman's decision; `_ID_Person` is the booking's learner (a copy) |
| `Invoice._ID_Reversal`, `_ID_Group`, `_ID_Offer`, `_ID_Institution`/`_ID_Management` | 26 / 6 / 22 / 214 | Cancelled invoice numbers, group invoices and invoices to other parties | **across since 0094** (`invoices.cancelled` 25, `group_visit_id` 5, `offer_id` 14 locally; the party or institution billed) |

**Rows left out by the rules (run 3)**

| Left out | Why |
| --- | --- |
| ~70,800 charges, ~44,650 payments, and most instalments, commission, payouts and invoices | Outside the sample |
| 445 instalment, commission, payout and invoice rows | Their booking or organisation did not come across, e.g. one of the 9 period-less bookings, or a party outside the 195 |
| 143 lines with no amount | Deliberate: nothing to show |

---

## 7. Organisations and agencies

**Comes across:** 195 organisations: the agencies and companies the sample, the groups and the offers
name, plus 71 other parties with a relation. With them come 236 contacts, 13 commission terms, the
payer on 1,169 bookings and 2,321 letters linked.

| Gap | Filled · since 2025 | Verdict |
| --- | ---: | --- |
| `Comment` rows on a party (`_ID_Management` 515 · 170, `_ID_Corporate` 89 · 45, `_ID_Agency` 14 · 8) | 618 · 223 | useful later, **after a screen**. These are notes on parties, and `Management`'s own comments hold credentials, so this text must be checked before any import. |
| `WorkFlow` lines on a company (`_ID_Corporate`) | 13,049 · 5,399 | useful later. Lines that also name a sample booking come across; the company's own log does not. |
| `Management._ID_ContactPerson`, `Agency._ID_ContactAgent` | 99 · 62 / 34 · 5 | **done *(0092)*:** `organisation_contacts.is_main` (59 marked). |
| Letters to parties (`Letter._ID_Management`) | 1,642 · 1,640 | Letters that came across are linked to the party they went to (`_ID_Management`, `_ID_Institution`) since 0094; letters to a party alone stay in SchoolMan. |
| `Booking._ID_Contact` (the agency contact on a booking) | 1,563 · 28 | leave in SchoolMan (already "not yet" in organisations.md) |
| The ~3,576 parties no imported record names | — | leave in SchoolMan. Per-record by design; "which agencies are active" is still open. |

| Left out (run 3) | Why |
| --- | --- |
| 3 organisations | No name in SchoolMan |

---

## 8. Group visits

**Comes across:** all 52 groups, with parties, dates, people, comments, work log, offers, beds held
(`DateRent`), programme, services and internship places. 82 participant bookings come with them.

| Gap | Filled · since 2025 | Verdict |
| --- | ---: | --- |
| Participants of earlier years' groups | 712 group bookings in all; 82 came across | leave in SchoolMan (history; many are minors) |
| ~~`DateRent.Comment`~~ | 349 · 188 | **Done 2026-10-27 (0095):** whom the host takes (`accepts`), the rest as the note. |
| `DateRent._ID_Management`, ~~`_ID_Session`~~, `_ID_DateOffer` | 543 · 247 / 143 · 127 / 203 · 120 | `_ID_Session` **done 2026-10-27 (0095)**: beds held for an intensive-course term and its part of the day. The other two are copies (the place, the group's offer line). |
| Group stays (`DateAccommodation._ID_Group`) outside the sample | 700 · 234 | useful later. This year's are in. |
| Group letters (`Letter._ID_Group`) 23; group invoices 6 | — | useful later (groups.md already lists them) |

| Left out (run 3) | Why |
| --- | --- |
| 0 group courses linked | Every one ended before the course window |
| 127 programme, service, internship-place and cleaning rows | Their group or flat is not in the workspace. Five group numbers point at deleted groups, and most service rows date from 2018–2023. |

---

## 9. Offers

**Comes across:** 196 offers of 397 (199 read), with 871 lines, 127 letters and the worked-out answer.

| Gap | Filled · since 2025 | Verdict |
| --- | ---: | --- |
| Offers to learners outside the sample, and offers with no recipient | ~174 + 19 | leave in SchoolMan (decided, offers.md) |
| `Offer.DateOfEmission` | 397 · 164 | useful later. The date the offer went out, as distinct from when it was created. |
| `Offer._ID_CourseTypeReference`/`_ID_Level`/`_ID_DayTimeReference`/`_ID_Course` | 232 · 95 / 199 · 85 / 188 · 76 / 127 · 55 | leave in SchoolMan (the lines carry it as text) |
| `DateOffer` stay wishes (`_ID_AccommodationRoom`/`Catering`/`Type`) | ~200 · ~150 | useful later |

| Left out (run 3) | Why |
| --- | --- |
| 3 offers | Their recipient is not in the workspace |

---

## 10. Accommodation: host families, flats and stays

**Comes across:** all 142 places, 108 family members (name and role, as decided), 169 rooms, 542 group
reservations, 99 comments, rent payouts, letters to hosts and the cleaning plan. For the sample: 451
stays.

| Gap | Filled · since 2025 | Verdict |
| --- | ---: | --- |
| **Stays outside the sample** | 2,465 in all, 510 new in 2026; 451 came across | **needed for daily work.** Natalia's lists ("arriving soon", "no place yet"), the WG-Belegung and the hosts' rent all miss everyone who arrives more than four weeks out. |
| ~~**What a host offers: type, meals, room.**~~ | — | **Done 2026-10-27 (0095):** from `Management`'s offers, else the place's own; 121 / 121 / 95 places. Types 3, 4, 5 wait for their keys. |
| ~~**Pets.**~~ | — | **Done 2026-10-27 (0095):** `has_pets` from `_ID_Animal`, else `_ID_Pet`; 31 yes, 64 no. |
| `Accommodation._ID_Shown`, `_ID_PermanentOffer` | 141 · 38 / 37 · 13 | Listed or bookable, and permanently available *(?)* | useful later. **Ask Natalia.** |
| `DateAccommodation._ID_Agency`, `_ID_AccommodationEnquiry` | 1,097 · 442 / 110 · 75 | The agency that arranged the stay, and the enquiry to a host | useful later |
| ~~`Room._ID_InternalRoom`~~ | 199 · 15 | The room's number in the place, on the check-in letters | **Done 2026-10-27 (0095):** `accommodation_rooms.number`, 76 rooms |
| Letters to hosts and rent payouts for stays outside the sample | 752 letters (130 came across) | Follows the sample decision |
| `Letter._ID_EnquiryHost` (letters asking a host) | 73 · 73 | useful later |

| Left out (run 3) | Why |
| --- | --- |
| 1 stay | It has no dates |

---

## 11. Staff

**Comes across:** the 56 colleagues in the register, HR numbers for 35, roles (`Purview`), contract
periods, licences, absences from 90 days back to a year ahead (688), reception desks and shifts.

| Gap | Filled · since 2025 | Verdict |
| --- | ---: | --- |
| What a teacher teaches: `StaffMember._ID_Level`, `_ID_CourseTypeReference`, `_ID_DayTimeReference` | 51 / 59 / 36 (9 each since 2025) | course types and times since 0083; levels **done *(0092)*** (added while the planners have not set the rules). |
| `StaffMember.Login` | 78 · 15 | useful later. The FileMaker account name links a colleague to the Klassenbuch. |
| `StaffMember._ID_StatusSalaryReference`, `DateTargetWorkTime._ID_StatusSalarylReference` | 58 / 303 | useful later (HR, restricted) |
| Holiday requests with status: `DateHoliday` 1,094 (231 in 2026), `SingleDateHoliday` 8,978 (3,103 in 2026, `_ID_StatusHoliday`) | — | **done *(0092)*:** `staff_leave_requests` (kind, days, days approved). |
| Working time: `WeekDayWorkTime` 1,329, `AdminWork` 14,483 (~3,000 a year), `SingleMonthStaff` 2,810, `SingleYearStaff` 268, `SingleDayStaff` hours and adjustments | — | **done *(0092)*** for `WeekDayWorkTime` (`staff_target_days`), `AdminWork` (`staff_work_entries`), the hours carried and the approval day; a day's `Adjustment` is copied into `AdminWork` on adoption, the month's comment is SchoolMan's stamp (staff.md). |
| **Staff training:** `TrainingStaffMember` 26, `SingleDateTraining` 4, `TrainingReference` 7, all created in 2026 | 26 / 4 / 7 | **done *(0092)*:** `staff_trainings`, tab „Schulungen". |

| Left out (run 3) | Why |
| --- | --- |
| 46 absent days | The colleague is not in the register (former or inactive). 26 `StaffMember` rows are not in the register. |
| 4 licences | For exams not in the catalogue |

---

## 12. Letters and history

**Comes across:** for the sample: 9,574 letters with their text, 11,187 work-log lines, 596 notes,
1,696 follow-ups (139 open) and how 7,066 letters went. Also 130 letters to hosts and 2 complaints.

| Gap | Filled · since 2025 | Verdict |
| --- | ---: | --- |
| **`WorkFlow._ID_ProcessReference`**: the kind of each history line (accounting 53k, learning progress 25k, accommodation 6k, appointment 3k) | 97,172 · 44,540 | **across since 0094** (`history_processes`, `staff_activity.detail.process`; 66,732 lines locally). The full history filters by it. |
| `WorkFlow._ID_WorkFlowReference`, `_ID_History` | 50,162 · 27,267 (10 values) / 62,372 · 27,657 | `_ID_History` (a colleague typed the line) **across since 0094** („hat in SchoolMan notiert“); `_ID_WorkFlowReference` is a copy of the kind |
| `WorkFlow._ID_Completed` on learner lines (the „Kontrolle" tick, screens.md) *(?)* | 2,073 · 2,057 | useful later. Only the Tagesplan reads it. |
| Letters not on a sample booking or person: to parties 1,642, at pre-booking/contact/waiting-list stage 2,485 / 1,390 / 1,203, to staff 92 (timesheets 17), to groups 23, host enquiries 73 | — | useful later |
| `Letter._ID_Signature`, `_ID_PositionSignature` | 2,641 · 2,640 | The signer **across since 0094** (on the letter, 2,114 locally); the position is layout |
| `LetterServices` (letters to publishers) | 252 rows · 46 in 2026 | leave in SchoolMan (book orders came across without them) |
| Letters before 2025 (`Letter.fmp12`) | — | leave in SchoolMan (out of reach, known) |

| Left out (run 3) | Why |
| --- | --- |
| 5,759 follow-ups | Their booking is not in the workspace (outside the sample). Some are open reminders the workspace's „Wiedervorlage" view cannot show. |
| ~23,400 letters, ~98,700 work-log lines | Outside the sample |

---

## 13. Intake and waiting list

**Comes across:** 451 pre-bookings as notes (428 on their booking), and 539 tests as records, for the
sample's people.

| Gap | Filled · since 2025 | Verdict |
| --- | ---: | --- |
| **The waiting list: 0 entries imported.** `WaitingRoom._ID_Course` has been empty since 2023 (0 since 2025), and the importer only makes an entry when that field names a course. The course is on the pre-booking: `PreBooking._ID_Course` 3,138 · 1,329, `PreBooking._ID_WaitingRoom` 1,953 · 1,057. | 575 joined a waiting list in 2026 | **needed for daily work.** The workspace's waiting list is the signal for a parallel group (Rahman, 2026-10-16), and it is empty. Map it through the pre-booking. |
| Pre-bookings and tests of people outside the sample (people who enquired or were tested but have not booked into the window) | 1,209 pre-bookings and 911 tests in 2026 | useful later. New intake already lands in the workspace. |
| `Contact._ID_TypeContactReference` (how they got in touch) | 1,014 · 537 | useful later (marketing; values mixed) |
| `PreBooking._ID_Local`, `_ID_Platform` | 1,377 · 996 / 1,776 · 1,151 | leave in SchoolMan (inland or abroad, and the business line; the note covers it) |

| Left out (run 3) | Why |
| --- | --- |
| 2 pre-bookings | Their learner or course is not in the workspace |

---

## 14. Tagesplan (the day)

**Comes across:** 158 tasks from the shared calendar (30 days back, 180 ahead), 12 desks and 26
reception weekday shifts.

| Gap | Filled · since 2025 | Verdict |
| --- | ---: | --- |
| `WorkFlow._ID_Adressee` (whom a calendar task is for) | 176 · 21 | **across since 0094** (the task's assignee, through `StaffSchool`); the entry's title (`Subject`) stands before its text |
| `WorkFlow._ID_HighLightCalendar` | 424 · 38 | leave in SchoolMan |
| Calendar rows that are private, HR or exam notes (`_ID_PublicCalendar` = 2 and the like) | — | leave in SchoolMan (excluded on purpose) |
| The day's arrivals, departures and exam parts | — | These follow the stays (§10) and exam parts (§5). The day is only as complete as the sample. |

---

## Top 10 gaps for daily office work

| # | Gap | Size | Fix |
| ---: | --- | --- | --- |
| 1 | **The sample stops four weeks ahead and skips exam-only candidates.** Bookings, stays, money, follow-ups and letters of everyone arriving later are missing. | 2,338 of 22,488 bookings; 451 of 2,465 stays | Widen `sample.py` (decision below) |
| 2 | **Teacher's level confirmation, success and show-up** are not read | `_ID_LevelConfirmed` 7,542, `_ID_LevelApproved` 4,652, `_ID_Success` 1,981, `_ID_ShownUp` 4,217 | Read them onto the booking. The Klassenbuch already writes them into SchoolMan. |
| 3 | **Waiting list empty**: the bridge looks for the course in the wrong place | 0 imported; 575 joined in 2026 | Take the course from `PreBooking._ID_Course` through `PreBooking._ID_WaitingRoom` |
| 4 | **Missing documents per booking** | `_ID_MissingItemReference` 2,754 (1,133 since 2025) | Read the list; the missing-information letter needs it |
| 5 | ~~**Host offer and pets read from fields abandoned in 2024**~~ | Offer fields 128/122/95 on `Management`; `_ID_Animal` 90 | **Done 2026-10-27 (0095)** |
| 6 | **Exam sittings are incomplete**: external candidates, the oral and written part days, and the examiners | `SingleDateExam` 270; `exam_session_examiners` empty | **Parts and examiners done 2026-10-26** (`read_exams.py`: real hours on 76 sittings, 55 examiners); external candidates still open |
| 7 | **Follow-ups outside the sample** | 5,759 not brought | Follows #1 |
| 8 | **The kind of each history line** | `_ID_ProcessReference` on 97,172 lines | Read it; offer it as a filter |
| 9 | **Course notes** and ~~group-reservation notes~~ | `Comment` on courses 764 (380 since 2025); `DateRent.Comment` 349 (**done 2026-10-27**, 0095) | Read them onto the course |
| 10 | **Payment ↔ charge link and passport number** | `PaymentIn._ID_CostDetail` 20,245; `NumberPassport` 1,262 (decided to come; column exists) | Read both. Passport stays under the restricted module. |
| 8 | **The kind of each history line** | `_ID_ProcessReference` on 97,172 lines | **Done 2026-10-27** (0094): read, and a filter in the full history |
| 9 | **Course notes and group-reservation notes** | `Comment` on courses 764 (380 since 2025); `DateRent.Comment` 349 | Course notes **done 2026-10-27** (0094); reservation notes open |
| 10 | **Payment ↔ charge link and passport number** | `PaymentIn._ID_CostDetail` 20,245; `NumberPassport` 1,262 (decided to come; column exists) | The link **done 2026-10-27** (0094). Passport: read it; it stays under the restricted module. |

Close behind: show the SchoolMan booking and learner numbers on the booking (stored, not shown);
`DateBooking._ID_Level`/`_ID_DayTimeReference` for the 1,161 periods without a course.

## Decisions only Rahman can make

1. **Whole population or a wider sample?** A middle rule could be: every booking with a period not yet
   ended or starting within 12 months, plus every exam booking on a sitting ahead. That fixes gaps
   1, 6 and 7 and most of 10. *Partly decided 2026-10-21:* all of 2024 and 2025 come across (everyone with
   a booking whose period began in those years, with their history), for what is still open from them;
   2022–2023 and the rule ahead are still open. Measured that day, per year of a booking's first period:
   2024 4,249 bookings (127 owing 50,240 €), 2025 3,747 (112 owing 43,794 €). The open amounts agree
   with SchoolMan's own `cal_CostGross`/`cal_PaymentIn` (551 and 549 of 555); about 50 are an agency's
   net payment (paid equals `cal_CostCom`), 242 are on company bookings. `Booking._ID_PaymentThird`
   („Zahlung durch Dritte", yes/no, shown only with a company) now decides whether a company pays: Nein
   makes the learner the payer.
2. **Past courses.** Import the courses before the 12-month window (1,161 periods, 48 course weeks,
   700 lesson days hang on them), or keep only level and time on the course-less periods?
3. **The 19 SchoolMan courses with no start of ours.** Make starts for them (`on_website = false`),
   or correct seed 0006?
4. **TestDaF and TestAS.** Add them to the exam catalogue (1 booking and 4 licences are dropped), or
   leave them in SchoolMan?
5. **Teacher confirmations.** Read them from SchoolMan now, or wait for the Klassenbuch bridge?
6. *(answered: people.md decision 1; read since 0092)* **Passport number.** people.md says it comes along; learner-transfer.md and the reader said it does
   not. Which is right?
7. **Comments on parties** (618 `Comment` rows). Import them after a screen for credentials, or leave
   them in SchoolMan?
8. **Former colleagues** (26 `StaffMember`, 46 absent days). Add them to the register as "left", or
   leave them?
9. **Working time, holiday requests and staff training.** Which module takes them, and when (finance
   and the Klassenbuch)?
10. **Fields to ask the team about:** ~~`PaymentIn._ID_StaffSchool`~~ (answered 2026-10-27: the office account that booked it, read since 0094),
    `Booking._ID_Project`/`_ID_Contractor`/`_ID_LongTerm`, `Course.IncentivePercent`/`Supplement`,
    `Accommodation._ID_Shown`/`_ID_PermanentOffer` (Natalia), and the `SpecialStudent` table.

*Not covered:* field meanings marked *(?)* are inferred from names. The overlap between course or
company work-log lines and learner lines was not measured, because that needs the data.
