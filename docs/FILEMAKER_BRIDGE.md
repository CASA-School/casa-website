# The FileMaker bridge for the staff workspace

How CASA's two existing FileMaker integrations work, what the FileMaker side
actually looks like, and the design for connecting the workspace's
registrations to it. Written 2026-09-08 from the DDR export of `SchoolMan`
(2026-07-06 backup), the bridge code in
`~/Tasks/10-active/work/casa-google-business-audit/bridge/`, and the student
app's rollout tooling. Nothing here touched the live server.

**Status: design.** Nothing in this document is built. Section 7 lists what
must be decided, and by whom, before it can be.

**Revised 2026-09-09** after the direction was confirmed: CASA *will* write to
FileMaker, and the bridge is the first step of a larger plan — see §0. The
first draft said "never write Bookings"; that is now "not in phase 1".

---

## 0. The plan this serves

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
| Server | FileMaker Pro 22 Server, `SchoolMan`, Werner's Mac Mini at `10.0.60.10`. **LAN only, no VPN.** |
| Protocol | `https://10.0.60.10/fmi/data/vLatest/databases/SchoolMan`. Self-signed TLS. OData is down (503); ODBC/JDBC port is closed. |
| Transport | `curl`, not Python's HTTPS stack — the latter fails on the LAN route. |
| Session | `POST /sessions` with basic auth → bearer token → `DELETE /sessions/{token}`. |
| Reads | `GET /layouts/{layout}/records?_limit=5000&_offset=n`. Only fields *on the layout* are returned. |
| Layouts | `Person`, `Booking_API`, `Course_API` — plus `DateBooking`, `Email`, `StaffMember` for rosters. The `_API` ones were **added to FileMaker specifically for this bridge**. |
| Keys | `Person.__ID_Person`, `Booking.__ID_Booking` (auto-enter serials, unique). Booking→Person via `Booking_API._ID_Student → Person._ID_Student → Person.__ID_Person`, validated ≈99.7%. |
| Credential | 1Password entry `FileMaker SRV`, passed via stdin. Never in files, logs or arguments. |
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
Whichever of those `FileMaker SRV` is, the Data API has always been able to
write through it. Nobody has, because every handoff says not to.

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

Status semantics that follow from this: a new `Contact`/`PreBooking`/
`WaitingRoom` row auto-enters status **4** (open); conversion sets **1**
(completed). The full label sets live in the generic `SelectionDetail` (85) /
`SelectionReference` (23) / `DecisionReference` (7) tables, which have **not**
been exported locally — see §7.

### Vocabularies that map directly onto ours

| FileMaker reference | Rows | Maps to |
| --- | ---: | --- |
| `CourseTypeReference` | 14 | `course_types` — Intensivkurs, Abendkurs, Prüfungsvorbereitung, Firmenunterricht, Spezialkurs, Geschlossene Gruppe, … |
| `ExamReference` | 5 | `exam_types` — TestDaF, B1 Prüfung, B2 telc, C1 Hochschule, TestAS |
| `PartExamReference` | 3 | `exam_registrations.registration_type` — schriftlich / mündlich / beides = written / oral / full. **Exact match.** |
| `LevelStepReference` | 13 | `BAND_SEQUENCE` in `src/config/placement/policy.ts` — CASA's own sub-levels |
| `LevelReferenceSchool` | 10 | A1 … C1, TD, CH, SK, ND |
| `PlatformReference` | 24 | which CASA "platform" a booking belongs to — **unread, needed** |
| `SourceReference` | 9 | origin channel — **unread, needed**; the website must become one of these |
| `TypeContactReference` | 4 | kind of contact — **unread** |

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

So the same thing that was done for the read bridge is needed for a write
bridge: **`Contact_API` and `PreBooking_API` layouts**, created in FileMaker
Pro, exposing exactly the fields the bridge sets and reads back, with no
buttons and no script triggers. A layout is a safe, reversible addition — the
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
Werner makes in FileMaker would have to be made twice.

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
fifteen steps. So Werner does not expose the existing scripts; he writes
**server-safe variants** — `WebIntake_ConvertPreBooking`,
`WebIntake_AddCostDetail`, `WebIntake_RecordPayment` — that perform the same
data steps with the UI steps removed and a JSON result set via `Exit Script`.
That is a contained, testable piece of FileMaker work, and it keeps the logic
in one place. It has to be proven on the test copy (§7 item 8) before anything
else in phase 2.

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

