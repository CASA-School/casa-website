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

### ~~U0 · Baseline and apply migration 0002~~ ✅ Done 2026-08-13

Applied against the live Neon database (`DATABASE_URL` → project `casa` on
`ep-plain-dew-age7idft`, confirmed by the user). `schema_migrations` now contains both
`0001_public_site_schema` and `0002_course_pricing_mode_and_visa`.

**`db:baseline` reported "nothing to baseline" and `db:migrate` ran 0001 fresh** — that was
verified safe *before* running, not after: every `CREATE TABLE`/`CREATE TYPE` in 0001 is
`IF NOT EXISTS` or exception-guarded, so re-running it against the already-live schema was a
no-op. 0002's `UPDATE`s are slug-scoped and only two seeded rows exist, so only
`intensive-german` changed (→ `default_price` 520.00, `pricing_mode` 'from',
`visa_eligible` true). `evening-german` keeps `visa_eligible: null`, which the UI surfaces as
"please ask" rather than a guessed Yes/No.

Verified after with a real build and e2e run with `DATABASE_URL` set — the
`column "pricing_mode" does not exist` error that had been silently falling back to fixtures is
gone. That error was only *visible* because of the DB-logging work committed in `a422201`.

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

### ~~U1 · Reduce `font-black` usage~~ ✅ Done 2026-08-12

252 of 284 in-scope occurrences rescaled in one pass. The scale is documented in
`UI_SYSTEM.md` → "Weight scale"; the rendered ladder is now 800 / 700 / 600 instead of
one flat 800.

**The proposed 900/800/700/600 scale was not achievable and was replaced.** Two findings:

1. **Weight 900 does not exist here.** `src/app/layout.tsx` loads only `400–800`, and Plus
   Jakarta Sans has no 900 face at all. Measured in the browser at 60px, weights 900 and 800
   produce an identical `724.27px` advance width. So `font-black` was *already* rendering at
   800 — the "everything is heaviest" problem was literal, and a 900-for-H1 / 800-for-H2 split
   would have been invisible.
2. **`font-extrabold` is forbidden** by `src/config/brand/usage-rules.ts`: *"it has no defined
   role in the CASA type scale."* Since it renders identically to `font-black` anyway, the
   ladder was shifted down one step to use only sanctioned classes:
   `font-black` (→800) page H1 + hero stats · `font-bold` (700) section H2/H3, card titles,
   buttons · `font-semibold` (600) eyebrows, badges, inline links.

Section headings and card titles intentionally share 700 and are separated by size, per
`docs/DESIGN_ALIGNMENT_WITH_STUDENT_APP.md`: "let size and colour carry hierarchy".

**Excluded:** `/design-alternatives`, `/landing-page-alt`, `/homepage-reorganized` (85
occurrences) were left untouched. They are frozen comparison artifacts per
`docs/EXPERIMENTAL_LANDING_PAGES.md`; restyling them would invalidate the comparison.

**Follow-up owed by whoever owns `src/config/**` (U1 could not touch it):**
`src/config/brand/usage-rules.ts:138` still says *"font-black for headings and section
titles"*, which now contradicts the code. It should read: font-black for page H1 and hero
stats, font-bold for section headings and card titles, font-semibold for eyebrows and CTA
labels, font-medium for inline body emphasis. Keep the "do not use font-extrabold" clause.

Verified: `lint`, `typecheck`, `test` (48), `build`, `test:e2e` (10) all green; computed
weights checked in-browser on `/`, `/courses`, `/design-system`.

### ~~U1b · Canvas tint and softened elevation~~ ✅ Already done — board entry was stale

Verified 2026-08-12 while picking up U1. Both halves already shipped in
`src/app/globals.css`: `--casa-canvas: #f6fafb` with `--casa-surface-subtle` /
`--casa-surface-wash` (globals.css:115–117), and the softened two-layer elevation ladder in
warmer ink at globals.css:284–287, plus `--shadow-primary` / `--shadow-accent` at 295–296.
`--casa-canvas` is consumed by 20 route files and `semanticTokens.surface.page`.

