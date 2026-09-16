# Deployment cleanup and bilingual copy — 2026-09-16

## Ownership and scope
- Branch: `codex/deployment-cleanup-copy`, rebased onto `casa/main` at `a0c01b5` after the four course-planning changes landed. Original audit base: `d8316c8`.
- Isolated worktree: `/Users/rahmanshafiee/.codex/worktrees/casa-release-copy/CASA`.
- User authorized repository cleanup and native English/German copy improvement. No deployment requested.
- Course-planning changes are included through the rebase. Do not edit other worktrees or the main checkout; preserve its untracked `public/media/casa/editorial-2026/` photo pool.
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
Final checks on 2026-09-16 after both readability fixes:

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
- Photography remains an existing launch blocker: only slots 20 and 23 are ready; most slots intentionally show numbered placeholders. The untracked editorial pool is owned by the photo workstream. No unapproved image was published or deleted.
- Confirm current staff roles, calendar, prices, nonprofit/legal wording and accommodation arrangements with their owners before deployment. This pass changes prose, not contractual policies or database rows.
- `npm audit` reports 9 existing dependency vulnerabilities (3 high), with overlapping Dependabot branches already present. No lockfile changes in this branch; assess/merge those updates separately. Production-only audit (`npm audit --omit=dev`): 0 vulnerabilities.
- Internal design-review routes are intentionally gated, not abandoned public pages; kept. Historical factual evidence and active operational docs are retained.
- No push, merge, deployment or shared-database mutation performed.

## Handoff
Implementation and required checks are complete on this isolated branch. Commit `4f90fcd` contains the asset/code/document cleanup and bilingual editorial pass; the follow-up commit contains the homepage/navbar readability corrections, final copy refinements, smoke assertion and this verification record. Use `git log -2 --oneline` for both hashes.

Next release work: review/integrate this branch, finish the existing photography workstream, confirm operational facts with their owners and assess the existing dependency update branches. No deployment or merge has been performed. The current local preview is `http://localhost:3028/` (DE) and `http://localhost:3028/en` (EN); restart with `npm run dev -- -p 3028` from this worktree if needed.

## User review correction — homepage readability
- The new community band used `BandHeading` without a tone; its default is `dark`, so it painted white headings on the light canvas. Set `tone="light"` at that call site.
- The navbar deliberately used 55–90% white and backdrop blur, letting underlying page content compete with its labels. Both resting and scrolled/open states now use opaque white; existing scroll border/shadow behaviour remains.
- Browser validation measured foreground/background contrast and the scrolled header's opacity in both languages at desktop and mobile sizes; results are recorded above.
