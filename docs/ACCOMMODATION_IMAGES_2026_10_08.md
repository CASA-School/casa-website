# Accommodation image follow-up — 8 October 2026

## Evidence

The reference attachments are `IMG_3849.jpeg` (bedroom), `IMG_3910.jpeg` (kitchen)
and `IMG_3916.jpeg` (bathroom), supplied from `/Users/rahmanshafiee/Downloads/`.
Slot 81 was unready and `becomeHostRoom` pointed to dining-area slot 77. The
learner-facing host-family page also had no bedroom image. The CasaImage label
condition only covered AI host-room illustrations; real WG placements had no
example disclosure. The WG recipes retained a stronger warm cast and lower midtones.

## Root cause

The dedicated guest-room reference had not previously been available. The first
label implementation represented AI provenance rather than accommodation context.
The existing WG grade could be improved through global light and colour adjustment.

## Fix

- Generate the guest-bedroom example from IMG_3849, keeping the single bed, desk,
  bookshelves, navy blind and pink armchair; no wardrobe or additional amenities.
  Use it on both host-family pages, with DE/EN AI disclosure in the alt description.
- Refresh kitchen exports 73–75 from IMG_3910, bathroom 76 from IMG_3916. Remove
  personal photographs, correspondence, labels and toiletries in these illustrations.
- Add `example` to the five real WG slots and share the existing sharp translated
  corner overlay for all 13 accommodation assets, everywhere they appear, including
  the homepage. Decorative blurred duplicate images remain unlabelled.
- Improve the five WG exports with exposure, white-balance and chroma adjustments
  only, keeping their camera sources, room layout, furnishing, crops and dimensions.
- Preserve original attachments and generated outputs. Archive private reference
  copies and PNG masters outside the deployment tree; exact prompts, native master
  sizes and SHA-256 hashes are recorded in the committed manifest. Generated masters
  are resampled to the existing delivery dimensions; camera sources are not upscaled.

## Files

- `/Users/rahmanshafiee/Downloads/CASA/docs/HOST_FAMILY_IMAGES.md`
- `/Users/rahmanshafiee/Downloads/CASA/docs/IMAGE_FINISHING_2026_10_08.md`
- `/Users/rahmanshafiee/Downloads/CASA/docs/MEDIA_LIBRARY.md`
- `/Users/rahmanshafiee/Downloads/CASA/docs/MEDIA_PHOTO_NUMBERS.md`
- `/Users/rahmanshafiee/Downloads/CASA/e2e/media-disclosures.spec.ts`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/casa-wg-room-hero.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/casa-wg-room.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-guest-bathroom.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-kitchen-detail.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-kitchen-hero.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-kitchen.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/shared-flat-kitchen-table.jpg`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/student-room-alternative-1.jpg`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/student-room-balcony.jpg`
- `/Users/rahmanshafiee/Downloads/CASA/scripts/media/build_host_family.py`
- `/Users/rahmanshafiee/Downloads/CASA/scripts/media/build_reel.py`
- `/Users/rahmanshafiee/Downloads/CASA/scripts/media/host_family_illustrations.json`
- `/Users/rahmanshafiee/Downloads/CASA/src/components/ui/casa-image.tsx`
- `/Users/rahmanshafiee/Downloads/CASA/src/config/content/photo-numbers.ts`
- `/Users/rahmanshafiee/Downloads/CASA/src/config/public-page-config.ts`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-guest-room.webp`
- `/Users/rahmanshafiee/Downloads/CASA/docs/ACCOMMODATION_IMAGES_2026_10_08.md`

## Verification

| Check | Result |
| --- | --- |
| `npm run build` | Passed; production preview uses the fresh build |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test -- --maxWorkers=2` | 615 tests passed in 66 files |
| `E2E_PORT=3017 npm run test:e2e -- --workers=2` | 55 passed; 3 existing DB-dependent planner tests skipped because DATABASE_URL/owner fixture are absent |
| `npm run knip` | Passed |
| `python3 scripts/media/build_reel.py --verify` | All 47 camera-source recipes passed |
| `python3 scripts/media/build_host_family.py` | Eight exports; all master hashes verified |
| Production browser check | 30 views across DE/EN home + four accommodation routes at 390/1024/1440; zero missing disclosures, unloaded images, label-frame escapes or horizontal overflow |
| Photographer review | No blocking visible defects in installed host/WG assets; layouts and furnishing preserved |
| Website image-editor review | All 24 first captures inspected; selection/crops/labels passed, runtime cache/bedroom issue flagged. Primary agent completed the fresh WebP capture review and verified all 30 views now load correctly. |

The initial unit run alongside the build/source-check tasks timed out in one
password-hashing test; the complete capped-worker rerun passed. The initial full
browser run passed every accommodation test but one existing homepage navigation
test timed out; all 12 smoke tests passed on rerun. The complete two-worker browser
rerun passed all 55 runnable tests. No verification gate was skipped; the three
planner fixture skips are built into the existing suite. Screenshot review then caught old kitchen/bathroom pixels retained by Next's local
optimizer despite the fresh build. The exact `.next/cache/images` directory was
moved intact to ignored review evidence, our production preview restarted, and
all captures regenerated in a fresh browser session. Cache retention is a local
preview concern; image presence/label metrics alone cannot identify old pixels.

Evidence files are in
`output/review/accommodation-images-2026-10-08/`; production browser captures are in
`output/playwright/accommodation-images-2026-10-08/`.

Local production preview: <http://localhost:3000>. No push or deployment occurred.

Final production capture: `browser-capture-webp.log` and refreshed `metrics.json`
record 30 views with zero issues; 24 full-page captures were refreshed; the relevant host views show the installed
WebP bedroom and new kitchen/bathroom. Direct in-app browser verification at 1440px
confirms the prospective-host room source is `host-family-guest-room.webp`, decoded
with naturalWidth 652. The final export matches the other host-room WebP assets.
No application component/loading behaviour was changed for the delivery repair.
