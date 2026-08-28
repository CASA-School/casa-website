# CASA Einstufungstest — implementation log

**Status:** built and verified · reviewed 2026-08-25 · release mode `shadow` · **not deployed**
**Goal:** replace the external Klett placement links with CASA's own adaptive
placement test, and keep the result honest (a recommendation, not a certificate).

This file is the living handoff. If work stops mid-way, start here.

---

## 1. Why

`/placement-test` currently renders `KlettLevelTests` — six external links to
`einstufungstests.klett-sprachen.de`, one per level. Three problems:

1. **It is not a placement test.** The learner must already know their level to
   pick which of the six links to click. That is the exact question the test is
   supposed to answer.
2. **CASA gets no result.** The learner takes a Klett test, sees a Klett score,
   and CASA learns nothing. `/registration/course` then asks them to self-report
   a level with the hint "take the placement test first" — an unclosed loop.
3. **Third-party dependency on content CASA cannot change**, on a page that is
   a required step before every course registration. See also the rights
   caveats already recorded in `src/config/content/klett-textbooks.ts`.

CASA remains a Klett *curriculum* school (Netzwerk neu → Kontext). Nothing here
changes the textbooks. This replaces only the placement *instrument*.

## 2. Source of the assessment design

A handoff package (`casa-placement-test-v1`) was produced outside this repo. Only
part of it is present on this machine, in `~/Downloads/`:

| Present | Content |
|---|---|
| `TEACHER_REVIEW_BOOK.md` | **The whole item bank.** 163 objective items, 33 reading stimuli, 33 listening transcripts + recording directions, 18 writing prompts, 12 speaking prompts, both analytic rubrics. Answer-bearing. |
| `START_HERE.md`, `CODEX_MASTER_PROMPT.md`, `PACKAGE_INDEX.md`, `IMPLEMENTATION_STATUS.md` | Build order, non-negotiables, release gates |
| `OPEN_DECISIONS.md` | Decisions CASA must own |
| `VERIFICATION_REPORT.md` | Package content totals — used here as a port checksum |
| `CONTENT_AUDIT_LOG.md` | Editorial corrections already applied upstream |

**Absent** (referenced by the docs above but not on disk): `docs/00-16*.md`,
`content/config/policy.v1.json`, `content/config/modules.v1.json`,
`content/intake/`, `content/result/`, `schemas/`, `api/openapi.yaml`,
`reference-engine/`, `database/`, `qa/`, `scripts/`.

### Consequence — what had to be designed here rather than ported

Routing thresholds, cut scores, confidence bands, review-trigger rules, the
intake questions, the learner-facing result copy, and the override-reason list
were **not available** and are authored in this repo. They live in exactly one
place, `src/config/placement/policy.ts`, versioned, so CASA can revise them after
piloting. The upstream package already calls its own cut scores "provisional …
hypotheses for piloting", so this is the same epistemic status — but the numbers
here are CASA-authored, not the package's. **Marked `ASSUMPTION` in the file.**

If the missing folders turn up, reconcile `policy.ts` against
`content/config/policy.v1.json` and the reference engine's tests before trusting
either.

## 3. Content port

`TEACHER_REVIEW_BOOK.md` is Markdown generated from JSON we do not have, so the
port direction is Markdown → typed TS. Done by
`scripts/placement/port-item-bank.mjs`, which is committed so the port is
reproducible and reviewable, not a one-off paste.

Checksum against `VERIFICATION_REPORT.md` — the port must produce exactly:

| Thing | Expected |
|---|---|
| Objective items | 163 |
| Modules | 12 (1 router · 6 level · 5 boundary) |
| Reading stimuli | 33 |
| Listening scripts | 33 |
| Writing prompts | 18 |
| Speaking prompts | 12 |

Module composition: router 15 · six level modules 18 each · five boundary
modules 8 each = 163. The generator asserts this and fails loudly otherwise.

### Response types in the bank

