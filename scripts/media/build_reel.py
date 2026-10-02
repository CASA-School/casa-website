"""Build the homepage hero photograph and the reel photographs from the original camera files.

Every slide is a CROP of a real photograph plus global light and colour
correction: white balance, a tone curve on lightness, and a chroma factor.
Nothing is generated, retouched, moved or removed, which is CLAUDE.md hard
rule 4. A slide that needs more width than its photograph has gets a different
photograph, not invented surroundings.

    python3 scripts/media/build_reel.py            # write public/media/casa/reel-*.webp
    python3 scripts/media/build_reel.py --verify   # re-render and compare with what is committed

`--verify` is the check that a published reel image is still exactly this
recipe applied to its original: an image edited by any other means, AI or by
hand, fails it. The originals live outside the repository (the photo pool in
~/Archive/CASA, see docs/MEDIA_LIBRARY.md), so the check runs on the machine
that holds them, not in CI.

ONE FILE, TWO FRAMES. Each image is a full-width 2:1 crop. Phones show it
whole in their 2:1 frame; desktop's 12:5 frame shows a horizontal band of it,
chosen by the slide's `objectPosition` in public-page-config.ts, which this
script prints. So a slide is only ever trimmed top and bottom, never at the
sides, and nobody standing at the edge of a group disappears on a phone.

THE HOMEPAGE SET (2026-10-01). The course rows, "Wir hören zu" and the
accommodation block are `box` recipes too, graded to one house look; see the
note above their entries and docs/MEDIA_LIBRARY.md.

THE HERO (since 2026-10-01). The full-width reel was retired from the homepage;
the editorial hero, text left and photograph right, came back. Its photograph is
a `box` recipe: a plain crop of the original at the frame's own proportions,
corrected the same way, with no 2:1 band or desktop offset. The four reel images
stay in the library as photographs that may be used again.

Output never exceeds the source's own pixels: the crop is taken at full
resolution and written at that size, so there is no upscaling.
"""
import argparse
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parents[2]
POOL = Path.home() / 'Archive/CASA/website-cleanup-2026-09-16/editorial-2026'
# Host-family photographs (iPhone originals and resized iPhone derivatives) from
# the CASA photo package, cleared for the website by Rahman on 2026-10-02.
HOST = (Path.home() / 'Tasks/10-active/work/CASA - Various Tasks/casa-external-agency-photo-package-2026-09-15'
        / 'output/casa-photo-package-external-agency-review-2026-09-15/consent-confirmed-by-casa-2026-09-15')
OUT = REPO / 'public/media/casa'

