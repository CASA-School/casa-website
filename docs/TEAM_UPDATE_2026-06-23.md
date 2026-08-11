# CASA Website Team Update - 2026-06-23

## Purpose

This document is the team-facing status update for the CASA public website project. It explains what has changed, what is ready to review, what still needs team input, and what should stay out of GitHub and Vercel.

## Executive Summary

The active CASA repo is now focused on a public-facing Next.js website for discovery, trust-building, and lead capture. The old portal/dashboard scope is no longer part of the active application code.

The current build includes public routes for courses, exams, accommodation, registration, careers, contact, FAQ, news, search, placement testing, and legal pages. The highest-impact recent work has been public UX cleanup, homepage/story restructuring, search and assistant compression, authentic CASA media replacement, route/catalog cleanup, and stronger registration/contact flows.

The team presentation should frame the project as close to a launch-ready public website structure, but not yet final production content. The main help needed from the team is content authority: final schedules, prices, exam/accreditation claims, legal review, current staff/team representation, production form recipients, and launch QA signoff.

## Evidence From The Repo

- Active product scope is documented in `README.md`, `PROJECT_BRIEF.md`, `ARCHITECTURE.md`, and `MEMORY.md`.
- Supported routes are implemented under `src/app/**`, including `/`, `/courses`, `/exams`, `/accommodation`, `/registration/course`, `/registration/exam`, `/contact`, `/faq`, `/news`, `/careers`, `/search`, `/placement-test`, and legal pages.
- Public content and route helpers live in `src/lib/content/**` and `src/config/content/**`.
- Public API handlers live in `src/app/api/**` and validate submissions through `zod`.
- Public media provenance is documented in `public/media/casa/README.md`.
- The current project memory records recent verified gates: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`, and `npm run test:e2e`.

## What Changed Recently

### 1. Product Scope Reset

The active app is now a public website, not a staff/student portal. Public visitors can discover programs, compare options, search content, submit inquiries, register for courses or exams, and apply to careers.

Dashboard/FileMaker work is explicitly separated. Website code must not call FileMaker or expose row-level dashboard data. Only reviewed aggregate public-safe metrics should be used.

### 2. Public UX And Conversion Flow

The public pages now follow a clearer visitor journey:

- Home page routes users into courses, work German, exams, accommodation, registration, and contact.
- Course and exam pages have stronger decision support and detail pages.
- Registration pages are more focused and better suited to conversion.
- Contact and career flows are clearer and better structured.
- Legal and utility pages use shared templates for consistency.

### 3. Search And Assistant Cleanup

Repeated page-level search blocks were removed from the main public pages. Search now lives in the global header popover, the floating CLARA entry point, and the dedicated `/search` route.

This makes the site less repetitive while keeping fast access to course, exam, accommodation, FAQ, and registration destinations.

### 4. Homepage Alternatives And Selected Sections

Two review-only homepage alternatives were added:

- `/landing-page-alt`
- `/homepage-reorganized`

The production homepage adopted the stronger accommodation-support section and four-step enrollment section from the alternative route. The review routes are noindexed, but they are not access-controlled yet.

### 5. Verified Metrics Boundary

The homepage currently uses rounded, public-safe aggregate metrics from the 2026-06-17 dashboard sync:

- `30,000+ learners supported`
- `150+ countries represented`
- `7-80+ age range represented`
- `45,000+ course bookings`

The `40+ staff/teachers` claim remains draft until the team verifies current staffing.

### 6. Authentic Media Pass

Generated-looking and person-specific portrait assets were removed from public use. Public image slots now use source-faithful CASA classroom, exam, advising, business German, accommodation, and location imagery.

Important media guardrails:

- Do not use old staff group photos for current staff claims without human approval.
- Do not pair recognizable student portraits with named testimonials unless the identity and quote relationship are verified.
- Do not imply a specific accommodation room is currently available without current housing confirmation.
- Keep all photo edits source-faithful: crop, resize, light exposure/color correction only.

### 7. Data And Form Foundations

The public app supports fallback content and optional Neon-backed content. Public submissions validate through route handlers and use the `{ data, error }` API envelope.

Webhook fan-out is supported for:

- `CONTACT_WEBHOOK_URL`
- `CAREERS_APPLICATION_WEBHOOK_URL`
- `COURSE_REGISTRATION_WEBHOOK_URL`
- `EXAM_REGISTRATION_WEBHOOK_URL`

Career applications require `DATABASE_URL`, because uploaded CV files are stored in Postgres before webhook fan-out.

## Current Demo Flow

Use this order for the team presentation:

1. `/` - public homepage, verified proof metrics, course/exam/accommodation paths, enrollment steps.
2. `/courses` - course overview and decision support.
3. `/courses/intensive-german` - example course detail page.
4. `/exams` - exam pathways and readiness support.
5. `/accommodation` - housing support around the course.
6. `/registration/course` - course registration flow.
7. `/registration/exam` - exam registration flow.
8. `/contact` - inquiry routing and form.
9. `/search` - full public search.
10. `/design-alternatives` - internal review catalog only; not a launch page.

## Help Needed From The Team

| Area | Team input needed | Why it matters |
| --- | --- | --- |
| Course catalog | Final course names, levels, schedules, prices, start dates, and cancellation/payment rules. | Prevents launch copy from promising outdated or placeholder details. |
| Exam catalog | Confirm telc/TestDaF status, exam codes, dates, fees, registration deadlines, and required documents. | Exam claims are high-trust and must be current. |
| Accreditation and claims | Verify AZAV, Bildungszeit, BAMF, telc, TestDaF, partner, and approval wording. | Avoids publishing inaccurate regulatory or accreditation language. |
| Staff/team | Confirm current staff list, roles, photos, and whether `40+ staff/teachers` can be used. | Current team representation is still not verified in repo. |
| Testimonials | Approve real quotes, names, photos, and permission level. | Person-specific portraits and quotes must not be mismatched. |
| Accommodation | Confirm current room types, availability language, prices, host-family details, and photo usage. | Existing photos are historical/contextual, not availability proof. |
| Legal | Review imprint, privacy policy, terms, data retention, file-upload language, and webhook handling. | Legal pages are production-ready drafts, not counsel-approved final text. |
| Form operations | Decide final recipients for contact, registration, exam, and career submissions. | Webhooks need production ownership before launch. |
| Production setup | Confirm Vercel project, production env vars, Neon database, backups, and launch domain. | The code is deployable, but production ownership must be explicit. |
| Launch QA | Run PageSpeed/Lighthouse, accessibility, mobile browser, and real form submission checks on the deployed URL. | Local gates passed previously, but deployed UX needs final proof. |

## Decisions Needed Before Launch

1. Should `/design-alternatives`, `/landing-page-alt`, and `/homepage-reorganized` be removed, kept local-only, or moved behind admin/CMS access control?
2. Which homepage structure should be the final launch structure after team review?
3. Which dashboard-derived metrics are approved for public display, and who owns future metric updates?
4. Which exact course/exam/accommodation claims are approved for launch?
5. Who receives and processes each public form submission?
6. What is the canonical production deployment path: Vercel project, domain, environment variables, and rollback owner?

## Risks To Manage

- Preview/design routes are noindexed but not private.
- Some public claims are still draft or assumption-based.
- Final legal copy has not been externally reviewed.
- Production form recipients and failure handling need team ownership.
- Dashboard/FileMaker data must remain outside the public website except for approved aggregate exports.
- Media is much more authentic now, but current staff/testimonial/accommodation claims still require human verification.

## Recommended Next Sequence

### Before the team meeting

- Use the generated PDF as the walkthrough handout.
- Open the demo routes locally or on the preview deployment.
- Prepare the team to assign owners for content, legal, forms, deployment, and final QA.

### This week

- Lock approved course, exam, accommodation, and legal content.
- Decide what happens to review-only design routes.
- Configure production webhooks and Neon environment.
- Run deployed PageSpeed/Lighthouse and accessibility checks.

### After content signoff

- Replace remaining draft copy and claims.
- Run the full verification gate.
- Do one final rendered crawl for broken images, overflow, and form regressions.
- Ship only tracked source files. Keep presentation PDFs and local artifacts under ignored output folders.

## Artifact Policy

The presentation PDF and generated HTML are local deliverables, not source code. They should live under:

```text
output/team-update/
```

That folder is ignored by Git and excluded from local Vercel uploads. The tracked source of truth for the update is this markdown file.