| Type | Count | Interaction |
|---|---|---|
| `single_choice` | 147 | one of four |
| `short_text` | 6 | typed recall, accepted-answer list, "not known" allowed |
| `inline_cloze` | 4 | two dependent blanks, scored as one whole-pair choice |
| `order_tokens` | 3 | reorder 4 chunks into one sentence |
| `multiple_choice` | 2 | exactly two of four correct |
| `matching` | 1 | 2 left → 2 right |

All six are implemented. The rarer four are *load-bearing*: the audit log records
that typed recall was added deliberately so the test is not purely recognition,
and that two cloze items were converted to whole-pair scoring to remove
ambiguity. Do not "simplify" them into single_choice.

### `band` vs `level` — one deliberate mismatch

`level` is the module family an item lives in. `band` is the band it provides
*evidence about*. They coincide on 154 of 163 items.

The nine exceptions are the **B1+ bridge module's `foundation` stage**, banded
`B1.2` rather than `B1+`: that stage asks "have you actually finished B1.2?"
before the `stretch` items test B1+ itself. `CONTENT_AUDIT_LOG.md` records this
as a deliberate correction — *"B1+ foundation metadata so it correctly
represents B1.2 exit evidence"*.

`item-bank.test.ts` asserts the exception by exact item id, so it cannot quietly
spread to another module in a re-port. Boundary modules are asserted the other
way: their two stages must sit on *opposite* sides of the edge.

Nothing in the engine reads `band` for routing — `resolveLevelModule` groups by
`stage` and `routeFromRouter` by `level` — so the mismatch is inert for scoring.
It matters for item analysis and for anyone reading the bank.

## 4. Placement bands

The band taxonomy is already in this repo and already matches the package
exactly — `CASA_LEVEL_SEQUENCE` in `src/config/calculator/pricing.ts`:

```
A1.1 A1.2 · A2.1 A2.2 · B1.1 B1.2 · B1+ · B2.1 B2.2 · C1.1 C1.2
```

11 bands. The placement layer imports that sequence rather than redeclaring it,
so the calculator, the course pages, and the test can never drift.

## 5. Test shape

**One integrated attempt**, not six separate tests. The learner never chooses a
level — that is the output, not the input.

```
intake  →  router (up to 15)  →  level module (18)  →  [boundary (8)]  →  [writing]  →  result
             │                                       ▲
             └── true beginner ──────────────────────────────────► A1.1, no testing
```

- **Intake** — three non-scored questions (prior learning, goal, last contact
  with German). The answers go to the teacher handoff as context but never into
  scoring. Prior learning also provides the true-beginner exit: someone with no
  German goes straight to A1.1 without sitting a test they cannot read.
- **Router** — 15 items spanning A1→C1 across language use / reading /
  listening. Picks which single level module to serve.
- **Level module** — 18 items in two stages, `foundation` then `stretch`.
  Foundation evidences the level; stretch evidences the upper half-band.
- **Boundary module** — 8 items, served only when the level result sits near a
  band edge. Resolves `lower_exit` vs `upper_entry`.
- **Writing** — one prompt at the placed level. Persisted, never auto-graded.
- **Speaking** — **not an in-browser recording in v1.** From B1+ the result asks
  for a short teacher conversation and offers the booking route. This satisfies
  the package's "speaking or documented teacher conversation" without needing an
  object-storage decision CASA has not made.

## 6. Deliberate boundaries (read before "finishing" this)

### 6.1 No staff review UI in this repo
The package assumes a staff review queue with placement-reviewer roles.
`CLAUDE.md` hard rule: *"Do not reintroduce auth, roles, or dashboard
surfaces."* The portal was removed on purpose.

So the boundary is: **this repo owns the learner-facing test, the engine, and
persistence. The CASA dashboard workspace owns review.** The website hands the
attempt off via `PLACEMENT_RESULT_WEBHOOK_URL`, matching the existing webhook
fan-out idiom (contact, careers, both registrations). No new auth surface.

### 6.2 Listening is built but gated
33 listening items have no audio — the upstream verification report counts 34
missing assets as expected warnings that "block public scored listening".

