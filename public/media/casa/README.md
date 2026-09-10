# CASA Media Library

Photographs for the public site live here and are served from `/media/casa/…`.

## What is in this folder (since 2026-09-10)

| File | Status |
| --- | --- |
| `group-course-bremen-musicians.jpg` | Slot 20, live. Editorial grade (the pool's W008). |
| `group-course-walking-bremen.jpg` | Slot 23, live. Editorial grade (the pool's W012). |
| `newsflash-editor-lisa-dao.jpg`, `newsflash-kicktipp-winners.jpg` | Article images of two NewsFlash posts. Rendered directly, not through the placeholder, and deliberately unnumbered. |
| `editorial-2026/` (untracked, excluded from the Docker image) | The new pool: 99 camera shots and 13 re-edits, delivered 2026-08-27. The source for every remaining slot. Contact sheet: `output/review/new-photo-pool.jpg`. |

The old library — 39 derivatives made in June 2026 from the OneDrive selection — was
removed on 2026-09-10. The product owner chose the new pool over it; the files had only
survived because the site switched to numbered placeholders on 2026-08-17 instead of
deleting them. Their sources and enhancement parameters are in this file's git history.

## How a photograph goes live

Every photograph slot on the site has a number (`src/config/content/photo-numbers.ts`,
listed with its page in `docs/MEDIA_PHOTO_NUMBERS.md`). To fill one: pick a shot from the
pool, save it at the slot's path as a 2400px JPEG, and set `ready: true` on the registry
entry. That slot renders the photograph; every other slot stays a numbered placeholder
until its turn.

## Rules

- Source-faithful edits only: crop, resize, light exposure and colour correction.
- No person-specific portraits beside named testimonials unless identity and quote are verified.
- Accommodation photos are context, not availability claims.
- Group and younger-student photos are used generically. CASA confirms consent for the
  identifiable people in a picture before its slot goes live.
