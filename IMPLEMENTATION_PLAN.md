# CASA Public Launch Plan

## Goal
Prepare CASA’s public-facing site for launch with a clean scope: discovery, trust-building, and public lead capture. Dashboard, role, and portal work are intentionally out of scope.

## Workstreams

### 1. Public content quality
- Finish copy and content QA for courses, exams, accommodation, careers, FAQ, contact, and news.
- Finalize legal/public trust pages: `/imprint`, `/privacy`, `/terms`.
- Keep EN-first delivery solid and maintain DE-ready content paths where already supported.

### 2. Conversion reliability
- Keep `/registration/course` and `/registration/exam` stable as public webhook-backed flows.
- Verify `/contact` and `/careers/[slug]` submission handling in preview and production environments.
- Confirm breadcrumb, hero, CTA, and layout consistency on utility and conversion pages.

### 3. Public data readiness
- Validate Neon-backed public reads for:
  - `course_types`
  - `course_instances`
  - `exam_types`
  - `exam_sessions`
  - `faq_items`
  - `career_positions`
  - `news_posts`
- Keep fallback content usable for local and preview environments.

### 4. Launch hardening
- Review SEO, metadata, and noindex behavior for internal-only surfaces like `/design-system`.
- Run responsive QA across primary public routes.
- Keep build, lint, typecheck, unit, and e2e gates green before launch changes merge.

## Out of Scope
- Any authenticated dashboard or role-based workflow.
- Editorial studio, permission model, or internal content operations UI.
- Agency, staff, teacher, student, or super-admin product flows.
