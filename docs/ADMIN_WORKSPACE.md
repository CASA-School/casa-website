# The CASA staff workspace

`admin.casa-bremen.de` · `/admin` in this repository

Read this before touching anything under `src/app/(admin)`, `src/lib/admin` or
`src/components/admin`.

---

## What it is, and what it is for

An internal tool for CASA's administrative staff. Everything a visitor sends
through the public site now lands in a queue here with a **status** and an
**owner**, instead of leaving the building as a webhook POST that nobody could
query.

Five queues, one job each:

| Screen | Answers |
| --- | --- |
| **Overview** | Is anything waiting on me? |
| **Enquiries** | Who has written to CASA and not been answered? |
| **Registrations** | Who has signed up, for which cohort or sitting, and what do they still need? |
| **Placement** | Which Einstufungstest recommendations is a teacher yet to confirm? |
| **Applications** | Where is each job application in the pipeline? |

Plus three reference screens: **Courses & exams** (live demand against the
published catalogue), **Activity** (who changed what), **Team** and
**Settings**.

### What it is not

- **Not a replacement for FileMaker yet.** It is the system that will replace
  it, growing around it (`docs/FILEMAKER_BRIDGE.md` §0). Since migration 0007
  the workspace keeps its own person register and a `filemaker_links` table
  for the bridge to point rows at their FileMaker counterparts; nothing writes
  those links yet. Until it does, the workspace and FileMaker are two records
  of the same person.
- **Not the removed portal.** The role-based student/teacher portal that used to
  live in this repository is gone and is not coming back. This is a
  staff-facing operations tool with three roles, no learner-facing surface, and
  no relation to that code.
- **Not a mail client.** Every "Reply" button is a `mailto:`.

---

## Running it locally

```bash
npm run db:up        # Postgres 17 in Docker, on port 5433
npm run db:migrate   # schema, including 0006 to 0011
npm run db:seed      # baseline catalogue, plus CASA's rooms and locations
npm run db:seed      # baseline public data (courses, exams)
```

Then put the connection string in `.env.local`:

```
DATABASE_URL=postgres://casa:casa_local_dev@127.0.0.1:5433/casa
```

### Your first account

There is no bootstrap route and no default password. The first account is
created deliberately, from a shell, by someone who already has the database
credentials:

```bash
ADMIN_EMAIL=you@casa-bremen.de ADMIN_NAME="Your Name" npm run admin:seed
```

With no `ADMIN_PASSWORD` it generates one and prints it **once**. Pass
`ADMIN_PASSWORD=...` to choose your own. Running it twice reports that the
account exists rather than resetting anything — use the Team screen for that.

Sign in at `http://localhost:3000/admin`.

### Plausible records to look at

```bash
node scripts/admin/seed-demo.mjs            # 6 enquiries, 8 registrations, 3 placement attempts
node scripts/admin/seed-demo.mjs --clear    # remove exactly those again
```

This is **not** in `db/seeds/`, and that is deliberate: that directory gets
applied to real databases, and fake people do not belong in a real queue. Every
row it writes is tagged `source = 'demo-seed'` and every person it creates
`created_by = 'demo-seed'`, so `--clear` removes those and nothing else. One
exam candidate is deliberately seeded with a demonym ("Turkish") so the
`nationality_unmatched` flag path is visible.

### Everything from scratch

```bash
npm run db:reset     # drops the volume, re-migrates, re-seeds, recreates the owner
```

---

## How the two products share one application

There are two products in this repository. Both are one Next build and one
container.

```
src/app/
├── (site)/        the public marketing website — its own root layout
├── (admin)/       the staff workspace — its own root layout
│   └── admin/
│       ├── sign-in/          OUTSIDE the gate, or it redirects to itself
│       └── (workspace)/      everything behind the gate
└── api/           public route handlers (no layout)
```

