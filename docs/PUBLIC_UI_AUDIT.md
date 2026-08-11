# CASA Public UI Audit

## Scope and grounding
- Audit date: 2026-02-10
- Scope: public-facing App Router pages under `src/app/**`, excluding `src/app/api/**`
- Required docs reviewed:
  - `PROJECT_BRIEF.md`
  - `UI_SYSTEM.md`
  - `ARCHITECTURE.md`
  - `AGENTS.md`
- Route groups found: none (`/(public)`, `/(marketing)`, etc. not present)
- Pages Router found: none (`pages/**` not present)
- Styling/system inspected:
  - `src/app/globals.css`
  - `src/config/brand/tokens.ts`
  - `src/components/layout/site-shell.tsx`
  - `src/components/layout/navbar.tsx`
  - `src/components/layout/mobile-nav.tsx`
  - `src/components/layout/footer.tsx`
- Local visual review executed at `375px`, `768px`, `1280px` across public routes.

---

## A) PUBLIC SURFACE MAP

### Global public shell
- Root layout: `src/app/layout.tsx`
- Public shell wrapper: `src/components/layout/site-shell.tsx`
- Header/nav: `src/components/layout/navbar.tsx`, `src/components/layout/mobile-nav.tsx`
- Footer: `src/components/layout/footer.tsx`
- Note: Public routes flow through `SiteShell`; deleted auth/dashboard shells are no longer part of scope.

### Route inventory (canonical paths)

| Route | Page file | Key components used | SEO-critical |
|---|---|---|---|
| `/` | `src/app/page.tsx` | `HeroAPhotoLed`, `ProofBand`, `UnifiedSearchPanel`, `GuidedPicker`, `StatsRow`, `TestimonialGrid` | Yes |
| `/about` | `src/app/about/page.tsx` | `HeroBEditorial`, `ProofBand`, `AboutMilestones`, `EditorialSplit`, `HumanStoryBlock`, `TestimonialGrid` | Yes |
| `/team` | `src/app/team/page.tsx` | `HeroBEditorial`, `TeamDirectory`, `EditorialSplit`, `TestimonialGrid` | Yes |
| `/courses` | `src/app/courses/page.tsx` | `HeroBEditorial`, `UnifiedSearchPanel`, `OnboardingQuiz`, `GuidedPicker`, `CoursesFormatSelector`, `ComparisonModule`, `SavedCompareTray` | Yes |
| `/courses/[slug]` | `src/app/courses/[slug]/page.tsx` | `HeroCUtilityRail`, `CourseWeeklyRhythm`, `DecisionRail`, `EditorialSplit`, `ProcessSteps`, `TestimonialGrid` | Yes |
| `/exams` | `src/app/exams/page.tsx` | `HeroCUtilityRail`, `UnifiedSearchPanel`, `GuidedPicker`, `ExamsReadinessCheck`, `ComparisonModule`, `ProcessSteps`, `SavedCompareTray` | Yes |
| `/exams/[code]` | `src/app/exams/[code]/page.tsx` | `HeroCUtilityRail`, `ExamDayTimelineSignature`, `DecisionRail`, `EditorialSplit`, `ProcessSteps`, `TestimonialGrid` | Yes |
| `/accommodation` | `src/app/accommodation/page.tsx` | `HeroDGallery`, `UnifiedSearchPanel`, `GuidedPicker`, `AccommodationPlaybook`, `EditorialSplit`, `ComparisonModule`, `ProcessSteps` | Yes |
| `/accommodation/[type]` | `src/app/accommodation/[type]/page.tsx` | `HeroCUtilityRail`, `AccommodationArrivalChecklist`, `DecisionRail`, `ComparisonModule`, `ProcessSteps` | Yes |
| `/accommodation/become-host` | `src/app/accommodation/become-host/page.tsx` | `HeroDGallery`, `EditorialSplit`, `ComparisonModule`, `ProcessSteps` | Yes |
| `/placement-test` | `src/app/placement-test/page.tsx` | `HeroEMinimal`, `KlettLevelTests` | Yes |
| `/calculator` | `src/app/calculator/page.tsx` | `CasaCostPathwayCalculator` | Medium |
| `/faq` | `src/app/faq/page.tsx` | `HeroEMinimal`, `UnifiedSearchPanel`, `FaqTopicNavigator`, `EditorialSplit`, `ProcessSteps` | Yes |
| `/search` | `src/app/search/page.tsx` | `HeroEMinimal`, `UnifiedSearchPanel`, grouped search result sections | Medium |
| `/news` | `src/app/news/page.tsx` | `PageHero`, featured article, updates list, careers strip | Yes |
| `/news/[slug]` | `src/app/news/[slug]/page.tsx` | `PageHero`, article body, related articles, sidebar CTA | Yes |
| `/careers` | `src/app/careers/page.tsx` | `HeroEMinimal`, role cards grid | Yes |
| `/careers/[slug]` | `src/app/careers/[slug]/page.tsx` | detail hero card + `CareerApplicationForm` | Yes |
| `/contact` | `src/app/contact/page.tsx` | `HeroEMinimal`, `ContactInquiryForm`, inquiry cards, office/support panels | Yes |
| `/registration/course` | `src/app/registration/course/page.tsx` | `HeroEMinimal`, `CourseWizard`, side guidance cards | Yes (conversion-critical) |
| `/registration/exam` | `src/app/registration/exam/page.tsx` | `HeroEMinimal`, `ExamWizard`, side guidance cards | Yes (conversion-critical) |
| `/imprint` | `src/app/imprint/page.tsx` | `LegalUtilityTemplate` | Yes (legal/trust) |
| `/privacy` | `src/app/privacy/page.tsx` | `LegalUtilityTemplate` | Yes (legal/trust) |
| `/terms` | `src/app/terms/page.tsx` | `LegalUtilityTemplate` | Yes (legal/trust) |
| `/design-system` | `src/app/design-system/page.tsx` | internal governance page | No (should be noindex/protected) |

