# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

This repository holds **two products**, one Next build, one container.

**1. The public website** for **CASA Bremen**, an international language school
operating as a *gemeinnützige GmbH* (German nonprofit). Its job is discovery,
trust-building, and lead capture — courses, exams, accommodation, registration,
careers, news, and contact. Routes live under `src/app/(site)`.

**2. The staff workspace** at `/admin`, served on `admin.casa-bremen.de`. An
internal tool for CASA's administrative staff: everything the public site
receives lands in a queue with a status and an owner. Routes live under
`src/app/(admin)`. **Read `docs/ADMIN_WORKSPACE.md` before touching it.**

The workspace is NOT the old portal. The previous role-based student/teacher
portal was removed and is not coming back — do not reintroduce learner-facing
auth, learner roles, or a student dashboard. The workspace has three staff
roles, no learner surface, and no relation to that code. The `package.json`
name is still `casa-portal`; that is historical, not current scope.

## Stack

- Next.js `16.1.6` (App Router) · React `19.2.4` · TypeScript
- Tailwind CSS v4 + shadcn patterns + Radix (`radix-ui`), `tw-animate-css`
- Postgres via `pg` — a local container in development (`docker-compose.yml`),
  Azure Flexible Server or Neon in deployment. One shared pool
  (`src/lib/admin/db.ts`) serves both products
- `zod` + `react-hook-form` for validation and forms
- `next-intl` — routing is EN-only today; the content layer supports `en`/`de`
- Vitest + jsdom (unit) · Playwright (e2e, dev server on `127.0.0.1:3001`)

## Commands

```bash
npm install
npm run dev          # local dev server
npm run build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:e2e     # playwright
npm run knip         # unused deps/files gate (also runs in CI)
npm run db:up        # Postgres 17 in Docker, port 5433
npm run db:down      # stop it
npm run db:reset     # drop the volume, migrate, seed, recreate the owner account
npm run db:migrate   # applies db/migrations
npm run db:seed      # applies db/seeds
npm run admin:seed   # creates the first staff workspace account
npm run admin:check  # loads every /admin screen with a real session; catches bad SQL
npm run placement:port  # re-ports the placement item bank from its source markdown
```

`E2E_PORT=3017 npm run test:e2e` runs Playwright on its own port. Use it:
`reuseExistingServer` is on and several checkouts of this repository run on one
machine, so a dev server left on 3001 by another worktree is silently reused
and the suite tests somebody else's code.

CI (`.github/workflows/quality.yml`) runs lint → typecheck → test → build → knip
on every PR and on pushes to `main`. It does **not** run e2e.

## Verification gates (required)

Run after any non-trivial change:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e` — when the change touches routed UX or workflow behavior

If a gate is skipped, say exactly why.

## Runtime modes

**Database-backed** (`DATABASE_URL` set): public content reads come from
Postgres; contact enquiries and course/exam registrations persist to the
workspace queues; career applications persist including the uploaded CV file
(`career_application_files`).

**Fallback** (`DATABASE_URL` unset): public content falls back to in-repo fixtures;
careers use the in-memory dataset in `src/lib/mock/store.ts`; career application
submission is disabled because CV upload requires database storage. The placement
test still runs end to end from an in-process store, and tells the learner plainly
that progress is not being saved. Enquiries and registrations still fan out to
their webhooks; each route reports `stored: false`.

Keep both modes working for the PUBLIC SITE. Do not break fallback parity when
changing data flows.

**The staff workspace has one mode.** With no `DATABASE_URL` it renders a "not
connected" notice and refuses to run, deliberately: a fixture queue showing zero
enquiries is indistinguishable from a quiet morning, and would let staff
conclude nothing had come in.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Database-backed reads, the workspace queues, career application persistence. **Required by `/admin`** |
| `ADMIN_DB_POOL_MAX` | Pool size, default 5 (an Azure B1ms allows ~50 connections total) |
| `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST` | Reopens `/admin` on the public host in production. For the window between deploying and pointing the admin DNS record |
| `CONTACT_WEBHOOK_URL` | Contact form fan-out |
| `CAREERS_APPLICATION_WEBHOOK_URL` | Career application fan-out |
| `COURSE_REGISTRATION_WEBHOOK_URL` | Course registration fan-out |
| `EXAM_REGISTRATION_WEBHOOK_URL` | Exam registration fan-out |
| `PLACEMENT_RESULT_WEBHOOK_URL` | Placement result hand-off to the CASA dashboard |
| `NEXT_PUBLIC_SHOW_DRAFT_CLAIMS` | Optional flag for unverified public claims |

All webhooks are optional, and each fires *alongside* storing the record in the
workspace rather than instead of it. Presence checks live in `src/lib/db/env.ts`;
there is no central typed env schema yet. `/admin/settings` reports which are
connected without ever printing a value.

## Layout

```
src/app/(site)   public routes — has its own root layout
src/app/(admin)  staff workspace at /admin — has its own root layout
src/app/api      public route handlers (no layout)
src/proxy.ts     host routing: admin.casa-bremen.de -> /admin, and /admin 404s
                 on the public host in production
