# Casa Cleanup Report

Date: 2026-02-10

## Findings Table

| Priority | Category | Evidence | Risk | Action |
|---|---|---|---|---|
| P1 | unused dep | `rg -n "@testing-library/jest-dom|@testing-library/react|@testing-library/user-event|testing-library__jest-dom" src e2e scripts vitest.config.ts playwright.config.ts eslint.config.mjs tsconfig.json next.config.ts package.json` only matched `package.json` | low | Removed unused test-library deps and obsolete type package |
| P1 | unused dep | `rg -n "@vitest/ui|vitest/ui" src e2e scripts vitest.config.ts package.json` only matched `package.json` | low | Removed `@vitest/ui` (no script/config usage) |
| P1 | dead file | Import-graph scan from `src/app/**`, `src/proxy.ts`, and `src/test/**` showed no inbound references to deleted files; direct checks (e.g. `rg -n "@/components/forms/sign-out-button|SignOutButton" src`) returned none | low | Deleted orphaned files |
| P2 | duplicate logic | `src/components/forms/sign-out-button.tsx` duplicated sign-out flow already implemented in `src/components/layout/portal-user-menu.tsx` | low | Removed unused duplicate component file |
| P2 | build artifact sweep | `git ls-files | rg '(^|/)(\\.next|dist|build|coverage|test-results)(/|$)'` returned no tracked artifacts | low | No action needed |
| P2 | e2e drift | Portal tests assumed implicit auth and smoke tests asserted stale hero archtypes/modules; failures reproduced in `e2e/*.spec.ts` | low | Updated e2e assertions to current behavior and added explicit mock staff login setup for portal specs |
| P2 | unused/dependency hygiene gate | `knip --include dependencies,unlisted,files` identified: `src/components/courses/course-card.tsx`, `src/i18n/routing.ts`, unused legacy database tooling, unlisted `postcss` | low | Removed unused files/dependency, added `postcss`, added `knip` script, and added CI workflow gate |
| P3 | route duplication / near duplicate patterns | Legacy pattern components existed without imports; route rendering now uses `src/components/heroes/*` and `src/components/sections/*` | medium | Only removed provably unreachable files; deferred active-path pattern consolidation |

## Removed / Changed

### Dependencies removed (devDependencies)
- `@testing-library/jest-dom`
- `@testing-library/react`
- `@testing-library/user-event`
- `@types/testing-library__jest-dom`
- `@vitest/ui`
- legacy database tooling

### Dependencies added (devDependencies)
- `knip`
- `postcss`

### Files deleted (provably unreachable)
- `src/components/forms/sign-out-button.tsx`
- `src/components/home/accreditation-strip.tsx`
- `src/components/marketing/editorial-card.tsx`
- `src/components/marketing/hero/hero-ctas.tsx`
- `src/components/marketing/hero/hero-proof-strip.tsx`
- `src/components/marketing/hero/hero-story-card.tsx`
- `src/components/marketing/public-section-shell.tsx`
- `src/components/patterns/accordions.tsx`
- `src/components/patterns/compare-table.tsx`
- `src/components/patterns/course-finder.tsx`
- `src/components/patterns/editorial-split.tsx`
- `src/components/patterns/feature-grid.tsx`
- `src/components/patterns/filter-bar.tsx`
- `src/components/patterns/section-header.tsx`
- `src/components/patterns/sticky-info-rail.tsx`
- `src/components/patterns/team-filter-grid.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/config/marketing-content.ts`
- `src/components/courses/course-card.tsx`
- `src/i18n/routing.ts`

### Test and automation updates
- Updated e2e portal auth setup and assertions:
  - `e2e/portal.spec.ts`
- Updated smoke test expectations to current route behavior:
  - `e2e/smoke.spec.ts`
- Added unused code/dependency gate:
  - `package.json` (`knip` script)
  - `.github/workflows/quality.yml`

## Deliberately Not Changed (Higher Risk)

- Active route/component behavior and layout composition.
- Broader consolidation across hero/section primitives that are near-duplicate but still active in current surfaces.

## Verification

### Baseline (before cleanup)
- `npm install` ✅
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅ (3 files, 8 tests)
- `npm run test:e2e` ❌ (pre-existing failures; 10 failed / 1 passed)
- `npm run build` ✅

### After dependency cleanup
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅

### After dead-file cleanup
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅

### Follow-up implementation (e2e + automated check)
- `npm run test:e2e -- e2e/smoke.spec.ts` ✅ (7 passed)
- `npm run test:e2e -- e2e/portal.spec.ts` ✅ (4 passed)
- `npm run knip` ✅

## Recommendations to Prevent Regressions

1. Keep the new `knip` CI gate in `.github/workflows/quality.yml` and fail PRs on new unused deps/files.
2. Enforce periodic dead-file checks for `src/components/patterns` and `src/components/marketing` where legacy modules accumulated.
3. Add a lightweight ownership note for "active rendering primitives" (e.g., `heroes` + `sections`) to prevent parallel/abandoned component trees.
4. Keep `npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e` as required pre-merge checks.
