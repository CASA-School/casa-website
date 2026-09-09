# What FileMaker taught us not to do

A catalogue of the defects, redundancies and habits inside CASA's FileMaker
database `SchoolMan`, each with the evidence it was measured from, what it
costs today, and the rule the new system follows instead. It is the design
constitution for everything the workspace grows from here — and the checklist
for the day FileMaker's data is imported (`docs/FILEMAKER_BRIDGE.md` §0,
phase 3).

Evidence sources: the 2026-07-06 DDR (231 tables, 9,755 fields, 1,736
relationships), a read-only Data API probe on 2026-09-09 marked *(live)*, and
the dashboard project's own reconciliations and post-mortems in
`~/Tasks/10-active/work/casa-google-business-audit/notes/`. Nothing here is a
guess; where a cause is unknown it says so and goes to §11.

The one-sentence version: **FileMaker's structure is not the main problem.
Fifteen years of data entered around a structure that never said no is.** So the
rules below are as much about constraints and defaults as about tables.

---

## 1. Identity — one person, one key

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 1.1 | **Two identity systems side by side.** `_ID_Person` and `_ID_Student` both identify the learner; the student id is only created at conversion to a Booking. | 72 tables carry both columns. 8,385 of 15,344 persons have no `_ID_Student` *(live)*. The read bridge joins Booking→Person through `_ID_Student` because the direct FK was never proven. | Every join has to choose a key; a person who enquired but never booked is invisible to any student-keyed query. |
| 1.2 | **Duplicate people.** | 501 probable duplicates (same first name, surname, date of birth) across 462 groups; one duplicated primary key `19829` *(live)*. | Two records, two histories, two invoices. Rosters double-count; the same learner gets two invitations. |
| 1.3 | **Contact channels belong to "whichever entity owns them".** `Email`, `Phone`, `Address` each carry 20–30 optional `_ID_*` columns. | `Email` has `_ID_Person`, `_ID_Student`, `_ID_Booking`, `_ID_Agency`, `_ID_Enquiry`… On `Email`, `_ID_Student` is populated on a minority of rows and `_ID_Person` on a different minority (roster note). 4,835 of 4,926 Contacts have no `_ID_Email` link *(live)*. | A hand-written join on any one key silently drops most learners. Only FileMaker's own relationship graph resolves an address. |
| 1.4 | **Exports expose the wrong id.** The legacy Pecunia export's `_ID_Person` overlapped the Person table on 4 of ~34,000 rows. | `FILEMAKER_ARCHITECTURE.md`, "The ID System". | Months of dashboard counts were built on a key that joined nothing. |

**Rules.** One `person_id` (uuid) per human, from first contact. "Student" is a
state a person is in, never a second key. Contact channels are typed rows
(`email`, `phone`, `address`) with exactly one owner column, a `kind`, a
`verified_at` and an `is_primary`. Duplicate detection runs at intake
(normalised email · surname + date of birth · phone) and is a human decision to
*link*, recorded in `staff_activity`; merges keep both histories and never
delete. Every export and every API response carries the real primary key and
nothing else that looks like one.

**Bridge.** `filemaker_links` stores `__ID_Person` and `_ID_Student` as two
source keys on one workspace person. Neither is ever shown as *our* identity.

---

