# Parallel Agent Work Board

Last updated: 2026-08-16

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

## 🎨 Tier 2 — Make the design system reach the whole site ✅ **complete 2026-08-16**

**Why:** `docs/PREMIUM_UI_REVIEW_2026-08-16.md` §2. The token system was good and did not reach
the site. **All units are done.** Kept here as the record of what was changed and the mapping to
reuse. Tier 1 is also complete. **Next up is Tier 3 (typography), which has no board entries yet.**

**Status board.** Update the row when you finish a unit, and keep the review doc's `**Fixed.**`
notes in sync — those two files are how the next agent knows where things stand.

| Unit | What | Status |
| --- | --- | --- |
| T2-A | Stale `#fed500` brand yellow | ✅ done 2026-08-16 |
| T2-B | Rebrand the shadcn semantic tokens | ✅ done 2026-08-16 |
| T2-D | Wire or delete the zero-consumer tokens | ✅ done 2026-08-16 |
| T2-C1 | Slate sweep · navbar + mobile-nav + footer | ✅ done 2026-08-16 |
| T2-C2 | Slate sweep · contact form | ✅ done 2026-08-16 |
| T2-C3 | Slate sweep · course-wizard | ✅ done 2026-08-16 |
| T2-C4 | Slate sweep · exam-wizard | ✅ done 2026-08-16 |
| T2-C5 | Slate sweep · calculator + the long tail | ✅ done 2026-08-16 |
| T2-E | Level + skill ramps on `/courses` and `/courses/[slug]` | ✅ done 2026-08-16 |

**Baseline for every unit:** `npm run lint && npm run typecheck && npm run test && npm run build
&& npm run knip`, plus `npm run test:e2e` for anything touching navbar, footer or a routed flow.
Currently green at **74 unit tests / 10 e2e**.

**A second `next dev` cannot run** while another session holds `.next/dev/lock`. If Playwright
reports it cannot acquire the lock, stop the preview server first.

### T2-A · Stale brand yellow ✅
**Owns:** `src/app/globals.css` (hero-grain blocks), `src/components/assistant/AssistantWidget.tsx`

`--casa-sun` was corrected `#fed500` → `#ffd500` in pass 16, but six hardcoded `rgba(254, 213, 0, …)`
literals survived: `globals.css:500, 545, 551, 580, 623` (the `hero-grain` accent variants) and
`AssistantWidget.tsx:452`. Every hero on the site was tinted with the retired yellow.

**Done.** All six now read `color-mix(in srgb, var(--casa-sun) N%, transparent)`, so the value
cannot drift from the token again. `grep -rn 'fed500\|254, *213, *0' src/` returns nothing.

### T2-B · Rebrand the shadcn semantic tokens ✅
**Owns:** the `:root` and `.dark` blocks of `src/app/globals.css`
**Must not touch:** `src/components/ui/*` (the point is that they need no edits)

`--primary`/`--secondary`/`--accent`/`--border`/`--input`/`--ring` were untouched shadcn
greyscale (`oklch(… 0 0)`, chroma 0). Every shadcn primitive — button, input, select, textarea,
checkbox, accordion, sheet, dropdown-menu — rendered off-palette, which is *why* call sites
hand-patch `bg-[var(--casa-ink-deep)]`.