src/components   ui primitives (src/components/ui) + domain modules
                 (heroes, sections, layout, forms, registration, courses,
                  news, resources, signatures, assistant, calculator, ...)
src/components/admin   the workspace's own design layer — shell, ui.tsx, icons
src/config       nav, footer, brand tokens, page patterns, content fixtures
src/content      locale content modules
src/lib          content repository, db helpers, api envelope, search,
                 assistant, validation, analytics, seo, mock fallback
src/lib/admin    workspace db pool, auth, passwords, queues, per-domain reads
src/i18n         next-intl config
src/messages     translation messages
db/migrations    SQL-first schema (0001_public_site_schema.sql ... 0012_day_board.sql)
db/seeds         baseline public data — applied to real databases, so no fake people
scripts/admin    seed-staff.mjs (first account), seed-demo.mjs (demo records)
docker-compose.yml  local Postgres
e2e              Playwright specs
docs             setup, ERD, audits, backlog, compliance, team update
```

**`src/app` has no `layout.tsx` of its own, on purpose.** Next allows a second
root layout only when the app root has none, and the two products share nothing
above the design tokens. Route groups are not URL segments, so every public
path is unchanged.

## Conventions

**Server-first.** Default to Server Components. Add `'use client'` only for hooks,
browser APIs, or interactivity. Never call server-only helpers (`cookies`,
redirects) inside client components. Guard `window` / `document` / `localStorage`.

**API envelope.** All route handlers return `{ data, error }` via `apiSuccess` /
`apiError` in `src/lib/api/response.ts`. Validate every request payload with `zod`
inside the route handler.

**UI tokens.** Use existing variables from `src/app/globals.css` and
`src/config/brand/tokens.ts`. Reuse primitives in `src/components/ui` before adding
new base components. Icons come from `lucide-react` via `src/config/icon-map.ts`.
Respect `prefers-reduced-motion` and existing `focus-visible` patterns.

**Content composition.** Public pages compose through `src/config/public-page-config.ts`
and repository-backed view models rather than hardcoded inline content. Keep new work
slot-based so final copy, photography, and schedules can be swapped in without a
structural refactor.

**Workspace design standards.** A section is one white block and the canvas
between sections separates them — a card header is white with a rule, never a
grey band the same value as the page. A field title is a label (12px sentence
case), not an uppercase eyebrow. One primary button per screen. Never show a
raw uuid as a field. `docs/ADMIN_WORKSPACE.md` §Design standards has the
measurements and the defect each rule came from.

**Workspace screens: labels, not explanations.** The staff workspace must stay
presentable. No rationale, caveats or "not built yet" notes in the UI — those go
in `docs/ADMIN_WORKSPACE.md` or a code comment. Every workspace feature is a
module in `src/lib/admin/access.ts`, gated by role and per-person exception;
design a new screen by answering "who may see this" first.

**Create, edit, delete — with a confirmation on anything destructive.** Every
record module offers the three. Forms open in `FormDialog`; deletes go through
`ConfirmSubmit`, and the server action checks the hidden `confirmed` field, so
skipping the dialog is refused. Access is per module *and level*
(`none`/`view`/`edit`/`full`): an action asks `requireModule(module, level)`
for exactly what it does; delete is `full`. New screens join an existing
sidebar group or a nested item — the rail never becomes a flat list.

**Raw SQL column names are checked by nothing.** `tsc`, eslint and `next build`
all pass on `ORDER BY position` against a table whose column is `sort_order` —
the query is a string. After writing or editing a query, run
`npm run admin:check` (dev server up): it loads all 25 workspace screens with a
real session and reports any that 500. Note `levels` orders by `sort_order`;
every other vocabulary table uses `position`.

**A client component must not import a module that reaches `src/lib/admin/db.ts`.**
It pulls `pg` and `server-only` into the browser bundle and the build fails on
`dns` / `net` / `util/types`. Put constants a client component needs in their own
module (`configuration-labels.ts` is the pattern). Typecheck and lint pass while
this is broken; only `next build` or loading the page catches it.

**Types are tables, prices are rates.** Every vocabulary (course type, level,
accommodation type, catering, room type, charge type, material) is a table with
a stable `code` and its `filemaker_id`. Every price is a row in `rates` with a
unit and a validity period, resolved by `applicable_rate()`; a cost line still
stores the agreed `amount`. Never type a price into a column or a condition
into code. See `docs/CATALOGUE_AND_PRICING.md`.

**Progressive disclosure, especially in forms.** Ask for the fields that make a
record valid and useful; put the rest behind a collapsed `<details>` step or on
the record's own edit screen. A list page never carries a grid of inputs.
FileMaker's all-fields-on-one-layout interface is the anti-pattern.

**Diffs.** Keep them minimal and targeted. Do not add abstractions when an existing
pattern already covers the case. If a fact is not verifiable in the repo, mark it
`TODO` or `ASSUMPTION` rather than inventing it.

## Hard rules

1. **No FileMaker, no dashboard row-level data ON THE PUBLIC SITE.** The
   FileMaker bridge is still unbuilt and is a separate piece of work; the staff
   workspace at `/admin` carries a `filemaker_links` table for it (0007) and
   writes nothing there yet. **Public pages** may use only reviewed,
   public-safe *aggregate* metrics — never a row from any operational table,
   including the workspace's own. Current approved values (2026-06-17 sync):
   `30,000+ learners supported`, `150+ countries represented`,
   `7-80+ age range represented`, `45,000+ course bookings`.
   The `40+ staff/teachers` claim is **draft** and must not ship unverified.
2. **No person-specific portraits with named testimonials** unless the identity and
   the quote-to-person relationship are explicitly verified.
3. **Team portraits are synthetic placeholders** for layout only
   (`public/media/casa/team/`). They must be replaced with verified real staff
   portraits before launch. Do not present them as real staff.
4. **Photo edits stay source-faithful** — crop, resize, light exposure/color
   correction only.
5. **Accommodation photos are contextual, not availability claims.**
6. **Placement test content and results.** All 163 placement items are
   `PILOT_UNREVIEWED` and need two qualified DaF reviewers before live use. Never
   present a result as a certificate, and never use pass/fail language — the
   result is a course recommendation a teacher confirms. Never ship an answer key,
   accepted-answer list, or listening transcript to the client: everything
   server→client goes through `src/lib/placement/sanitise.ts`, and
   `answer-containment.test.ts` enforces it. Cut scores in
   `src/config/placement/policy.ts` are pilot hypotheses — bump `POLICY_VERSION`
   when you change them so stored attempts stay interpretable.
7. **The staff workspace is behind four independent checks, and each is
   load-bearing.** (a) The layout gate in
   `src/app/(admin)/admin/(workspace)/layout.tsx`, plus a `layout.tsx` per
   module calling `requireModule()`. (b) `requireModule()` at the
   top of EVERY server action — an action is a public HTTP endpoint and does not
   go through the layout that rendered its form. (c) Its own check inside the CV
   download route handler, for the same reason. (d) `src/proxy.ts`, which 404s
   `/admin` on the public host in production. Do not remove one on the grounds
   that another covers it; they cover different request paths.
   `docs/ADMIN_WORKSPACE.md` §Security model has the detail, and
   `src/lib/admin/__tests__/host-routing.test.ts` asserts all four.

8. **Nonprofit framing is load-bearing.** CASA's Google Ad Grants review flagged the
   site as too commercial. Prices and registration are fine, but they must sit inside
   a visibly public-benefit narrative. See `docs/GOOGLE_AD_GRANTS_COMPLIANCE.md`
   before touching the homepage, nav, footer, or `/ueber-uns/gemeinnuetzigkeit`.

## Documentation map

| File | Contents |
| --- | --- |
| `MEMORY.md` | **Living project log.** Read first. Numbered work passes, current assumptions, next focus. Update it when making a significant architectural or UX shift. |
| `README.md` | Scope, route list, integrations |
| `PROJECT_BRIEF.md` | Product framing and core flows |
| `ARCHITECTURE.md` | Stack, runtime modes, folder responsibilities, env vars |
| `UI_SYSTEM.md` | Brand tokens, typography, radius, layout/motion conventions |
| `IMPLEMENTATION_PLAN.md` | Launch workstreams and explicit out-of-scope |
| `AGENTS.md` | Agent operating rules — see caveat below |
| `docs/DEV_SETUP.md` | Environment and Neon setup |
| `docs/ERD.md` | Mermaid data model |
| `docs/PUBLIC_UI_AUDIT.md` | Route inventory + responsive findings (375/768/1280) |
| `docs/PUBLIC_UI_BACKLOG.md` | Sequenced PR-A / PR-B / PR-C plan |
| `docs/GOOGLE_AD_GRANTS_COMPLIANCE.md` | Nonprofit visibility work + production checklist |
| `docs/PARALLEL_AGENT_WORK_BOARD.md` | **Start here when picking up work.** Independent units with file ownership, verification commands, and blockers |
| `docs/ADMIN_WORKSPACE.md` | **Read before touching `/admin`.** The staff workspace: architecture, security model, roles, the placement review surface, design layer, schema, local setup |
| `docs/FILEMAKER_LESSONS.md` | **Read before adding any table or free-text column.** Measured defects in CASA's FileMaker and the rule each one gives the new schema; 0007 is its first application |
| `docs/CATALOGUE_AND_PRICING.md` | **Read before adding a product, a type or a price.** FileMaker's 99 reference tables and where its prices really live (typed per row, and inside a script); the `rates` model that replaces them |
| `docs/FILEMAKER_BRIDGE.md` | The strangler plan: three phases from write-through to retirement, server-safe scripts, the decisions still open |
| `docs/FILEMAKER_BRIDGE.md` | **Read before connecting anything to FileMaker.** How the two existing bridges work, what `SchoolMan` looks like inside, and the design for the registrations bridge with its open decisions |
| `docs/FILEMAKER_LESSONS.md` | **Read before adding any table or column to the workspace.** FileMaker's measured defects — duplicate identities, free-text results, stored accumulators, status-as-default — and the rule the new system follows for each |
| `docs/AZURE_DEPLOYMENT_PLAN.md` | Target infrastructure (Azure, alongside the student app), driver port, migration order, data-protection decisions |
| `docs/GROUP_PRICING_AND_SPECIAL_COURSES.md` | Group price model ported from the coordinator's workbook, its three bugs, and the special-courses rebuild direction |
| `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` | **Read before changing any course number.** Prices/hours verified against casa-bremen.de, with an explicit unverified list |
| `docs/PLACEMENT_TEST_IMPLEMENTATION.md` | **Read before touching `/placement-test` or `src/lib/placement`.** CASA's own Einstufungstest: assessment design, the item-bank port, the engine, the listening gate, answer-key containment |
| `docs/PLACEMENT_TEST_OPEN_DECISIONS.md` | Placement decisions CASA must own, and what the repo defaults to meanwhile |
| `docs/COPY_AND_COURSE_ARCHETYPE_REVIEW.md` | Site-wide copy review + the four-archetype design for course detail pages |
| `docs/PREMIUM_UI_REVIEW_2026-08-16.md` | **Current UI/design backlog.** Measured design-layer review across type, spacing, colour, shape, motion, primitives, media and composition, with a 10-step order of work |
| `docs/DEPENDENCY_SECURITY_2026-08-16.md` | **Read before touching dependencies.** Advisory triage and resolution, why the CI audit gate is production-scope only, and the `ws` / `next-intl` reachability findings |
| `docs/DESIGN_ALIGNMENT_WITH_STUDENT_APP.md` | Token comparison with the CASA student app and what should converge |
| `docs/EXPERIMENTAL_LANDING_PAGES.md` | Review-only routes and rollback steps |
| `docs/TEAM_UPDATE_2026-06-23.md` | Team-facing status, demo flow, open decisions |
| `CLEANUP_REPORT.md`, `docs/WEBAPP_REVIEW.md` | Historical Feb 2026 audits, largely superseded |

### AGENTS.md caveat

`AGENTS.md` sections 1, 4, 5, 6, and 7 are current and should be followed —
especially the required reporting format (evidence → root cause → fix → files →
verification).

Sections 2 and 3 are **partly stale**. `requirePageRoles`, `requireApiRoles` and
`requirePortalApiContext` do not exist — they were removed with the portal, and
nothing replaced them. Ignore those specific names.

`src/proxy.ts` DOES exist again as of 2026-09-08, but it is not what section 3
means by "route protection": it does host routing for the staff workspace
(`admin.casa-bremen.de` → `/admin`, and `/admin` 404s on the public host in
production) and has no database connection, so it cannot authenticate anything.
The workspace's auth gate is its layouts plus `requireModule()` in every server
action — see `docs/ADMIN_WORKSPACE.md`. Do not add a role check to `proxy.ts`.

The `apiSuccess` / `apiError` and mock-mode-parity guidance in the same sections
is still valid.

## Known open items

- **`admin.casa-bremen.de` does not exist yet.** `src/proxy.ts` already routes it,
  and until the DNS record is created the workspace is reachable at `/admin` on the
  public host in development only. Creating it is a prerequisite for go-live, along
  with `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST` being left unset in production.
- **No FileMaker bridge yet — but it is designed.** `docs/FILEMAKER_BRIDGE.md`
  (2026-09-08). Migration 0007 replaced the per-queue `external_ref` text column
  with a `filemaker_links` table and a person register; nothing writes links yet. **The shared Data API credential (`FileMaker SRV`) is the owner's own
  `[Full Access]` account — use it for reads only, never a write or a script call.** Key
  facts for anyone picking this up: FileMaker already has the
  intake pipeline (`Contact → PreBooking → WaitingRoom → Booking`, with `TestStudent`
  for placement); the bridge should create Contact+PreBooking pairs and **never**
  write `Booking` directly; the Data API can write through `[Full Access]`/`Reduced`
  accounts today, so a dedicated `WebIntake` account with its own privilege set is a
  precondition, not a nicety; FileMaker is LAN-only, so the push must run on-prem.
  Blocked on the decisions in that document's §7.
- **No retention policy.** Enquiries, registrations, placement attempts and stored
  CVs are all personal data, none of it deleted on a schedule. A period needs a
  named privacy owner at CASA.
- **No outbound email from the workspace.** Every "Reply" button is a `mailto:`,
  and there is no self-service password reset — an owner sets one from the Team
  screen.
- ~~`lucide-react` missing~~ **Resolved (verified 2026-08-12).** `lucide-react` is still
  absent from `package.json` and `node_modules`, but `tsconfig.json` now maps it via a
  `paths` alias to `./src/lib/icons/streamline-lucide-adapter`. `npm run typecheck` and
  `npm run build` both pass. The ~47 imports resolve through the adapter; do not "fix" this
  by re-adding the dependency without checking the adapter first.
- `/design-alternatives`, `/landing-page-alt`, and `/homepage-reorganized` are
  `noindex, nofollow` but **publicly reachable by direct URL**. Robots metadata is
  not access control. These need protection or removal before go-live.
- `/design-system` is an internal surface; check its indexing behavior.
- `docs/DEV_SETUP.md` claims Node 25+ / npm 11+, but CI pins Node 20 and local
  development has run on Node 22. Treat the doc's version floor as unverified.
- Several routes exist that the `README.md` route list omits: `/team`, `/calculator`,
  `/resources/*`, `/projekte/integrationsprojekte`, `/ueber-uns/gemeinnuetzigkeit`,
  `/accommodation/become-host`, `/design-system`.
- ~~Course detail pages assume one universal template~~ **Resolved 2026-08-12.** The archetype
  registry is `src/config/courses/archetypes.ts` + `course-profiles.ts`. Add a course by adding
  a profile entry, never by branching inside `src/app/courses/[slug]/page.tsx` — that file no
  longer knows any course slug. A page's facts rail and section order come from its archetype;
  `scheduled-cohort` is the default, so an unregistered course keeps legacy behaviour.
  `professional-track` and `module-catalogue` exist but still need content (work board U5, U6).
- Placement test is on `shadow` release mode with listening withheld: no audio
  exists for the 33 scored listening scripts, so the pilot measures language use
  and reading only. `LISTENING_AUDIO_AVAILABLE` in `src/config/placement/policy.ts`
  is the single switch, and flipping it also activates the `matching` interaction
  (the bank's only matching item is a listening item). Details in
  `docs/PLACEMENT_TEST_IMPLEMENTATION.md` §6.2.
- **Deployment is Azure Container Apps, not Vercel.** Verified 2026-08-27: the Vercel
  project is gone (`casa-bremen.vercel.app` returns 404) and nothing in the repo or in
  CI deploys to it. The site runs as `ca-casa-website` in `rg-casa-website-prod`, on the
  shared `cae-casa-prod` environment, at
  `https://ca-casa-website.livelycliff-6187a034.germanywestcentral.azurecontainerapps.io/`.
  See `docs/AZURE_DEPLOYMENT_PLAN.md`.
- **Pushing to `main` does NOT deploy.** There is no deployment workflow in
  `.github/workflows/` — `quality.yml` is the only one, and it never deploys. A release is
  a deliberate manual run of `./infra/azure/deploy.sh`, which builds in ACR and pins the
  revision to the image digest. Merging is therefore safe; shipping is a separate act.
- `main` is unprotected. That is a **deliberate choice while the site is still being
  built** — branch protection would add review friction during active iteration, and the
  site is not final and not yet live. **Enable branch protection before go-live**, at
  minimum requiring the `quality` workflow to pass. Decision recorded 2026-08-16.
- `@neondatabase/serverless` is gone; both products run on one `pg` pool. The Azure work
  in `docs/AZURE_DEPLOYMENT_PLAN.md` §1 is done — the careers CV upload is now an explicit
  `BEGIN`/`INSERT`/`INSERT`/`COMMIT` and still needs a real test against a managed server
  before cutover, not just a build. **No Postgres server is provisioned in Azure yet.**
- No canonical production deployment doc yet (domain, rollback owner). The custom domain
  for the website is still unassigned: `lernen.casa-bremen.de` points at the *student app*,
  and `www.casa-bremen.de` still resolves to the old site at 195.34.167.82. The Container
  App now needs **two** hostnames, because the staff workspace answers on
  `admin.casa-bremen.de` off the same revision.

## Artifacts

Generated presentation and report artifacts belong under `output/`, which is
gitignored and excluded from the Docker build context. They are deliverables, not source.
