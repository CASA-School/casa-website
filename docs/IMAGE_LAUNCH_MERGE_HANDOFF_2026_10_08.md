# Image branch merge handoff — 8 October 2026

Status: implementation complete and verified locally. This document covers the
whole `codex/image-launch-finishing` branch. Following the user's explicit request,
the branch was pushed to GitHub on 8 October 2026. No merge or deployment has been
performed. The documentation follow-up adds this handoff and its README link;
it does not change application behaviour.

## 1. Evidence and branch identity

- Repository: `/Users/rahmanshafiee/Downloads/CASA`.
- Branch to integrate: `codex/image-launch-finishing`, tracking
  `casa/codex/image-launch-finishing`.
- [GitHub branch](https://github.com/CASA-School/casa-website/tree/codex/image-launch-finishing).
- Remote name in this checkout: `casa`, not `origin`.
- Base: `65c7fbb001bfa1aaf01211e1097f55ab5ef9f0e1`.
- Local `main` and locally cached `casa/main` both pointed to that base when
  this handoff was written. The current remote tip has not been fetched for
  this documentation task; the receiving agent must check it before integrating.

Implementation commits, in order:

| Commit | Work |
| --- | --- |
| `6fb1f0941ecdc18f77866a941d591aad6cbc654a` | Site-wide image finishing: source-faithful selections/crops/grades, initial labelled host examples, responsive image requests, social card, provenance and regression coverage. |
| `525606957ea348409bf5fa461cb592da6c7d7582` | Supplied-reference bedroom/kitchen/bathroom, all accommodation disclosures, real WG improvements, final WebP bedroom and loading regression. |

Merge the complete branch, including the subsequent documentation commits.
**Do not cherry-pick only `5256069`: it depends on `6fb1f09`.**

Detailed evidence and implementation reports:

- [Initial image finishing](IMAGE_FINISHING_2026_10_08.md).
- [Final accommodation follow-up](ACCOMMODATION_IMAGES_2026_10_08.md).
- [Current media rules](MEDIA_LIBRARY.md), [slot inventory](MEDIA_PHOTO_NUMBERS.md)
  and [host-family brief](HOST_FAMILY_IMAGES.md).

The initial report's historical "Remaining inputs / Slot 81" subsection is
superseded by the accommodation follow-up: the bedroom is now ready and installed.

## 2. Root cause and resulting behaviour

Some original school photographs cut heads at source, which CSS could not fix.
Named quotations had adjacent unverified faces. Responsive `sizes` understated
real image widths, and the social card was square despite 1200×630 metadata.
Accommodation examples needed the requested disclosure; the bedroom reference
arrived after the first implementation, and WG photographs needed a gentler grade.

Final behaviour to preserve during conflict resolution:

- C1, company and medical course selections use complete subjects from real
  source photographs. The W009 lunch crop excludes the source-cut front-right
  learner. Company/exam named quotations use a face-free hand/pen crop.
- Four school-photo grades and five CASA-WG exports use conventional light and
  colour adjustments. WG room layouts, furniture, crops and dimensions are
  preserved. **WG photographs remain real photographs; do not mark them as AI.**
- The explicitly approved AI exception applies to host-room examples only.
  Bedroom slot 81 uses `IMG_3849.jpeg`, kitchen slots 73–75 use `IMG_3910.jpeg`,
  and bathroom slot 76 uses `IMG_3916.jpeg`. Existing living/dining examples
  retain their earlier references. These are contextual examples, not a claim
  that all rooms belong to one available house.
- Bedroom 81 shows a single bed, window-side desk, navy blind and pink chair;
  no wardrobe is invented. Both `hostStory` and `becomeHostRoom` use it.
  Its final URL is **`/media/casa/host-family-guest-room.webp`**, 2400×1800.
- All 13 accommodation assets have the sharp corner **Beispielbild** (DE) /
  **Example image** (EN) label across foreground placements, including home.
  It is HTML/CSS, not lettering baked into image pixels. Empty-alt decorative
  halo copies are excluded. Host alt descriptions disclose AI; WG alt text
  describes real example images.
- `PhotoSlot.example` identifies real WG example photographs;
  `PhotoSlot.illustration` identifies AI host examples. `CasaImage` displays
  the shared label for either flag when `alt !== ''`.
- Course rows and detail heroes retain their corrected `sizes`. The actual
  OG artwork is 1200×630 with the current logo and genuine lesson photograph.
- No dependency, database migration, API, authentication or data-flow change
  belongs to this branch. Existing staff animal illustrations are unchanged.

## 3. Integration procedure

Read the laptop and repository `AGENTS.md` instructions first. Confirm the
receiving checkout, target branch and working-tree ownership. Preserve unrelated
agent work; use a separate checkout if the receiving tree is occupied.

Read-only review commands, from the repository root:

```sh
git status --short --branch
git log --oneline main..codex/image-launch-finishing
git diff --stat main...codex/image-launch-finishing
git diff --name-status 65c7fbb001bfa1aaf01211e1097f55ab5ef9f0e1..codex/image-launch-finishing
git diff main...codex/image-launch-finishing -- src scripts e2e docs README.md
```

For a clean receiving checkout where `main` is the agreed target, refresh and
review the remote state, then integrate both histories. These are handoff
commands for the receiving agent; they have **not** been executed here:

```sh
git fetch casa
git switch main
git merge --ff-only casa/main
git merge --no-ff casa/codex/image-launch-finishing
```

If `main` has diverged, stop the fast-forward procedure and reconcile the
actual histories. Do not reset or force overwrite another agent's commits.
For another agreed target, adapt the target explicitly rather than assume main.
The branch is now available to other authorized checkouts through `git fetch casa`
(use the equivalent remote name if it differs there). Remote-branch review can use
`casa/codex/image-launch-finishing` in place of the local branch in the read-only
commands above. Branch publication does not authorize production deployment.

Most likely overlapping files are `src/config/public-page-config.ts`,
`src/config/content/photo-numbers.ts`, `src/components/ui/casa-image.tsx`,
`src/app/globals.css`, media documentation and the hero/row components.
Resolve conflicts by preserving current unrelated design/copy changes together
with the behaviours above. Do not choose one whole side indiscriminately.
Keep registry URLs, delivered binary assets, alt descriptions, flags and builder
recipes aligned. For binary conflicts, compare the corresponding sources and
manifest rather than regenerate an unrelated room or restore a retired crop.

## 4. Files and source handling

The two implementation commits change 43 tracked files. The exact inventory is
available through the `git diff --name-status` command above; the two reports
also list the individual paths. Key ownership boundaries:

| Area | Files / purpose |
| --- | --- |
| Registry and placement | `src/config/content/photo-numbers.ts`, `src/config/public-page-config.ts`: source identity, example/AI flags, translated alt text, bedroom bindings and selection changes. |
| Presentation | `src/components/ui/casa-image.tsx`, `src/app/globals.css`: disclosure and locale styles. `src/components/heroes/shared.tsx`, `src/components/sections/course-format-rows.tsx`: responsive request sizes. |
| Deployed artwork | 25 changed/new files in `public/media/casa/`, plus `public/images/og-default.png`. Merge these with their configuration. |
| Reproducibility | `scripts/media/build_reel.py`, `build_host_family.py`, `build_social_image.py`, `fit_positions.py`, `host_family_illustrations.json` (all under `scripts/media/`). |
| Regression | `e2e/media-disclosures.spec.ts`: DE/EN labels at three widths, real WG provenance, bedroom present and decoded on all four host routes. |
| Documentation | Five media reports/briefs under `docs/`, plus this handoff and the README entry. |

Production exports are committed. **A normal application build does not require
the private original photographs or generated PNG masters.** Do not stage
private sources, optimizer caches or review captures into `public/` or Git.

Local reproduction inputs (not transferred by a branch merge):

- Real camera pool: `~/Archive/CASA/website-cleanup-2026-09-16/editorial-2026/`.
- Host masters: `~/Archive/CASA/host-family-illustrations-2026-10-08/`.
  Private supplied reference copies are in its `supplied-references/` directory;
  original attachments under Downloads are unchanged.
- `scripts/media/host_family_illustrations.json` records exact prompts, reference
  paths, native master dimensions and SHA-256 hashes. Older unused master records
  remain for provenance. The host builder verifies all eight recorded masters,
  then writes eight current exports. `--masters` can specify an approved alternate
  master directory. Python media scripts require Pillow.
- Generated host masters are resampled to delivery sizes. Camera photographs
  are never upscaled. Do not apply the host illustration workflow to WG/people.

Ignored local review evidence is under `output/review/image-audit-2026-10-08/`,
`output/review/image-finishing-2026-10-08/`,
`output/review/accommodation-images-2026-10-08/` and
`output/playwright/accommodation-images-2026-10-08/`. The last directory's
`metrics.json` and final screenshots represent the repaired WebP delivery.

## 5. Verification and runtime notes

These checks passed on final implementation commit `5256069`:

| Command / check | Result |
| --- | --- |
| `npm run build` | Pass |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test -- --maxWorkers=2` | 615 passed in 66 files |
| `E2E_PORT=3017 npm run test:e2e -- --workers=2` | 55 passed; 3 existing database-dependent planner fixture skips |
| `npm run knip` | Pass |
| `python3 scripts/media/build_reel.py --verify` | All 47 camera-source recipes passed |
| `python3 scripts/media/build_host_family.py` | Eight exports; recorded master hashes verified |
| Fresh production accommodation review | 30 DE/EN views at 390/1024/1440; 24 refreshed full-page captures. Zero missing labels, unloaded images, label-frame escapes or horizontal overflow. |

The broader first-commit audit additionally checked 1,010 photo boxes across
70 sitemap URLs at 390/768/1024/1440/1920, with no additional registered head cuts
or unloaded images. Actual camera sources were also inspected visually.
The photographer reviewed installed assets. The image editor inspected the
earlier 24 accommodation captures and caught the cache/loading issues; the
primary agent completed the final fresh runtime/capture review after repairs.
Do not present that as a new final specialist sign-off.

The three planner skips require DATABASE_URL and owner/course fixtures absent
from this test environment. Earlier unit/home-navigation timeouts were resolved
by complete capped-worker reruns; the table reports the final full results.

After merging, rerun build, lint, typecheck, unit and routed E2E gates against the
integrated target. Choose an unused E2E port and verify ownership: Playwright's
`reuseExistingServer` can otherwise test another checkout's server. Run source
fidelity verification only where the recorded private camera pool is available;
do not regenerate or replace missing originals. Host export regeneration writes
assets and requires all approved masters; it is not necessary just to merge.

Check these production views at 390, 1024 and 1440 pixels:

| DE | EN |
| --- | --- |
| `/` | `/en` |
| `/unterkunft` | `/en/accommodation` |
| `/unterkunft/die-casa-wg` | `/en/accommodation/flat` |
| `/unterkunft/wohnen-in-einer-gastfamilie` | `/en/accommodation/host` |
| `/unterkunft/gastfamilie-werden` | `/en/accommodation/become-host` |

Inspect actual room subjects as well as labels. Scroll bedrooms into view and
confirm `naturalWidth > 0`; element visibility alone can pass for a blank image.
The initial new bedroom JPEG failed responsive loading in the host room row,
reproduced in the in-app browser. Switching that new asset to WebP resolved all
observed placements; the precise browser/JPEG cause was not established.
Do not restore a `.jpg` URL for slot 81 from an older capture or draft.

Next's local `.next/cache/images` retained earlier kitchen/bathroom pixels even
after a successful build. The exact cache was preserved intact under ignored
`output/review/accommodation-images-2026-10-08/stale-optimized-image-cache/`,
then our production preview was restarted and all captures refreshed. If a
receiving preview displays old rooms, identify and stop only that preview,
preserve its exact optimizer cache in a uniquely named local evidence directory,
restart the correct build and refresh the browser. Avoid broad cache deletion
or disturbing another agent's runtime. A successful build alone does not prove
that served optimized pixels are current.

Documentation-only follow-up validation: check relative links/paths, commit
identities, inventory counts and `git diff --check`. Application gates are not
rerun for this Markdown-only commit because it changes no runtime or test code;
the implementation results above remain the most recent application verification.

## Publication follow-up

The existing **W009 school-group consent publication follow-up** remains open;
this branch creates no new consent assertion. Confirm it before go-live.
Merge readiness is separate from deployment authorization. The branch has been
pushed at the user's request; no production deployment or domain cutover has
been performed by this work.
