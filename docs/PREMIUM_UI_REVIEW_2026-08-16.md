# Premium UI Review — 2026-08-16

Scope: the design layer of the public site. Method: 8 parallel code reviews across typography,
spacing, colour, shape/elevation, motion, primitives, imagery and page composition, plus a
first-hand browser pass at 375 / 1440 / 1500 px against the live dev server.

The four frozen internal routes (`/design-system`, `/design-alternatives`, `/landing-page-alt`,
`/homepage-reorganized`) are excluded from every count below.

## Verification status of this document

The 8 review agents completed. **The 8 adversarial verification agents all failed on a session
limit and never ran.** Every claim reproduced below was therefore re-checked by hand — by
reading the cited file or re-running the cited grep — before being written down. Three agent
claims did not survive that check and are recorded in "Corrections" at the end rather than in
the findings.

## The one-sentence read

The token system is genuinely good — surface-aware AA-measured colour, a 3-tier radius scale
that has actually held, a two-layer elevation ladder, shared skill and CEFR ramps — and it stops
at the marketing sections. It never reaches the pages where people convert, there is no
typography layer at all, and a layer of decorative ornament sits on top that works against the
quality the tokens were built to deliver.

Not "add a design system". **Finish delivering the one that exists, then remove the ornament.**

---

## Tier 1 — Shipping defects, visible on screen

> **✅ All six shipped 2026-08-16.** Verified with lint, typecheck, 74 unit tests, build, knip and
> 10/10 e2e, plus rendered checks at 1280 / 1366 / 1400 / 1440 in both locales. Each finding
> below keeps its original description; what changed is recorded in the **Fixed** note under it.

### 1.1 The stats counter publishes numbers that are not true

`src/components/sections/stats-row.tsx:36-50` parses a stat value and, at :38, matches a
**range** like `7-80+`. `CounterValue` (:173-179) then animates the two bounds independently over
1300 ms. Captured live on the homepage during that window:

| Approved claim | Rendered mid-animation |
| --- | --- |
| `30,000+` learners supported | `1,114+`, then `2,227+` |
| `150+` countries represented | `6+`, then `11+` |
| `7-80+` age range represented | **`0-3+`**, then **`1-6+`** |
| `45,000+` course bookings | `1,672+`, then `3,341+` |

The DOM source values are correct — the animation invents the intermediate ones. "Age range
represented: 1-6" is a false statement about a language school, rendered on the homepage, on a
site whose hard rules forbid publishing unverified claims and which is under Google Ad Grants
review.

**Fix:** delete the `range` branch entirely — a range is not a quantity and cannot be counted up.
Render `7–80+` statically. For the three real quantities, either drop the count-up too or start
it from a value that is already defensible; a rounded aggregate that reads `1,114+` for 400 ms is
worse than no animation.

**Fixed.** The count-up was removed entirely, not only for ranges — the single-value case had the
same defect in a milder form. `StatsRow` is now a pure render: no `parseCounterValue`, no
`useAnimatedCount`, no `useInViewOnce`, and **no `'use client'`**, so it dropped to a server
component. Rendered check: the homepage paints `30,000+`, `150+`, `7-80+`, `45,000+` on the first
frame. The reasoning is a comment in the file so a future pass does not re-add it without first
proving no frame can assert something untrue.

### 1.2 An unlayered CSS rule silently overrides every transition utility in the app

`src/app/globals.css:1094-1098`:

```css
main a,
main button {
  transition-property: color, background-color, border-color, transform, box-shadow, opacity;
  transition-duration: 170ms;
  transition-timing-function: ease;
}
```

This block is unlayered, so it wins the cascade against Tailwind's `@layer utilities`. **Every
`duration-*` and `ease-*` class on any link or button inside `<main>` is dead.** All the
carefully-specified 200 ms / 300 ms hovers across the site collapse to 170 ms browser `ease`.

**Fix:** move it into `@layer base`, or delete it and let components specify. Either way the
per-component durations start working again — right now tuning them is a no-op.

**Fixed.** Wrapped in `@layer base` (kept inside the `prefers-reduced-motion: no-preference`
query), so Tailwind's `utilities` layer now wins. A comment marks it as load-bearing.

### 1.3 The `marketing-*` button variants render at 38 px instead of the designed 48 px

`src/components/ui/button.tsx:24-27` gives all four `marketing-*` variants `h-12`. But `size`
comes after `variant` in the cva object (:29-38), so `tailwind-merge` resolves the conflict in
favour of the size default `h-9`. Measured in-browser on the homepage:

```
marketing-dark  size=default  height 38px  hasH12: false  hasH9: true
marketing-sun   size=default  height 38px  hasH12: false  hasH9: true
```

So "Read non-profit status", "Explore exam preparation" and "Explore accommodation" are 38 px
tall — 10 px shorter than designed, below the 44 px touch minimum, and visually lighter than the
47 px buttons beside them for no semantic reason.

**Fix:** move the height into a size variant (`size="marketing"`), or add `h-12` via
`compoundVariants` so it wins. Also reconcile `componentTokenRules.button.height` in
`tokens.ts:136`, which declares `2.75rem` (44 px) — a height nothing on the page actually uses.

**Fixed.** Added `compoundVariants` to the cva — those are emitted after both `variant` and
`size`, so `h-12` now wins while an explicit `size` prop still overrides it. Measured after:
all three homepage marketing buttons render 51 px (`h-12` = 3 rem at the 17 px root). The
`button.height` token was replaced with a `heights` map mirroring the real cva ladder rather
than asserting a 44 px that nothing used; nothing consumed the old field.