Representative dynamic URLs observed in runtime review:
- `/courses/intensive-german`
- `/exams/b2`
- `/accommodation/flat`
- `/news/intensive-course-starter-guide`
- `/careers/daf-teacher-bremen`

---

## B) CURRENT UI AUDIT

| Route | What feels basic | UX/UI issues | Component gaps | Mobile issues | Quick wins vs systemic fixes |
|---|---|---|---|---|---|
| `/` | Strong base, but repetitive section rhythm | Hierarchy flattens after hero; many similarly weighted cards | Stronger trust narrative block and clearer differentiation | Long scroll fatigue | Quick: tighten section count/spacing. Systemic: stronger page rhythm templates |
| `/courses` | Feature-dense and tool-heavy | Search + quiz + picker + selector + compare stack is cognitively heavy | No dedicated pricing module | Dense controls in one flow | Quick: sequence modules better. Systemic: focused conversion funnel pattern |
| `/courses/[slug]` | Decision rail useful but repetitive | Information duplicated between hero and side rail | No explicit fees/inclusions module | Long vertical path before CTA reinforcement | Quick: dedupe info blocks. Systemic: reusable course-detail IA |
| `/exams` | Clear but similar to courses layout | Section naming/copy includes placeholder-like language in places | Missing exam-specific trust/proof pattern | Generally acceptable | Quick: copy hierarchy cleanup. Systemic: dedicated exam conversion modules |
| `/exams/[code]` | Solid structure, generic visual tone | Similar pattern to course detail reduces distinctiveness | Missing exam prep package/fee breakdown module | Generally acceptable | Quick: exam-specific CTA strips. Systemic: exam detail template variant |
| `/accommodation` | Good imagery, familiar card language | Housing option distinction above fold can be clearer | Missing structured pricing/inclusions table | Generally acceptable | Quick: stronger option summary row. Systemic: accommodation-specific comparison suite |
| `/accommodation/[type]` | Useful content, utilitarian table sections | Comparison/table regions create layout stress | Responsive comparison variant missing | Horizontal overflow at 375px | Quick: fix overflow in compare/grid behavior. Systemic: mobile-first compare pattern |
| `/accommodation/become-host` | Informationally complete | Text-heavy sections reduce scanability | Missing host testimonials/proof section | Generally acceptable | Quick: break into concise cards. Systemic: host funnel component set |
| `/about` | Trustworthy but repeats visual language | Too many similarly weighted sections | Missing richer proof timeline/case-study cards | Generally acceptable | Quick: increase section contrast. Systemic: trust story system |
| `/team` | Useful interactive directory | Directory cards feel generic | Missing richer profile cards and role-story content | Generally acceptable | Quick: improve card hierarchy. Systemic: reusable people card system |
| `/news` | Featured article is strong | List area feels plain/editorially thin | Missing richer blog card system/taxonomy UX | Generally acceptable | Quick: improve card metadata layout. Systemic: resources/blog design kit |
| `/news/[slug]` | Clean reading layout | Two visible H1-level headings in page flow risk semantic overlap | Missing strong in-article CTA variants | Generally acceptable | Quick: enforce one canonical H1. Systemic: shared article semantic contract |
| `/careers` | Readable role cards | Limited conversion storytelling (culture/process/benefits) | Missing hiring process timeline + FAQ block | Generally acceptable | Quick: add process strip. Systemic: careers landing pattern |
| `/careers/[slug]` | Strong desktop two-column structure | Role narrative and form feel loosely connected | Missing role highlight/proof cards | Tight but usable | Quick: connect summary+form with trust context. Systemic: role detail component set |
| `/contact` | Functional, trustworthy | Similar card treatment across sections flattens hierarchy | Missing reusable response-SLA trust component | Generally acceptable | Quick: stronger primary-action emphasis. Systemic: form-page scaffold |
| `/faq` | Filtered FAQ works | Large accordion wall with weak topic context | Missing guided decision widgets per topic | Generally acceptable | Quick: topic intro summaries. Systemic: FAQ + guided-help framework |
| `/search` | Utility works but basic | No term highlighting; weak result differentiation | Missing reusable result-card primitives | Generally acceptable | Quick: enrich result cards. Systemic: unified search UI kit |
| `/placement-test` | Clear conversion path | Visual card language repetitive | Missing stronger post-test journey module | Generally acceptable | Quick: simplify card text. Systemic: assessment journey pattern |
| `/registration/course` | Wizard structure is strong | Minor edge overflow at 375px; dense side panels | Missing compact mobile summary panel | Minor horizontal overflow at 375px | Quick: tighten mobile width constraints. Systemic: shared wizard shell |
| `/registration/exam` | Wizard clear and compact | Similar to course wizard, could be more premium | Missing confidence/trust block near submit | Generally acceptable | Quick: add inline confidence block. Systemic: shared registration patterns |
| `/imprint`, `/privacy`, `/terms` | Clear legal utility layout | Draft/legal notice language may weaken public trust | Missing legal content governance workflow indicator | Generally acceptable | Quick: finalize legal copy. Systemic: legal publishing workflow |
| `/design-system` | Useful internal docs page | Publicly visible; table overflow on mobile | Missing internal-doc guard/noindex policy | Horizontal overflow at 375px | Quick: noindex/protect route. Systemic: internal docs access strategy |