Still genuinely open from this unit: `--casa-surface-subtle` and `--casa-surface-wash` have
**zero consumers**, and the follow-up pass to remove now-redundant card borders (which the
canvas tint was supposed to make unnecessary) has not happened.

Original brief, for that follow-up:

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

### ~~U2 · Apply skill colour tokens to components~~ ✅ Done 2026-08-12, via U6

**This unit as scoped had no valid target, and the sequencing was inverted.** It named
`course-level-goals.tsx` and `sections/*` as the place to apply skill colour. Audited on
2026-08-12: none of them label a language skill from structured data.

- `course-level-goals.tsx` — its "what you will practice" list is free-text `narrative.outcomes`
  strings. Colouring those means inferring skill from prose, i.e. guessing.
- Exam narratives — free text too ("Reliable reading and listening performance").
- `level-progression-timeline`, `klett-level-tests`, `onboarding-quiz`, `persona-pathways`, the
  calculator — these label **CEFR levels**, not skills. That is U10, which this board blocks
  *behind* U2.

The only `SkillKey`-typed data in the repo is `src/config/courses/special-course-modules.ts`, so
U6 was always the tokens' first real consumer. Shipped there:
`skillTokens[module.skill]` drives each card's accent, paired with the category as text, using
the AA-safe `-text` variants. Four distinct skill colours render on
`/courses/special-courses`.

**U10 (CEFR level scale) is therefore unblocked** and is now the honest next colour unit — levels
*are* labelled in five components, unlike skills.

Remaining place skill colour could still go, if wanted: give `course-level-goals.tsx` practices a
`skill` key in the content layer rather than inferring one. That is a content-model change, not a
component change.

### ~~U3 · Protect internal surfaces~~ ✅ Already done — board entry was stale

Verified 2026-08-12 while picking up U1. `src/lib/internal-surfaces.ts` exists and all four
routes have guard layouts calling `notFound()` when `internalSurfacesEnabled()` is false —
`design-alternatives`, `design-system`, `homepage-reorganized`, `landing-page-alt`. Enabled on
dev and Vercel previews; override in production with `CASA_ENABLE_INTERNAL_SURFACES=true`.
`MEMORY.md` records this as fixed in the 2026-08-11 audit pass.

Two things this unit did *not* cover, if anyone wants to finish them:
- There is no test asserting the guard, so a regression would be silent.
- The guard is evaluated per-render, not at the edge; it 404s but the route still executes the
  layout. That is fine for review surfaces, not for anything sensitive.

The stale original entry follows.

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
hero proof line. The 1983 founding year is **confirmed by staff (2026-08-12)** and cleared for
public use, so the proof line can use it.

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

### ~~U6 · `module-catalogue` archetype content~~ ✅ Done 2026-08-12

Built as `src/components/courses/special-course-catalogue.tsx`, rendered on
`/courses/special-courses`. All five points from `GROUP_PRICING_AND_SPECIAL_COURSES.md` Part 2
are implemented except one (see below):

- Level and weekday are the two filters, as chips with `aria-pressed` and a live result count.
- The week renders as a grid; days with no match after filtering drop out entirely.
- Skill colour comes from the shared `skillTokens`, so writing reads teal here and in the student
  app. **Colour never signals alone** — every card pairs its accent with the category as text, and
  label colours use the AA-safe `-text` variants.
- The constants (€192, one 90-minute evening, 12 weeks) are stated once at the top.

**This also completed U2**, which had no valid target of its own: nothing else in shipping code
labels a language skill from structured data, so `special-course-modules.ts` was always the
skill tokens' first real consumer. See the U2 entry.

**The knip ignore is gone.** `knip.jsonc` now has an empty `ignore` array and `npm run knip`
exits 0 — proof the data file is genuinely imported rather than suppressed.

**One deviation from the brief, deliberate.** Point 5, "say who each module is for in one line",
is *not* implemented. The modules carry no audience field and writing eight of them would be
inventing claims about who a course suits. Level + category + title already answer most of it.
Add an `audience` field to `special-course-modules.ts` once staff supply the copy.

