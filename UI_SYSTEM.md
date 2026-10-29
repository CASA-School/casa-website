# Casa UI System

Last updated: 2026-03-31  
Repo evidence: `src/app/globals.css`, `src/config/brand/*`, `src/components/ui/*`, `components.json`

## Visual Style Summary
- Brand-forward, light-first interface with warm neutrals and CASA accent colors.
- Editorial public pages use shared token foundations across marketing, information, and registration flows.
- Hierarchy comes from a three-tier weight ladder plus size, not from weight alone; body copy stays neutral and readable.
- Surfaces favor rounded cards, soft borders, and subtle shadow depth.

## Token Sources
- Global CSS variables and Tailwind v4 theme bridge: `src/app/globals.css`.
- Brand primitives, semantic tokens, and component mappings: `src/config/brand/tokens.ts`.
- Usage rules for interaction, heroes, media and registration: "Usage rules" at the end of this file. Voice: `docs/VOICE_AND_TONE.md`.
- Shadcn setup, aliasing, and icon library: `components.json`.

## Core Token Values

### Color primitives
- `--casa-blue: #009fe3`
- `--casa-amber: #f2b441`
- `--casa-coral: #d66b4d`
- `--casa-ink-deep: #111827`
- `--casa-ink: #0f172a`
- `--casa-bg: #ffffff`

### Typography
- Primary typeface: Plus Jakarta Sans via `next/font/google` (`--font-sans`).
- Weights loaded: `400, 500, 600, 700, 800` (`src/app/layout.tsx`).
- Base font size: `16.5px`; desktop (`>=1024px`): `17px`.
- Global line-height baseline: `1.6`.

#### Weight scale (established 2026-08-12)

**900 does not exist in this typeface.** Plus Jakarta Sans tops out at 800, and only
400–800 are downloaded, so `font-black` resolves to the 800 face. Measured at 60px,
weight 900 and weight 800 render an identical `724.27px` advance width. Treat
`font-black` as "the heaviest available weight", not as a step above `font-extrabold`.

`font-extrabold` is **not** part of the scale — the usage rules below
forbid it. Since it would render the same as `font-black` anyway, the ladder uses
three classes that produce three genuinely distinct rendered weights:

| Class | Renders | Use for |
| --- | --- | --- |
| `font-black` | 800 | page `<h1>`, hero stat numbers |
| `font-bold` | 700 | section `<h2>`/`<h3>`, card titles, label values, buttons, counters |
| `font-semibold` | 600 | eyebrows and uppercase micro-labels, badges, inline links |
| `font-medium` | 500 | inline emphasis in body copy |

Section headings and card titles share 700 deliberately — they are separated by size
(30–37px vs 16–20px), which is what keeps the page from reading uniformly heavy.

The top tier is meant to stay scarce: **one `font-black` element per page plus its stat
numbers.** If a page has more than that, the ladder has been flattened again. Before this
pass, 284 of ~370 weighted elements in shipping code were `font-black`, so every heading,
eyebrow, stat and card title rendered at the same 800 and nothing read as emphasis.

### Radius
Base radius token: `--radius: 0.375rem` (6px), in `src/app/globals.css`. It is the
only place to change the scale.

**Three tiers, three values.** These are the only radius classes CASA code should use:

| Tier | Class | Value | Use for |
| --- | --- | --- | --- |
| Feature | `rounded-3xl` | 8px | Outer page cards, modals, hero and full-section wrappers |
| Card | `rounded-xl` | 6px | Internal content boxes, section banners, tiles, panels |
| Control | `rounded-lg` | 4px | Buttons, inputs, selects, textareas, badges, chips |
| Pill | `rounded-full` | — | Avatar circles, step indicators |

Controls sit *below* the base on purpose: a button is the smallest and most
repeated rounded object on a page, so it is the first thing that reads as
inflated, and keeping it a step under its container preserves the nesting
hierarchy where the eye actually checks for it.

Semantic aliases naming the same three tiers, for hand-written CSS:
`--casa-radius-control` / `--casa-radius-input` (both 4px — one tier, two
readable names), `--casa-radius-card` (6px), `--casa-radius-feature` (8px).
`--casa-button-radius` derives from `--casa-radius-input`.

All seven Tailwind `--radius-*` steps are still mapped, but they collapse onto
those three values, so ~600 existing call sites land on the right tier without
edits. That also means `rounded-2xl`, `rounded-4xl`, `rounded-md`, `rounded-sm`,
`rounded-xs` and a bare `rounded` are **retired**: they still render, but they
render as one of the three tiers while hiding which tier was meant. The bare
`rounded` is the sharpest trap: Tailwind emits a hardcoded `.25rem` for it rather
than reading `--radius`, so it silently equals tier 3 today but is the one radius
class that will *not* follow if the base is retuned. The non-canonical steps are
kept mapped rather than deleted because
an unmapped `--radius-*` falls through to Tailwind's own default, and a silent
`rounded-4xl` at 32px is a worse failure than a redundant alias.

