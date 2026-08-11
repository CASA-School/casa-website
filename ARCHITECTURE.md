# Casa Architecture

Last updated: 2026-03-31  
Repo evidence: `package.json`, `src/**`, `db/**`, `docs/DEV_SETUP.md`

## Tech Stack Summary
- Framework: Next.js `16.1.6` with App Router.
- Language/runtime: TypeScript + React `19.2.3`.
- Styling: Tailwind CSS v4, shadcn UI patterns, Radix primitives, `tw-animate-css`.
- Data/storage: Neon Postgres (`@neondatabase/serverless`) for configured public content reads and application persistence.
- Validation/forms: `zod`, `react-hook-form`.
- i18n: `next-intl` (routing currently configured for `en`; content layer supports `en`/`de`).
- Testing: Vitest + Testing Library (unit), Playwright (e2e).

## Runtime Modes

### Neon-backed mode
- Enabled when `DATABASE_URL` is set.
- Public content reads come from Neon-backed tables.
- Career applications persist directly in Neon, including uploaded CV files.
- Public submissions can fan out through configured webhooks.

### Fallback mode
- Enabled when `DATABASE_URL` is unset.
- Public content falls back to in-repo content fixtures.
- Career listings fall back to a small in-memory mock dataset in `src/lib/mock/store.ts`.

## Folder Structure and Responsibilities
- `src/app`: public routes and API handlers.
- `src/components`: UI primitives and public feature modules.
- `src/lib/content`: public content repository and locale utilities.
- `src/lib/db`: Neon env and query helpers.
- `src/lib/mock`: small fallback dataset for public careers content.
- `src/config`: nav, brand tokens, page patterns, and content fixtures.
- `db/migrations`: Neon-first SQL schema.
- `db/seeds`: baseline public data bootstrapping.
- `docs`: setup and review documents.

## Routing Model
- The active application is public-route-only.
- Public pages live directly under `src/app` (`/`, `/courses`, `/exams`, `/registration/*`, `/contact`, etc.).
- API handlers are public submission endpoints under `src/app/api/*`.
- There is no active portal route tree, auth route tree, or route-protection proxy in the current application code.

## State Management and Data Fetching
- No Redux/Zustand global state layer in repo.
- Server-first data assembly through repository helpers in `src/lib/content/repository.ts`.
- Client state remains local to forms/components (`useState`, `react-hook-form`).
- Request payload validation is handled per route with `zod` schemas.
- API envelope convention remains `{ data, error }` via `src/lib/api/response.ts`.

## Environment Variables and Validation
- Core content/data:
  - `DATABASE_URL`
- Public submission integrations:
  - `CONTACT_WEBHOOK_URL`
  - `CAREERS_APPLICATION_WEBHOOK_URL`
  - `COURSE_REGISTRATION_WEBHOOK_URL`
  - `EXAM_REGISTRATION_WEBHOOK_URL`
- Optional public UX flags:
  - `NEXT_PUBLIC_SHOW_DRAFT_CLAIMS`
- Validation approach:
  - `src/lib/db/env.ts` performs basic presence checks.
  - No central typed env schema yet.

## Database and Storage Conventions
- Schema management remains SQL-first under `db/migrations`.
- Public-site-relevant data currently includes content, careers, and submission-supporting tables.
- Career CV uploads are stored in Postgres via `career_application_files`.
- The database now contains only the public-site schema; the removed dashboard model is no longer part of the active database layout.

## Testing and Verification Setup
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests: `npm run test`
- E2E: `npm run test:e2e`
- Unit config: `vitest.config.ts` (`jsdom`, setup in `src/test/setup.ts`).
- E2E config: `playwright.config.ts` (dev server on `127.0.0.1:3001`).

## Deployment Notes
- Current repo supports a standard Next.js deployment with optional Neon-backed data.
- Local-first DB lifecycle is documented in [docs/DEV_SETUP.md](/Users/rahmanshafiee/Downloads/CASA/docs/DEV_SETUP.md).
- TODO: define canonical production deployment target and CI/CD pipeline docs.
