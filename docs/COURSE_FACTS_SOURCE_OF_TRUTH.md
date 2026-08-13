# Course Facts — Source of Truth

Last verified: 2026-08-12 against the live TYPO3 site at `casa-bremen.de`.

## Why this file exists

`src/config/content/public-fixtures.ts` contains course prices and weekly hours that were
written as development placeholders and are rendered to the public as if they were real. Several
did not match the live site.

**Rule for agents:** do not treat a number in `public-fixtures.ts` as a fact. Check it here
first. If it is not in this table, it is not verified — mark it `TODO` or `ASSUMPTION` per the
repo convention rather than inventing a plausible value.

## ⚠️ Neon-backed mode needs a migration before these corrections are live

**Fixtures were not the whole story.** With `DATABASE_URL` set — which is how the site actually
renders locally and in production — course facts come from Neon, not from
`public-fixtures.ts`. Correcting the fixtures fixed only fallback mode.

Verified 2026-08-12 by rendering `/courses/intensive-german` against a real build: it showed
`Price: from 940.00 EUR`. The decimals are the tell — `numeric(10,2)` from Postgres, not the
fixture integer.

`db/migrations/0002_course_pricing_mode_and_visa.sql` adds the `pricing_mode` and
`visa_eligible` columns (which did not exist in the schema at all) and corrects the seeded
figures. Until it is applied:

- Neon-mode prices remain the old, wrong ones.
- `pricing_mode` is undefined, so it falls back to `'from'` and Firmenunterricht can render a
  list price for a product CASA quotes individually.
- The `german-for-groups` row may still be under the old `conversation-lab` slug.

```bash
npm run db:migrate
```

Confirm which database `DATABASE_URL` points at before running it against anything shared.

## Terminology

CASA counts in *Unterrichtseinheiten* (UE) of 45 minutes. A 90-minute session is 2 UE. The
`lessons_per_week` field is UE per week. Do not mix UE with clock hours — the Bildungszeit page
is the one place the live site quotes clock hours, and it says 30–40 hours per week.

---

## Verified

| Course | Weekly | Duration | Price | Levels | Source |
| --- | --- | --- | --- | --- | --- |
| Intensive German | 20 UE | 8–9 weeks per level | **€520 / 4 weeks**, €940 / 8 weeks | A1–C1 | `/en/language-courses/` |
| Evening German | 4 UE (2 × 90 min) | ~3.5 months ≈ half a level | €476 + textbook | A1.1–C1.2 in halves | `/sprachkurse/deutsch-am-abend/` |
| Special Courses | 2 UE (1 × 90 min) | 12 weeks | €192 | varies by module, B1+ typical | `/en/language-courses/special-courses-german/` |
| Bildungszeit | 40 clock hours (two intensive courses run in parallel) | blocks of 1–9 weeks | €280 / 1 week, €520 / 2 weeks | from B1 | `/en/language-courses/educational-leave/` |
| German for Groups | 20 hours | by arrangement | **no published price — individual quote** | by arrangement | `/en/language-courses/german-for-groups/` |
| Firmenunterricht | by arrangement | by arrangement | **no published price — non-binding consultation** | by arrangement | `/sprachkurse/firmenunterricht/` |
| German for Medical | not published | not published | not published | **B2 and C1 entry** | `/en/language-courses/german-for-medical-professionals/` |

### Corrections to earlier assumptions

Two things I flagged as suspect in `COPY_AND_COURSE_ARCHETYPE_REVIEW.md` turned out to be
correct in the repo, and the review has been amended:

- **Bildungszeit at 40/week is right.** The live site states that educational-leave recognition
  requires 30–40 hours of instruction per week and that CASA's superintensive courses meet that.
  The repo's `lessons_per_week: 40` is accurate. Its **price** of €640 is not — it should be €280.
- **Evening German at 4 UE / €476 is right.** Both match the live site exactly.

### Detail worth keeping

- Intensive runs morning 09:00–12:30 or afternoon 13:00–17:30, international groups of 10–15.
- Evening runs 18:30–20:00, Mon/Wed or Tue/Thu. A year covers roughly 1½ levels.
- Special courses run 18:30–20:00 and exist in five families: pronunciation, telc C1 Hochschule
  exam preparation, grammar (two levels), writing (two levels), conversation (three levels).