### Cross-route systemic findings
- Two hero systems coexist (`src/components/heroes/*` and `src/components/patterns/hero/*`), increasing drift risk.
- CTA styling is inconsistent due to mixed use of custom `Link` button styles vs shared button variants.
- Repeated white-card motif lowers differentiation on long pages.
- Placeholder-like labels visible in UI reduce polish (e.g., “Proof mini”, “Guided picker”, “This vs that”).
- Runtime verified responsive defects at 375px:
  - `/accommodation/flat`
  - `/registration/course`
  - `/design-system`

---

## C) DESIGN DIRECTION FOR PUBLIC SITE

### Target vibe
Confident, editorial, human, and premium. Keep CASA’s warm-neutral and deep-ink brand language, but increase hierarchy clarity and conversion intent.

### Typography and heading hierarchy
- Keep Plus Jakarta Sans (`src/app/layout.tsx`) as primary typeface.
- Establish a fixed public scale:
  - Display: 56/1.05 desktop, 44/1.08 tablet, 36/1.1 mobile
  - H1: 44/1.1, H2: 34/1.15, H3: 26/1.2
  - Body: 18/1.6 large, 16/1.6 regular
- Reserve `font-black` for primary anchors only.

### Spacing and section rhythm
- Define page spacing tokens:
  - XL sections: 112/96/72 (desktop/tablet/mobile)
  - L sections: 88/72/56
  - Card padding: 32/24/20
- Enforce one clear narrative path per page: hero -> value -> proof -> conversion.

### Radius and elevation
- Standardize to the 4-tier radius system in `src/app/globals.css`:
  - Primary cards & containers (Large): `rounded-3xl` / `rounded-2xl` / `rounded-4xl` (all mapped to **24px**)
  - Medium cards & list items (Medium): `rounded-lg` (**12px**) / `rounded-xl` (**14px**)
  - Inputs & controls (Small): `rounded-md` / `var(--radius)` (**8px**)
- Limit heavy shadow use to highest-priority conversion blocks.

### Button system
- Standardize three public variants:
  - Primary (deep ink)
  - Secondary (outline)
  - Ghost/link (utility)