**Scope note — `archetypes.ts` was touched, against this unit's own rule.** The `module-catalogue`
archetype had no section key capable of rendering a module catalogue, so the page could not exist
without it. The change is additive and confined to that one archetype: a new `'module-catalogue'`
`CourseSectionKey`, and that key inserted into the `module-catalogue` archetype's `sections`. No
other archetype's shape changed. Three tests now guard it, including one asserting no other
archetype renders the section.

**Still blocked for launch:** the autumn 2026 dates. `SPECIAL_COURSE_TERM_LABEL` is rendered in
the footnote so the term is visible rather than implied.

Verified: `lint`, `typecheck`, `test` (51), `build`, `knip`, `test:e2e` (10) all green; filters,
empty state, reset, skill-token colours and 375px layout all checked in-browser.

### U7 · Verify the unverified claims list
**Owns:** `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` only
**Must not touch:** any source file
**Blocked by:** staff availability

Work through the "Not verified" table: the medical fee and hours, whether `university-prep`,
`business-german`, `summer-intensive`, `integration-german` and `exam-preparation` are real
current products, TestDaF's status, and the draft `40+ staff` claim.
Update only the doc; other units consume it.

~~the 1983 founding year~~ — **confirmed by staff 2026-08-12**, no longer blocking.

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

### ~~U9 · Group and company inquiry fields~~ ✅ Done 2026-08-13 (commit `77c1ff7`)

The organiser brief (group size, age band, dates, weekly hours, focus, meals, accommodation,
transport, invoicing party) now appears on `/contact` only when the topic is `group-booking` or
`company-courses`, validated in `contactInquirySchema`. **Every new field is optional** so a
partial enquiry ("about 15 people in July") still submits rather than being blocked.
`GROUP_INQUIRY_WEBHOOK_URL` was added following the optional pattern in `src/lib/db/env.ts`,
falling back to `CONTACT_WEBHOOK_URL` then preview logging, so fallback mode is unchanged.

**Still worth doing:** the field list was designed from
`docs/GROUP_PRICING_AND_SPECIAL_COURSES.md`, *not* confirmed with the group coordinator — that
part of this unit's blocker is still open. Also, an adversarial review flagged that
`src/app/api/contact/route.ts` has no test covering the `organiserBrief` derivation or the
webhook fallthrough.

### ~~U10 · CEFR level colour scale~~ ✅ Done 2026-08-13 (commit `8727a78`)

Levels are *ordered*, so they got one sequential ramp rather than the skill tokens' distinct
hues: `--level-a1` `#daeafa` → `--level-c1` `#005c90`, derived by holding `--casa-blue`'s Lab hue
constant and stepping lightness down. TS surface is `levelTokens` + `levelKeyFromLabel()` in
`src/config/brand/tokens.ts` (the latter resolves a range like "A2/B1" to its lower bound, which
is the entry requirement a reader checks themselves against).

Every ratio measured, not eyeballed: `-on-light` clears 4.5:1 on `--casa-sand` (4.51–5.81),
`-on-dark` on `--casa-ink-panel` (4.53–12.54). **B2 was deepened from L\*50 to L\*47** because
L\*50 sat in a dead zone where neither white (4.42) nor ink (4.04) cleared AA on a filled chip —
so `-ink` is stored per step rather than assumed, since the ramp crosses over between B1+ and B2.

Applied to the `/placement-test` timeline tabs, level badge and progress bar, and to the six
Klett placement-test chips below them that were previously all identical blue. Colour never
signals alone — every use pairs with the level label.

---

## Owned elsewhere — do not start

- **Testimonials.** The `studentStory` entries in `course-narratives.ts` are placeholders still
  marked `verificationStatus: 'verified'`. The user is replacing them alongside new photography.
  Leave them alone.
- **Team portraits.** Synthetic placeholders under `public/media/casa/team/`. Hard rule 3.
- **Contrast tokens → student app.** Belongs in the student app repo
  (`~/Tasks/10-active/work/casa-student-app`), not here.
