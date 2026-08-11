# Casa Project Brief

Last updated: 2026-03-31  
Repo evidence: `package.json`, `src/app/**`, `src/lib/content/**`, `src/components/**`, `src/app/api/**`

## What Casa Is
Casa is a public-facing Next.js website for CASA Bremen. Its current launch scope is marketing, discovery, trust-building, and lead capture across courses, exams, accommodation, careers, contact, news, and guided public registration.

The previous dashboard and user-role system have been removed from the active application code. A future dashboard, if reintroduced, should be treated as a new product track with fresh requirements.

## Current Core Flows

### Public browsing
- Discover programs via `/courses`, `/exams`, `/accommodation`, `/news`, `/faq`, and `/search`.
- View detail pages for courses, exams, accommodation types, news, and careers.
- Navigate with shared public layout, breadcrumbs, and guided content modules.

### Public conversion flows
- Submit course registration at `/registration/course`.
- Submit exam registration at `/registration/exam`.
- Send inquiries through `/contact`.
- Apply to open roles through `/careers/[slug]`.

### Delivery model
- Public submissions validate in Next route handlers with `zod`.
- Valid submissions can fan out to configured webhooks.
- Public content reads from Neon when configured and falls back to in-repo fixtures where supported.

## Key Routes
- `/`
- `/about`
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

## API Boundaries

### Frontend responsibilities
- Render public content pages from repository/helpers.
- Execute client-side validation with `react-hook-form` + `zod`.
- Call public route handlers under `/api/*` for submissions.

### Backend responsibilities
- Validate request payloads in route handlers.
- Return the standard `{ data, error }` response envelope.
- Fan out accepted submissions to configured webhooks.

### External providers
- Neon Postgres for optional content reads and career application persistence.
- Optional webhooks:
  - `CONTACT_WEBHOOK_URL`
  - `CAREERS_APPLICATION_WEBHOOK_URL`
  - `COURSE_REGISTRATION_WEBHOOK_URL`
  - `EXAM_REGISTRATION_WEBHOOK_URL`

## Current Data Focus
- Public content: courses, exams, accommodation, FAQ, news, careers.
- Public submissions: contact, career applications, course registration, exam registration.
- Brand and content system: hero modules, section patterns, and public navigation.

## Notes
- The active repo now uses a Neon-first database layout under `db/`.
- Historical planning documents may still reference the removed portal until they are archived or rewritten.
