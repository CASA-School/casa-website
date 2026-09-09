# Casa Architecture

Last updated: 2026-09-08
Repo evidence: `package.json`, `src/**`, `db/**`, `docker-compose.yml`, `docs/DEV_SETUP.md`

## Two products, one application

| | Public website | Staff workspace |
| --- | --- | --- |
| Host | `casa-bremen.de` | `admin.casa-bremen.de` |
| Routes | `src/app/(site)` | `src/app/(admin)` → `/admin/*` |
| Audience | Prospective learners | CASA administrative staff |
| Auth | None | Local staff accounts, server-side sessions |
| Without a database | Serves in-repo fixtures | Refuses to run |

One Next build, one container, one `pg` pool. `src/app` has **no
`layout.tsx`**: Next allows a second root layout only when the app root has
none, and the two products share nothing above the design tokens in
`src/app/globals.css`. Route groups are not URL segments, so every public path
is unchanged.

`src/proxy.ts` maps the admin host onto `/admin` and 404s `/admin` on the
public host in production. It is host routing, not authentication — it has no
database connection. See `docs/ADMIN_WORKSPACE.md`.

## Tech Stack Summary
- Framework: Next.js `16.3.1` with App Router.
- Language/runtime: TypeScript + React `19.2.4`.
- Styling: Tailwind CSS v4, shadcn UI patterns, Radix primitives, `tw-animate-css`.
- Data/storage: Postgres via `pg`. A local container (`docker-compose.yml`,
  port 5433) in development; Azure Flexible Server or Neon in deployment. One
  shared pool in `src/lib/admin/db.ts` serves both products.
- Validation/forms: `zod`, `react-hook-form`. Workspace mutations are plain
  forms posting to server actions.
- i18n: `next-intl` (routing currently configured for `en`; content layer
  supports `en`/`de`). The workspace is English-only and has no locale provider.
- Testing: Vitest (unit), Playwright (e2e).

### Driver note

`@neondatabase/serverless` was removed on 2026-09-08. It talks to Neon's own
endpoint and could reach neither the local container nor the Azure Flexible
Server, which is the port `docs/AZURE_DEPLOYMENT_PLAN.md` §1 called for.
`src/lib/db/server.ts` deliberately preserves Neon's result shape — `query()`
resolves to the rows rather than a `QueryResult` — because ~40 readers in
`src/lib/content/repository.ts` and `src/lib/placement/repository.server.ts`
were written against it.

## Runtime Modes

### Database-backed
- Enabled when `DATABASE_URL` is set.
- Public content reads come from Postgres tables.
- Contact enquiries and course/exam registrations persist to the workspace queues.
- Career applications persist including uploaded CV files.
- Public submissions also fan out through configured webhooks.

### Fallback
- Enabled when `DATABASE_URL` is unset.
- Public content falls back to in-repo content fixtures.
- Career listings fall back to the in-memory dataset in `src/lib/mock/store.ts`;
  career application submission is disabled, because CV upload needs storage.
- Enquiries and registrations still fan out to their webhooks and report
  `stored: false`.
- The placement test runs end to end from an in-process store and tells the
  learner plainly that progress is not saved.

### The workspace has no fallback
With no `DATABASE_URL` it renders a "not connected" notice. A fixture queue
showing zero enquiries is indistinguishable from a quiet morning, and would let
staff conclude nothing had come in.

## Folder Structure and Responsibilities
- `src/app/(site)`: public routes and their root layout.
- `src/app/(admin)`: the staff workspace and its root layout. `admin/sign-in`
  sits outside the `(workspace)` group, or the gate would redirect to itself.
- `src/app/api`: public submission endpoints.
- `src/proxy.ts`: host routing.
- `src/components`: UI primitives and public feature modules.
- `src/components/admin`: the workspace's design layer — shell, `ui.tsx`, icons.
  Every primitive is a server component.
- `src/lib/content`: public content repository and locale utilities.
- `src/lib/db`: the public site's client, built on the shared pool.
- `src/lib/admin`: the pool itself, auth, password hashing, the shared queue
  layer, per-domain reads, and the write path from the public site (`intake.ts`).
