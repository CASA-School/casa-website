"""Choose each photograph's object-position per breakpoint so no head is cut.

Every photo box on the site is `object-cover`. A photo shown in a box of another
shape loses a band at the top and bottom (or the sides), and which band depends
on its object-position. This script takes a crawl of the running site
(scripts/media/crop_audit.mjs: every <img> under /media/casa at many widths,
with its box size) and, for every photograph that has a FOCUS box below, finds
the object-position that keeps the whole focus box visible in every box the
photo is shown in at that width.

FOCUS boxes are fractions of the published file (x0, y0, x1, y1): every head
WITH a little room above the hair, plus the subject that must stay (the
teacher, the board, the hand and pen). They were read off gridded copies of
each file on 2026-10-02.

    node scripts/media/crop_audit.mjs http://localhost:3055 /tmp/audit.json
    python3 scripts/media/fit_positions.py /tmp/audit.json
    python3 scripts/media/fit_positions.py /tmp/audit.json --check   # after: list any cut

It prints, per photo, the Tailwind classes for `position` in
src/config/content/photo-numbers.ts, and every box where no position avoids a
cut (the fix there is a different crop, layout or photograph, not a position). Breakpoints are Tailwind's: base, sm 640, md 768, lg 1024, xl 1280,
2xl 1536.
"""
import json
import sys
from collections import defaultdict

