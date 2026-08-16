# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

CASA is a public-facing marketing website for **CASA Bremen**, an international
language school operating as a *gemeinnützige GmbH* (German nonprofit). The site's
job is discovery, trust-building, and lead capture — courses, exams, accommodation,
registration, careers, news, and contact.

The previous role-based portal/dashboard has been **removed from the active
application code**. Do not reintroduce auth, roles, or dashboard surfaces. The
`package.json` name is still `casa-portal`; that is historical, not current scope.

## Stack

- Next.js `16.1.6` (App Router) · React `19.2.4` · TypeScript
- Tailwind CSS v4 + shadcn patterns + Radix (`radix-ui`), `tw-animate-css`
- Neon Postgres via `@neondatabase/serverless`
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
npm run db:migrate   # applies db/migrations
npm run db:seed      # applies db/seeds
```

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

**Neon-backed** (`DATABASE_URL` set): public content reads come from Neon-backed
tables; career applications persist to Postgres including the uploaded CV file
(`career_application_files`).

**Fallback** (`DATABASE_URL` unset): public content falls back to in-repo fixtures;
careers use the in-memory dataset in `src/lib/mock/store.ts`; career application
submission is disabled because CV upload requires database storage.

Keep both modes working. Do not break fallback parity when changing data flows.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Enables Neon-backed reads + career application persistence |
| `CONTACT_WEBHOOK_URL` | Contact form fan-out |
| `CAREERS_APPLICATION_WEBHOOK_URL` | Career application fan-out |
| `COURSE_REGISTRATION_WEBHOOK_URL` | Course registration fan-out |
| `EXAM_REGISTRATION_WEBHOOK_URL` | Exam registration fan-out |
| `NEXT_PUBLIC_SHOW_DRAFT_CLAIMS` | Optional flag for unverified public claims |

All webhooks are optional. Presence checks live in `src/lib/db/env.ts`; there is no
central typed env schema yet.

## Layout

```
src/app          public routes + API handlers under src/app/api
src/components   ui primitives (src/components/ui) + domain modules
                 (heroes, sections, layout, forms, registration, courses,
                  news, resources, signatures, assistant, calculator, ...)
src/config       nav, footer, brand tokens, page patterns, content fixtures
src/content      locale content modules
src/lib          content repository, db helpers, api envelope, search,
                 assistant, validation, analytics, seo, mock fallback
src/i18n         next-intl config
src/messages     translation messages
db/migrations    SQL-first schema (0001_public_site_schema.sql)
db/seeds         baseline public data
e2e              Playwright specs
docs             setup, ERD, audits, backlog, compliance, team update
```

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

**Diffs.** Keep them minimal and targeted. Do not add abstractions when an existing
pattern already covers the case. If a fact is not verifiable in the repo, mark it
`TODO` or `ASSUMPTION` rather than inventing it.

## Hard rules

1. **No FileMaker, no dashboard row-level data.** The internal CASA dashboard /
   FileMaker bridge is a separate workspace. The website may use only reviewed,
   public-safe *aggregate* metrics. Current approved values (2026-06-17 sync):
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
6. **Nonprofit framing is load-bearing.** CASA's Google Ad Grants review flagged the
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
| `docs/AZURE_DEPLOYMENT_PLAN.md` | Target infrastructure (Azure, alongside the student app), driver port, migration order, data-protection decisions |
| `docs/GROUP_PRICING_AND_SPECIAL_COURSES.md` | Group price model ported from the coordinator's workbook, its three bugs, and the special-courses rebuild direction |
| `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` | **Read before changing any course number.** Prices/hours verified against casa-bremen.de, with an explicit unverified list |
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

Sections 2 and 3 are **stale**. They instruct agents to reuse `requirePageRoles`,
`requireApiRoles`, and `requirePortalApiContext`, and to align with route protection
in `src/proxy.ts`. None of those exist in the codebase — they were removed with the
portal. Ignore those specific instructions. The `apiSuccess` / `apiError` and
mock-mode-parity guidance in the same sections is still valid.

## Known open items

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
- No canonical production deployment doc yet (Vercel project, domain, rollback owner).
- **`main` is unprotected and deploys straight to production** (no `vercel.json`, so Vercel's
  default push-to-`main` deploy applies). This is a **deliberate choice while the site is still
  being built** — branch protection would add review friction during active iteration, and the
  site is not final and not yet live. **Enable branch protection before go-live**, at minimum
  requiring the `quality` workflow to pass. Decision recorded 2026-08-16.

## Artifacts

Generated presentation and report artifacts belong under `output/`, which is
gitignored and excluded from local Vercel uploads. They are deliverables, not source.
