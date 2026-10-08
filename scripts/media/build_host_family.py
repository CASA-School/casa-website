"""Export approved room illustrations; these are not camera-source recipes.

Masters, references, prompts and checksums: host_family_illustrations.json.
The small corner disclosure is rendered by CasaImage, not baked into pixels.
"""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parents[2]
MANIFEST = json.loads(Path(__file__).with_name('host_family_illustrations.json').read_text())
EXPORTS = [
    ('living', 'host-family-room.jpg', (2420, 1815)),
    ('living', 'host-family-living-hero.webp', (2420, 1008)),
    ('kitchen', 'host-family-kitchen.webp', (2250, 1500)),
    ('kitchen-detail', 'host-family-kitchen-detail.webp', (2560, 1707)),
    ('kitchen-detail', 'host-family-kitchen-hero.webp', (2560, 1067)),
    ('bathroom', 'host-family-guest-bathroom.webp', (2600, 1733)),
    ('dining', 'host-family-dining-table.webp', (1700, 1275)),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--masters', type=Path, default=Path.home() / MANIFEST['mastersRoot'])
    args = parser.parse_args()
    for item in MANIFEST['images']:
        master = args.masters / (item['name'] + '.png')
        if hashlib.sha256(master.read_bytes()).hexdigest() != item['sha256']:
            raise ValueError(f'Unapproved master: {master}')
    for name, filename, size in EXPORTS:
        image = Image.open(args.masters / (name + '.png')).convert('RGB')
        # Generated masters need resampling to preserve the existing delivery sizes.
        # Camera photographs in build_reel.py are never upscaled.
        image = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS)
        path = REPO / 'public/media/casa' / filename
        image.save(path, quality=90)
        print(f'{filename}: {size[0]}x{size[1]}')


if __name__ == '__main__':
    main()