### 1.4 The secondary navbar CTA is invisible on most desktops

`src/components/layout/navbar.tsx:542` — "Talk to Admissions" carries `2xl:inline-flex`, so it
only appears at ≥1536 px. At 1440 px it computes to `display: none`, height 0. The most common
desktop width never sees it. The same line hand-patches `h-11 rounded-xl border-slate-200`:
`rounded-xl` is the tier-2 content-box radius applied to a button, and `border-slate-200` is
stock Tailwind, not `--casa-sand`.

**Fixed** — and the first attempt was wrong, which is worth recording. Dropping straight to
`xl:inline-flex` (1280 px) **reintroduced horizontal page overflow**: measured `scrollWidth`
1342 against a 1280 viewport, i.e. exactly the overflow `MEMORY.md` §4 records as already fixed
once. The nav row's intrinsic width with this button is 1342 px, and 1366 fits it with *zero*
slack — too tight to trust, because the German label (`Beratung anfragen`, and a
`Zur Kursanmeldung` register CTA 46 px wider than the English one) was not what got measured.

Shipped as `min-[1400px]:inline-flex`. Verified at 1280 / 1366 (hidden, no overflow) and
1400 / 1440 (both CTAs visible, no overflow) in **both locales**. Also on that line:
`rounded-xl` → `rounded-lg` and `border-slate-200` → `border-[color:var(--casa-sand)]`.

The register CTA beside it lost its `shadow-lg shadow-[…]/20`, which was **dead code**:
`.casa-button-prism` is unlayered and sets its own `box-shadow`, so no Tailwind shadow utility
could ever reach it. Replacing dead code with a different dead utility would have been worse
than removing it — see §4.4 for the elevation that class actually applies.

### 1.5 Course detail renders the same five facts three times in one viewport

On `/courses/intensive-german`, within the first 1500 px:

1. `<aside>` "Course info" — a `<dl>`: Next start date / Duration / Lessons per week / Level range / Price
2. `<section id="course-summary">` — four tiles: Lessons per week / Level range / Next start date / Price
3. `<aside>` "Your decision" — a `<dl>` with **an identical `<dt>` list to #1**

Two `<dl>` elements with the same five terms, plus a four-tile strip repeating four of them.
`MEMORY.md` §"Public Pages Premium Refresh" says the hero rail and the body rail "are now meant
to serve different purposes" — they do not; they are the same component with a different heading.
The inner card also carries dead `lg:top-24 lg:static` (a `top` with `position: static`), and one
`<aside>` is nested inside another.

Also on that page: the price renders **`from 520.00 EUR`** three times. Those are
`numeric(10,2)` decimals straight from Postgres plus an ISO code. It should be `from €520`. The
level range uses a hyphen-minus with spaces (`A1 - C1`) rather than an en dash.

**Fix:** one facts surface per page. Keep the sticky decision rail; delete the hero rail and the
summary strip, or reduce the strip to the two facts the rail does not carry. Add a currency
formatter — this is a one-function fix that removes a data-dump look from every course page.

**Fixed.** The `#course-summary` tile strip is deleted (nothing linked to that anchor — checked
across `src/`, `e2e/` and `docs/`), and the sticky rail now carries only the two decision facts
(`price`, `next-start`) instead of repeating all five. Rendered after: hero rail = 5 rows, body
rail = `Price / Next start date`, no third surface. `formatCoursePrice` now goes through
`Intl.NumberFormat`, so the page reads **`from €520`** and `520.00` appears zero times.

That formatter also closes a fallback-vs-Neon gap: `default_price` is typed `number` but
Postgres returns `numeric(10,2)` as the **string** `"520.00"`, which is why the fixture-backed
tests passed on `from 520 EUR` while the live site rendered `from 520.00 EUR`. A new test locks
the string case. **Still open:** `CourseTypeRow.default_price` is typed `number` and is not
one at runtime in Neon mode — a latent type lie beyond this fix's scope.

### 1.6 The proof band renders one stat in a four-column grid

`src/components/sections/proof-band.tsx:38` filters `sourceType !== 'internal'`; :51 lays the
survivors out in `lg:grid-cols-4`. Of the four English metrics in `proof-metrics.ts`, only
`Since 1983` clears the filter. The homepage therefore shows a single stat with three empty
columns beside it — which is exactly what the rendered page looks like.

**Fix:** make the grid respond to the surviving count (`grid-cols-1` when one), or promote the
verified aggregates. Note `40+ staff & teachers` is correctly `verificationStatus: 'draft'` per
hard rule 1 — leave it.

**Fixed.** The grid's column count now follows the number of stats that survive the filter
(1 → a single `max-w-md` cell, 2 → 2 columns, 3 → 3, 4+ → the original 4). Rendered after:
`grid-template-columns: 476px`, one item, no stranded columns.

**Not fixed, needs your call.** `CLAUDE.md` hard rule 1 approves `30,000+ learners supported`
and `150+ countries represented` for public use, and `StatsRow` already publishes them on the
homepage — but `proof-band.tsx:38` filters them out because their `sourceType` is `internal`.
Two components disagree about whether the same approved figures are publishable. That is a
content-policy decision, not a UI one, so nothing was changed.

---

