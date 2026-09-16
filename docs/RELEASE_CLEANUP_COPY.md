# Deployment cleanup and bilingual copy — 2026-09-16

## Ownership and scope
- Branch: `codex/deployment-cleanup-copy`, rebased onto `casa/main` at `a0c01b5` after the four course-planning changes landed. Original audit base: `d8316c8`.
- Isolated worktree: `/Users/rahmanshafiee/.codex/worktrees/casa-release-copy/CASA`.
- User authorized repository cleanup and native English/German copy improvement, then explicitly requested statistics removal, push/merge and retired branch/worktree cleanup. No production deployment requested.
- Course-planning changes are included through the rebase. The candidate photo pool is preserved outside the project; see `docs/MEDIA_LIBRARY.md`.
- Work context: CASA website; source of brand direction is the user's brief (international diversity, belonging, listening, personal advice, accommodation, exams, cultural trips and friendship).

## Completed scope
1. Inventory tracked assets, unused code and superseded documentation. Remove only verified obsolete tracked files; Git preserves recovery.
2. Rewrite public copy in existing content/page files; preserve facts, prices, schedules, routes and verified quotations. German uses the site's established Sie form, English natural British English.
3. Record new-site additions versus the live site and outstanding launch decisions.
4. Run build, lint, typecheck, unit tests, knip and isolated-port e2e; render core routes in both languages.

## Evidence collected
- Read laptop rules, coordination registry, repo rules/README, current memory tail and Next.js bundled internationalization guide.
- Main checkout clean except the untracked editorial photo pool. Four active course-planning worktrees.
- 19 unused generated PNGs under `public/images/casa/`, nine unused JPGs under `public/images/resources/`; no tracked source or docs reference their paths or filenames.
- Obsolete root plan/brief describe English-first delivery and no staff workspace, contradicting README/current code.
- Two one-off Python extraction scripts in `src/` refer to old local intake paths; no application purpose.
- About page still invents a 1990s expansion milestone. Existing copy often uses process language instead of specific learner benefits.
- Live homepage and English version checked on 2026-09-16: https://casa-bremen.de/ and https://casa-bremen.de/en/ . Existing source comparison: `docs/CONTENT_PARITY_WITH_CASA_BREMEN_DE.md` (historical findings, not reliable current status).

## Verification
Final checks on 2026-09-16 after readability fixes, statistics removal and deployment-context cleanup:

