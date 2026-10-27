# The FileMaker bridge for the staff workspace

How CASA's two existing FileMaker integrations work, what the FileMaker side
actually looks like, and the design for connecting the workspace's
registrations to it. Written 2026-09-08 from the DDR export of `SchoolMan`
(2026-07-06 backup), the bridge code in
`~/Tasks/10-active/work/casa-google-business-audit/bridge/`, and the student
app's rollout tooling. Nothing here touched the live server.

**Status: design.** Nothing in this document is built. Section 7 lists what
must be decided, and by whom, before it can be.

**Verified live 2026-09-09** — read-only Data API probe from this machine over
WireGuard, as the account every previous agent used. Counts, layouts and every
vocabulary ID below marked *(live)* come from that probe, not from the July
DDR. Nothing was written.

**Revised 2026-09-09** after the direction was confirmed: CASA *will* write to
FileMaker, and the bridge is the first step of a larger plan — see §0. The
first draft said "never write Bookings"; that is now "not in phase 1".

---

## 0. The plan this serves

> **Direction, Rahman 2026-10-15 — this replaces the phase-3 bulk import below.** "We are not
> migrating the system as of now, we are creating our parallel system." The workspace grows beside
> SchoolMan; a bridge brings data across **slowly and selectively, never all at once**, so the new
> system is not filled with FileMaker's volume or its defects; staff get the workspace **one module
> at a time** so they get used to it; and nothing in FileMaker is lost while the team moves out of
> it. The first job is to understand everything in SchoolMan — `docs/schoolman/` holds that study.
> The phase table below still describes the order of responsibility, but read "Migration" as
> "SchoolMan becomes a read-only source the bridge can still reach", not as an import of its tables.

FileMaker is not being replaced by a bridge. It is being **strangled**: kept
as the record of truth while CASA's own system grows around it, first as the
place where new work *enters*, then as the place where data *lives*, until
FileMaker has nothing left to own and is retired. Three phases, each of which
is useful on its own and none of which requires a big-bang cutover:

| Phase | What CASA's system does | What FileMaker does | Truth lives in |
| --- | --- | --- | --- |
| **1 — Intake** | Receives enquiries and registrations, staff triage them, one click pushes each into FileMaker as a `Contact`+`PreBooking` pair. | Everything from there: conversion, dates, costs, payments, letters. | FileMaker |
| **2 — Full registration** | Creates complete registrations — course, exam, **accommodation, payment** — by running **FileMaker's own scripts** through the Data API (§3a). Reads FileMaker's people, bookings, courses and ledgers back into its own Postgres so staff see one picture. | Executes the business logic it already has; remains the system the finance team works in. | FileMaker, mirrored |
| **3 — Migration** | Owns the data. FileMaker's tables are imported into the normalised model the migration project has already drafted (§3b) and the direction of writes flips. | Read-only archive, then off. | CASA's system |

Two consequences run through the whole document:

- **The workspace schema must converge with the migration model**, not invent a
  third one. `filemaker-schoolman-migration` has already reduced 231 FileMaker
  tables to a 79-table student model and a staging/import design
  (`casa_student.*`, `casa_staging.*` in `bridge/postgres_student_model.sql`).
  That is the target; the workspace's tables should be its first live
  inhabitants, not its rival.
- **Nothing that FileMaker does in 145 steps gets re-implemented in TypeScript
  during phases 1–2.** It gets *called*. Re-implementation happens once, in
  phase 3, against imported data, when FileMaker is no longer the thing being
  kept consistent.

---

## 1. What the two existing bridges do — and the one thing they have in common

### The analytics dashboard (`casa-google-business-audit`)

A Python bridge reads FileMaker Server's **Data API** over the office LAN,
stages TSV snapshots, merges them with a preserved historical snapshot, loads
Postgres, and exports dashboard files. Facts that matter for us:

| | |
| --- | --- |
| Server | FileMaker Pro 22 Server, `SchoolMan`, the office Mac Mini at `10.0.60.10` (hostname `Werners-Mini.fritz.box`). **LAN only, no VPN.** |
| Protocol | `https://10.0.60.10/fmi/data/vLatest/databases/SchoolMan`. Self-signed TLS. OData is down (503); ODBC/JDBC port is closed. |
| Transport | `curl`, not Python's HTTPS stack — the latter fails on the LAN route. |
| Session | `POST /sessions` with basic auth → bearer token → `DELETE /sessions/{token}`. |
| Reads | `GET /layouts/{layout}/records?_limit=5000&_offset=n`. Only fields *on the layout* are returned. |
| Layouts | `Person`, `Booking_API`, `Course_API` — plus `DateBooking`, `Email`, `StaffMember` for rosters. The `_API` ones were **added to FileMaker specifically for this bridge**. |
| Keys | `Person.__ID_Person`, `Booking.__ID_Booking` (auto-enter serials, unique). Booking→Person via `Booking_API._ID_Student → Person._ID_Student → Person.__ID_Person`, validated ≈99.7%. |
| Credential | 1Password entry `FileMaker SRV`, passed via stdin. Never in files, logs or arguments. **Resolves to `Werner Riebe` — a departed employee's personal `[Full Access]` account** *(live)*; it sees all 328 layouts and could alter schema. `FileMaker-SRV` (hyphen) is a stale duplicate. |
| Dates | Data API returns `MM/DD/YYYY`; converted at the boundary. |
| Safety | Staged snapshots, quality gates that refuse under-sized or key-less publishes, `source_policy.json`, atomic publish. |

### The student app (`casa-student-app`)

It has **no live bridge**. `docs/system-architecture.md` lists
"CASA internal dashboard / FileMaker sync: **Not connected**". Its integration
is: the dashboard bridge's `export_course_roster_emails.py` reads one course's
roster from the `DateBooking` layout (read-only) → a person reviews the file →
`tools/rollout_cohort_invitations.py` posts invitations to the student app's
own API. Two systems, a reviewed file between them, and a human who confirms.

### The common thread

