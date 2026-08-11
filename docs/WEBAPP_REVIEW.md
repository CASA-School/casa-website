# CASA UI/UX + Design System Audit

_Date:_ 2026-02-09  
_Role framing used:_ Principal Product Designer + UX Auditor + Frontend Architect  
_Review basis:_ Current page implementations and shared UI/token layer in this repo. (No screenshot assets were present in the workspace for annotation.)

## A) Executive Summary (Top Issues)

- **High:** Public pages are mostly placeholders with near-identical one-column structures, creating low trust and weak differentiation across Home/Courses/Accommodation/Exams/FAQ/Contact.  
- **High:** There is no clear conversion architecture (single primary CTA per page + supporting CTA), so user journeys to registration are underspecified.
- **High:** Card strategy is underdefined; Home uses simple bordered links while most pages have no card modules, making scannability and content hierarchy weak.
- **Medium:** Typography scale is narrow (`text-2xl`, `text-sm`, sparse body tiers), reducing rhythm, emphasis, and readability on long-form public content.
- **Medium:** Token foundation is present and solid, but the system currently lacks **layout patterns** that create page personality without breaking consistency.
- **Medium:** The neutral grayscale-first palette is consistent but brand-light; without imagery/artifacts, pages feel utilitarian instead of human-centered.
- **Medium:** Accessibility foundations exist in core form/button components (focus-visible rings), but public-page keyboard/focus pathways are not yet designed at page level.
- **Low:** Copy tone is internal/technical in places (e.g., “Phase A/B foundation”), not student-centered or outcome-focused.

## B) UI/UX Findings (Prioritized)

### 1) Repetitive page composition causes monotony
- **Severity:** High
- **Evidence:** Multiple public pages share the same `mx-auto max-w-4xl p-6` wrapper with an `h1` + one placeholder paragraph only, including Courses, Accommodation, Exams, FAQ, Contact, and registration pages.
- **Recommendation:** Introduce 4–6 reusable **page section patterns** (hero split, proof strip, timeline, FAQ accordion, CTA band, editorial cards). Keep tokens/components, vary composition.

### 2) Home page lacks emotional proof and clear funnel sequencing
- **Severity:** High
- **Evidence:** Home currently provides a technical title and four plain bordered links without supporting proof, benefits, or urgency cues.
- **Recommendation:** Define one primary CTA (“Find your course”) and one secondary CTA (“Talk to an advisor”), then structure page as: Hero → Outcomes/Proof → Program cards → Process steps → CTA band.

### 3) Conversion flow is present in routes but absent in UX signposting
- **Severity:** High
- **Evidence:** Registration routes exist (`/registration/course`, `/registration/exam`) but public pages do not consistently guide users toward them with context-specific CTAs.
- **Recommendation:** Add contextual CTA rows at key sections on Courses/Exams/Accommodation. Use progressive disclosure (learn more first, apply when intent is high).

### 4) Card language and interaction states are inconsistent/underdeveloped
- **Severity:** Medium
- **Evidence:** Home links are visually card-like but use plain text labels; no supporting metadata, iconography, or CTA affordances.
- **Recommendation:** Standardize card anatomy (title, descriptor, metadata row, primary action, optional secondary). Define hover/focus/active/disabled rules once and reuse.

### 5) Typography and spacing rhythm is too flat for content-heavy pages
- **Severity:** Medium
- **Evidence:** Current public pages rely on one heading tier and one small body tier, limiting visual hierarchy.
- **Recommendation:** Add semantic text presets (Display, Section Title, Lead, Body, Caption) mapped to existing tokens; define section spacing scale (e.g., 24/40/64).

### 6) Design system has strong primitives but weak “brand artifacts”
- **Severity:** Medium
- **Evidence:** Token setup and shadcn-based components exist, but there are no branded motifs/pattern modules that differentiate CASA from a generic dashboard scaffold.
- **Recommendation:** Add non-color brand artifacts (photo treatment rules, badge style, divider motif, quote block style, metric chip), all token-bound.

### 7) Accessibility needs page-level interaction contracts
- **Severity:** Low
- **Evidence:** Buttons/inputs include focus-visible treatment, but public layouts do not yet define skip links, heading region strategy, or keyboard order for card grids.
- **Recommendation:** Add accessibility checklist per page template (focus order, heading levels, interactive hit targets, link purpose text).

## C) Card System Critique

### Keep
- Existing neutral token usage and border/radius language.
- Reusable button/input primitives with built-in focus behavior.
- Simplicity of current visual style as a baseline.