The hard, valuable work of phase 3 is not the code. It is the 23 quality issues
the migration project's draft import batch already surfaced — duplicate person
IDs, conflicting legacy bookings, unresolved joins — each of which is a
decision for Werner or Finance, not for an agent.

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
| `first_name` / `last_name` | `Person.ZFirstName` / `Person.ZSurName` | |
| `salutation` | `Person._ID_GenderReference` | `mr/ms/mx/neutral` → ask |
| `birth_date` | `Person.DateOfBirth` | send as `MM/DD/YYYY` |
| `nationality` | `Person._ID_Homeland` → `Flag` table | text → ID lookup; unmatched stays blank + workspace flag, never a guessed country |
| `email` | `Email` row: `_ID_Person`, plus the address field | the `Email` field is auto-enter calc — the stored source field must be confirmed live |
| `phone` | `Phone` row: `_ID_Person`, `PhoneText` | |
| — (no address collected today) | `Address` | the public form does not ask; do not invent one |
| `course_type_id` → `course_types.slug` | `PreBooking._ID_CourseTypeReference` | 14-row map, labels verified |
| `course_instance_id` | `PreBooking._ID_Course` | needs a `Course.__ID_Course` per cohort — the catalogue does not carry FileMaker course IDs yet (§7) |
| `current_level` (self-declared) | `PreBooking._ID_Level` | 10-row map; store in `Comment` as "self-declared" too |
| `visa_required` | `PreBooking._ID_VisaRequired` | → ask (likely 1/2) |
| `accommodation_required`, `accommodation_type` | `PreBooking._ID_AccommodationTypeReference` (`flat`/`host` → ask) | room/catering refs left blank |
| `allergies`, `notes`, `smoker` | `PreBooking.Comment` | prefixed lines; no dedicated fields exist |
| `locale`, `source` | `Source` row on the eventual Booking is FileMaker's mechanism; on PreBooking: `Comment` line `Quelle: Website (en)` until a `SourceReference` "Website" exists | |
| `submitted_at` | `PreBooking.DateOfCreation` is auto-enter — leave; put the ISO timestamp in `Comment` | |
| *(returned)* `__ID_Contact`, `__ID_PreBooking`, `__ID_Person` | → `external_ref` | structured, §5 |

`exam_registrations` differs in three cells: `_ID_ExamReference` (5-row map),
part via `PartExamReference` (3-row map, exact), and `official_name_confirmed`
into `Comment` as a line — there is no field for it, and it matters enough to
be written down.

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
| 1 | **Is a write into FileMaker wanted at all**, versus a reviewed export file staff import with FileMaker's own `Import.Parameter_Booking`-style scripts? | Rahman / Werner | The whole mechanism. The file route is lower-risk and matches the student app; the API route removes re-typing. |
| 2 | `Contact_API` + `PreBooking_API` layouts | Werner (FileMaker Pro) | Nothing can be written without them. |
| 3 | `WebIntake` account + privilege set | Werner | Without it the bridge would run as a full-access account. Refuse to build it that way. |
| 4 | `WebIntakeRef` field on `Contact` and `PreBooking` | Werner | Idempotency. `Url` could be reused only if Werner says it is free. |
| 5 | Which `PlatformReference` the website belongs to; a `SourceReference` "Website"; the ID→label sets for `SelectionDetail`, `DecisionReference`, `TypeContactReference`, `VisaRequired`, accommodation refs | live read-only fetch via the existing bridge, then Werner confirms | Every `→ ask` cell in §4. **One staged read of six small reference tables. No PII.** |
| 6 | FileMaker `Course.__ID_Course` for each workspace `course_instance` | data task | Without it a registration lands with a course *type* but no cohort. The catalogue needs a `filemaker_course_id` column filled from `Course_API`. |
| 7 | On-prem agent vs network path (§3) | Rahman / CASA IT | Where the code runs. |
| 8 | Test environment | Werner | The DDR came from a backup; a hosted copy of `SchoolMan` (or the `SchoolMan2024` archive) is where the first pushes should land, not production. |
| 9 | *(phase 2)* Server-safe script variants `WebIntake_ConvertPreBooking`, `WebIntake_AddCostDetail`, `WebIntake_RecordPayment`, and `fmrest` script-execution rights on the `WebIntake` privilege set | Werner | The only way to create complete registrations without re-implementing FileMaker's logic (§3a). Must be proven on item 8 first. |
| 10 | *(phase 2)* Accommodation and payment as workspace domains — public flows, tables, who may record a payment | Rahman / Finance | Neither exists anywhere in the website or workspace today. Payment is last and never automatic. |
| 11 | *(phase 3)* Adopt `casa_student.*` as the workspace's own model and merge the analytics bridge's Postgres into it | Rahman + the migration project | One database for CASA's system. The 23 draft-import quality issues are decisions, not bugs. |

Items 5 and 6 are read-only and can be done as soon as someone with the
`FileMaker SRV` credential is on the school LAN. Items 2–4 and 8 are one
sitting in FileMaker Pro. Item 1 is a conversation, and it comes first.

---

## 8. Files consulted

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