- Exam preparation is explicitly **not** part of the intensive programme. The site says so.
- German for Groups includes host-family accommodation (single or double, meals optional), a
  culture programme (city rallye, mini-golf, Rathaus and Weserstadion tours, museums, excursions
  to the North Sea / Hamburg / Lübeck), a public transit pass, and a participation certificate.
  Enquiries go to a named coordinator by email and return a personalised no-obligation quote.
- Bildungszeit falls under the *Bremisches Bildungszeitgesetz*: ten days over two years for
  employees in Bremen. Students may join on Mondays.

### Textbooks per level — verified 2026-08-12 against klett-sprachen.de

CASA teaches from two Ernst Klett Sprachen series. Titles, ISBNs and product URLs were read
directly out of the product-page markup and independently re-verified (HTTP 200, no redirect,
ISBN present in the page body; a control test confirmed the CDN 404s on fabricated ISBNs).

| Level | Book | ISBN-13 |
| --- | --- | --- |
| A1 | Netzwerk neu A1 – Kursbuch mit Audios und Videos | 978-3-12-607156-7 |
| A2 | Netzwerk neu A2 – Kursbuch mit Audios und Videos | 978-3-12-607164-2 |
| B1 | Netzwerk neu B1 – Kursbuch mit Audios und Videos | 978-3-12-607172-7 |
| B1+ | Kontext B1+ – Kursbuch mit Audios und Videos | 978-3-12-605334-1 |
| B2 | Kontext B2 – Kursbuch mit Audios und Videos | 978-3-12-605342-6 |
| C1 | Kontext C1 – Hybride Ausgabe allango | 978-3-12-605349-5 |

Data lives in `src/config/content/klett-textbooks.ts`.