## Tier 2 — The biggest single lever: the design system does not reach the conversion funnel

> **✅ Complete 2026-08-16.** Default-palette drift is at **0** (was 515) and **a lint rule now
> holds it there**. Full record, the token mapping and the traps are in
> `docs/PARALLEL_AGENT_WORK_BOARD.md` → "Tier 2"; this section is the reasoning behind it. **Live status, per-file counts and the
> established mapping live in `docs/PARALLEL_AGENT_WORK_BOARD.md` → "Tier 2"** — that is the
> handover surface; this section is the reasoning behind it.

### 2.1 515 stock-Tailwind palette utilities, concentrated where people convert

```
slate 412 · rose 59 · emerald 22 · amber 13 · blue 6 · red 3   = 515
```

Distribution is the point:

| File | Count |
| --- | --- |
| `src/components/registration/course-wizard.tsx` | 82 |
| `src/components/registration/exam-wizard.tsx` | 77 |
| `src/components/layout/navbar.tsx` | 34 |
| `src/components/forms/contact-inquiry-form.tsx` | 34 |
| `src/components/calculator/casa-cost-pathway-calculator.tsx` | 30 |
| `src/components/layout/mobile-nav.tsx` | 25 |
| `src/components/layout/footer.tsx` | 19 |

That is the navbar, both registration wizards, the contact form, the cost calculator, the mobile
nav and the footer — **every surface between a visitor and a booking** — styled in Tailwind's
cold blue-grey ramp rather than CASA's deliberately warmed ink. It is visible: the registration
wizard's field background computes to `#f8fafc` (slate-50) and its border to slate-200.

`--casa-muted` was darkened to `#5b697e` specifically to clear AA on warm surfaces. Slate-500 is
`#64748b` — the value that was rejected. The site is running both.

**Fix:** this is the highest-value pass available. Do it file by file in funnel order —
navbar → contact form → course wizard → exam wizard → footer. Mechanical, low-risk, and it is
the change a visitor will feel without being able to name.

**Fixed — 515 → 0**, across 44 files. The whole funnel now renders in CASA tokens: navbar,
mobile-nav, header search popover, footer, contact form, both registration wizards, the
calculator, and the long tail.

It was **not** the mechanical find-and-replace it looked like. Three things had to be got right:

1. **Dark surfaces map differently.** `globals.css:397-403` selects on `bg-[var(--casa-ink-deep)]`
   to flip `--casa-text-subtle` to `#cbd5e1` — exactly the slate-300 the footer was using. So
   dark surfaces map to `--casa-text-subtle` and get the right value free; mapping them like a
   light surface would have inverted the contrast.
2. **Border weight is relative.** Flattening `slate-50/100/200` onto one hairline would have made
   faint dividers heavy, so they became `--casa-sand` at `/40`, `/70` and solid.
3. **The status ramp was incomplete.** It had only `-text` variants, so filled badges had nowhere
   to point. Added `--casa-success-surface` and `--casa-danger-surface`, both AA with white.

Verified by rendering, not just by build: 0 contrast failures on `/registration/course` (31 text
nodes), `/registration/exam` (32) and `/contact` (65), and 162 nodes checked on `/`.

**A lint rule now holds it.** `eslint.config.mjs` fails the build on any stock Tailwind colour
utility in `src/**` (both string and template literals; the four frozen routes exempt), with an
error message that names the replacement token. Verified to actually fire — a throwaway probe
file produced exit 1, the same file under a frozen route produced exit 0, and the real codebase
is clean. A rule that silently passes would be worse than no rule.

### 2.2 The shadcn semantic tokens were never rebranded

`src/app/globals.css:58-65`:

```css
--primary: oklch(0.205 0 0);      /* chroma 0 — pure neutral grey */
--secondary: oklch(0.97 0 0);
--accent: oklch(0.97 0 0);
```

Untouched shadcn defaults. So `<Button>` with no variant, and the 18 `variant="outline"`
buttons, render and hover in greyscale. Call sites work around it by hand-patching
`bg-[var(--casa-ink-deep)]` on every instance — visible in `navbar.tsx:547`.

**Fix:** point `--primary` / `--accent` / `--border` / `--input` / `--ring` at the CASA tokens.
The hand-patching at every call site then becomes deletable.

**Fixed.** All of them, plus `--background`/`--card`/`--popover` and their foregrounds, now point
at CASA values. **No file under `src/components/ui/` was edited** — every shadcn primitive
(button, input, select, textarea, checkbox, accordion, sheet, dropdown-menu) picked up the brand
at once. Contrast was measured before adopting, not eyeballed: white on `--primary` 17.74,
`--foreground` on white 17.85, `--muted-foreground` on white 5.58 (**up** from 4.54), on canvas
5.31, `--accent-foreground` on accent 16.22, white on `--destructive` 4.88.

Removing the now-redundant hand-patches at call sites is a separate, safe follow-up.

### 2.3 The two best pieces of the system reach 2 of ~30 routes

- **CEFR level ramp** (`--level-a1` → `--level-c1`, AA-measured per step, `levelKeyFromLabel()`):
  consumed by `klett-level-tests.tsx` and `level-progression-timeline.tsx` — both on
  `/placement-test`. Meanwhile **9 files render CEFR level labels**, including `/courses` and
  `/courses/[slug]`. On `/courses` the A1/A2/B1/B2/C1 filter chips are all identical grey.
