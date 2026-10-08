# Host-family images: AI illustrations (brief for Codex)

**Decision (Rahman, 2026-10-08):** the host-family photographs on the site will be
replaced by AI-generated images, made by Codex from real host-family photographs.
This brief says what to make, the rules for it, and how to put it into the repo.
It is the one exception to CLAUDE.md hard rule 4, and it covers host-family rooms
only: every other photograph on the site stays a real, source-faithful photograph.

## The references

- **On the site today:** one Bremen host family's home (CASA photo package of
  2026-09-15, consent confirmed by CASA that day): frames 08 (living and dining area
  with the open kitchen), 09 (kitchen), 10 (guest bathroom), 11 (dining table) and
  12 (kitchen from the other side). Originals:
  `~/Tasks/10-active/work/CASA - Various Tasks/casa-external-agency-photo-package-2026-09-15/output/casa-photo-package-external-agency-review-2026-09-15/consent-confirmed-by-casa-2026-09-15/`.
- **Three new photographs, supplied by Rahman on 2026-10-08** (not in the repo; he
  hands them to Codex): a guest room (single bed, a desk under the window, shelves,
  a pink armchair), a kitchen (white fitted kitchen, a white table with four chairs,
  a window onto the garden) and a bathroom (bathtub, washbasin with a mirror cabinet,
  a window).

## One image per slot

Each image replaces a file in `public/media/casa/` at the same path, shape and size,
while labels and accessible descriptions are applied centrally by CasaImage.

| Slot | File | Shape, pixels | What it shows | Where it appears |
| --- | --- | --- | --- | --- |
| 27 | `host-family-room.jpg` | 4:3, 2420×1815 | Living and dining area, open kitchen beyond | /unterkunft card; Gastfamilien hero on phones; become-a-host story |
| 72 | `host-family-living-hero.webp` | 2.4:1, 2420×1008 | The same room as a wide band | Gastfamilien hero from `lg` up |
| 73 | `host-family-kitchen.webp` | 3:2, 2250×1500 | The kitchen | Gastfamilien second photo; become-a-host "Partnerschaft" row |
| 74 | `host-family-kitchen-detail.webp` | 3:2, 2560×1707 | The kitchen from the other side | Become-a-host hero on phones |
| 75 | `host-family-kitchen-hero.webp` | 2.4:1, 2560×1067 | The same kitchen as a wide band | Become-a-host hero from `lg` up |
| 76 | `host-family-guest-bathroom.webp` | 3:2, 2600×1733 | A guest bathroom | Become-a-host "Absprachen" row |
| 77 | `host-family-dining-table.webp` | 4:3, 1700×1275 | The dining table | /unterkunft story; become-a-host room row (until slot 81 exists) |
| 81 | `host-family-guest-room.jpg` | 4:3, 2400×1800 | A guest room: bed, desk, wardrobe, a lamp | Awaited; base it on the new guest-room photograph |

## Rules for the images

- **Rooms only.** No people, faces or hands: a generated person on CASA's site would
  be someone who does not exist.
- **Recognisably the reference room, tidied.** Keep the layout, the furniture and the
  light from the window. Leave out everything personal: family photographs,
  children's drawings, toiletries and toothbrushes, post, names, toys.
- **No legible text, signs, logos or screens.** Image models misspell them; that is
  why slots 44, 45 and 46–49 were retired.
- **A believable Bremen home, not a showroom.** Everyday furniture, daylight, and the
  site's warm editorial light (cream walls, warm daylight; no HDR look, no orange cast).
- **Same shape and pixel size** as the file it replaces. JPEG and WebP at quality 90,
  as `scripts/media/build_reel.py` writes them.
- **Wide bands (2.4:1) keep the whole room in the band,** with nothing important at
  the top or bottom edge, because the hero crops them further on some screens.

## In the repo, when the images arrive

1. Replace the files in `public/media/casa/`, same names.
2. Remove the host-family recipes (`'source': HOST / ...`) from
   `scripts/media/build_reel.py`. `--verify` compares each file with its camera
   original, and a generated image fails it by design.
3. Rewrite each slot's `subject` in `src/config/content/photo-numbers.ts` to say it
   is an AI-generated illustration based on the reference. For slot 81 also set
   `ready: true` and point the become-a-host room row back to it
   (`becomeHostRoom: photoLibrary.hostFamilyGuestRoom` in
   `src/config/public-page-config.ts`).
4. Update the host-family lines in `docs/MEDIA_LIBRARY.md`.
5. Look at /unterkunft, /unterkunft/wohnen-in-einer-gastfamilie and
   /unterkunft/gastfamilie-werden at 390, 1024 and 1440px.

## Labelling (approved by Rahman, 2026-10-08)

The images will be illustrations, not this family's home. Every generated placement receives a small "Beispielbild"
(DE) / "Example image" (EN) corner caption to stop a learner from reading a generated
room as the room they will get. That is the point of hard rule 5: accommodation
photos are contextual, not availability claims.

## Delivered finishing pass, 2026-10-08

Slots 27 and 72–77 now use five generated masters based on references 08–12,
exported at the original delivery shapes/sizes with quality 90. The visible
corner labels are HTML overlays, translated by document language; decorative
halo duplicates do not receive another label. Alt descriptions disclose AI.
No generated people or invented text are included.

The seven camera-source recipes were removed from `build_reel.py`. Rebuild these
illustrations with `python3 scripts/media/build_host_family.py`; its manifest
records exact prompts, reference files and master checksums. Master PNGs stay in
`~/Archive/CASA/host-family-illustrations-2026-10-08/`. Generated pixels are
resampled to preserve the existing requested sizes; this is separate from the
no-upscaling rule for real photographs.

**Pending slot 81:** the three newer references in the brief were not found in
the reviewed source folders. Codex requested their local path. A bedroom layout
is not inferred from a kitchen/WG reference. Until that dedicated photo arrives,
`becomeHostRoom` retains the labelled dining-area example (77); this remaining
subject mismatch is documented rather than presented as a completed bedroom.
