# SchoolMan, understood

A study of CASA's FileMaker database, `SchoolMan`, so the staff workspace can grow beside it
without repeating its mistakes and without losing what is in it.

**The direction (Rahman, 2026-10-15).** "We are not migrating the system as of now, we are creating
our parallel system." The workspace grows beside SchoolMan. A bridge brings data across **slowly and
selectively, never all at once**, so the new system is not filled with FileMaker's volume or its
defects. Staff get the workspace **one module at a time** so they get used to it. Nothing in
SchoolMan is lost while the team moves out of it. And first: understand everything in FileMaker.

**Status: research.** Everything here was read from the live `SchoolMan.fmp12` through FileMaker Pro
on the office Mac, **read-only, counts only** — no value of a person leaves FileMaker — on
2026-10-15, plus the July 2026 DDR for screens and scripts. Nothing has been imported and the
workspace's schema has not changed for it. Read with `docs/FILEMAKER_LESSONS.md` (the defects and the
rule for each) and `docs/FILEMAKER_BRIDGE.md` (the bridge design).

## The pages

| Area | Page |
| --- | --- |
| People, their e-mail addresses, phones and addresses | [people.md](people.md) |
| Organisations — schools, companies, agencies, and the `Management` party record | [organisations.md](organisations.md) |
| Intake — enquiries, pre-bookings, the waiting list, tests, offers | [intake.md](intake.md) |
| Bookings, the business lines, booked periods | [bookings.md](bookings.md) |
| Courses, exams, lessons and attendance | [courses.md](courses.md) |
| Money — charges, payments, instalments, invoices, commission, payouts | [money.md](money.md) |
| Accommodation — host families, rooms, stays, rent | [accommodation.md](accommodation.md) |
| Letters, the work log and notes — and what leaves SchoolMan | [letters-and-history.md](letters-and-history.md) |
| Staff, working time and holidays | [staff.md](staff.md) |
| The Klassenbuch — the teachers' app that reads and writes SchoolMan | [klassenbuch.md](klassenbuch.md) |
| The screens the team works in, and what they teach | [screens.md](screens.md) |
| Which fields are in use, rare, abandoned or never used — per table, generated | [fields.md](fields.md) |

Generated files, all in `output/filemaker/` (gitignored, counts and names only): one
`<Table>.profile.json` per table studied (67), `vocabularies.md` (all 87 reference tables),
`ddr_scripts_layouts.md` (screens, the 40 main scripts, the learner's way through the scripts, what
leaves, what deletes), `table_layouts.csv`, `table_script_writes.csv`, `script_index.csv`,
`table_activity_2026-10-15.csv`, `table_counts_2026-10-15.tsv`.

---

## SchoolMan in numbers *(live)*

| | |
| --- | --- |
| Tables | 231 — 87 of them vocabularies (705 rows) |
| Rows | **780,557** |
| Screens and scripts | 328 layouts · 1,353 scripts with 36,706 steps; 214 scripts are navigation buttons, 373 are called by nothing (DDR) |
| In use | 84 tables were written to in 2026; 57 not since before 2024, mostly vocabularies and side tables |

**A year of CASA in SchoolMan** — 2026 to mid-October, counted by each table's own date: 2,915
bookings · 3,295 booked periods starting · 837 enquiries and 1,209 pre-bookings · 911 test results ·
6,153 lessons · 67,524 attendance marks · 11,305 charges · 8,193 payments · 1,591 payouts · 14,985
letters · 19,471 staff working days.

*Count by the table's own date, not its creation date.* Lessons, course weeks and staff days are
generated ahead and keep an old or no creation date; the lesson date, the week, the day tell what is
in use. Letters only go back to 2025 in this file (`Letter.fmp12`, a separate file, was not in the
backup the DDR came from).

### Fields: most are not in use

