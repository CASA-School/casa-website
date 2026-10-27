# Offers — `Offer`, `CostDetailSample`, `DateOffer`

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-18: counts only. The full
analysis of the offer area (fields, scripts, the letter texts, the defects) is docs/OFFERS.md §What
FileMaker does.

## What SchoolMan keeps

397 offers (33 in 2022, 97 in 2023, 103 in 2024, 90 in 2025, 74 in 2026), 6 of them templates. An
offer names whom it is for through any of its links: a group (`_ID_Group`, 54), an agency (21), a
company (`_ID_Corporate`, 114 — the Jobcenter among them), a learner through the person, the booking or
the pre-booking (189), nobody or another party (19). Its lines are `CostDetailSample` rows (1,725 on 372
offers): a line type from `CostDetailReference`, a German and an English label with a detail typed after
it, a quantity (`Unit`: weeks, lessons, tickets or people, never said which) and a typed price; 63 of
the 871 brought across have no price (the parts of a package price). `DateOffer` has 169 rows on
offers: 60 course periods, 28 stays, 3 internships, 78 without a type.

**What became of an offer is recorded nowhere** — no status, no answer. The evidence: 10 led to an
invoice (`_ID_Invoice`), a group's own state (`_ID_StatusGroup`), and the letters that went out (`Letter`
with `_ID_Offer`: 217 on 153 offers, only from 2024 on — older letters live in `Letter.fmp12`). Letters
are written by `WriteOfferLetter.Parameter_Offer` (De 114, En 28), the Jobcenter variant (11), or
without a script (64).

## In the workspace (2026-10-18, migration 0059)

The offers module (`offers`, `offer_lines`, `letters`); `read_offers.py | import-offers.mjs` brings the
195 offers whose recipient the workspace has (docs/OFFERS.md §From SchoolMan): their lines as typed
lines, their letters as sent versions, and an answer worked out from the evidence above — which needed
one answer the module did not have: „Ohne Antwort" (`lapsed`), now also one a colleague records.

## Not yet across

| SchoolMan | Why not |
| --- | --- |
| Offers to learners outside the sample (174) | Beyond the sample |
| Offers naming no recipient (13) | No one to file them under. Since 2026-10-27 an offer made from a party's own screen (`_ID_Management`, else `_ID_Institution`) goes to that party when nothing else names its recipient (6 read, 5 whose party is here) |
| Templates (6, `_ID_ActiveTemplate`) | The workspace's templates are its packages and „Like last time" |
| `DateOffer` on a group (the asked-for periods) | A group's dates are on the visit. A pre-booking's wishes come with the intake since 2026-10-27 (intake.md) |
| Letters before 2024 | In `Letter.fmp12`, not in reach |

**The date on the letter** (`DateOfEmission`, 2026-10-27): an offer that is no draft and has no letter here
(149, from before the letters reached SchoolMan) takes it as the day it went out. The first run that brings
it stamps those offers „changed today" once (the offers table's `updated_at` trigger).

## Found on the way

- A group's offers include separate offers for its escorts („Lehrkraft Unterbringung und Ticket"), so
  „the newest offer of a confirmed group" is sometimes the escorts' offer rather than the group's.
- `Unit` on a course line counts weeks on a group's offer and lessons on a company's („44 × 40").
