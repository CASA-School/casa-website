# The catalogue, the types, and the price list

**Read this before adding a product, a type, or a price anywhere in the
workspace.** It is the survey of what FileMaker's background setup actually
contains, read live on 2026-09-09, and the model migration `0011` builds from
it.

The short version: FileMaker's **vocabulary is good and was ported almost
unchanged**. Its **prices are not data at all**, and that is the single largest
thing the workspace fixes.

---

## 1. What the school's setup consists of

SchoolMan has 231 tables, of which **99 are reference or configuration
tables** — a careful, real vocabulary built over eighteen years. The ones that
matter to us, with their live counts:

| FileMaker table | Rows | What it defines | Ported to |
| --- | --- | --- | --- |
| `CourseTypeReference` | 14 | Intensivkurs, Abendkurs, Sommerkurs, Einzelunterricht, Geschlossene Gruppe, Prüfungsvorbereitung, Juniorkurs, Firmenunterricht, Spezialkurs, Superintensivkurs, Online Kurs, Zusatzkurs (+2 retired OBS courses) | `course_types` (existing) + `name_de`, `short_code`, `down_payment`, `teaching_mode`, `filemaker_id` |
| `LevelReferenceSchool` | 10 | A1 A2 B1 **B1+** B2 C1 TD CH SK ND, each with a CEFR band and a colour | `levels.cefr_band`, `levels.colour_hex` |
| `LevelStepReference` | 13 | A1.1 … C1.3, the teachable steps | `levels` (existing) |
| `ExamReference` | 5 | TestDaF, B1 Prüfung (retired), B2 telc, C1 Hochschule, TestAS | `exam_types` + `short_code`, `parts_separable` |
| `AccommodationTypeReference` | 6 | Wohngemeinschaft, bei Deutschen, Familie mit Kindern, Apartment, **CASA – WG**, Hotel | `accommodation_types` |
| `AccommodationCateringReference` | 5 | mit Küchenbenutzung, Frühstück, Halbpension, Vollpension, ohne Verpflegung | `catering_options` |
| `AccommodationRoomReference` | 4 | Einzelzimmer, Doppelzimmer, 3er Zimmer, Bad extra | `accommodation_room_types` |
| `TypeBedReference` | 4 | Einzelbett, Doppelbett, 2 getrennte Betten, Einzelbett + Zustellbett | not yet — belongs with the accommodation module |
| `DayTimeReference` | 3 | vormittags 09:00–12:30, nachmittags 13:00–17:30, abends 18:30–20:00 | `day_times`, **with the hours** |
| `TypeTeachingReference` | 3 | Präsenz, Online, Blended | `course_types.teaching_mode` |
| `CostTypeReference` | 6 | Kurskosten, Kultur und Freizeit, Accommodation, Bücher, Exam, Anderes | `charge_categories` |
| `CostDetailReference` | 34 | every kind of line that can appear on a booking | `charge_types` (32 ported; 2 were separators) |
| `BookReference` | 36 | teaching materials with ISBN, level, volume **and a net price** | `materials` + `rates` |
| `CurrencyReference` | 2 | Euro, Dollar | `bookings.currency` / `rates.currency` (text) |
| `PlatformReference` | 24 | the "platform" a booking belongs to — see §4 | not ported, deliberately |

Also present and not yet needed: `HobbyReference`, `AnimalReference`,
`TypeFoodReference` (alles / vegetarisch / vegan), `CleaningJobReference`,
`KeyTypeReference`, `HolidayReference`, `IllnessReference`,
`QualityReference`, `SourceReference`, `PurviewReference` — real vocabularies
for the accommodation, cleaning and staff modules when those are built.

**Every ported row keeps its `filemaker_id`**, so the phase-3 import updates
these rows rather than creating a second copy of the school's vocabulary.

---

## 2. Where FileMaker keeps its prices

Four places, none of them maintainable.

**1. Typed per course.** `Course.CoursePrice` — a plain number on each of
1,318 course records.

**2. Typed per line, per booking.** `CostDetail.CostGross` — 76,362 rows.
Every amount on every booking was keyed in by hand.

**3. Copied per group offer.** `CostDetailSample`, 1,744 rows of cost drafts.
Sampling 400 of them gives **171 distinct combinations** of (line, unit price,
unit) for what should be a handful of products. "Kurspreis" alone appears as:

| Amount | Unit | Times |
| --- | --- | --- |
| 900 | 1 | 13 |
| 880 | 1 | 7 |
| 860 | 1 | 7 |
| 45 | 32 | 6 |
| 378 | 1 | 6 |
| 500 | 1 | 6 |
| 416, 260, 240 | 1 | 4 each |

**4. Inside a script.** This is the one that matters. The exam fee is set by
`SetPrice_Exam_NationalAirport`, a 28,062-character script whose operative
step is:

```
Set Field [ CostDetail::CostGrossUnit; Case (
  Booking::_ID_ExamReference = 3 and count_ID_SingleDateStudent = 2; 190;
  Booking::_ID_ExamReference = 3 and count_ID_SingleDateStudent = 1; 160;
  Booking::_ID_ExamReference = 4 and count_ID_SingleDateStudent = 2; 210;
  Booking::_ID_ExamReference = 4 and count_ID_SingleDateStudent = 1; 185; "") ]
```