**ASSUMPTION — the level→series split is not from casa-bremen.de.** Netzwerk neu up to B1 and
Kontext from B1+ traces to `src/config/calculator/pricing.ts:95-99` (citing "Flyer Intensivkurse
NEU 24.25") and is consistent with the placement tests CASA links to. Confirm with staff.

**OPEN QUESTION — complete-level volumes vs half-level editions.** The ISBNs above are the
**complete** volumes (e.g. "Netzwerk neu A1"). Klett also publishes **half-level** editions
("Netzwerk neu A1.1", "A1.2"), and `CASA_LEVEL_SEQUENCE` is built from half-levels
(A1.1, A1.2, A2.1 …), which suggests CASA may actually issue the split editions. Ask the office
which they hand out; if it is the split editions, every ISBN in this table changes.

**B1+ duration — confirmed by Rahman (project owner) 2026-08-13, not published on
casa-bremen.de.** About 2 months (8–9 weeks), the same order as a full level, despite billing at
the half-level rate — CASA apparently runs it as two internal parts (B1+.1 / B1+.2), which is
intentionally not modelled as separate tabs here. Tracked in
`level-progression-timeline.tsx` as `WEEKS_FOR_BRIDGE_STAFF_CONFIRMED`, kept as a distinct
constant from the site-verified `WEEKS_PER_LEVEL` so the two provenances never blur — this
number did not come from the same rejection of `cost-calculator.ts`'s derived-from-a-price-tier
4 weeks (see the code comment there for why that number was wrong on its own terms).

**Cover artwork is NOT licensed and must not be published.** See the block comment in
`klett-textbooks.ts`: Klett's Impressum expressly reserves rights, their press page grants
royalty-free use for the *logo* only and only for editorial purposes, and CJEU C-161/17
(Renckhoff) held that re-hosting a freely available image — on a school website — is a new
communication to the public requiring authorisation. Each entry carries
`coverPermission: 'none'`; the UI renders a designed stand-in and never fetches Klett artwork.
To unblock, request written permission from `pr@klett-sprachen.de` (cc
`abdruckanfrage@klett-sprachen.de`) for the exact ISBNs above, and ask Klett to confirm the
grant covers the cover *photography* — their own reprint page warns it may belong to third
parties. Then set `coverSrc` + `coverPermission: 'granted'` and add a "not affiliated with /
endorsed by Ernst Klett Sprachen GmbH" note.

### Ancillary costs

| Item | Amount | Source |
| --- | --- | --- |
| Enrolment fee, first-time students | €50 | intensive-german-courses / educational-leave pages |
| Textbooks, single intensive course | €23.99–26.99 | intensive-german-courses page |
| Textbooks, Bildungszeit (two parallel courses) | €46–54 | educational-leave page |
| Each additional intensive week | €117.50 | intensive-german-courses page |

**Resolved 2026-08-13.** Both figures are real and consistent, not competing claims:
`casa-bremen.de/en/language-courses/intensive-german-courses` states *"books
23,99€-26,99€\* \*varies according to level"*; `.../educational-leave` states *"books 46€ -
54€\* \*costs for two books"* — its own footnote says two books, because Bildungszeit runs two
intensive courses in parallel. 2×23.99=47.98 and 2×26.99=53.98 land inside the quoted €46–54
range, confirming the same underlying per-book price. `BOOK_PRICE_LOWER`/`UPPER` in
`src/config/calculator/pricing.ts` are corrected to 23.99/26.99 to match.

Also confirmed real (was previously flagged here as unverified in error): **"each additional
week EUR 117.50"** on `/courses` is directly quoted from the intensive-courses page.

---

## Not verified — do not publish as fact

| Claim | In repo | Status |
| --- | --- | --- |
| German for Medical: 4 UE/week, €400 | `public-fixtures.ts` | Checked 2026-08-13 against `casa-bremen.de/en/language-courses/german-for-medical-professionals/` and the German course page `/sprachkurse/deutsch-fuer-mediziner`. **Fee and hours genuinely not published anywhere on the site** — confirmed by direct fetch, not just absence from search results. Only the CEFR entry (B2/C1) and FSP framing are public. A dated news post ("26.06.–28.08.2026") surfaced in search but would not render its article body on direct fetch and no longer appears in the live `/aktuelles` list — **inconclusive, do not treat as confirming the dates already in `course-profiles.ts`.** Still needs staff confirmation for fee, hours, and dates. |
| Firmenunterricht: €1,200 | `public-fixtures.ts` | Quote-based. Publishing a number is a commitment CASA has not made. |
| TestDaF as an administered exam, €215 | `public-fixtures.ts` | Appears only as a footer logo on the live site. No dates, no fees. Likely preparation-only or an affiliation. |
| `university-prep`, `business-german`, `summer-intensive`, `integration-german`, `exam-preparation` | full fixture rows with prices | Not in the live course menu. Either unlaunched, retired, or invented. Confirm before any of them ship. |
| ~~Founded 1983~~ | — | ✅ **Verified 2026-08-12** by CASA staff. Cleared for public use; already live on `/`, `/about`, `/accommodation/become-host`. |
| 40+ staff/teachers | draft claim in `CLAUDE.md` | Explicitly draft. Must not ship. |
| Visa eligibility Yes/No per course | inferred in `repository.ts:576` | **Inferred from `lessons_per_week >= 15`, not verified.** See below. |

## The visa eligibility problem

`inferVisaEligibility` in `src/lib/content/repository.ts:576` returns true when a course has
`lessons_per_week >= 15` or when its `format` string contains "intensive", "academic", or
"integration". `src/app/courses/page.tsx:755` renders that boolean to visitors as a Yes/No
"visa eligible" row in the course comparison table.

This is a legally consequential claim generated by a magic number. German student-visa language
course requirements are generally above this threshold, so the heuristic can tell a prospective
student that a course qualifies when it may not. It also means any future edit to
`lessons_per_week` silently changes a visa claim.

This should become an explicit per-course flag set by staff, or the row should be removed until
each course is confirmed. Tracked as its own task.

---

## Pricing shapes

Three of the courses above have no single price, and the current schema cannot express that —
`default_price` is a required `number` on `CourseTypeRow`. This is why Firmenunterricht renders
"Price from 1200 EUR" for a product that is quoted per company.

The data model needs a pricing mode alongside the amount:

- `fixed` — one price for the whole course (Special Courses, €192)
- `from` — lowest of several durations (Intensive, from €520; Bildungszeit, from €280)
- `on_request` — no public price; the page shows a quote path instead (Groups, Firmenunterricht)

This is the smallest useful step toward the `package-inquiry` archetype in
`COPY_AND_COURSE_ARCHETYPE_REVIEW.md`, because "has no price" is precisely what separates that
archetype from the rest.
