# Design cleanup review — 2026-08-19

**Status: diagnosed and fixed, same day.** All four issues below are resolved;
each section carries a **Fixed** note with the measured after-state. What was
deliberately left alone is listed at the bottom under "Not changed, and why".

Gates on the finished pass: `lint`, `typecheck`, `test` (106, including six new
ones on the course order), `build`, `knip`, `test:e2e` (10) — all green.

Method: dev server on `:3002`, headless Chromium walk of 34 routes at 1440 / 1280 /
1024 / 768 / 375, recording every band-scale painted surface (computed
`background-color` + `background-image`) and every horizontal scroll container with
its real overflow. Raw data and screenshots were written to the session scratchpad;
the measurements that matter are inlined below.

> Screenshots need `reducedMotion: 'reduce'`, otherwise `casa-reveal-init` holds
> below-the-fold sections at `opacity: 0` and every capture comes back white.

---

## 1. The slider remnant — a rail whose controls can never do anything

`CardRail` (`src/components/ui/card-rail.tsx`) always renders its two arrow buttons
and its progress bar, regardless of whether the strip actually overflows.

Measured on the homepage "Specialised formats and programmes" band
(`src/app/page.tsx:573`), which holds **3 cards**:

| viewport | children | `scrollWidth - clientWidth` | trailing dead gap |
| --- | --- | --- | --- |
| 1440 | 3 | **0** | 216 px |
| 1280 | 3 | **0** | 56 px |
| 1024 | 3 | 501 | — |
| 768 | 3 | 396 | — |
| 375 | 3 | 595 | — |

So at desktop widths the reader gets: three cards, a dead gap on the right (the
`mr-[calc(50%-50vw)]` viewport bleed with nothing left to bleed), two greyed-out
arrows, and a static grey bar with a dark 38% segment that tracks nothing. That bar
is the "remnant of a line". **No rail anywhere on the site overflows at 1280 or
1440** — the affordance is dead on every desktop instance, not just this one.

Root cause: `CardRail` derives `atStart` / `atEnd` / `progress` from scroll position
but never asks whether the rail is scrollable at all.

**Fixed.** `sync()` now also sets `scrollable = scrollWidth - clientWidth > 1` (it
already ran under a `ResizeObserver`, so no new machinery), and the controls row
renders only when true. Three further parts of the same defect went with it:

- the rail is `tabIndex={-1}` when it cannot scroll, so a keyboard user no longer
  gets a tab stop where every arrow key is a no-op;
- the ul carries `data-scrollable`, and the homepage cancels its own
  `mr-[calc(50%-50vw)]` bleed through it, so the 216px trailing gap is gone;
- the progress thumb is sized from `clientWidth / scrollWidth` rather than a
  hard-coded 38%, so when it does appear it says how much is off-screen.

Measured after: at 1440 and 1280 → `data-scrollable="false"`, 0 arrows, 0 progress
bars, `tabIndex` -1, **trailing gap 0** (the three cards fill the row). At 1024 and
375 → scrollable, both arrows and the bar present, `tabIndex` 0.

## 2. `/courses` is ordered by lessons-per-week, so Bildungszeit leads

Measured DOM order of the format rows on `/courses`:

```
Bildungszeit German → Intensive German → German for Groups → Evening Course
→ Special Courses → Firmenunterricht → German for Medical
```

That is `lessons_per_week DESC`: 40, 20, 20, 4, 2, 0, 0. `getCourses()`
(`src/lib/content/repository.ts:602`, and the three fallback sorts at `:616`, `:623`,
`:899`) orders by weekly load, and `/courses` renders `filterCourses(...)` in that
order. Bildungszeit carries `lessons_per_week: 40`
(`src/config/content/public-fixtures.ts:87`), so a niche funded-leave format leads the
catalogue and Intensive — the flagship — is second. The format selector below inherits
the same array, so **"Bildungszeit German" is also the pre-selected tab** and the first
thing the "how each format actually runs" panel describes.

Meanwhile the homepage does not have this problem, because `src/app/page.tsx:50`
declares its own editorial `homepageCourseOrder` starting at `intensive-german`. So the
same seven formats are ordered two different ways on two pages, and only one of the two
orders was ever an editorial decision.

`src/config/nav.ts:118-158` corroborates the intended order: Intensive → Evening →
Special, then Medical → Bildungszeit.

**Fixed.** `src/config/courses/course-order.ts` now holds the one published order —
`intensive-german, evening-german, special-courses, medical-german, bildungszeit,
german-for-groups, in-company` — plus a stable `sortByPublicCourseOrder()` that leaves
unranked slugs at the *end*, so a newly seeded format can never take the position
Bildungszeit had.

Wired into: both `ORDER BY lessons_per_week DESC` queries (now `ORDER BY slug`, with
the display order applied in JS so Neon-backed and fixture modes cannot disagree), all
five fixture fallback sorts, the sparse-database top-up in `fillSparseCourseTypes`
(where the sort decides *which* formats get filled in, so it should prefer the ones
that matter), `getCourseRegistrationCatalog` (the third place a visitor meets this
list), and `src/app/page.tsx`, whose private list is now derived from the shared one.

