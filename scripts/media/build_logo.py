"""Build the website's two logo files from the current CASA wordmark.

    python3 scripts/media/build_logo.py

The source is the "casa-logo-neu" artwork CASA's new flyers use (2026-10-01),
kept outside the repository with the marketing materials. Two outputs:

- public/brand/casa-logo.png: the logo as it is, for light backgrounds.
- public/brand/casa-logo-on-dark.png: the same artwork for the dark footer.
  The sail, the sun and the waves keep their colours; only the black
  lettering ("CASA", "Internationale Sprachschule") becomes white. A pixel
  counts as lettering when it is neutral (no colour of its own), so the
  red, blue and yellow are never touched and every edge keeps its
  anti-aliasing through the alpha channel.

Both are downscaled to 1155x325, exactly a third of the 3465x975 source,
with no other change.
"""
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
SOURCE = Path.home() / 'Tasks/10-active/work/CASA - Various Tasks/casa-einheitstag-2026/artifacts/casa-logo-neu-3465.png'
OUT = REPO / 'public/brand'
SIZE = (1155, 325)

# Colour of its own: the spread between the strongest and weakest channel.
# The lettering is #1d1d1b (spread 2); the logo's colours spread 200 and more.
NEUTRAL_SPREAD = 48


def on_dark(image):
    rgba = np.asarray(image.convert('RGBA')).copy()
    rgb = rgba[..., :3].astype(np.int16)
    neutral = (rgb.max(axis=2) - rgb.min(axis=2)) < NEUTRAL_SPREAD
    rgba[neutral, :3] = 255
    return Image.fromarray(rgba, 'RGBA')


def main():
    source = Image.open(SOURCE).convert('RGBA')
    OUT.mkdir(parents=True, exist_ok=True)
    for name, image in (('casa-logo.png', source), ('casa-logo-on-dark.png', on_dark(source))):
        image.resize(SIZE, Image.LANCZOS).save(OUT / name, 'PNG', optimize=True)
        print(f'wrote    {name}: {SIZE[0]}x{SIZE[1]}')


if __name__ == '__main__':
    main()