# Per photograph: `core`, the box that must stay whole (the main subject), and
# `heads`, every head as (x0, x1, top, chin) with ~3% room above the hair. A
# frame edge may leave a person out entirely, but it may never run through a
# head, and the top edge may never cut into the room above a head it shows.
PHOTOS = {
    'hero-classroom-lesson.webp': {'core': (0.10, 0.22, 0.78, 0.62), 'heads': [(0.13, 0.24, 0.26, 0.40), (0.62, 0.76, 0.29, 0.46), (0.48, 0.60, 0.58, 0.75)]},
    'course-intensive-class.webp': {'core': (0.32, 0.36, 0.63, 0.60), 'heads': [(0.02, 0.10, 0.38, 0.53), (0.10, 0.17, 0.38, 0.52), (0.20, 0.28, 0.37, 0.52), (0.32, 0.40, 0.40, 0.54), (0.55, 0.63, 0.38, 0.52), (0.78, 0.89, 0.37, 0.54)]},
    'course-intensive-hero.webp': {'core': (0.39, 0.28, 0.67, 0.75), 'heads': [(0.02, 0.08, 0.30, 0.45), (0.20, 0.31, 0.30, 0.45), (0.39, 0.46, 0.33, 0.48), (0.60, 0.67, 0.30, 0.45), (0.81, 0.90, 0.28, 0.47)]},
    'course-intensive-story.webp': {'core': (0.28, 0.08, 0.62, 0.80), 'heads': [(0.28, 0.42, 0.09, 0.35), (0.47, 0.62, 0.33, 0.75), (0.73, 0.86, 0.42, 0.70), (0.86, 1.00, 0.40, 0.75)]},
    'course-evening-table.webp': {'core': (0.20, 0.25, 0.80, 0.62), 'heads': [(0.20, 0.39, 0.42, 0.62), (0.42, 0.60, 0.27, 0.53), (0.60, 0.80, 0.28, 0.53), (0.58, 0.70, 0.24, 0.40)]},
    'course-evening-hero.webp': {'core': (0.17, 0.05, 0.80, 0.95), 'heads': [(0.17, 0.42, 0.40, 0.98), (0.40, 0.58, 0.15, 0.70), (0.58, 0.80, 0.15, 0.70), (0.62, 0.75, 0.05, 0.35)]},
    'course-special-smartboard.webp': {'core': (0.10, 0.15, 0.75, 0.70), 'heads': [(0.48, 0.60, 0.27, 0.42), (0.55, 0.68, 0.52, 0.68), (0.62, 0.73, 0.53, 0.68), (0.70, 0.84, 0.55, 0.72), (0.84, 0.98, 0.60, 0.80)]},
    'course-special-hero.webp': {'core': (0.10, 0.08, 0.78, 0.75), 'heads': [(0.59, 0.68, 0.09, 0.28), (0.64, 0.73, 0.46, 0.66), (0.73, 0.82, 0.47, 0.68), (0.84, 0.99, 0.50, 0.72)]},
    'course-bildungszeit-class.webp': {'core': (0.04, 0.25, 0.62, 0.60), 'heads': [(0.04, 0.21, 0.25, 0.55), (0.43, 0.62, 0.32, 0.55), (0.48, 0.60, 0.27, 0.40), (0.73, 0.90, 0.06, 0.30)]},
    'course-bildungszeit-hero.webp': {'core': (0.04, 0.11, 0.88, 0.90), 'heads': [(0.04, 0.26, 0.36, 0.85), (0.72, 0.88, 0.11, 0.40), (0.45, 0.60, 0.45, 0.90)]},
    'home-class-welcome.webp': {'core': (0.10, 0.11, 0.97, 0.70), 'heads': [(0.10, 0.26, 0.12, 0.30), (0.53, 0.68, 0.40, 0.62), (0.80, 0.97, 0.35, 0.60)]},
    'group-course-bremen-musicians.jpg': {'core': (0.25, 0.10, 0.80, 0.90), 'heads': []},
    'group-course-walking-bremen.jpg': {'core': (0.18, 0.20, 0.75, 0.60), 'heads': [(0.18, 0.32, 0.22, 0.42), (0.40, 0.50, 0.24, 0.40), (0.60, 0.75, 0.20, 0.42), (0.82, 0.90, 0.28, 0.45), (0.92, 1.00, 0.30, 0.45)]},
    'group-course-lunch-table.jpg': {'core': (0.03, 0.03, 0.98, 0.65), 'heads': [(0.03, 0.3, 0.09, 0.5), (0.26, 0.42, 0.23, 0.52), (0.4, 0.53, 0.19, 0.49), (0.52, 0.6, 0.25, 0.46), (0.58, 0.66, 0.25, 0.42), (0.65, 0.75, 0.13, 0.39), (0.75, 0.83, 0.05, 0.29), (0.8, 0.91, 0.25, 0.48), (0.85, 0.99, 0.03, 0.45)]},
    'learners-writing-class.jpg': {'core': (0.05, 0.33, 0.60, 0.75), 'heads': [(0.08, 0.20, 0.42, 0.60), (0.20, 0.28, 0.40, 0.55), (0.32, 0.42, 0.37, 0.55), (0.48, 0.57, 0.34, 0.50)]},
    'exam-preparation-writing.jpg': {'core': (0.20, 0.00, 0.80, 0.55), 'heads': []},
    'exam-b2-hero.webp': {'core': (0.30, 0.00, 0.70, 0.80), 'heads': []},
    'exam-b2-class.webp': {'core': (0.15, 0.10, 0.85, 0.60), 'heads': [(0.17, 0.36, 0.11, 0.42), (0.53, 0.70, 0.10, 0.40)]},
    'exam-c1-speaking.webp': {'core': (0.25, 0.15, 0.85, 0.65), 'heads': [(0.29, 0.43, 0.19, 0.45), (0.66, 0.83, 0.17, 0.45)]},
    'exam-story-writing.webp': {'core': (0.20, 0.15, 0.82, 0.75), 'heads': [(0.22, 0.42, 0.17, 0.48), (0.60, 0.78, 0.20, 0.50)]},
    'individual-tutoring.jpg': {'core': (0.18, 0.01, 0.86, 0.60), 'heads': [(0.20, 0.40, 0.01, 0.50), (0.58, 0.85, 0.01, 0.45)]},
    'community-shared-meal.webp': {'core': (0.05, 0.24, 0.86, 0.75), 'heads': [(0.05, 0.18, 0.35, 0.55), (0.22, 0.30, 0.28, 0.40), (0.30, 0.38, 0.26, 0.38), (0.62, 0.72, 0.28, 0.45), (0.78, 0.86, 0.30, 0.45)]},
    'study-learners-attentive.webp': {'core': (0.05, 0.01, 0.72, 0.55), 'heads': [(0.05, 0.30, 0.02, 0.42), (0.40, 0.70, 0.01, 0.42)]},
    'home-community-breakfast.webp': {'core': (0.20, 0.10, 0.85, 0.55), 'heads': [(0.40, 0.66, 0.10, 0.36)]},
    'bremen-schnoor-houses.jpg': {'core': (0.20, 0.08, 0.75, 0.80), 'heads': []},
    'classroom-map-vocabulary.jpg': {'core': (0.20, 0.20, 0.80, 0.80), 'heads': []},
    # The second pass (2026-10-08), read off gridded copies of each file.
    'course-company-colleagues.webp': {'core': (0.20, 0.20, 0.92, 0.88), 'heads': [(0.32, 0.46, 0.21, 0.45), (0.61, 0.81, 0.18, 0.47)]},
    'course-company-colleagues-hero.webp': {'core': (0.12, 0.08, 0.92, 0.95), 'heads': [(0.35, 0.47, 0.08, 0.48), (0.60, 0.76, 0.05, 0.50)]},
    'course-company-focus.webp': {'core': (0.15, 0.1, 0.85, 0.6), 'heads': [(0.17, 0.36, 0.11, 0.42), (0.53, 0.7, 0.1, 0.4)]},
    'course-company-writing.webp': {'core': (0.1, 0.15, 0.95, 0.88), 'heads': []},
    'course-medical-dialogue.webp': {'core': (0.10, 0.17, 0.92, 0.85), 'heads': [(0.20, 0.43, 0.17, 0.48), (0.65, 0.85, 0.18, 0.48)]},
    'course-medical-dialogue-hero.webp': {'core': (0.12, 0.08, 0.90, 0.95), 'heads': [(0.20, 0.42, 0.08, 0.62), (0.62, 0.78, 0.12, 0.60)]},
    'course-medical-writing.webp': {'core': (0.047, 0.242, 0.569, 0.72), 'heads': [(0.076, 0.19, 0.345, 0.549), (0.19, 0.266, 0.322, 0.493), (0.304, 0.398, 0.288, 0.493), (0.455, 0.541, 0.254, 0.436)]},
    'course-bildungszeit-learner.webp': {'core': (0.15, 0.0, 0.75, 0.80), 'heads': [(0.21, 0.44, 0.0, 0.47)]},
    'exam-c1-study.webp': {'core': (0.181, 0.15, 0.878, 0.75), 'heads': [(0.204, 0.428, 0.17, 0.48), (0.631, 0.833, 0.2, 0.5)]},
    'exam-c1-study-hero.webp': {'core': (0.2, 0.034, 0.82, 0.994), 'heads': [(0.22, 0.42, 0.066, 0.562), (0.6, 0.78, 0.114, 0.594)]},
    'team-lesson-wide.webp': {'core': (0.14, 0.10, 0.96, 0.80), 'heads': [(0.58, 0.65, 0.23, 0.36), (0.68, 0.81, 0.35, 0.58), (0.81, 0.93, 0.40, 0.60)]},
}

