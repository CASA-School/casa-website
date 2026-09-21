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
- No person-specific portraits beside named testimonials unless identity and quote are verified.
- Accommodation photos are context, not availability claims.
- Group and younger-student photos are used generically. CASA confirms consent for the
  identifiable people in a picture before its slot goes live.
