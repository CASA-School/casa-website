# CASA Project Memory

Last updated: 2026-06-29

## Current Phase

The project is still in development.

- Public marketing pages are being upgraded before final production content arrives.
- Real photography, final copy, and up-to-date course/exam timelines will be swapped in later.
- Current work should stay slot-based and fallback-friendly so those updates do not require structural refactors.
- The public website is separate from the internal CASA dashboard/FileMaker bridge; website work may use only reviewed public-safe aggregate metrics from the dashboard handoff.

## What Exists Now

- A Next.js App Router public website with marketing pages, registration flows, resources, careers, search, and legal/utility pages.
- Mock-mode and repository-backed fallback data are in place across major public flows.
- The previous role-based portal/dashboard surface is out of active launch scope.

## Recent Completed Work

### 1. Public Pages Premium Refresh

- Public page config was upgraded into a real composition layer.
- Hero density, breadcrumb placement, sticky-rail usage, and module intent were cleaned up.
- Public pages now distinguish between story pages, decision pages, and action pages.
- Detail pages keep the hero info rail and the body sticky rail, but the two are now meant to serve different purposes.
- Public pages are structured to be swap-ready for final copy, media, and schedule data.

### 2. Dashboard Metrics Boundary

- Internal dashboard/FileMaker intelligence lives in `/Users/rahmanshafiee/Tasks/10-active/work/casa-google-business-audit/`.
- Website agents should read `WEBSITE_INTEGRATION.md` before using dashboard-derived claims.
- The public site must not call FileMaker or expose row-level dashboard data.
- Current homepage dashboard-derived metrics are rounded aggregates from sync `4`: `30,000+ learners supported`, `150+ countries represented`, `7-80+ age range represented`, and `45,000+ course bookings`.
- The `40+ staff/teachers` claim remains draft until separately verified.

### 3. Accessibility Cleanup

- Shared public navigation/footer/auth surfaces were patched for missing accessible names.
- Logo-only links now expose a homepage label.
- Locale switch triggers now expose an explicit accessible label.
- This work targeted Lighthouse/PageSpeed findings for:
  - buttons without an accessible name
  - links without a discernible name

### 4. Search and Assistant UX Compression

- Repeated public-page search blocks were removed; search entry now lives in the floating icon and the dedicated `/search` route.
- The navbar search icon opens a compact search popover with quick destinations, popular searches, and live suggestions from the same ranking helper used by `/search`.
- The dedicated `/search` route keeps the fuller search form and renders grouped, compact result listings with metadata and direct next actions.
- The floating CLARA entry point is a minimal search icon; the assistant panel emphasizes next steps, useful shortcuts, and compact course listings.
- Navbar dropdown/CTA overflow was tightened so desktop and mobile search QA have no page-level horizontal overflow.

### 5. Alternative Homepage Flow Review

- Added a review-only alternative landing page at `/landing-page-alt`.
- The route keeps `/` unchanged and tests a clearer story spine: hero, trust proof, path selection, CASA support model, grouped course formats, exam preparation, accommodation, enrollment, learner stories, and final CTA.
- Path cards use anchor links so visitors can jump directly to courses, work German, exams, or accommodation without client-side state.
- The route disables global scroll-reveal on its top-level sections so browser review and full-page capture paint the full page consistently.
- Added a second review route at `/homepage-reorganized` that keeps the existing homepage vocabulary and content sources but reorders the flow around the same recommendation.
- Rollback and future private/admin access notes live in `docs/EXPERIMENTAL_LANDING_PAGES.md`.
- On 2026-06-22, the live homepage `/` adopted the `/landing-page-alt` accommodation support section plus its four-step enrollment section, replacing the previous homepage accommodation-card block and removing the earlier duplicate process block before exams.
- Added `/design-alternatives` as the noindex catalog page for page-level and section-level design alternatives; it should move behind admin/CMS access control before go-live.

### 6. Historical CASA Photo Assets

- Reviewed the sorted photo intake folder at `/Users/rahmanshafiee/Downloads/OneDrive_Photos_Sorted/Website_Best_Candidates`.
- Added source-faithful optimized derivatives under `/public/media/casa`.
- Updated the public page photo library and hero media catalog to use real CASA classroom, exam, advising, business German, and accommodation photos instead of generated-looking placeholder images.
- Course grids now use dedicated course-only image slots so accommodation room/kitchen photos do not appear in course-card contexts.
- Staff group photos were intentionally not wired into current team surfaces because the current staff composition has not been verified.
- Accommodation photos are used with neutral captions and should not be treated as exact current-room availability claims without confirmation.

