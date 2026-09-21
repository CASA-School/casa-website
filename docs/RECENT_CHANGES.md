# Recent website changes — 21 September 2026

## Integration scope

The user approved pushing and merging `codex/refine-pathway-cards` on
21 September. This is a code integration, **not a deployment or DNS cutover**.
The previously verified Azure release remains `21cf49d` (revision 20); the
public `casa-bremen.de` site still uses the old TYPO3 installation.
The final PR/merge/check identifiers are recorded in the laptop coordination
handoff, `~/.agentic/ACTIVE_HANDOFF.md`, after integration completes.

## Included work

- Homepage pathway cards: white surfaces, softer shadows and restrained hover treatment.
- Partner strip: larger responsive logos, refreshed TANDEM quality artwork, 2/3/5-column layouts.
- Testimonials: consistent typography and card heights, names aligned at the bottom,
  full quotes retained, smooth rotation with accessible controls and reduced-motion support.
- Nonprofit page: spacious mission and beneficiary information; project tabs for HERE
  AHEAD, :prime and GF-H; original linked project logos; TANDEM network and selected
  partner schools. Funding, non-distribution and legal details remain visible in DE/EN.
  See [NONPROFIT_PARTNERS.md](NONPROFIT_PARTNERS.md). No Google NGO eligibility claim.
- About hero: user-supplied daylight building image; its layout remains unchanged.
- Homepage hero: five-photo reel starting with the golden CASA building, followed by
  classroom learning, Bremen walk, language practice and the courtyard. The homepage
  alone has the wider image-led layout, 12–16px navbar gap, heading and single course
  button. No eyebrow, supporting paragraph or visible Pause/Abspielen control.
- Five AI-edited panoramic images: wider framing and brighter natural lighting,
  explicitly requested by the user. Desktop uses 12:5; smaller screens use a 2:1
  frame with the heading and CTA below, without an image-darkening overlay.
  Gentle 2% zoom, 1.4s dissolves, progress indicators, swipe/keyboard navigation,
  loading safeguards and reduced-motion behavior. Original images are preserved.

## Decisions to preserve

- Art-direct every image for its viewport. Check all scenes, faces, building details
  and motion at phone, tablet, laptop and large-screen widths. Do not fix a crop by
  stretching a photograph or darkening the whole image.
- Keep homepage copy minimal; keep nonprofit mission/funding information visible.
- Avoid yellow/cream card backgrounds and repetitive, compressed page layouts.
- These imagegen derivatives include inferred surroundings; do not describe them
  as untouched documentary photographs. Sources, prompts and exact asset paths:
  [MEDIA_LIBRARY.md](MEDIA_LIBRARY.md) and [MEDIA_PHOTO_NUMBERS.md](MEDIA_PHOTO_NUMBERS.md).
- Local originals, intermediate designs and review evidence stay outside the deploy
  tree in `/Users/rahmanshafiee/Archive/CASA/hero-reel-2026-09-21/`.

## Verification and continuation

Build, lint, typecheck, 399 unit tests and 43 e2e tests pass. Three existing planner
tests skip because the test runner has no DATABASE_URL; the local app uses the
existing PostgreSQL container. The focused reel tests cover automatic rotation,
manual/keyboard pause, reduced motion, all five scenes and stable mobile height.
Browser checks covered DE/EN and widths from 320px to 2560px.

The local preview runs at `http://localhost:3000/` (`/en` for English).
The authoritative media registry still intentionally contains unfinished numbered
photo slots: do not delete them as dead assets or enable all placeholders at once.
Microsoft email/calendar delivery, production database setup, legal-team review
and the public-domain cutover remain separate launch work documented in the
existing operations/release records. Do not infer launch readiness from this UI merge.
