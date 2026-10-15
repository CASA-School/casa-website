# FileMaker → workspace: the migration map

Where every part of SchoolMan lands in the staff workspace, what is missing on our side, and the
order to move it in, one table at a time. Started 2026-10-15 at Rahman's request: "understand
FileMaker properly … see what is missing in each of our tables so we will be able to migrate the
data and map everything to our new system … start with one table and keep moving to the others."

**Status: research.** Nothing is imported and no schema has changed for it yet. Every number marked
*(live)* was read on 2026-10-15 from the live `SchoolMan.fmp12` through FileMaker Pro on this Mac,
read-only. The rest comes from the July 2026 DDR. Read with `docs/FILEMAKER_LESSONS.md` (what not to
carry over, and why) and `docs/FILEMAKER_BRIDGE.md` (the intake bridge and the three phases).

---

## Method — the same five steps for every table

1. **Profile it live.** `python3 scripts/filemaker/profile_table.py <Table> --ddr <field catalogue>`
   reads every stored field through FileMaker Pro (AppleScript, `scripts/filemaker/fm_read.py`) and
   writes filled and distinct counts to `output/filemaker/<Table>.profile.json` (gitignored). It never
   writes to FileMaker and never prints a person's data, only counts and the distribution of id
   fields and short vocabularies. 131 fields of `Person` take about a minute. The DDR field
   catalogue is `~/Tasks/10-active/work/casa-google-business-audit/output/filemaker_ddr/ddr_field_catalog_20260706.csv`.
2. **Sort the fields** into: *source data* (carry it), *role links* (rebuild them from the other
   side), *derived copies* (auto-entered from another field — never carried), *constants* (`_1 = 1`
   relationship anchors), *search helpers*, *never used* (0 filled), *sensitive* (decide), *unknown*
   (ask the team).
3. **Map** the source data to our columns, and list what our table lacks.
4. **Decide** the open points with Rahman (who goes in, how far back, which facts we keep).
5. **Import** through staging: every row keeps its `filemaker_links` entry (source table, record id),
   and anything odd becomes a `record_flags` row, never a silent fix (LESSONS §11). Verify by counts
   against the live profile.

---

## SchoolMan in numbers *(live, 2026-10-15)*

| | |
| --- | --- |
| Base tables | 231 (230 readable; 87 of them vocabularies with 705 rows between them) |
| Rows | **780,557** |
| Fields | 9,755 — a large share of each big table is calculations (`Booking`: 130 of 291) |
| Layouts / scripts / relationships | 328 / 1,350 / 1,736 (DDR) |
| Growth since the July backup | +24,797 `SingleDateStudent`, +6,677 `WorkFlow`, +5,040 `Letter`, +977 `Booking` |

About **242,000 rows (31%) are per-day or per-week expansions** — `SingleDayStaff` 86,664,
`SingleDateStudent` 70,731, `SingleDateCourse` 34,016, `SingleDateOccupancy` 10,133 and the rest of
the `Single*` family. Most say again what a booking's or a course's dates already say; a few carry a
real fact per day (attendance on `SingleDateStudent`, hours worked on `SingleDayStaff`). The rule from
the rooms port holds: carry the fact, not the calendar.

### The business lines — what the metaphor names mean *(live)*

`Booking` is the one booking table. Each business line ("platform") adds a one-to-one extension
record to a booking — all but four rows of the three tables below point at a booking that exists. The
labels in `PlatformReference` are partly out of date, so the table says what the bookings are.

| Platform | Table | Label in FileMaker | What the bookings really are | Bookings |
| --- | --- | --- | --- | --- |
| 1 | `InternationalAirport` | Sommerkurse, Juniorkurse, Schulklassen | **The intensive courses**: 14,519 *Intensiv*, 343 exam prep, 162 *Super*, 78 junior, 49 group | 15,166 |
| 4 | `CentralStation` | Englisch und Spanischkurse Abend | Evening courses (3,067), special courses (1,305), company (245), exam prep (226), one-to-one (52) | 4,924 |
| 2 | `NationalAirport` | TestDaF und Prüfungen | Exams: 1,454 `OBSTD`, 570 exam prep, 321 with a course type id that has no label (`14`) | 2,354 |
| 6 | `BusStop` | Geschlossene Gruppen | Closed groups, all 2026 | 36 |
| 8 | `TransitHall` | Wohnungsvermittlung | Housing placement — the table is empty | 0 |
| — | `Underground`, `Harbour`, `AuPair`, `CyberSpace`, `WatchTower` | company teaching, partner schools, au pair, … | no table of their own | — |

So "the platform" is the workspace's course type or product line, not a separate kind of booking.

---

## The map

✓ the workspace has the model · ◐ partly · ✗ missing · — not carried over (proposed)

