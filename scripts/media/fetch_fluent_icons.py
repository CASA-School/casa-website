#!/usr/bin/env python3
"""The site's 3D icons, from Microsoft's Fluent Emoji (MIT, github.com/microsoft/fluentui-emoji).

Each icon is the set's 256px 3D render, resized to 160px (40px at 4x, room for the hover lift)
and written as WebP to public/media/icons/3d/<slug>.webp, beside the set's licence. Run it again
after adding a slug below; src/config/icons-3d.ts says which menu item shows which icon.

    python3 scripts/media/fetch_fluent_icons.py
"""

import io
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

SOURCE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main'
OUT = Path(__file__).resolve().parents[2] / 'public/media/icons/3d'
SIZE = 160

# slug -> the set's folder name
ICONS = {
    'books': 'Books',
    'crescent-moon': 'Crescent moon',
    'memo': 'Memo',
    'stethoscope': 'Stethoscope',
    'spiral-calendar': 'Spiral calendar',
    'office-building': 'Office building',
    'houses': 'Houses',
    'house-with-garden': 'House with garden',
    'key': 'Key',
    'pencil': 'Pencil',
    'graduation-cap': 'Graduation cap',
    'seedling': 'Seedling',
    'busts-in-silhouette': 'Busts in silhouette',
    'handshake': 'Handshake',
    'abacus': 'Abacus',
    'briefcase': 'Briefcase',
    'speech-balloon': 'Speech balloon',
    'newspaper': 'Newspaper',
    'bar-chart': 'Bar chart',
    'globe-showing-europe-africa': 'Globe showing europe-africa',
}


def fetch(path: str) -> bytes:
    with urllib.request.urlopen(f'{SOURCE}/{urllib.parse.quote(path)}', timeout=30) as response:
        return response.read()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'LICENSE.txt').write_bytes(fetch('LICENSE'))
    for slug, folder in ICONS.items():
        file = folder.lower().replace(' ', '_') + '_3d.png'
        image = Image.open(io.BytesIO(fetch(f'assets/{folder}/3D/{file}'))).convert('RGBA')
        image = image.resize((SIZE, SIZE), Image.LANCZOS)
        target = OUT / f'{slug}.webp'
        image.save(target, 'WEBP', quality=90, method=6)
        print(f'{target.name} {target.stat().st_size / 1024:.1f} KB')


if __name__ == '__main__':
    main()