**Both are read-only, and read-only by discipline, not by enforcement.** The
DDR shows the `fmrest` extended privilege is carried by `[Full Access]`,
`Reduced`, `Teacher_II` and `ClassBook` — and *not* by `[Read-Only Access]`.
`FileMaker SRV` *is* `[Full Access]` — it is the personal account of an
employee who has since left CASA, which makes retiring it a live task and not
just hygiene. The
Data API has always been able to write, and to change design, through it.
Nobody has, because every handoff says not to. That is the whole safety model
today, and it is why a `WebIntake` account (§3) is the first thing to create,
not the last.

The one time anyone changed FileMaker's *structure* for these projects, it was
a person in FileMaker Pro adding one stored field
(`Booking::StatusInternationalAirport`), with layout XML snapshots before and
after, native controls, and no relationship-graph change. A graph change was
attempted the same day and rolled back
(`notes/FILEMAKER_LIVE_CHANGE_LESSONS_AND_RELATIONSHIP_REDUNDANCY_2026-07-06.md`).
The one approved *script* change (the Outlook mail repair, 2026-08) was made
by hand, platform-guarded, phased, and announced to staff by email.

**So a bridge that writes is new ground for this organisation, and the design
below treats it that way.**

---

## 2. FileMaker already has our pipeline

This is the finding that shapes everything. `SchoolMan` models the road from
"someone showed interest" to "confirmed booking" as four tables, and they line
up with the workspace's queues almost one to one:

```
 FileMaker (SchoolMan)                              Workspace (/admin)
 ─────────────────────────────────────────────      ─────────────────────────────
 Contact          4,736 rows   the enquirer         enquiries
      │ NewContact creates both, linked
 PreBooking       5,621 rows   what they want       course_registrations
      │                                              exam_registrations
      ├── TestStudent   5,625   placement result     placement_reviews
      │      + PreBooking._ID_Recommendation_min/max → LevelStepReference (13)
      ├── WaitingRoom   1,760   waitlisted
      └── WorkFlow_PreBooking   tasks/notes          staff_notes, staff_activity
      │ Go_PreBooking_Booking.Parameter (145 steps)
 Booking         21,506 rows   confirmed             (does not exist yet)
      └── Source → SourceReference (9)  "where did they come from"
```

**Live counts, 2026-09-09** *(live)*: Contact 4,926 · PreBooking 5,888 ·
WaitingRoom 1,880 · TestStudent 5,814 · Person 15,344 · Booking 22,206 ·
Course 1,318. Against the 2026-07-06 backup that is +190 contacts and +267
pre-bookings in two months. Contacts per year: 2022 1,107 · 2023 1,118 ·
2024 997 · 2025 1,013 · 2026 to date 691 — **about a thousand a year, three to
four a working day.** 99.8% of contacts are linked to a Person.

**FileMaker already expects the website.** `TypeContactReference` *(live)*:
1 = *Online Anmeldung*, 2 = *Email Nachfrage*, 3 = *Telefonische Anfrage*,
4 = *Besuch im Büro*. `SourceReference` *(live)*: 1 = *Internet | Homepage*,
2 = *Direktanmeldung Büro*, 3 = *Freunde & Bekannte*, 4 = *Firma*, 5 = *Gelbe
Seiten*, 6 = *Zeitung*, 7 = *Agentur*, 8 = *andere*, 9 = *OBS*. A web
registration is contact type 1 with source 1 — both values pre-date this
project.

**Status is `DecisionReference`** *(live)*: 1 = *ja*, 2 = *nein*, 3 = *offer*,
4 = *u.B.* (*unter Beobachtung*, yellow: the learner may not have the level, and so on), 5 = *grau*, 6 = *Undefined*. New Contact,
PreBooking and WaitingRoom rows auto-enter **4**; conversion sets **1**. Current
distribution across all 5,888 pre-bookings: 4 → 4,755 · 2 → 589 · 1 → 540 ·
5 → 4. Four in five pre-bookings still sit at the default — FileMaker's own
status is rarely maintained, which is exactly the gap the workspace's
status-with-an-owner fills.

What the scripts do (read from the DDR, not guessed):

- **`NewContact`** — creates a `Contact` *and* a `PreBooking`, sets
  `Contact._ID_PreBooking` and `PreBooking._ID_Contact`. Pairs, always.
- **`NewPerson_PreBooking`** — creates a bare `Person`, sets `_ID_Person` on the
  PreBooking, then puts the cursor in `_ID_GenderReference` for a person to fill
  the rest.
- **`NewEmail_PreBooking`**, `NewPhone_…`, `NewAddress_…` — one child record
  each in the `Email` / `Phone` / `Address` tables, keyed by `_ID_Person`.
- **`NewTest_PreBooking`** — one `TestStudent` linked to Person and PreBooking.
- **`Go_PreBooking_Booking.Parameter`** — the conversion. Refuses if the person
  already has a Booking on that platform; sets `_ID_StatusPreBooking = 1`,
  `_ID_StatusContact = 1`, `_ID_Completed = 1`; creates an `ID_Student`
  identity row; creates the `Booking` with `_ID_EnrolmentDone = 5`,
  `_ID_Platform = <parameter>`, level, visa, course type, course, dates copied
  from the PreBooking; then ~100 more steps for dates, costs and related rows.

`_ID_EnrolmentDone` on a Booking (`SelectionDetail`, *live*): 1 = *ja*,
2 = *nein*, 3 = *storno*, 4 = *u.B.*, 5 = *???*, 6 = *Undefined*. Both creation
scripts set **5** on a new Booking.

### Vocabularies that map directly onto ours — with the IDs a write uses *(live)*

