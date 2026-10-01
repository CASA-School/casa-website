# Website photography: current handoff

Updated 2026-09-21. The authoritative numbered shot list is
[`src/config/content/photo-numbers.ts`](../src/config/content/photo-numbers.ts).
It contains the subject brief, delivery path and `ready` flag for every slot.
The previous table here drifted from that registry and still named fabricated
staff members after the code had removed them.

## Current state

- Slots **20** (`group-course-bremen-musicians.jpg`) and **23**
  (`group-course-walking-bremen.jpg`) are ready and render real photographs.
- Slots **44** (`casa-building-golden.webp`) and **45**
  (`casa-building-daylight.webp`) are user-supplied, AI-processed building
  images. Neither is used on a page any more: the About hero moved to 55 on
  2026-10-01.
- The homepage's course rows are **4, 5, 8** (real photographs since 2026-10-01; **37**,
  the medical row, is still a placeholder), "Wir hören zu" is **56** and the
  accommodation block is **57** (a CASA-WG room). See MEDIA_LIBRARY.md for the set.
- The About hero is **55** (since 2026-10-01): the CASA team in the courtyard, the
  whole 3:2 frame of 098 with light correction only.
- The homepage hero is **54** (since 2026-10-01): the lesson, a 5:4 crop with light
  correction only, built by `scripts/media/build_reel.py`. **51, 53, 52, 50** were the
  full-width reel, retired the same day; they remain real, available crops. Slots **46–49** are retired (the AI-edited
  reel of 21 September); their files are deleted and the numbers are not reused.
- Since 2026-10-01 a slot without a photograph no longer shows its number on the page: it renders a calm
  panel in the colour of what it is about (red courses, yellow accommodation, ink exams, blue everything
  else) with that meaning's icon. The number is in the markup as `data-casa-placeholder` and in this list.
- Other slots remain placeholders. Their absent image files are expected;
  do not delete their config references as broken or unused assets.
- Slots **31–36 and 38–43** are reserved for twelve verified staff portraits.
  No synthetic portrait should be presented as a real colleague.
- Slot **37** awaits a suitable medical German photograph.
- The two NewsFlash article photographs are real, intentionally unnumbered assets.
- Accreditation marks and the social-sharing image are separate assets, not photo slots.

## Photo pool and delivery

The candidate pool is archived outside the project, with all 103 files preserved.
See [MEDIA_LIBRARY.md](MEDIA_LIBRARY.md) for its location and delivery rules.

For a confirmed photograph:

1. Use the registry's subject brief and delivery path; never reassign an existing number.
2. Confirm the image is suitable for the context and that CASA has approved its use.
3. Save the source-faithful, optimised derivative at the specified path.
4. Set only that slot's `ready` flag to `true`.
5. Run the photo-registry tests and inspect the image on its pages at desktop and mobile sizes.

The remaining generated images under `public/images/casa/`, obsolete resource
photos, unused logo variants and Next starter graphics were removed on the cleanup
branch after reference checks. Exact paths and recovery commit are in
[`RELEASE_CLEANUP_COPY.md`](RELEASE_CLEANUP_COPY.md).