# crop_y: top of the full-width 2:1 box in the original's pixels.
# desktop_y: top of the 12:5 desktop band inside that box, in the same pixels.
# tone: target lightness (0-100) for the crop's 5th, 50th and 95th percentile.
# chroma: saturation factor around neutral. wb: per-channel gains (R, G, B).
SLIDES = [
    # THE PHOTOGRAPH SET, MODERN GRADE (2026-10-02). Rahman asked for brighter,
    # more modern light and wider, livelier pictures. One grade for all of
    # them: white balance from a known neutral in each frame (a whiteboard, a
    # white wall, paper) or the photo editor's earlier skin-checked gains, the
    # midtones lifted to L* 61-64 and the highlights to 93-94 without clipping,
    # saturation near natural (1.02-1.06). Course photos are also each course
    # page's hero, so every course has its own 2.4:1 crop composed for that
    # band ("-hero") as well as the 4:3 identity crop.
    {
        # Slot 4, Intensivkurse: five learners along the table by the window.
        'out': 'course-intensive-class.webp',
        'source': POOL / '060_IMG_0253.JPG',
        'box': (566, 130, 1920, 1440),
        'tone': (5, 63, 93), 'chroma': 1.02, 'wb': (0.955, 1.0, 1.055),
    },
    {
        # Slot 58, its course-page hero: the same class as a 2.4:1 band.
        'out': 'course-intensive-hero.webp',
        'source': POOL / '060_IMG_0253.JPG',
        'box': (260, 435, 2230, 929),
        'tone': (5, 63, 93), 'chroma': 1.02, 'wb': (0.955, 1.0, 1.055),
    },
    {
        # Slot 59, the course page's second photo: the same class, the teacher presenting.
        'out': 'course-intensive-story.webp',
        'source': POOL / '061_IMG_0254.JPG',
        'box': (1070, 280, 1400, 933),
        'tone': (5, 62, 93), 'chroma': 1.03, 'wb': (0.965, 1.0, 1.045),
    },
    {
        # Slot 5, Abendkurse: three learners laughing over a shared exercise.
        # The right edge stops before a publisher's book cover and the teacher.
        'out': 'course-evening-table.webp',
        'source': POOL / '088_IMG_0303.JPG',
        'box': (40, 30, 1960, 1470),
        'tone': (5, 62, 93), 'chroma': 1.03, 'wb': (0.98, 1.0, 1.03),
    },
    {
        # Slot 60, its course-page hero.
        'out': 'course-evening-hero.webp',
        'source': POOL / '088_IMG_0303.JPG',
        'box': (40, 300, 1960, 817),
        'tone': (5, 62, 93), 'chroma': 1.03, 'wb': (0.98, 1.0, 1.03),
    },
    {
        # Slot 8, Spezialkurse: the teacher speaking at the smart board, her
        # class working in front of her (Rahman's pick, 2026-10-02). The left
        # edge leaves out the wall clock rather than cut it in half.
        'out': 'course-special-smartboard.webp',
        'source': POOL / '067_IMG_0266.JPG',
        'box': (490, 138, 2070, 1552),
        'tone': (5, 62, 93), 'chroma': 1.03, 'wb': (1.0, 1.0, 0.995),
    },
    {
        # Slot 61, its course-page hero.
        'out': 'course-special-hero.webp',
        'source': POOL / '067_IMG_0266.JPG',
        'box': (0, 560, 2560, 1067),
        'tone': (5, 62, 93), 'chroma': 1.03, 'wb': (1.0, 1.0, 0.995),
    },
    {
        # Slot 62, Bildungszeit: a learner smiling up from his exercise while
        # the teacher writes the grammar on the board.
        'out': 'course-bildungszeit-class.webp',
        'source': POOL / '094_IMG_0315.JPG',
        'box': (170, 0, 2227, 1670),
        'tone': (5, 62, 93), 'chroma': 1.03, 'wb': (0.99, 1.0, 1.03),
    },
    {
        # Slot 63, its course-page hero.
        'out': 'course-bildungszeit-hero.webp',
        'source': POOL / '094_IMG_0315.JPG',
        'box': (0, 100, 2560, 1067),
        'tone': (5, 62, 93), 'chroma': 1.03, 'wb': (0.99, 1.0, 1.03),
    },
    {
        # Slot 64, Firmenunterricht: a CASA classroom, the logo on the screen.
        # No people in it.
        'out': 'course-company-classroom.webp',
        'source': POOL / '053_IMG_0211.JPG',
        'box': (150, 0, 2251, 1688),
        'tone': (6, 62, 93), 'chroma': 1.03, 'wb': (0.969, 1.0, 1.027),
    },
    {
        # Slot 65, its course-page hero.
        'out': 'course-company-hero.webp',
        'source': POOL / '053_IMG_0211.JPG',
        'box': (0, 330, 2560, 1067),
        'tone': (6, 62, 93), 'chroma': 1.03, 'wb': (0.969, 1.0, 1.027),
    },
    {
        # Slot 56, the homepage's "Wir hören zu": the teacher with smiling learners.
        'out': 'home-class-welcome.webp',
        'source': POOL / '087_IMG_0302.JPG',
        'box': (60, 170, 1620, 1080),
        'tone': (5, 63, 93), 'chroma': 1.03, 'wb': (0.99, 1.0, 1.034),
    },
    {
        # Slot 57, a single room in a CASA shared flat, for the accommodation block.
        'out': 'casa-wg-room.webp',
        'source': POOL / '008_6.jpg',
        'box': (200, 0, 2276, 1707),
        'tone': (6, 60, 92), 'chroma': 1.03, 'wb': (0.94, 1.0, 0.975),
    },
    {
        # Slot 10, vocabulary on a Bremen map (hands only), Spezialkurse's second photo.
        'out': 'classroom-map-vocabulary.jpg',
        'source': POOL / 'W006_classroom-map-vocabulary_editorial.jpg',
        'box': (0, 0, 2400, 1600),
        'tone': (6, 60, 93), 'chroma': 1.03, 'wb': (1.0, 1.0, 1.0),
    },
    {
        # Slot 20, a group at the Bremen Town Musicians, regraded from its pool file.
        'out': 'group-course-bremen-musicians.jpg',
        'source': POOL / 'W008_group-course-bremen-musicians_editorial.jpg',
        'box': (0, 0, 2400, 1600),
        'tone': (6, 50, 92), 'chroma': 1.03, 'wb': (0.98, 1.0, 1.0),
    },
    {
        # Slot 23, a group walking through Bremen, regraded from its pool file.
        'out': 'group-course-walking-bremen.jpg',
        'source': POOL / 'W012_group-course-walking-bremen_editorial.jpg',
        'box': (0, 0, 2400, 1600),
        'tone': (4, 46, 90), 'chroma': 1.05, 'wb': (0.975, 1.0, 1.0),
    },
    {
        # Slot 55. The About hero: the CASA team in the courtyard (slot 53's
        # frame 098) as the whole 3:2 frame. The group fills the width, so any
        # narrower crop would cut someone at the edge; the hero shows it at its
        # own proportions instead (`aspectRatio: '3 / 2'`).
        'out': 'about-team-courtyard.webp',
        'source': POOL / '098_IMG_0340.JPG',
        'box': (0, 0, 2560, 1706),
        'tone': (7, 47, 92),
        'chroma': 1.06,
        'wb': (1.0, 1.0, 0.985),
    },
    {
        # Slot 54. The homepage hero: the slot 51 lesson as a 5:4 crop of the
        # full frame (2110x1688 of 2560x1688), for the half-width hero image.
        # The teacher, the board, the learner at the board and the class in
        # front all stay in; only empty wall at each side goes.
        'out': 'hero-classroom-lesson.webp',
        'source': POOL / '093_IMG_0314.JPG',
        'box': (129, 0, 2110, 1688),
        'tone': (6, 61, 93),
        'chroma': 1.03,
        'wb': (0.97, 0.995, 1.04),
    },
    {
        # Slot 51. A lesson on Wechselpräpositionen; the board is the teacher's own handwriting.
        'out': 'reel-classroom-lesson.webp',
        'source': POOL / '093_IMG_0314.JPG',
        'crop_y': 195,
        'desktop_y': 55,
        'tone': (7, 56, 91),
        'chroma': 1.06,
        'wb': (0.975, 0.99, 1.035),
    },
    {
        # Slot 53. The CASA team in the courtyard. Faces sit in the upper half,
        # so the desktop heading falls on the garden and nobody's face.
        'out': 'reel-team-courtyard.webp',
        'source': POOL / '098_IMG_0340.JPG',
        'crop_y': 200,
        'desktop_y': 100,
        'tone': (8, 40, 88),
        'chroma': 1.12,
        'wb': (1.0, 1.0, 1.0),
    },
    {
        # Slot 52. A partner interview from a worksheet.
        'out': 'reel-partner-practice.webp',
        'source': POOL / '075_IMG_0279.JPG',
        'crop_y': 184,
        'desktop_y': 136,
        'tone': (7, 57, 92),
        'chroma': 1.06,
        'wb': (0.975, 1.0, 1.03),
    },
    {
        # Slot 50. Students walking in Bremen; the original of slot 23.
        'out': 'reel-walking-bremen-wide.webp',
        'source': POOL / 'W012_group-course-walking-bremen_editorial.jpg',
        'crop_y': 200,
        'desktop_y': 62,
        'tone': (6, 44, 88),
        'chroma': 1.08,
        'wb': (1.0, 1.0, 1.0),
    },
    # THE PLACEHOLDER PASS (2026-10-02, brief "Fotos fuer die Platzhalter").
    # Same modern grade as above. Every frame was checked at 100-200%: no
    # distorted faces or hands, no misspelled text. Private details are left
    # out by the crop, never retouched: the candidate's date of birth on the
    # telc answer sheet in W007, the children's photographs on the windowsills
    # and the pinboard of letters in host-family frame 11, the photo collage
    # on the kitchen wall in frame 12, the mirror in the guest bathroom (10).
    # The classroom 012/023/024/011 walls are cream and the light is tungsten,
    # so their white balance is only half-corrected towards neutral.
    {
        # Slot 18, the telc B2 card and the B2 page's hero on phones: a hand
        # writing the "Schriftlicher Ausdruck (Brief)" sheet. The box stops left
        # of the answer sheet's date-of-birth boxes and right of a brochure face.
        'out': 'exam-preparation-writing.jpg',
        'source': POOL / 'W007_exam-preparation-writing_editorial.jpg',
        'box': (360, 180, 1340, 1005),
        'tone': (6, 62, 93), 'chroma': 1.0, 'wb': (0.985, 1.0, 1.01),
    },
    {
        # Slot 66, the telc B2 page's hero from lg up: the writing hand as a 2.4:1 band.
        'out': 'exam-b2-hero.webp',
        'source': POOL / 'W007_exam-preparation-writing_editorial.jpg',
        'box': (330, 330, 1370, 571),
        'tone': (6, 62, 93), 'chroma': 1.0, 'wb': (0.985, 1.0, 1.01),
    },
    {
        # Slot 67, the telc B2 page's second photo: three learners writing.
        'out': 'exam-b2-class.webp',
        'source': POOL / '023_IMG_0147.JPG',
        'box': (0, 0, 2560, 1707),
        'tone': (5, 62, 93), 'chroma': 1.02, 'wb': (0.97, 1.0, 1.12),
    },
    {
        # Slot 11, the exams hero: two learners writing, one laughing. 5:4 for
        # the photo-led hero; both faces inside the middle of the frame.
        'out': 'learners-writing-class.jpg',
        'source': POOL / '012_IMG_0031.JPG',
        'box': (400, 0, 2134, 1707),
        'tone': (5, 62, 93), 'chroma': 1.02, 'wb': (0.975, 1.0, 1.11),
    },
    {
        # Slot 68, the telc C1 Hochschule card and that page's hero on phones.
        'out': 'exam-c1-writing.webp',
        'source': POOL / '032_IMG_0473.JPG',
        'box': (262, 0, 2276, 1707),
        'tone': (5, 62, 93), 'chroma': 1.02, 'wb': (1.02, 1.0, 1.0),
    },
    {
        # Slot 69, the telc C1 Hochschule page's hero from lg up.
        'out': 'exam-c1-hero.webp',
        'source': POOL / '032_IMG_0473.JPG',
        'box': (0, 200, 2560, 1067),
        'tone': (5, 62, 93), 'chroma': 1.02, 'wb': (1.02, 1.0, 1.0),
    },
    {
        # Slot 70, the telc C1 Hochschule page's second photo: a learner speaking.
        'out': 'exam-c1-speaking.webp',
        'source': POOL / '031_IMG_0472.JPG',
        'box': (0, 0, 2560, 1707),
        'tone': (5, 62, 93), 'chroma': 1.02, 'wb': (1.02, 1.0, 1.0),
    },
    {
        # Slot 71, the exams page's candidate story: a pen in focus, a class writing behind.
        'out': 'exam-story-writing.webp',
        'source': POOL / '024_IMG_0156.JPG',
        'box': (0, 0, 2560, 1707),
        'tone': (5, 60, 93), 'chroma': 1.0, 'wb': (0.965, 1.0, 1.13),
    },
    {
        # Slot 13, "Ihre Frage ist noch offen?" (FAQ) and the contact page: one
        # person explaining a worksheet to another across the desk.
        'out': 'individual-tutoring.jpg',
        'source': POOL / '011_IMG_0021.JPG',
        'box': (0, 0, 2560, 1707),
        'tone': (5, 62, 93), 'chroma': 1.02, 'wb': (0.98, 1.0, 1.10),
    },
    {
        # Slot 80, the nonprofit page's hero: learners and volunteers sharing
        # breakfast, one playing the guitar. Whole frame (the hero shows it 3:2).
        'out': 'community-shared-meal.webp',
        'source': POOL / '043_IMG_0178.JPG',
        'box': (0, 0, 2560, 1685),
        'tone': (5, 63, 93), 'chroma': 1.03, 'wb': (1.04, 1.0, 0.96),
    },
    {
        # Slot 81, the "Studieren in Deutschland" guide's hero: two learners
        # working with CASA's own dictionary. 5:4.
        'out': 'study-learners-dictionary.webp',
        'source': POOL / '034_IMG_0506.JPG',
        'box': (330, 0, 2134, 1707),
        'tone': (5, 62, 93), 'chroma': 1.02, 'wb': (1.03, 1.0, 1.0),
    },
    {
        # Slot 25, the "Leben in Deutschland" guide's hero: the Schnoor. The
        # editorial file is strongly saturated; the chroma comes down. 5:4.
        'out': 'bremen-schnoor-houses.jpg',
        'source': POOL / 'W003_bremen-schnoor-houses_editorial.jpg',
        'box': (200, 0, 1992, 1594),
        'tone': (5, 55, 94), 'chroma': 0.85, 'wb': (1.0, 1.0, 1.0), 'jpeg_quality': 92, 'jpeg_subsampling': 0,
    },
    {
        # Slot 21, Unterricht fuer Gruppen's second photo: a group lunch in the
        # courtyard. The editorial file has a purple cast and lifted blacks.
        'out': 'group-course-lunch-table.jpg',
        'source': POOL / 'W009_group-course-lunch-table_editorial.jpg',
        'box': (0, 0, 2400, 1600),
        'tone': (4, 52, 92), 'chroma': 1.05, 'wb': (0.92, 1.0, 0.93),
    },
    {
        # Slot 26, the "CASA WGs" card: a CASA-WG room with balcony doors.
        'out': 'student-room-balcony.jpg',
        'source': POOL / '003_3.jpg',
        'box': (100, 0, 2276, 1707),
        'tone': (6, 62, 93), 'chroma': 1.03, 'wb': (0.95, 1.0, 1.03),
    },
    {
        # Slot 30, the CASA-WG page's hero on phones: a single room, desk and tulips.
        'out': 'student-room-alternative-1.jpg',
        'source': POOL / '004_4.jpg',
        'box': (140, 0, 2276, 1707),
        'tone': (6, 62, 93), 'chroma': 1.03, 'wb': (0.98, 1.0, 1.0),
    },
    {
        # Slot 79, the CASA-WG page's hero from lg up.
        'out': 'casa-wg-room-hero.webp',
        'source': POOL / '004_4.jpg',
        'box': (0, 300, 2560, 1067),
        'tone': (6, 62, 93), 'chroma': 1.03, 'wb': (0.98, 1.0, 1.0),
    },
    {
        # Slot 28, the CASA-WG page's second photo: the shared kitchen. The
        # box leaves out the wide-angle stretch at both edges of the editorial file.
        'out': 'shared-flat-kitchen-table.jpg',
        'source': POOL / 'W013_shared-flat-kitchen-table_editorial.jpg',
        'box': (300, 150, 2000, 1333),
        'tone': (6, 62, 93), 'chroma': 1.0, 'wb': (0.965, 1.0, 0.99),
    },
    {
        # Slot 27, the host-family card and the host-family page's hero on
        # phones: a host family's dining table, the open kitchen beyond. The
        # box leaves out a wall display and a bag at the left edge.
        'out': 'host-family-room.jpg',
        'source': HOST / '08-host-family-home-living-area.jpg',
        'box': (180, 1400, 2420, 1815),
        'tone': (5, 60, 92), 'chroma': 1.0, 'wb': (0.92, 1.0, 1.07), 'jpeg_quality': 95,
    },
    {
        # Slot 72, the host-family page's hero from lg up: the same room as a 2.4:1 band.
        'out': 'host-family-living-hero.webp',
        'source': HOST / '08-host-family-home-living-area.jpg',
        'box': (180, 1650, 2420, 1008),
        'tone': (5, 60, 92), 'chroma': 1.0, 'wb': (0.92, 1.0, 1.07),
    },
    {
        # Slot 73, a host family's kitchen. The box leaves out a coat on the right.
        'out': 'host-family-kitchen.webp',
        'source': HOST / '09-host-family-home-kitchen.jpg',
        'box': (0, 1100, 2250, 1500),
        'tone': (5, 60, 92), 'chroma': 1.0, 'wb': (0.92, 1.0, 1.12),
    },
    {
        # Slot 74, the become-a-host hero on phones: the kitchen from the other
        # side, the sewing-machine table between the windows. The box leaves
        # out a wall of family photographs on the left.
        'out': 'host-family-kitchen-detail.webp',
        'source': HOST / '12-host-family-home-kitchen-detail.jpg',
        'box': (1400, 300, 4312, 2875),
        'tone': (5, 60, 92), 'chroma': 1.0, 'wb': (0.94, 1.0, 1.12), 'max_width': 2560,
    },
    {
        # Slot 75, the become-a-host hero from lg up: the same kitchen as a 2.4:1 band.
        'out': 'host-family-kitchen-hero.webp',
        'source': HOST / '12-host-family-home-kitchen-detail.jpg',
        'box': (1400, 900, 4312, 1797),
        'tone': (5, 60, 92), 'chroma': 1.0, 'wb': (0.94, 1.0, 1.12), 'max_width': 2560,
    },
    {
        # Slot 76, the guest bathroom. The box stops below the mirror.
        'out': 'host-family-guest-bathroom.webp',
        'source': HOST / '10-host-family-home-guest-bathroom.jpg',
        'box': (0, 1350, 2600, 1733),
        'tone': (5, 62, 93), 'chroma': 1.0, 'wb': (0.99, 1.0, 1.01),
    },
    {
        # Slot 77, the host family's dining table. Frame 11 is the wide living
        # room, but its windowsills carry framed photographs of the family's
        # children and its right wall a pinboard of letters; this box starts
        # below the sills and stays left of the pinboard.
        'out': 'host-family-dining-table.webp',
        'source': HOST / '11-host-family-home-living-dining-wide.jpg',
        'box': (330, 2660, 1700, 1275),
        'tone': (5, 58, 92), 'chroma': 1.0, 'wb': (0.93, 1.0, 1.12),
    },
]

