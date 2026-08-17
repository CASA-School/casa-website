export const brandPrimitives = {
  sun: '#ffd500',
  blue: '#009fe3',
  redLegacy: '#e30613',
  amber: '#f2b441',
  amberStrong: '#df9f24',
  coral: '#d66b4d',
  warmSoft: '#fff3da',
  inkDeep: '#111827',
  inkDeepHover: '#1f2b3c',
  inkPanel: '#1b2537',
  goldDeep: '#be8b1d',
  background: '#ffffff',
  sand: '#e2e8f0',
  ink: '#0f172a',
  muted: '#64748b',
  blueStrong: '#008ecb',
} as const;

/**
 * Semantic tokens.
 *
 * Contrast rule for this palette: CASA's brand colours are *light*. Used as a
 * background they need ink text; used as text on a light surface they fail AA.
 * Verified ratios on white — blue 2.97, amber 1.85, sun 1.43, coral 3.46.
 * So `text.*` and `action.*Text` never point at a raw brand colour; they point
 * at the surface-aware `--casa-accent-text` / `--casa-*-text` tokens defined in
 * `globals.css`, which resolve differently on light and dark sections.
 */
export const semanticTokens = {
  surface: {
    page: 'var(--casa-canvas)',
    card: 'var(--casa-bg)',
    accentSoft: 'var(--casa-warm-soft)',
    contrast: 'var(--casa-ink-deep)',
    contrastElevated: 'var(--casa-ink-panel)',
    /** Filled accent chips/badges. Carries white text at 5.56:1. */
    accentSolid: 'var(--casa-accent-surface)',
  },
  text: {
    heading: 'var(--casa-ink)',
    body: 'var(--casa-muted)',
    /** Captions, counters, unit labels. Replaces bare slate-400 (2.56:1). */
    subtle: 'var(--casa-text-subtle)',
    contrast: '#ffffff',
  },
  action: {
    primaryBg: 'var(--casa-ink-deep)',
    primaryHoverBg: 'var(--casa-ink-deep-hover)',
    primaryText: '#ffffff',
    secondaryBg: 'var(--casa-amber)',
    secondaryHoverBg: 'var(--casa-amber-strong)',
    secondaryText: 'var(--casa-ink)',
    tertiaryText: 'var(--casa-accent-text)',
    tertiaryHoverText: 'var(--casa-accent-text-hover)',
  },
  status: {
    /** Surfaces keep the brand values; `*Text` variants are AA as text. */
    info: 'var(--casa-blue)',
    infoText: 'var(--casa-accent-text)',
    success: '#16a34a',
    successText: 'var(--casa-success-text)',
    warning: 'var(--casa-gold-deep)',
    warningText: 'var(--casa-warning-text)',
    critical: 'var(--casa-red)',
    criticalText: 'var(--casa-danger-text)',
  },
} as const;

export const componentTokenRules = {
  /**
   * Border-radius scale — 3 tiers, no exceptions.
   *
   * Tier 1 · rounded-3xl (14px): Outer page cards, modals, full-section wrappers.
   * Tier 2 · rounded-xl  (10px): Internal content boxes, section banners, tiles,
   *                               tab switcher pills, grouped input panels.
   * Tier 3 · rounded-lg   (8px): Inputs, selects, textareas, buttons, small badges.
   * Special · rounded-full     : Avatar circles, step indicators — always full.
   *
   * The tier NAMES are stable; the px values compressed on 2026-08-16 from
   * 22/14/10 to 14/10/8. Do not read the numbers here as authoritative — they
   * are derived from `--radius` in src/app/globals.css, which is the only place
   * to change them. See the long note in that block for why the spread between
   * tiers narrowed rather than just the base.
   *
   * Retired values (do not use):
   *   rounded-2xl — use rounded-xl (content boxes) or rounded-3xl (outer shells)
   *   rounded-md  — use rounded-lg (interactive) or rounded-xl (content boxes)
   *   rounded-sm  — reserved for shadcn UI dropdown item internals only
   */
  radius: {
    outerShell: 'rounded-3xl',  // 22px — page cards, modals
    contentBox: 'rounded-xl',   // 14px — internal cards, tiles, banners
    interactive: 'rounded-lg',  // 10px — inputs, buttons, selects
    circle: 'rounded-full',     // 9999px — avatars, step circles
  },
  /**
   * Shadow scale — 4 elevation tiers, spotlight style.
   * All use rgba(15,23,42,…) = --casa-ink. No pure black.
   *
   * soft  (Y:8px)  → subtle lift: flat info tiles, gentle card borders
   * card  (Y:16px) → standard:    content cards, section boxes
   * modal (Y:24px) → high:        modals, overlays, sticky panels
   * hero  (Y:32px) → maximum:     hero featured blocks, dark sections
   *
   * Special exceptions (keep as arbitrary values):
   *   rgba(16,185,129,…) — emerald success glow
   *   rgba(0,159,227,…)  — CASA blue active ring
   */
  shadow: {
    soft:  'shadow-[var(--shadow-soft)]',
    card:  'shadow-[var(--shadow-card)]',
    modal: 'shadow-[var(--shadow-modal)]',
    hero:  'shadow-[var(--shadow-hero)]',
  },
  navbar: {
    baseBackground: 'rgba(255, 255, 255, 0.65)',
    scrolledBackground: 'rgba(255, 255, 255, 0.9)',
    interactiveText: 'var(--casa-ink)',
    accentText: 'var(--casa-blue)',
  },
  footer: {
    baseBackground: 'var(--casa-ink-deep)',
    elevatedBandBackground: 'var(--casa-ink-panel)',
    headingText: '#ffffff',
    bodyText: '#cbd5e1',
    accent: 'var(--casa-amber)',
  },
  hero: {
    layout: 'fixed anatomy, theme surface only',
    headline: 'var(--casa-ink)',
    body: '#475569',
    chipSurface: 'rgba(255, 255, 255, 0.8)',
  },
  forms: {
    fieldBackground: 'rgba(248, 250, 252, 0.4)',
    fieldBorder: '#e2e8f0',
    focusRing: 'var(--casa-blue)',
    error: '#dc2626',
  },
  button: {
    /**
     * The real height ladder in `src/components/ui/button.tsx`. This field used
     * to declare a flat `2.75rem` that no button on the site actually used —
     * the cva `size` scale is the source of truth, so it is mirrored here
     * instead of contradicted.
     *
     * `default` (2.25rem / 36px) is below the 44px touch minimum and is the
     * reason so many call sites hand-patch `h-11`. Raising it is a site-wide
     * visual change and is tracked separately in
     * docs/PREMIUM_UI_REVIEW_2026-08-16.md §6 (tap targets), not here.
     */
    heights: {
      xs: '1.5rem',        // 24px — icon-adjacent only
      sm: '2rem',          // 32px
      default: '2.25rem',  // 36px — below the 44px touch minimum
      lg: '2.75rem',       // 44px — the touch-safe step
      marketing: '3rem',   // 48px — the four `marketing-*` variants
    },
    radius: '0.625rem', // rounded-lg — tier 3 interactive
    focusRing: 'color-mix(in srgb, var(--casa-blue) 56%, transparent)',
    primarySurface: 'linear-gradient(118deg, color-mix(in srgb, var(--casa-ink-deep) 94%, black) 0%, var(--casa-ink-deep) 52%, color-mix(in srgb, var(--casa-blue) 16%, var(--casa-ink-deep)) 100%)',
    outlineSurface: 'var(--casa-bg)',
  },
} as const;