`src/app` has **no `layout.tsx` of its own**, and that is what makes the split
possible: Next allows a second root layout only when the app root has none. Both
groups therefore declare `<html>` and `<body>` themselves. Route groups are not
URL segments, so every public path is unchanged and the workspace answers on
`/admin/...`.

They share the design tokens in `src/app/globals.css` and nothing else — no
navigation, no footer, no locale provider, no structured data.

### Host routing

`src/proxy.ts` (Next 16.3's replacement for `middleware.ts`) does two things:

1. On `admin.casa-bremen.de`, `/` **rewrites** to `/admin`, so the browser stays
   on `admin.casa-bremen.de/enquiries` and never shows `/admin`.
2. On the public host, `/admin/*` **404s in production**. This is the important
   one: without it, `casa-bremen.de/admin/sign-in` is a login form on the domain
   every prospective learner visits.

Local development is exempt from rule 2, because there is no `admin.localhost`
by default and requiring one would mean editing `/etc/hosts` to open the
dashboard. `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST=true` reopens it on a production
deployment — for the window between shipping the container and pointing the
admin DNS record at it, and no longer.

**`proxy.ts` is not authentication.** It decides which host serves which tree.
It runs before the request reaches the app, with no database connection, and
cannot verify a session.

---

## Security model

Four checks, and each is load-bearing on its own.

### 1. The layout gate

`src/app/(admin)/admin/(workspace)/layout.tsx` resolves the session and
redirects to `/admin/sign-in` when there is none. Every workspace screen is a
child of it, so a page cannot forget to check.

### 2. Every server action checks again

A server action is a public HTTP endpoint. Nothing about a POST to one goes
through the layout that rendered the form, so the gate does not protect it.
Every exported action in `actions.ts`, `team/actions.ts` and
`planning/actions.ts` starts with `requireModule(<module>)` from
`src/lib/admin/guard.ts`, and `src/lib/admin/__tests__/host-routing.test.ts` asserts
that they all do.

### 3. The CV download route checks for itself

`applications/[id]/cv/route.ts` is a route handler, not a page, so it is not a
child of the layout either. It authenticates, logs the access, and serves the
bytes as `application/octet-stream` with `Content-Disposition: attachment` and
`X-Content-Type-Options: nosniff` — never the uploader's own MIME type, because
an SVG or an HTML file masquerading as a CV would otherwise be stored XSS
against every signed-in colleague.

### 4. Sessions are server-side

`staff_sessions` holds the SHA-256 of a 32-byte random token, never the token.
A signed self-contained cookie cannot be revoked before it expires — signing
out would be cosmetic, and a laptop left on a train would stay logged in.
Twelve-hour expiry, refreshed on use at most once every five minutes.

### Passwords

scrypt from `node:crypto` (`N = 2^16`, `r = 8`), encoded with its own
parameters so the cost can be raised later without a migration:

```
scrypt$65536$8$1$<salt base64>$<hash base64>
```

One rule: **12 characters, of anything.** No composition rules — they
measurably push people towards `Casa2026!` and are not in NIST 800-63B any
more.

`signIn` returns null for every failure — unknown address, wrong password,
deactivated account — and verifies against a throwaway hash when no account
matched, so an unknown address costs the same ~100 ms as a real one. Response
time leaks nothing and the form is not an account-enumeration oracle.

### Roles, modules and levels

The workspace is a set of **modules**, registered once in
`src/lib/admin/access.ts`: overview, enquiries, registrations, placement,
applications, people, planning, catalogue, activity, team, settings. For each
module a person holds a **level** — `none`, `view`, `edit` or `full`. `view`
opens the screens, `edit` creates and changes, `full` also deletes and does
the irreversible things. A role sets the default level per module; a
per-person exception (`staff_module_access`, 0008/0009) overrides one module
for one account. Three places read the resolved access and nothing else
decides it: the sidebar (what to show), each module's `layout.tsx` (what to
serve — every module directory has one, asking for `view`), and every server
action (what to execute, asking for the level the mutation needs). Hiding a
link is not access control.