*(Corrected 2026-08-27: this section previously documented a `0.625rem` base with
`-4/-2/+4/+8/+12/+16` offsets. Neither the base nor any offset had matched
`globals.css` since the 2026-08-16 compression.)*

Two deliberate exceptions remain in the codebase, both flagged in place:
`rounded-[0.25em]` on the inline image credit mark (em-relative so it tracks font
size) and `rounded-[1px]` on the news masthead rule (an editorial rule, not a
container).

## Layout and Motion Conventions
- Shared container: `max-w-[1440px] px-6 lg:px-8`.
- Public section rhythm commonly uses `py-14`, `py-16`, `py-20`.
- Reduced motion support remains global through `prefers-reduced-motion: reduce`.

### Motion (2026-10-29)

Rahman found the sections static after the launch. The motion is one family with the 3D icons:
warm, calm, precise, never salesy. The CSS is the §Motion block in `src/app/globals.css`; the one
script is `src/components/ui/scroll-effects.tsx`, a single `IntersectionObserver`.

**Rules.**
- **One curve:** `--casa-ease-out`, `cubic-bezier(0.2, 0.78, 0.2, 1)` (the utility `ease-casa`).
  Only the 3D icons keep their overshoot: they are objects that bounce, the rest is the page.
- **200–600ms.** Hover 200–300ms, an entrance 420–480ms, a drawn line or a photo zoom 600ms.
- **Only `opacity` and `transform`** (or `translate`/`scale`), so nothing shifts the layout and the
  browser can run it off the main thread. No filters, no blur, no animated shadows on large areas.
- **Nothing loops**, except the 3D icons' existing one-shot hover motion and the news ticker.
- **Content never depends on script.** The server's HTML is complete and visible; the script adds
  the `-init` classes after hydration and only to what is still below the first screen, then takes
  them off when the motion has played (no lasting `will-change` or transform). Screen only: a
  printed page shows everything.
- **Off under `prefers-reduced-motion: reduce`.** The script adds nothing and every rule sits in a
  `no-preference` query.
- **Never on the hero** or anything in the first screen: the hero photograph is the page's largest
  paint (Lighthouse 100 desktop, 91–94 mobile at launch must hold).

**The vocabulary.** Use these; do not add a second observer or a motion library.

