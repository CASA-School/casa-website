# CASA Public UI Backlog (Phase 1)

## Pre-Go-Live Must Not Forget

- Move `/design-alternatives`, `/landing-page-alt`, and `/homepage-reorganized` behind admin/CMS access control, or remove the individual experiment routes before production launch.
- Keep all design-review and preview routes `noindex,nofollow` until real access control is implemented.
- Decide whether the design alternatives catalog becomes part of the future admin dashboard/CMS as a section/page variant library.

Dependency order for execution:
1. PR-A Responsive/shell overflow fixes (foundation)
2. PR-B SEO/semantic hygiene (depends on stabilized layouts)
3. PR-C Public baseline consistency (applied after structural and semantic guardrails)

---

## PR-A: Responsive/shell overflow fixes (375px)

- PR title:
  - `PR-A: Public responsive overflow + shell stability at 375px`
- Goal:
  - Remove horizontal overflow on public pages at 375px and tighten shell behavior consistency on small screens.
- Routes affected:
  - `/accommodation/[type]` (verified overflow)
  - `/registration/course` (verified minor overflow)
  - `/design-system` (verified overflow; if kept public)
  - Global shell coverage on all public routes
- Files likely touched (repo-relative):
  - `src/components/sections/comparison-module.tsx`
  - `src/components/registration/course-wizard.tsx`
  - `src/components/layout/navbar.tsx`
  - `src/components/layout/mobile-nav.tsx`
  - `src/components/layout/site-shell.tsx`
  - `src/app/design-system/page.tsx` (only if overflow remains relevant while route is public)
- Acceptance criteria:
  - No horizontal scrolling at 375px on affected routes.
  - Table/comparison modules degrade gracefully on mobile.
  - Nav drawer and header interactions remain keyboard accessible and visually stable.
  - No regressions at 768px and 1280px.
- Verification checklist:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e` (routed UX behavior changed)
  - Manual: 375/768/1280 review for `/accommodation/flat`, `/registration/course`, `/design-system`, `/`, `/courses`, `/exams`
- Risk:
  - `M`

---

## PR-B: SEO/semantic hygiene (single H1 + /design-system noindex/protect)

- PR title:
  - `PR-B: Public semantic cleanup + design-system indexing guard`
- Goal:
  - Enforce semantic heading correctness (single canonical H1 per page) and prevent internal docs route from public indexing.
- Routes affected:
  - `/news/[slug]`
  - `/design-system`
- Files likely touched (repo-relative):
  - `src/app/news/[slug]/page.tsx`
  - `src/app/design-system/page.tsx`
  - `src/lib/seo.ts` (if noindex helper updates are needed)
  - `src/app/layout.tsx` (only if metadata defaults require adjustment)
- Acceptance criteria:
  - Article detail pages expose a single canonical H1.
  - `/design-system` is noindex and/or access-restricted per product decision.
  - Metadata remains valid and does not regress on public marketing pages.
- Verification checklist:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e` (route semantics/index behavior changed)
  - Manual: inspect heading outline and metadata on `/news/[slug]` and `/design-system`
- Risk:
  - `L`

---

## PR-C: Public baseline consistency (typography/spacing/buttons + remove placeholder labels)

- PR title:
  - `PR-C: Public visual baseline pass (type/spacing/buttons/copy labels)`
- Goal:
  - Standardize baseline typography, spacing rhythm, button usage, and remove placeholder-style labels from user-facing sections.
- Routes affected:
  - `/`
  - `/courses`
  - `/courses/[slug]`
  - `/exams`
  - `/exams/[code]`
  - `/accommodation`
  - `/accommodation/[type]`
  - `/about`
  - `/team`
  - `/contact`
  - `/faq`
- Files likely touched (repo-relative):
  - `src/app/globals.css`
  - `src/components/ui/button.tsx`
  - `src/components/heroes/*.tsx`
  - `src/components/sections/*.tsx`
  - `src/components/signatures/*.tsx`
  - Selected public route files in `src/app/**/page.tsx`
- Acceptance criteria:
  - Public pages follow a consistent visual hierarchy and spacing rhythm.
  - CTA styling is consistent with shared button variants.
  - Placeholder labels (e.g., “Proof mini”, “Guided picker”, “This vs that”) are replaced with production copy.
  - No behavior or styling regressions on unaffected public routes.
- Verification checklist:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e` (multiple routed UX surfaces changed)
  - Manual: 375/768/1280 pass on primary acquisition routes and conversion routes
- Risk:
  - `M`

---

## Global notes
- Scope guard:
  - Docs and public-site implementation only; dashboard and auth remain out of scope.
- Suggested merge strategy:
  - Merge PR-A first, then PR-B, then PR-C to reduce conflict and rework.