## 2. Keys and types — constraints the database enforces

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 2.1 | **Primary keys without guarantees.** | 115 of 227 `__ID_*` fields have no UNIQUE validation; 4 are not indexed (`TestStudent.__ID_TestStudent` among them); 4 are not auto-enter serials. | Duplicate `19829` was possible. A lookup on a test result's own key is a table scan. |
| 2.2 | **Keys typed inconsistently.** | 155 `_ID_*`/`__ID_*` fields are Text; the rest Number. `LevelReferenceSchool` ids are decimals (`3.5`). | Joins that work by accident until a value has a leading zero or a space. |
| 2.3 | **Multi-value foreign keys.** | `PreBooking._ID_Platform` contains `'4\r1'` on 2 rows; `Contact._ID_TypeContactReference` contains `'1\r3'` *(live)*. | A "which platform" question has two answers in one cell. |
| 2.4 | **Dates as text, two-digit years, two formats.** | 62 date-like fields are Text. Exports use `DD.MM.YY` for birth and registration dates and `DD.MM.YYYY` for bookings; the Data API returns `MM/DD/YYYY`. The dashboard needs a `YY < 30 → 20YY` rule. | Ambiguous after 2030. Every consumer re-implements the parsing. |
| 2.5 | **Constants as relationship anchors.** Fields named `_1`, `_2`, `_3`… hold a fixed `1`, `2`, `3` so a relationship can be drawn against them. | 544 such fields across 225 tables; Booking has 31. `PreBooking::_1 = 1` anchors `Corporate.IDActive_PreBooking`. | Relationships that are really filters, unreadable in the graph and untranslatable to a foreign key. |

**Rules.** `uuid` primary keys, `NOT NULL`, unique and indexed by construction —
the migration tooling writes them, not a person. Every foreign key is a typed
column with a real constraint. Nothing that is a list is stored in a scalar. All
dates are `date` or `timestamptz`, stored in UTC, exchanged as ISO 8601, and
converted exactly once at the FileMaker boundary (already the case in
`live_api_sync.convert_fm_date`). A filter is a `WHERE` clause; a relationship
is a foreign key; there are no magic constants.

---

## 3. Schema shape — narrow tables, one fact in one place

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 3.1 | **Very wide tables, half of them derived.** | `Booking` 291 fields, 130 calculated (44%). `DateBooking` 187/94 (50%). `Person` 159/71. `Course` 173/62. | Every record read carries a hundred computed values; every schema change touches a calculation somewhere. |
| 3.2 | **"Link to everything" rows.** | `WorkFlow` has 136 `_ID_*` columns; `Booking` 84; `Letter` 82; `Offer` 53. `CostDetail` can point to a booking, student, person, course, accommodation, agency, corporate, project, cost type *and* cost reference. | No row states what it is *about*; consumers infer it from which of 136 columns happens to be filled. |
| 3.3 | **Audit columns copied by hand.** | `DateOfCreation` exists on 182 tables, `UserName` on 159, `DateOfChange` on 137, `Comment` on 71 — each defined separately. `Contact.UserName` is a plain field; `PreBooking.UserName` is a calculation. | The same idea, defined 182 times, drifting. |
| 3.4 | **Same fact in three places.** | `_ID_StatusPreBooking` on `Contact`, `PreBooking` *and* `WaitingRoom`; the three accommodation references on all three; `_ID_VisaRequired` on all three. Bilingual labels as `_1`/`_2` field pairs (`Gender_1`/`Gender_2`, `Country_1`/`Country_2`) — 13 such pairs on `Person` alone. | Which copy is true is a matter of which layout you were on. |
| 3.5 | **Graph and code that nothing uses.** | 1,736 relationships over 1,782 occurrences; `Person` appears as **150** occurrences, `Booking` 68. 228 relationships with non-equality predicates, 8 Cartesian. 380 of 1,350 scripts (28%) are referenced by no button and no other script. 81% of fields are on no layout. Two fields are referenced by nothing at all. 7 tables are empty. | A change anywhere may have a blast radius nobody can see. The July graph edit was rolled back for exactly this reason. |
| 3.6 | **Naming by metaphor.** | `InternationalAirport` (groups), `NationalAirport` (exams), `CentralStation` (evening English/Spanish), `BusStop` (closed groups), `TransitHall` (housing), `Harbour`, `Underground` (company), `CyberSpace`, `RunWay`, `WatchTower`. `StatusStudent` ∈ {Runner, Unicorn, LastDance, Rookie}. | A glossary is required to read a table name; a "status" field that is not a status. |