| Role | Default |
| --- | --- |
| `staff` | `edit` on Enquiries, Registrations, Placement, Applications, People, Bookings, Courses & exams, Activity; `view` on Overview and Settings; `none` on Rooms and Team |
| `admin` | `full` everywhere, and sets other people's levels on the Team screen |
| `owner` | The above, plus granting the owner role |

Overview and Settings never drop below `view`; Team is never granted by
exception. Changing someone's levels ends their sessions, so a narrowed set
takes effect at once. The Team screen shows the matrix and edits it for
`staff` accounts.

### Create, edit, delete

Every module that holds records offers the three, the way FileMaker does, with
two differences. Forms open in a **dialog** (`FormDialog` in
`src/components/admin/dialogs.tsx`) from a button in the page header, so a list
stays a list. And every destructive action goes through **`ConfirmSubmit`**: a
button inside the form that opens a confirmation, and on confirm submits the
form with a hidden `confirmed=1` that the server action checks — a request that
skipped the dialog is refused, so the confirmation is not only visual.
Deletes are soft where history matters (`people.deleted_at`,
`bookings.deleted_at`; a room is removed outright because nothing refers to it
once its cohorts are moved; a payment is voided, never deleted). Today: people
(add, edit, delete), bookings (create, edit, extend, cost lines, payments,
cancel, delete), cohorts (schedule, assign room), rooms (add, edit, delete),
staff accounts (add, deactivate with confirmation).

### Navigation

Three collapsible groups — **Inbox** (enquiries, registrations, placement,
applications), **School** (people, bookings, rooms, courses & exams), **Administration**
(activity, team, settings) — with nested items under Registrations, People and
Courses & exams. A group opens itself when a screen inside it is current and
remembers a manual open/close in the browser. New screens go into an existing
group or a nested item; the rail never grows a flat list.

CASA cannot be left with no active owner; the workspace refuses the change that
would do it. **Deactivation, not deletion** — a deleted account takes its name
out of every `assigned_to` and leaves the activity trail pointing at nobody.
Deactivating revokes access on the spot (every live session is closed) and
keeps the history readable. There is no delete button.

There is no self-service password reset. It would need outbound email the
workspace does not have, and a reset link from an address nobody monitors is a
security hole dressed as a feature.

---

## Progressive disclosure

Every form asks first for what makes the record valid and useful, and reveals
the rest on demand. The plain-form convention makes this cheap: a collapsed
`<details>` element needs no JavaScript. Concretely — creating a room asks for
location and name; nickname, floor, kind and capacities open under *More*, and
everything is editable on the room's own page. Screens follow the same rule:
a list shows the summary, the record page shows the detail. FileMaker's
layouts with every field visible (`Course` has 173) are what this replaces.

## Copy on screens — labels, not explanations

The product is used daily by staff and must stay presentable. A screen shows
labels, values, badges and controls. It does **not** carry explanatory notes —
why a value is kept as written, what a declared level is not, which module is
not built yet. That reasoning belongs here, in `docs/`, or in a code comment.
The test in `placement-containment.test.ts` checks the placement screen for
forbidden *labels* rather than for the presence of a disclaimer for this reason.

---

## Data flow from the public site

`src/lib/admin/intake.ts` is the write path. Three rules:

1. **The webhook stays.** Persisting was added *alongside* the fan-out, never
   instead of it. CASA may have automations wired to those webhooks that nobody
   has inventoried.
2. **Neither failure loses the other.** The row is written before the fetch, so
   a webhook timeout does not lose the record; and the store functions never
   throw, so a storage failure does not tell a visitor their enquiry failed when
   the fan-out succeeded. Each route reports `stored: true|false` in its own
   response and the server log names the cause.
3. **Status is staff-owned, content is visitor-owned.** Nothing in the workspace
   rewrites what a person submitted.
