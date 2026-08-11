# Experimental Landing Pages

Last updated: 2026-06-22

This note tracks temporary homepage and section experiments created for review. The production homepage at `/` has adopted one selected section pair from `/landing-page-alt`, while the full experimental pages remain available for comparison.

## Routes

| Route | Purpose | Main file | Public indexing |
| --- | --- | --- | --- |
| `/design-alternatives` | Internal catalog page listing page-level and section-level alternatives. This should later move behind admin/CMS access control. | `src/app/design-alternatives/page.tsx` | `robots: noindex, nofollow` |
| `/landing-page-alt` | A fresh alternative landing page built directly from the recommendation flow. | `src/app/landing-page-alt/page.tsx` | `robots: noindex, nofollow` |
| `/homepage-reorganized` | A reorganization of the existing homepage content and section vocabulary into the recommended visitor journey. | `src/app/homepage-reorganized/page.tsx` | `robots: noindex, nofollow` |

Both routes are still reachable by direct URL while the local or deployed app is running. They are not linked from the main navigation.

## What Changed

1. Added `/design-alternatives` as a single internal catalog for page-level and section-level alternatives.
2. Added `/landing-page-alt` as a standalone, recommendation-first landing page experiment.
3. Added `/homepage-reorganized` as a homepage-content reordering experiment.
4. Added `robots: noindex, nofollow` metadata to all experimental/catalog pages.
5. Disabled global scroll reveal on the experimental sections so review screenshots and direct anchor visits render consistently.
6. Updated `MEMORY.md` with the experiment status.

## Rollback

To remove both experiments:

```bash
rm -rf src/app/design-alternatives src/app/landing-page-alt src/app/homepage-reorganized
rm docs/EXPERIMENTAL_LANDING_PAGES.md
```

Then remove the experimental-page notes from `MEMORY.md` and rerun:

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run test:e2e
```

If only one experiment should be removed, delete just its route directory and update this note.

## Future Private Access Options

These pages are currently obscured and noindexed, not access-controlled. Before go-live, the CMS/admin-dashboard work should choose one of these approaches:

1. Add route protection in middleware/proxy for `/design-alternatives`, `/landing-page-alt`, and `/homepage-reorganized`.
2. Move experiments under an admin route such as `/admin/design-alternatives`.
3. Gate experiment routes behind a server-side preview password or role check once the public site has an admin/auth surface again.
4. Keep individual variants local-only or remove them before deployment if they should not be reviewed in production.

Do not rely on `robots` metadata as privacy. It only discourages indexing; it does not block direct access.

## Production Homepage Follow-Up - 2026-06-22

The current homepage (`/`) now uses the accommodation support section and four-step enrollment section from `/landing-page-alt`.

Changed file:

```text
src/app/page.tsx
```

What changed:

1. Removed the earlier `ProcessSteps` enrollment block that appeared before the exam section.
2. Replaced the old accommodation-card block with the image-led "Accommodation as support around the course" section.
3. Added the "Four steps to start" enrollment section immediately after accommodation.
4. Added the required Lucide icons and `accommodationPhoto` fallback selection in `src/app/page.tsx`.

Rollback for this production homepage follow-up:

1. In `src/app/page.tsx`, restore the previous `ProcessSteps` block after the course/additional-program section if that earlier enrollment placement is wanted again.
2. Replace the current `data-track-section="housing-and-life"` image-led block plus `data-track-section="enrollment-steps"` block with the previous two-card accommodation grid.
3. Remove unused icon imports if the enrollment cards are removed.
4. Run the full verification gates listed above.
