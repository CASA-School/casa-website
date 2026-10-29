"""Build the website's icons (favicon, tab icon, iPhone and Android icons) from the CASA logo.

    python3 scripts/media/build_icons.py

The mark is the logo's own picture, without the lettering: the red sail, the yellow sun and
the blue wave, cut out of the logo artwork pixel by pixel (no redrawing, no generated shapes)
and set on a white tile. At 16 pixels a letter turns to mush, but three colours still read as
CASA. Until 2026-10-29 the icons were a blue square with a „C", and the PNG versions carried a
grey checkerboard painted into their pixels, which an iPhone showed on the home screen.

The source is the 3465x975 artwork build_logo.py uses; without it, public/brand/casa-logo.png
(a third of its size) serves. Outputs:

- src/app/favicon.ico: 16, 32 and 48 pixels, for browsers and Google's results.
- src/app/icon.png: 192 pixels (Google wants a multiple of 48), the tab icon.
- src/app/apple-icon.png: 180 pixels, full bleed and opaque; iOS rounds the corners itself.
- public/icons/icon-512.png and public/icons/maskable-512.png, for the web app manifest
  (src/app/manifest.ts); the maskable one keeps the picture inside the safe circle.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
HIRES = Path.home() / 'Tasks/10-active/work/CASA - Various Tasks/casa-einheitstag-2026/artifacts/casa-logo-neu-3465.png'
FALLBACK = REPO / 'public/brand/casa-logo.png'

# The three shapes in the 1155x325 logo, measured by colour, and how each is told from the rest.
PARTS = {
    'sail': ((55, 25, 200, 150), lambda r, g, b: (r > 150) & (g < 120)),
    'sun': ((930, 0, 1060, 120), lambda r, g, b: (r > 150) & (g > 130) & (b < 140)),
    'wave': ((0, 150, 292, 190), lambda r, g, b: (b > 150) & (r < 140)),
}
WHITE = (255, 255, 255, 255)
S = 1024  # drawn at this size, then scaled down


def load_parts():
    source = HIRES if HIRES.exists() else FALLBACK
    logo = Image.open(source).convert('RGBA')
    scale = logo.width / 1155
    parts = {}
    for name, (box, keep) in PARTS.items():
        im = logo.crop(tuple(round(v * scale) for v in box))
        a = np.array(im)
        mask = keep(a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int))
        a[..., 3] = np.where(mask, a[..., 3], 0)
        im = Image.fromarray(a)
        parts[name] = im.crop(im.getbbox())
    return parts


def fit(im, w=None, h=None):
    if w:
        h = round(im.height * w / im.width)
    else:
        w = round(im.width * h / im.height)
    return im.resize((w, h), Image.LANCZOS)


def mark(parts, inset):
    """The picture alone on a transparent square, its content `inset` pixels from each edge."""
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    box = S - 2 * inset
    sail = fit(parts['sail'], h=round(box * 0.47))
    sun = fit(parts['sun'], w=round(box * 0.33))
    wave = fit(parts['wave'], w=box)
    # Sail on the left, the sun high on the right, the wave across the bottom, as in the logo.
    layer.alpha_composite(sail, (inset + round(box * 0.06), inset + round(box * 0.17)))
    layer.alpha_composite(sun, (inset + box - sun.width - round(box * 0.04), inset + round(box * 0.04)))
    layer.alpha_composite(wave, (inset, inset + box - wave.height - round(box * 0.08)))
    return layer


def tile(parts, radius, inset):
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(out).rounded_rectangle((0, 0, S - 1, S - 1), radius=radius, fill=WHITE)
    out.alpha_composite(mark(parts, inset))
    return out


def main():
    parts = load_parts()
    rounded = tile(parts, radius=220, inset=90)
    square = tile(parts, radius=0, inset=110)
    maskable = tile(parts, radius=0, inset=205)  # inside the 80 % safe circle

    small = lambda size: rounded.resize((size, size), Image.LANCZOS)
    # In a browser tab every pixel counts: the favicon's picture fills more of its tile.
    tile(parts, radius=200, inset=50).save(REPO / 'src/app/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    small(192).save(REPO / 'src/app/icon.png', optimize=True)
    square.convert('RGB').resize((180, 180), Image.LANCZOS).save(REPO / 'src/app/apple-icon.png', optimize=True)

    icons = REPO / 'public/icons'
    icons.mkdir(exist_ok=True)
    small(512).save(icons / 'icon-512.png', optimize=True)
    maskable.convert('RGB').resize((512, 512), Image.LANCZOS).save(icons / 'maskable-512.png', optimize=True)
    print('icons written')


if __name__ == '__main__':
    main()
