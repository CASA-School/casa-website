# Responsive layout and browsers

Rahman, 2026-10-12: visitors open the site on laptops of every size, tablets both ways, phones
both ways, folding phones and large screens, in Chrome, Safari, Firefox, Edge and others. The
public site is measured against all of them and should slowly become pixel perfect. This file is
how it is measured, what is supported, and the rules the first pass established.

## Supported browsers

| Engine | Browsers | From |
| --- | --- | --- |
| Chromium | Chrome, Edge, Samsung Internet, Opera, Brave | Chrome/Edge 111 (March 2023) |
| WebKit | Safari on Mac, every browser on iPhone and iPad | Safari 16.4 / iOS 16.4 (March 2023) |
| Gecko | Firefox | Firefox 128 (July 2024) |

The floor is Tailwind CSS 4's: cascade layers, `@property` and `color-mix()`. Below it the
stylesheet only half applies. **Internet Explorer is not supported**: Microsoft retired it in
June 2022, Windows opens Edge instead, and React and Next.js do not run in it. Such a browser gets
one line at the top of every page instead of a silently broken one
(`src/components/layout/old-browser-notice.tsx`: hidden by default, unhidden by a few lines of
ES5 when `color-mix()`, `:has()` or `@property` is missing; inline styles, so it reads without
the stylesheet).

## The sizes

`scripts/qa/responsive-audit.mjs` measures every page in the sitemap, in both languages, at 24
sizes: phones 320–430 portrait, a folded phone's cover screen (344×882) and the unfolded one
(882×1104), phones in landscape (568–932 wide), tablets in portrait (768, 820, 1024) and landscape
(1024, 1180, 1366), laptops (1280, 1366, 1440, 1536), desktops (1920, 2560) and an ultrawide
(3440). Safari's and Firefox's engines are measured at nine of them.

```bash
npm run build && npx next start -p 3018                 # a production server: the dev server adds its own overlay
npm run qa:responsive -- chromium                       # all 24 sizes, both languages (~5 min)
npm run qa:responsive -- webkit                         # Safari's engine, 9 sizes, German
npm run qa:responsive -- firefox
npm run qa:shots -- chromium                            # full-page screenshots of 15 key pages for a visual review
```

Playwright's WebKit and Firefox are installed with `npx playwright install webkit firefox`.
Results land in `output/responsive/` (gitignored). The audit reports, per page and size:
sideways scrolling and the elements causing it, text wider than its box, visible text below
12px, on touch screens controls smaller than 24×24px (WCAG 2.2) and form fields below 16px,
pictures stretched out of proportion, and running text wider than about 100 characters.
`e2e/responsive.spec.ts` keeps the first three from coming back on the main pages
(`E2E_PORT=3017 npm run test:e2e`).

## Rules from the first pass (2026-10-12)

The first run found every page scrolling sideways on a 320px phone, form fields that made iOS
Safari zoom in, links too small for a finger, long German words breaking out of their boxes, and
a chat panel taller than a landscape phone. All of it was fixed; these rules keep it fixed.

- **Nothing fixed-width may exceed 280px on a phone.** 320 minus two 20px gutters. The header's
  logo shrinks to 40px below 380px for this reason.
- **A flex or grid child holding text gets `min-w-0`**, or a long word sets its minimum width
  and pushes the row wider (the guide's step list, the course goals).
- **German compounds hyphenate where they would overflow.** On phone widths headings, `dt` and
  `dd` hyphenate by the page's language (globals.css); elsewhere add `hyphens-auto` to the one
  element that needs it rather than everywhere, since needless hyphens in headings look worse.
- **A size that cannot fit, scales.** Big figures and hero headings get a smaller step or a
  `clamp()` where their column narrows (the figures on the about page, the hero h1 from 1024px).
- **No minimum height larger than the screen.** Cap it: `min-h-[min(520px,calc(100svh-…))]`.
  Use `svh`/`dvh`, not `vh`, on mobile.
- **Form fields are 16px on touch screens** (an unlayered rule in globals.css), or iOS Safari
  zooms in on focus and stays zoomed.
- **Text links on their own get `.tap-target`**: on touch screens an absolutely placed `::before`
  grows their hit area 8px above and below, so the layout does not move (a negative margin did
  the same until it overrode the links' own `mt-*`). `.casa-cta-link` has it built in. A drawn picture's hotspot widens its touch area with an absolutely placed `::before`
  instead, since it cannot grow without moving.
- **Text below 12px only where it is not meant to be read** (it is not).
- Prefer layout that adapts to its container (`cqw` in the drawn heroes) over breakpoints
  tuned to one device.

## Rules from the visual pass (2026-10-12)

Three reviewers went through the screenshots of 15 pages at 9 sizes in three engines. What they
found, and the rule each fix left behind:

- **Columns follow the box, not the screen.** A band that sits in a page's main column at one
  page and full width at another decides its columns with a container query (`@container`,
  `@[44rem]:grid-cols-3`): the steps (`ProcessSteps`), the exam timeline, the exam cards' facts,
  the contact topics, the course types. At 768 a `md:grid-cols-3` left each step about 180px.
- **Photo-and-text rows go side by side from `lg`**, not `md` (`CourseFormatRows`): at 768 the
  copy had ~280px and the photograph floated in a hole beside it. Stacked on a tablet, the photo
  takes a wider shape (16:9) so it does not fill the screen.
- **On a phone the one action comes before the photograph.** The detail heroes
  (`HeroCUtilityRail`) dissolve their first column below `lg` so the info card and its button
  follow the heading, and the photo goes last.
- **A table becomes a list under 480px**, each answer under its option's name
  (`ComparisonModule`); two 140px columns broke nearly every cell mid-word.
- **A label beside its value only where both fit**, else above it (the exam cards).
- **h1–h3 are always the display face** (an unlayered rule), so a small uppercase label must not
  be an `h3`, or it comes out as grey serif capitals. Headings use lining figures: Playfair's
  default old-style figures made "B2" read as B₂.
- **Faces stay in the crop.** A group photo that is cropped wider on some screens names its
  focus (`objectPosition`); the hero's media share is 28% of the screen on a phone and 36% from
  `md`, where a tablet in portrait has the height.
- **A phone on its side gets the heading and the button**: hero photographs and drawings step
  aside below 500px tall (and below 1024px wide).
- **One left edge per page.** Grids take the frame; panels the 76rem measure, and a band among
  panels takes the same measure (the exams page's proof band).

Left open: the exams page's pen photograph is soft in the source file (a sharper one is needed,
CSS cannot fix it); the decision card repeats below the page on tablets because it carries the
contact person; the floating assistant button can cover the corner of a card on a phone.

## Next

A visual pass over screenshots at 9 sizes and three engines follows each measured pass; its
findings go into the same order of work. Further: browser-tab titles and search descriptions,
print styles, and the two languages' longest strings at the narrowest sizes.
