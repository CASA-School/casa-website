# Placement test — open CASA decisions

These are **CASA's** decisions, not engineering's. The code has safe defaults for
every one of them, and every default is visible: nothing below is silently
decided in the implementation.

Ported from the upstream package's `OPEN_DECISIONS.md` (2026-08-23), with the
column on the right recording what this repository actually does today so nobody
has to read the code to find out.

Implementation record: `docs/PLACEMENT_TEST_IMPLEMENTATION.md`.
The numbers live in one file: `src/config/placement/policy.ts`.

---

## Required before shadow launch

| Decision | Owner | What the repo does today |
|---|---|---|
| Link an attempt to a real applicant / registration record | CASA product + engineering | **Nothing.** The test asks for no name, email, or ID. An attempt is identified only by its unguessable token, and the result page tells the learner to keep or show that private link. This is the most privacy-preserving default; connecting the two is a decision with a data-protection consequence. |
| Which staff roles may read writing and hear audio | CASA administration | **Not modelled here.** This repo has no auth (see §6.1 of the implementation doc). Review belongs to the CASA dashboard workspace; the website hands off via `PLACEMENT_RESULT_WEBHOOK_URL`. |
| Course-catalog source for the recommendation | CASA product | A static band→course map in `src/config/placement/result-copy.ts`, using slugs that exist in `src/config/courses`. Replace with the live catalog when there is one. |
| Object storage and upload limits | Engineering | **Not used.** Writing is text in Postgres; speaking is a teacher conversation, not an upload. No storage decision is needed for v1. |
| Notification transport | Engineering | One optional webhook, matching the site's existing fan-out idiom. Unset by default. |
| Interface languages at launch | CASA product | Both `en` and `de` are written and complete. Routing is EN-only today, as everywhere else on the site. |
| Named DaF reviewers | Academic lead | **Not assigned.** All 163 items remain `PILOT_UNREVIEWED`. The public page says so; the result copy says the recommendation is provisional. |
| Audio voices and recording process | Academic lead | **No audio exists.** 33 listening scripts and their recording directions are ported and stored; `LISTENING_AUDIO_AVAILABLE` is `false`, so listening items are withheld rather than degraded. |

## Required before live automatic placement

| Decision | Package position | Repo default |
|---|---|---|
| Final cut scores | Provisional; revise from pilot data | `THRESHOLDS` in `policy.ts`, marked `ASSUMPTION`, versioned by `POLICY_VERSION`. Every attempt stores the version that scored it. |
| Automatic-confirmation ceiling | B1.2 maximum, configurable | `AUTO_CONFIRM_CEILING = 'B1.2'`. Anything above always reaches a human. |
| B1+ speaking requirement | Speaking, or a documented teacher conversation | `SPEAKING_REQUIRED_FROM = 'B1+'`, satisfied by a conversation. The result page offers the booking route. |
| B2 automatic confirmation | Disabled in v1 | Follows from the ceiling — no separate rule needed. |
| C1 automatic confirmation | Prohibited in v1 | Same. Asserted directly in `finalise.test.ts`: a *perfect* C1 attempt is still not auto-confirmable. |
| Production double-rating window | Define after rater-agreement evidence | Not modelled. No rating happens in this repo. |
| Retention periods for attempts, writing, audio | Placeholders only; approve with the privacy owner | **No retention policy is set, deliberately.** A made-up interval in a migration looks approved. `created_at` and `submitted_at` exist so a policy can be applied later without a schema change. |
| Learner reconsideration route | Must exist | The result page carries the contact route and, from B1+, an explicit "arrange the conversation" action. There is no self-service re-take limit. |
| Minimum shadow sample | Define from teacher agreement and first-week movement, not a date | Not modelled. `RELEASE_MODE = 'shadow'` until CASA changes it. |

## Explicit non-decisions

Things that are **settled** and must not be re-opened by an implementation
convenience:

- An old certificate or a self-reported level is **never** the final placement.
  Intake is stored for a reviewer's context and is not read by the engine.
- **No automatic AI grading** of writing or speaking in v1. There is no score
  column on `placement_writing_submissions`, so adding one would need a decision.
- **No publisher content.** Every item, stimulus, and prompt is original. CASA
  remains a Klett *curriculum* school; only the placement instrument moved
  in-house.
- The result is **not a certificate** and carries **no pass/fail language**. The
  result page states both in plain words, and the e2e suite asserts it.

---

## Environment variables this feature adds

| Variable | Required? | Effect when unset |
|---|---|---|
| `PLACEMENT_RESULT_WEBHOOK_URL` | No | Attempts still persist and learners still get results; staff simply are not notified. |

`DATABASE_URL` is not new, but it is load-bearing here: without it the test still
runs end to end from an in-process store, and the learner is told plainly that
progress is not being saved. See §6.4 of the implementation doc.

## Before go-live

- [ ] Two qualified DaF reviewers sign off every one of the 163 items
- [ ] Record the 33 listening scripts, then flip `LISTENING_AUDIO_AVAILABLE`
      (this also switches on the matching interaction — see §6.2)
- [ ] Approve the public result wording in `result-copy.ts`
- [ ] Approve a retention schedule with the privacy owner
- [ ] Decide the applicant-record link, or confirm anonymity is intended
- [ ] Point `PLACEMENT_RESULT_WEBHOOK_URL` at the dashboard workspace
- [ ] Revise `THRESHOLDS` from pilot data and bump `POLICY_VERSION`
- [ ] Decide when `RELEASE_MODE` moves from `shadow` to `live`