Showing the transcript as text is not an option: it would convert a listening
construct into a reading one *and* leak protected content the package forbids
sending to the client. Browser TTS is not an option either — the recording
directions specify human delivery.

So the listening item type is fully implemented (player, two-plays cap, the whole
interaction) behind `audioAvailable`, currently **off**. Module composition
drops listening items while the flag is off and the engine normalises over what
was actually delivered. Flip the flag when the MP3s land at
`/placement-audio/v1/`.

Effect while off: the pilot measures language use + reading only. Recorded here
so nobody reads a green build as "listening works". The router now stops as soon
as two fully answered consecutive tiers are uncleared, because the existing
routing policy discards every tier above that wall anyway. This changes no band
decision and avoids serving questions that can no longer affect the route.

**Two components are consequently unreachable in the live flow**, and both are
built, typed, and unit-tested rather than stubbed:

| Component | Why unreachable |
|---|---|
| `stimulus-panel.tsx` → `ListeningStimulus` | every listening stimulus is gated |
| `response-fields.tsx` → `MatchingField` | the bank's **only** `matching` item is `B1-LS-STRETCH-001`, a listening item |

So flipping the gate switches on the audio player *and* the matching
interaction at once. Neither has been exercised against a real learner path;
verify both when the recordings land.

Item counts while the gate is closed: router **4–10** (of 15), each level module
**12** (of 18), each boundary module **6** (of 8). A full attempt is **16–28**
objective items plus writing.

### 6.3 Content is `PILOT_UNREVIEWED`
Every item still needs two qualified DaF reviewers (upstream requirement, and
`CONTENT_AUDIT_LOG.md` is explicit that its own passes do not substitute). The
result copy says the recommendation is provisional. Cut scores are hypotheses.
`shadow` is the default release mode.

### 6.4 Fallback mode is honest but reduced
Neon-backed: attempts persist; autosave; resume across devices by the private
attempt URL. Fallback (`DATABASE_URL` unset): the test runs from an in-process
server store and can survive a reload while that process remains alive, but not
a restart or another server instance. No durable staff hand-off or dependable
cross-device resume. Parity is preserved in *the learner being able to take the
test*, not in persistence.

## 7. Answer-key containment

Non-negotiable: no answer key, accepted-answer list, listening transcript, or
scoring field may reach the browser.

Mechanism:
1. Answer-bearing modules are named `*.server.ts` and live under
   `src/config/placement/content/`.
2. Every server→client hand-off goes through one sanitiser,
   `src/lib/placement/sanitise.ts`. Client types are structurally incapable of
   holding a key (they simply have no such field).
3. A unit test asserts no `'use client'` file transitively imports an
   answer-bearing module, and that the sanitiser output contains none of the
   protected field names.
4. Item ids are hashed before they reach the DOM. A radio group named
   `placement-choice-A1-RD-STRETCH-003` is not an answer key, but it does tell
   anyone reading the markup which band the router landed on, mid-test — free to
   avoid, so avoided.

Verified against the built bundle, not just the source: `grep` over
`.next/static` finds no accepted answer, no transcript, and no recording
direction. Two apparent hits are benign and worth recording so the next person
does not re-investigate them —

| Hit | Verdict |
|---|---|
| `teilnehmen` | a pre-existing FAQ string ("… nicht am Unterricht teilnehmen kann?"), unrelated to the item bank |
| `optionKey` | the *field name*, in client code that reads and posts the learner's own selection. Never a key's value. |

`FORBIDDEN_CLIENT_FIELDS` therefore applies to server→client *item* payloads,
which is what the containment test runs it over. Client→server response payloads
legitimately carry `optionKey`: that is the learner's answer travelling upward.

## 8. Progressive disclosure

The explicit design brief. Applied as:

- **Landing** offers one action — start — instead of today's six level cards.
  Level vocabulary is deferred; the learner is not asked to self-diagnose.
