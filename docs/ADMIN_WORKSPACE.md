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

- **Not a replacement for FileMaker yet.** Every queue table carries an
  `external_ref` column for the future bridge and nothing writes to one. Until
  the bridge exists, the workspace and FileMaker are two independent records of
  the same person.
- **Not the removed portal.** The role-based student/teacher portal that used to
  live in this repository is gone and is not coming back. This is a
  staff-facing operations tool with three roles, no learner-facing surface, and
  no relation to that code.
- **Not a mail client.** Every "Reply" button is a `mailto:`.

---

## Running it locally

```bash
npm run db:up        # Postgres 17 in Docker, on port 5433
npm run db:migrate   # schema, including 0006_admin_workspace.sql
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
row it writes is tagged (`source = 'demo-seed'`, or `external_ref` where there
is no source column) so `--clear` removes those and nothing else.

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
Every exported action in `actions.ts` and `team/actions.ts` starts with
`requireStaff()`, and `src/lib/admin/__tests__/host-routing.test.ts` asserts
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

### Roles

| Role | Can |
| --- | --- |
| `staff` | Work every queue: read, set statuses, take ownership, write notes, confirm placements |
| `admin` | The above, plus the Team screen |
| `owner` | The above, plus granting the owner role |

CASA cannot be left with no active owner; the workspace refuses the change that
would do it. **Deactivation, not deletion** — a deleted account takes its name
out of every `assigned_to` and leaves the activity trail pointing at nobody.
Deactivating revokes access on the spot (every live session is closed) and
keeps the history readable. There is no delete button.

There is no self-service password reset. It would need outbound email the
workspace does not have, and a reset link from an address nobody monitors is a
security hole dressed as a feature.

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

`db/migrations/0006_admin_workspace.sql`. Tables:

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
| **FileMaker bridge** | `external_ref` columns exist; nothing writes them. Field mapping is unspecified — deliberately, rather than guessing at FileMaker's field names |
| **Retention policy** | Nothing is deleted on a schedule. Enquiries, registrations, placement attempts and CVs are all personal data and a period needs a named owner at CASA |
| **Outbound email** | No sending. Every reply is a `mailto:` |
| **Catalogue editing** | Read-only. `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` is the authority on those numbers, and an edit form here would let the workspace contradict the published facts |
| **Self-service password reset** | Needs outbound email |
| **Owner-set passwords** | Give them in person or by phone, not by email |
| **`admin.casa-bremen.de`** | DNS record not created yet. Until it is, use `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST=true` or reach it on the public host in development |