**Blast radius is contained to `src/components/ui/*`** (24 uses in button, 23 dropdown-menu, 15
select, 9 input, 6 textarea, 5 sheet, 4 checkbox, 3 accordion) **plus `globals.css:469**, which
applies `border-border` to `*` — so `--border` is the default border colour of every element on
the site. Verify contrast after changing it, do not eyeball it.

**Done.** `--primary` → `--casa-ink-deep`, `--secondary` → `--casa-surface-subtle`, `--muted` →
`--casa-canvas`, `--muted-foreground` → `--casa-muted`, `--accent` → `--casa-warm-soft`,
`--destructive` → `--casa-red`, `--border`/`--input` → `--casa-sand`, `--ring` → `--casa-blue`,
plus `--background`/`--card`/`--popover` → `--casa-bg` and their foregrounds → `--casa-ink`.
**No `src/components/ui/*` file was edited** — that was the point.

Contrast measured before adopting: white on `--primary` 17.74, `--foreground` on white 17.85,
`--muted-foreground` on white 5.58 (up from 4.54), on canvas 5.31, on `--casa-surface-subtle`
5.02, `--accent-foreground` on accent 16.22, white on `--destructive` 4.88. A rendered
canvas-compositing probe on `/registration/course` then found **0 regressions** (31 text nodes
checked); the only 3 failures were pre-existing raw-coral asterisks, fixed in the same pass —
see below.

**Raw `--casa-coral` used as text** was 14 places at 3.46:1, while the AA-safe
`--casa-coral-text` (#b14629) had zero consumers. Ten text uses moved to the token
(contact form asterisks ×4, both wizards' `requiredMarkClassName` + eyebrow, both proof strips'
"Draft" label). Four were left raw **on purpose** — icon medallions and `logo-shapes.tsx` are
non-text graphics, where the threshold is 3:1, which 3.46 clears.

### T2-C · Slate → CASA token sweep ✅ **complete — 515 → 0**
**Verify per file:** build + a rendered check of that surface at 375 and 1440.

**Why it mattered:** slate is a *cold* ramp. `--casa-muted` was deliberately darkened to
`#5b697e` to clear AA on warm surfaces, and slate-500 `#64748b` is the exact value that was
rejected — so running both meant the site was two colour systems at once, and the cold one owned
the entire booking path.

Swept in conversion order, each file independently shippable.

| File | slate count | Unit |
| --- | --- | --- |
| `src/components/layout/*` (navbar, mobile-nav, footer, search popover) | 80 | T2-C1 ✅ |
| `src/components/forms/contact-inquiry-form.tsx` | 34 | T2-C2 ✅ |
| `src/components/registration/course-wizard.tsx` | 88 | T2-C3 ✅ |
| `src/components/registration/exam-wizard.tsx` | 83 | T2-C4 ✅ |
| `src/components/calculator/…` + 40 more files | the remainder | T2-C5 ✅ |

**Done: 515 → 0 default-palette utilities in shipping code.** 44 files swept. Re-check with:

```
FROZEN='src/app/design-system|src/app/design-alternatives|src/app/landing-page-alt|src/app/homepage-reorganized'
grep -rnoE "\b(bg|text|border|ring|from|to|via|divide|fill|stroke|placeholder|outline|shadow)-(slate|gray|zinc|neutral|emerald|amber|sky|blue|rose|red|green)-[0-9]{2,3}" src/app src/components | grep -vE "^($FROZEN)" | wc -l
```

**✅ A lint rule now holds the zero.** `eslint.config.mjs` adds `no-restricted-syntax` rules that
fail the build on any stock Tailwind colour utility (22 palettes × 17 utilities, with variant
prefixes and `/alpha`) in `src/**`, matching both string literals and template literals. The four
frozen routes are exempt. The error message names the replacement token and the dark-surface rule.

**Verified to actually fire**, the same way the knip ignore was: a throwaway file using
`text-slate-600`, `border-emerald-200/90`, `hover:bg-blue-50` and a template-literal `bg-rose-50`
produced 2 errors and exit 1; the same file under `src/app/design-system/` produced exit 0; the
real codebase is clean. A rule that silently passes would be worse than no rule.

**The mapping used** — keep it if you add new surfaces:

| Tailwind | CASA token |
| --- | --- |
| `slate-50` | `--casa-surface-wash` (field wash) / `--casa-canvas` (hover) |
| `slate-100` | `--casa-surface-subtle` |
| `slate-200`/`300` | `--casa-sand` |
| `slate-100` as border | `--casa-sand`/70 · `slate-50` as border → `/40` |
| `slate-400` | `--casa-text-subtle`, or `--casa-muted` for form-control borders |
| `slate-500`/`600` | `--casa-muted` |
| `slate-700`–`950` | `--casa-ink` · scrims → `--casa-ink`/60 |
| `rose-*`/`red-*` | `--casa-danger-text` (text) · `--casa-danger-surface` (fill/border/ring) |
| `emerald-*` | `--casa-success-text` · `--casa-success-surface` |
| `amber-*` | `--casa-warning-text` · `--casa-gold-deep` at an alpha step |
| `blue-*` | `--casa-blue` at an alpha step · `--casa-ink` for near-black blues |

**Two rules the first two units established the hard way:**

1. **Check whether the surface is dark before mapping.** The footer is
   `bg-[var(--casa-ink-deep)]`, and `globals.css:397-403` selects on exactly that class to flip
   `--casa-text-subtle` to `--casa-subtle-on-dark` (#cbd5e1) — which *is* the slate-300 the
   footer was using. So dark surfaces map `text-slate-300` → `text-[var(--casa-text-subtle)]`
   and get the right value for free. Mapping it to `--casa-muted` like a light surface would
   have inverted the contrast. Dark-surface hairlines become `border-white/10` (structural) or
   `border-white/25` (interactive), reusing the values already used on dark sections.
2. **Border weight is relative, so preserve it with alpha** rather than flattening three
   Tailwind steps onto one token: `slate-200` → solid `--casa-sand`, `slate-100` → `/70`,
   `slate-50` → `/40`.

**Status colours** (`rose-*`, `emerald-*`) now have a full ramp. T2-C2 added
`--casa-success-surface` (#107837) and `--casa-danger-surface` to `globals.css`, because the
scale only had `-text` variants and a filled success badge had nowhere to point — it had shipped
as `emerald-600`, which carries white text at just 3.30:1. The new surfaces clear 4.5:1 with
white (5.58 and 4.88). Map filled chips to `--casa-*-surface`, label text to `--casa-*-text`,
and tinted borders/backgrounds to `--casa-*-surface` at an alpha step.

**Verify contrast by rendering, and beware the obvious probe bug.** A canvas-compositing probe
that fills white before sampling reads every *transparent* ancestor back as opaque white and
terminates the walk there — it scored correct 11.95:1 footer links as 1.48:1. Use
`clearRect` before setting `fillStyle`. The probe is also blind to gradient backgrounds
(`.casa-button-prism` sets `background`, not `background-color`), so white-on-gradient CTAs will
always show as false failures. After that fix: **0 real failures** on `/contact`,
`/registration/course` (31 nodes), `/registration/exam` (32 nodes), and 162 nodes on `/`.

**Three latent bugs the sweep surfaced**, all fixed:

- `exam-wizard.tsx:530` had **`text-blue-955`**, which is not a real Tailwind class — that text
  had never had a colour applied and was silently inheriting. Confirmed pre-existing via
  `git diff`, not introduced by the sweep.
- `checkbox.tsx` used `border-slate-400` for the unchecked box. On white that is **2.56:1**, which
  fails the 3:1 WCAG 1.4.11 minimum for a form-control boundary. Now `--casa-muted` (5.58:1).
- `page.tsx:577` used `text-white/45` for the "01"/"02" card index on the dark exam panel —
  measured **4.26:1** at 11px, under AA. Now `/60`.

**Left raw on purpose:** `logo-shapes.tsx` and the icon medallions in the wizards and
`/placement-test` keep `--casa-coral`. They are non-text graphics, where the threshold is 3:1,
which 3.46 clears. `course-level-goals.tsx:105` is a **CEFR level chip** that was `bg-amber-700`;
it is now `--casa-accent-surface` (white text 5.56:1) as an interim, but it should take the level
ramp — **that one is a T2-E target.**

### T2-D · Zero-consumer tokens ✅
**Owns:** `src/app/globals.css`

`--shadow-primary`, `--shadow-accent`, `--casa-surface-wash` and the four `--casa-*-text` status
tokens have no consumers. Either wire them or delete them — a token nothing uses is a claim the
system does not keep. Also closes review doc §4.4: `.casa-button-prism` and
`.casa-card-surface` are **unlayered**, so they beat any Tailwind shadow utility, and both still
carried the pre-refactor cold-slate physics (negative spread, 0.34–0.66 opacity) that pass 18
replaced everywhere else.

**Done.** `.casa-button-prism` resting elevation is now `var(--shadow-card), var(--shadow-primary),`
plus the inset highlight, and its hover is `var(--shadow-modal), var(--shadow-accent),` plus the
blue ring — so the coloured-elevation tokens finally have consumers, on the primary CTA's 31 call
sites. `.casa-card-surface` moved to `var(--casa-radius-feature)` (22px, on-scale) and
`var(--shadow-card)`. Verified rendered: the CTA computes
`rgba(36,51,59,.04) 0 2px 4px, rgba(36,51,59,.08) 0 10px 28px, rgba(0,159,227,.2) 0 12px 28px, inset …`
— no cold slate, no negative spread.

**Still zero consumers:** `--casa-surface-wash` (#fbfdfd), `--casa-danger-text`,
`--casa-success-text`, `--casa-warning-text`. Those belong to the T2-C sweep — the form field
background wants `--casa-surface-wash`, and the rose/emerald error and success strings want the
status text tokens. Wire them there rather than inventing a use here.

### T2-E · Level + skill ramps on the course surfaces ✅
**Owns:** `src/components/sections/quick-chooser-panel.tsx`,
`src/components/signatures/course-level-goals.tsx`

The CEFR ramp is AA-measured per step and reached **2 components, both on `/placement-test`**,
while 9 files render level labels. On `/courses` the A1/A2/B1/B2/C1 filter chips were all
identical grey, and `course-level-goals.tsx` painted every level one flat colour — throwing away
the ordering the ramp exists to show.

**Done.** Both now go through `levelKeyFromLabel()` → `levelTokens[key]`:

- **`/courses` filter chips.** Unselected chips take `token.text` for the label and
  `token.surface` for the border, so the row reads as a progression (A1 `#daeafa` → C1 `#005c90`).
  Selected chips fill with `token.surface` + `token.ink`. Non-level fields (Schedule, Goal) and
  the "All" option stay neutral — `levelKeyFromLabel` returns null and the helper bails.
- **`/courses/[slug]` level chips** in `course-level-goals.tsx`, both the Netzwerk and Kontext
  lists.

**`ink` is stored per step, never assumed white** — the ramp crosses over between B1+ and B2.
Measured in the browser after shipping: unselected chips 5.56–7.16 on white; filled chips
A1 14.56 / A2 11.72 / B1 8.27 (dark ink) and B2 4.84 / C1 7.16 (white ink). B2 at 4.84 is the
tightest and is exactly why that step was deepened to L\*47 when the ramp was built.

**Colour never signals alone:** every chip's label *is* the level.

**Not done — the skill ramp.** `--skill-*` still has one consumer
(`special-course-catalogue.tsx`). There is nothing on the course surfaces to attach it to:
`course-level-goals.tsx` practices are free-text `narrative.outcomes` strings, so colouring them
means inferring a skill from prose. Giving those entries a `skill` key is a **content-model**
change, not a component change — same conclusion the old U2 entry reached.

---

## ✍️ Tier 3 — Typography ✅ **A–F complete 2026-08-16** (T3-G is a user decision)

**Why:** `docs/PREMIUM_UI_REVIEW_2026-08-16.md` §3. The site had a mature colour/shape system and
**no typography layer at all**. Read §3 before picking anything up here.

| Unit | What | Status |
| --- | --- | --- |
| T3-A | Root font-size back to `100%` | ✅ done 2026-08-16 |
| T3-B | Type scale: fluid `clamp()` steps, per-step leading + tracking | ✅ done 2026-08-16 |
| T3-C | Strip `leading-tight` from display headings | ✅ done 2026-08-16 |
| T3-D | Map arbitrary `text-[…rem]` onto the scale | ✅ done 2026-08-16 |
| T3-E | Measure control (§3.4) | ✅ done 2026-08-16 |
| T3-F | Eyebrow consistency (§3.7) + sub-12px text (§3.5) | ✅ done 2026-08-16 |
| T3-G | Optional: Source Serif 4 as a display face | ⏳ user decision pending |

**Done (A–D).** The scale lives in the `@theme inline` block at the top of `src/app/globals.css`.
The key idea: **Tailwind v4 lets a size step carry its own `--text-*--line-height` and
`--text-*--letter-spacing`**, so leading and optical tracking are properties of the step, not
something 400 call sites have to remember. Nothing needed a `tracking-*` class.

- Root is `100%` — respects the visitor's browser font-size setting, and rem spacing is back on a
  16px grid (`py-20` = 80px, not 85px). `--text-base` re-based to 1.0625rem so copy still renders
  17px.
- Display steps are fluid, **maxima pinned to the previously rendered sizes** so nothing grows and
  no fixed-width container can overflow.
- All 29 `leading-tight` occurrences on `text-3xl`+ removed (it is 1.25 — *looser* than the steps).
- Nine arbitrary `text-[…rem]` values mapped onto steps.
- Two section `h2`s were sized to the h1's own step (`md:text-5xl`) and moved down.

**Two traps for whoever continues:**

1. **Keep one step of clearance below `--text-3xl`'s clamp floor.** Setting `--text-2xl` to
   1.625rem made it exactly equal that floor, so at 375px a section h2 (26.5px) and a card title
   (26px) collided — reintroducing the exact bug the scale exists to fix, at the small end of the
   fluid range. **Invisible at 1440; only measuring at 375 caught it.** Always check both ends.
2. **An explicit `leading-*` beats the step.** `leading-tight` must not appear above `text-2xl`.

**Tracking values are tuned for Plus Jakarta Sans** and must be re-measured if T3-G changes the
typeface.

**Verify:** measure, do not eyeball. In the browser:
`[...document.querySelectorAll('h1,h2,h3')]` grouped by computed `fontSize`, at **both 375 and
1440**, plus a check that no heading computes `letter-spacing: normal`.

### T3-E · Measure control ✅
**Owns:** `--container-measure` in `globals.css`, `<p>` elements across 34 files

`--container-measure: 48ch` generates `max-w-measure`, applied to **36 body paragraphs**. Headings
were deliberately left unconstrained — display type should run wider than body copy.

**48ch, not the conventional 65ch, and the difference matters.** `ch` is the width of "0", which in
Plus Jakarta Sans is 0.732em while the average lowercase character is 0.514em — so nominal `ch`
overstates real characters per line by about **1.42×**. Measured against a real lowercase sample:

| Setting | Computed max-width @19px | Real chars/line | Binding? |
| --- | --- | --- | --- |
| 62ch | 792px | ~74 | **no** — the grid column was narrower, so the token did nothing |
| 52ch | 723px | 74 | barely |
| **48ch** | **668px** | **68** | yes |

**The 62ch version was a silent no-op** and I initially misread the container's own width as proof
the measure was working. If you change this, verify the computed `max-width` is actually *smaller*
than the element's available width, not just that the number looks reasonable.

Result: every long paragraph now measures 68 chars at 1440 and 40 at 375; **0 exceed 76**.

### T3-F · Eyebrow consistency + sub-12px text ✅
**Owns:** `--tracking-eyebrow` in `globals.css`, uppercase micro-labels across the codebase

- **198 tracking values → one token.** `--tracking-eyebrow: 0.12em` replaces `[0.12em]` ×169,
  `[0.1em]` ×16, `[0.08em]` ×10 and one-off `[0.11em]`, `[0.13em]`, `[0.2em]`. 0.12em won because
  it was already the overwhelming majority.
- **53 uppercase `font-bold` → `font-semibold`**, matching the documented ladder (font-bold is
  reserved for section headings and card titles). Every one was checked to be an eyebrow, badge or
  micro-label first, not a heading.
- **81 off-scale sizes fixed:** `text-[9px]` ×1, `text-[10px]` ×24, `text-[11px]` ×52 → `text-xs`
  (12px); `text-[15px]` ×4 → `text-sm`. Nothing on the site now renders text below 12px.

Measured after, on the homepage: **2 eyebrow signatures** (12px/w600/0.12em ×34 and
14px/w600/0.12em ×6) — a scale, not drift — and **0 text nodes under 12px**. Contrast re-checked
because the weight change affects the ≥18.66px-bold large-text threshold: 162 nodes, 0 failures.

### T3-G · Typeface — user decision pending
The user asked about Adobe Fonts' `school` tag collection. **That collection is comic/handwriting
faces** — Adobe's own description is *"lettering reminiscent of childhood or primary education"*,
and it includes Comic Sans MS, CC Dash To School, P22 ToyBox. Wrong register for an adult language
school, and Adobe Fonts cannot be self-hosted (Typekit CDN only), which is a DSGVO problem for a
German nonprofit — the same class of issue as the Vercel Toolbar removed in pass 15.

**If a typeface change is still wanted, the clean path is Source Serif 4** as a display face:
a genuine Adobe Original, SIL Open Font Licence, available through `next/font/google` and
therefore self-hosted at build time with zero third-party requests. Pair it with the existing
sans for body. Re-measure the tracking values if this lands.

---

## 🪶 Tier 4 — Restraint: remove the ornament (2026-08-16)

**Why:** `docs/PREMIUM_UI_REVIEW_2026-08-16.md` §4. This is the tier that most changes whether the
site reads as "premium" or as "template", and it is mostly deletion.

| Unit | What | Status |
| --- | --- | --- |
| T4-A | Retire the tricolour triad | ✅ done 2026-08-16 |
| T4-B | Strip hero-photo decorations + the photo colour wash | ✅ done 2026-08-16 |
| T4-C | Delete genuinely dead CSS | ✅ done 2026-08-16 |
| T4-D | `.casa-card-surface` pre-refactor elevation | ✅ done in T2-D |
| T4-E | Border **and** shadow on the same white card | ⏳ not started — read the note |

### T4-A · The tricolour triad ✅
`.casa-tricolor-rule` keeps its class name (25 call sites unchanged) but now draws a single
`--casa-blue` fade instead of red → yellow → blue. Also retired: the stats band's hard-stop
34%/68% flag-stripe gradient, its per-item ticks cycling blue → sun → red → white (which implied a
category difference between stats that have none), and the three red/yellow/blue dots on the hero
photo that read as macOS traffic lights.

**Verify:** `grep casa-red` in shipping `*.tsx` returns nothing that also mentions `casa-sun` or
`casa-blue`. The triad now appears only in the logo.

### T4-B · Hero decorations and the photo wash ✅
Removed the four stacked decorations from `HeroPhotoCard` (rotated square, hairline, tricolour
rule, traffic-light dots).

The larger change is `.casa-media-overlay::before`, which applies to **25 photo surfaces**. It was
three layers at **0.6 opacity** — ink-to-blue diagonal + blue radial + **sun radial** — so every
photograph carried a blue-and-yellow cast and the triad returned through the back door. It is now
a single neutral ink gradient at 0.28, weighted to the corner where captions and badges sit: a
legibility scrim, not a colour wash. The hover sweep (`::after`) is kept — it is the one real
media micro-interaction the site has.

### T4-C · Dead CSS ✅ — **and the original finding was mostly wrong**
Only `.matt-shadow` and `.japanese-fade` were genuinely dead (0 consumers; `.matt-shadow` also
used pure black, which `tokens.ts:100` forbids). Both deleted.

**Four of the six classes the review listed as dead were live.** `casa-card-grid`,
`casa-card-spark` and `casa-button-edge` are not class names — they are *keyframe-name prefixes*.
Grepping them as classes returns 0 while the animations fire on pseudo-elements of classes used
25 / 7 / 32 / 20 times. Deleting them would have stripped hover behaviour from every photo and
every primary button.

**Rule: a grep for a class name does not prove a keyframe is unreachable.** Trace the animation to
its selector first.

Also corrected here: `UI_SYSTEM.md` documented `casa-soft-rise` (560ms) as the section entrance
animation. That class has no definition and no consumers — it never shipped. The live mechanism is
`casa-reveal-init` + `is-visible` at 420ms.

### T4-E · Border **and** shadow on the same white card — not started
**Do not sweep this blind.** Measured on the rendered homepage:

- 23 white elements carry both an outline and a shadow — but **most are buttons and icon
  medallions**, where the pairing is correct.
- Filtering to real content surfaces (>220×110px, not inside a button) leaves **13 cards, 11 of
  them on `--casa-canvas`**. Those are the genuine targets — mostly the course cards, which
  separate via `ring-1` rather than `border`.
- In source: **21** `ring-1` + shadow-token, **63** `border` + shadow-token on `bg-white`.

Whether a given card should lose its outline depends on whether it sits on `--casa-canvas` (where
the shadow alone separates it, which is why the canvas tint was introduced) or on a white section
(where it does not). That is not statically determinable. Work per component, canvas cases first,
and check each one rendered.

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
