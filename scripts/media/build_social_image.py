"""Build the actual 1200x630 social card from current logo and real lesson photo.

Typography is normal graphic artwork. Photography is fitted whole, never
generated or stretched. Font paths may be overridden on other systems.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

REPO = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--heading-font', default='/System/Library/Fonts/Supplemental/Georgia.ttf')
    parser.add_argument('--body-font', default='/System/Library/Fonts/Supplemental/Arial.ttf')
    args = parser.parse_args()
    card = Image.new('RGB', (1200, 630), '#faf7f1')
    logo = Image.open(REPO / 'public/brand/casa-logo.png').convert('RGBA')
    logo.thumbnail((425, 125), Image.Resampling.LANCZOS)
    card.paste(logo, (54, 56), logo)
    photo = Image.open(REPO / 'public/media/casa/hero-classroom-lesson.webp').convert('RGB')
    photo = ImageOps.contain(photo, (580, 500), Image.Resampling.LANCZOS)
    card.paste(photo, (600, (630 - photo.height) // 2))
    draw = ImageDraw.Draw(card)
    heading = ImageFont.truetype(args.heading_font, 55)
    body = ImageFont.truetype(args.body_font, 25)
    draw.multiline_text((54, 255), 'Deutsch lernen.\nBremen erleben.', font=heading, fill='#1e2c3b', spacing=12)
    draw.text((56, 439), 'Kurse · Prüfungen · Unterkunft', font=body, fill='#495764')
    draw.text((56, 513), 'casa-bremen.de', font=body, fill='#235c91')
    for i, color in enumerate(['#235c91', '#b74746', '#ecc058']):
        draw.rectangle((i * 400, 616, (i + 1) * 400, 630), fill=color)
    out = REPO / 'public/images/og-default.png'
    card.save(out, optimize=True)
    print(f'{out}: 1200x630')


if __name__ == '__main__':
    main()