Of the 2,470 stored fields of the 40 main record tables (constants and audit fields left out), **1,055
were filled on a row created since 2025** — 43%. 111 more are rare (a handful of rows a year), **372
were used once and abandoned** (the year they were last filled is in `fields.md`), and **932 were never
filled at all**. Many of the 1,055 are themselves copies, stored summaries or search helpers. The
bridge reads from the first group only, and checks each field against `fields.md` before it is used:
a field filled on 41 rows in 2007 is not a fact about anyone today.

### The business lines

`Booking` is the one booking table. Each business line ("platform") adds an empty one-to-one record
to a booking, and the names are metaphors whose labels are partly out of date:

| Platform | Table | Label in FileMaker | What it really is | Bookings |
| --- | --- | --- | --- | ---: |
| 1 | `InternationalAirport` | Sommerkurse, Juniorkurse, Schulklassen | **The intensive courses** (14,519 *Intensiv*, plus exam prep, *Super*, junior, group) | 15,166 |
| 4 | `CentralStation` | Englisch und Spanischkurse Abend | Evening, special and company courses | 4,924 |
| 2 | `NationalAirport` | TestDaF und Prüfungen | Exams and exam preparation | 2,354 |
| 6 | `BusStop` | Geschlossene Gruppen | Closed groups (since 2026) | 36 |
| 8 | `TransitHall` | Wohnungsvermittlung | Housing placement — empty | 0 |

---

## How SchoolMan works — five habits

1. **Every step is a button.** Nothing runs on its own except a few nightly jobs; only 76 steps in the
   whole file call another script. A colleague drives the learner forward screen by screen — and the
   scripts carry bugs nobody sees: the conversion from pre-booking to booking uses four variables it
   never sets, so staff type the client id by hand (`bookings.md`).
2. **Link records hold no facts.** Enquiries, pre-bookings, the waiting list and the business-line
   tables are rows of ids. The facts live in a few places: the person, a period's dates, a charge's
   amount, a payment, a test result, a course.
3. **Copies and stored summaries.** The learner's name and birth date are copied onto every booked
   period; schedules, balances and attendance counts are stored as text and numbers and rewritten
   by scripts; vocabulary labels are copied into every row that uses them.
4. **Prices are script text.** Course, exam and accommodation prices are typed into scripts.
5. **Values nobody checks.** Statuses sit at their default (four in five pre-bookings); ids and labels
   share a field (`Email`, `1\r3`); some "links" are not links (`_ID_Provider` is a second serial
   number; `Management._ID_Platform` holds `-12`); payment dates in 2029 and 2323.

The workspace already avoids most of these (`docs/FILEMAKER_LESSONS.md` §12). The bridge must not
bring them back: it reads facts, never copies, summaries, defaults or script prices.

## The learner's way through SchoolMan

`NewContact` makes an enquiry and its pre-booking → details added one button each (person, e-mail,
phone, address, test) → maybe the waiting list → **`Go_PreBooking_Booking.Parameter`** converts it
into a learner number, a booking and its business-line record → a course is chosen and the booked
period gets its dates → the learner's lessons are imported from the course → charges are written
(course price from the script, books one by one, enrolment fee once) → payments, instalments,
invoices → letters at every step (187 letter scripts: confirmation, reminders, visa letter, student
card, receipts) → attendance in the class book → the certificate of participation, sent as PDF.

## What leaves SchoolMan

E-mail mostly through each colleague's own mail program; six scripts send directly by SMTP and nine
store a mail password in the script. 117 Excel/CSV exports to the colleague's Documents folder.
WhatsApp messages with a prepared text. No script calls a web service; the Data API is opened by
privilege sets (`letters-and-history.md`).

**Credentials in plain text.** Nine scripts store a mail password; the `Management` screen's comments
hold what looks like a password, a SIM PUK and an account number (`organisations.md`). None of it is
copied into these pages; all of it should be changed and kept in the password manager.

---

## Where the workspace stands

✓ the workspace does it · ◐ partly · ✗ not yet