- **One item per screen.** No item grid, no jump-ahead.
- **Progress shows phase, not a count.** The item count is adaptive, so "3 / 41"
  would be a lie. The rail names the stage.
- **The result unfolds in layers**: band → what it means → which course →
  what is still needed → per-skill detail behind a disclosure.
- Cost, schedule, and registration detail stay off the test surface; they are
  the next step, reachable from the result.

## 8b. The running test is an app surface, not a page

Added 2026-08-23 after measuring the first build on real device sizes. This is
the part most likely to be undone by accident, so the reasoning lives here rather
than only in the components.

### What the measurements said

On a 375x667 phone, mid-attempt:

| | Before | After |
|---|---|---|
| Site footer on the test surface | 721px (42% of a 1725px page) | none |
| Site navbar | 80px, sticky, permanent | replaced by a 48px test header |
| Assistant launcher | floating over the answer area | hidden on this route |
| Distance to the Next button | **272px below the fold, on every item** | pinned, always visible |
| Document scrolls | yes | no |
| Content fits the viewport | no | yes (507px of 507px) |

### Verified breakpoint matrix

Item screen, measured (not eyeballed). `fits` means the content region needed no
scroll; where it scrolls, the pinned action bar keeps Next reachable regardless.

| Viewport | Device shape | x-overflow | Doc scrolls | Content fits | Bar pinned |
|---|---|---|---|---|---|
| 320x568 | smallest phone | 0 | no | yes* | yes |
| 375x667 | iPhone SE | 0 | no | yes | yes |
| 390x844 | iPhone 14 | 0 | no | yes | yes |
| 667x375 | phone landscape | 0 | no | no (237/366) | yes |
| 768x1024 | iPad portrait | 0 | no | yes | yes |
| 1024x768 | iPad landscape | 0 | no | yes | yes |
| 1280x900 | desktop | 0 | no | yes | yes |

\* 320px fits an ordinary item; a long B2/C1 reading stimulus scrolls, which is
correct — the learner must read the whole notice.

Also verified: the result page and the landing page carry no horizontal overflow
at 375px, and the landing page's single CTA sits above the fold (486px of 667px).
The `order_tokens` pool was measured at 320px rather than eyeballed: the bank's
longest chunk ("Wenn das Wetter gut ist") renders 178px inside a 320px column and
wraps to two rows.

### How it is built

`src/components/placement/test-shell.tsx`. Fixed-height column: compact header,
one scrolling region, pinned action bar.

- **`SiteShell` drops the navbar, footer, and assistant launcher** on
  `/placement-test/test` only. It already had this pattern for `/registration/*`;
  the test drops more. The landing page and the result page keep the full site
  frame — a learner reading their result should be able to reach courses and
  registration from it.
- **`h-[100svh]` with a `100dvh` upgrade.** `vh` is pinned to the *largest*
  viewport, so a `100vh` shell hides its action bar behind mobile browser chrome
  at rest. `dvh` tracks the real height; `svh` is the safe fallback.
- **Only the content region scrolls**, with `overscroll-contain`. That is what
  makes it read as an app: the header and the answer button do not drift, and a
  rubber-band at the end of a long reading text does not pull the page.
- **`m-auto` on the inner wrapper, not `justify-center`.** Both centre a short
  item in a tall viewport (an iPad left ~350px of dead space below a one-line
  prompt), but `justify-center` on an overflow container clips the *top* of
  content taller than the box — exactly what a long reading stimulus is.
- **Short viewports get their chrome tightened** under `max-height: 480px`. A
  landscape phone left only 197px of reading area; the tightening returns ~40px.
- **`env(safe-area-inset-bottom)`** on the action bar, for the iPhone home
  indicator.
- **The scroll region resets to the top on every new item.** Without it, item 4
  opens scrolled to wherever item 3's options ended.

### Type and control sizing

Option cards are `min-h-12` on phones and `min-h-14` from `sm` — both clear the
44px platform guidance, and the smaller step saves ~32px per four-option item,
which is the difference between three and four options being visible above the
answer bar. Markers 20px; prompt `text-base / sm:text-lg / md:text-xl`; stimulus
panel `p-3.5`.

