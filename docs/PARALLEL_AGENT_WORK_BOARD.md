# Parallel Agent Work Board

Last updated: 2026-08-12

Independent work units that can run **concurrently without colliding**. Each names the files
it owns, the files it must not touch, its verification command, and what blocks it.

## Rules for any agent picking up a unit

1. **Claim one unit.** Do not widen scope into another unit's owned files. If you need a change
   there, note it in your report instead of making it.
2. **Read `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` before writing any course number.** Fixtures
   are not a source of truth. If a figure is not in that file, it is unverified — mark it
   `TODO`/`ASSUMPTION`, do not invent a plausible value.
3. **Run the unit's verification command before reporting done.** The baseline is
   `npm run lint && npm run typecheck && npm run test && npm run build`, all currently green
   with 45 tests.
4. **A second `next dev` cannot run** while another session holds `.next/dev/lock`. Prefer
   adding a vitest case over a browser check.
5. Report in the format required by `AGENTS.md` §1: evidence → root cause → fix → files →
   verification.

---

## ⚠️ Do this first — blocks the accuracy of everything else

### U0 · Baseline and apply migration 0002
**Owns:** running the db scripts
**Must not touch:** any source file
**Blocked by:** confirming which database `DATABASE_URL` points at

`db/migrations/0002_course_pricing_mode_and_visa.sql` is written but **not applied**. Until it
runs, the site renders the old, wrong course prices in Neon-backed mode, `pricing_mode` is
missing so quote-only products can render a list price, and the group course may still sit under
the retired `conversation-lab` slug.

The runner is now tracked and transactional (`scripts/db/migrate.mjs`). The existing database
already has `0001` applied from before tracking existed, so baseline first:

```bash
npm run db:baseline && npm run db:migrate:status && npm run db:migrate
```

Verify against a rendered page afterwards, not just tests — the unit suite imports fixtures
directly and therefore only covers fallback mode.

### U0b · Port the database driver for Azure
**Owns:** `src/lib/db/server.ts`, `src/app/api/careers/apply/route.ts`, `scripts/db/*.mjs`
**Must not touch:** `src/lib/content/repository.ts` (already driver-agnostic)
**Blocked by:** an Azure PostgreSQL server existing to test against
**Verify:** `npm run build` **and** a real careers upload against Azure Postgres

`@neondatabase/serverless` does not work against Azure Postgres. `repository.ts` is portable as
is, but the careers route uses Neon's tagged-template form and `db.transaction([...])` directly
and must be rewritten as explicit `BEGIN`/`INSERT`/`INSERT`/`COMMIT`. That route is the only
write path on the public site, so a build passing is not sufficient evidence. Full plan in
`docs/AZURE_DEPLOYMENT_PLAN.md`.

## Ready now — no dependencies

### U1 · Reduce `font-black` usage
**Owns:** `src/components/**`, `src/app/**` (className strings only)
**Must not touch:** `src/config/**`, `src/lib/**`, any content module
**Verify:** `npm run build` + visual diff against `/design-system`

`font-black` (900) is applied to nearly every heading, eyebrow, stat, and card title. When
everything is heaviest, nothing reads as emphasis, and it is the main reason this site feels
heavier and more commercial than the student app. Establish a scale — 900 reserved for page
H1 and hero stats, 800 for section H2, 700 for card titles, 600 for eyebrows — and apply it.
Rationale in `docs/DESIGN_ALIGNMENT_WITH_STUDENT_APP.md`. This is a broad, low-risk, highly
parallelisable sweep. **Do it in one pass so the diff is reviewable as a whole.**

### U1b · Canvas tint and softened elevation ⭐ highest visual impact
**Owns:** `src/app/globals.css` (surface + shadow tokens), `src/config/brand/tokens.ts`
**Must not touch:** `src/config/courses/**`, any content module, any component className
**Verify:** `npm run build`; review on `/design-system` before going wide
**Sequencing:** must land *before* U1, since both change how weight and depth read

Two token-level changes, no component edits:

1. Move the page canvas off pure white to a faint cool tint (the app uses `#f6fafb`) and add
   `--casa-surface-subtle` / `--casa-surface-wash`. White cards then separate by contrast with
   the canvas instead of needing a `--casa-sand` border. Contrast-safe: every existing text
   token measures above 5.0:1 on `#f6fafb`, and they were already tuned for the much darker
   `--casa-sand`.