**Rules.** A table is one concept; a row states what it is about through one
required subject. Derived values are views or generated columns, never stored
twice. `created_at`, `updated_at`, `created_by` come from one convention applied
by tooling. Translations live in a `labels` table keyed by locale. Every table,
column, index and constraint is referenced by a query or an endpoint, and a CI
check fails when one is not (the SQL equivalent of the `knip` gate). Names are
the domain's own words — *course*, *exam*, *accommodation*, *company* — in one
language, and a status field holds a status.

---

## 4. Vocabularies and status — say what you mean, once

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 4.1 | **A yes/no table doubling as the status of three others.** `DecisionReference` = {1 ja, 2 nein, 3 offer, 4 u.B., 5 grau, 6 Undefined} is the vocabulary of `_ID_StatusPreBooking`, `_ID_StatusContact` and `WaitingRoom._ID_Status` *(live)*. | 4 is the auto-enter default. | "Grey" and "Undefined" are stored states. The default is indistinguishable from "someone chose in-progress". |
| 4.2 | **Unknown as a value.** | New Bookings get `_ID_EnrolmentDone = 5`, whose label is `???` *(live)*. | The most common state of a new booking is a shrug. |
| 4.3 | **One enumeration table for 23 unrelated domains.** | `SelectionDetail` (85 rows) holds yes/no, enrolment states, exam parts, messengers, week lengths, ticket categories and a text module, told apart by `_ID_Selection`. | Nothing stops an exam part id being written where a messenger id belongs. |
| 4.4 | **Labels stored in id columns.** | `Contact._ID_TypeContactReference` holds `'1'`, `'2'`, `'Email'`, `'Besuch im Büro'` and `'1\r3'` *(live)*. | Any read must accept both ids and typed strings, in two languages. |
| 4.5 | **Reference rows without ids.** | `ExamReference` "B1 Prüfung", two *OBS* course types and the *Underground* platform returned no primary key *(live)*. | A booking can point at a row that cannot be pointed at. |
| 4.6 | **Status is optional, so it is not maintained.** | 4,755 of 5,888 pre-bookings still sit at the default *(live)*. `_ID_LevelConfirmed` blank on 67% of bookings, `_ID_LevelApproved` on 80%. | FileMaker cannot answer "has this been dealt with?" — the question the workspace exists for. |

**Rules.** One enumeration per concept, in a Postgres `enum` or a dedicated
reference table with a `CHECK`, named for the concept (`work_status`, not
`decision`). No `???`, `Undefined` or `grey` values: unknown is `NULL`, and where
the reason matters it has its own column. Reference rows are seeded from
version-controlled files, immutable, with stable ids and labels in both
languages; a row without an id is a constraint violation, not a quiet
oddity. A status change is an **event with an actor and a time**
(`staff_activity`), and the status column is what the last event says — so the
default is never mistaken for a decision. This is already how the workspace's
queues work; it stays that way.

---

## 5. Levels and test results — numbers, not prose

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 5.1 | **Placement results are free text.** | `TestStudent.Result`: 3,769 of 5,814 rows are text, 1,413 are `x/y` fractions, 188 numbers, 444 blank. The actual percentage is typed into `CommentTest` (`'90%'`) on 1,032 rows *(live)*. | Sixteen years of placement evidence cannot be averaged, compared, or used to calibrate anything. |
| 5.2 | **Two level scales, one of them split.** | `LevelStepReference` has 13 steps including `B1+1`/`B1+2` and `C1.3`; `LevelReferenceSchool` has 10 incl. `TD`, `CH`, `SK`, `ND`; the workspace's `BAND_SEQUENCE` has 11 with a single `B1+`. | Every level comparison needs a mapping table and a judgement about `B1+`. |
| 5.3 | **Level history as a sorted string.** | `cal_HistorialStudent` lists levels across all courses *including future bookings*, sorted by level not time — a flag built on it fired on 9 of 13 learners (roster note). | Looks like a timeline; is not. |