- **Skill ramp** (`--skill-*`, shared verbatim with the student app): 1 consumer,
  `special-course-catalogue.tsx`, on one route.

This is finished, measured, documented design work sitting unused on the two highest-traffic
course surfaces. Applying it is the cheapest visible upgrade in this document.

**Fixed for levels.** Both surfaces now resolve through `levelKeyFromLabel()` → `levelTokens`.
The `/courses` filter chips take the label colour and border from the ramp when unselected, so
the row reads as a progression, and fill with `surface` + per-step `ink` when selected;
`course-level-goals.tsx` chips do the same. Measured after shipping: unselected 5.56–7.16 on
white, filled A1 14.56 / A2 11.72 / B1 8.27 (dark ink) and B2 4.84 / C1 7.16 (white ink) — the
crossover between B1+ and B2 behaves exactly as the ramp was built to.

**Not fixed for skills, deliberately.** `--skill-*` still has one consumer. Nothing on the course
surfaces carries a skill in structured data — `course-level-goals.tsx` practices are free-text
`narrative.outcomes` strings, so colouring them would mean inferring a skill from prose. Adding a
`skill` key to that content is a content-model change, not a component change.

### 2.4 Tokens with zero consumers

| Token | Consumers | Note |
| --- | --- | --- |
| `--shadow-primary` | 0 | added explicitly as "the cue that reads premium" |
| `--shadow-accent` | 0 | same |
| `--casa-surface-wash` | 0 | |
| `--casa-surface-subtle` | 2 | both are the definition + the TS mirror |
| `--casa-success/warning/danger/coral-text` | 0 | while 97 Tailwind rose/emerald/amber utilities ship |

**Fixed.** `--shadow-primary` and `--shadow-accent` are now the resting and hover elevation of
`.casa-button-prism` — the primary CTA, on 31 call sites — which also closes §4.4 for that class:
it had been carrying the pre-refactor cold-slate physics, and because it is *unlayered* it beat
any Tailwind shadow utility a call site passed. `.casa-card-surface` likewise moved to
`--casa-radius-feature` + `--shadow-card`. `--casa-surface-subtle` backs `--secondary`;
`--casa-surface-wash` became the form-field wash; `--casa-coral-text` picked up 10 consumers when
the raw-coral text uses were fixed (see below). `--casa-success-text` and a new
`--casa-success-surface` / `--casa-danger-surface` pair back the contact form's status states.
Still unused: `--casa-warning-text`, which the remaining T2-C files should pick up.

