# Casa UI System

Last updated: 2026-03-31  
Repo evidence: `src/app/globals.css`, `src/config/brand/*`, `src/components/ui/*`, `components.json`

## Visual Style Summary
- Brand-forward, light-first interface with warm neutrals and CASA accent colors.
- Editorial public pages use shared token foundations across marketing, information, and registration flows.
- Heavy heading weight (`font-black`) is used for hierarchy; body copy stays neutral and readable.
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
- Weights loaded: `400, 500, 600, 700, 800`.
- Base font size: `16.5px`; desktop (`>=1024px`): `17px`.
- Global line-height baseline: `1.6`.

### Radius
- Base radius token: `--radius: 0.625rem`.
- Derived radii:
  - `sm`: `calc(var(--radius) - 4px)`
  - `md`: `calc(var(--radius) - 2px)`
  - `lg`: `var(--radius)`
  - `xl`: `calc(var(--radius) + 4px)`
  - `2xl`: `calc(var(--radius) + 8px)`
  - `3xl`: `calc(var(--radius) + 12px)`
  - `4xl`: `calc(var(--radius) + 16px)`

## Layout and Motion Conventions
- Shared container: `max-w-[1440px] px-6 lg:px-8`.
- Public section rhythm commonly uses `py-14`, `py-16`, `py-20`.
- Page section entrance animation: `casa-soft-rise` (`560ms`, cubic-bezier `(0.2, 0.78, 0.2, 1)`).
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
