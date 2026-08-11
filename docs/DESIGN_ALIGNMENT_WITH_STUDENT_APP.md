# Design Alignment with the CASA Student App

Date: 2026-08-12

The CASA student app (`lernen.casa-bremen.de`, source at
`~/Tasks/10-active/work/casa-student-app`) and this marketing site were designed
independently. This compares them and recommends what should converge.

Sources: the app's `apps/web/src/app/globals.css` and `docs/design-system.md`; this repo's
`src/app/globals.css` and `src/config/brand/tokens.ts`.

## The headline: they already share a brand core

This is not two unrelated design languages. The primitives agree:

| Colour | This site | Student app | Same? |
| --- | --- | --- | --- |
| CASA blue | `--casa-blue: #009fe3` | `--color-brand-500: #009fe3` | identical |
| CASA red | `--casa-red: #e30613` | `--secondary: #e30613` (also `--skill-reading`) | identical |
| CASA yellow | `--casa-sun: #fed500` | `--color-gold-400: #ffd500` | **conflict** |

The app even carries `--casa-sun` and `--casa-green` as aliases, so it was already reaching
back toward this site's vocabulary.

### The yellow conflict is settled

`public/accreditations/azav.svg` — a real accreditation badge shipping on this site — uses
`#009fe3` and `#ffd500`. The app's value is right; `--casa-sun: #fed500` in
`src/config/brand/tokens.ts` is a one-digit drift and should be corrected to `#ffd500`.

Note that `~/Downloads/CASA_Bremen_Advanced_Branding_Assets` contains a *third* palette
(`#0096a6`, `#e31c24`, `#ffc20e`). Its own README states the assets are reconstructed from
public references and are not official. Do not treat that pack as authoritative.

## Where they genuinely diverge

**Type.** This site runs one family, Plus Jakarta Sans, at very heavy weights — `font-black`
(900) appears on nearly every heading, eyebrow, and stat. The app runs a three-tier system:
Playpen Sans for display, Manrope for interface and reading, Edu NSW Hand as a deliberately
rationed accent, capped at weight 800 and mostly sitting at 400–700.

**Contrast.** This site is meaningfully ahead. `src/config/brand/tokens.ts` documents measured
ratios (blue 2.97 on white, amber 1.85, sun 1.43), states the rule that CASA's brand colours are
light and therefore fail AA as text, and routes every text token through surface-aware
`--casa-accent-text` (`#006f9f` on light, `#5cc8f5` on dark). The app has no equivalent — no
contrast documentation, and `--color-brand-500` is used directly.

**Semantic depth.** The app has a full skill taxonomy — reading, listening, speaking, writing,
grammar, vocabulary, exam — each with a colour and a gradient. This site has no vocabulary at
all for CEFR levels or language skills, despite being a site about CEFR levels and language
skills.

**Shape.** The app has a documented radius ladder with intent: 6 / 10 / 14 / 20 / 28px, controls
< cards < feature surfaces, and an explicit rule that nested cards use a smaller radius than
their parent. This site has `--casa-button-radius: 0.625rem` and a comment mentioning "tier 3
interactive", so the idea exists but is not a full system.

**Warmth.** Both reach for it. The app reserves `--surface-learning: #f7f0df` (warm paper) for
the student trail and keeps staff screens on a cool canvas. This site has
`--casa-warm-soft: #fff3da`. Same instinct, no shared token.

## Elevation and canvas — the biggest gap, added 2026-08-12

The first version of this document compared type, colour, shape and warmth and **missed the two
differences that account for most of the perceived quality gap.**

### Page canvas

| | This site | Student app |
| --- | --- | --- |
| Page background | `--casa-bg: #ffffff` | `--surface-canvas: #f6fafb` |
| Card background | `#ffffff` | `--surface-card: #ffffff` |
| How a card is defined | a grey border, `--casa-sand` | the canvas tint behind it |
| Secondary surface | — | `--surface-subtle: #eef4f5`, `--surface-wash: #fbfdfd` |

This site puts white cards on a white page, so every card needs a grey 1px border to exist at
all. That reads flat, and the borders accumulate into visual noise. The app puts white cards on a
faintly cool canvas, so the card *is* the light thing in the room and needs no border. That is
the single largest reason the app looks more premium, and it is a handful of token changes rather
than a redesign.