| Area | SchoolMan *(live rows)* | Workspace today | |
| --- | --- | --- | --- |
| People | `Person` 15,509 · `Email` 13,983 · `Phone` 14,609 · `Address` 12,944 | `people`, `emails`, `phones` — no addresses | ◐ |
| Organisations | `Management` 3,771 · `Institution` 1,914 · `Corporate` 788 · `Agency` 120 | `organisations`, `organisation_contacts` (for offers) | ◐ |
| Intake | `Contact` 5,072 · `PreBooking` 6,081 · `WaitingRoom` 1,958 · `TestStudent` 5,940 | the inboxes, placement, with status and owner | ✓ new intake · ✗ history, waiting list |
| Offers | `Offer` 397 · `DateOffer` 5,026 | `offers`, `offer_lines`, `letters` | ✓ |
| Bookings | `Booking` 22,488 · `DateBooking` 20,206 | `bookings`, `booking_periods` | ◐ |
| Courses and exams | `Course` 1,331 · `Exam` 134 · `SingleDateCourse` 34,016 | the catalogue, Kursplanung, rooms; terms and exams read into seeds | ◐ |
| Attendance | `SingleDateStudent` 70,732 | — | ✗ |
| Money | `CostDetail` 79,482 · `PaymentIn` 51,523 · `PaymentOut` 6,348 | `booking_charges`, `payments`, the price lists | ◐ |
| Accommodation | `Accommodation` 142 · `DateAccommodation` 2,465 | vocabularies only | ✗ |
| Letters and history | `Letter` 33,213 · `WorkFlow` 109,870 | offer letters; notes and history on every record | ◐ |
| Staff and working time | `StaffMember` 82 · `SingleDayStaff` 86,664 | workspace accounts, teachers, absences | ◐ |

## The parallel system and the bridge — principles

1. **Each side owns what it does.** The workspace is the record for what it already does — new
   intake, offers, placement review, price lists, planning. SchoolMan stays the record for bookings,
   money, letters and accommodation until a module moves.
2. **The bridge reads; it does not write.** Writing into SchoolMan needs its own account and the
   decisions in `docs/FILEMAKER_BRIDGE.md` §7, later.
3. **Per record, on demand.** A person, their bookings, their balance — read when a colleague opens
   them, linked once (`filemaker_links`), never a table copied in bulk.
4. **Facts only.** No copies, stored summaries, balances, defaults or script prices come across.
5. **A module moves when the workspace can do the whole job**, and the team that uses it is ready —
   one at a time. In the end everything moves (Rahman, 2026-10-15); money last, because finance
   works there daily beside DATEV.

## Method — the same for every table

`python3 scripts/filemaker/profile_table.py <Table> --ddr <field catalogue>` reads every stored field
through FileMaker Pro (`scripts/filemaker/fm_read.py`, AppleScript) and writes filled and distinct
counts to `output/filemaker/<Table>.profile.json`. It never writes to FileMaker and never prints a
person's data — only counts and the distribution of ids and short vocabularies. The field catalogue
is `~/Tasks/10-active/work/casa-google-business-audit/output/filemaker_ddr/ddr_field_catalog_20260706.csv`.

An **auto-entered** field is not necessarily a copy: the amounts on a charge are auto-entered and
real; a gender label copied from a vocabulary is a copy. Each is judged by what it holds.

## Open questions for the team

Answered (Rahman, 2026-10-15):
- the booking status, and who resolves *u.B.* — whoever works on the learner (`bookings.md`);
- that SchoolMan has no edit mode and everyone can change everything (`screens.md`);
- payouts, commission, host payments and time sheets — finance, beside DATEV, with an automated
  DATEV link to design later (`money.md`);
- host families — Natalia (`accommodation.md`);
- that everything moves in the end (`staff.md`).

Attendance and time sheets are recorded in the Klassenbuch (`klassenbuch.md`).

Still open; each page ends with its own:

1. The 3,135 bookings still at *???* — old and forgotten, or new and not yet looked at (`bookings.md`)?
2. Receipts, confirmations and missing-information letters are about half of all letters — build those
   first (`letters-and-history.md`)?
3. What finance exports to DATEV today (Rahman asks finance, `money.md`).