WEBP_QUALITY = 90
# Photographs at .jpg paths (which pages reference by name) are written as JPEG; a
# recipe with fine texture sets 'jpeg_quality' (and, for saturated red/green detail like
# the Schnoor roses, 'jpeg_subsampling': 0, full-resolution colour) so --verify holds.
JPEG_QUALITY = 90


def load(path):
    return np.asarray(ImageOps.exif_transpose(Image.open(path)).convert('RGB'))


def tone_lut(L, targets):
    """Monotone curve through the crop's own 5/50/95th percentiles to the targets."""
    p5, p50, p95 = np.percentile(L, [5, 50, 95])
    t5, t50, t95 = targets
    xs = [0, p5, p50, p95, 100]
    ys = [0, t5, t50, t95, 100]
    grid = np.linspace(0, 100, 1001)
    curve = np.interp(grid, xs, ys)
    # Smooth the joints. Convolving a monotone curve with a positive kernel keeps it monotone.
    kernel = np.exp(-0.5 * (np.arange(-40, 41) / 14.0) ** 2)
    kernel /= kernel.sum()
    padded = np.pad(curve, 40, mode='edge')
    return grid, np.convolve(padded, kernel, mode='valid')


def render(slide):
    rgb = load(slide['source']).astype(np.float32) / 255.0
    h, w = rgb.shape[:2]
    if 'box' in slide:
        x0, y0, bw, bh = slide['box']
        if x0 < 0 or y0 < 0 or x0 + bw > w or y0 + bh > h:
            raise SystemExit(f"{slide['out']}: box {slide['box']} does not fit {w}x{h}")
        out = correct(rgb[y0:y0 + bh, x0:x0 + bw], slide)
        # 'max_width' only ever scales DOWN (the 5712px iPhone originals).
        limit = slide.get('max_width')
        if limit and out.shape[1] > limit:
            size = (limit, round(out.shape[0] * limit / out.shape[1]))
            out = cv2.resize(out, size, interpolation=cv2.INTER_AREA)
        return out
    y0 = slide['crop_y']
    ch = w // 2
    band = round(w * 5 / 12)
    if y0 < 0 or y0 + ch > h:
        raise SystemExit(f"{slide['out']}: 2:1 crop at y {y0} ({w}x{ch}) does not fit {w}x{h}")
    if not 0 <= slide['desktop_y'] <= ch - band:
        raise SystemExit(f"{slide['out']}: desktop band at {slide['desktop_y']} leaves the 2:1 crop")
    return correct(rgb[y0:y0 + ch], slide)


