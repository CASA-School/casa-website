"""Background retouch for a camera photograph: the one declared exception to rule 4.

CLAUDE.md hard rule 4 keeps CASA's photographs source-faithful: crop, resize,
light and colour only. On 2026-10-09 Rahman approved one exception: the
classroom behind the learners in slot 90 (`course-medical-writing.webp`, the
German for Medical page) had stained walls and a smeared whiteboard. This module
cleans exactly those surfaces and nothing else. No image model is involved; it
is classical image processing on fixed regions, deterministic (a fixed seed), so
`build_reel.py --verify` still proves the published file is this recipe applied
to the original.

The people are never changed. Every region is drawn by hand round them with a
margin; a region may grow only into pixels that are wall-coloured (measured on
this frame: lightness above 47, almost no red-green, a warm yellow), it never
enters PROTECT (a white collar is wall-coloured too), and the blend fades
inward, so not one pixel outside a region changes. Checked when it was made:
outside the regions the maximum change is 0, and no hair-, skin-, cap- or
clothes-coloured pixel changes by more than 3 levels.

- Walls: the stains (the mid frequencies) are replaced by a smooth surface lifted
  to the wall's own brighter tone (its 72nd percentile of lightness), and half of
  the fine plaster grain is kept, so the wall reads as clean paint, not plastic.
- The door: an edge-preserving filter, so its frame and panel lines stay crisp
  while the marks flatten; lifted to the same tone.
- The whiteboard: a clean surface fitted to the board's own light (a quadratic
  in x and y, refitted without the marks), plus a little grain.
"""
import cv2
import numpy as np

# Slot 90's regions, in the coordinates of its 2250 × 1500 recipe output.
MEDICAL_WRITING = {
    'board': [(1452, 145), (2250, 145), (2250, 744), (1855, 744), (1855, 718), (1655, 718),
              (1655, 592), (1575, 592), (1575, 492), (1452, 492)],
    # Each wall region with how far (px) it may grow into wall-coloured pixels.
    'walls': [
        ([(668, 0), (1440, 0), (1440, 492), (1390, 498), (1384, 548), (1382, 594), (1318, 600), (1290, 640),
          (1284, 688), (1248, 688), (1244, 598), (1206, 550), (1100, 538), (1000, 546), (956, 578), (946, 640),
          (940, 722), (834, 722), (830, 688), (812, 630), (668, 622)], 40),  # between the heads
        ([(1440, 0), (2250, 0), (2250, 126), (1440, 126)], 0),  # above the board
        ([(0, 0), (304, 0), (304, 690), (298, 882), (245, 904), (178, 933), (118, 964), (78, 1002), (44, 1058),
          (38, 1100), (0, 1100)], 6),  # left wall, along the first learner's shoulder
        ([(1860, 776), (2250, 776), (2250, 950), (2070, 950), (2070, 876), (1964, 876), (1964, 850), (1860, 850)], 10),
    ],
    'door': [(304, 0), (668, 0), (668, 618), (600, 626), (560, 628), (450, 626), (380, 640), (330, 668), (304, 690)],
    'protect': [[(1328, 622), (1442, 612), (1456, 752), (1388, 752), (1336, 676)]],  # the fourth learner's collar
}


def _mask(shape, polys):
    m = np.zeros(shape, np.uint8)
    for poly in polys:
        cv2.fillPoly(m, [np.array(poly, np.int32)], 255)
    return m


def _feather(m, r):
    """A blend weight that fades inward and is zero outside the region."""
    inner = cv2.erode((m > 0).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (6 * r + 1, 6 * r + 1)))
    return cv2.GaussianBlur(inner.astype(np.float32), (0, 0), r) * (m > 0)


def _masked_blur(x, m, sigma):
    mf = (m > 0).astype(np.float32)
    num = cv2.GaussianBlur(x * mf[..., None], (0, 0), sigma)
    den = cv2.GaussianBlur(mf, (0, 0), sigma)[..., None]
    return num / np.maximum(den, 1e-4)


def clean_background(image, regions):
    """`image`: uint8 RGB. Returns the same size, with only the declared surfaces changed."""
    img = image.astype(np.float32) / 255.0
    h, w = img.shape[:2]
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    lightness, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    wallish = ((lightness > 47) & (np.abs(a) < 6.5) & (b > -4) & (b < 24)).astype(np.uint8) * 255
    protect = _mask((h, w), regions['protect'])

    def grow(poly_mask, px):
        if not px:
            return poly_mask
        ring = cv2.dilate(poly_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1)))
        m = cv2.bitwise_or(poly_mask, cv2.bitwise_and(ring, wallish))
        m = cv2.bitwise_and(m, cv2.bitwise_not(protect))
        return cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

    walls = np.zeros((h, w), np.uint8)
    for poly, px in regions['walls']:
        walls = cv2.bitwise_or(walls, grow(_mask((h, w), [poly]), px))
    door = cv2.bitwise_and(grow(_mask((h, w), [regions['door']]), 14), cv2.bitwise_not(walls))
    board = _mask((h, w), [regions['board']])

    target = np.percentile(lightness[walls > 0], 72)

    def lift(x, m):
        l = cv2.cvtColor(np.clip(x, 0, 1), cv2.COLOR_RGB2LAB)[..., 0]
        return x * (target / max(float(l[m > 0].mean()), 1e-3))

    fine = img - cv2.GaussianBlur(img, (0, 0), 2.2)
    out = img.copy()

    wall = np.clip(lift(_masked_blur(img, walls, 70), walls) + 0.5 * fine, 0, 1)
    weight = _feather(walls, 1)[..., None]
    out = out * (1 - weight) + wall * weight

    flat = img.copy()
    for _ in range(3):
        flat = cv2.bilateralFilter(flat, d=0, sigmaColor=0.05, sigmaSpace=18)
    flat = np.clip(lift(flat, door) * 0.985 + 0.35 * fine, 0, 1)
    weight = _feather(door, 1)[..., None]
    out = out * (1 - weight) + flat * weight

    rng = np.random.default_rng(90)
    ys, xs = np.nonzero(board)
    pick = rng.choice(len(xs), size=min(60000, len(xs)), replace=False)
    px, py = xs[pick] / w, ys[pick] / h
    terms = np.stack([np.ones_like(px), px, py, px * px, px * py, py * py], 1)
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32) / w, np.arange(h, dtype=np.float32) / h)
    grid = np.stack([np.ones_like(gx), gx, gy, gx * gx, gx * gy, gy * gy], -1)
    surface = np.zeros_like(img)
    for c in range(3):
        v = img[ys[pick], xs[pick], c]
        keep = np.ones_like(v, bool)
        for _ in range(4):  # refit without the marks, which sit darker than the board
            coef, *_ = np.linalg.lstsq(terms[keep], v[keep], rcond=None)
            residual = v - terms @ coef
            keep = residual > -1.5 * residual[keep].std()
        surface[..., c] = grid @ coef
    surface = np.clip(surface + rng.normal(0, 0.006, surface.shape).astype(np.float32), 0, 1)
    weight = _feather(board, 2)[..., None]
    out = out * (1 - weight) + surface * weight

    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)