2. Soften the elevation ladder. Current shadows use negative spread (`-28px`, `-40px`) at high
   opacity (0.38, 0.60), which reads tight and dark. The app uses no negative spread at 0.06–0.13
   with a warmer ink (`rgba(36,51,59,…)` rather than slate `rgba(15,23,42,…)`). Keep the existing
   four token names so the 167 usages don't change. Add one coloured elevation token for primary
   actions — brand-blue glow is the cue that reads premium.

Full comparison in `docs/DESIGN_ALIGNMENT_WITH_STUDENT_APP.md`, "Elevation and canvas".
A follow-up pass should remove now-redundant card borders, but do that separately.

### U2 · Apply skill colour tokens to components
**Owns:** `src/components/signatures/course-level-goals.tsx`, `src/components/sections/*` where
skills or CEFR levels are labelled
**Must not touch:** `src/app/globals.css` (tokens already exist), `src/config/courses/**`
**Verify:** `npm run build`; check contrast with the ratios documented in `globals.css`

`--skill-*` and `--skill-*-text` tokens landed in `globals.css` and `src/config/brand/tokens.ts`
(`skillTokens`), mirrored from the student app so gold means *speaking* in both products. Nothing
consumes them yet. Wire them into level and skill labelling. **Never signal a skill by colour
alone** — always pair with a label or icon. Use `-text` variants for text; the raw values fail AA
on light surfaces.

### U3 · Protect internal surfaces
**Owns:** `src/lib/internal-surfaces.ts`, `src/app/design-alternatives/**`,
`src/app/design-system/**`, `src/app/homepage-reorganized/**`, `src/app/landing-page-alt/**`
**Must not touch:** any public route
**Verify:** `npm run build` + confirm each route returns 404/401 unauthenticated

These are `noindex, nofollow` but publicly reachable by direct URL. Robots metadata is not access
control. Known open item in `CLAUDE.md`; there is already a `src/lib/internal-surfaces.ts` and
`layout.tsx` files staged for this. Finish it before go-live.

### U4 · Nonprofit thread through homepage and nav
**Owns:** `src/app/page.tsx`, `src/config/nav.ts`, `src/config/footer.ts`
**Must not touch:** `src/config/content/**`, `src/config/courses/**`
**Verify:** `npm run build`; re-read `docs/GOOGLE_AD_GRANTS_COMPLIANCE.md` first

The hero and "Why CASA" block are purely transactional; the gGmbH identity appears only on one
page and in the footer. Part A7 of `docs/COPY_AND_COURSE_ARCHETYPE_REVIEW.md` has a proposed
hero proof line. **Confirm the 1983 founding year with staff before using it** — it is in the
unverified list.

---

## Blocked on staff input — prepare, then wait

### U5 · `professional-track` archetype content
**Owns:** `src/config/courses/course-profiles.ts` (medical-german, business-german entries only),
`src/config/content/course-narratives.ts` (same two slugs only)
**Must not touch:** `src/config/courses/archetypes.ts`, other course slugs
**Blocked by:** staff confirmation of FSP / Anerkennung wording and the medical course fee
**Verify:** `npm run test` (archetype suite must stay green)

The archetype exists and both courses already route to it. What is missing is content that
answers "does this get me to my licence?". **FSP and Anerkennung are regulated claims — do not
improvise them.** The live site says only "the medical specialist language examination". The
repo carries a €400 fee and specific dates (26.06–28.08.2026) that are not published publicly;
treat as internally sourced and confirm.

### U7b · Confirm an Ansprechpartner for each course format
**Owns:** `src/config/courses/course-profiles.ts` (the `contact` field only)
**Must not touch:** archetypes, pricing, narratives
**Blocked by:** staff confirming who owns each format
**Verify:** `npm run test`

Every course format resolves to a contact. Only **German for Groups** has a named one so far —
Ina Eismann, because casa-bremen.de already publishes her for group quotes. Every other format
falls back to `GENERAL_OFFICE_CONTACT` (`info@casa-bremen.de`), which renders as "The CASA course
advice team answers questions on this format."

Add a named person **only** when CASA already publishes them in that role or staff confirm it,
and always fill the `source` field. A named contact is a promise that a real person answers; a
guessed one sends enquiries nowhere. A test enforces that the currently-unowned formats stay
unowned, so it will fail loudly if someone invents one.

Likely owners to confirm: Firmenunterricht, Medical German (FSP enquiries), Bildungszeit/AZAV.

### U6b · Group package configurator UI
**Owns:** a new group configurator component, `src/app/courses/german-for-groups` presentation
**Must not touch:** `src/lib/pricing/group-pricing.ts` (the engine is done and tested)
**Blocked by:** coordinator sign-off on the three workbook corrections and the package definitions
**Verify:** `npm run test && npm run build`