Measured after, on /courses: `Intensive German, Evening Course, Special Courses,
German for Medical, Bildungszeit German, German for Groups, Firmenunterricht` — for
both the format rows and the tabs, with **"Intensive German" pre-selected**.

Locked by `src/config/courses/__tests__/course-order.test.ts` (6 tests). The old bug
was invisible — the page rendered perfectly with the wrong course on top — so it
needed an assertion, not a comment.

## 3. Background sprawl — 17 distinct band gradients, 9 of them heroes

### 3a. Nine hero surfaces

`.hero-grain` reads seven CSS variables, and there are now nine distinct resolved
combinations shipping:

| hero theme | routes | base ramp |
| --- | --- | --- |
| `plain` | `/` | white → white → white |
| `courses` | `/courses` + all 7 course detail pages | `#fffdf8 → #f8fbff → #f7f9ff` |
| `exams` | `/exams`, `/exams/b2`, `/exams/c1` | `#f9fcff → #f5f9ff → #f7fbfe` |
| `about` | `/about`, `/team`, `/ueber-uns/gemeinnuetzigkeit` | `#f9fbff → #f4f8ff → #f8fbfe` |
| `accommodation` | 4 accommodation routes | `#fffcf8 → #fff9f3 → #fffaf5` |
| `default` | `/faq`, `/contact`, `/placement-test`, `/careers`, `/search`, `/terms`, `/privacy`, `/imprint` | `#fffefa → #fffdf9 → #fffdfb` |
| + `archetype-f`, `-b`, `-d` overrides | the three `/resources/*` pages | three more one-off blends |

Five near-white base tints (white, two creams, two blue-whites) and, on eight of the
nine, **all three brand colours firing at once** as radial washes — sun + coral/red +
blue. That is exactly what `docs/PREMIUM_UI_REVIEW_2026-08-16.md` §4.1 identified as
the thing that stops a site looking premium, and declared fixed. It was fixed in
`casa-tricolor-rule`, the stats band and the hero photo decorations; it survived
untouched inside `.hero-grain`. The homepage already proves the alternative works
(`hero-theme-plain`, added in `6137f3a`).

On top of all nine, `body` paints a further blue+sun double radial
(`globals.css:765-767`) on all 34 routes, so every hero is a triad over a triad.

### 3b. The wash bands paint a colour nobody can see

`main` is `--casa-canvas` `#f6fafb` on every inner page. The bands that are supposed
to break that rhythm use `bg-[var(--casa-surface-wash)]/30`. Composited:

| band ground | resolves to | RGB distance from the canvas behind it |
| --- | --- | --- |
| `--casa-canvas` | `#f6fafb` | 0 |
| `bg-white` | `#ffffff` | **11.0** |
| `surface-wash/20` | `#f7fbfb` | **1.2** |
| `surface-wash/30` | `#f8fbfc` | **1.8** |

19 call sites use `surface-wash/30`. Every one of them paints a band that is
indistinguishable from the page ground it sits on — the two-surface rhythm those
sections were added for does not exist on screen. `/courses` §2 and §3 are both this
non-surface, which is why that whole lower half of the page reads as one undifferentiated
stretch.

### 3c. One tint, sixteen alphas

`--casa-warm-soft` is used at **16 different alpha values across 48 call sites**:
20, 22, 28, 30, 32, 34, 35, 36, 38, 40, 42, 45, 60, 72, 85, 88. The 30–45 cluster is
28 of those 48 sites and is a single visible tint:

| | resolves to (on white) | distance from `/36` |
| --- | --- | --- |
| `warm-soft/22` | `#fffcf7` | 5.4 |
| `warm-soft/30` | `#fffbf4` | 2.3 |
| `warm-soft/32` | `#fffbf3` | 1.6 |
| `warm-soft/36` | `#fffbf2` | 0 |

`--casa-surface-wash` has 8 alphas, `--casa-sand` has 7. This is the "lost track"
problem in one number: the variation is real in the source and absent on screen.

**Fixed.** A surface ladder is now written down at the top of `globals.css`, with the
composite-distance rule that produced it — *before adding a ground, composite it
against what it sits on and check the distance is above ~8; below that it is not a
surface, it is a token*:

| | |
| --- | --- |
| `--casa-canvas` #f6fafb | the page. `main` paints it, bands inherit it |
| `--casa-bg` / white | a raised band, a card, an input |
| `--casa-ink-deep` #111827 | an inverted band |
| `--casa-warm-soft` #fff3da | a warm panel *inside* one of the above |

`--casa-surface-wash` is a panel tint, never a band, and only ever bare.

What changed to get there:

1. **Nine hero surfaces → one.** `.hero-grain` keeps only `position` / `overflow` /
   `isolation` (layout depends on those); the noise `::before`, the sheen `::after`,
   all five `.hero-theme-*` and all six `.hero-archetype-*` blocks are deleted — 11
   CSS rules to 0. The ~20 call sites still pass the class names and they now resolve
   to nothing, exactly as `casa-tricolor-rule` kept its 25 call sites. The
   design-system page's six hero swatches became one, since six identical rectangles
   labelled as if they differed would document a system that no longer exists.