def correct(crop, slide):
    """Global light and colour only: white balance, a tone curve on lightness, chroma."""
    crop = np.clip(crop * np.asarray(slide['wb'], np.float32), 0, 1)
    lab = cv2.cvtColor(crop, cv2.COLOR_RGB2LAB)  # float input: L 0..100, a/b around 0
    grid, curve = tone_lut(lab[..., 0], slide['tone'])
    lab[..., 0] = np.interp(lab[..., 0], grid, curve)
    lab[..., 1:] *= slide['chroma']
    out = np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB), 0, 1)
    return (out * 255 + 0.5).astype(np.uint8)


def object_position_y(slide, image):
    """The CSS object-position y that shows the recipe's 12:5 band in the desktop frame."""
    h, w = image.shape[:2]
    spare = h - round(w * 5 / 12)
    return 100 * slide['desktop_y'] / spare


TILE = 96

# Per tile, not per image. Measured 2026-09-23: an honest WebP re-encode of these
# slides never scores below 36 dB in any 96px tile, while one blurred 200px
# patch scores 28 dB in its tile yet still 40 dB over the whole image — a
# whole-image score would wave a redrawn face through.
MIN_TILE_PSNR = 33


def worst_tile_psnr(a, b):
    """The lowest PSNR of any tile, and where it is."""
    h, w = a.shape[:2]
    worst = (float('inf'), (0, 0))
    for y in range(0, h - TILE + 1, TILE):
        for x in range(0, w - TILE + 1, TILE):
            d = a[y:y + TILE, x:x + TILE].astype(np.float64) - b[y:y + TILE, x:x + TILE].astype(np.float64)
            mse = float(np.mean(d * d))
            score = float('inf') if mse == 0 else 10 * np.log10(255 ** 2 / mse)
            worst = min(worst, (score, (x, y)))
    return worst


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('--only', nargs='+', metavar='OUT', help='build or verify only these output files')
    args = parser.parse_args()
    failed = False
    for slide in SLIDES:
        if args.only and slide['out'] not in args.only:
            continue
        image = render(slide)
        target = OUT / slide['out']
        if args.verify:
            if not target.exists():
                print(f"MISSING  {slide['out']}")
                failed = True
                continue
            published = np.asarray(Image.open(target).convert('RGB'))
            if published.shape != image.shape:
                print(f"FAIL     {slide['out']}: {published.shape[1]}x{published.shape[0]}, recipe gives {image.shape[1]}x{image.shape[0]}")
                failed = True
                continue
            score, (x, y) = worst_tile_psnr(published, image)
            ok = score >= MIN_TILE_PSNR
            failed |= not ok
            print(f"{'ok  ' if ok else 'FAIL'}     {slide['out']}: worst tile {score:.1f} dB at {x},{y}")
        else:
            # No EXIF is written: camera files can carry GPS coordinates.
            if target.suffix == '.jpg':
                Image.fromarray(image).save(target, 'JPEG', quality=slide.get('jpeg_quality', JPEG_QUALITY), optimize=True,
                                            subsampling=slide.get('jpeg_subsampling', -1))
            else:
                Image.fromarray(image).save(target, 'WEBP', quality=WEBP_QUALITY, method=6)
            position = '' if 'box' in slide else f"; objectPosition '50% {object_position_y(slide, image):.0f}%'"
            print(f"wrote    {slide['out']}: {image.shape[1]}x{image.shape[0]} from {slide['source'].name}{position}")
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