The pricing engine and its tests already exist. What remains is the UI: three fixed packages plus
a flexible configurator, feeding a structured brief to staff. **Render an estimate, never a
quotation** — group offers are *unverbindlich* and the course carries `pricing_mode: 'on_request'`.
Reuse the pattern in `src/components/calculator/casa-cost-pathway-calculator.tsx` rather than
inventing a second calculator. Open decisions are listed in
`docs/GROUP_PRICING_AND_SPECIAL_COURSES.md`.

### U6 · `module-catalogue` archetype content
**Owns:** `src/config/courses/course-profiles.ts` (special-courses entry only), a new module list
**Must not touch:** `src/config/courses/archetypes.ts`, other course slugs
**Blocked by:** the current term's dates (autumn 2026 is captured; it will be stale at launch)
**Verify:** `npm run test`

**The module data already exists** — all eight modules are captured in
`src/config/courses/special-course-modules.ts` with level, weekday, time, dates, price, and a
`skill` key wired to the shared skill tokens. What remains is the presentation.

The current live page is a flat list of eight visually identical items, so the two questions a
reader actually has — "which one is for me?" and "does it fit my week?" — are unanswerable at a
glance. Build the catalogue around **level and weekday as the primary filters**, show the week as
a grid (Mon–Thu), colour-code by skill, and state the constants (€192, one 90-minute evening,
12 weeks) once at the top instead of eight times. Full critique and layout direction in
`docs/GROUP_PRICING_AND_SPECIAL_COURSES.md`, Part 2.

### U7 · Verify the unverified claims list
**Owns:** `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` only
**Must not touch:** any source file
**Blocked by:** staff availability

Work through the "Not verified" table: the medical fee and hours, whether `university-prep`,
`business-german`, `summer-intensive`, `integration-german` and `exam-preparation` are real
current products, TestDaF's status, the 1983 founding year, and the draft `40+ staff` claim.
Update only the doc; other units consume it.

---

## Sequenced — needs an earlier unit first

### U8 · Fold `buildSelectorCopy` into the profile layer
**Owns:** `src/app/courses/page.tsx`, `src/config/courses/course-profiles.ts`
**Blocked by:** U7 (so the merged facts are the verified ones)
**Verify:** `npm run test && npm run build`

There are currently two disagreeing sources of truth for course facts. `buildSelectorCopy` in
`src/app/courses/page.tsx` holds accurate, detailed fee copy (including a €117.50 per additional
week rate and enrolment/textbook costs) while `public-fixtures.ts` drives the detail page. Move
the former into per-course profiles so both pages read one source.

### U9 · Group and company inquiry fields
**Owns:** `src/app/contact/page.tsx`, `src/components/forms/contact-inquiry-form.tsx`,
`src/lib/validation/**`
**Blocked by:** nothing technically, but confirm the field list with the group coordinator
**Verify:** `npm run test && npm run build`

The `group-booking` and `company-courses` contact topics exist and the course pages now route to
them, but the form is generic. A group organiser should be asked for group size, age band, dates,
weekly hours, focus, meals, accommodation, transport, and invoicing party — the same information
currently collected by email. Follow the optional-webhook pattern in `src/lib/db/env.ts` if a
`GROUP_INQUIRY_WEBHOOK_URL` is added; keep it optional so fallback mode still works.

### U10 · CEFR level colour scale
**Owns:** `src/app/globals.css`, `src/config/brand/tokens.ts`
**Blocked by:** U2 (so skill and level systems are designed together)
**Verify:** `npm run build` + documented contrast ratios

Skills now have shared semantics with the app. CEFR levels do not, and the app does not define
them either — so this needs an actual design decision rather than a copy. A sequential
progression (A1 lightest → C1 deepest) derived from the brand blue is the obvious candidate.
**Derive AA-safe text variants the same way the skill tokens were** — darken against
`--casa-sand` (#e2e8f0) until 4.5:1. That method reproduced two existing tokens exactly, so it
is the house method.

---

## Owned elsewhere — do not start

- **Testimonials.** The `studentStory` entries in `course-narratives.ts` are placeholders still
  marked `verificationStatus: 'verified'`. The user is replacing them alongside new photography.
  Leave them alone.
- **Team portraits.** Synthetic placeholders under `public/media/casa/team/`. Hard rule 3.
- **Contrast tokens → student app.** Belongs in the student app repo
  (`~/Tasks/10-active/work/casa-student-app`), not here.