| Command | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test` | 384 tests passed in 37 files |
| `npm run knip` | Passed: dependencies, unlisted dependencies and unused files |
| `E2E_PORT=3028 npm run test:e2e` | 39 passed, 4 skipped |

The e2e run used this worktree's server on port 3028. All four skips require `DATABASE_URL`: one staff sign-in test and three course-planning tests (which also need seeded groups/an owner). No shared database credentials were copied or shared data changed. Dependencies were installed with `npm ci --ignore-scripts`.

Browser checks: English/German homepage at 1440px and 390px. Community text contrast is at least **5.30:1** (headings **16.99:1**); scrolled navbar background is `rgb(255, 255, 255)` with opacity `1`. No horizontal overflow. Screenshots are local, ignored artifacts in `output/playwright/community-{en,de}-{1440,390}.png`.

Additional browser audit: 18 core routes in both languages at both widths, **72 successful page checks**. Each returned HTTP 200, rendered one main heading and had no horizontal overflow or failed completed image loads. Coverage includes homepage, About/team, courses and intensive course, exams and B2, accommodation and both options, contact, FAQ, all three guides, careers, hosting and nonprofit. Local details: `output/playwright/route-audit.txt`.

Logs are local, ignored artifacts in `tmp/{build,lint,typecheck,unit,knip,e2e}-final.log`. Earlier failures were resolved: lint caught only a temporary task script; e2e first required rebasing onto the planner changes, then updating the old homepage headline assertion. Final runs above are clean.

The same gates were rerun after the final removal, with the same counts (`*-merge.log`). Browser checks confirm the statistics heading and rows are absent in EN/DE, while the community programme and testimonials still render. `bash -n infra/azure/deploy.sh` passed. The actual staging script passed with a local Azure CLI stub; no Azure call or deployment was made. A Docker BuildKit context export contained 446 files / 7,244,481 bytes, including app sources and approved images, and excluded caches, worktrees, reports, local configuration, raw placement source and unapproved photos. Logs and verification artifacts are preserved in the external cleanup archive when the temporary worktree is retired.

## Removed files (recover from base commit `d8316c8`)

- `public/images/casa/course-rhythm.png` (2,227,729 bytes)
- `public/images/casa/home-accommodation-arrival.png` (2,066,243 bytes)
- `public/images/casa/home-community-story.png` (2,215,281 bytes)
- `public/images/casa/home-hero-classroom.png` (2,048,357 bytes)
- `public/images/casa/host-family-dinner.png` (2,237,822 bytes)
- `public/images/casa/host-home-morning.png` (2,050,962 bytes)
- `public/images/casa/intensive-german-bremen.png` (2,180,624 bytes)
- `public/images/casa/life-in-bremen.png` (2,387,135 bytes)
- `public/images/casa/resource-study-documents.png` (2,002,435 bytes)
- `public/images/casa/resource-study-hero.png` (2,027,442 bytes)
- `public/images/casa/site-campus-discussion.png` (2,385,909 bytes)
- `public/images/casa/site-consultation-desk.png` (2,010,440 bytes)
- `public/images/casa/site-exam-prep.png` (2,114,699 bytes)
- `public/images/casa/site-mentor-support.png` (2,142,038 bytes)
- `public/images/casa/site-shared-flat-living.png` (2,100,845 bytes)
- `public/images/casa/site-shared-kitchen.png` (2,222,636 bytes)
- `public/images/casa/site-student-success.png` (2,050,128 bytes)
- `public/images/casa/site-teacher-guiding.png` (2,085,195 bytes)
- `public/images/casa/site-team-collaboration.png` (2,155,815 bytes)
- `public/images/resources/living-hero.jpg` (252,715 bytes)
- `public/images/resources/living-housing.jpg` (201,251 bytes)
- `public/images/resources/living-kitchen.jpg` (329,033 bytes)
- `public/images/resources/study-classroom.jpg` (271,049 bytes)
- `public/images/resources/study-documents.jpg` (262,937 bytes)
- `public/images/resources/study-hero.jpg` (307,783 bytes)
- `public/images/resources/why-friends.jpg` (381,428 bytes)
- `public/images/resources/why-hero.jpg` (252,461 bytes)
- `public/images/resources/why-library.jpg` (372,559 bytes)
- `public/file.svg` (391 bytes)
- `public/globe.svg` (1,035 bytes)
- `public/next.svg` (1,375 bytes)
- `public/vercel.svg` (128 bytes)
- `public/window.svg` (385 bytes)
- `public/accreditations/greenpeace-energy.png` (4,616 bytes)
- `public/accreditations/telc.jpg` (1,943 bytes)
- `public/accreditations/testdaf.gif` (2,132 bytes)
- `public/accreditations/testdaf.svg` (2,202 bytes)
- `src/read_docx.py` (1,289 bytes)
- `src/read_pdf.py` (391 bytes)
- `CLEANUP_REPORT.md` (5,165 bytes)
- `IMPLEMENTATION_PLAN.md` (1,580 bytes)
- `PROJECT_BRIEF.md` (2,846 bytes)

Unused public assets removed: 37, 43,357,158 bytes. Source and filename reference scan passed before removal; four course-planning branch source trees also checked.

## Dead code removed

Knip export analysis exposed components retained only by barrel re-exports. Confirmed no consumers (including the four active course-planning branches), then removed:
- `src/components/sections/community-band.tsx`
- `src/components/sections/community-stories.tsx`
- `src/components/sections/faq-topics.tsx`
- `src/components/sections/live-review-module.tsx`
- `src/components/sections/partner-strip.tsx`
- `src/components/sections/photo-story-split.tsx`
- `src/components/sections/stats-row.tsx`
- `src/components/sections/teaching-staff-card.tsx`
- `src/components/heroes/hero-index-chooser.tsx`
- `src/components/heroes/hero-detail-utility.tsx`
- `src/components/signatures/home-community-outcomes.tsx`
- Unused `ProofStrip` and `HeroProofStrip` renderers. Kept `toProofStripItems`, used by `ProofBand`.
- Unused TestDaF narratives: CASA has no verified TestDaF course/exam offer.

Other unused exports are intentionally not a deletion list: UI primitive APIs, admin work and review surfaces remain in scope for their owners.

## Editorial work completed
- Rewrote homepage, About, course/exam narratives, accommodation, contact, team, FAQ, careers, hosting and nonprofit introductions in natural EN/DE. Preserved German Sie and the German Leitbild; English homepage: “Learn German. Feel at home.”
- Added the previously unrendered cultural programme to the homepage: tandem, student meetups, Bremen and regional trips including Hamburg and Lübeck (user brief; no invented frequency).
- Explained one-to-one advice and orientation for study, work and moving cities, without promising admission, employment or housing.
- Corrected unsupported shared-meal/utility/privacy assertions, removed the invented 1990s milestone, unverified one-day response promise and TestDaF narratives. Verified quotations and numeric prices/schedules remain unchanged.
- Reviewed all three resource guides in both languages: removed judgemental phrasing, fixed overbroad claims (tuition, equal job pay, fixed arrival sequence, deposit timing), retained practical steps and official-source links.
- Localized static public-page search metadata. Updated the voice guidance in `src/config/brand/voice-and-tone.ts`.
- Removed a fabricated fallback testimonial; only source-backed quotations are displayed. Refined shared navigation, footer and partnership labels in both languages.
- Full unused export audit finds more candidates than the file gate; admin exports, design review routes, UI primitive APIs and current handoff/source documents remain deliberately available.

## What this site adds to the old live site
Compared with the live navigation checked on 2026-09-16 and the historical parity audit:
- Three bilingual guides: studying, living in Germany and choosing Germany/Bremen.
- A course/accommodation cost calculator and CASA's own placement test with results (replacing external placement links).
- Dedicated contact/advice, careers and site search pages.
- A dedicated nonprofit page, linked from the homepage and navigation.
- Richer course comparisons, exam preparation information, accommodation arrival/check-in information and guided registration.
- A separate staff workspace for managing incoming requests (not a student-facing service).
These are website features/information, not new promises of separate university-placement, job-placement, visa or housing-guarantee services.

## Source checks
- User's brief: international diversity, family-like welcome, personal listening/advice, trips to Hamburg/Lübeck, meetups and help finding direction.
- [CASA mission](https://casa-bremen.de/ueber-uns/casa-leitbild): founding year, nonprofit mission, language learning through encounter.
- [CASA host accommodation](https://casa-bremen.de/unterkunft/wohnen-in-einer-gastfamilie): own furnished room, shared kitchen/self-catering, intensive-course eligibility.
- [CASA groups](https://casa-bremen.de/sprachkurse/deutsch-fuer-gruppen): group teaching and culture programme.
- [DAAD costs](https://www.daad.de/en/studying-in-germany/living-in-germany/finances/): tuition exceptions and separate semester contribution.
- [Federal study-visa guide](https://www.make-it-in-germany.com/en/visa-residence/types/studying): requirements vary; point to current authority guidance, avoid numeric legal claims.
- [uni-assist planning](https://www.uni-assist.de/en/how-to-apply/plan-your-application/), [federal banking guide](https://www.make-it-in-germany.com/en/living-in-germany/money-insurance/bank-account): application and banking requirements are not one universal sequence.

## Remaining launch decisions / boundaries
- Photography remains an existing launch blocker: only slots 20 and 23 are ready; most slots intentionally show numbered placeholders. All 103 candidate images are preserved in the external archive for the photo workstream. No unapproved image was published or destroyed.
- Confirm current staff roles, calendar, prices, nonprofit/legal wording and accommodation arrangements with their owners before deployment. This pass changes prose, not contractual policies or database rows.
- `npm audit` reports 9 existing dependency vulnerabilities (3 high), with overlapping Dependabot branches already present. No lockfile changes in this branch; assess/merge those updates separately. Production-only audit (`npm audit --omit=dev`): 0 vulnerabilities.
- Internal design-review routes are intentionally gated, not abandoned public pages; kept. Historical factual evidence and active operational docs are retained.
- Push and merge are authorized in the final follow-up. No production deployment or shared-database mutation is part of this task.

## Handoff
Implementation and required checks are complete. Commit `4f90fcd` contains the asset/code/document cleanup and bilingual editorial pass; `4413d06` contains the homepage/navbar readability corrections, final copy refinements and smoke assertion. The final follow-up removes the requested statistics block and tightens deployment exclusions.

After integration, continue in `/Users/rahmanshafiee/Downloads/CASA` on `main`; the task branch and its worktree are disposable. The laptop coordination handoff records the final merge and cleanup outcome. Next release work: finish the existing photography workstream, confirm operational facts with their owners and assess the seven open Dependabot PRs. Those dependency branches are active work and are retained.

## Final folder and Git cleanup (user follow-up)
- Removed the screenshot's statistics heading, all four figures/labels and their unused local data from both homepage languages. Kept the separate student testimonials.
- Moved the media provenance guide from the publicly served folder to `docs/MEDIA_LIBRARY.md` and updated references.
- Added missing Docker/Vercel exclusions and staging exclusions for temporary files, tool state, caches, nested worktrees and unapproved photos.
- Recovery archive: `/Users/rahmanshafiee/Archive/CASA/website-cleanup-2026-09-16/`. Its manifest records original paths and SHA-256 hashes; moved files were checked against those hashes.
- Moved the 103 unapproved photos, historical `output/` files and obsolete local Vercel/Neon metadata outside the project. Preserved the main checkout's current environment file and installed dependencies needed for continued work.
- Retired worktrees `3388/CASA`, `4735/CASA` and `.claude/worktrees/kursplanung-month`. The old detached worktree's dependency edits were saved as a binary patch and complete edited files; the planner's distinct local environment file was preserved privately. Neither was silently discarded.
- Retired local branches `archive/quantutech-main`, `claude/admin-workspace-2`, `claude/public-site-go-live` and `claude/kursplanung-month`. The first is archived history; the others are already integrated (including squash merges). Their complete history is in a verified external Git bundle. Removed the two corresponding stale remote branches that still existed.
- The final task worktree and branch are removed after merging. Build/test caches and Finder metadata are disposable; historical review artifacts and photo candidates remain recoverable outside the deployment folder.

## User review correction — homepage readability
- The new community band used `BandHeading` without a tone; its default is `dark`, so it painted white headings on the light canvas. Set `tone="light"` at that call site.
- The navbar deliberately used 55–90% white and backdrop blur, letting underlying page content compete with its labels. Both resting and scrolled/open states now use opaque white; existing scroll border/shadow behaviour remains.
- Browser validation measured foreground/background contrast and the scrolled header's opacity in both languages at desktop and mobile sizes; results are recorded above.


## 2026-09-16 follow-up: accommodation facts and shared pricing

Branch: `codex/accommodation-copy-pricing`. Local implementation complete; this follow-up is not merged or deployed.

**Evidence:** The accommodation comparison promised daily conversations and a coordinated household routine. Those services are not promised by CASA's current [host accommodation page](https://casa-bremen.de/unterkunft/wohnen-in-einer-gastfamilie). It specifies an own furnished room, usually shared kitchen and bathroom, self-catering and intensive-course eligibility. The [shared-flat page](https://casa-bremen.de/unterkunft/die-casa-wg) additionally specifies adult participants. Both pages were checked on 2026-09-16.

**Root cause:** Aspirational descriptions of family life had become service claims in the comparison, host recruitment copy and German assistant knowledge. Pricing used amount-first rows and mixed the additional-week rate with the holiday surcharge; the deposit was not named refundable in its label.

**Changes:**
- EN/DE accommodation narratives and comparisons now use the published facilities and eligibility. Removed promised daily conversations, structured family routines and speculative utilities rows. Corrected the related intensive-stay descriptions on the host recruitment page and the German assistant passage. Group-package meal arrangements remain separate.
- Shared `FeeStrip` now leads with labels, aligns amounts, uses a restrained warm surface and gives refundable deposits a separate tint plus an explicit label. No prices, charges or refund conditions were removed or changed. The holiday surcharge has its own visible explanation.
- Course sections use the same pricing presentation with calmer headings and retain all conditions. Zero-price, single-price and multiple-price formats remain supported.
- Accommodation comparisons now show two readable answer columns on mobile, with the criterion above each pair. This fixes the clipping observed at 390px. Desktop retains the table; option names remain available to screen readers.

**Files:**
- `src/app/(site)/[locale]/accommodation/[type]/page.tsx`
- `src/app/(site)/[locale]/accommodation/become-host/page.tsx`
- `src/components/courses/course-practical-details.tsx`
- `src/components/sections/fee-strip.tsx`
- `src/components/sections/comparison-module.tsx`
- `src/config/content/accommodation-costs.ts`
- `src/config/content/accommodation-narratives.ts`
- `src/lib/assistant/tools/search-public-kb.ts`

**Verification:** `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test` (384 tests) and `E2E_PORT=3000 npm run test:e2e -- --workers=2` (40 passed, 3 skipped) passed. The 3 skipped planner tests require a separately supplied DATABASE_URL and seeded owner/course groups; no planner code changed. The e2e run used this checkout's existing preview. Earlier attempts encountered a missing matching Chromium and a system-Chrome teardown hang; installing the matching Playwright Chromium resolved the runner issue, and the unmodified project configuration passed. No new test spec or dependency-manifest change was needed.

Visual checks covered German host pricing, English flat comparison, intensive-course pricing with its long price range, Bildungszeit's two durations, and evening-course pricing at desktop/390px as applicable. Final German phone checks found no page overflow or clipped terms/values. Screenshots and logs are outside the deployment tree at `/Users/rahmanshafiee/Archive/CASA/website-cleanup-2026-09-16/verification/accommodation-pricing/`.