| FileMaker reference | IDs → labels | Maps to |
| --- | --- | --- |
| `CourseTypeReference` | 1 Intensivkurs · 2 Abendkurs · 3 Sommerkurs · 4 Einzelunterricht · 5 Geschlossene Gruppe · 7 Prüfungsvorbereitung · 9 Juniorkurs · 10 Firmenunterricht · 11 Spezialkurs · 12 Superintensivkurs · 15 Online Kurs · 16 Zusatzkurs; two *OBS* rows returned no ID | `course_types` |
| `ExamReference` | 1 TestDaF · **B1 Prüfung returned no ID** · 3 B2 telc · 4 C1 Hochschule · 5 TestAS | `exam_types` (seed today has only telc B2 and C1) |
| `PartExamReference` | 1 schriftlich (written) · 2 mündlich (oral) · 3 both (full) | `exam_registrations.registration_type` — **but it lives on `SingleDateExam`/`SingleDateStudent`, not on PreBooking** (§4) |
| `LevelStepReference` | 1 A1.1 · 2 A1.2 · 3 A2.1 · 4 A2.2 · 5 B1.1 · 6 B1.2 · **7 B1+1 · 8 B1+2** · 9 B2.1 · 10 B2.2 · 11 C1.1 · 12 C1.2 · **13 C1.3** | `BAND_SEQUENCE` has a single `B1+` and no `C1.3` — map `B1+` → min 7 / max 8 |
| `LevelReferenceSchool` | A1 A2 B1 B1+ B2 C1 TD CH SK ND (IDs are decimals, e.g. 3.5) | `PreBooking._ID_Level` |
| `PlatformReference` | **22 Course** · 2 NationalAirport (*TestDaF und Prüfungen*) · 1 InternationalAirport (*Sommer-, Juniorkurse, Schulklassen*) · 6 BusStop (*Geschlossene Gruppen*) · Underground (*Firmenunterricht*, no ID returned) · 4 CentralStation (*Englisch/Spanisch Abend*) · 8 TransitHall (*Wohnungsvermittlung*) · 25 PreBooking · 26 Contact · 24 WaitingRoom · 27 Offer | courses → 22, exams → 2, accommodation → 8, groups → 1/6, company → Underground |
| `TypeContactReference` | 1 Online Anmeldung · 2 Email · 3 Telefon · 4 Besuch | every web record → **1** |
| `SourceReference` | 1 Internet \| Homepage · … · 7 Agentur · 9 OBS | every web record → **1** |
| `DecisionReference` | 1 ja · 2 nein · 3 offer · 4 u.B. · 5 grau · 6 Undefined | `_ID_StatusPreBooking`, `_ID_StatusContact`, `WaitingRoom._ID_Status` |
| `Flag` | 206 rows; `Country_1` German, `Country_2` English, `CountryLong_1` carries the ISO code (`DE - Germany`) | `nationality` → match on ISO code, never on spelling |
| `TypeOfferReference` | 1 Kurs · 2 Unterkunft · 3 Internship | what a PreBooking is *for* |
| `SelectionDetail` › *TypeTest* | includes **Einstufungstest** | `TestStudent._ID_Test` for placement results |
| `SelectionDetail` › *MissingItemContact* | course dates · desired level · address · phone · email · homeland · date of birth · placement result · birthplace · mother tongue · ID number · bank details · country of birth | **FileMaker's own definition of a complete registration.** The public form collects seven of thirteen; the six it lacks are the phase-2 form work. |

Data-quality note *(live)*: `Contact._ID_TypeContactReference` holds a mix of
IDs and typed labels (`'1'`, `'Email'`, `'Besuch im Büro'`, even `'1\r3'`).
The bridge writes IDs only; the read-back must tolerate labels.

### What a write can and cannot reach

The Data API writes only through a layout, and only to the fields on it.
Today's layouts in the relevant contexts are **UI layouts**, built for people:

| Context | Layouts | API-purposed? | Own fields exposed |
| --- | --- | --- | --- |
| `PreBooking` | `PreBooking`, `PreBooking_List` | no | 32 — mostly FKs and person display; **not** course, visa, accommodation or recommendation fields |
| `Contact` | `Contact` | no | 59 — richer, includes accommodation type/room/catering, visa, dates |
| `WaitingRoom` | `WaitingRoom` | no | 42 |
| `TestStudent` | `TestStudent`, `TestStudent_Form` | no | 14 |
| `Person` | 6 incl. `Student_API` | `Student_API` (read) | 27 |
| `Booking` | 13 incl. `Booking_API` | `Booking_API` (read) | 43 |

Live metadata *(live)* is a little kinder than the DDR suggested: the
`PreBooking` layout does carry `_ID_Course`, `_ID_CourseTypeReference`,
`_ID_Level`, `_ID_LevelStepReference`, `_ID_VisaRequired`,
`_ID_Recommendation_min/max`, `_ID_ExamReference`, `_ID_Exam`, `_ID_Platform`,
`_ID_StatusPreBooking` as own fields — but not `Comment`, `DateOfCreation`,
`ZStartDate/ZEndDate`, `_ID_Person`, `_ID_Contact` or any accommodation
reference. `Contact` carries the FKs and `_ID_TypeContactReference` but no
names and no comment. `TestStudent` lacks `_ID_PreBooking`, `_ID_Test` and the
level fields. And all three are UI layouts with `Add_row`/`Delete_row` buttons
whose script triggers are unknown.

So the same thing that was done for the read bridge is needed for a write
bridge: **`Contact_API` and `PreBooking_API` layouts** (and a `TestStudent_API`
for phase 2), created in FileMaker Pro, exposing exactly the fields the bridge
sets and reads back, with no buttons and no script triggers. The `Person`
layout already has `Email`, `Phone` and `PreBooking_Person` portals, and the
Data API can create related rows through portals in the same request — a
`Person_API` with those portals turns "person plus contact channels" into one
call. A layout is a safe, reversible addition — the
same class of change as the one field that was added in July.

---

## 3. The design

### Direction of truth

**Through phases 1 and 2, FileMaker stays the record of truth for people,
bookings and money.** The workspace is the surface where work enters. Writes
flow workspace → FileMaker; FileMaker's identifiers flow back so the workspace
can show "this is now Contact 4801 / PreBooking 5622" and, later, "Booking
170990, paid 03.10". From phase 2 the workspace also **reads FileMaker back**
— people, bookings, courses, cost and payment ledgers — through the read bridge
that already exists, into its own Postgres, so staff see one picture without
opening two applications.