It is also contrast-safe here. Every existing text token measured against `#f6fafb` stays above
5.0:1 — `--casa-ink` 16.99, `--casa-muted` 5.31, `--casa-accent-text` 5.30. The tokens were
already tuned to clear AA on `--casa-sand` (#e2e8f0), which is much darker than the proposed
canvas, so nothing regresses.

### Shadow

| | This site | Student app |
| --- | --- | --- |
| Card | `0 16px 40px -28px rgba(15,23,42,0.38)` | `0 2px 8px rgba(36,51,59,0.06)` |
| Raised | — | `0 10px 28px rgba(36,51,59,0.09)` |
| Overlay | `0 24px 56px -40px rgba(15,23,42,0.60)` | `0 22px 54px rgba(36,51,59,0.13)` |
| Coloured | none | `0 12px 28px rgba(0,159,227,0.20)` |

Two real differences beyond taste:

1. **Negative spread.** This site's shadows use `-28px` / `-40px` spread, which cancels most of
   the blur and leaves a tight, comparatively dark contact shadow at fairly high opacity (0.38,
   0.60). The app uses no negative spread and much lower opacity (0.06 → 0.13), so light falls
   off gradually. Diffuse-and-faint reads as expensive; tight-and-dark reads as a UI kit default.
2. **Coloured elevation.** `--shadow-primary` puts a brand-blue glow under primary elements. This
   site has no equivalent. That is the cue that reads as "Duolingo-like" — it is elevation
   carrying brand colour, not a hard offset border. (Worth noting the app does *not* actually use
   the Duolingo solid-offset shadow; its only offset treatments are `inset` accent bars.)

The ink colour also differs: `rgba(36,51,59,…)` in the app is a warmer, slightly green-leaning
shadow than this site's `rgba(15,23,42,…)` slate. The warmer ink is what stops the app's greys
feeling cold.

**Recommendation:** adopt the canvas tint and the softened elevation ladder, keep this site's
four-step naming (`--shadow-soft/card/modal/hero`) so the 167 existing usages don't change, and
add one coloured elevation token for primary actions. Drop card borders where the canvas tint
now does the separating.

## Recommendation

The two surfaces serve different audiences — the app talks only to enrolled students, the site
also has to talk to HR leads, group organisers, and an Ad Grants reviewer. They should not become
the same design. They should stop contradicting each other.

### Adopt from the app

1. **The skill and level colour semantics.** This is the highest-value borrow. Map CEFR levels
   and the four skills to the app's colours wherever this site labels them — course cards, level
   ranges, the comparison table, `CourseLevelGoals`. A student who sees gold mean *speaking* in
   the app should see gold mean *speaking* on the website. Cheap, and it does more for feeling
   like one organisation than any other single change.
2. **The radius ladder as an explicit hierarchy.** Adopt 6 / 10 / 14 / 20 / 28 with the app's
   stated intent, and the nested-card rule. This site already gestures at tiers; the app has
   already finished the thinking.
3. **The warm surface as a shared token.** Reconcile `#fff3da` and `#f7f0df` to one value and
   give it the same meaning in both: this is where learning happens, as opposed to institutional
   or staff-facing surfaces.
4. **Weight restraint.** Cap display weight at 800 and let size and colour carry hierarchy.
   `font-black` on everything means emphasis on nothing, and it is the single biggest reason the
   site reads heavier and more commercial than the app.

### Send back to the app

5. **The contrast discipline.** The measured-ratio rule and the surface-aware
   `--casa-accent-text` pattern in `src/config/brand/tokens.ts` should move into the app. CASA's
   brand colours are light; the app currently uses `--color-brand-500` as-is and has no
   documented AA story. This site solved that problem properly and the solution is portable.

### Do not adopt

- **Playpen Sans as the site's display face.** It is right for a daily practice product and
  wrong for a page that must also read as a credible gGmbH to a funding reviewer. Keep Plus
  Jakarta Sans here.
- **The handwriting accent.** Same reason, more so.
- **The full gradient set.** The app's skill gradients belong to an interface with progress rings
  and playful feedback. On a marketing page they would read as decoration.

## Suggested order

1. Fix `--casa-sun` to `#ffd500` (one line, removes a real inconsistency).
2. Introduce skill/level colour tokens on this site, mapped to the app's values.
3. Formalise the radius ladder.
4. Reconcile the warm surface token.
5. Audit and reduce `font-black` usage.
6. Separately, port the contrast tokens into the app.

Items 1–4 are additive and low-risk. Item 5 is a visual change that should be reviewed against
`/design-system` before it ships broadly.

## Using the app as a marketing asset

Separate from tokens: the app itself is the site's strongest differentiator, and it is also
concrete Ad Grants evidence — CASA reinvesting fee income into free learning infrastructure for
its own students, which is a far better public-benefit proof than the abstract
"Keine Gewinnausschüttung" card currently on `/ueber-uns/gemeinnuetzigkeit`.

Present availability accurately. The app is in controlled pilot; its README states broader
student onboarding still requires named pilot setup. Claiming it as a guaranteed included
feature would be the same category of error as publishing an unverified price.