BANDS = [('', 0), ('sm', 640), ('md', 768), ('lg', 1024), ('xl', 1280), ('2xl', 1536)]


def band(width):
    name = ''
    for key, start in BANDS:
        if width >= start:
            name = key
    return name


def visible_fraction(row):
    scale = max(row['W'] / row['nw'], row['H'] / row['nh'])
    return min(1.0, row['W'] / scale / row['nw']), min(1.0, row['H'] / scale / row['nh'])


def faults(photo, row, px, py):
    """What a box with object-position (px, py) would cut, as a list of strings."""
    vx, vy = visible_fraction(row)
    left, top = px * (1 - vx), py * (1 - vy)
    right, bottom = left + vx, top + vy
    eps = 0.004
    out = []
    x0, y0, x1, y1 = photo['core']
    if x0 < left - eps or x1 > right + eps or y0 < top - eps or y1 > bottom + eps:
        out.append('core')
    for hx0, hx1, htop, hchin in photo['heads']:
        shown_y = htop < bottom and hchin > top
        shown_x = hx0 < right and hx1 > left
        if shown_y and (hx0 + eps < left < hx1 - eps or hx0 + eps < right < hx1 - eps):
            out.append(f'head {hx0:.2f}-{hx1:.2f} cut at the side')
        if shown_x and (htop + eps < top < hchin - eps or htop + eps < bottom < hchin - eps):
            out.append(f'head {hx0:.2f}-{hx1:.2f} cut at top/bottom')
    return out


def parse_position(value):
    parts = (value.split() + ['50%', '50%'])[:2]
    named = {'left': 0, 'top': 0, 'center': 50, 'right': 100, 'bottom': 100}
    return [float(p[:-1]) / 100 if p.endswith('%') else named.get(p, 50) / 100 for p in parts]


def check(rows):
    """--check: report every cut in the crawl as rendered (with the positions in place)."""
    cuts = 0
    for row in rows:
        name = row['src'].rsplit('/', 1)[-1]
        if name not in PHOTOS or not row['nw'] or row['fit'] != 'cover':
            continue
        px, py = parse_position(row['pos'])
        for fault in faults(PHOTOS[name], row, px, py):
            if fault != 'core':
                cuts += 1
                print(f"{row['width']}px {row['url']} {name} ({row['W']:.0f}x{row['H']:.0f}, {row['pos']}): {fault}")
    print(f'{cuts} head cuts')
    return cuts


def main():
    rows = json.load(open(sys.argv[1]))
    if '--check' in sys.argv:
        sys.exit(1 if check(rows) else 0)
    per = defaultdict(lambda: defaultdict(list))
    for row in rows:
        name = row['src'].rsplit('/', 1)[-1]
        if name in PHOTOS and row['nw'] and row['fit'] == 'cover':
            per[name][band(row['width'])].append(row)
    grid = [i / 50 for i in range(51)]
    for name in sorted(per):
        photo = PHOTOS[name]
        classes, problems, previous = [], [], '50% 50%'
        for key, _ in BANDS:
            boxes = per[name].get(key)
            if not boxes:
                continue
            best = None
            for px in grid:
                for py in grid:
                    bad = sum(len(faults(photo, row, px, py)) for row in boxes)
                    cost = (bad, abs(px - 0.5) + abs(py - 0.5))
                    if best is None or cost < best[0]:
                        best = (cost, px, py)
            (bad, _), px, py = best
            if bad:
                for row in boxes:
                    for fault in faults(photo, row, px, py):
                        problems.append(f"{key or 'base'} {row['width']}px {row['url']} ({row['W']:.0f}x{row['H']:.0f}): {fault}")
            value = f"{round(px * 100)}% {round(py * 100)}%"
            if value != previous:
                prefix = f'{key}:' if key else ''
                classes.append(f"{prefix}object-[{value.replace(' ', '_')}]")
                previous = value
        print(f"{name}: '{' '.join(classes)}'")
        for problem in sorted(set(problems)):
            print(f"    !! {problem}")


if __name__ == '__main__':
    main()