**Raw brand colour used as text** was a live AA failure, not just a token-hygiene issue: 14
places painted text in `--casa-coral` at **3.46:1**, including every required-field asterisk,
while the AA-safe `--casa-coral-text` (#b14629) sat unused. Ten text uses moved to the token.
Four were deliberately left raw — icon medallions and `logo-shapes.tsx` are non-text graphics,
where the threshold is 3:1, which 3.46 clears.

### 2.5 The old brand yellow is still in the codebase

`--casa-sun` was corrected `#fed500` → `#ffd500`. Six places still hardcode the old value:
`globals.css:500, 545, 551, 580, 623` (the `hero-grain` accent variants) and
`AssistantWidget.tsx:452`. Every hero on the site is tinted with the retired yellow.

**Fixed.** All six now read `color-mix(in srgb, var(--casa-sun) N%, transparent)`, so the value
is derived from the token and cannot drift again. `grep -rn 'fed500\|254, *213, *0' src/`
returns nothing.

---

## Tier 3 — There is no typography layer

> **✅ Complete 2026-08-16**, except the optional typeface change (T3-G), which is a user
> decision. Full record and the measurement traps are in
> `docs/PARALLEL_AGENT_WORK_BOARD.md` → "Tier 3".

`@theme inline` (globals.css:7-48) hands tokens to colour and radius and **nothing to type**. In
1,459 lines of `globals.css` there is one typographic rule (`text-wrap: balance`, :484). Type is
improvised per component.

### 3.1 Every heading on the site has `letter-spacing: normal`

Measured in-browser: homepage `<h1>` is **56.1 px with default tracking** on desktop, 37.1 px on
mobile. Site-wide there are 22 `tracking-tight` and **zero** negative arbitrary tracking values.

Plus Jakarta Sans is a geometric sans with sidebearings tuned for body sizes. At 56 px those
sidebearings read as gaps — the headline looks spaced-out rather than set. This is the single
most visible surface on every page and the cheapest fix in this document.

**Fix:** `--tracking-display: -0.02em` and `--tracking-heading: -0.01em` in `@theme inline`,
applied to h1 and to text-3xl+ headings.

**Fixed — and at the scale, not at call sites.** Tailwind v4 lets a size step carry its own
`--text-*--letter-spacing`, so tracking is now a property of the step and tightens progressively
as size grows (xl −0.006em → 6xl −0.025em). No component needed a `tracking-*` class.
Measured after: the homepage h1 is 51.2px at `-1.13px` tracking, and **0 of the site's headings
still compute `letter-spacing: normal`** (it was all of them). The values are tuned for Plus
Jakarta Sans and are commented as needing re-measurement if the typeface changes.

### 3.2 `leading-tight` is *looser* than the default at display sizes

Tailwind sets `--text-5xl--line-height: 1` and `--leading-tight: 1.25`. `globals.css` overrides
no `--text-*` values. So `text-5xl leading-tight` renders 51 px type on a 64 px line — 25%
looser than writing nothing. This pattern is on `hero-c-utility-rail.tsx:37` (course detail,
exams, exam detail, accommodation detail) and `hero-minimal-utility.tsx:36`, i.e. across the
conversion path, while home and about use `leading-[1.04]` / `leading-[1.08]` and look correct.

Five competing display leadings are in use: none (30), `leading-tight` (29), `leading-[1.08]`
(8), `leading-[1.1]` (2), `leading-[1.04]` (2).

**Fixed.** Each size step now carries its own `--text-*--line-height` (3xl 1.16 → 6xl 1.02), and
all **29** `leading-tight` occurrences on `text-3xl`+ elements were removed so the step applies.
The hand-tuned `leading-[1.04]`/`leading-[1.08]` on the live heroes went too — all five are now
governed by one system rather than three near-identical literals.

### 3.3 No scale, no fluid type, and h2/h3 collide

- **Zero `clamp()` in `src/`.** Headings jump hard at breakpoints and then sit frozen from
  640 px to 1440 px.
- **24 distinct font sizes**, 93 arbitrary `text-[…]` values. Seven sit inside one 0.65 rem
  window (`2.7rem`, `2.75rem`, `2.85rem` ×2, `2.9rem`, `2.95rem`, `3.3rem`, `3.35rem`) — mutually
  indistinguishable, and a guarantee no two pages agree.
- **Rank is unstable.** On the homepage, `<h2>` "The right course, exam path, and support in one
  plan" and `<h3>` "Find your level" both compute to **24.75 px**. A card title and a section
  heading render identically, while other h2s on the same page are 30.94 px.

**Fixed.** The display steps are now fluid `clamp()`, with maxima pinned to the previously
rendered sizes so nothing grows and no fixed-width container can overflow. The homepage ladder
measures **51.2 / 38.4 / 32 / 24 / 22 px** at 1440 and **33.1 / 26.5 / 24 / 22 / 17** at 375 —
properly stepped at both ends, with the h1 alone at the top. Two section h2s that had been sized
to the h1's own step (`md:text-5xl`) were moved down to `text-4xl`. Nine arbitrary `text-[…rem]`
values — six of them inside one 0.65rem window — were mapped onto scale steps.

**A regression this caught, worth recording:** setting `--text-2xl` to 1.625rem made it exactly
equal `--text-3xl`'s clamp *floor*, so at 375px a section h2 (26.5px) and a card title (26px)
collided again — the very bug being fixed, reintroduced at the small end of the fluid range.
Only visible by measuring at 375, not at 1440. `--text-2xl` is now 1.5rem, and the rule is to
keep one step of clearance below the 3xl floor.

### 3.4 No measure control

`max-w-prose`: 0 uses. `max-w-[…ch]`: 0 uses. Measured body paragraphs run at `max-width: none`
or 693–792 px — roughly **80–95 characters per line** at 16.5 px. Editorial copy holds 60–75.

**Fixed.** `--container-measure: 48ch` → `max-w-measure`, on 36 body paragraphs; headings left
unconstrained on purpose. **48ch rather than the conventional 65ch, because `ch` lies**: it is the
width of "0" (0.732em here) while the average lowercase character is 0.514em, so nominal ch
overstates real characters by ~1.42×. 62ch measured ~74 real chars *and did not bind at all* —
the grid column was narrower than the max-width, making the token a silent no-op I briefly
mistook for success. 48ch binds and lands 68 chars; 0 paragraphs now exceed 76.

### 3.5 Text at 10 px and 11 px

`text-[11px]` ×53, `text-[10px]` ×24, `text-[9px]` ×1. The registration wizard's step labels
("Course", "Goal and start", "Details", "Review", "Final check") are all 10 px. The contact
page's "Since 1983 independent language school in Bremen" proof line is 11 px.

**Fixed.** All 77 mapped to `text-xs` (12px), plus `text-[15px]` ×4 to `text-sm`. **Nothing on the
site renders text below 12px any more**, verified by walking the rendered DOM.

### 3.6 The root font size overrides the user's browser preference

`html { font-size: 16.5px }`, and `17px` at ≥1024 px (globals.css:456-466). Two consequences:

- A user who sets a larger default font size in their browser gets 16.5 px anyway. That is an
  accessibility regression, and it is the reason to change this even if the look is intended.
- **Nothing in the system is a round number.** `py-20` is 85 px, not 80. `text-xs` is 12.375 px.
  `h-20` is 85 px. Every value a designer specifies arrives 3–6% larger, and the whole spacing
  scale sits off the pixel grid.

**Fix:** move to `font-size: 100%` and express the intended size bump as a body-level `rem`
value, so user preference is respected and the scale lands on round numbers.

**Fixed.** The root is `100%`, so it follows the visitor's own browser setting, and rem-based
spacing is back on a 16px grid — `py-20` is 80px again, not 85px. **The reading size was not
lost:** `--text-base` is re-based to 1.0625rem, so body copy still measures 17px while everything
scales with user preference. Verified rendered: root 16px, body copy 17px.

### 3.7 Eyebrow typography has 22 signatures

189 uppercase eyebrows. Tracking is `[0.12em]` ×170, `[0.1em]` ×16, `[0.08em]` ×10, plus one-offs
at `[0.2em]`, `[0.13em]`, `[0.11em]`, and one `tracking-widest`. On the course detail page the
same visual role uses `[0.1em]` in the asides and `[0.12em]` in the summary tiles. 59 eyebrows are
`font-bold` — the same weight as the heading beneath them, against the documented ladder.

**Fixed.** 198 tracking values collapsed onto one `--tracking-eyebrow: 0.12em` token, and 53
uppercase `font-bold` moved to `font-semibold` per the ladder. The homepage now renders **2**
eyebrow signatures (12px and 14px, both w600 at 0.12em) instead of 22 — a scale rather than drift.
Contrast was re-checked afterwards, since weight affects the large-text threshold: 0 failures.

---

## Tier 4 — Restraint: remove the ornament

> **🚧 2026-08-16.** §4.1, §4.2 and §4.4 are **done**; §4.3 was **largely wrong** and is corrected
> below; §4.5 is deliberately not done — see its note.

This is the tier that most changes whether the site reads as "premium" or as "template".

### 4.1 The red/yellow/blue triad fires about 28 times

- `casa-tricolor-rule` — **25 uses**
- Two hard-stop three-colour flag-stripe gradients (e.g. `stats-row.tsx:200`, cutting at exactly
  34% / 68%)
- Per-item accent ticks cycling blue → sun → red → white (`stats-row.tsx:230-233`)
- **Three dots — red, yellow, blue — at `left-5 top-5` of the hero photograph**
  (`heroes/shared.tsx:96-100`), which on a rounded rectangle read as macOS window traffic lights

Using all three brand colours simultaneously is the most reliable way a site stops looking
premium. Confident brands use one accent per surface and let the others appear as punctuation.

**Fix:** keep the triad for the logo and nothing else. Replace `casa-tricolor-rule` with a single
`--casa-blue` rule. Delete the traffic-light dots.

**Fixed — the triad now appears only in the logo.** `.casa-tricolor-rule` keeps its name (so all
25 call sites needed no edit) but draws a single `--casa-blue` fade. The stats band's hard-stop
34%/68% flag stripe became one faded accent, and its per-item ticks stopped cycling
blue → sun → red → white, which had been implying a category difference between stats that have
none. The hero traffic-light dots are gone. Verified: **0 places in shipping code now render
`--casa-red` alongside `--casa-sun`/`--casa-blue`.**

### 4.2 The hero photograph carries four unrelated decorations

`heroes/shared.tsx:93-101` stacks, on one image: a 45°-rotated bordered square, a hairline rule,
the three traffic-light dots, and a tricolour rule. Plus a six-layer decorative overlay on photos
generally (a three-hue tint at 60% and a screen-blended "prismatic streak").

The photography is real CASA classroom work. It is being covered up.

**Fixed.** All four decorations are removed from `HeroPhotoCard`. The bigger change is
`.casa-media-overlay::before`, which applies to **25 photo surfaces**: it had been three stacked
layers at **0.6 opacity** — an ink-to-blue diagonal, a blue radial and a sun radial — so every
photograph on the site carried a blue-and-yellow colour cast *and* the brand triad returned
through the back door. It is now one neutral ink gradient at 0.28, weighted to the corner where
captions and badges sit: a legibility scrim rather than a colour wash. The photo library is
ungraded (a 175-point luminance spread), and the heavy tint had been papering over that rather
than fixing it.

### 4.3 Dead decorative CSS still shipping

> **⚠️ This finding was mostly wrong and is corrected here (2026-08-16).**

The original table listed six dead classes. Re-checked properly: **four of the six were live.**
`casa-card-grid`, `casa-card-spark` and `casa-button-edge` are not class names at all — they are
*keyframe-name prefixes*, and grepping for them as classes returned 0 while the animations were
firing perfectly well on pseudo-elements of classes that are used heavily:

| Keyframe | Fires on | Uses of that class |
| --- | --- | --- |
| `casa-media-overlay-breathe` | `.casa-media-overlay::before` | 25 |
| `casa-media-prismatic-sweep` | `.casa-media-overlay::after` | 25 |
| `casa-card-grid-shift` | `.casa-media-overlay-card::before` | 7 |
| `casa-card-spark-sweep` | `.casa-media-overlay-card::after` | 7 |
| `casa-button-edge-trace` | `.casa-button-prism::after` | 32 |
| `casa-button-outline-trace` | `.casa-button-outline::after` | 20 |

Deleting them would have removed working hover behaviour from every photo and every primary
button. **Genuinely dead, and now deleted: `.matt-shadow` and `.japanese-fade`** (0 consumers
each; `.matt-shadow` also used pure black, which `tokens.ts:100` forbids).

`casa-soft-rise` remains a real problem, but a documentation one: it has no definition in
`globals.css` and no consumers, yet `UI_SYSTEM.md` still documents it as the page section
entrance animation. The live mechanism is `casa-reveal-init` + `is-visible`. **`UI_SYSTEM.md`
needs that correction.**

Lesson: a grep for a *class* name does not prove a *keyframe* is unreachable. Trace the animation
to its selector.

### 4.4 A pocket of the pre-refactor elevation survived

`.casa-card-surface` (globals.css:781-786), used 9 times on `/news` and `/resources`:

```css
border-radius: 1.5rem;                              /* 24px — not a step on the 3-tier scale */
box-shadow: 0 20px 42px -34px rgba(15, 23, 42, 0.34);  /* negative spread, 0.34, cold slate ink */
```

That is exactly the shadow physics the elevation refactor replaced (`MEMORY.md` §18: no negative
spread, 0.04–0.16, warmer `rgba(36,51,59,…)`). Those pages still look tighter and colder than the
rest of the site.

**`.casa-button-prism` is the same story and matters more** (globals.css:842-845): the primary
CTA, on 31 call sites, carries `0 10px 24px -18px rgba(15,23,42,0.66)` — negative spread, 0.66
opacity, cold slate. Because the class is *unlayered* it also beats any Tailwind shadow utility,
so the `shadow-lg shadow-[…]/20` the navbar used to pass it was dead code (removed 2026-08-16).
Repainting it is a one-line change to `globals.css` but repaints the primary CTA everywhere, so
it wants its own visual check — and it is the natural first consumer of `--shadow-primary` (§2.4).

### 4.5 71 of 86 elevated white cards carry both a hairline and a shadow

The canvas tint (`--casa-canvas: #f6fafb`) was introduced so white cards could separate by
contrast instead of needing a border. The follow-up border-removal pass never happened
(`docs/PARALLEL_AGENT_WORK_BOARD.md` U1b records this as still open). Border + shadow on the same
white card is a classic non-premium tell.

**Deliberately not done, with measurements to make the next attempt cheap.** A naive sweep is
wrong here. Probing the rendered homepage: 23 white elements carry both a border/ring and a
shadow, but most are **buttons and icon medallions**, where the pairing is correct. Filtering to
real content surfaces (>220×110px, not inside a button) leaves **13 cards, 11 of them on the
tinted canvas** — those are the genuine targets, mostly the course cards, which separate via
`ring-1` rather than `border`.

In source there are **21 `ring-1` + shadow-token** and **63 `border` + shadow-token on `bg-white`**
occurrences. Whether each should lose its outline depends on whether it sits on `--casa-canvas`
(where the shadow alone separates it) or on a white section (where it does not), and that cannot
be determined statically. Do this per component, on the canvas cases first, and check each
rendered.

---

## Tier 5 — Consolidation

### 5.1 Sixteen hero components across three directories, two parallel engines

| System | Components | Serves |
| --- | --- | --- |
| `src/components/heroes/` | 9 | `/`, `/about`, `/courses`, `/courses/[slug]`, `/exams`, `/exams/[code]`, `/accommodation`, `/accommodation/*`, `/team`, `/contact`, `/faq`, `/search`, `/careers`, `/placement-test`, `/ueber-uns/gemeinnuetzigkeit` |
| `src/components/patterns/hero/` (A–F + renderer) | 8 | `/news` and `/news/[slug]` only, via `PageHero` |
| `src/components/marketing/hero/page-hero.tsx` | 1 | the bridge to the above |

**Two are exported but never rendered anywhere:** `HeroIndexChooser` and `HeroDetailUtility`.
(`HeroHomePhoto` and `HeroMinimalUtility` *are* live — `HeroAPhotoLed` and `HeroEMinimal` are
thin wrappers around them, which is where the five real `<h1>` implementations live.) Two routes
get an entire second six-archetype hero engine. Confusingly, the frozen `patterns/hero/*` components *do* carry `tracking-tight`, so the
dead system's headlines are set better than the live one's.

**Fix:** one hero with four documented variants (photo-led, editorial, utility-rail, gallery);
port `/news` onto it; delete the rest.

### 5.2 No Card, Badge, Tabs, IconTile, FieldError or Skeleton primitives

`src/components/ui/` has 14 files and none of these. The consequences, counted:

- **77 open-coded card shells in 39 distinct visual signatures.** The same card gets
  `shadow-card` in `app/` and `shadow-soft` in `signatures/`.
- **36 badges/pills in 28 distinct signatures across 24 files.**
- **7 unrelated filter-chip / tab implementations** with three different selected-state colour
  languages. Visible on `/courses`, where the hero rail's pill chips and the "Fast route finder"
  boxes are two different selection designs on one screen.
- **30 icon medallions in 20 signatures**, six sizes and three radii.
- **38 raw rose/red error strings** and zero uses of `--casa-danger-text`.

### 5.3 The button primitive carries 12 variants; 3 are unused

`destructive`, `secondary`, `link`: **0 uses.** `marketing-outline`, `marketing-light`: 1 use
each. Meanwhile three button heights (38 / 44 / 47 px) and two shapes (`rounded-lg` 10 px vs
`rounded-full` pill) appear on the homepage simultaneously.

### 5.4 Heroes are sized in `vh`, so taller monitors get emptier pages

`HeroSurface` (`heroes/shared.tsx:38-46`) sets `min-h-[40vh]`–`min-h-[58vh]` by archetype.
Measured on `/contact` at a 1500 px viewport: hero is **690 px tall containing 297 px of content
— 393 px, 57%, is empty.** The homepage hero is 618 px at a 900 px viewport and 1160 px at
2000 px. The bigger the display, the more the page looks unfinished.

**Fix:** size heroes by content plus a fixed padding step. Reserve `vh` for a deliberate
full-bleed hero, if you want one at all.

### 5.5 One section rhythm, repeated

Homepage sections compute to 85 px top *and* bottom padding on six of nine, 68 px on two.
`usage-rules.ts:126` mandates a single section padding, so this is by construction. **There are
no spacing tokens at all** — space is the only design dimension in this codebase with no system.
Eight different grid gutters are in use; the homepage alone uses three for card rows of identical
role. Stacked panels use different internal insets, so the text left edge zig-zags down the page.

A page with one rhythm has no composition. Related sections should cluster tighter; a topic
change should get a bigger break.

### 5.6 `/courses` asks the same three questions twice

The hero rail's "Course finder" (level / schedule / goal chips → "Filter courses") is immediately
followed by "Fast route finder — 3 questions to find your best course path" (main goal / preferred
schedule / current level → "Open path"). Same three inputs, two control designs, back to back.

---

## Tier 6 — Interaction polish

- **Cards lift on hover but never gain shadow.** 12 of 13 hover-lift cards change no elevation, so
  the translate has nothing selling it. With 159 shadow-token usages available, this is free.
- **Nav dropdowns cannot animate.** `navbar.tsx:377-378` sets the closed state to `hidden`
  (`display: none`), so the declared `transition-[opacity,transform] duration-200` never runs.
  The primary navigation pops.
- **Essentially no pressed states** — 4 `active:` variants in the whole codebase.
- **Scroll reveal fades whole sections as monolithic blocks.** One homepage section is 2,023 px
  tall and fades in as a single object; there is no child stagger anywhere. `--reveal-delay`
  staggers *sections*, not cards.
- **Four visible transitions animate layout properties** (`width`, `max-height`) rather than
  transform — including both registration progress bars.
- **Focus rings use six different recipes** and are removed outright on the logo link and the
  search input.
- **31 interactive targets under 44 px** on the homepage. Footer links are 19 px tall (16 of
  them); carousel arrows are 38 × 38. `MEMORY.md` §15 flagged these in August and they are
  unchanged.
- **`prefers-reduced-motion` has a gap**: `tw-animate-css` / Radix animations are a second,
  ungoverned motion system that ignores it.

## Media

- **No aspect-ratio system.** 18 media frames, 14 using fixed pixel heights; crops range 0.8:1 to
  2.03:1. Five distinct rendered ratios on the homepage alone (2.39, 1.78, 1.74, 1.50, 1.33).
- **The photo library is ungraded** — a 175-point luminance spread and 160-point warmth spread
  across 41 assets, dropped into identical frames.
- **Seven different text-on-image scrim recipes**, three base colours, photo opacity knocked to
  90% / 48% / 100% in different places.
- **No blur-up placeholder on any photo**, and eight different backing colours, so images pop in
  from cream, white or near-black depending on the section.
- **The icon adapter discards `strokeWidth`** (`streamline-lucide-adapter.tsx:504, 512` —
  destructured as `_strokeWidth` then `void`ed), so stroke weight scales with icon size and large
  icons look heavier than small ones.
- **The logo contains two different blacks**, and the white variant is produced with a CSS filter
  rather than a real asset.

---

## Suggested order of work

Each row is independently shippable.

| # | Work | Effort | What a visitor notices |
| --- | --- | --- | --- |
| ~~1~~ | ~~Kill the range counter (1.1); fix the transition override (1.2); fix `marketing-*` height (1.3)~~ | S | ✅ **Done 2026-08-16** |
| ~~3~~ | ~~Currency formatter; collapse the triple facts rail on course detail~~ | S | ✅ **Done 2026-08-16** (with 1.4 and 1.6) |
| 2 | Add `--tracking-display` / `--tracking-heading`; remove `leading-tight` above text-3xl | S | Every headline on the site looks set rather than spaced |
| 4 | Remove the tricolour ornament and the hero stickers (4.1, 4.2) | S | Immediately calmer and more confident |
| 5 | Rebrand the shadcn tokens (2.2), then sweep slate → CASA tokens in funnel order (2.1) | L | The booking path finally looks like the same brand |
| 6 | Apply the level and skill ramps to `/courses` and `/courses/[slug]` (2.3) | M | Courses become scannable by level at a glance |
| 7 | Extract `Card`, `Badge`, `IconTile`, `FieldError`; delete dead button variants | M | Consistency everywhere, and future drift stops |
| 8 | Spacing scale + section rhythm; drop `vh` hero minimums | M | Pages gain composition; empty heroes fill in |
| 9 | Type scale with `clamp()`; root back to 100%; measure control | M | Type tunes to the window instead of jumping |
| 10 | Consolidate 16 heroes to one with four variants | L | Nothing — it makes 1–9 stick |

## Corrections to the review fleet's own claims

Recorded because the adversarial verification pass never ran, and these did not survive hand-checking:

1. **"Zero `active:` variants in the entire codebase"** — there are **4**. The substantive point
   (no pressed-state system) stands; the count did not.
2. ~~**"The homepage h1 is in `hero-home-photo.tsx:36`"** — the homepage renders `HeroAPhotoLed`.~~
   **This "correction" was itself wrong, and is withdrawn (2026-08-16).** `HeroAPhotoLed` is a
   thin wrapper that renders `HeroHomePhoto`; likewise `HeroEMinimal` wraps `HeroMinimalUtility`.
   My grep looked for `<HeroHomePhoto` under `src/app` only, so it missed the sibling wrapper in
   `src/components/heroes/`. The agent's file citation was correct. Verified by grepping both
   directories: **only `hero-index-chooser.tsx` and `hero-detail-utility.tsx` are truly dead**,
   not four. §5.1's count is corrected accordingly.
3. **"34 bilingual photo captions authored, zero rendered"** — `grep photoCaption src/config`
   returns 0. Captions exist on testimonial cards as empty strings. Not reproduced; dropped.
