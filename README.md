# CASA — public site and staff workspace

## Purpose

Two products, one Next build, one container.

**The public website** for CASA Bremen: discovery, trust, and lead capture —
courses, exams, accommodation, news, careers, contact, and public registration.
Routes under `src/app/(site)`.

**The staff workspace** at `/admin`, served on `admin.casa-bremen.de`. An
internal tool for CASA's administrative staff: everything the public site
receives lands in a queue with a status and an owner, instead of leaving as a
webhook POST nobody could query. Routes under `src/app/(admin)`. See
[docs/ADMIN_WORKSPACE.md](docs/ADMIN_WORKSPACE.md).

The workspace is not the old portal. The previous role-based student/teacher
portal was removed and is not coming back; the workspace has three staff roles,
no learner-facing surface, and no relation to that code.

## Current Product Scope

### Public pages
- `Courses`
- `Exams`
- `Accommodation`
- `Registration` (course + exam)
- `FAQ`
- `Contact`
- `News`
- `Careers`
- `Search`
- Legal and utility pages

### Staff workspace routes

All `noindex`, all behind a staff session, and all 404 on the public host in a
production build.

- `/admin` — overview: what is waiting, what has a deadline
- `/admin/sign-in`
- `/admin/enquiries`, `/admin/enquiries/[id]`
- `/admin/registrations/course`, `/admin/registrations/course/[id]`
- `/admin/registrations/exam`, `/admin/registrations/exam/[id]`
- `/admin/placement`, `/admin/placement/[id]` — confirm an Einstufungstest recommendation
- `/admin/applications`, `/admin/applications/[id]`, `/admin/applications/[id]/cv`
- `/admin/catalogue`, `/admin/catalogue/exams` — live demand against the published catalogue
- `/admin/activity` — who changed what
- `/admin/team` (owner/admin only), `/admin/settings`

### Supported routes
German is served at the root under the old site's paths (`/sprachkurse/deutsch-intensiv`),
English under `/en`; the list uses the internal English paths. See `docs/I18N_ROUTING.md`.

- `/`
- `/about`
- `/ueber-uns/gemeinnuetzigkeit`
- `/courses`
- `/courses/[slug]`
- `/exams`
- `/exams/[code]`
- `/accommodation`
- `/accommodation/[type]`
- `/registration/course`
- `/registration/exam`
- `/careers`
- `/careers/[slug]`
- `/contact`
- `/faq`
- `/news`
- `/news/[slug]`
- `/search`
- `/placement-test`
- `/placement-test/test` (the test itself; `noindex`)
- `/placement-test/result/[token]` (a result; `noindex`, token-gated)
- `/imprint`
- `/privacy`
- `/terms`
- `/team`
- `/calculator`
- `/resources/why-germany`, `/resources/study-in-germany`, `/resources/living-in-germany`
- `/accommodation/become-host`
- `/design-system`, `/design-alternatives`, `/landing-page-alt`, `/homepage-reorganized`
  — internal review surfaces, 404 on a production build unless
  `CASA_ENABLE_INTERNAL_SURFACES=true`

## Integrations
- Postgres via `pg` — a local container (`npm run db:up`) in development, Azure
  Flexible Server or Neon in deployment. Public content reads, the workspace
  queues, and career application persistence.
- Webhook submission fan-out. Each fires **alongside** storing the record in the
  workspace, never instead of it:
  - `CONTACT_WEBHOOK_URL`
  - `CAREERS_APPLICATION_WEBHOOK_URL`
  - `COURSE_REGISTRATION_WEBHOOK_URL`
  - `EXAM_REGISTRATION_WEBHOOK_URL`
  - `PLACEMENT_RESULT_WEBHOOK_URL`

Career application submissions require `DATABASE_URL` because uploaded CV files
are stored in Postgres before any webhook fan-out happens. The staff workspace
requires it outright — it has no fixture fallback, deliberately, because an
empty queue and an unreachable database look identical.

The placement test is CASA's own instrument — it replaced the external Klett
placement links in August 2026. It runs without `DATABASE_URL` (from an
in-process store, with the learner told that progress is not durable), but needs it
for durable attempts, cross-device resume, and the writing task. See
`docs/PLACEMENT_TEST_IMPLEMENTATION.md`.

## Dashboard-Derived Public Metrics

The internal CASA dashboard/FileMaker bridge is a separate workspace at:

```text
/Users/rahmanshafiee/Tasks/10-active/work/casa-google-business-audit/
```

Website work must not call FileMaker or read dashboard row-level exports directly. Use only reviewed aggregate metrics marked public-safe in:

```text
/Users/rahmanshafiee/Tasks/10-active/work/casa-google-business-audit/WEBSITE_INTEGRATION.md
```

Current homepage metrics use rounded aggregate values from the 2026-06-17 dashboard sync: `30,000+ learners supported`, `150+ countries represented`, `7-80+ age range represented`, and `45,000+ course bookings`. The `40+ staff/teachers` claim remains draft until separately verified.

## Current Status Docs

- [Team update - 2026-06-23](/Users/rahmanshafiee/Downloads/CASA/docs/TEAM_UPDATE_2026-06-23.md)

## Local Development
- Install dependencies with `npm install`
- Start the app with `npm run dev`
- Run verification with:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:e2e`

See [docs/DEV_SETUP.md](/Users/rahmanshafiee/Downloads/CASA/docs/DEV_SETUP.md) for environment and Neon setup notes.