| Area | FileMaker *(live rows)* | Workspace today | | What is missing on our side |
| --- | --- | --- | --- | --- |
| **People** | `Person` 15,509 · `ID_Student` 7,052 · `Email` 13,979 · `Phone` 14,605 · `Address` 12,940 · `BankAccount` 1,945 · `Flag` 206 | `people`, `emails`, `phones`, `countries` | ◐ | Addresses; gender beyond the salutation; mother tongue, place and country of birth, occupation; the `Flag` → ISO country mapping (`countries.filemaker_flag_id` is empty). Table 1 below |
| **Organisations** | `Institution` 1,914 · `Corporate` 788 · `Agency` 120 · `Management` 3,771 · `Provider` 17 · `Contractor` 3 · `Internship` 56 · `JunkMall` 479 | `organisations`, `organisation_contacts` | ◐ | Built for offers only: no agency terms or commission, no company status, no link from a person to the organisation they belong to. `Management` (3,771) looks like the relationship record between CASA and an organisation — to confirm |
| **Intake** | `Contact` 5,068 · `PreBooking` 6,077 · `WaitingRoom` 1,957 · `Source` 913 · `TestStudent` 5,940 | `enquiries`, `course_registrations`, `exam_registrations`, `placement_*` | ◐ | New intake lives here already; the history is not imported. No waiting list. Placement results there are mostly free text (LESSONS §5) |
| **Offers** | `Offer` 397 · `DateOffer` 5,025 | `offers`, `offer_lines`, `letters` | ✓ | The model is new (0021–0022). Old offers are letters; whether to import them is a decision. `DateOffer` (amount, subject, offer type, course type) — to look at |
| **Bookings** | `Booking` 22,483 + the platform extensions above · `DateBooking` 20,202 · `WeekOfCourse` 10,392 · `Group` 52 | `bookings`, `booking_periods` | ◐ | The model exists (0010); one local booking. Per-booking facts the extensions carry, levels approved and confirmed, visa, the platform as a course line |
| **Courses and exams** | `Course` 1,331 · `DayTime` 1,338 · `DateCourse` 1,338 · `LevelStep` 200 · `Session` 116 · `Exam` 134 · `SingleDateExam` 270 · `BookInUse` 49 · `Classroom` 29 | `course_instances`, `course_groups`, `course_types`, `levels`, `day_times`, `exam_sessions`, `exam_types`, `materials`, `rooms`, `locations` | ✓/◐ | Rooms are ported (0008); terms and exam dates are read from FileMaker into seeds (0006). The past courses and who taught them are not |
| **Teaching and attendance** | `SingleDateCourse` 34,016 (each lesson) · `SingleDateStudent` 70,731 (each learner, each day) · `SingleDateControl` 7,535 · `WeekDay` 11,807 · `SingleDateHoliday` 8,978 · `DateHoliday` 1,094 | `plan_assignments`, `teachers`, `teacher_absences` | ◐/✗ | Attendance and lesson content are the class book. Whether that history comes here at all is a decision |
| **Accommodation** | `Accommodation` 142 (host families and flats) · `Room` 416 · `DateAccommodation` 2,465 (a learner's stay) · `DateRent` 543 · `StatementLandlord` 751 · `SingleDateOccupancy` 10,133 · `SpecialAccommodation` 36 · `AnimalAtHome` 29 · `Key` 118 · `CleaningDetail` 125 · `SingleWeekCleaning` 781 | `accommodation_types`, `accommodation_room_types`, `catering_options` (vocabularies only) | ✗ | Host families, their rooms, a learner's stay, rent to landlords, statements |
| **Money** | `CostDetail` 79,468 (charges) · `PaymentIn` 51,520 · `Instalment` 4,128 · `Invoice` 1,335 · `Commission` 4,869 · `PaymentOut` 6,348 · `CostDetailSample` 1,780 · `Order` 506 / `OrderDetail` 2,139 | `booking_charges`, `payments`, `rates`, `charge_types` | ◐ | Invoices, instalment plans, agency commission, payments out (landlords, refunds), book orders. LESSONS §6 on the stored running totals |
| **Letters and documents** | `Letter` 33,189 · `WorkFlowLetter` 18,935 · `LetterServices` 252 · `Emanuel` 92 · `Medium` 129 · `Signature` 18 · `TextModule` 9 · `Item` 679 · `PlaceHolder` 336 · `Url` 104 | `letters`, `letter_texts` | ◐ | Only offer letters exist. Confirmations, visa letters and certificates are the next kinds |
| **Work log and notes** | `WorkFlow` 109,842 · `AdminWork` 14,483 · `Log` 3,410 · `Comment` 1,413 · `Complaint` 23 | `staff_notes`, `staff_activity`, `day_tasks` | ◐ | `WorkFlow` links to 136 kinds of record (LESSONS §3.2); a row says what it is about only by which column is filled |
| **Staff and working time** | `StaffMember` 82 · `SingleDayStaff` 86,664 · `SingleWeekStaff` 7,452 · `SingleMonthStaff` 2,810 · `SingleYearStaff` 268 · `DateStaffAtWork` 1,869 · `DateTargetWorkTime` 313 · `WeekDayWorkTime` 1,329 · `Shift` 59 · `Purview` 90 · `Hades` 171 · `Agreement` 664 · `OperationField` 553 · `SalaryDetail` 189 | `staff_users`, `teachers`, `teacher_absences` | ◐/✗ | Working time, holidays and pay are HR. Whether they belong in the workspace is a decision; they hold sensitive data |
| **Calendar and FileMaker's own** | `SingleDayCalendar` 4,748 · `SingleWeekCalendar` 776 · `SingleMonthCalendar` 168 · `YearOfCalendar` 11 · `LayoutNavigation` 328 · `Script` 52 · `GlobalValue` · `Colour`, `Logo`, `Graphic`, `Device`, `Touch`, `Segment`, `Start`, `SimpleCalculator` … | — | — | Generated calendars and the database's own interface. Not data to carry |
| **Vocabularies** | 87 `…Reference` tables, 705 rows | course types, levels, accommodation and room types, catering, charge types, materials — each a table with a `code` and its `filemaker_id` | ◐ | Ported when the table that uses them is. `SelectionDetail` (85 rows) holds 23 unrelated lists (LESSONS §4.3) |

---

## Order of work

Each step needs the one before it — everything else points at a person.

1. **People** with their email addresses, phone numbers and addresses, and the vocabularies they use
   (countries from `Flag`, gender, mother tongue). *Started below.*
2. **Organisations** — schools, companies, agencies — and the people who work there.
3. **Catalogue history** — past courses and exam sittings (the current ones are already seeded).
4. **Bookings** with their periods and the platform as the course line.
5. **Money** on the bookings — charges, payments, instalments, invoices, commission.
6. **Intake history** — enquiries, pre-bookings, the waiting list, placement tests.
7. **Accommodation** — host families, rooms, stays, rent.
8. **Letters and the work log.**
9. **Staff and working time** — only if decided.

---

## Table 1 — `Person` → `people` *(live)*

### Who is in it

`Person` is every human SchoolMan knows, not the learner register. Its own role links are not kept
up: before 2021 almost no one has a student id, and a person created since 2024 who has not booked
carries no link to their enquiry. Roles have to be read from the tables that point at the person.

| Pointed at by | People |
| --- | --- |
| `Booking` (any platform) | 7,044 |
| `Contact` (enquiries) | 5,002 |
| `PreBooking` | 5,272 |
| `TestStudent` (placement) | 2,686 |
| `WaitingRoom` | 1,109 |
| **Any learner table** | **8,800** |
| `StaffMember` | 75 (324 people carry a staff id) |
| `Accommodation` (as the host) | 105 (1,286 people carry a host or landlord link; 589 are members of a host family, by `_ID_Status_Family`: Vater, Mutter, Tochter …) |
| Contacts at an organisation (agency, company, institution, provider) | about 1,400 |
| None of the tables above points at them | 1,674 |

New people per year: about 450–900 until 2020, **2,113 in 2022**, 1,821 in 2023, 1,683 in 2024,
1,631 in 2025, 1,263 so far in 2026.

### The fields — 131 stored, about twenty worth carrying

| Kind | Fields (filled of 15,509) | Goes to |
| --- | --- | --- |
| **Identity** | `__ID_Person` (one duplicated key) | `filemaker_links` |
| | `ZFirstName` 15,159 · `ZSurName` 15,229 · `ZSurName2` 34 · `NickName` 286 | `first_name`, `last_name`; a second surname and a nickname are new columns or dropped |
| | `_ID_GenderReference` 15,327: Frau 8,091 · Herr 7,219 · Divers 14 · 3 typed values | `salutation` (`ms` / `mr` / `mx`) |
| | `DateOfBirth` 10,279 (66%) · `YearOfBirth` 956 | `birth_date`; a birth year alone has no column yet |
| | `_ID_Homeland` 10,899 (70%) — ids of `Flag`, whose short codes are German three-letter abbreviations (`Ägy`), not ISO; 94 people point at 72 deleted flags | `nationality_code` through a `Flag` → ISO table, matched on the German name |
| **Facts our table lacks** | `Occupation` 4,934 · `_ID_Mothertongue` 1,275 · `BirthPlace` 1,263 · `NumberPassport` 1,262 · `_ID_CountryBirth` 545 · `Function` 526 (job title at an organisation) · `_ID_Status_Family` 589 | new columns, another table, or not carried — decisions 3 and 4 |
| **Audit** | `DateOfCreation` / `TimestampCreation` 15,507 · `UserName` (62 names) | `created_at`, `created_by` |
| **Role links** | `_ID_Student` 7,051 · `_ID_Client` 6,341 · `_ID_Management` 4,427 · `_ID_Contact` 3,859 · `_ID_Accommodation` 1,296 · `_ID_Institution` 1,131 · `_ID_Corporate` 842 · `_ID_Landlord` 336 · `_ID_StaffMember` 324 · `_ID_WaitingRoom` 162 · `_ID_Agency` 150 · … | rebuilt from the tables that point at the person, when those are imported; `_ID_Student` also kept in `filemaker_links` |
| **Derived copies** (auto-entered) | `Gender_1/2`, `Gender_Neutral*`, `Homeland_1`, `Country_1/2`, `CountryLong_1`, `MotherTongue_1/2/Long`, `CountryBirth_1/2`, `Salutation.Formal/Informal_1/2`, `Lieber_D`, `Adjective_1`, six birthday fields, `DateOfBirth.1900`, `_MonthDay`, `ThisYear`, `EnumerateNationality` — and `DateOfDeath` (10,291), which is filled exactly where a birth date is: a misnamed calculation, not a fact | not carried |
| **Constants** | `_0`, `_1`, `_2`, `_3`, `_4`, `_23`, `_24` | not carried |
| **Search helpers** | six `Searchfield*`, `FirstCharakter.*`, `First2Charakters.WholeName`, `Token`, `ValueFind` | not carried |
| **Never used** (0 filled) | `Priority`, `Title`, `AcademicTitle`, `CommentOnPerson`, `NumberVAT`, `Homeland_2`, `StatusFamily`, `Adjective_2`, `ContactForm_2`, `filter_txt_f/s`, `_ID_Third`, `_ID_Import`, `_ID_Activity`, `_ID_Underground`, `_ID_Instrument`, `_ID_Chosen`, `_ID_Mentor`, `_ID_Department`, `_ID_Limbus`, `_adjust_ID_Platform` | not carried |
| **Form of address** | `_ID_Salutation`: Sie 10,064 · Du 101 | not carried — CASA says „du" to everyone now |
| **Sensitive (staff)** | `NumberTaxe` 86 · `NumberAgeInsurance` 86 · `NumberHealthInsurance` 41 · `AccountNumber` 41 — tax, pension and health-insurance numbers | **not into `people`** — decision 4 |
| **Unknown** | `Number1–4` (about 246 each) · `Salutation_1` 95 · `ContactForm_1` 87 · `_ID_Member` 34 · `_ID_Editorial` 8 · `_ID_Touch` 6 | ask the team |

### Contact channels

| | Rows | People with one | One per person | Kind recorded |
| --- | --- | --- | --- | --- |
| `Email` | 13,979 | 12,047 | 11,374 | 39% (privat 4,146 · Arbeit 933 · Agentur 143 · alternativ 103) |
| `Phone` | 14,605 | 12,095 | 10,773 | 47% (privat 2,768 · Handy 2,633 · Arbeit 792 · Fax 73) |
| `Address` | 12,940 | 11,501 | 11,130 | almost none |

Of the 8,800 learners, 8,312 have an email, 7,635 a phone and 7,535 an address. `Email.Priority`
is never set, so nothing says which address is the main one — the newest is the best guess. Some
channel rows belong to an agency or a company rather than a person (about 1,200 emails have no
person).

### What `people` needs before an import

- an **`addresses`** table (one owner, a kind, street, postcode, city, country) — learners' letters
  and invoices need it, and we have none;
- the **`Flag` → ISO** country mapping, matched on the German name, with the 72 deleted ids flagged;
- `filemaker_links` allowed to hold the person's two keys (`__ID_Person`, `_ID_Student`) — it does,
  for `person`;
- the columns decided below.

### Decisions for Rahman

1. **Who goes into `people`** — the 8,800 learners only, with staff, hosts and contacts at
   organisations arriving with their own areas (step 2, 7, 9)? Or everyone now?
2. **How far back** — all since 2007, or people with any activity since a cut-off year (2021, when
   the student ids begin, covers most bookings)?
3. **Which extra facts** the workspace keeps about a learner: mother tongue, place and country of
   birth, occupation, a birth year when the date is unknown, passport number (visa letters use it).
4. **Staff HR numbers and bank accounts** stay out of the learner register — agree?
5. **Duplicates** — 501 probable duplicate people (LESSONS §1.2): import them as they are and let the
   workspace's duplicate check queue them, or match them first?

---

## Next

Rahman decides the five points above → the people import is designed (staging table, mapping,
dry run with counts) → `Email`, `Phone`, `Address` and the country mapping with it → step 2,
organisations, profiled the same way.