### 7. Courses Page Refinement

- On 2026-06-22, the `/courses` shortlist moved from the older default card grid to the stronger course signal-card presentation used by the upgraded homepage.
- Course-card CTAs now expose course-specific accessible labels, keep compare controls, and stack cleanly on mobile.
- Course detail pages now open the body with a compact course summary strip, a cleaner rhythm module, a direct next-step CTA, and visual related-course cards.
- Stable anchors were added for `#course-options` and `#course-summary` to support focused review and future deep links.

### 8. Public Image Relevance Cleanup

- On 2026-06-23, public-facing image slots were audited across main, detail, registration, resource, team, legal, and utility routes.
- Removed generated/person-specific team and testimonial portrait assets from public use, including the old `/public/images/casa/team-*.png` portraits and the temporary `/public/media/casa/student-testimonial-*` portrait derivatives.
- Course slots now use classroom/whiteboard/business German scenes only; exam slots use exam preparation or study-planning scenes; accommodation slots use room/kitchen imagery.
- Added `school-entrance-sign.jpg` as a source-faithful CASA exterior-sign derivative for neutral legal/utility contexts.
- Rendered crawl covered 36 public routes and found no remaining references to removed portrait paths or old `/images/resources/*` assets.

### 9. Group Course Campaign Photo Pass

- On 2026-06-23, user-approved group-course and Bremen activity images from `/Users/rahmanshafiee/Downloads/OneDrive_Photos_Sorted/Website_Best_Candidates` were optimized into `/public/media/casa`.
- The key group-course campaign assets are `group-course-lunch-table.jpg`, `group-classroom-teacher-activity.jpg`, `group-course-walking-bremen.jpg`, `group-course-phone-task.jpg`, `group-course-stairs-bremen.jpg`, and `group-course-bremen-musicians.jpg`.
- `/courses`, the homepage course/story surfaces, and `/courses/german-for-groups` now use these group-course photos through `src/config/public-page-config.ts`.
- `Küche.jpg` was not duplicated because it was already represented by `student-shared-kitchen.jpg`; `Gastfamilie.jpg` was added as `host-family-room.jpg`.
- Use younger-student/group photos generically. Do not attach them to named testimonials, individual student success claims, staff/team claims, or paid campaign copy without a separate consent/currentness check.
- Verification passed: lint, typecheck, build, unit tests, e2e tests, and rendered checks for `/courses` and `/courses/german-for-groups`.

### 10. Team Update And Presentation Handoff

- Added `docs/TEAM_UPDATE_2026-06-23.md` as the tracked source for the team presentation.
- The update summarizes shipped public-site work, launch risks, team decisions needed, and the recommended demo flow.
- Generated presentation artifacts should stay under `output/team-update/`, which is ignored by Git and excluded from local Vercel uploads.
- The PDF/HTML artifacts are local presentation deliverables, not source files.

### 11. Deployment Icon Fix And Mobile Team Modal

- On 2026-06-23, GitHub Actions and Vercel production both failed on commit `cfb25cc` during `next build` because `src/app/favicon.ico` contained PNG image data that was not RGBA.
- Regenerated `src/app/favicon.ico` as RGBA ICO payloads and normalized `src/app/icon.png` plus `src/app/apple-icon.png` to real PNG files.
- The team profile modal now renders through a React portal into `document.body`, so transformed page ancestors cannot pull the fixed overlay out of the phone viewport.
- Mobile modal sizing now uses a viewport-constrained bottom-sheet layout with internal scrolling on small screens and keeps the existing desktop two-column profile layout.
- Verification passed: lint, typecheck, build, unit tests, e2e tests, Vercel/GitHub failure-log inspection, and a 390 x 844 mobile `/team` profile modal check with no horizontal overflow.

### 12. Team Portrait Placeholders And Global CLARA