4. **Every submission creates a person, in the same transaction.** Since 0007 a
   queue row is never written without a `people` row, its email and phone as
   typed channels, and the flags for whatever intake could not settle
   (`duplicate_candidate`, `nationality_unmatched`, `level_unmatched`,
   `birth_date_unparsed`). Text that types is typed alongside the raw column;
   text that does not is kept verbatim and flagged, never corrected. Intake
   never decides two rows are the same human — it raises the question, a staff
   member answers it by linking (`docs/FILEMAKER_LESSONS.md` §1, §2.4, §11).

| Public route | Table |
| --- | --- |
| `POST /api/contact` | `enquiries` |
| `POST /api/registration/course` | `course_registrations` |
| `POST /api/registration/exam` | `exam_registrations` |
| `POST /api/careers/apply` | `career_applications` + `career_application_files` (pre-existing) |
| `/placement-test` | `placement_attempts` (pre-existing) |

---

## Placement review — read this before changing that screen

`db/migrations/0005_placement_test.sql` says in its own header that it carries
no staff-review tables because review "belongs to the CASA dashboard
workspace". `placement_reviews` in `0006` is that table.

**CLAUDE.md hard rule 6 applies to this surface.** The workspace is a client:
its HTML goes to a browser on a shared office machine like any other. So
nothing here reads `placement_responses.value`, joins against the item bank, or
imports from `src/config/placement/content/`. A teacher gets the engine's own
output — band, confidence, skill profile, answered share, review reasons,
rationale, the learner's self-reported intake, and their writing in their own
words. That is a better basis for the decision than an answer sheet, and it
keeps the 163-item bank intact for the next candidate.

`src/lib/admin/__tests__/placement-containment.test.ts` asserts the
construction, and it is not vacuous — adding `item.answer` to
`src/lib/admin/placement.ts` fails it.

Two further rules the screens enforce in copy:

- The engine's recommendation is **never overwritten**. A confirmation is a new
  row, so "what the test said" and "what a teacher decided" stay two separate
  facts. That is the whole point of shadow mode.
- A note is **required** when the confirmed level differs from the
  recommendation. The schema cannot express that (a check constraint there
  cannot see the recommendation), and it matters: a disagreement with the
  instrument is the only evidence CASA will have for whether the pilot cut
  scores in `src/config/placement/policy.ts` are right.

---

## Design layer

Scoped to `.casa-workspace` in `src/app/globals.css`, so the public site keeps
exactly the palette it was designed with. A dense tool read at arm's length for
a whole working day needs three things the marketing site does not:

1. **Hairlines with real separation.** `--casa-sand` is a beautiful edge on a
   lone white card and disappears behind forty table rows. The workspace has
   three line weights — `--ws-line-firm` for structure, `--ws-line` for
   repetition, `--ws-line-soft` for nested boxes — plus `--ws-sunk` for a
   recessed band.
2. **A ground one step darker.** The site's canvas is 1.02:1 against white,
   which you can measure and cannot see once a card fills the viewport.
3. **15px body, not 17px.** A table of names, dates and money at 17px forces
   horizontal scrolling on a laptop.

Everything else is inherited, including the contrast discipline: accents still
resolve through `--casa-accent-text`, so they are AA on both the ink sidebar
and the white cards.

### Conventions

- **CASA's sun (`#ffd500`) is used once per screen**, as the marker on the nav
  item you are standing on. One accent, used once, so "you are here" registers
  before the label is read.
- **Playfair Display for titles at 16px and up; Plus Jakarta Sans for
  everything else and every numeral.** Playfair's hairlines thin out below
  ~20px, and it has no tabular figures worth the name. Numerals in the
  workspace are tabular by default (`globals.css`), because every list here is
  a column of counts and dates read downwards.
- **Radius follows the three-tier scale** in `src/config/brand/tokens.ts` — 4px
  controls, 6px cards, 8px shells. No fourth value.
