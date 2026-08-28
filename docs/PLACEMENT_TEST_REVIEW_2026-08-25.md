# CASA placement test — review and improvement pass

**Date:** 2026-08-25  
**Scope:** desktop interface, intake, first three objective questions, adaptive
logic, later item bank, and comparison with the current Klett experience.

## Executive conclusion

CASA now has the stronger **learner experience**: one adaptive entry point,
clear phase language, a private resume link, a short route for beginners, typed
recall and writing, and a result a teacher can inspect. Klett's public tests
still ask the learner to select a product and level before starting and present
fixed task pages with manual navigation.

CASA does **not yet have evidence that its placement decisions are more valid or
reliable**. All 163 items remain `PILOT_UNREVIEWED`; listening is withheld; the
live router consequently has only two items per CEFR tier; and the thresholds
are authored assumptions rather than pilot-calibrated cut scores. The current
release mode must remain `shadow`.

## What was checked

- Browser walkthrough at 1440×900: intake, router questions 1–4, early routing,
  first level-module choice item, typed-recall item, reload/resume, pinned action
  bar, document scrolling, focus behaviour, and console output.
- State-machine paths: true beginner, low learner, A2 learner, C1 learner,
  boundary probe, incomplete attempt, retry, answer rewrite, out-of-order post,
  writing, submission, and result retrieval.
- Bank inventory: 163 objective items, six response types, three skill labels,
  module ordering, duplicates, and which content is actually deliverable while
  audio is unavailable.
- Current public comparison points from Klett, the Council of Europe, and ALTE.

## Intake: the first three questions

| Question | Finding | Decision in this pass |
|---|---|---|
| Prior learning | Useful only for the true-beginner exit. The earlier wording could let a learner with a few memorised phrases skip all evidence. | “None” now explicitly means unable to form or understand a simple sentence; its A1.1 consequence is shown before submission. |
| Main goal | Must not change the CEFR score. It is useful to a teacher deciding course fit, especially exam, study, or work pathways. | Marked explicitly unscored and included in the staff webhook payload. |
| Last regular use | A long gap can explain a receptive/productive mismatch but is not evidence of a lower CEFR level by itself. | Marked explicitly unscored and included in the staff webhook payload. |

The intake is now honest, but two product questions remain open: an “exam” goal
will eventually benefit from a follow-up asking which exam, and the dashboard
consumer still has to display the three intake fields to the reviewer.

## First three objective questions

1. `Ich ___ seit zwei Monaten in Bremen.` is a fair A1 language-use item. It
   tests first-person present tense in a realistic frame and the distractors
   represent distinct errors. It is still recognition, not production.
2. `Wann ist die Praxis heute geöffnet?` is a clean A1 reading item. The answer
   is explicit in a short authentic-style notice and does not require outside
   knowledge.
3. `Ich bleibe heute zu Hause, weil ich starke Kopfschmerzen ___.` is a
   reasonable A2 step. It tests a verb-final subordinate clause without a
   vocabulary trick.

Together they provide a sensible opening ramp: one elementary structure, one
functional reading task, then an A2 structure. They should remain in this order
for the pilot so their response data stays comparable.

## Logic findings and changes

### Fixed now

- The router stops after two fully answered consecutive tiers are uncleared.
  Higher tiers were already discarded by the scoring rule, so asking them could
  not change the outcome. A low learner now sees four router items, not ten.
- A private attempt token is placed in the URL and `/api/placement/resume`
  restores the exact next item after a reload or on another device when Neon
  persistence is available.
- The response endpoint accepts only the current item. An identical retry is
  idempotent; an answer rewrite or future-item post is rejected.
- Intake context is now part of `placement.attempt.submitted`.
- The desktop intake uses three semantic panels at large breakpoints while item
  screens stay at a readable line length.
- The public duration promise is now 15–30 minutes, matching the possible
  16–28 objective items plus writing.
- The result asks the learner to keep/show the private link; it no longer
  implies that a name collected nowhere can connect the attempt.

### Must remain open until academic review or pilot data exists

- With listening gated, each router tier has two items. At the current `0.50`
  tier threshold, one correct answer clears the tier. Changing this number now
  would replace one assumption with another. Priority: add the reviewed audio
  or a reviewed parallel third item per tier, then calibrate from response data.
- The deliverable bank is dominated by single-choice recognition: 147 of 163
  objective items overall. Typed recall, cloze, ordering, multiple selection,
  and writing help, but productive evidence is still comparatively thin.
- Level modules currently group six language-use items before six reading
  items. Interleaving may reduce order/fatigue effects, but should be decided
  before the pilot dataset is collected, then held stable during calibration.
- Listening and speaking are not scored in-browser. CEFR describes reception,
  production, interaction, and mediation; the current result is therefore an
  evidence-based course recommendation with a required human check, not a
  complete language profile.

## Klett comparison

The official Klett pages reviewed here use separate product/level entry points,
fixed task sets, back/forward navigation, and a final evaluation/email flow.
Examples: [Linie 1 A1](https://einstufungstests.klett-sprachen.de/einstufung/index.php?questclass=A1&questname=linie1_CH)
and [DaF im Unternehmen B1](https://einstufungstests.klett-sprachen.de/einstufung/fragebogen.php?jsstatus=nojs&questclass=B1&questname=dafunternehmen).

CASA's adaptive one-test entry, early stopping, private resume, production task,
and teacher handoff are meaningful experience advantages. Academic superiority
requires the evidence expected by the
[Council of Europe CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions)
and [ALTE minimum standards](https://www.alte.org/Setting-Standards): reviewed
construct coverage, standard setting, consistent administration and marking,
item analysis, and clear communication of what the result means.

## Recommended next sequence

1. Two qualified DaF reviewers independently review every item and resolve
   disagreements; prioritise the router and first item of each level module.
2. Record and QA the 33 listening assets, or author a reviewed temporary third
   router item per tier before collecting calibration data.
3. Run a shadow pilot against teacher placement and first-week movement. Track
   item facility, discrimination, omissions, time, router/teacher agreement,
   adjacent-band confusion, and subgroup fairness.
4. Set thresholds and minimum evidence from the pilot, bump `POLICY_VERSION`,
   and document the standard-setting decision.
5. Make the dashboard show intake, writing, per-skill evidence, rationale, and
   reviewer override reason; point `PLACEMENT_RESULT_WEBHOOK_URL` at it.
6. Approve retention/privacy policy, then decide whether `shadow` can move to
   `live`. Automatic confirmation should remain capped at B1.2 until evidence
   supports a broader ceiling.

## Verification from this pass

- `npm run lint`
- `npm run typecheck`
- `npm run test` — 235 passed
- `npm run build`
- `npm run test:e2e` — 19 passed
- Desktop browser walkthrough — no console errors

