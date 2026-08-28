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
- Usage governance for hero/media/CTA/public-registration patterns: `src/config/brand/usage-rules.ts`.
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

`font-extrabold` is **not** part of the scale — `src/config/brand/usage-rules.ts`
forbids it. Since it would render the same as `font-black` anyway, the ladder uses
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
- Page section entrance animation: **`casa-reveal-init` + `is-visible`** (`420ms`, cubic-bezier
  `(0.2, 0.78, 0.2, 1)`), applied by `src/components/ui/scroll-effects.tsx` via
  `IntersectionObserver`. *(Corrected 2026-08-16: this doc previously named `casa-soft-rise` at
  560ms. That class has no definition in `globals.css` and no consumers — it never shipped.)*
- Reduced motion support remains global through `prefers-reduced-motion: reduce`.

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