| What | How | Where |
| --- | --- | --- |
| A section enters | automatic for `main > section`, `main > article`, `[data-reveal="true"]`: rises 12px and fades in, 420ms | every page |
| Its cards follow one another | `data-stagger` on the element whose **direct children** are the items: each rises 16px and fades in, 480ms, 60ms + 70ms apart, the 7th onwards with the 6th | proof band (figures and marks), „Wo startest du?", the course rows (copy, then photo), „Für Beruf und Weiterbildung" rail, the non-profit commitments and `#angebote`, the exam cards, the split's points, the course facts, the about page's figures |
| A figure counts up | `<CountFigure value="30.000+" />` inside a `data-stagger` group: the number counts from 0 once in 600ms with tabular figures, its width held; a year („Seit 1983") or a single digit stays still | proof band, about page |
| Steps are one path | `ProcessSteps` (`casa-steps`): the line from each number is drawn down as the step appears (120ms apart, 600ms); stacked, it runs on to the next number | every „Ablauf" |
| A photograph has depth | `data-depth` on the box that clips it (or `MediaFrame depth`): the photo is 6% larger and travels 2.5% either way as the box crosses the screen, tied to scroll (`animation-timeline: view()` in `@supports`); browsers without it keep the photo still | editorial splits, story blocks, level rows, course rows, the homepage's accommodation photo |
| A card answers the pointer | a still frame (`group/lift`) and the card inside lifts `-translate-y-1` (a card that is its own hover target: `-0.5`, or the pointer at its edge makes it flicker), shadow one step up, `duration-300 ease-casa`, `motion-safe:` | persona cards, rail cards, exam cards |
| A photograph answers the pointer | `.casa-media-overlay` zooms to 1.03 in 600ms, nothing else (no drift, no colour change, the frame does not grow) | photo cards |

To make a new grid enter in order, add `data-stagger` to it; if its items are not its direct
children, put it on the element that holds them. Keep a group to what is read together: a whole
page is not a group, and a row of rows (the course formats) is one group per row.

## Component Conventions
- Primitives live in `src/components/ui`.
- Public feature components are grouped by domain such as `registration`, `forms`, `sections`, and `layout`.
- Primitive components expose predictable variants (`cva`) and `data-slot` attributes.
- Public pages should reuse existing shell, breadcrumb, hero, CTA, and form patterns before adding new primitives.

## Accessibility Expectations
- Strong keyboard focus states via `focus-visible`.
- Breadcrumb and landmark navigation on utility and public conversion pages.
- Form inputs carry `aria-invalid` styling paths.
- Reduced-motion fallback is implemented globally.

## Usage rules

Moved from `src/config/brand/usage-rules.ts` on 2026-10-09 with the internal design pages. Its per-page CTA table and its section-spacing rules were dropped: the CTA labels were long out of date, and backgrounds now follow the surface roles in `src/app/globals.css` ("What each surface is for"), not alternation.

### Interaction

- Letter-spacing: 2 values only — tracking-[0.12em] for primary eyebrow/overline labels, tracking-[0.08em] for secondary metadata and tiny helper text. tracking-tight is allowed on headings. Do not use tracking-wide, tracking-wider, or arbitrary values like 0.10em/0.14em/0.16em/0.18em.
- Transition duration: 2 values only — duration-200 for micro-interactions (hover, focus, colour, opacity), duration-300 for layout-affecting transitions (panels expanding, progress bars, slide-ins). Do not use duration-150 or duration-500 in CASA components.
- Button height: h-11 (44px) for all standard CTAs and form submit buttons. h-12 (48px) only for marketing/hero variant buttons (variant="marketing-*" or rounded-full hero CTAs). h-10 is reserved for compact icon-only buttons or image max-height constraints. Do not mix heights arbitrarily.
- Font weight: 4 values only — font-black for the page H1 and hero stat numbers, kept scarce because Plus Jakarta Sans only loads 400-800 so it renders at 800; font-bold for section headings, card titles, label values, buttons, and counters; font-semibold for eyebrows, uppercase micro-labels, badges, and inline links; font-medium for inline emphasis in body copy. Do not use font-extrabold — it has no defined role in the CASA type scale and would render identically to font-black.
- Focus states: all interactive elements must use focus-visible:ring-[3px] focus-visible:ring-[var(--casa-blue)]/20 focus-visible:ring-offset-0 focus-visible:outline-none. On dark backgrounds (footer, ink panels) use focus-visible:ring-[var(--casa-sun)]/60 with ring-offset-2. Never use ring-ring (shadcn default) in CASA components.

### Heroes

- Hero layout anatomy is fixed across pages; only background surface tokens and media vary.
- Each hero must include one primary CTA and one secondary CTA only.
- Tertiary support actions belong in contextual side panels, not inside hero button groups.
- Hero themes must preserve contrast and readable copy on all breakpoints.

### Media

- Prefer real CASA media with people interaction over generic stock images.
- Use landscape assets with clear focal subject and enough safe area for crop.
- Always provide meaningful alt text that describes human context, not file content.
- Mark temporary placeholders so they can be replaced once authentic media is available.

### Icons (2026-10-20)

- One set: the Streamline line icons behind `lucide-react` (`src/lib/icons/streamline-lucide-adapter.tsx`).
  A missing glyph is drawn on the set's 14-unit grid with round caps, never taken from another set.
- One line weight: 1.5px on screen at every size (`svg[data-casa-icon]` in `globals.css`). An icon's
  `strokeWidth` prop sets another weight in px, for a reason.
- An icon set on its own sits in an `IconBadge` (`src/components/ui/icon-badge.tsx`): a circle in the
  tint of its meaning colour (`src/config/brand/meaning.ts`), the icon in that colour's text shade.
  `md` (40px) beside a line of text (menus, rows, choices, contact cards), `lg` (48px) leading a card or
  tile. No rounded squares, no translucent or off-palette grounds, no other sizes.
- Inline icons are 16px beside small text and 20px beside a two-line item. On light grounds they take
  `--casa-accent-text` (list checks, facts) or the meaning link colour of their card; on dark grounds
  `--casa-sun`. Controls (close, chevrons, carousel arrows) take their control's colour.
- A chevron opens, closes or drills down; an arrow goes somewhere (`ArrowRight` in CTAs and links).
- The desktop menu and the phone menu show the same badges: the area's meaning colour.
- Exception: `/aktuelles` keeps the newsletter's rubric medallions.

### Registration

- Single high-contrast form column with clear next-step guidance and no account prerequisites.
- Inline validation should be immediate after field touch and persistent.
- Every submission error must include a direct support path to contact admissions.
- Registration routes must set expectations clearly: CASA follows up by email after review.
- Date fields must avoid generic OS-level date pickers. Implement custom-designed controlled calendar inputs with direct dropdown selectors for quick month/year selection.

