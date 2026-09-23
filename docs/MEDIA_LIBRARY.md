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
| `reel-classroom-lesson.webp` | Slot 51, first reel scene. Real crop of pool frame 093, light correction only. |
| `reel-team-courtyard.webp` | Slot 53, reel. Real crop of pool frame 098, light correction only. |
| `reel-partner-practice.webp` | Slot 52, reel. Real crop of pool frame 075, light correction only. |
| `reel-walking-bremen-wide.webp` | Slot 50, reel. Real crop of pool frame W012 (the slot 23 photograph), light correction only. |

Slots 46–49 were the AI-edited reel images of 21 September; their files were deleted on
2026-09-23 and their numbers are retired, not reused.

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
  No generative editing of any kind — no expansion, relighting, retouching or
  "improvement" by an image model. A frame that needs more room than the photograph
  has gets a different photograph. (The 21 September exception is withdrawn; see below.)
- Art-direct images for each screen size, not just their container: preserve subjects,
  faces, architecture and important signs; check the full motion cycle. Use separate
  framing or text placement where needed. Verify phone, tablet, laptop and large screens.
- No person-specific portraits beside named testimonials unless identity and quote are verified.
- Accommodation photos are context, not availability claims.
- Group and younger-student photos are used generically. CASA confirms consent for the
  identifiable people in a picture before its slot goes live.

## Homepage reel — rebuilt from real photographs, 23 September 2026

The 21 September reel used five `image_gen` edits. Compared with their sources they
had invented the building's surroundings and misspelled its window sign
("CASA SPRACHSHULE"), redrawn every person from under half the photograph's
resolution (faces, hair and positions changed) and shipped at 1942×809, below the
hero's display size. All five are gone. The building left the reel: every image of
it we have is AI-altered, so it returns only with a real, high-resolution photograph.

**How a reel image is made.** `scripts/media/build_reel.py` holds one recipe per
slide: the camera original in the pool, a full-width 2:1 crop, and global light and
colour correction (white balance gains, a tone curve on lightness, a chroma factor).
It writes the WebP at the crop's own resolution, never upscaled, without EXIF.
Phones show the whole 2:1 image; desktop's 12:5 frame shows a band of it, and the
slide's `objectPosition` in `public-page-config.ts` is that band, as the script prints
it. So a slide is only trimmed top and bottom, never at the sides.

**How to prove one is unedited.** `python3 scripts/media/build_reel.py --verify`
re-renders every slide from its original and compares it with the committed file in
96px tiles; any tile below 33 dB fails. An honest re-encode scores at least 36 dB in
its worst tile, while a single redrawn or blurred 200px patch drops its tile to about
28 dB even though the whole-image score stays near 40. Run it on the machine that holds
the pool; CI does not have the originals.

**Choosing a photograph.** The pool was scanned against the reel's frames (every face
inside the desktop band and the phone image, nothing important under the desktop
heading in the lower left), then judged for story, composition and consent risk.
Scene order and source:

1. Lesson: pool `093_IMG_0314.JPG` — the teacher's own board handwriting.
2. The CASA team in the courtyard: pool `098_IMG_0340.JPG`. The earlier courtyard
   frame 095 cannot work honestly: its group spans the full width with faces at
   mid-height, so any band puts faces under the heading.
3. Partner interview: pool `075_IMG_0279.JPG`.
4. Bremen walk: pool `W012_group-course-walking-bremen_editorial.jpg`.

Rejected for this frame, with the reason, so nobody re-litigates them: 091 (camera
roll about 5.5°, levelling would be a rotation), 073 (possible minors; also the trio
of the old AI slide), 068 (a publisher's textbook page is legible), 090 and 092
(learners look tired, or faces under the heading), 046 (a party table, and a teacher
who also appears in the team photo).

Consent for the identifiable people in slides 1–3 (the teacher and the learner at the
board in 093, both learners in 075, the team in 098) was confirmed by the product owner
on 2026-09-23. A replacement photograph needs the same confirmation before it is
committed: this repository is public. Check each slide at 1024, 1280, 1440 and 1920px and
on a phone after any change: the heading is up to 62% of the frame wide at 1024px and
wraps to three lines at 1920px.

The reel component itself is unchanged: 6.5-second interval, 1.4-second dissolve,
pause on hover, focus, hidden tab and offscreen, reduced motion honoured, only the
first image preloaded. Implementation: `src/components/heroes/hero-photo-reel.tsx`.