Every FileMaker identifier the workspace learns is stored in the shape the
migration model uses (`source_database`, `source_layout`, `source_record_id`,
`source_primary_key`, `mod_id`). That is what makes phase 3 a flip rather than
a rebuild: when truth moves, the links already exist.

### 3a. Creating *complete* registrations without forking the logic

Phase 2 needs course, exam, accommodation and payment registrations created
from the workspace. Re-implementing `Go_PreBooking_Booking.Parameter` (145
steps: identity row, platform, level, visa, dates, cost lines, related rows)
and its siblings in TypeScript would fork the truth on day one — every fix
made in FileMaker would have to be made twice.

The FileMaker Data API can **run a FileMaker script server-side**:
`GET /layouts/{layout}/script/{scriptName}?script.param=…`, or `script` /
`script.param` alongside a record create. So the mechanism is:

1. The workspace creates the `Contact`+`PreBooking` pair and children (phase 1).
2. For a full registration it then calls the **conversion script by name** with
   the PreBooking ID as parameter, and reads back `__ID_Booking`.
3. Cost lines and a first payment are created the same way — by calling the
   scripts staff use (`NewCostDetailSample_PreBooking`,
   `NewLetterDownPayment_PreBooking`, and the `PaymentIn` path), not by
   inserting into `CostDetail`/`PaymentIn` directly.

The catch, and it is real: **scripts run by the Data API execute without a
user interface.** Steps like `Show Custom Dialog`, `New Window`, `Freeze
Window` and window-targeted `Go to Related Record` are not compatible and are
skipped or fail. `Go_PreBooking_Booking.Parameter` uses all four in its first
fifteen steps. So the existing scripts are not exposed; CASA writes
**server-safe variants** — `WebIntake_ConvertPreBooking`,
`WebIntake_AddCostDetail`, `WebIntake_RecordPayment` — that perform the same
data steps with the UI steps removed and a JSON result set via `Exit Script`.
That is a contained, testable piece of FileMaker work, and it keeps the logic
in one place. It has to be proven on the test copy (§7 item 8) before anything
else in phase 2.

**The Data API only exists on FileMaker Server.** FileMaker Pro is installed on
this machine and the July backup copies are on disk, but a `.fmp12` opened in
Pro cannot serve the API. So the local copy is where scripts and `_API`
layouts are *developed and checked*; API tests need a copy **hosted** on the
Mini as a second file (`SchoolMan_Test`). The Data API's `/databases` call
lists what the server hosts today — see §7 item 8.

Payment is the part with the most consequences if wrong. It is last in the
order of work, it is never automatic, and every write to `PaymentIn` is one
staff action with a name against it.

### 3b. Growing the workspace's own database toward the migration model

Phase 3 is only possible if phases 1–2 have been *filling the target model*
rather than a convenient one. Concretely:

- The workspace's Postgres adopts `casa_student.*` and `casa_staging.*` from
  `bridge/postgres_student_model.sql` — `students`, `organizations`,
  `reference_values`, `student_source_links`, `import_batches` — as the place
  FileMaker read-backs land. One database for CASA's own system, not the
  workspace's plus the analytics bridge's plus a migration staging area.
- Every new domain the workspace grows (accommodation, cost lines, payments)
  is modelled by asking "what will this table be when FileMaker is gone", and
  checked against the DDR field catalog for what FileMaker actually stores.
- Reference vocabularies (`CourseTypeReference`, `LevelStepReference`,
  `PlatformReference`, …) are imported into `casa_student.reference_values`
  once, with FileMaker's IDs kept as `source_primary_key`, and the workspace's
  own enums become views over them.

What must **not** be carried across is catalogued, with measurements, in
`docs/FILEMAKER_LESSONS.md` — thirteen sections from identity keys to
credentials. Every phase-2 table and every phase-3 import rule is checked
against it.

The hard, valuable work of phase 3 is not the code. It is the 23 quality issues
the migration project's draft import batch already surfaced — duplicate person
IDs, conflicting legacy bookings, unresolved joins — each of which is a
decision for CASA's administration or Finance, not for an agent.

### Where each queue lands

| Workspace record | FileMaker target | Notes |
| --- | --- | --- |
| `enquiries` (general) | `Contact` only, plus a `WorkFlow` row of reference "Nachfragen / Enquiry" | A question is not yet a wish for a course. |
| `enquiries` (group / company) | `Contact` with `_ID_Corporate` / `_ID_Institution` where a match exists; the brief into `Comment` | Organiser briefs are estimates, never bookings. |
| `course_registrations` | `Contact` + `PreBooking` pair (as `NewContact` does), then `Person` + `Email` + `Phone` + `Address` children, `_ID_Course` / `_ID_CourseTypeReference` / `_ID_Level` / `_ID_VisaRequired` / accommodation refs on the PreBooking | Phase 1: staff convert in FileMaker as today. Phase 2: the workspace calls the server-safe conversion script (§3a) and reads back `__ID_Booking`. Never a direct insert into `Booking`. |
| `exam_registrations` | same pair; `_ID_ExamReference`, part via `PartExamReference` | |
| `placement_reviews` | `TestStudent` on the person's PreBooking: `Result`, `CommentTest`, `_ID_LevelStepReference`; `_ID_Recommendation_min/max` on the PreBooking | Only after a teacher confirmed. CLAUDE.md rule 6: a recommendation, never a certificate. |
| `career_applications` | none | Hiring is not in the student pipeline. Stays workspace-only. |
| *(phase 2)* accommodation request | `DateAccommodation` via script; `PreBooking._ID_Accommodation*Reference` in phase 1 | No workspace table yet — the public site has no accommodation booking flow. New domain, not just bridge work. |
| *(phase 2)* payment | `CostDetail` + `PaymentIn` via `WebIntake_*` scripts only | No workspace table yet. Last in order; never automatic; one named staff action per write. |

