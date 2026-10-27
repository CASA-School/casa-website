"""Build the team portraits (public/media/casa/team/) from CASA's 2026-09-10 team shoot.

Each portrait is the colleague's own photograph — the file Rahman named after them, or the frame he
chose (Meike: IMG_0342, 2026-10-27) — cropped where a recipe says so, resized, and given the site's
warm editorial grade from build_reel.py: the shared warm white balance, the tone curve to
EDITORIAL_TONE and EDITORIAL_CHROMA. Global light and colour only; nothing is retouched, moved or
generated (CLAUDE.md hard rules 3 and 4).

SHARPNESS. The first set (1000px, WebP quality 82) went through the image server, which re-encoded it
at quality 75 and lost about half its fine detail: skin read plastic, hair soft. Even at quality 90 the
server's encoder kept only three quarters. So the team page shows these files as they are
(`unoptimized`, team-directory.tsx): 800px — a card is at most 250px wide, 500 on a retina screen —
at WebP quality 88, which keeps the detail of the unencoded image (measured 2026-10-27). The small
contact avatar still goes through the server, at quality 90 (person-monogram.tsx).

    python3 scripts/media/build_team_portraits.py            # write public/media/casa/team/*.webp
    python3 scripts/media/build_team_portraits.py --sheet    # and a before/after sheet in output/

The originals live outside the repository (~/Downloads/CASA Team Photos 2026), so this runs on the
machine that holds them.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from build_reel import EDITORIAL_CHROMA, EDITORIAL_TONE, correct, load, warm

REPO = Path(__file__).resolve().parents[2]
SOURCE = Path.home() / 'Downloads/CASA Team Photos 2026'
OUT = REPO / 'public/media/casa/team'
WIDTH = 800
QUALITY = 88

GRADE = {'wb': warm((1.0, 1.0, 1.0)), 'tone': EDITORIAL_TONE, 'chroma': EDITORIAL_CHROMA}

# slug: the original, and a box (x, y, width, height in the upright original) where the frame needs one.
PORTRAITS = {
    'tanja-langenickel': {'file': 'Tanja.JPG'},
    'natalia-sostres': {'file': 'Natalia.JPG'},
    # IMG_0342 (Rahman, 2026-10-27): she stands right of centre; the 2:3 box centres her face, at 36% of
    # its height, where the cards and the contact avatar's zoom expect it.
    'meike-grosse-hundrup': {'file': 'IMG_0342.JPG', 'box': (1130, 946, 2800, 4200)},
    'mareike-thomeczek': {'file': 'Mareike.JPG'},
    'ina-eismann': {'file': 'Ina.JPG'},
    'claudia-groene': {'file': 'Claudia G..JPG'},
    'alissa-trouillet': {'file': 'Alissa.JPG'},
    'stella-dreifke': {'file': 'Stella.JPG'},
    'muezeyyen-ege': {'file': 'Müzzeyen.JPG'},
    'mikis-weber': {'file': 'Mikis.JPG'},
    'maria-alexeew': {'file': 'Maria.JPG'},
    'helmut-kehlenbeck': {'file': 'Helmut.JPG'},
    'christian-hetzner': {'file': 'Christian.JPG'},
    'alina-baldowski': {'file': 'Alina.JPG'},
}


def render(recipe: dict) -> np.ndarray:
    rgb = load(SOURCE / recipe['file'])
    h, w = rgb.shape[:2]
    if 'box' in recipe:
        x0, y0, bw, bh = recipe['box']
        if x0 < 0 or y0 < 0 or x0 + bw > w or y0 + bh > h:
            raise SystemExit(f"{recipe['file']}: box {recipe['box']} does not fit {w}x{h}")
        rgb = rgb[y0:y0 + bh, x0:x0 + bw]
    # Resized first (only ever down), then graded: the grade is global, so the order changes nothing visible.
    size = (WIDTH, round(rgb.shape[0] * WIDTH / rgb.shape[1]))
    small = cv2.resize(rgb, size, interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    return correct(small, GRADE)


def main() -> None:
    sheet = '--sheet' in sys.argv
    pairs = []
    for slug, recipe in PORTRAITS.items():
        before = Image.open(OUT / f'{slug}.webp').convert('RGB') if sheet and (OUT / f'{slug}.webp').exists() else None
        image = Image.fromarray(render(recipe))
        target = OUT / f'{slug}.webp'
        image.save(target, 'WEBP', quality=QUALITY, method=6)
        print(f'{target.name:28s} {image.width}x{image.height} {target.stat().st_size // 1024} KB')
        if before is not None:
            pairs.append((before, image))
    if sheet and pairs:
        tile = 300
        canvas = Image.new('RGB', (len(pairs) * (tile + 10) + 10, 2 * round(tile * 1.5) + 30), 'white')
        for i, (before, after) in enumerate(pairs):
            for row, image in enumerate((before, after)):
                thumb = image.resize((tile, round(tile * image.height / image.width)), Image.LANCZOS)
                canvas.paste(thumb, (10 + i * (tile + 10), 10 + row * (round(tile * 1.5) + 10)))
        path = REPO / 'output/team-photos/grade-before-after.jpg'
        path.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(path, quality=88)
        print(path)


if __name__ == '__main__':
    main()