- **Every primitive in `src/components/admin/ui.tsx` is a server component.**
  No hooks, no handlers. Every mutation is a plain `<form>` posting to a server
  action, so a screen keeps working when a chunk fails to load — and the
  interactions here (filter, set a status, write a note) genuinely are form
  submissions. `nav-link.tsx` is the one client component, because "am I the
  current page?" needs the pathname.
- **Icons are drawn in `src/components/admin/icons.tsx`**, on a 16-unit grid at
  1.5px. `lucide-react`'s are 24-unit at 2px and sit visually heavier than the
  labels beside them.

---

## The database

`db/migrations/0006_admin_workspace.sql`, `0007_people_and_flags.sql`,
`0008_rooms_and_module_access.sql`, `0009_access_levels_and_soft_delete.sql`,
`0010_bookings_and_payments.sql` and `0011_catalogue_types_and_rates.sql`.
Tables from 0006:

| Table | Holds |
| --- | --- |
| `staff_users` | Local accounts. Case-insensitive unique email via a functional index |
| `staff_sessions` | Server-side sessions, token hashed |
| `enquiries` | Contact submissions, including the organiser brief as `jsonb` |
| `course_registrations` | The public wizard's output |
| `exam_registrations` | Separate table — the two forms ask genuinely different questions |
| `placement_reviews` | One row per attempt: a teacher's decision |
| `staff_notes` | Polymorphic by `(entity, entity_id)`, constrained to five entity names |
| `staff_activity` | Who changed what. `staff_name` denormalised so the trail survives a deleted account |

Plus two columns on `career_applications`: `assigned_to`, and a check
constraint that admits both the public route's `'submitted'` and the
workspace's vocabulary.

`work_status` is one enum for all four queues — `new`, `in_progress`,
`waiting`, `done`, `declined`, `spam` — rather than four text columns with four
spellings of "done".

Course and exam registrations record their product **twice**: by id, so the row
joins to the catalogue, and by the label the visitor actually saw. A cohort can
be rescheduled or withdrawn after someone registers for it, and "what they
signed up for" is not a question a live join can answer.

### 0011 — the school's vocabulary, and a real price list

Read live from FileMaker's 99 reference tables and written up in
`docs/CATALOGUE_AND_PRICING.md`. The vocabulary was ported nearly unchanged —
`charge_categories` (6), `charge_types` (32, FileMaker's `CostDetailReference`),
`accommodation_types` (6), `catering_options` (5),
`accommodation_room_types` (4), `day_times` (3, with their hours),
`materials` (36 books with ISBN and level), plus `name_de` / `short_code` /
`down_payment` / `teaching_mode` on `course_types`, `short_code` /
`parts_separable` on `exam_types` and `cefr_band` / `colour_hex` on `levels`.
Every row keeps its `filemaker_id`.

What FileMaker did not have is a price list: prices are typed per course, per
cost line, copied per group offer, or hard-coded in a `Case()` inside a script.
`rates` replaces all four. One row prices one thing — scope and target, the
conditions that narrow it (level, session, catering, room type, exam parts,
quantity band), the amount with its unit and VAT, and a **validity period**.
`applicable_rate()` returns the narrowest match on a date. `booking_charges`
gains `rate_id`, `quantity` and `unit_amount` but keeps its own `amount`,
because the rate is where the number came from and the charge is what was
agreed.

Seeded: the 36 book prices, the four exam fees recovered from the script, the
50 € enrolment fee. Course and accommodation prices are deliberately empty —
CASA enters them once, per period (`docs/CATALOGUE_AND_PRICING.md` §5 lists
the decisions).

### 0010 — bookings, periods, cost lines, payments

The first phase-2 table, modelled on what the team does on FileMaker's
Booking screen (docs/FILEMAKER_LESSONS.md §11.6). A **booking** is a
person's place on a course: `bookings` (person, course type, status
reserved / confirmed / completed / cancelled, payer, visa, notes, the
registration it came from), `booking_periods` (the dates, each pointing at a
cohort — an extension is another period), `booking_charges` (cost lines:
enrolment fee, course price, books, a cancellation as a negative line) and
`payments` (amount, method, subject, date, who took it; **voided, never
deleted**). Balance = charges − payments, computed on read.