telc B2 costs 190 € for both parts and 160 € for one; C1 Hochschule 210 € and
185 €. **Those four numbers are source code.** Changing a fee means editing a
script, and the script also refuses to run twice by setting
`Booking::_ID_PriceCourseSet = 1` — which is not, despite the name, a link to
a price set. There is no price set. It is a ""already priced"" flag.

**Accommodation has no price at all.** The `Accommodation` table (139 rows)
carries no money field of any kind. Rent is typed per cost line; a sampled
`DateAccommodation` row shows `CostDetail::acc_CostGross 1321.98` against
`WG | EZ | ohne` for four weeks, with nothing stating the weekly rate.

### What this costs the school

- Nobody can answer "what does an intensive course cost in October" without
  opening a booking or asking a colleague.
- A price rise has to be applied by hand, per course, and old bookings are
  indistinguishable from mistakes.
- The published website prices and the booked prices have no common source,
  which is why `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` had to be written by
  checking casa-bremen.de against a spreadsheet.
- `docs/GROUP_PRICING_AND_SPECIAL_COURSES.md` records the group price model
  living in a coordinator's Excel workbook, with three arithmetic bugs in it.

---

## 3. The model: types as tables, prices as rates

### Types
Each vocabulary is a table with a stable `code`, English and German names, the
office shorthand the team writes, an `is_active` flag, a `position` for
ordering, and its `filemaker_id`. Codes rather than integers, because
`accommodation_rent` reads in a query and `3` does not.

### Rates
One table, `rates`, prices everything. A row says: **how much**, **per what**,
**for which thing**, **under which conditions**, and **when it is true**.

```
scope        course_type | exam_type | accommodation | material | charge_type
target       exactly one of course_type_id, exam_type_id, material_id,
             accommodation_type_code, charge_type_code   (enforced by CHECK)
narrowing    level_code, day_time_code, catering_code, room_type_code,
             parts, min_quantity, max_quantity            (all optional)
amount       amount, unit (item | week | lesson | night | month | person_week),
             currency, vat_rate
validity     valid_from, valid_to
```

`applicable_rate(...)` returns the rate that applies, choosing the **narrowest
match** and then the most recent `valid_from`. So:

- An intensive course is priced per **week**; four weeks costs four times the
  weekly rate, and a 1–4 / 5–12 / 13+ week band is three rows, not three
  scripts.
- A shared flat is priced per **night** or per **week**, narrowed by catering
  and room type — the three facts FileMaker kept only in a label (`WG | EZ |
  ohne`).
- An exam is priced by `parts`, which is the `Case()` above turned into two
  rows a person can edit.
- Next year's price list is entered today with `valid_from = 2027-01-01`, and
  nothing about this year changes.

### Cost lines still carry their own amount
`booking_charges` keeps `amount`, and gains `rate_id`, `quantity` and
`unit_amount`. The rate is where the number **came from**; the charge is what
was **agreed**. A price rise must never restate an existing booking, and an
agreed discount must survive the rate that produced it. This is the
raw-plus-typed rule from `docs/FILEMAKER_LESSONS.md` §2 applied to money.

---

## 4. What was deliberately not ported

- **`PlatformReference` (24 rows).** FileMaker's `_ID_Platform` is
  simultaneously a product line, a sales channel and a layout selector —
  "IntAirport", "CentralStation", "BusStop", "TransitHall" are course, evening
  course, closed group and accommodation. Every one of the 84 `_ID_*` columns
  on `Booking` exists partly to serve it. The workspace states the same facts
  directly: a booking has a course type; accommodation is its own module.
- **`Course.CoursePrice`, `CostDetailSample`.** Superseded by `rates`.
- **Prices as literal values.** Only the ones actually recoverable are seeded
  (`db/seeds/0004_rates_from_filemaker.sql`): the 36 book prices, the four
  exam fees from the script, and the 50 € enrolment fee. Course and
  accommodation prices are left empty **on purpose** — there is no defensible
  single value to import, and inventing one would put a wrong number in front
  of a paying customer.

---

## 5. What CASA has to decide

1. **The course price list.** Per course type, per week, with duration bands
   and a validity date. `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` has the
   published figures; the operational ones (agency, corporate, group) are in
   the coordinator's workbook and need confirming.
2. **The accommodation price list.** Per accommodation type × room type ×
   catering, per week or night, plus deposit and placement fee.
3. **VAT.** `charge_types` carries the rate FileMaker's `_ID_VatReference`
   implied (19% or 7%); those need checking against what CASA actually
   invoices. Course tuition by a recognised school is usually exempt.
4. **Agency commission.** `charge_types.is_commissionable` is ported from
   FileMaker, where only `Kurspreis` is marked. The percentage lives per
   agency in FileMaker (`CostDetail.CommissionPercentage`) and has no home
   here yet.
5. **Whether the down payment is a rate or a rule.** FileMaker stores 200 €
   for Intensive and 100 € for Evening on the course type. It is currently
   `course_types.down_payment`; if it ever varies by period it becomes a rate.

---

## 6. Still to port

The accommodation module itself (`Accommodation` 139 landlords, `Room` 416
rooms already ported for classrooms, `DateAccommodation` 2,424 stays,
`SpecialAccommodation`, `TypeBedReference`, cleaning jobs, landlord payments
via `PaymentOut`), teachers and their availability (`StaffMember` 76), the
weekday course schedule (`WeekOfCourse`, `SingleDateCourse` 33,201), holidays,
letters and receipts, agencies and corporate clients, and the day-calendar
home screen. Each one gets the same treatment: read the screen the team uses,
port the vocabulary, refuse the defects.