**Rules.** A test result is `score numeric`, `max_score numeric`,
`percentage` generated, plus the structured decision the engine produced —
exactly what `placement_attempts.decision` already stores. One canonical level
scale owned by the new system, with FileMaker's `LevelStepReference` ids kept as
`source_primary_key`; the `B1+` split is decided once, in that table. A history
is rows with dates, never a concatenated string.

---

## 6. Money — a ledger, not a scoreboard

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 6.1 | **Running accumulators stored on rows.** | `acc_CostGross` on a portal row read `12,478,516.48` beside a real `CostGross` of `336`; `acc_PaymentIn` `12,180,912.34` beside a payment of `100`. A 2026-07-05 export selected the accumulator and shipped nonsense totals (confirmed bug, `STUDENT_DOSSIER_FILEMAKER_MAP`). | The dashboard hides balances behind a `costAmountsReliable = false` flag. Nobody trusts a total. |
| 6.2 | **A charge with eight optional parents.** `CostDetail` links to booking, student, person, course, accommodation, agency, corporate, project. | DDR field list. | Who owes what to whom is inferred from which columns are filled. |
| 6.3 | **Commission, outgoing payments and third-party payers unmodelled.** | "Not fully normalised… treat as next-stage finance surfaces" — dossier note. | Agency commissions and refunds live in people's heads and in `PaymentOut` rows nobody reports on. |

**Rules.** Finance is append-only rows — `charges`, `payments`, `refunds`,
`commissions` — with exactly one payer and one subject each; totals are queries,
and nothing that sums is stored. Polymorphic links go through a typed join
table. Every money row records who entered it and when. This is **phase 2** and
is validated line by line with Finance before anything is trusted.

---

## 7. Counting and definitions — one query per number

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 7.1 | **The wrong thing counted as "registrations" for months.** | The dashboard counted `Person::DateOfCreation` (2,470 for 2019) where the HZA report counts Bookings (3,854). Corrected 2026-08-21. | Headline KPIs, trends and forecasts were people-created metrics with the wrong label. |
| 7.2 | **Two sources for one attribute that disagree.** | Course type on the Booking row vs. on the linked Course row: 157 intensive bookings apart in 2025. HZA totals still not reproducible. | No count matches the report Finance already trusts. |
| 7.3 | **Batch imports and gaps read as history.** | 615 persons "registered" on 07.06.2007; 108 on 19.12.2010; ~2,500 blank countries mostly pre-2012. | Trends before 2012 are artefacts of migrations, not demand. |

**Rules.** Every KPI has a written definition, one SQL view, and a test that
reproduces a known external figure (the HZA report is the first). An attribute
lives in one place. Imports carry an `imported_at` and a `source_batch` so a
migration day never masquerades as a busy day.

---

## 8. Deletion and retention — nothing disappears by hand

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 8.1 | **Operational history deleted.** In June 2026 `SchoolMan` dropped from ~30,100 to ~15,000 persons and ~52,500 to ~21,500 bookings; the rest survives only in the `SchoolMan2024` archive file, which lacks the `_API` layouts. | `SYNC_HANDOFF.md`; the dashboard now merges a preserved snapshot with the live file. | Every consumer must reconcile two databases with different layouts. Conflicting booking ids `31270` and `35382` are still open. |

**Rules.** Soft delete only (`deleted_at`, `deleted_by`, reason). Retention is a
written policy with a named owner, executed by a scheduled job that logs what it
removed, never by a person in a client. One database; the archive is a
partition or a flag, not a second file.

---

## 9. Interface baked into the data

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 9.1 | **UI state stored in the schema.** | 478 global fields; a `Graphic` table with 46 container fields holding button images; `Add_row`, `Delete_row`, `Excel`, `Flag`, `SchoolLogo 1` appear as *fields* on data layouts; `Url` columns on Contact, PreBooking, WaitingRoom, Course. | The schema cannot be understood without the screens. |
| 9.2 | **Files inside the database.** | 141 container fields in 40 tables. | The `.fmp12` is 726 MB and grows with every PDF; backups copy every file every night. |
| 9.3 | **Business logic only reachable through a screen.** | `Go_PreBooking_Booking.Parameter`'s first 15 steps include `Show Custom Dialog`, `New Window`, `Freeze Window` — none run under the Data API. | Automation cannot call the logic; it has to be re-implemented or duplicated (`docs/FILEMAKER_BRIDGE.md` §3a). |

