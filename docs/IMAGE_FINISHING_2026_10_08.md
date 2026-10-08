# Image finishing pass — 2026-10-08

Status: implemented locally on `codex/image-launch-finishing`, based on clean
`main` at `65c7fbb`. User approved the photographer/editor review changes.
The bedroom reference was pending at this first pass; it is now resolved in
[ACCOMMODATION_IMAGES_2026_10_08.md](ACCOMMODATION_IMAGES_2026_10_08.md). No deployment occurred.

## 1. Evidence

The preceding review inspected 56 media assets, 103 candidates and all public
placements. Camera frames 012, 023, 032 and the front-right person in W009 cut
crowns at source. The exam named quote sat beside two unverified learner faces.
Four homepage course rows were 652 CSS pixels wide but fetched 1080px at DPR 2;
the detail C1 hero was 699.6px wide but fetched 1200px at DPR 2. The old OG image
was 1024px square while metadata specifies 1200×630. Host-family images needed
the reference-based AI treatment and corner disclosure the user requested.

Review evidence: `output/review/image-audit-2026-10-08/`. Finishing evidence,
before/after gallery, specialist checks and fresh captures:
`output/review/image-finishing-2026-10-08/`. These are ignored local outputs.

## 2. Root cause

CSS cannot recover subjects missing in a camera source. The shared warm grade
needed restrained individual adjustments; generic faces near a named quote
could imply identity. Image `sizes` understated actual column widths. The
room-example and social-card provenance/display records were incomplete.

## 3. Fix

- C1 slots 92/93 now use approved reading scene 078 with complete heads and
  visible papers. Company slot 86 uses 079; medical writing slot 90 uses 066.
  These are genuine learner activities, without an invented colleague/clinical
  cohort claim. The rejected C1 row-of-five remains retired.
- W009 is conventionally cropped to omit the source-cut front-right person
  entirely, retaining complete heads in the rest of the group.
- Slot 87 is a face-free original hand/pen crop, with blurred background
  heads excluded. Both company and exam named-quote stories use it.
- Selective conventional colour/exposure corrections improve 060 intensive,
  088 evening, 011 tutoring and 031 Bildungszeit. People remain original.
- Seven host-room derivatives (27,72–77) use five generated room masters
  based on genuine references 08–12. Every foreground placement has a sharp
  bottom-left **Beispielbild** / **Example image** overlay; alt descriptions
  explicitly disclose AI. Decorative halo copies receive no duplicate label.
  No generated people, family photographs or readable correspondence.
- Prompts, reference names, master sizes and SHA-256 are committed in the
  illustration manifest. Master PNGs are preserved outside the deployment
  tree in `~/Archive/CASA/host-family-illustrations-2026-10-08/`. Generated
  masters are resampled to the brief's existing delivery sizes; camera crops
  are never upscaled. A dedicated illustration builder replaces the seven
  host camera recipes in the source-fidelity builder.
- `sizes` matches measured course-row geometry and the shared detail hero's
  53% column. The OG artwork now has actual 1200×630 pixels, approved current
  logo, normal typography and the genuine homepage lesson photograph.
- Media documentation now records the current selections, illustrated-room
  exception and the 13-person staff directory's existing animal illustrations.

### Remaining inputs

**Slot 81:** the newer guest-bedroom, kitchen and bathroom references mentioned
in the brief were not available in the reviewed folders. Codex requested their
local path. A bedroom is not invented from a kitchen or CASA-WG photo. The
room-requirements row temporarily retains labelled dining-area example 77;
that subject mismatch remains until the dedicated bedroom reference arrives.

**Publication record:** the existing W009 school-group consent follow-up in the
older brief is still open. No new consent claim was created. Existing selection
approvals remain recorded; the replacements introduce no new identifiable
people. Actual medical/company activity photographs and matching staff
portraits remain optional future-shoot improvements.

## 4. Files

- `/Users/rahmanshafiee/Downloads/CASA/docs/HOST_FAMILY_IMAGES.md`
- `/Users/rahmanshafiee/Downloads/CASA/docs/MEDIA_LIBRARY.md`
- `/Users/rahmanshafiee/Downloads/CASA/public/images/og-default.png`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/course-bildungszeit-learner.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/course-company-focus.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/course-company-writing.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/course-evening-hero.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/course-evening-table.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/course-intensive-class.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/course-intensive-hero.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/course-medical-writing.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/exam-c1-study-hero.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/exam-c1-study.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/group-course-lunch-table.jpg`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-dining-table.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-guest-bathroom.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-kitchen-detail.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-kitchen-hero.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-kitchen.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-living-hero.webp`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/host-family-room.jpg`
- `/Users/rahmanshafiee/Downloads/CASA/public/media/casa/individual-tutoring.jpg`
- `/Users/rahmanshafiee/Downloads/CASA/scripts/media/build_reel.py`
- `/Users/rahmanshafiee/Downloads/CASA/scripts/media/fit_positions.py`
- `/Users/rahmanshafiee/Downloads/CASA/src/app/globals.css`
- `/Users/rahmanshafiee/Downloads/CASA/src/components/heroes/shared.tsx`
- `/Users/rahmanshafiee/Downloads/CASA/src/components/sections/course-format-rows.tsx`
- `/Users/rahmanshafiee/Downloads/CASA/src/components/ui/casa-image.tsx`
- `/Users/rahmanshafiee/Downloads/CASA/src/config/content/photo-numbers.ts`
- `/Users/rahmanshafiee/Downloads/CASA/src/config/public-page-config.ts`
- `/Users/rahmanshafiee/Downloads/CASA/e2e/media-disclosures.spec.ts`
- `/Users/rahmanshafiee/Downloads/CASA/scripts/media/build_host_family.py`
- `/Users/rahmanshafiee/Downloads/CASA/scripts/media/build_social_image.py`
- `/Users/rahmanshafiee/Downloads/CASA/scripts/media/host_family_illustrations.json`
- `/Users/rahmanshafiee/Downloads/CASA/docs/IMAGE_FINISHING_2026_10_08.md`

## 5. Verification

| Check | Result |
| --- | --- |
| `npm run build` | Pass, production build |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test` | 66 files, 615 tests pass |
| `E2E_PORT=3017 npm run test:e2e` | 54 pass, 3 existing planner skips: no test-runner DATABASE_URL/course-group owner fixture |
| `npm run knip` | Pass |
| `python3 scripts/media/build_reel.py --verify` | 47/47 camera-source recipes pass |
| `python3 scripts/media/build_host_family.py` | Seven exports, master SHA-256 and exact dimensions checked |
| `python3 scripts/media/build_social_image.py` | Actual 1200×630 PNG verified visually |
| Full crop crawl, 390/768/1024/1440/1920px | 1,010 image boxes across 70 sitemap URLs; 0 unloaded image dimensions |
| `fit_positions.py .../crop-audit.json --check` | 0 head cuts against updated manual models |
| DPR 2 request check | Homepage rows652px and C1 detail699.6px both fetch1920px after correction |
| Actual DE/EN accommodation views | Labels/alt and in-frame placement pass at 390/1024/1440; WG photos receive no AI label |
| Photographer + website-image editor | Changed assets/captures pass; bedroom remains pending |

Source review and the geometric model complement each other: the model does not
prove complete camera subjects without visually inspecting the original. Both
were checked for the changed selections. The three database-only planner skips
are unrelated to this media pass; no required gate was omitted.

Local production preview: `http://localhost:3000`. The before/after gallery is
`output/review/image-finishing-2026-10-08/image-finishing.html`. Deployment and
public-domain cutover remain separate actions.
