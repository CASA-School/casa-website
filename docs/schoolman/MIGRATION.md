# SchoolMan → the workspace: the migration, as it stands (2026-10-27)

**Read this first** before touching anything that moves data out of SchoolMan (CASA's FileMaker database)
into the staff workspace. It says what runs, what comes across and what deliberately does not, how to
change it, and every pitfall met so far. The study of SchoolMan itself is in this folder's area pages
([README.md](README.md)); the bridge's design history is in [../FILEMAKER_BRIDGE.md](../FILEMAKER_BRIDGE.md)
(§8 the bridge, §9 the sync); FileMaker's defects and the rule for each in
[../FILEMAKER_LESSONS.md](../FILEMAKER_LESSONS.md).

Direction (Rahman): the workspace is a **parallel system** that gets **all of SchoolMan's data, as clean
facts from their real source — never FileMaker's copies, caches or quirks**; the new backend must be
stronger and more logical than SchoolMan. SchoolMan stays the system staff book in until modules move;
nothing is ever written into SchoolMan.

---

## 1. What runs, end to end

```
SchoolMan (FileMaker Server 26, Mac mini 10.0.60.10, office LAN)
   │  90 Sync_<Table> layouts — base-table fields only, hidden from staff menus
   │  Data API, account WorkspaceSync (Full Access by Rahman's choice; the code only GETs and _finds)
   ▼
sync service  scripts/schoolman-sync/sync.mjs      a container on the office server (CT 103), since 2026-10-31
   │  every minute: what changed; every 5 min: the two dotted-change tables whole; every 30 min: tables
   │  without a change field; 02:15: every table whole + its record ids (deletions)
   │  only records whose modId moved are sent, 500 a request, HMAC-signed (SCHOOLMAN_SYNC_KEY)
   ▼
POST https://neu.casa-bremen.de/api/schoolman/sync   (src/app/api/schoolman/sync, 404 without a key)
   ▼
schoolman_records (migration 0090)   one row per SchoolMan record: record id, modId, fields as JSON
   │  a batch that changed the copy raises its table's `version` (0099) and starts the job (below)
   │
   │  Azure Container Apps job caj-casa-website-schoolman — started by the endpoint when the copy changed,
   │  and hourly at :07 as a fallback (infra/azure/schoolman-job.sh; 0.75 vCPU / 1.5 GiB)
   ▼
bridge-mirror.mjs: the steps whose SchoolMan tables changed → mirror-export.mjs (only their tables, one file
                   each) → their read_*.py (FM_MIRROR) → their import-*.mjs → the workspace's tables
                                                                          (20 steps, bridge-steps.mjs)
```

- **Only what changed (2026-10-28, migration 0099; Rahman: the Azure costs had doubled).** Before, the job
  started every five minutes — four of five starts found nothing — and any change ran all 20 steps on all
  90 tables (3½ minutes at 1 vCPU / 2 GiB, every reader parsing the whole copy). Now:
  - **Started on change, at most once in five minutes.** A batch that changed the copy marks it waiting
    (`schoolman_bridge_state.pending_since`, 0100). The endpoint then asks Azure to start the job
    (`src/lib/schoolman/bridge-trigger.server.ts`) when something waits, no run is going on
    (`running_since`) and the last start (`requested_at`) was five minutes ago or more. The sync service
    sends a signed tick (`{ "tick": true }`) after every round, once a minute, so changes held back by
    those rules start the job as soon as they may. It asks with the app's managed identity
    (`id-casa-website-prod`), whose role „CASA bridge job starter" allows starting and reading that one job
    and nothing else; the app knows the job by `SCHOOLMAN_BRIDGE_JOB` (its resource id). A start that
    fails clears `requested_at`, so the next tick asks again; the hourly schedule catches anything else.
    (0099 alone started on every change and had a run go round again while SchoolMan kept changing: on
    27.–28.10. a busy morning became one run after another, each doing the learners again.)
  - **Only the steps that changed.** Each table of the copy has a `version` that rises with every batch that
    added, changed or removed a record (a counter, not a time: a batch committed late with an early time
    would look seen). Each step's reader notes the tables it reads (`FM_MIRROR_USED`, fm_read.py); after a
    step runs, `schoolman_bridge_steps` keeps those tables with their versions and the bridge code's hash.
    A run does a step when one of its tables' versions moved, when the bridge's code changed (after a
    release every step runs once), or when an earlier step of the run added or removed records later
    steps attach to (people, bookings, courses, lesson days … — a booking now here brings its attendance).
    Only the tables of the steps that run are exported, one file each, and a reader loads only the tables
    it asks for; a reader that asks for a table it did not read before gets them all on a second try.
  - **Every step once a night** (the first run between 02:00 and 06:00 Berlin after 20 hours, or after 30
    hours whatever the hour): what depends on today's date — who is in the learner sample, which sittings
    lie ahead — moves on then. `--always` forces it.
  - **No change lost.** A run clears `pending_since` when it begins, before it reads the versions: a change
    after that marks the copy waiting again and is the next run's. A run whose step failed marks it
    waiting, so the next start (five minutes on) tries again.
- Two runs never overlap (advisory lock); a run waits until
  every table has had one complete read (`schoolman_sync_tables.last_complete_at`), so a half-filled copy can
  never look like deletions. Runs are rows of `bridge_runs` with source `schoolman-copy`; the workspace's
  „SchoolMan · Stand" is the last time the service sent.
- A normal run takes one to two minutes: every importer fingerprints its records (`bridge_fingerprints`,
  0088) and passes over the unchanged. A run after a change to what a record carries rewrites those records
  once (the learners: about an hour) — the job allows two hours.
- **The old bridge** (`infra/azure/bridge.sh`: read SchoolMan through FileMaker Pro on the office Mac with
  AppleScript, seal, upload, import in Azure) still works and is the way back. It is no longer run.
- **Where the service runs** (2026-10-31; Rahman: so his Mac can be off): the container `schoolman-sync` on the
  office's Proxmox server, CT 103 (`claasbook-srv1`, `10.0.60.11`, beside the Klassenbuch), in
  `/root/docker/schoolman-sync` — image `node:22-bookworm-slim`, user 1000, restarted by Docker, at most 768 MB
  (it uses about 70). Not on the FileMaker Mac mini: that machine runs only FileMaker, and it is reached only
  through Rahman's Screen Sharing. The Klassenbuch monitor on CT 103 watches the container
  (`/etc/klassenbuch-monitor.json`): a stopped container, a restart or a line saying „failed" is mailed to
  admin@, and the daily report at 07:00 has a line for it.
- **Not yet:** writing anything into SchoolMan (never without a dedicated account and Rahman's go,
  docs/FILEMAKER_BRIDGE.md §7).

## 2. What comes across

**90 layouts, 902 fields, about 722,000 records** (`scripts/filemaker/sync-layouts.json`; each entry: layout,
key, change field and kind, fields, field types). Made in SchoolMan on 2026-10-27 with Rahman's go — 68 in
the morning (every field the readers read), 22 tables and 246 fields more in the afternoon after the
completeness review (§4). All 90 read back as WorkspaceSync with every field.

Tables: Accommodation, ActivityReference, Address, AdminWork, Agency, Agreement, AnimalAtHome, BankAccount,
Booking, Classroom, CleaningDetail, Comment, Commission, CommissionDetail, Complaint, Contact, Contractor,
Corporate, CostDetail, CostDetailReferenceComment, CostDetailSample, Course, DateAccommodation, DateBooking,
DateCourse, DateHoliday, DateOffer, DatePlacement, DateRent, DateTargetWorkTime, DateValidity, DayTime,
Editorial, Email, Exam, Flag, Group, HolidayReference, Instalment, Institution, Internship, Invoice, Key,
KeyTypeReference, LanguageReference, Letter, LevelStep, Management, Offer, Order, OrderDetail, PaymentIn,
PaymentOut, Person, Phone, PreBooking, ProcessReference, Project, Purview, Room, ServiceDetail,
ServiceDetailReference, ServiceDetailSpecificationReference, Session, SingleDateActivity, SingleDateControl,
SingleDateCourse, SingleDateExam, SingleDateHoliday, SingleDateOccupancy, SingleDateStudent,
SingleDateTraining, SingleDayCalendar, SingleDayStaff, SingleMonthStaff, SingleWeekCleaning, SingleYearStaff,
StaffMember, StaffSchool, StatementLandlord, TestStudent, TrainingReference, TrainingStaffMember,
TypeContactReference, TypeWorkReference, WaitingRoom, WeekDay, WeekDayWorkTime, WorkFlow, WorkFlowLetter.

**Which learners.** The copy holds every record; the readers bring the learners of one selection
(`scripts/filemaker/sample.py`, shared by every reader so they never drift): everyone in a course this week
or later; a booking not taken („nein"/„storno") that ran in the last four weeks; this year's group-visit
participants; every booking that began in 2024 or 2025; and since 2026-10-27 (Rahman: „bring them all")
everyone with an exam booking (sitting from 2024, or not taken and recent) and everyone with an open
waiting-list place from the last twelve months — 552 more learners, so an exam date shows SchoolMan's count
(telc B2 13.11.: 21, not 7). Learners outside the selection stay in SchoolMan (decided per area in
bridge-gaps.md).

**Dates on the website** (2026-10-29, Rahman: „let the sync publish new starts automatically").
SchoolMan is where CASA plans its dates, so the bridge puts what it plans on the website by itself:
- an **intensive start** ahead that the website does not have yet, with its levels from SchoolMan, and for a
  morning start the **Bildungszeit** start of the same weeks (`import-courses.mjs`). A start CASA cancelled
  in the workspace is not made again;
- a **telc exam day** ahead (B2, C1 Hochschule) is made published, with the deadline the site states, one
  month and a day before (`exam-sittings.mjs`). A day the bridge made as a draft earlier is published unless
  a colleague has changed it in the workspace;
- a **telc preparation course** ahead (B2, C1 Hochschule; 2026-10-31) is made published, its own start under
  the type „Prüfungsvorbereitung" (`import-courses.mjs`; 0111 published the ones made before). The site knows
  its exam only by the start's title (`preparationExamOf`), so a title that names neither is not offered;
- the **evening terms are the website's own**: they are published before SchoolMan has them, and the bridge
  never makes one;
- nothing is taken off the website when SchoolMan drops a date: a start or sitting is cancelled in the
  workspace.

**What the workspace gained on 2026-10-27** (the four mapping PRs, migrations 0092–0095, plus 0096 for the
exams screens; counts from the local test runs):

| Area | Brought across |
| --- | --- |
| People & staff (0092, #166) | 474 passport numbers (the visa letter prints them); mother tongue and country of birth from SchoolMan's ids (514 label copies corrected); e-mail and bank-account notes; all 59 internship hosts (was 13); organisations' main contacts (59) and own bank accounts; staff trainings (25), leave requests with kind and approval (920), weekday target hours (1,124), admin-time entries (12,062), month approvals; levels a teacher teaches (into Kursplanung where not set by hand); colleagues linked person→staff (7 who had arrived half empty) and staff nationality |
| Bookings, courses, intake, exams, offers (0093, #168) | the waiting list 149 → 390 (222 exam waits; the person from the pre-booking); every exam date ahead with parts and examiners, places from SchoolMan; the teacher's level answers, course results, university programmes (HereStudies, Prime: `programmes`), the Klassenbuch's booking note; level band and time of day of periods whose course is not here; tests on the booking of their course; courses' place and teacher notes; the intake note (exam asked for, in Germany, contact way, wishes); offers' sent dates; SchoolMan's closures to 2030 (`school_closures`) |
| Money, letters, history (0094, #167) | the charge a payment settles (15,252), who booked it, its instalment; a charge's book and its reversal pair, and the real day of 3,806 cancellation lines; rent payout periods; payouts classified (other 635 → 1; kind-less older refunds stay off the learner's account as in SchoolMan); cancelled invoices, invoice ↔ offer/group/party; letters on every booking they name (`letter_bookings`), course-wide letters, totals paragraph, signer, CC/BCC, place, invoice, waiting entry; certificates of participation (1,758); the kind of every history line (66,732) and absence notices (591); course notes; a new bridge step `history` |
| Accommodation (0095, #165) | CASA's flats from SchoolMan's marker; pets; what a host offers; contacts for 29 more places (hosts linked person→place); room numbers (76); beds held for intensive terms with whom the host takes (147); the Wohnungsgeberbestätigungen rebuilt from their fields and linked to learner and stay (487) |
| Exams screens (0096, #170) | notes on an exam date; the module rebuilt (views, filters, a date in tabs, mail to candidates/examiners, letter to one candidate) |

## 3. What deliberately does not come across

- **SchoolMan's plumbing** — keys copied onto records for relationships (`_ID_Platform`, `_ID_Client`,
  `_ID_Provider`, the business-line keys `_ID_InternationalAirport`/`_ID_CentralStation`/`_ID_NationalAirport`/
  `_ID_BusStop`, which point at one empty record per booking and line — not transfers), selection marks,
  counters, cached summary texts (`Schedule*`, `List_*`), UI state. Per field in the reviews (§4).
- **Copies** of a fact held elsewhere — the reader takes the source (e.g. the label copy `MethodPayment_1`
  → `_ID_MethodPayment`).
- **Calculations that depend on the screen**: `SingleYearStaff::RemainingHoliday` subtracts the holidays of
  the year chosen in a global field; `read_time.py` works it out from the days taken.
- **Passwords**: `StaffMember::Login` (generated initial passwords) and `MailAccount` are never put on a
  layout. Party notes (`Management::CommentManagement`) may hold credentials and are not imported.
- **By Rahman's decision**: `DateStaffAtWork` (2026-10-26). **Never read**: `SingleDayStaff::cal_*`,
  `StaffMember::CommentsOnTeacher`.
- **Transfers** (airport/station pick-ups) were abandoned in SchoolMan in 2023.

**Open decisions for Rahman** (recommendations given 2026-10-27, not yet answered): former colleagues
(`Hades`) as „ausgeschieden" — yes; learners' placement needs (`SpecialStudent`: diet, allergies) — yes,
accommodation only, illness no; kind of sick note — not now; teacher bonus per course — yes, management only;
licence numbers only in `CodeNumber` — yes; party notes after screening for credentials; „Erschienen" worked
out from attendance; SchoolMan's exam „gesperrt" a mark only; course starts owned by the workspace's
Kurstermine; bank accounts of payouts and hosts — finance only; issuing the Wohnungsgeberbestätigung from the
workspace — next; the small host flags (all-year offer, deregistration tick, broadcasting-fee number),
accommodation types 3/4/5, `StaffMember.MonthNumber` (payroll number?), an agency's commission setting,
`OperationField` vs the staff record for course types, document links (`Url`, `Medium`), the office handbook
(`Emanuel`), the tandem board, levels 8 SK / 9 ND, letters and notes about colleagues (HR). The full list
with evidence is in each review's DECIDE rows.

## 4. The reviews behind it

[completeness/](completeness/) — 2026-10-27: every SchoolMan field filled on records created since 2025 that
no reader read (541 in 43 tables, `gaps-2026-10-27.txt`) and every table with records no layout covered (155,
`tables-not-covered-2026-10-27.txt`), each given a verdict with evidence — MAP / ALREADY / COPY / PLUMBING /
ABANDONED / DECIDE — by area: [people.md](completeness/people.md), [bookings.md](completeness/bookings.md),
[money-letters.md](completeness/money-letters.md), [accommodation.md](completeness/accommodation.md). Every
MAP item was built (§2), except where a PR says why not (e.g. the month comment is a stamp SchoolMan writes;
daily adjustments would double-count). The earlier [mapping-review-2026-10-26.md](mapping-review-2026-10-26.md)
and [bridge-gaps.md](bridge-gaps.md) (updated per item: „across since 009x") stay the record of each gap.

## 5. Running it

| Task | How |
| --- | --- |
| Reach the server | `ssh -i ~/.ssh/casa_klassenbuch_ed25519 root@10.0.60.11` over the office VPN; SSH drops when several connections open in a row, so the scripts keep one open |
| The service's log | `docker logs schoolman-sync` on CT 103 (counts only; 3 × 5 MB kept) |
| Update it (after a change to sync.mjs or sync-layouts.json) | `scripts/schoolman-sync/server/deploy.sh` from a checkout of `main`: copies the files, recreates the container |
| Stop it | `scripts/schoolman-sync/server/deploy.sh --off` |
| The way back to the Mac | `deploy.sh --off`, copy `/root/docker/schoolman-sync/state/state.json` to `~/.casa-schoolman-sync/`, then `scripts/schoolman-sync/install-mac.sh <FM_CERT_SHA256>`. Never both at once |
| Its secrets | Files in `/root/docker/schoolman-sync/secrets/` (user 1000, mode 400), put there by Rahman with `scripts/schoolman-sync/server/secrets.sh` straight from his Keychain items `casa-workspacesync` (WorkspaceSync's password) and `casa-schoolman-sync-key` (= the app secret `schoolman-sync-key` / env `SCHOOLMAN_SYNC_KEY`) — never typed or printed by an agent. Rotating: change the Keychain item, run secrets.sh, `docker restart schoolman-sync` |
| The server certificate pin | `94:10:06:8A:19:88:25:B2:2B:06:50:64:B0:DC:D3:CB:BB:95:0F:C0:24:1B:68:3D:76:A0:0E:C1:8C:AF:66:DC` (the certificate names another machine, so it is pinned) |
| Its state | `/root/docker/schoolman-sync/state/state.json` (on a Mac `~/.casa-schoolman-sync/state.json`): per table the modIds sent, the newest change seen, a hash of the field list (a layout given more fields is sent whole once) |
| Read everything again | stop the container, then `docker compose run --rm sync --full` in `/root/docker/schoolman-sync` (2½ min locally, 6 min to Azure), start it again; one table: `--full --table Letter`. Never beside the running service: both write the same state |
| The scheduled job | `infra/azure/schoolman-job.sh` creates it or points it at this checkout's image (builds it like db-job.sh); `--off` removes it. Its logs: Log Analytics, `ContainerAppConsoleLogs_CL | where ContainerJobName_s == 'caj-casa-website-schoolman'` |
| A release whose migration ALTERs a table the bridge writes (people, letters, staff_notes, bookings …) | stop the running execution, `schoolman-job.sh --off`, `deploy.sh`, `schoolman-job.sh` — an ALTER waits for the bridge's long transaction and blocks every read of that table meanwhile |
| A release that changes readers/importers only | `deploy.sh` is not needed for the job: `schoolman-job.sh` builds and points the job at the new image |
| Force a bridge run with nothing new | `node scripts/filemaker/bridge-mirror.mjs --always` (every step); every record written again: `BRIDGE_FULL=1`. In Azure: `az containerapp job start -n caj-casa-website-schoolman -g rg-casa-website-prod` runs what changed |
| Which steps a run did, and why not the rest | the job's log: `== <step>` for each step run, `unchanged, not run: …` for the rest; `schoolman_bridge_steps` holds each step's tables and versions; `schoolman_bridge_state` whether a run is going on and when the last full one was |
| The old way | `./infra/azure/bridge.sh` with SchoolMan open in FileMaker Pro |

## 6. Changing what comes across

A new field of a table already synced:
1. Add it to `scripts/filemaker/sync-layouts.json` (`fields`, and `types` unless Text — from
   `scripts/filemaker/layouts/ddr-fields.json`). Never a calculation that depends on globals or the screen,
   never a password.
2. Put it on the layout in SchoolMan — **with Rahman's go**, FileMaker Pro open on his Mac, nobody touching
   FileMaker or the clipboard for the minutes it takes: `scripts/filemaker/layouts/add_fields.sh <Table>
   <field> …` (goes to the layout, copies it, pastes the field as XML2, copies back and compares every
   binding, saves). A new table: `make_layout.sh <Table>` (new layout on the base table occurrence, fields,
   hidden from menus, saved). See [../../scripts/filemaker/layouts/README.md](../../scripts/filemaker/layouts/README.md).
3. `node scripts/filemaker/layouts/verify_layouts.mjs` — every layout, every field, as WorkspaceSync.
4. Merge and release (the endpoint only accepts tables in sync-layouts.json), then restart the service: it
   sends the table whole once.
5. Reader and importer (and a migration), tested on a local copy: `node scripts/filemaker/mirror-export.mjs
   cols.json` → `FM_MIRROR=cols.json python3 -I scripts/filemaker/read_<x>.py | node
   scripts/filemaker/import-<x>.mjs` against a local database; run twice — the second run passes over
   everything. Compare with FileMaker Pro when formats matter (run the same reader without `FM_MIRROR`).
6. Release (job paused if the migration ALTERs a bridge table), `schoolman-job.sh`, and expect the first run to
   rewrite the records whose fingerprint changed.

## 7. Pitfalls met, and the rule for each

- **Fingerprints.** Never put a value the run itself changes into a fingerprint (exam hours rewrote every
  learner), nor rows in the order the database returns them (a release re-applies the seeds and reshuffles:
  `unordered()`); a step whose records others can change (lesson days) also compares with what is held, or a
  wrong day is never set right (Birte Klaila / Mariella Baier swapped).
- **AppleScript vs the Data API.** AppleScript gives line breaks as LF, numbers as typed („15,00",
  „1.857,96"), times without :00 seconds; the Data API gives CR, values, `HH:MM:SS`. `mirror-export.mjs`
  converts by the field's type; the readers parse both alike. Text typed into a number field loses its dots
  in the Data API (German thousands separator): `read_learners.py` (`undotted`, test results) and
  `read_intake.py` (`step`) restore them; a typed „1.204" is FileMaker's 1204.
- **Links the other way round.** Newer colleagues: `Person::_ID_StaffMember` instead of
  `StaffMember::_ID_Person`; newer hosts: person → place. Check both directions for every join.
- **The Data API refuses a find on a field name with a dot** (`Timestamp.Change`, FileMaker 960): PreBooking,
  WaitingRoom and Contact are read whole every 5 minutes.
- **NUL characters** in a few letters: Postgres refuses them in jsonb; stripped on arrival.
- **Doubled SchoolMan keys** (attendance): one batch may not update a row twice — the last row wins.
- **Long runs**: the job's limit is two hours (the first was cut off at 55 minutes and rolled back).
- **The screen** (layout work): a locked screen or another app taking focus breaks UI scripting — keep the Mac
  awake (`caffeinate -dimsu`), check FileMaker is in front before every menu click, and write the clipboard and
  paste in one go (once a copied password landed on a layout as text; reverted before saving).
- **Never edit an applied migration** (0090 was, locally: fix the checksum in `schema_migrations` or write a
  new one).

## 8. Files

| What | Where |
| --- | --- |
| The layouts and their fields | `scripts/filemaker/sync-layouts.json`, [sync-layouts.md](sync-layouts.md) |
| Layout tools (GUI, read-only except layout design) | `scripts/filemaker/layouts/` |
| The service | `scripts/schoolman-sync/` (`sync.mjs`, `signature.mjs`; `server/` for the office server: `compose.yaml`, `run.sh`, `deploy.sh`, `secrets.sh`; `install-mac.sh` for a Mac) |
| The endpoint and the copy | `src/app/api/schoolman/sync/route.ts`, `src/lib/schoolman/`, migration 0090 |
| The bridge from the copy | `scripts/filemaker/bridge-mirror.mjs`, `mirror-export.mjs`, `bridge-run.mjs`, `fm_read.py` (`FM_MIRROR`) |
| The steps | `scripts/filemaker/bridge-steps.mjs`, `read_*.py`, `import-*.mjs`, `sample.py`, `bridge-changes.mjs` |
| The job | `infra/azure/schoolman-job.sh`, `infra/azure/db/` (image with python3, `task.sh bridge-mirror`) |
| Decisions and gaps | [bridge-gaps.md](bridge-gaps.md), [completeness/](completeness/), §3 above |

## 9. Still to do

- Rahman's answers to §3's decisions, then their mappings.
- Remove the one-run transition in `import-learners.mjs` (`vocabulariesBefore`) once a run has passed with it.
- The e2e follow-ups (course list after the back-link change, offers on start days, the staff contract test).