Every text input stays at 16px regardless of breakpoint. Below that, iOS Safari
zooms the page when a field takes focus — mid-sentence, on the writing task.

### The phase rail became a segmented bar

Listing the phase names in a row wrapped to two lines on a phone and cost ~150px
before the question started. One segment per phase carries the same information
in a 4px row. **The other phase names are no longer visible text** — the e2e spec
asserts the current phase name plus the progress bar, not a list.

### The item prompt is a `<p>`, not a visible heading

`globals.css` binds Playfair Display to `h1/h2/h3` as elements. That is right for
editorial type and wrong for a German test sentence containing `___` gaps that a
learner parses character by character — Playfair's hairlines break up below ~20px,
which is where a phone sets it.

The prompt is a visually-hidden `<h2>` (document outline, focus target,
placeholders replaced by a speakable word) plus a visible `<p>`, which the element
rule never touches. A class-based override was tried first; a paragraph avoids the
cascade question entirely.

### Two bugs this pass found

1. **The answer options had no visible focus indicator for keyboard users.**
   The card carried `transition-all`, `outline-width` and `box-shadow` are both
   animatable, and so the focus ring eased in over 200ms — long enough that
   tabbing at speed showed nothing, and a computed-style read at focus time
   returned `outline-width: 0px`. Fixed by scoping the transition to colour and
   shadow; the ring itself is `.casa-option-focus:has(:focus-visible)` in
   globals.css, beside the other CASA focus rules. Guarded by an e2e test.

   **Worth knowing site-wide:** any control with `transition-all` plus a focus
   ring has the same fade. It is not a cascade problem and does not look like a
   transition problem either — it looks like the utility failing to compile.

2. **The writing screen's primary button clipped its own label at 320px** (210px
   of text in a 200px box) because it shared a row with the skip link. Both the
   writing and intake action bars now stack below `sm`.

### One thing that was NOT a bug

`ring-[var(--casa-blue)]/20` was briefly suspected of not compiling a colour, and
nine call sites were changed away from it before that was checked properly. It
compiles correctly — `--tw-ring-color: var(--casa-blue)` with a `color-mix`
upgrade under `@supports`. The original reading came from grepping the wrong CSS
chunk. All nine were reverted to the site's existing pattern, where a focused
field signals with a border change and the ring is a soft glow around it.

## 9. File map

| Path | Role |
|---|---|
| `scripts/placement/port-item-bank.mjs` | Markdown → typed TS port, with checksums |
| `src/config/placement/policy.ts` | **CASA-owned numbers.** Cut scores, thresholds, review rules |
| `src/config/placement/bands.ts` | Band taxonomy (imports `CASA_LEVEL_SEQUENCE`) + course map |
| `src/config/placement/intake.ts` | Intake questions |
| `src/config/placement/result-copy.ts` | Learner-facing band copy, de/en |
| `src/config/placement/content/*.server.ts` | Ported item bank — answer-bearing |
| `src/lib/placement/*.ts` | Pure engine: score → route → finalise → sanitise |
| `src/app/api/placement/*` | Attempt lifecycle, `{ data, error }` envelope |
| `src/app/placement-test/*` | Learner routes |
| `src/components/placement/test-shell.tsx` | **The app shell.** Fixed viewport, one scroll region, pinned action |
| `src/components/placement/*` | UI |
| `src/lib/placement/notify.server.ts` | Result hand-off to the dashboard workspace |
| `src/lib/validation/placement.ts` | Request schemas |
| `e2e/placement-test.spec.ts` | Learner-path e2e |
| `db/migrations/0005_placement_test.sql` | Attempts, responses, writing |

## 10. Progress

