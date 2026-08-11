# CASA Public Site

## Purpose
CASA is now scoped as a public-facing website for CASA Bremen. The current product surface is focused on discovery, trust, and lead capture for launch: courses, exams, accommodation, news, careers, contact, and public registration.

The previous dashboard and role-based portal work has been removed from the active application code. Any future dashboard approach should be treated as a separate project decision rather than part of the current launch scope.

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

### Supported routes
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
- `/imprint`
- `/privacy`
- `/terms`

## Integrations
- Neon Postgres for public content reads and career application persistence when configured.
- Webhook-based submission fan-out for:
  - `CONTACT_WEBHOOK_URL`
  - `CAREERS_APPLICATION_WEBHOOK_URL`
  - `COURSE_REGISTRATION_WEBHOOK_URL`
  - `EXAM_REGISTRATION_WEBHOOK_URL`

Career application submissions require `DATABASE_URL` because uploaded CV files are stored in Postgres before any webhook fan-out happens.

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