- On 2026-06-23, the team directory stopped using unrelated classroom, exam, advising, accommodation, and learner photos as individual staff images.
- Added six documented synthetic placeholder portraits under `/public/media/casa/team/`, all using one consistent bright classroom/studio background and portrait framing.
- `src/config/content/team-spotlights.ts` now labels those team images as temporary portrait-style placeholders in English and German alt text.
- `src/components/signatures/team-directory.tsx` now renders team cards and the profile modal image area in portrait proportions, including the mobile modal.
- CLARA is now intentionally mounted immediately on all public routes instead of being hidden on contact, registration, search, legal, placement, and FAQ pages or delayed until scroll.
- Browser verification covered `/team` desktop portrait frames, the 390 x 844 mobile profile dialog, and 18 representative public routes with CLARA visible.
- Verification passed: lint, typecheck, build, unit tests, and e2e tests.

### 13. Google Ad Grants Nonprofit Visibility Pass

- On 2026-06-29, the Ad Grants remediation brief was folded into the development site.
- Added one first-class public page for `/ueber-uns/gemeinnuetzigkeit`, with integration proof points under `#integrationsprojekte`.
- Homepage, trimmed main navigation, concise footer mention, CLARA/search knowledge, and organization structured data now surface CASA as a gemeinnützige GmbH with reinvestment, education, and integration framing.
- `docs/GOOGLE_AD_GRANTS_COMPLIANCE.md` tracks production verification gates: current Freistellungsbescheid wording, Jugendhilfe/register wording, Here Ahead/GF-H/Tandem staff confirmation, HTTPS 301, no ads/affiliate links, link/form crawl, and mobile QA.

### 14. Resources Navigation Consolidation

- On 2026-06-29, the Resources dropdown was simplified from separate `Study in Germany`, `Living in Germany`, and `Why Germany` entries into one primary `Study & Life in Germany` guide.
- `/resources/study-in-germany` now presents itself as the combined study, arrival, housing, daily-life, and why-Germany roadmap.
- The deeper `/resources/living-in-germany` and `/resources/why-germany` routes remain available for direct/SEO use, but they are no longer primary navigation items.
- CLARA's resources response now points to News plus the consolidated guide instead of splitting study and living into separate primary streams.

### 15. Production Readiness Pass — Blockers, Contrast Tokens, Hydration

On 2026-08-11 a production-readiness audit ran across all public routes in both
locales (56 route/locale combinations, scripted with Playwright).

**Corrections to earlier documentation.** Two "known open items" were stale:

- `lucide-react` is **not** a broken dependency. `tsconfig.json` aliases it to
  `src/lib/icons/streamline-lucide-adapter.tsx`, an in-repo adapter. Its absence
  from `package.json` is deliberate. `npm run build` passes.
- The 4 experimental/internal routes were confirmed publicly reachable (HTTP 200)
  and are now actually guarded, not just `noindex`.

**Fixed.**

- Vercel Toolbar was hardcoded on (`shouldInjectToolbar = true`), shipping
  `vercel.live` to every production visitor — an unconsented third-party script
  under DSGVO. Now gated on `NODE_ENV`/`VERCEL_ENV === 'preview'`, so a
  non-Vercel production deploy stays clean too.
- `/design-system`, `/design-alternatives`, `/landing-page-alt`,
  `/homepage-reorganized` now 404 in production via per-segment guard layouts and
  `src/lib/internal-surfaces.ts`. Override with `CASA_ENABLE_INTERNAL_SURFACES=true`.
- `/registration/course` and `/registration/exam` had **zero `<h1>`**. Both now
  have a bilingual page-title header.
- Double-brand titles (`telc Deutsch B2 | CASA | CASA Bremen`) on
  `/exams/[code]`, `/courses/[slug]`, `/careers/[slug]`.
- `<html lang>` was hardcoded `"en"` while 28 of 33 pages served cookie-driven
  German. Now resolved on the server per request.
- **Hydration mismatch on every German page.** `Navbar`, `Footer` and `MobileNav`
  each read the locale cookie in their own first client render, while SSR had no
  cookie access and rendered English — React discarded and re-rendered the tree.
  Locale is now resolved once in `layout.tsx` and passed down as a prop. This is
  also the shape locale-prefixed routing needs.

**Accessible colour tokens (`globals.css`).** CASA's brand palette is *light*:
used as text on a light surface it fails WCAG AA, and used as a background it
needs ink text, not white. Verified on white — blue 2.97:1, amber 1.85:1,
sun 1.43:1, coral 3.46:1, slate-400 2.56:1.

- `--casa-blue` is unchanged and stays the brand colour for backgrounds, borders,
  rings and icons. **Text must never reference it directly.**