Screens: **Bookings** (`/admin/bookings`, tabs Current / Upcoming / Reserved /
Past / Cancelled / All, balance column) and a booking page: dates, cost lines,
payments, each with its own dialog to add and its own confirmation to remove
or void; Extend, Edit, Cancel and Delete in the header. A booking is created
from a **person** (New booking) or from a **course registration** (Create
booking — the cohort, dates and catalogue price are prefilled and the
registration is marked done). The catalogue gains **Schedule cohort**
(course, dates, seats; level, session, days, time, room, title under More) and
a Booked column; `course_instances` gains `level_code`, `session`, `title`.

Not ported yet from the Booking screen: teacher on the cohort, weekday
schedule rows and holidays, the accommodation booking, letters and receipts,
the learning-progress comment.

### 0008 — rooms, locations, module access

Ported from FileMaker's `Classroom` (29), `LocationReference` (8) and `Floor`,
read live on 2026-09-09 and seeded by `db/seeds/0002_locations_and_rooms.sql`
with `filemaker_links` rows for every row (§12 of the lessons doc has what was
cleaned on the way in).

| Table | Holds |
| --- | --- |
| `locations` | A site (`Am Dobben 14–16`, `Kinderklinik`…), client premises, or online. `kind` says which |
| `rooms` | `name`, `nickname` (the city name staff use), `floor`, `kind` (classroom / office / meeting / other), `capacity` (planning) and `capacity_max` (ceiling), `is_bookable`, `is_active` |
| `course_instances.room_id` | The room a cohort runs in. Optional. Only bookable active classrooms may be assigned |
| `staff_module_access` | Per-person `(module, level)` exceptions; see *Roles, modules and levels* |

Screens: **Rooms** (`/admin/planning`, by location, with an add form) and a room
page with its cohorts and an edit form; the catalogue's cohort table gains a
Room column, with a picker for anyone who holds Planning and an *Over room
capacity* badge when a cohort's seats exceed the room's.

### 0007 — people, typed facts, flags, links

Written after reading FileMaker (`docs/FILEMAKER_LESSONS.md`), and every table
in it answers a measured defect there.

| Table | Holds | Answers |
| --- | --- | --- |
| `people` | One row per human. `merged_into` points a duplicate at its survivor; `canonical_person_id(uuid)` follows the chain at read time | 501 probable duplicate people across three tables that shared nothing (§1) |
| `emails`, `phones` | Typed contact channels, raw plus `normalized`, per person | Contact fields spread over five columns with no normalisation (§2.1) |
| `countries` | ISO 3166-1 alpha-2, `name_en` byte-identical to the public form's country list, `name_de`, and `filemaker_flag_id` for the import | Demonyms in a country field; a Flag table keyed by label (§4.4) |
| `levels` | CASA's eleven levels with `filemaker_level_step_id` | Levels as free text, 65% of test results unparseable (§3) |
| `record_flags` | `(entity, entity_id, code, detail)`, resolved by a named person; one open flag per code per row | Silent correction, and default statuses nobody ever changed (§11) |
| `filemaker_links` | `(entity, entity_id) → (source_database, source_layout, source_record_id, source_primary_key, mod_id)` | Replaces the single `external_ref` text column, which could name a record but not say in which file or layout (§1.4) |