2. **The `body` double radial is gone** — blue at 0% 0%, sun at 100% 0%, on all 34
   routes, and occluded by `main` everywhere except the 80px behind the translucent
   header.
3. **20 `surface-wash` band paints removed**, 15 panel uses dropped their alpha. Zero
   alpha'd wash uses remain. The white-to-canvas alternation those bands were reaching
   for is *stronger* without them: 11 units instead of 8.6.
4. **`--casa-warm-soft`: 16 alphas → 3** across 54 sites — `/35` quiet (48), `/60` mid
   (4), `/85` solid (2).
5. **The last one-off gradients**, all resolved to either a token or nothing: the
   contact band's white→slate-50 fade, the calculator's three blue+sun sweeps (page
   ground, hero card, result panel), the careers hero's blue+sun pair and its band
   radial, seven raw-hex `#fffaf1` / `#f8fbff` card fades in the two wizards, two
   hand-mixed warm card fades (persona cards, careers detail), Clara's three-layer
   header, and `--casa-sand/30` as a fifth page ground on both registration routes
   (it composited to 2.2 units from the canvas).
6. **The blue corner wash was spelled at 8%, 6% and `rgba(…,0.03)`** for one motif.
   Now one spelling, on every form and detail panel that uses it.

**Measured after: 4 band-scale gradient signatures site-wide, down from 17** — and
three of the four are not design decisions:

| | |
| --- | --- |
| 2 | numbered photo **placeholders** on /accommodation (`CasaImage` fallbacks — 26, 27, 29) |
| 1 | a real photograph on /terms, /privacy, /imprint |
| 1 | the blue corner wash, one spelling, on /contact and both registration routes |

Sampling the rendered ground every 100px down a page now reads as a real ladder —
`/about`: `cccccc W KKK WWWWWWW c W mmmm W c WWWWWW c WWWWW c mmmm c kKK`
(c canvas, W white, m warm panel, K ink-deep, k footer panel).

## 4. Found while measuring: the format-selector tabs clip their first tab

`src/components/signatures/courses-format-selector.tsx:61` is
`flex justify-center gap-2 overflow-x-auto`. `justify-center` inside a scroll
container pushes overflow out of *both* ends, and `scrollLeft` cannot go negative:

| viewport | overflow | first tab's offset from scroll origin |
| --- | --- | --- |
| 375 | 327 px | **−327 px (unreachable)** |
| 768 | 142 px | **−142 px (unreachable)** |
| 1024 | 22 px | **−22 px (clipped)** |

With seven formats, the first tab cannot be reached or clicked on any phone or tablet.

**Fixed.** `flex-wrap justify-center`, no `overflow-x-auto`, and `shrink-0` dropped from
the chips (it belonged to the scrolling; in a wrapping row it stops a long label
fitting). Measured after: overflow 0 at 375 / 768 / 1024, first tab visible at every
width, wrapping to three rows at 375 and one from 768 up.

---

## Not changed, and why

- **`--casa-sand` at 7 alphas** (30/40/60/70/75/80, 90 — 91 sites). Sand is almost
  entirely *borders*, not backgrounds, and /40 and /70 plausibly encode "subtle
  hairline" versus "standard hairline". Collapsing them changes visible edges on 86
  cards and wants its own pass with a decision about how many hairline weights the
  system should have. Left deliberately.
- **The four photo scrims** — `page.tsx:860` and `guided-picker.tsx:132/205/407` — are
  four different ramps over two different inks (`rgba(15,23,42,…)` and
  `rgba(9,16,32,…)`), starting at 0, 0.05 and 0.2 and ending at 0.7, 0.78, 0.82 and
  0.86. That is one motif spelled four ways and should be one. It is left alone
  because every one of them carries white text: picking a single ramp changes text
  contrast on real photographs, and that needs measuring per card rather than a
  find-and-replace. Flagged, not fixed.
- **Clara's avatar gradient** (`AssistantWidget.tsx:285`, `AssistantLauncher.tsx:32`)
  keeps the full palette, for the same reason the logo does. Her header panel did not.
- **`CasaImage`'s six placeholder gradients** are how a missing photograph announces
  itself, with the number to supply it by. They are scaffolding for the media pass,
  not surfaces.
- **The `/courses` hero's left column** looks sparse now that the tint is gone — the
  copy block is much shorter than the finder card beside it. Pre-existing grid, and a
  layout question rather than a colour one.

## Known gap this pass documented but did not fix

`.casa-surface-light` in `globals.css` matches the exact class
`bg-[var(--casa-warm-soft)]` and **not** `bg-[var(--casa-warm-soft)]/35`, so alpha'd
warm panels do not reset `--casa-accent-text`. Pre-existing, and now that the alpha is
one value it would be a one-line attribute-selector fix for whoever is next in there.