- New surface-aware pairs, flipped by `.casa-surface-dark` / `.casa-surface-light`
  (and by the existing `--casa-ink*` background utilities):
  `--casa-accent-text` (light #006f9f / dark #5cc8f5), `--casa-text-subtle`
  (#5b697e / #cbd5e1), plus `-hover` variants.
- `--casa-accent-surface` (#006f9f) is the filled accent surface that carries
  white text at 5.56:1 — white on `--casa-blue` was only 2.97:1.
- `--casa-muted` darkened #64748b → #5b697e (it failed on `--casa-warm-soft` and
  `--casa-sand`). Status text variants added for success/warning/danger/coral.
- Dead `--portal-v2-*` tokens removed (zero references outside `globals.css`).
- `src/config/brand/tokens.ts` `semanticTokens` now points at these tokens, and
  its self-referential radius comment is corrected.

Result: **0 contrast failures across all 56 route/locale combinations**, verified
with a canvas-normalising probe (handles `lab()`/`oklch()`). Script kept at
`output/audit/` (gitignored).

Verification: lint, typecheck, test (26), knip, build, e2e (10) all pass. One e2e
assertion was tightened — `page.locator('header')` now scopes to the header
holding `nav[aria-label="Main navigation"]`, since registration pages legitimately
render a second page-title `<header>`.

### Still Open After Pass 15

- **Bilingual is not production ready.** Locale is cookie-only on a single URL:
  German is invisible to search engines, `hreflang` in `src/lib/seo.ts` points
  `en` and `de` at the *same* canonical URL, `og:locale` is absent, 28 of 29
  audited routes serve identical `<title>`/`description` in both locales, and
  `Vary` omits `Cookie` so 28 of 33 pages can never be CDN-cached. Agreed
  direction: **next-intl middleware with `localePrefix: 'as-needed'`** — English
  URLs unchanged at `/`, German at `/de/...`.
- `generateMetadata` is inconsistent: `/careers/[slug]` localises, `/exams/[code]`
  hardcodes `'en'`.
- `/resources/study-in-germany` (the primary Resources nav destination),
  `/resources/living-in-germany` and `/resources/why-germany` are English-only by
  construction — the content module is `src/content/resourcesGuides.en.ts`.
- **839 inline `locale === 'de' ? … : …` ternaries** are the real i18n
  implementation. `next-intl` is installed and wired but unused: `useTranslations`
  is called 0 times and `src/messages/en.json` holds 6 strings (still says "CASA
  Portal"). `src/i18n/request.ts` hardcodes `locale: 'en'`.
- Design system still unenforced: no typography scale, no spacing/rhythm tokens,
  and nothing prevents drift (`rounded-2xl` ×15, `rounded-sm` ×7, `rounded-md` ×2,
  `rounded-[5px]` ×1 outside the 3-tier radius system; ~13 arbitrary shadows
  outside the 4-tier scale). A lint rule is still needed.
- `.dark` in `globals.css` defines no `--casa-*` values and there is no theme
  toggle, yet 18 `dark:` classes exist in components — dead styling.
- Mobile tap targets below 44px: carousel arrows 37×37, footer links ~16px tall.
- Test coverage is thin: 26 unit tests, no component or i18n-coverage tests.

## Current Data / Content Assumptions

- Historical CASA photos now cover the main public-page slots, but final current photography can still replace them later.
- Person-specific portraits should not be used for staff or testimonials unless the identity and quote/person relationship are explicitly verified.
- Current team portraits are synthetic placeholders for layout consistency only and should be replaced with verified real staff portraits before final real-staff launch content.
- Placeholder or generated course/exam timing data is still acceptable during development.
- New UI should consume repository-backed view models or named slots instead of hardcoded inline content whenever practical.

### 16. Copy Review and Content-Integrity Round 1

On 2026-08-12 a full copy review ran across the public routes, and its P0 findings were
applied. Three new documents anchor this phase:

- `docs/COPY_AND_COURSE_ARCHETYPE_REVIEW.md` — the review itself, plus the four-archetype
  proposal for course detail pages.
- `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` — **read this before changing any course number.**
  Every price and weekly-hours figure re-verified against casa-bremen.de, with sources, plus
  an explicit list of claims that are *not* verified.
- `docs/DESIGN_ALIGNMENT_WITH_STUDENT_APP.md` — token-level comparison with the CASA student
  app and what should converge.

**What changed in the code:**

- **Two products had been merged into one slug.** `conversation-lab` (a speaking club) was
  mapped onto the `german-for-groups` route (the school-group travel package). The content
  slug is now `german-for-groups` throughout, and its copy, facts, photography key, level
  block, nav description, and CLARA entry describe the real package: 20 hours/week, culture
  programme, host families, individually quoted. CASA has no standalone conversation course —
  conversation is a Special Courses module — so none was invented.
- **Course facts corrected** against the live site: Intensive from EUR 520 (not 940),
  Special Courses 2 UE/week at EUR 192 (not 8 at 460), Bildungszeit from EUR 280 (not 640).
  Bildungszeit at 40 hours/week and Evening at 4 UE / EUR 476 were *confirmed correct*.
- **Quote-only pricing is now expressible.** `CourseTypeRow.pricing_mode` (`fixed` | `from` |
  `on_request`) with helpers in `src/lib/content/course-pricing.ts`. German for Groups and
  Firmenunterricht render "On request" and route to a quote CTA instead of the learner
  registration wizard. This is the first piece of the `package-inquiry` archetype.
- **Visa eligibility is no longer inferred.** `inferVisaEligibility` guessed from
  `lessons_per_week >= 15`; CASA's own assistant knowledge base states a 20-lessons/week
  minimum, so the heuristic could publish a false Yes. Replaced by an explicit
  `visa_eligible` flag, three-state, where `null` renders as "Please ask".
- **German orthography repaired** — 39 corrections across 20 files. Umlauts had been stripped
  or transliterated (`Berufstatige`, `Schaetzen`, `Moebliertes`, and `F uhrungskrafte` with a
  literal mid-word space). An earlier over-eager fix had also corrupted the English word
  "furnished" into "fürnished" in two places.
- **Brand yellow drift fixed.** `--casa-sun` was `#fed500`; the shipping accreditation badge
  `public/accreditations/azav.svg` and the student app both use `#ffd500`. Two hardcoded
  CLARA orbit dots now use the token instead of a literal.
- Added `src/lib/content/__tests__/course-pricing.test.ts` to lock the corrected facts and
  prevent the visa heuristic and the "0 EUR" render from returning.

**Deliberately not done:** the fabricated `studentStory` entries in `course-narratives.ts`
still carry `verificationStatus: 'verified'`. The user confirmed these are being replaced
alongside new photography, so they were left in place rather than rewritten twice.

**Where this phase is going next:** the course archetype registry (see the review doc, Part C).
Migration order is `scheduled-cohort` first as a pixel-identical parity refactor, then
`package-inquiry`, then `professional-track` and `module-catalogue`.

### 17. Course Archetypes and Shared Design Semantics

On 2026-08-12, following round 1, the structural and design recommendations landed.

**Course archetypes are live.** `src/config/courses/archetypes.ts` defines four page shapes
keyed to the *buying decision*, not the subject: `scheduled-cohort`, `module-catalogue`,
`professional-track`, `package-inquiry`. `src/config/courses/course-profiles.ts` maps each
slug to one, and absorbed the two hardcoded lookup maps that used to live inside
`src/app/courses/[slug]/page.tsx` (which is now ~80 lines shorter and no longer knows any
course slug).

The load-bearing property: the facts rail is built from `archetype.facts`, so a
`package-inquiry` page **cannot** render a price or a start date — the archetype does not list
them, so there is nothing to render. Body sections are rendered by mapping
`archetype.sections`, so order and inclusion are data, not JSX. Learner testimonials are
excluded from organiser-facing pages. `scheduled-cohort` is the default, so any course without
a profile keeps its pre-registry behaviour.

**Shared skill semantics with the student app.** `--skill-*` tokens in `globals.css` copy the
app's values verbatim so gold means *speaking* in both products. Four of the seven fail AA as
text on white, so they follow this repo's existing surface-aware discipline: raw value for
surfaces, derived `-on-light`/`-on-dark` variants for text, flipped by `.casa-surface-dark`.
The derivation (darken against `--casa-sand` until 4.5:1) independently reproduced two tokens
this file already had — `#d20612` and `#006f9f` — which confirms it is the house method.
Exposed to TS as `skillTokens` in `src/config/brand/tokens.ts`. **Nothing consumes them yet.**

**Two of my own recommendations were revised during implementation:**

- The radius ladder was *not* replaced. The numeric scale is Tailwind/shadcn wiring and
  changing `--radius` would ripple through every `rounded-*` utility. What was missing was the
  app's intent hierarchy, so that shipped as named aliases (`--casa-radius-control` →
  `-feature`) over the existing scale.
- `--casa-warm-soft` was *not* reconciled to the app's warm paper value. `--casa-muted` was
  deliberately darkened to clear AA against `#fff3da`; changing the surface would invalidate
  that contrast work. The app should adopt this site's value instead.

Tests: `src/config/courses/__tests__/archetypes.test.ts` locks the no-price guarantee, the
scheduled-cohort parity contract, and that every public course has a profile. 36 tests green.

**Parallel work is now planned in `docs/PARALLEL_AGENT_WORK_BOARD.md`** — ten independent units
with file ownership, verification commands, and blockers, so several agents can run without
colliding.

### 18. Canvas, Elevation, and the Neon-Mode Gap

On 2026-08-12, the design-alignment recommendations landed and rendering the result exposed a
gap that the test suite could not.

**Canvas and elevation (work board U1b).** The page background moved off pure white to
`--casa-canvas: #f6fafb`, matched to the student app's `--surface-canvas`, while `--casa-bg`
stays white for cards — the two were the same token, so tinting the page would have tinted every
card. Twenty `<main>` elements switched. Contrast-safe by construction: text tokens were already
tuned for the far darker `--casa-sand`, and all measure above 5.0:1 on the new canvas.

Shadows kept their four names (167 usages untouched) but changed physics: two layers each
(contact + ambient), no negative spread, opacity 0.04–0.16 instead of 0.18–0.88, in the app's
warmer ink `rgba(36,51,59,…)` rather than cold slate. Added `--shadow-primary` / `--shadow-accent`
for coloured elevation, which is the cue that actually reads "premium" — the student app does
*not* use Duolingo-style solid-offset shadows; its only offset treatments are `inset` accent bars.

**The gap: fixture corrections did not reach Neon-backed mode.** `DATABASE_URL` is set, so the
site renders from Neon, not `public-fixtures.ts`. A rendered check of `/courses/intensive-german`
showed `Price: from 940.00 EUR` — the pre-correction figure, with `numeric(10,2)` decimals giving
away the source. Worse, `pricing_mode` and `visa_eligible` **did not exist as columns**, so in
Neon mode `pricing_mode` fell back to `'from'` and a quote-only product could render a list price.

`db/migrations/0002_course_pricing_mode_and_visa.sql` adds both columns with a CHECK constraint,
corrects the seeded figures, and migrates the `conversation-lab` row onto the `german-for-groups`
identity. The three `course_types` SELECT lists in `repository.ts` now read both columns.
**The migration has not been run** — confirm which database `DATABASE_URL` targets first.

Lesson for future passes: unit tests here import fixtures directly, so they validate fallback
mode only. Any change to course data must also be checked against Neon, or rendered.

**Verified by rendering**, not just by tests: `/courses/german-for-groups` shows a rail of
Lessons/week, Group size, Included, Lead time, Level range with **no price and no start date**,
and a "Request a quote" CTA to `/contact?topic=group-booking`. `/courses/intensive-german` still
shows Next start date and Price with a placement CTA — the scheduled-cohort parity contract holds.

### 19. Group Pricing Engine and Special-Course Module Data

On 2026-08-12 the group-courses coordinator shared `Preiskalkulation_Gruppen.xlsx`, and the
current special-courses page was reviewed.

**Group pricing.** The workbook's six-component per-person model is ported to
`src/lib/pricing/group-pricing.ts` — pure, UI-free, so it can back both a public estimator and
an internal quoting tool. Its worked example (2 weeks, DZ half board, canteen, 7-day student
ticket, large culture programme) reproduces exactly at EUR 1,140/person.

**Three bugs found in the workbook**, all implemented as documented corrections and all needing
the coordinator's sign-off:

1. `Lehrmaterial` (EUR 20) is defined at B5 but the total `SUM(I5:I10)` never references it —
   every quote produced so far is EUR 20/person short.
2. Monthly transit tickets are multiplied by the week count, so a 2-week stay on a Monatsticket
   is billed EUR 150 instead of 75. This over-charges the group.
3. Accommodation is chosen from a dropdown embedding its own week count, independent of the week
   count driving every other line, so a mismatched pair silently produces a wrong total.

Passing `includeMaterials: false` reproduces the sheet's current output exactly, so the two can
be compared. Also flagged: single-room pricing has a EUR 30 discontinuity at two weeks (double
rooms are a clean EUR 60 + 195/week), and nothing is priced beyond four weeks — the module
extrapolates at the marginal rate and returns a warning rather than inventing a figure.

**Special courses.** All eight modules captured in
`src/config/courses/special-course-modules.ts` with level, weekday, time, dates, price, and a
`skill` key — the first real consumer of the shared skill tokens. The current live page is a flat
list of eight visually identical items, so "which one is for me?" and "does it fit my week?" are
both unanswerable at a glance. Direction for the `module-catalogue` rebuild: level and weekday as
primary filters, the week as a grid, skill colour-coding, constants stated once.

Analysis, proposed packages, and the open decisions for the coordinator are in
`docs/GROUP_PRICING_AND_SPECIAL_COURSES.md`. Work board units U6 and U6b.

**Do not publish a computed group price as a quotation** — CASA's position is that group offers
are *unverbindlich*, which is why `german-for-groups` carries `pricing_mode: 'on_request'`. The
estimator produces an indicative figure and a structured brief; staff issue the binding quote.

### 20. Tracked Migrations and the Azure Direction

**Decision (2026-08-12): the website moves to Azure**, alongside the student app and the future
dashboard, so everything sits in one tenant and can be integrated. Credit is available. Plan in
`docs/AZURE_DEPLOYMENT_PLAN.md`, mirroring the student app's topology rather than inventing a
second pattern: reuse the shared `rg-casa-platform-prod` registry and Container Apps environment,
add `rg-casa-website-prod`, Azure Database for PostgreSQL replacing Neon, GitHub Actions with
workload identity federation.

**Migrations are now tracked and transactional.** `npm run db:migrate` previously re-executed
every `.sql` file on every run — no version table, no transaction, no lock, no drift detection.
That was survivable only while every migration was defensively written, and it stopped being
survivable with `0002`, which contains `UPDATE` statements that would re-apply data corrections
over later staff edits on every run.

`scripts/db/migrate.mjs` replaces `apply-sql-directory.mjs` for migrations, taking the discipline
the student app gets from Alembic: a `schema_migrations` table, each migration applied exactly
once inside its own transaction, checksum drift refused, and a Postgres advisory lock against
concurrent runners. `npm run db:migrate:status` lists applied vs pending; `npm run db:baseline`
records `0001` as applied without executing it, for adopting tracking on the existing database.
Seeds keep apply-every-time semantics on purpose — they are written idempotently.

**Azure port is two files, not one.** `src/lib/content/repository.ts` goes through
`queryRows`/`queryFirst` which use only `db.query(sql, params)`, so it is already portable. But
`src/app/api/careers/apply/route.ts` uses Neon-specific API directly — the tagged-template form
and `db.transaction([...])` — and must be rewritten as explicit `BEGIN`/`INSERT`/`INSERT`/`COMMIT`.
That route is the only write path on the public site, so it needs a real upload test against
Azure Postgres, not just a green build. An attempt to wrap the client in a plain `{ query }`
interface broke it and was reverted; `src/lib/db/server.ts` now documents why.

**Settled 2026-08-12: the website gets its own PostgreSQL Flexible Server.** Not shared with the
student app, and not a second database on the student app's server. If the two systems ever need
to exchange data they do it over an API between services, never a shared database — and that
integration is explicitly out of scope for now, so do not build toward it.

**Still open:** career applications store uploaded CVs in Postgres (`career_application_files`),
which is personal data. Consider moving CV bytes to Azure Blob Storage with a retention policy
rather than carrying binary in every database dump. This is a schema change, so decide before
migrating data. A retention period for unsuccessful applicants' CVs is a policy question for
CASA, not a technical one.

Also flagged: `bfbedb7` integrated the Vercel Toolbar unconditionally — remove or gate it before
an Azure build, and set `minReplicas: 0` on the website Container App since a marketing site does
not need warm capacity.

### 21. Repository Move to CASA-School

On 2026-08-12 the project moved off the Quantutech repository to CASA ownership.

- **Canonical repository is now `CASA-School/casa-website`** (private). Created with the `gh` CLI
  as `rshafiee-casa`, which holds admin on the `CASA-School` org.
- **Fresh history by decision.** One initial commit of 356 files. The full 117-commit development
  history remains on `Quantutech/CASA`, which is deliberately left untouched as a fallback until
  the Azure deployment is proven — so nothing was lost, it just lives in two places.
- Local remotes: `casa` → CASA-School (tracking `casa-main` → `main`), `origin` → Quantutech,
  unchanged. Do not force-push or retarget `origin`.
- Pre-flight before pushing confirmed: no secrets in tracked files, `.env*` correctly ignored
  (only `.env.example` is committed, containing one public feature flag set to `false`), largest
  blob 2.3 MB.
- A stale zero-byte `.git/index.lock` from an earlier crashed session blocked the first attempt;
  removed after confirming no git process held it.

**Vercel.** The `@vercel/toolbar` dependency and its `next.config.ts` wrapper are removed — the
layout usage had already been stripped by another pass. The build no longer depends on Vercel.
Disconnecting the Vercel *project* itself is a manual step: the `vercel` CLI is installed but not
authenticated, and logging in on the user's behalf is out of scope.

**Azure subscription is live and matches the plan.** `rg-casa-platform-prod` and
`rg-casa-student-prod` exist in germanywestcentral, with Container Apps environment
`cae-casa-prod` and registry `acrcasaprodf8d745.azurecr.io` available to reuse. The website will
get a free HTTPS test URL on the environment domain — no DNS work needed for staging. Concrete
resource names are recorded in `docs/AZURE_DEPLOYMENT_PLAN.md`. **Nothing has been provisioned**;
the cost-bearing decisions (PostgreSQL SKU above all) are still open.

## Verified Baseline

The latest implementation pass has already cleared:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:e2e`

## Known Product Direction

- Keep public pages premium, more editorial, and less repetitive.
- Keep internal dashboard ideas separate from public website UX unless a reviewed aggregate metric or content priority is explicitly approved for public use.
- Prefer cleanup of redundancy and clarity of hierarchy before adding more modules.
- Favor structural readiness now so final content can be swapped in later with minimal churn.
- Course detail pages must not assume one universal scheduled-course template. Intensive, evening, Bildungszeit, and exam-preparation formats can stay date/start oriented, but group courses, special-course projects, and Firmenunterricht need product-specific section compositions, proof, CTA logic, and inquiry flows.
- Group courses should be treated as package/inquiry products rather than normal cohorts: language course plus culture program, lunch, accommodation or host family, and agency/group offer calculation. Exact package rules, cost logic, age bands, duration options, and inclusions are pending the user-provided spreadsheet and staff input.
- Firmenunterricht/corporate lessons should speak to companies and HR/team leads through needs analysis, company goals, delivery model, and request-based offers instead of presenting generic learner registration.
- Special courses may need project/module pages with different information architecture from standard weekly course pages; public facts that are not verified in the repo or current CASA sources should remain `TODO` or `ASSUMPTION`.

## Immediate Next Focus Areas

- Re-run PageSpeed/Lighthouse on the deployed URL after the latest accessibility patch is live.
- Continue tightening accessibility beyond names/labels: contrast, heading hierarchy, and any remaining form semantics.
- Replace placeholder content and imagery once production-ready assets arrive.
- Add a future public-safe `website_metrics.json` flow once the dashboard bridge exports it.
- Use `docs/TEAM_UPDATE_2026-06-23.md` as the current presentation handoff when briefing the CASA team.
- Keep documenting major architectural or UX shifts here so future work starts from current context instead of re-discovery.
- Before rebuilding group, special, or corporate course pages, extend the course content model with an explicit page archetype/section registry instead of branching ad hoc inside `src/app/courses/[slug]/page.tsx`. The concrete four-archetype design is in `docs/COPY_AND_COURSE_ARCHETYPE_REVIEW.md`; `pricing_mode` and the quote CTA already shipped as its first slice.
- Never publish a course price or weekly-hours figure that is not in `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md`. The fixtures are not a source of truth.
- Two sources of truth for course facts currently disagree: `buildSelectorCopy` in `src/app/courses/page.tsx` carries accurate, detailed fee text, while `public-fixtures.ts` drives the detail page. Fold the former into the profile layer when the archetype registry lands.