### The trigger is a person, per record

Not a scheduler. A staff member opens a reviewed record and clicks
**"Send to FileMaker"**. That keeps three things the existing integrations
already rely on: a human gate before anything reaches FileMaker, one record at
a time, and a name in `staff_activity` against every push
(`pushed_to_filemaker`, with the returned IDs in `detail`).

Spam, duplicates and test submissions never leave the workspace, because
nobody sends them.

### Idempotency, or how a retry does not create a second student

Every push carries the workspace's own `request_id` (already a `uuid NOT NULL
UNIQUE` on every queue table) written into one FileMaker text field on the
Contact and the PreBooking. Before creating, the bridge **finds** by that
value; if a row exists, it updates `external_ref` and stops. A network failure
mid-push therefore produces at most one orphan half-pair, found and completed
on the next attempt — never two people.

Which field: `Url` exists on `Contact`, `PreBooking` and `WaitingRoom` and is
text, but its meaning is unknown and repurposing it is a guess. **Ask for a
dedicated field** (`WebIntakeRef`, text, indexed) — one stored field per table,
exactly the pattern that worked in July.

### Duplicate people

`Go_PreBooking_Booking` already refuses to create a second Booking for a person
who has one on the same platform. The bridge does the equivalent one step
earlier: before creating a `Person`, it searches `Email` for the address and
`Person` for surname + date of birth, and if either hits, it links the new
PreBooking to the **existing** `_ID_Person` and flags the record in the
workspace ("matched existing student 31544"). It never merges and never edits
an existing Person's fields. A person can override the match before sending.

### Reading back

After a push, and on demand, the bridge reads `PreBooking._ID_StatusPreBooking`
and `PreBooking._ID_Booking` through `PreBooking_API`. When `_ID_Booking` is
set, the workspace record shows **Converted → Booking N** and offers no further
edits — FileMaker owns it from there.

### Where the code runs — the constraint nobody can design around

The workspace will run on Azure. FileMaker is on an office LAN with no VPN.
Nothing on Azure can reach `10.0.60.10`. Two honest options:

1. **An on-premises agent** (recommended). A small process on an office Mac —
   the same place the existing bridge runs — that polls the workspace over
   HTTPS for records marked *approved for FileMaker*, performs the FileMaker
   writes locally, and reports IDs back. Reuses the existing Python bridge
   (`curl_json`, `login`, `fetch_all`, stdin credentials, staging discipline).
   The workspace needs one authenticated endpoint pair: *list approved pushes*
   and *record result*. The agent needs one credential for the workspace and
   the existing `FileMaker SRV`-class credential for FileMaker.
2. **A network path** — VPN or Tailscale between the Container App and the
   Mac Mini. Cleaner code, but it is an infrastructure decision with a security
   review attached, and it puts a production cloud workload on the school LAN.

Option 1 also keeps the FileMaker credential on the LAN, which is where it is
today.

### The FileMaker account

**Not `FileMaker SRV`, and not anyone's personal `[Full Access]`.** A new
account `WebIntake` with a new privilege set of the same name: `fmrest` on;
*create* and *edit* on `Contact`, `PreBooking`, `Person`, `Email`, `Phone`,
`Address`, `TestStudent`, `WorkFlow`; *view* on the reference tables and on
`Booking`; **no delete anywhere, no design, no other tables**. The set's
existence is itself documentation of what the bridge may do, and revoking it
is one click.

---

## 4. Field mapping — `course_registrations` → FileMaker

Only fields verified present in the DDR. `→ ask` marks a value whose
reference-table ID must come from a live read of the vocabulary (§7).

| Workspace column | Table.field | Note |
| --- | --- | --- |
| `request_id` | `Contact.WebIntakeRef`, `PreBooking.WebIntakeRef` | new fields; idempotency key |
| *(constant)* | `Contact._ID_TypeContactReference = 1` (Online Anmeldung) · `Contact._ID_StatusContact = 4` · `PreBooking._ID_StatusPreBooking = 4` · `PreBooking._ID_Platform = 22` for a course, `2` for an exam | all IDs verified live |
| `first_name` / `last_name` | `Person.ZFirstName` / `Person.ZSurName` | |
| `salutation` | `Person._ID_GenderReference` | `mr/ms/mx/neutral` → ask |
| `birth_date` | `Person.DateOfBirth` | send as `MM/DD/YYYY` |
| `nationality` | `Person._ID_Homeland` → `Flag.__ID_Flag` | match on the ISO code inside `Flag.CountryLong_1`; unmatched stays blank + workspace flag, never a guessed country |
| `email` | `Email` row: `_ID_Person`, plus the address field | the `Email` field is auto-enter calc — the stored source field must be confirmed live |
| `phone` | `Phone` row: `_ID_Person`, `PhoneText` | |
| — (no address collected today) | `Address` | the public form does not ask; do not invent one |
| `course_type_id` → `course_types.slug` | `PreBooking._ID_CourseTypeReference` | IDs verified live (1 Intensiv, 2 Abend, 7 Prüfungsvorbereitung, 10 Firma, 11 Spezial, 5 Gruppe, …) |
| `course_instance_id` | `PreBooking._ID_Course` | needs a `Course.__ID_Course` per cohort — the catalogue does not carry FileMaker course IDs yet (§7) |
| `current_level` (self-declared) | `PreBooking._ID_LevelStepReference` (1–13) and `_ID_Level` | our `B1+` → 7; store in `Comment` as "self-declared" too |
| `visa_required` | `PreBooking._ID_VisaRequired` | `Decision_Yes_No`: 1 = ja, 2 = nein *(live)* |
| `accommodation_required`, `accommodation_type` | `PreBooking._ID_AccommodationTypeReference` (`flat`/`host` → ask) | room/catering refs left blank |
| `allergies`, `notes` | `PreBooking.Comment` | prefixed lines; no dedicated fields exist |
| `locale`, `source` | `SourceReference` **1 = Internet \| Homepage already exists**; a `Source` row is attached to the Booking at conversion — phase 2 passes source 1 to the conversion script. Phase 1: `Comment` line `Quelle: Website (en)` | |
| `submitted_at` | `PreBooking.DateOfCreation` is auto-enter — leave; put the ISO timestamp in `Comment` | |
| *(returned)* `__ID_Contact`, `__ID_PreBooking`, `__ID_Person` | → `external_ref` | structured, §5 |

`exam_registrations` differs in three cells: `_ID_ExamReference` (1 TestDaF ·
3 B2 telc · 4 C1 Hochschule · 5 TestAS; **the B1 row's ID must be confirmed**),
`_ID_Platform = 2`, and `official_name_confirmed` into `Comment` as a line —
there is no field for it, and it matters enough to be written down. The exam
**part** (`registration_type`) has **no home on the PreBooking**:
`PartExamReference` (1 written · 2 oral · 3 both) is referenced from the
sitting rows `SingleDateExam`/`SingleDateStudent` created at conversion. Phase
1 writes it to `Comment`; phase 2 passes it to the server-safe conversion
script.

---

## 5. What changes in the workspace

Nothing until §7 is decided. When it is:

- `external_ref text` on the four queue tables becomes a small
  `filemaker_links` table: `(entity, entity_id, source_database, source_layout,
  source_record_id, source_primary_key, mod_id, linked_at, linked_by)` — one row
  per FileMaker record created or matched, in the shape
  `casa_student.student_source_links` already uses in the migration model.
- A `push_state` on each queue row: `not_sent | approved | sent | converted |
  failed`, with the failure reason.
- Two authenticated endpoints for the on-prem agent.
- A **Send to FileMaker** control on the record rail, shown only when the
  record's status is not `spam`/`declined` and a person has been confirmed
  (duplicate check shown inline).
- `staff_activity` actions: `approved_for_filemaker`, `pushed_to_filemaker`,
  `filemaker_push_failed`, `filemaker_converted`.

---

## 6. What phase 1 deliberately does not do

- **Write Bookings, costs or payments.** That is phase 2, and only through
  FileMaker's own scripts run server-side (§3a) — never by inserting into
  `Booking`, `CostDetail` or `PaymentIn` from outside.
- **Edit existing FileMaker people.** Match and link, never modify. (Holds
  through phase 2 as well.)
- **Sync two ways.** No FileMaker→workspace flow beyond IDs and status.
- **Run unattended.** No scheduler pushes records. A person does.
- **Touch the relationship graph, scripts or existing layouts.** Additions only:
  two layouts, one account, one privilege set, one field per table.

---

## 7. Decisions and unknowns — who owns each

| # | Item | Owner | Why it blocks |
| --- | --- | --- | --- |
| 1 | **Is a write into FileMaker wanted at all**, versus a reviewed export file staff import with FileMaker's own `Import.Parameter_Booking`-style scripts? | Rahman / CASA | The whole mechanism. The file route is lower-risk and matches the student app; the API route removes re-typing. |
| 2 | `Contact_API` + `PreBooking_API` layouts | CASA, in FileMaker Pro | Nothing can be written without them. |
| 3 | `WebIntake` account + privilege set | CASA | Without it the bridge would run as a full-access account. Refuse to build it that way. |
| 4 | `WebIntakeRef` field on `Contact` and `PreBooking` | CASA | Idempotency. `Url` could be reused only if CASA confirms it is free. |
| 5 | ~~Reference vocabularies~~ **Resolved live 2026-09-09** (§2). Two loose ends: the `B1 Prüfung` `ExamReference` row and the two *OBS* course types and the *Underground* platform returned no ID — confirm in FileMaker Pro whether the serial is blank or the API layout hides it. | CASA (five minutes) | Three `→ ask` cells in §4. |
| 6 | FileMaker `Course.__ID_Course` for each workspace `course_instance`, and a real `exam_types` table | data task | The workspace's `course_instances` (13) and `exam_types` (2) are **fixtures**, not CASA's catalogue. `Course_API` has 1,318 courses with dates and types *(live)*; the catalogue needs a `filemaker_course_id` column and an import from it before a registration can name a cohort. |
| 7 | On-prem agent vs network path (§3) | Rahman / CASA IT | Where the code runs. |
| 8 | Test environment: a **hosted** `SchoolMan_Test` on the Mini | CASA | The Data API only exists on Server (§3a); the local July copies plus FileMaker Pro cover script and layout development, not API tests. |
| 8a | A fresh backup copy for local development | Rahman | The July copies are two months old. SSH key access as `casamini` is **not currently accepted** (2026-09-09; the Mini also throttled after a few refused attempts) and nothing is saved in this Mac's Keychain. Either CASA re-authorises the `casa_mac_support_ed25519` key, or Rahman mounts `smb://10.0.60.10/Macintosh HD` once in Finder — the password never passes through an agent — and the copy from `/Library/FileMaker Server/Data/Backups/FMS_<date>_0000/Databases/` is checksummed into `output/filemaker_backups/` as in July. |
| 9 | *(phase 2)* Server-safe script variants `WebIntake_ConvertPreBooking`, `WebIntake_AddCostDetail`, `WebIntake_RecordPayment`, and `fmrest` script-execution rights on the `WebIntake` privilege set | CASA | The only way to create complete registrations without re-implementing FileMaker's logic (§3a). Must be proven on item 8 first. |
| 10 | *(phase 2)* Accommodation and payment as workspace domains — public flows, tables, who may record a payment | Rahman / Finance | Neither exists anywhere in the website or workspace today. Payment is last and never automatic. |
| 11 | *(phase 3)* Adopt `casa_student.*` as the workspace's own model and merge the analytics bridge's Postgres into it | Rahman + the migration project | One database for CASA's system. The 23 draft-import quality issues are decisions, not bugs. |

