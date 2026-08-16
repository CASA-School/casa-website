import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Tailwind's stock colour ramps are not CASA's palette.
 *
 * As of 2026-08-16 shipping code contains ZERO of these (it was 515 — see
 * docs/PREMIUM_UI_REVIEW_2026-08-16.md §2.1). Without a rule it drifts straight
 * back the first time someone types `text-slate-600`, because slate *looks*
 * fine in isolation — it is only wrong next to CASA's deliberately warmed ink.
 *
 * `--casa-muted` was darkened to #5b697e specifically to clear AA on warm
 * surfaces; slate-500 is #64748b, the exact value that was rejected.
 *
 * The mapping to use is in docs/PARALLEL_AGENT_WORK_BOARD.md → "Tier 2 · T2-C".
 */
const TAILWIND_PALETTES = [
  "slate", "gray", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
].join("|");

const COLOR_UTILITIES = [
  "bg", "text", "border", "ring", "ring-offset", "outline", "divide", "shadow",
  "from", "via", "to", "fill", "stroke", "placeholder", "caret", "accent", "decoration",
].join("|");

// Matches e.g. `text-slate-600`, `hover:bg-rose-50`, `md:border-emerald-200/90`.
const DEFAULT_PALETTE_CLASS = String.raw`(?:^|[\s"'\`])(?:[a-z-]+:)*(?:${COLOR_UTILITIES})-(?:${TAILWIND_PALETTES})-(?:50|9[05]0|[1-8]00)(?:\/\d{1,3})?(?=[\s"'\`]|$)`;

const NO_DEFAULT_PALETTE_MESSAGE =
  "Use a CASA token, not a stock Tailwind colour. Map it via docs/PARALLEL_AGENT_WORK_BOARD.md " +
  "-> 'Tier 2 · T2-C' (e.g. text-slate-600 -> text-[var(--casa-muted)], border-slate-200 -> " +
  "border-[color:var(--casa-sand)]). On a DARK surface use text-[var(--casa-text-subtle)], which " +
  "globals.css flips to #cbd5e1 automatically. CASA brand colours fail AA as text - point text at " +
  "the surface-aware --casa-*-text tokens, never at a raw brand value.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      // Frozen comparison artifacts. Restyling them would invalidate the
      // comparison they exist for — see docs/EXPERIMENTAL_LANDING_PAGES.md.
      "src/app/design-system/**",
      "src/app/design-alternatives/**",
      "src/app/landing-page-alt/**",
      "src/app/homepage-reorganized/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${DEFAULT_PALETTE_CLASS}/]`,
          message: NO_DEFAULT_PALETTE_MESSAGE,
        },
        {
          // Class strings built with template literals or cn(`...`).
          selector: `TemplateElement[value.raw=/${DEFAULT_PALETTE_CLASS}/]`,
          message: NO_DEFAULT_PALETTE_MESSAGE,
        },
      ],
    },
  },
]);

export default eslintConfig;