- `src/lib/mock`: fallback dataset for public careers content.
- `src/config`: nav, brand tokens, page patterns, and content fixtures.
- `db/migrations`: SQL-first schema, `0001` … `0007_people_and_flags.sql`.
- `db/seeds`: baseline public data. Applied to real databases, so no fake people.
- `scripts/admin`: `seed-staff.mjs` (first account), `seed-demo.mjs` (demo records).
- `docs`: setup and review documents.

## Routing Model
- Public pages resolve at their original paths through the `(site)` group
  (`/`, `/courses`, `/exams`, `/registration/*`, `/contact`, …).
- Workspace pages resolve under `/admin` through the `(admin)` group, and under
  `/` on the admin host via the rewrite in `src/proxy.ts`.
- API handlers are public submission endpoints under `src/app/api/*`.
- There is no learner-facing auth route tree. The workspace's three roles are
  staff-only and unrelated to the removed portal.

## State Management and Data Fetching
- No Redux/Zustand global state layer in repo.
- Server-first data assembly through repository helpers in
  `src/lib/content/repository.ts` and the per-domain modules in `src/lib/admin`.
- Client state remains local to forms/components (`useState`, `react-hook-form`).
  The workspace has one client component, `nav-link.tsx`.
- Request payload validation is handled per route with `zod` schemas. Workspace
  server actions re-validate every `FormData` value against the same allowlists
  the reads use.
- API envelope convention remains `{ data, error }` via `src/lib/api/response.ts`.

## Environment Variables and Validation
- Core content/data:
  - `DATABASE_URL` — required by the workspace, optional for the public site
  - `ADMIN_DB_POOL_MAX` — pool size, default 5
- Host routing:
  - `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST`
  - `CASA_ENABLE_INTERNAL_SURFACES`
- Public submission integrations:
  - `CONTACT_WEBHOOK_URL`, `GROUP_INQUIRY_WEBHOOK_URL`
  - `CAREERS_APPLICATION_WEBHOOK_URL`
  - `COURSE_REGISTRATION_WEBHOOK_URL`, `EXAM_REGISTRATION_WEBHOOK_URL`
  - `PLACEMENT_RESULT_WEBHOOK_URL`
- Optional public UX flags:
  - `NEXT_PUBLIC_SHOW_DRAFT_CLAIMS`
- Validation approach:
  - `src/lib/db/env.ts` performs basic presence checks.
  - No central typed env schema yet.
  - `/admin/settings` reports which integrations are connected, never a value.

## Database and Storage Conventions
- Schema management remains SQL-first under `db/migrations`, tracked and
  transactional through `scripts/db/migrate.mjs` (a version table, one
  transaction per migration, an advisory lock, and a checksum that refuses a
  migration edited after it was applied).
- Public-site tables: content, careers, placement.
- Workspace tables: `staff_users`, `staff_sessions`, `enquiries`,
  `course_registrations`, `exam_registrations`, `placement_reviews`,
  `staff_notes`, `staff_activity`.
- `work_status` is one enum shared by all four queues.
- Career CV uploads are stored in Postgres via `career_application_files` and
  served only by an authenticated route handler.
- Registrations record their product twice — by id and by the label the visitor
  saw — because a cohort can be rescheduled after someone signs up for it.

## Testing and Verification Setup
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests: `npm run test`
- E2E: `E2E_PORT=3017 npm run test:e2e`
- Unused deps/files: `npm run knip`
- Unit config: `vitest.config.ts` (`jsdom`, setup in `src/test/setup.ts`).
- E2E config: `playwright.config.ts`. Port defaults to 3001 and is overridable
  with `E2E_PORT`, because `reuseExistingServer` is on and several checkouts of
  this repository run on one machine — a stale server from another worktree is
  otherwise reused silently.
- CI (`.github/workflows/quality.yml`) runs lint → typecheck → test → build →
  knip. It does not run e2e.

## Deployment Notes
- Standard Next.js deployment, plus a production container image
  (`Dockerfile`, `output: 'standalone'`) for Azure Container Apps.
- The admin host needs its own DNS record and certificate before go-live; until
  then `/admin` is reachable only in development.
- Local DB lifecycle: `npm run db:up`, `db:migrate`, `db:seed`, `admin:seed`.
  See [docs/DEV_SETUP.md](docs/DEV_SETUP.md) and
  [docs/ADMIN_WORKSPACE.md](docs/ADMIN_WORKSPACE.md).
- TODO: define canonical production deployment target and CI/CD pipeline docs.