**Rules.** UI state lives in the client. Files live in object storage with a
`documents` table (owner, kind, checksum, retention). Business logic is a
service the UI calls — the same function a job or an API calls — and nothing
that changes data requires a window to be open.

---

## 10. Access and operations

| # | Defect | Evidence | Cost |
| --- | --- | --- | --- |
| 10.1 | **One personal, full-access credential for everything.** | `FileMaker SRV` is Werner's own `[Full Access]` account; it is also his macOS login on the server *(live, both verified 2026-09-09)*. Every bridge run has used it. | "Read-only" is a promise, not a property. Rotating it locks out the owner. |
| 10.2 | **Single machine, LAN-only, backs up to itself.** | Mac Mini `10.0.60.10`; nightly backups under `/Library/FileMaker Server/Data/Backups` on the same disk, plus NAS Time Machine. No VPN for services (WireGuard for people only). | Azure cannot reach it; a disk failure takes the live file and its backups together. |
| 10.3 | **No test environment; changes made live by hand.** | The server hosts exactly two databases, `SchoolMan` and `SchoolMan2024` *(live)*. Structural changes are made in FileMaker Pro with XML snapshots as the safety net. | A wrong relationship edit was attempted and rolled back live in July. |
| 10.4 | **Spelling and language drift in identifiers.** | `Enrolment` (×23) beside English `Enrollment` elsewhere; `Accommdation` ×6; `Origen` ×7; `Historial`; `Adressee`; `Messanger`; `Charakter`; `Projet` layout. German, English and metaphor mixed in one table. | Every mapping is hand-checked because nothing can be pattern-matched. |

**Rules.** Per-purpose service accounts with least privilege, secrets in a
manager, rotation without lockout. Managed Postgres with point-in-time
recovery and off-site backups, restore rehearsed. Schema in git, applied by
tooling, a database per branch (the workspace has this today). A naming
convention checked by lint, one language, and a glossary for anything that
must stay German-first.

---

## 11. What we inherit anyway — and how it is imported

Some of the above cannot be fixed at the source. It arrives on import day
with the following completeness *(live)*:

| Gap | Extent |
| --- | --- |
| Date of birth blank | 5,210 of 15,344 persons (34%) |
| Homeland blank | 4,602 (30%) |
| Surname blank | 273 · first name blank 342 |
| Pre-booking with no course and no exam | 2,183 of 5,888 (37%) · no course type 1,585 (27%) |
| Pre-booking platform blank | 4,174 (71%) |
| Booking with no course | 2,327 of 22,206 (10%) |
| Test result blank or unparseable | 444 blank; ~3,800 text |
| Test not linked to a booking | 2,011 of 5,814 |

**Rules for import.** Every imported row keeps its source triplet
(`source_database`, `source_layout`, `source_record_id`) and a
`quality_issues` list; nothing is "fixed" silently — the migration project's
draft batch already works this way and surfaced 23 such issues. Completeness
is shown in the UI as a per-record indicator, and a missing fact is asked for
at the next contact (FileMaker's own `MissingItemContact` list is the
checklist). Duplicate candidates are queued for a human, never merged by a
script.

---

### 11.5 Rooms — the first table ported (2026-09-09)

`Classroom` (29 rows), `LocationReference` (8) and `Floor` (5) were read live
and became `locations` / `rooms` in migration 0008. What the port changed:

