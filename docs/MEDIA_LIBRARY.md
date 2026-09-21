# CASA Media Library

Approved photographs live in `public/media/casa/` and are served from `/media/casa/…`.

## What is in this folder (since 2026-09-10)

| File | Status |
| --- | --- |
| `group-course-bremen-musicians.jpg` | Slot 20, live. Editorial grade (the pool's W008). |
| `group-course-walking-bremen.jpg` | Slot 23, live. Editorial grade (the pool's W012). |
| `newsflash-editor-lisa-dao.jpg`, `newsflash-kicktipp-winners.jpg` | Article images of two NewsFlash posts. Rendered directly, not through the placeholder, and deliberately unnumbered. |
| `casa-building-golden.webp` | Slot 44, homepage hero. User-supplied processed building image, local preview approved 2026-09-21. |
| `casa-building-daylight.webp` | Slot 45, About hero. User-supplied processed building image, local preview approved 2026-09-21. |
| `reel-learning-together-wide.webp` | Slot 46, hero reel; AI framing/lighting edit of pool frame 085. |
| `reel-language-practice-wide.webp` | Slot 47, hero reel; AI framing/lighting edit of pool frame 021. |
| `reel-garden-gathering-wide.webp` | Slot 48, hero reel; AI framing/lighting edit of pool frame 095. |
| `reel-building-golden-wide.webp` | Slot 49, first hero scene; AI expansion of supplied golden building image. |
| `reel-walking-bremen-wide.webp` | Slot 50, hero reel; AI framing/lighting edit of the original slot 23 image. |

The candidate pool is kept outside the project so unapproved photographs cannot be
served or deployed accidentally. On the CASA laptop, the 103 files were moved intact
on 2026-09-16 to `/Users/rahmanshafiee/Archive/CASA/website-cleanup-2026-09-16/editorial-2026/`.
The contact sheet is in that archive's `project-output/review/new-photo-pool.jpg`.
This pool remains the source for filling the remaining slots; it is not a deployment asset.

The old library — 39 derivatives made in June 2026 from the OneDrive selection — was
removed on 2026-09-10. The product owner chose the new pool over it; the files had only
survived because the site switched to numbered placeholders on 2026-08-17 instead of
deleting them. Their sources and enhancement parameters are in the Git history of
this document's former path, `public/media/casa/README.md`.

## How a photograph goes live

Every photograph slot on the site has a number (`src/config/content/photo-numbers.ts`,
listed with its page in `docs/MEDIA_PHOTO_NUMBERS.md`). To fill one: pick a shot from the
pool, save it at the slot's path as a 2400px JPEG, and set `ready: true` on the registry
entry. That slot renders the photograph; every other slot stays a numbered placeholder
until its turn.

## Building image preview — 21 September 2026

The user supplied three ChatGPT image outputs of CASA's building and requested
the middle, golden-light version on the homepage, with use on the About page
also suggested. Two used assets were converted to WebP at their original
1086×1448 resolution (quality 86): golden light, 403,636 bytes; clear daylight,
379,644 bytes. No retouching, generation or permanent crop was performed here.
These are user-supplied processed visuals, not independently authenticated
unedited photographs.

Original sources remain outside the project:

- Homepage: `/Users/rahmanshafiee/Downloads/ChatGPT Image Sep 21, 2026, 01_23_32 PM (2).png`
- About: `/Users/rahmanshafiee/Downloads/ChatGPT Image Sep 21, 2026, 01_23_32 PM (1).png`
- Alternative, not copied into the project: `/Users/rahmanshafiee/Downloads/ChatGPT Image Sep 21, 2026, 01_23_32 PM (3).png`

Both hero configurations use a 4:3 frame and a 50%/27% focal point to keep the
roof, entrance and signage visible at every width. The other heroes retain
their existing dimensions. English and German alt text describes the building;
only slots 44/45 were enabled. Original slot numbers and the remaining photo
placeholders are preserved. Preview remains local on `codex/refine-pathway-cards`;
no push, merge or deployment. Review images and verification logs are outside the
deploy tree at `/Users/rahmanshafiee/Archive/CASA/building-preview-2026-09-21/`.

Verification: build, lint and typecheck pass; 399 unit tests and 41 e2e tests
pass, with 3 existing database-dependent planner skips. DE/EN homepage and About
images load at 320/390/768/1440/1920px without horizontal overflow. Desktop and
phone captures confirm that the building, entrance and signs remain visible.

## Rules

- Source-faithful edits only: crop, resize, light exposure and colour correction.
- Exception explicitly requested on 2026-09-21: the homepage reel uses AI-expanded
  and relit versions, documented below. These must not be described as unaltered photos.
- Art-direct images for each screen size, not just their container: preserve subjects,
  faces, architecture and important signs; check the full motion cycle. Use separate
  framing or text placement where needed. Verify phone, tablet, laptop and large screens.
- No person-specific portraits beside named testimonials unless identity and quote are verified.
- Accommodation photos are context, not availability claims.
- Group and younger-student photos are used generically. CASA confirms consent for the
  identifiable people in a picture before its slot goes live.

## Homepage reel — 21 September 2026

The user asked for a five-scene reel, then a wider GLS-inspired homepage hero with
only the existing heading and course CTA, tighter navbar spacing and no visible
Pause/Abspielen button. After rejecting cropped/dark images, the user explicitly
requested imagegen framing and lighting improvements. Built-in `image_gen` made
five separate edits; originals remain intact. Output: 1942×809 WebP assets,
quality 85, about 1.30 MB total. Generated surroundings are inferred, not verified
depictions of every neighboring building or classroom detail. Review is local only.

Scene order and source:

1. Golden building: supplied `ChatGPT Image Sep 21, 2026, 01_23_32 PM (2).png`.
2. Classroom: archive `085_IMG_0293.JPG`.
3. Bremen walk: existing `group-course-walking-bremen.jpg` (slot 23).
4. Language practice: archive `021_IMG_0140.JPG`.
5. Courtyard: archive `095_IMG_0322.JPG`.

The desktop image frame matches the panoramic 12:5 assets; below 1024px it uses
a subject-safe 2:1 frame and puts the heading/CTA below the image, with no dark
photo overlay. Desktop uses a localized lower-left scrim. The image fills its
frame without distorting proportions. Maximum camera zoom is 2%; excessive zoom
was rejected because it cut off heads and building details.

The client reel uses a 6.5-second interval and a 1.4-second overlapping dissolve.
It pauses on hover, keyboard entry, offscreen or a hidden tab. Choosing an image
stops autoplay; arrow keys/swipe navigate; Space on the reel toggles playback.
Reduced motion disables autoplay, zoom and fades. Unloaded choices are disabled;
autoplay holds the current image until the next is loaded. Inactive photos are
hidden from assistive technology. Only the first image is preloaded. No new dependency.

Implementation: `src/components/heroes/hero-photo-reel.tsx`, its CSS module,
`hero-home-photo.tsx`, homepage props, page configuration and photo registry.
About and all other page heroes retain their existing composition.

Verification: build, lint, typecheck, 399 unit tests and 43 e2e tests pass; 3 existing
planner tests skip without the test runner's DATABASE_URL. New e2e coverage checks
autoplay, manual selection/keyboard pause, reduced motion, all five images and
stable mobile height. Browser checks include 320/375/390/414/768/1024/1366/1440/1920/2560px;
no hero overflow or height jumps. Both languages checked. Local server: port 3000.

Exact prompts, source/output mapping, screenshots and logs:
`/Users/rahmanshafiee/Archive/CASA/hero-reel-2026-09-21/`.
`image-edit-prompts.md` contains all five final prompts and `image-edit-manifest.json`
records generated originals under `.codex/generated_images`. Only selected optimized
derivatives are in the project. Superseded review captures/derivatives stay in the archive.
No push, merge or deployment; branch `codex/refine-pathway-cards`.