### Change
- Replace generic “link as card” blocks with explicit card components and intent-based variants.
- Add metadata and action hierarchy to cards.
- Establish consistent card density (compact, regular) and spacing rules.

### Proposed card variants (max 6)
1. **Program Card** — Course/exam offering; includes level, duration, start date, CTA (“View details”).
2. **Proof Card** — Outcome/stat/proof point; includes metric and short explanation.
3. **Testimonial Card** — Student voice with name, country, and course context.
4. **Accommodation Card** — Housing options with key attributes (distance, room type, support).
5. **Process Step Card** — Admissions/registration steps in sequence.
6. **Utility Info Card** — FAQ/legal/operational info with quick-action link.

## D) Design System Improvements

### Missing tokens or patterns (without adding new colors)
- **Typography presets:** Display/Lead/Body/Meta aliases.
- **Spacing tokens for sections:** standardized vertical rhythm tiers.
- **Elevation scale guidance:** when to use border-only vs subtle shadow.
- **Content width tokens:** narrow/reading, standard, wide.
- **State tokens for cards:** hover/focus/selected across variants.

### Layout patterns to introduce (4–6)
1. **Editorial Split Hero** (copy + image).
2. **Proof Band** (3–4 metrics/testimonials).
3. **Program Grid** (mixed card sizes with one featured item).
4. **Timeline / Steps Module** (how enrollment works).
5. **Gallery Strip** (human-centered campus/life imagery).
6. **Story Module** (student journey narrative + CTA).

## E) Copy Improvements (English examples)

### Hero rewrite (example)
- **Headline:** “Learn German with confidence in Bremen.”
- **Subhead:** “Small classes, caring teachers, and clear pathways from first lesson to exam day.”

### Three improved card descriptions
1. **Intensive German Courses** — “Build real-world fluency fast with structured weekly progress and teacher feedback.”
2. **Exam Preparation** — “Train with official-style practice and targeted coaching so you walk in prepared.”
3. **Accommodation Support** — “Choose housing that fits your budget and routine, with guidance before you arrive.”

### Two improved CTA examples
- **Primary CTA:** “Find my course”
- **Secondary CTA:** “Talk to an advisor”

## F) Implementation Plan (Incremental)

### Phase 0 — Measurement / Baseline Checklist (0.5 day)
- **Pages/components affected:** `src/app/page.tsx`, `src/app/courses/page.tsx`, `src/app/accommodation/page.tsx`, `src/app/exams/page.tsx`, `src/app/registration/*`, plus shared UI inventory in `src/components/ui/*`.
- **Actions:**
  - Define baseline UX checklist (hierarchy, CTA clarity, scannability, a11y focus order).
  - Map each page’s current primary user intent and missing conversion step.
- **Acceptance criteria:**
  - Written checklist approved by product/design.
  - One primary + one secondary CTA identified per public page.

### Phase 1 — Quick Wins (1–2 days)
- **Pages/components affected:** Home, Courses, Exams, Accommodation, Contact.
- **Actions:**
  - Replace placeholder copy with user-centered, outcome-based copy.
  - Add primary CTA blocks linked to registration/advisor flow.
  - Introduce one shared `SectionHeader` and one `ProgramCard` component using existing tokens.
- **Acceptance criteria:**
  - Every page has clear above-the-fold value + primary CTA.
  - No page remains a single heading + placeholder paragraph.

### Phase 2 — Structural Improvements (1–2 weeks)
- **Pages/components affected:** public marketing pages + new pattern components in `src/components`.
- **Actions:**
  - Implement layout patterns: editorial split, proof band, process module, utility card grid.
  - Add card variants (Program/Proof/Testimonial/Accommodation/Process/Utility).
  - Standardize typography/spacing presets and apply across pages.
- **Acceptance criteria:**
  - At least 3 distinct page compositions exist across Home/Courses/Accommodation/Exams.
  - Card variants documented and reused in at least 2 pages each.
  - Keyboard focus and heading structure validated on all updated pages.

### Phase 3 — Polish + QA (2–3 days)
- **Pages/components affected:** all updated public pages and shared components.
- **Actions:**
  - Accessibility pass (focus ring visibility, link purpose text, heading order).
  - Responsive tuning for mobile/tablet rhythm.
  - Final copy pass for tone consistency and redundancy removal.
- **Acceptance criteria:**
  - UX checklist passes for all target pages.
  - No major visual monotony issues remain in side-by-side page review.
  - Conversion CTAs are consistent, contextual, and non-spammy.