| Found | Rule applied |
| --- | --- |
| Booleans as `1`/`2`; one row carries `21` | Real booleans. Anything that is not `1` is false |
| Offices (`1. OG Werner`, `2. OG Buchhaltung`, `Studienleitung`, `Keller Lehrer`, `KG Studien`) and the `EG 7 Glaskasten` in the classroom table, with capacity 0–3 | `rooms.kind` — classroom / office / meeting / other. Only classrooms can be planned into |
| `CapStudent` and `MaxStudent`, two capacities, no definition | Named: `capacity` (planning) and `capacity_max` (ceiling), with a check that max ≥ capacity. `0/0` becomes NULL |
| `CityClassRoom` — the room's everyday name ("Berlin", "Hamburg") | A first-class `nickname` column, unique |
| `_ID_Shown` (in the picker or not) separate from `_ID_Active` | `is_bookable` and `is_active`, both meaningful |
| Location `Inhouse` / `InhouseOn` / `OnlineGroup` / `OnlineOne` mixed with buildings | `locations.kind` — site / client / online |
| Per-date occupancy in `SingleDateOccupancy` (5,616 rows) and `SingleDayOccupancyClassroom` | Not ported. A cohort → room assignment plus dates answers the same question without a materialised row per day |

Every imported row carries a `filemaker_links` entry (`Classroom` /
`LocationReference` record ids), so phase 3 updates these rows rather than
duplicating them.

## 12. What the workspace already does right

Keep these; they are the opposite of §1–§10 by construction:

- `uuid` primary keys, `NOT NULL`/`UNIQUE`/indexed from the migration files;
  one `work_status` enum shared by every queue.
- Status is an event with an actor (`staff_activity`) and a single `staff_notes`
  table — not a comment column on 71 tables.
- No UI in the schema; a server-only database layer; migrations in git with a
  checksum that refuses an edited-after-apply migration.
- Fixtures are separate from real data and never applied to a real database.
- Every request from the public site keeps its own `request_id`, so a retry
  cannot make a second person.

---

## 13. Questions only Werner can answer

Understanding *why* a defect exists is the difference between avoiding it and
re-creating it in a new shape.

1. What do `Runner`, `Unicorn`, `LastDance`, `Rookie` mean, and is that a status
   or a marketing label?
2. What does `_ID_EnrolmentDone = 5` (`???`) mean operationally?
3. Why the constant anchor fields (`_1 = 1`) — a FileMaker-version limitation,
   or a habit? (Decides whether phase-3 relationships can be plain FKs.)
4. When and why is an `ID_Student` created — is "student" a payment state, an
   attendance state, or a conversion state?
5. Why was operational history removed in June 2026, and is `SchoolMan2024`
   complete?
6. `Person.GroupId` defaults to `30063` (≈ total student count) — what is it?
7. Which of the 380 unreferenced scripts are run by schedule or by hand?
8. Are the reference rows without ids (`B1 Prüfung`, *OBS*, *Underground*)
   missing serials, or hidden by the API layout?

---

## Sources

- DDR: `casa-google-business-audit/output/filemaker_ddr/SchoolMan_DDR_20260706/` (UTF-16) and the parsed `ddr_*_20260706.csv` files.
- Live probe 2026-09-09: read-only Data API, layouts `Student_API`, `Contact`, `PreBooking`, `Booking_API`, `TestStudent` and nine reference layouts; aggregates only.
- `FILEMAKER_ARCHITECTURE.md`; `notes/FILEMAKER_LIVE_CHANGE_LESSONS_AND_RELATIONSHIP_REDUNDANCY_2026-07-06.md`; `notes/FILEMAKER_RELATIONSHIP_DEPENDENCY_MAP_2026-07-06.md`; `notes/HZA_20A_FILEMAKER_RECONCILIATION_2026-08-19.md`; `notes/STUDENT_DOSSIER_FILEMAKER_MAP_2026-07-05.md`; `notes/STUDENT_SURFACE_SAMPLE_LOAD_DIAGNOSTICS_2026-07-06.md`; `notes/TEAM_ORG_FILEMAKER_DEEP_DIVE_2026-07-11.md`; `bridge/ROSTER_EXTRACTION.md`; `bridge/SYNC_HANDOFF.md`.
