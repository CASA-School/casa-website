# Group Pricing Model & Special Courses

Date: 2026-08-12
Sources: `Preiskalkulation_Gruppen.xlsx` (group-courses coordinator, received 2026-08-12) and
`casa-bremen.de/sprachkurse/deutsch-spezialkurse` (autumn 2026 term).

---

# Part 1 — Group pricing

## The model

Per-person total for a stay of *n* weeks, summed from six components:

| Component | Rule | Rate |
| --- | --- | --- |
| Kurs | `145 × weeks` | €145/week for 20 UE (€7.25/UE) |
| Lehrmaterial | flat, once | €20 |
| Accommodation | table lookup, half board | DZ: 255 / 450 / 645 / 840 · EZ: 265 / 550 / 805 / 1060 |
| Kantine | `60 × weeks` if selected | €60/week |
| ÖPNV | ticket price | 7-day 25 (student) / 35 (adult) · monthly 75 / 100 |
| Kulturprogramm | `rate × weeks` | small 40 · medium 60 · large 100 |
| Verwaltungskosten | flat, always | €30 |

Implemented in `src/lib/pricing/group-pricing.ts`, tested in
`src/lib/pricing/__tests__/group-pricing.test.ts`. The workbook's own worked example — 2 weeks,
DZ half board, canteen, 7-day student ticket, large culture programme — reproduces exactly at
**€1,140 per person**.

## Three issues in the workbook — please confirm before this drives real quotes

**1. The materials fee is never added.** `Lehrmaterial` is defined at `B5 = 20`, but the total at
`I11` is `SUM(I5:I10)`, which never references `B5`. Every quote the sheet has produced is **€20
per person short**. On a 15-person group that is €300 per booking.

**2. Monthly transit tickets are multiplied by the week count.** `I8` computes
`VLOOKUP(ticket) × weeks` for all four ticket types. That is correct for the 7-day tickets and
wrong for the monthly ones — a 2-week stay on a *Monatsticket Schüler* is billed €150 instead of
€75. **This over-charges the group.**

**3. Accommodation weeks can silently disagree with the stay length.** The accommodation dropdown
embeds its own week count ("2 Wochen, DZ, HP") and is chosen independently of the week count
driving every other line. Picking a mismatched pair produces a wrong total with no warning.

The implementation applies all three corrections and documents each one. Passing
`includeMaterials: false` reproduces the sheet's current output byte-for-byte, so both can be
compared side by side.

## Two smaller things worth a look

- **Single-room pricing is not linear.** Double rooms are a clean €60 setup + €195/week
  (255 / 450 / 645 / 840). Single rooms step 265 → 550 → 805 → 1060, i.e. +285 then +255 then
  +255. There is a €30 discontinuity at the two-week mark. Intentional, or a typo in the 1-week
  price?
- **Nothing is priced beyond four weeks.** The table stops at 4. The implementation extends at
  the marginal weekly rate and returns a warning rather than inventing a number, but a real rate
  is needed.

## Culture programme margins

From the `Beispiele Kulturprogramm` sheet, over a two-week stay:

| Tier | Activity cost | Charged | Margin |
| --- | --- | --- | --- |
| small | €49 | €80 | €31 (38.8%) |
| medium | €84 | €120 | €36 (30.0%) |
| large | €135 | €200 | €65 (32.5%) |

Medium is the weakest margin of the three — worth knowing if it becomes the default package.

## Proposed package structure

The coordinator wants "a couple of packages and one flexible package". Recommended shape — the
three fixed tiers are the culture tiers she already defined, wrapped with sensible defaults:

| Package | Weeks | Room | Canteen | Transit | Culture | Per person |
| --- | --- | --- | --- | --- | --- | --- |
| **Bremen Kompakt** | 1 | DZ, HP | yes | 7-day student | small | €575 |
| **Bremen Klassik** | 2 | DZ, HP | yes | 7-day student | medium | €1,080 |
| **Bremen Komplett** | 2 | DZ, HP | yes | 7-day student | large | €1,160 |
| **Flexibel** | any | choice | choice | choice | choice | calculated |

(Figures include the corrected materials fee. Names are placeholders — hers to choose.)

**Decisions needed from the coordinator:**

1. Confirm or reject the three corrections above.
2. Are these the right three fixed packages, and what should they be called?
3. Is there any group-size discount? The workbook has no volume tiering at all — price is
   strictly per person regardless of whether the group is 8 or 40.
4. Adult vs. student transit: should this follow the group's age band automatically?
5. A real rate for stays beyond four weeks.

## What "automation" should mean here

Do **not** publish a computed price as a quotation. CASA's own position is that group offers are
*unverbindlich*, and `german-for-groups` carries `pricing_mode: 'on_request'` for that reason.

The useful automation is:

- The organiser configures a stay on the public page and sees an **indicative** per-person
  estimate, clearly labelled non-binding.
- That configuration submits as a structured brief — group size, ages, dates, weeks, room type,
  board, canteen, transit, culture tier — instead of a free-text email.
- Staff receive the brief plus the computed estimate and issue the binding quote.

That removes the back-and-forth that currently happens by email without CASA committing to a
price it has not reviewed. Work board unit **U9** covers the form; this module is its engine.

---

# Part 2 — Special courses

## Current state

Eight modules across five categories, all €192, all 18:30–20:00, ~12 weeks, autumn 2026. Captured
as data in `src/config/courses/special-course-modules.ts`.

| Category | Module | Level | Day |
| --- | --- | --- | --- |
| Aussprache | Kling gut! Aussprachetraining | B1+ | Mo |
| Prüfungsvorbereitung | telc C1 Hochschule | C1 | Mo |
| Grammatik | Basisgrammatik | A2/B1 | Mo |
| Grammatik | Grammatik kompakt | B1/B2 | Do |
| Schreiben | Schreiben leicht gemacht | A2/B1 | Di |
| Schreiben | B – Schreiben | B1/B2 | Do |
| Konversation | B1/B2 Sprechwerkstatt | B1/B2 | Mi |
| Konversation | C1+ Fachliches Auftreten | C1+ | Di |

## Why the current page underperforms

It is a flat list of eight items that are visually identical — same price, same time, same length.
The reader has to parse eight near-identical blocks to answer the only two questions they have:
**"which one is for me?"** and **"does it fit my week?"** Neither is answerable at a glance. The
categories are headings rather than filters, the levels are buried in body text, and there is no
way to see that Monday holds three different modules.

## What the `module-catalogue` archetype should do instead

1. **Lead with the two real filters — level and weekday.** Everything else is constant, so make
   the two variables the primary axes. A B1 learner free on Thursdays should reach their two
   options immediately.
2. **Show the week as a grid.** Mon/Tue/Wed/Thu with modules in their slot makes the schedule
   legible instantly and shows that you can combine two modules on different evenings.
3. **Colour-code by skill.** `special-course-modules.ts` carries a `skill` per module, mapped to
   the shared skill tokens, so pronunciation and conversation read gold, writing teal, grammar
   violet, exam prep deep teal — the same meanings a learner sees in the student app.
4. **State the constant facts once**, at the top: €192, one 90-minute evening per week, 12 weeks.
   Repeating them eight times is what makes the page feel like a price list.
5. **Say who each module is for in one line.** The single most useful missing sentence.

Positioning: these are the *complement* to a main course, not competitors to it. A learner in an
intensive course adds a writing module. Someone who finished B2 and only needs speaking takes one
module alone. The page should say that.

**Blocked on:** the current term's dates before launch — the autumn 2026 dates above will be
stale by then. `SPECIAL_COURSE_TERM_LABEL` exists to make that visible.
