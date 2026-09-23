"""Build the homepage reel photographs from the original camera files.

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
OUT = REPO / 'public/media/casa'

# crop_y: top of the full-width 2:1 box in the original's pixels.
# desktop_y: top of the 12:5 desktop band inside that box, in the same pixels.
# tone: target lightness (0-100) for the crop's 5th, 50th and 95th percentile.
# chroma: saturation factor around neutral. wb: per-channel gains (R, G, B).
SLIDES = [
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
]

WEBP_QUALITY = 90


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
    y0 = slide['crop_y']
    ch = w // 2
    band = round(w * 5 / 12)
    if y0 < 0 or y0 + ch > h:
        raise SystemExit(f"{slide['out']}: 2:1 crop at y {y0} ({w}x{ch}) does not fit {w}x{h}")
    if not 0 <= slide['desktop_y'] <= ch - band:
        raise SystemExit(f"{slide['out']}: desktop band at {slide['desktop_y']} leaves the 2:1 crop")
    crop = rgb[y0:y0 + ch]
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
    args = parser.parse_args()
    failed = False
    for slide in SLIDES:
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
            Image.fromarray(image).save(target, 'WEBP', quality=WEBP_QUALITY, method=6)
            print(f"wrote    {slide['out']}: {image.shape[1]}x{image.shape[0]} from {slide['source'].name}; "
                  f"objectPosition '50% {object_position_y(slide, image):.0f}%'")
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