Column changes on the queues: every `text` fact that can be typed now has a
**raw-plus-typed pair** — `birth_date_raw` + `birth_date date`,
`nationality_raw` + `nationality_code`, `declared_level_raw` +
`declared_level_code` — and `salutation` / `accommodation_type` are enums.
`current_level` was renamed to `declared_level_*` on purpose: it is what the
learner believes, and `placement_reviews.confirmed_level_code` is what a
teacher decided. The two are shown side by side on a course registration and
must never be conflated. `external_ref` is dropped; `source` is added to the
registrations so `'demo-seed'` rows are identifiable everywhere.

The backfill creates one person per existing row (`created_by =
'migration-0007'`), raises flags for anything that did not type, and links
nothing — identity is a staff decision, not a migration's.

The screens: **People** (`/admin/people`, the register, with the open-flag
band and its work list at `/admin/people/flags`), a person's own page with
everything that ever came in under them, and the **Person** panel at the top
of every queue detail rail — the linked person, the duplicate candidates with
a *Same person* button each, and the flags with a *Clear*. Linking sets
`merged_into` and resolves the flag; it rewrites no row and is undone from the
person page. A placement review can be attached to a person once a level is
confirmed; the attempt itself stays anonymous (rule 6).

### Driver

Both the workspace and the public site now run on one `pg` pool
(`src/lib/admin/db.ts`), replacing `@neondatabase/serverless`. That driver
talks to Neon's own endpoint and could reach neither the local container nor
the Azure Flexible Server, which is the blocker
`docs/AZURE_DEPLOYMENT_PLAN.md` §1 named. `pg` reaches all three.

`src/lib/db/server.ts` keeps Neon's result shape — `query()` resolves to the
rows, not a `QueryResult` — because around forty readers in
`src/lib/content/repository.ts` and `src/lib/placement/repository.server.ts`
were written against it and there is nothing in `QueryResult` they want.

`src/lib/admin/db.ts` imports `server-only`. Without it, a client component
that reaches it through a barrel fails with `Can't resolve 'util/types'` from
inside `node_modules/pg`, thirty lines of import trace from the actual mistake.
That exact error is how the barrel import in `contact-inquiry-form.tsx` was
found.

---

## Runtime modes

The public site has two modes and keeps both. **The workspace has one.** With
no `DATABASE_URL` it renders a "not connected" notice and refuses to run, and
that is deliberate: fixture queues would show zero enquiries and zero
registrations, which is indistinguishable from a quiet morning and would let
staff conclude nothing had come in.

---

## Verification

```bash
npm run build && npm run lint && npm run typecheck && npm run test && npm run knip
E2E_PORT=3017 npm run test:e2e
```

`E2E_PORT` exists because `reuseExistingServer` is on and several checkouts of
this repository run on one machine — a dev server left on 3001 by a different
worktree is silently reused, and the suite then tests somebody else's code.
That happened; three specs failed against a stale server that did not contain
the feature they were asserting.

`e2e/admin-workspace.spec.ts` covers the property that matters without a
database: `/admin/*` renders nothing to an anonymous visitor, in both modes.
Verifying the signed-in screens end to end needs a seeded staff account, which
CI does not have — CI does not run e2e at all.

---

## Open items

| Item | Note |
| --- | --- |
| **FileMaker bridge** | Designed, not built — `docs/FILEMAKER_BRIDGE.md`. FileMaker already models our pipeline as `Contact → PreBooking → Booking`; the bridge lands registrations as Contact+PreBooking pairs and never writes Bookings. Blocked on eight decisions listed there, the first being whether a write is wanted at all |
| **Retention policy** | Nothing is deleted on a schedule. Enquiries, registrations, placement attempts and CVs are all personal data and a period needs a named owner at CASA |
| **Outbound email** | No sending. Every reply is a `mailto:` |
| **Catalogue editing** | Read-only. `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` is the authority on those numbers, and an edit form here would let the workspace contradict the published facts |
| **Self-service password reset** | Needs outbound email |
| **Owner-set passwords** | Give them in person or by phone, not by email |
| **`admin.casa-bremen.de`** | DNS record not created yet. Until it is, use `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST=true` or reach it on the public host in development |