- [x] Read the handoff, audit the repo, locate the Klett dependency
- [x] Confirm band taxonomy already matches `CASA_LEVEL_SEQUENCE`
- [x] Write this doc
- [x] Port the item bank — all §3 checksums reproduced exactly
- [x] Policy config (`src/config/placement/policy.ts`)
- [x] Pure engine + tests
- [x] Persistence + migration (`0005_placement_test.sql`), both runtime modes
- [x] API routes
- [x] Test UI
- [x] Result UI
- [x] `/placement-test` rewrite, `KlettLevelTests` deleted
- [x] Gates: lint · typecheck · test · build · knip
- [x] Browser verification of the full learner path
- [x] e2e spec for the placement flow (`e2e/placement-test.spec.ts`, 7 tests)
- [x] `MEMORY.md` + `CLAUDE.md` + `README.md` updates
- [x] Open decisions into the repo (`docs/PLACEMENT_TEST_OPEN_DECISIONS.md`)
- [x] Staff hand-off webhook (`PLACEMENT_RESULT_WEBHOOK_URL`)

Latest gates (2026-08-25): lint · typecheck · 235 unit tests · build · 19 e2e.
Migration `0005` was previously applied to live Neon.

### Bugs the verification pass found and fixed

Recorded because each was invisible to a green build, and each would have
mattered:

1. **`answeredShare` was always 100%.** It divided answered scores by the score
   set — but the score set only contains items that *have* a response, so the
   ratio was tautological and the `incomplete_objective_evidence` review trigger
   could never fire. A learner who quit after three questions was scored as a
   complete attempt. Fixed by making `servedItemCount` a required, separate
   input to `finalisePlacement`; `attempt-flow.test.ts` now covers it.
2. **"Your progress is saved" was a lie whenever the migration was unapplied.**
   The flag came from `isDatabaseConfigured()`, which only checks the env var.
   With `DATABASE_URL` set but table missing, the repository correctly fell back
   to its in-process store while the UI still told the learner they could close
   the page. Fixed by reporting `persisted` from whether the insert actually
   returned a row.
3. **The incomplete-evidence confidence penalty was flat**, so 20% answered
   scored the same as 69%. Now scaled by the shortfall.
4. **`role="radio"` without the keyboard contract.** The choice cards were
   buttons with ARIA roles, promising arrow-key navigation and roving focus that
   was not implemented. Rebuilt as visually-hidden native inputs inside styled
   labels, which gives the whole contract for free.
5. **The cloze read `{{b1}}` aloud.** The screen-reader-only heading carried the
   raw prompt including its placeholder syntax, and each inline select was named
   after its internal blank id ("Choose b1"). Now "…ist blank als die alte…" and
   "Choose word 1 of 2".

### Verified in the browser (2026-08-23, dev server, Neon-backed)

Full learner path driven end to end: intake → router (10) → level module (12) →
boundary module (6) → writing → result. Confirmed against the database:

```
router_target_level  C1
boundary_module_id   BOUNDARY-B2-C1
band                 B2.2
confidence           low
policy_version       1
release_mode         shadow
reviewReasons        router_level_disagreement, low_confidence,
                     unresolved_boundary, above_auto_confirm_ceiling,
                     speaking_required, shadow_mode
responses            28   (10 + 12 + 6)
writing              WR-B2-001, 73 words
```

That trace is the engine behaving correctly under an adversarial answer pattern:
the router over-reached to C1, the C1 module's foundation stage did not hold, the
engine stepped down and probed the B2/C1 edge, the edge did not resolve, and it
seated the learner at the lower exit band while flagging every reason a teacher
should look.

Also confirmed: `single_choice`, `short_text`, `inline_cloze`, and `order_tokens`
render and score through the UI; the phase rail marks a completed phase and
resets its count per phase; option and token order are shuffled away from the
authored order; `Next` stays locked until a compound answer is complete; the
result page's skill detail shows listening as "not part of this version" rather
than 0%.

## 11. Open CASA decisions

Ported from the package's `OPEN_DECISIONS.md` — these stay CASA's, not
engineering's. Repo copy: `docs/PLACEMENT_TEST_OPEN_DECISIONS.md`.