/**
 * Language-skill accents, shared verbatim with the CASA student app so a
 * learner meets the same colour for the same skill in both products.
 *
 * `surface` is the brand value (backgrounds, borders, icons, bars).
 * `text` is the surface-aware token — four of the seven fail AA as text on a
 * light background, so text must never point at `surface`.
 *
 * Pair colour with a label or icon; never signal a skill by colour alone.
 * Derivation and measured ratios: docs/DESIGN_ALIGNMENT_WITH_STUDENT_APP.md.
 */
export const skillTokens = {
  reading: { surface: 'var(--skill-reading)', text: 'var(--skill-reading-text)' },
  listening: { surface: 'var(--skill-listening)', text: 'var(--skill-listening-text)' },
  speaking: { surface: 'var(--skill-speaking)', text: 'var(--skill-speaking-text)' },
  writing: { surface: 'var(--skill-writing)', text: 'var(--skill-writing-text)' },
  grammar: { surface: 'var(--skill-grammar)', text: 'var(--skill-grammar-text)' },
  vocabulary: { surface: 'var(--skill-vocabulary)', text: 'var(--skill-vocabulary-text)' },
  exam: { surface: 'var(--skill-exam)', text: 'var(--skill-exam-text)' },
} as const;

export type SkillKey = keyof typeof skillTokens;

/**
 * CEFR level scale — a single sequential ramp derived from --casa-blue, because
 * levels are ordered rather than categorical. `surface` is the chip background,
 * `ink` is the AA-safe text ON that surface (the ramp crosses over between B1+
 * and B2, so this is measured per step, not assumed), and `text` is the level
 * colour used as text on an ordinary light surface.
 *
 * Contrast ratios are documented in `globals.css`. Never signal a level by
 * colour alone — always pair it with the label.
 */
export const levelTokens = {
  a1: { surface: 'var(--level-a1)', ink: 'var(--level-a1-ink)', text: 'var(--level-a1-text)' },
  a2: { surface: 'var(--level-a2)', ink: 'var(--level-a2-ink)', text: 'var(--level-a2-text)' },
  b1: { surface: 'var(--level-b1)', ink: 'var(--level-b1-ink)', text: 'var(--level-b1-text)' },
  b1plus: {
    surface: 'var(--level-b1plus)',
    ink: 'var(--level-b1plus-ink)',
    text: 'var(--level-b1plus-text)',
  },
  b2: { surface: 'var(--level-b2)', ink: 'var(--level-b2-ink)', text: 'var(--level-b2-text)' },
  c1: { surface: 'var(--level-c1)', ink: 'var(--level-c1-ink)', text: 'var(--level-c1-text)' },
} as const;

export type LevelKey = keyof typeof levelTokens;

/** Maps a published level label ("A1", "B1+", "A2/B1") to its scale step. */
export function levelKeyFromLabel(label: string): LevelKey | null {
  const normalized = label.trim().toUpperCase();
  // A range like "A2/B1" or "B1/B2" takes its LOWER bound: that is the entry
  // requirement, which is what a reader is checking themselves against.
  const first = normalized.split(/[/–-]/)[0]?.trim() ?? '';

  if (first === 'B1+') return 'b1plus';
  if (first.startsWith('C1')) return 'c1';
  if (first.startsWith('B2')) return 'b2';
  if (first.startsWith('B1')) return 'b1';
  if (first.startsWith('A2')) return 'a2';
  if (first.startsWith('A1')) return 'a1';
  return null;
}

/**
 * Radius intent. The numeric scale stays in globals.css as Tailwind wiring;
 * these name the hierarchy so new components stop guessing.
 * A card nested inside a card takes the next step down.
 */
export const radiusIntent = {
  control: 'var(--casa-radius-control)',
  input: 'var(--casa-radius-input)',
  card: 'var(--casa-radius-card)',
  feature: 'var(--casa-radius-feature)',
} as const;