- Ensure consistent hover/focus/disabled/loading behavior.
- Replace ad-hoc link button classes with shared button variants.

### Forms
- Normalize anatomy: label -> helper -> input -> inline error -> success.
- Keep progressive disclosure for multi-step forms.
- Keep response expectation microcopy near submit actions.

### Content patterns
- Standard page stack:
  - Hero
  - Trust/social proof
  - Feature pathways
  - Decision/comparison support
  - Testimonials
  - Conversion CTA
  - FAQ
  - Footer
- Add consistent pricing/inclusion disclosure across courses, exams, accommodation.

### Motion
- Keep reduced-motion behavior defined in `src/app/globals.css`.
- Use subtle, intentional transitions only for: section reveal, hover lift, drawer transitions.

### Accessibility baseline
- One canonical H1 per page.
- Strong visible focus states across nav/forms/interactive cards.
- Minimum 44px tap targets in nav and primary actions.
- Verify contrast on muted text over warm/light surfaces.
- Keyboard-test nav dropdowns, drawers, accordions, and wizards.
- Add regression checks for 375px horizontal overflow.

---

## D) COMPONENT SYSTEM PLAN (PUBLIC)

### Existing inventory to build on
- Shell and navigation:
  - `src/components/layout/site-shell.tsx`
  - `src/components/layout/navbar.tsx`
  - `src/components/layout/mobile-nav.tsx`
  - `src/components/layout/footer.tsx`
- Hero systems:
  - `src/components/heroes/*`
  - `src/components/patterns/hero/*`
- Sections/signatures:
  - `src/components/sections/*`
  - `src/components/signatures/*`

### Add/upgrade plan

| Pattern | Where it should live | Pages using it | Acceptance criteria |
|---|---|---|---|
| SiteShell polish (sticky behavior + mobile drawer) | Update `src/components/layout/navbar.tsx`, `src/components/layout/mobile-nav.tsx`, `src/components/layout/footer.tsx` | All public routes | No 375px overflow; keyboard-accessible menu/drawer; consistent CTA placement |
| Unified PageHeader/Hero contract | Consolidate around `src/components/patterns/hero/*`, keep thin wrappers in `src/components/heroes/*` | Home, indexes, details, news | One canonical H1/page, consistent breadcrumb/meta slots, variant parity |
| Feature section primitives | Add `src/components/sections/feature-grid.tsx`, `src/components/sections/value-pillars.tsx` | `/`, `/courses`, `/exams`, `/accommodation`, `/about` | Reusable APIs, consistent rhythm, responsive parity |
| Trust system | Add `src/components/sections/trust-logos.tsx`, `src/components/sections/case-study-card.tsx` | `/`, `/about`, `/courses`, `/exams`, `/careers` | Supports logos+metrics+quote; no placeholder labels |
| Pricing components | Add `src/components/sections/pricing-cards.tsx`, `src/components/sections/pricing-compare.tsx` | `/courses`, `/courses/[slug]`, `/exams`, `/registration/*` | Consistent fee/inclusion display; mobile-friendly compare |
| Blog/resources cards | Add `src/components/news/news-card.tsx`, `src/components/news/news-list.tsx` | `/news`, `/news/[slug]` | Consistent author/date/tags/read time treatment |
| CTA strip + newsletter pattern | Add `src/components/sections/cta-strip.tsx`, optional `src/components/sections/newsletter-signup.tsx` | `/`, `/courses`, `/exams`, `/news`, `/careers` | Strong single intent, accessible form semantics |
| Form field system | Add `src/components/forms/form-field.tsx` and apply to existing forms | `/contact`, `/careers/[slug]`, `/registration/*` | Uniform helper/error/success behavior; keyboard/screen-reader friendly |

ASSUMPTION: There is no standalone `/pricing` route today; pricing modules should first support existing conversion pages.

---

## E) PHASED ROADMAP (PR-SIZED)

### Phase 1 (1–3 days): Quick wins