Items 5 and 6 are read-only and can be done as soon as someone with the
`FileMaker SRV` credential is on the school LAN. Items 2–4 and 8 are one
sitting in FileMaker Pro. Item 1 is a conversation, and it comes first.

---

## 8. The copy in the live workspace (2026-10-19)

Rahman, after the first release of the workspace: „the new project and changes are live but I don't
see the data". The importers had only ever run against the database on the office Mac. He asked for a
bridge that brings SchoolMan's latest data once a day. For now a person starts each run („at the first
phase I will tell you to run it"). It goes nightly once the email tests are done.

**What a run brings.** It brings what the local copy has, by the importers' own rules
(`scripts/filemaker/bridge-steps.mjs` lists them in order):
- staff, courses with their weekly counts, lesson days and absences, working time (the month's and the
  year's balances, holidays left — `read_time.py`, 2026-10-22);
- the learner sample (a course this week or in the next four, plus this year's group participants,
  plus — since 2026-10-21, Rahman: „all of 2024 and 2025" — everyone with a booking whose period began
  in 2024 or 2025, `HISTORY_YEARS` in `sample.py`), with history, money, attendance and letters;
- the exam parts (`SingleDateExam`, 2026-10-26): a sitting's real hours, unless a colleague changed it here,
  and the examiners of its written and oral parts;
- organisations, groups, offers, accommodation, follow-ups, intake and the rest;
- an organisation's history (2026-10-26): SchoolMan's work-log lines that name it (`WorkFlow` by
  `_ID_Corporate`, `_ID_Agency`, `_ID_Institution`, `_ID_Management`), about itself or about a learner the
  workspace holds, shown in „Notizen und Verlauf" on its page (notes on organisations: 0089);
- the history and notes no other step reads for their record (2026-10-27, 0094; `read_history.py`): a place's
  work-log lines, a class's notes, and the kinds of history line SchoolMan adds;
- the Tagesplan's tasks.

Each importer is idempotent, so a run changes only what differs. The window moves with the date.
Nothing is ever written to SchoolMan. Since 2026-10-26 the sample also reaches every booking from this
week on, however far ahead, and bookings set to „nein" or „storno" in the last four weeks (`sample.py`):
a learner moved to January had kept their old place.

**Only what changed (2026-10-26, 0088).** A run took about an hour: seven minutes reading SchoolMan, two
importing on the Mac, and an hour inside Azure. Every row was its own statement, each waits about 10 ms
for the database (the job runs in Germany West Central, the server is in Belgium Central), and every run
wrote every record again — 354,000 statements, 302,000 of them the learners'. Every importer that writes per record now keeps a
fingerprint per record (`bridge-changes.mjs`, table `bridge_fingerprints`, hashes only): SchoolMan's data
together with what it was matched to here (the booking, the course, the teacher and room, the group, the
bookings and letters a party pays for, whether a booking is over, the vocabularies). A record whose
fingerprint is the same as last time is passed over; one whose dependency arrives here gets a new
fingerprint and is written; a record SchoolMan holds twice is written each time, so the last one wins as
in a full run. The offers importer also reads what an offer is matched to once instead of per offer.
Measured on the Mac with the round trips counted (×10.3 ms for Azure), the same SchoolMan read twice:
354,000 statements (about an hour inside Azure) → 4,300 (under a minute). A full import after the fast
one leaves all 39 tables the bridge writes identical, apart from offer lines' ids (a full run recreates
them) and the date of two SchoolMan notes that have none (a full run stamps them „now"). What remains is
the steps that are small anyway (staff, courses and their counts, absences, groups, the day).
`bridge.sh --full` (`BRIDGE_FULL=1`) writes every record, as before. The first run after the table exists
is a full one, and so is a step's first run after it starts keeping fingerprints.

A fingerprint says SchoolMan has not changed, not that the workspace still says what SchoolMan says.
Lesson days learnt that the hard way (2026-10-27): a re-planned course's renumbered days kept their old
teachers, and a day whose writing was refused once still had its fingerprint kept, so Birte Klaila and
Mariella Baier stood swapped on two classes while SchoolMan was right. The lesson-days step therefore also
reads what each day holds here and passes a day over only when both agree; anything that sets a day apart
from SchoolMan — a renumbering, a database function, a hand edit without `changed_by` — is set right on the
next run.

A run is started without `--local-first` since 2026-10-26 (Rahman): the bundle goes straight to Azure, the
Mac's own database is not filled with learners, and the run is two minutes shorter.

**How it runs.** `./infra/azure/bridge.sh` (or `--only staff,day`, or `--local-first` to import into the Mac's own database first and send the same bundle only if that worked, or `--full` to write every record) on the office Mac, with SchoolMan
open in FileMaker Pro and `az` signed in:
1. `bridge-pack.mjs` runs the readers. Their output stays in memory and is sealed with AES-256-GCM under
   a key made for that run (`bridge-bundle.mjs`), then uploaded to the private container `bridge` in
   `stcasawebsitef8d745`. The upload link can only create and write, and lasts two hours.
2. `db-job.sh import` starts the database job (1 vCPU, 2 GiB, up to an hour) with the key and a link that
   can only read and delete. The job runs inside Azure, the only place that reaches the database.
3. `bridge-unpack.mjs` in the job downloads the bundle, deletes it, and opens it. It feeds each step to
   its importer, taking the importer from the image's own list and never from the bundle, and stops at
   the first failure. It logs the importers' summary lines and the row counts before and after, then
   records the run in `bridge_runs` (0073).
4. Back on the Mac, `bridge.sh` deletes the bundle again in any case. `db-job.sh` gives every run a job
   of its own and removes it afterwards, so the job that held the key does not stay. Recreating one
   fixed job name had left Azure holding the old job's secret on 2026-10-19, and every later run under
   that name hung before it started.

**What the workspace says.**
- The Overview's head reads „SchoolMan · Stand heute, 07:12" from the last run that went through. A
  red dot and „letzte Übernahme fehlgeschlagen" appear when the latest run did not.
- Settings has the same in its SchoolMan card.
- Bookings are still made in SchoolMan, so the workspace shows a copy as of a time and says which.

**Safety.**
- The workspace sends no email: every „E-Mail" button is a `mailto:` opened in the colleague's own
  mail program. Importing real learners cannot write to anyone.
- The importers touch only two tables the public site reads.
  - `course_instances`: new starts are made with `on_website = false`.
  - `exam_sessions`: a sitting only SchoolMan knows is now made as a `draft`, so it does not appear
    on the website until someone publishes it.
- Upload, download, deletion and refusal were checked against the real storage on 2026-10-19:
  - the upload link cannot read;
  - the read link can read and delete;
  - no access without a link.

**Local test.** `BRIDGE_KEY=<64 hex> node scripts/filemaker/bridge-pack.mjs --file <sealed.bin>`, then
`DATABASE_URL=… BRIDGE_KEY=… node scripts/filemaker/bridge-unpack.mjs --file <sealed.bin>`.

## 9. The sync service: SchoolMan over the Data API (2026-10-27)

Rahman: the WorkspaceSync account was the whole idea — a faster, better link than reading SchoolMan through
FileMaker Pro on his laptop, which needs the laptop on, SchoolMan open and an hour or more whenever the
learners' step is rewritten. The sync service replaces the reading; the importers stay as they are.

```
SchoolMan (FMS, 10.0.60.10)                   the workspace's database (Azure)
  68 Sync_<Table> layouts  ──Data API──►  sync service  ──HTTPS, signed──►  /api/schoolman/sync
  (base-table fields only,                (office network; read-only        │
   hidden from staff menus)                by code, WorkspaceSync)          ▼
                                                                schoolman_records (0090)
                                                                            │  every 5 min, when it changed
                                                                            ▼
                                       bridge-mirror.mjs: mirror-export → read_*.py (FM_MIRROR) → import-*.mjs
```

**The layouts.** One `Sync_<Table>` per table the readers use — 68 tables, 641 fields, the list in
`scripts/filemaker/sync-layouts.json` (docs/schoolman/sync-layouts.md). Each holds that table's own fields
and nothing else, bound by the field's id, is left out of the staff's layout menus, and is never edited for
daily work, so the sync does not break when a staff screen changes. Made on 2026-10-27 by script in
FileMaker Pro on Rahman's Mac (new layout → paste the fields as XML2 → copy back and compare every binding
→ hide → save), with Rahman's go. A field the readers start using is added to the list and to its layout
the same way.

**The service** (`scripts/schoolman-sync/sync.mjs`). Signs in as WorkspaceSync and only ever GETs and
`_find`s on the Sync_ layouts. Every minute it asks each table with a change time for what changed since
two minutes before the newest it has seen; tables with a change date only every five minutes, for that
day; the eight without either whole every half hour. At 02:15 (after SchoolMan's night jobs) it reads every
table whole and sends the complete list of record ids, so records deleted in SchoolMan go from the copy. It
sends only records whose `modId` moved since it last sent them, 500 per request, signed with
`SCHOOLMAN_SYNC_KEY` (HMAC over time and body; five minutes' grace). The password and the key come from the
environment or, on a Mac, the Keychain (`casa-workspacesync`, `casa-schoolman-sync-key`); the server's
certificate names another machine, so it is pinned by its fingerprint (`FM_CERT_SHA256`). The log holds
counts, never a value. It runs on Rahman's Mac until the container on the office server (CT 103) exists;
the Mac must be on, FileMaker Pro need not be open.

**The copy** (`schoolman_records`, migration 0090). One row per SchoolMan record — the Data API's record id,
its modification count and the layout's fields as JSON; `updated_at` moves only when the fields did.
`/api/schoolman/sync` answers 404 without a key configured, 401 to anything unsigned, and refuses a
complete list shorter than half of what is kept (a read cut short is not SchoolMan emptied).

**The bridge from the copy** (`scripts/filemaker/bridge-mirror.mjs`, the scheduled job
`caj-casa-website-schoolman` from `infra/azure/schoolman-job.sh`, every five minutes). Ends at once when
nothing in the copy changed since its last good run; two never overlap (an advisory lock). Otherwise it
turns the copy back into the columns AppleScript gives (`mirror-export.mjs`: dates DD.MM.YYYY, decimal
commas, SchoolMan's record order), runs every `read_*.py` on them unchanged (`FM_MIRROR`), and each
importer as in a run from a bundle. Its runs are `bridge_runs` with source `schoolman-copy`; „Stand" is
when the service last sent. `bridge.sh` keeps working as before and is the way back.

## 10. Files consulted

- `casa-google-business-audit/FILEMAKER_ARCHITECTURE.md`,
  `bridge/README.md`, `bridge/SYNC_HANDOFF.md`, `bridge/live_api_sync.py`,
  `bridge/export_course_roster_emails.py`, `bridge/ROSTER_EXTRACTION.md`,
  `bridge/postgres_student_model.sql`, `bridge/source_policy.json`
- `casa-google-business-audit/notes/FILEMAKER_LIVE_CHANGE_LESSONS_AND_RELATIONSHIP_REDUNDANCY_2026-07-06.md`,
  `STUDENT_DOSSIER_FILEMAKER_MAP_2026-07-05.md`,
  `STUDENT_FILEMAKER_OFFLINE_WORKFLOW_2026-07-06.md`
- `casa-google-business-audit/output/filemaker_ddr/SchoolMan_DDR_20260706/*.xml`
  (UTF-16 — open it as such, or every parse silently finds nothing) and the
  parsed `ddr_field_catalog_20260706.csv`, `ddr_relationship_predicates_20260706.csv`,
  `ddr_base_tables_20260706.csv`
- `casa-student-app/docs/system-architecture.md`, `AGENTS.md`,
  `tools/rollout_cohort_groups.py`
- `casa-microsoft-platform/notes/filemaker-outlook-handoff-2026-08-25.md`
