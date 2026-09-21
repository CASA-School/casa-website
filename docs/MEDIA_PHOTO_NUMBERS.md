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
  (`casa-building-daylight.webp`) render the user-supplied processed building
  images on the homepage and About hero respectively. Approved for local preview
  on 2026-09-21; provenance and review status are in [MEDIA_LIBRARY.md](MEDIA_LIBRARY.md).
- Other slots remain numbered placeholders. Their absent image files are expected;
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