| PR | Goal | Routes affected | Files likely touched | Risk | Verification checklist |
|---|---|---|---|---|---|
| PR-1 Public baseline consistency | Tighten typography/spacing/button consistency and remove placeholder-ish labels on core pages | `/`, `/courses`, `/exams`, `/accommodation`, `/about`, `/team`, `/contact` | `src/app/globals.css`, `src/components/ui/button.tsx`, selected `src/app/*/page.tsx` | M | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; manual 375/768/1280 checks |
| PR-2 Responsive/shell fixes | Resolve mobile overflow and improve nav/drawer interaction behavior | `/accommodation/[type]`, `/registration/course`, global shell routes | `src/components/sections/comparison-module.tsx`, `src/components/layout/navbar.tsx`, `src/components/layout/mobile-nav.tsx`, `src/components/registration/course-wizard.tsx` | M | Above scripts + `npm run test:e2e`; explicit 375px overflow checks |
| PR-3 SEO/semantic hygiene | Fix heading semantics and lock down internal docs route | `/news/[slug]`, `/design-system` | `src/app/news/[slug]/page.tsx`, `src/app/design-system/page.tsx` | L | Above scripts; manual heading-outline + metadata verification |

### Phase 2 (1–2 weeks): Component upgrades
- Hero consolidation and API unification across `src/components/heroes/*` and `src/components/patterns/hero/*`.
- Trust/feature module rollout across landing pages.
- Pricing disclosure components across course/exam/registration surfaces.
- Form UX system upgrade across public forms.

### Phase 3 (2–6 weeks): Full UX polish
- Landing variants and stronger narrative sequencing for acquisition pages.
- Blog/resources evolution for editorial quality.
- Performance, SEO, and accessibility hardening.

---

## F) OPTIONAL TEXT WIREFRAMES

### Home (`/`)
Hero (value + 2 CTAs) -> Trust strip -> Program chooser -> Why CASA pillars -> Testimonials -> Accommodation preview -> Final CTA -> FAQ teaser -> Footer.

### Courses (`/courses`)
Hero -> Quick route chooser -> Primary course cards -> Pricing summary/compare -> Human proof -> FAQ snippet -> Registration CTA strip -> Footer.

### Exams (`/exams`)
Hero -> Exam option cards -> Readiness checklist -> Timeline -> Comparison -> Trust/proof -> Registration CTA strip -> Footer.

### Contact (`/contact`)
Hero -> Topic cards -> Main form + support panel -> Next-step CTAs -> Footer.

### Careers (`/careers`)
Hero -> Open roles grid -> Why join proof -> Hiring process -> Applicant FAQ -> Inquiry CTA -> Footer.

---

## G) Messaging upgrades by page

| Route | Headline | Subheadline | Primary CTA |
|---|---|---|---|
| `/` | Learn German in Bremen with a team that stays with you | Structured courses, real support, and clear pathways from first level to certification | Find your course |
| `/courses` | Choose the course format that fits your life and goals | Compare intensive, evening, and specialist paths with transparent schedules and outcomes | Compare course formats |
| `/courses/[slug]` | Intensive German: clear weekly progress, measurable outcomes | See schedule, teaching rhythm, and next steps before you register | Reserve your place |
| `/exams` | Exam pathways with clear deadlines and calm preparation | Compare telc and TestDaF options, then move directly into the right registration flow | Compare exam options |
| `/exams/[code]` | telc Deutsch B2 at CASA Bremen | Understand timeline, requirements, and registration details at a glance | Register for this exam |
| `/accommodation` | Find housing in Bremen that supports your learning | Compare shared flats and host families with clear expectations and support | Request accommodation |
| `/accommodation/[type]` | Shared flats for focused, independent study life | Practical living with reliable support and transparent next steps | Check availability |
| `/about` | A language school built around people, not just lessons | Since 1983, CASA has helped international learners build language confidence and belonging | Meet the CASA team |
| `/news` | Stories, updates, and insights from the CASA community | Practical articles for learners planning their next step in Bremen | Read latest article |
| `/careers` | Join CASA and help shape meaningful learner journeys | Work in an international, people-first environment focused on measurable progress | View open roles |
| `/contact` | Tell us your goal, we’ll send your best next step | Course, exam, accommodation, or general support with clear response times | Send your request |
| `/placement-test` | Start at the right level from day one | Take the placement test and get a clear recommendation before registration | Start placement test |
| `/registration/course` | Complete course registration in a few clear steps | Choose your option, add your details, and submit directly to admissions | Continue registration |
| `/registration/exam` | Register for your exam session with full clarity | Confirm date, fee, and candidate details in one guided flow | Continue exam registration |

---

## Implementation safety notes
- Keep public UI changes isolated to shared public components and public `src/app` routes.
- Do not reintroduce dashboard or auth-only assumptions into the public site.
- For each non-trivial PR run:
  - `npm run build`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:e2e` when routed UX/workflow behavior changes.
