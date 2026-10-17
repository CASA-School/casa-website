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

**Course types, and what is not one (2026-10-17, 0040).** CASA's courses are
three: **intensive**, **evening** and **special courses**. They come first in
every list (`course_types.position`), the rest after. Two rows are not courses
of their own:

- **Bildungszeit** (SchoolMan: *Superintensivkurs*) is two intensive courses at
  once, one in the morning and one in the afternoon — 40 lessons a week, which
  the Bildungszeit recognition asks for. SchoolMan has 1,331 courses and none of
  them is a Superintensivkurs; 138 of its 164 Superintensiv bookings are a pair:
  one person, one start date, a morning and an afternoon intensive course. The
  row stays for the website's page and its price.
- **German for groups** is an intensive course, 20 lessons a week, with the
  group's own class.

Bildungszeit is booked that way since 2026-10-17: into the week's morning and
afternoon intensive classes, with their places checked for those weeks
(docs/ADMIN_WORKSPACE.md §The booking wizard). Its price is Bildungszeit's own
for the weeks when the list has one, else the intensive course's for twice the
weeks — 280 € a week and 520 € for two, as the website says. The seeded
Bildungszeit starts are the website's dates and are no longer booked on. A group
is still to be booked on its own intensive course start.

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

## Price lists (2026-10-13)

A **price list** is the rows of `rates` that share a `valid_from`. The newest
list stays open; every older one closes the day before the next starts
(`valid_to`, kept in step by the repository). Prices change about once a year,
so the Prices screen (Settings → Prices, module `prices`: finance and
management) works in whole lists: it shows the list in force, **prepares** next
year's as a copy valid from 1 January, changes prices in a list that has not
ended, and deletes a list that has not started. A list that has ended is
history and cannot be changed.

The screen and every price reader go through `src/lib/admin/prices`:
`price-list.ts` (pure: the lists from the rows, the list in force on a day,
tariffs) and `repo.ts` (read, save, prepare, delete, each logged to the
activity trail). A course or a stay is priced by a **tariff** — an exact price
for a number of weeks (rows with `min_quantity = max_quantity`) and a rate for
everything else (per week, per lesson, or one price):

| Area | Rows | 2026, from SchoolMan |
| --- | --- | --- |
| Intensive course | `course_type`, 1–10 weeks, and a `week` rate | 145 / 280 / 405 / 520 / 625 / 730 / 835 / 940 / 1057,50 / 1175 €, then 117,50 € a week |
| Evening course, special courses | `course_type`, `lesson` | 7 € and 8 € a lesson, times the term's lessons |
| Rent | `charge_type` `accommodation_rent`, 1–3 weeks, and a `week` rate | 200 / 340 / 460 €, then 145 € a week (580 € for four) |
| Fees | `charge_type` `enrolment_fee`, `accommodation_placement_fee`, `deposit` | 50 €, 50 €, 580 € |
| Exams | `exam_type`, `parts` 2 and 1 | telc B2 190 / 160 €, C1 Hochschule 210 / 185 € |
| Books | `material` | the 36 from 0004 |

**A booking's rent (2026-10-17)** is priced by the offers module's rule
(`rentPrice`): whole Sunday-to-Saturday weeks of the stay, which defaults to the
day before the course to the Saturday after — 8 weeks for an 8-week course. A
rate for the stay's own type, room or meals would come first; the list has only
the generic rent today, as SchoolMan prices every type alike, and the Prices
screen cannot enter one per type yet. The offers module also adds the placement
fee and the deposit on a learner's first stay; a booking does not yet — open
decision. The enrolment fee („Einschreibegebühr", SchoolMan's and the website's
word) is charged once, on a learner's first booking.

The course, rent and fee rows came with `db/seeds/0007_price_list_2026_from_filemaker.sql`
(from `WriteCoursePriceInternationalAirport_Booking`,
`WriteCoursePriceCentralStation_Booking`, `WriteAccommodationPrice`), imported
**once**: the seed records itself in `data_imports` (migration 0023), so a
release never brings back a price CASA has changed or removed. Every later
price is entered on the screen.

A term carries its **lessons** (`course_instances.lessons`, 0023) where
FileMaker counted them from its class dates — the 2027 winter evening term is
54 lessons on Monday and Wednesday and 56 on Tuesday and Thursday, 378 € and
392 €; without a count, the class days outside the school's closures are
counted. An offer and a booking price each thing from the list in force on its
own day (the course on its first day, the room on arrival), and keep the
amounts they were made with. `applicable_rate()` still resolves the enrolment
fee, books and exams; course tuition and rent go through the tariff, which it
does not read.

Not yet in the list: Bildungszeit (no rule in SchoolMan; the catalogue's "from"
price stands), exam preparation courses (13 € a lesson in SchoolMan, no course
type here), meals and room types (SchoolMan prices only a single room without
meals).

### What the website shows (2026-10-13)

The list is far bigger than what the public site publishes. The site shows a
dozen figures, each one entry of the list in force today
(`src/lib/content/published-prices.ts`, `PUBLISHED_SLOTS`; marked **On the
website** on the Prices screen):

| On the site | From the list |
| --- | --- |
| Intensive, 4 and 8 weeks; "from" on the course pages | the intensive course's 4 and 8 weeks |
| Evening, "from" | the cheapest evening term still to come (its lessons × the rate) |
| Special courses, an evening and a module | the per-lesson rate × 2, × 24 |
| Enrolment fee, rent for 4 weeks, each further week, placement fee, deposit | the fees and the rent |
| telc B2 and C1 Hochschule, full and one part | the exams |
| The calculator's book range | the cheapest and dearest course book |

They reach every place a price is shown: the live values in texts (`facts.ts`),
the course and exam rows (`repository.ts`), the exam pages
(`exam-fees.ts`), the accommodation pages (`accommodation-costs.ts`), the
special-course modules, the calculator and `llms.txt`. The server reads them
once a minute (`published-prices.server.ts`); a save on the Prices screen
clears that at once, and next year's list takes over on its date by itself.
Without a database the site shows `src/config/calculator/pricing.ts`, which
equals the 2026 list (a test holds the two together); the preparation courses
are only there.

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
  accommodation prices were left empty at first, because the per-booking
  amounts in `CostDetailSample` give no single value; on 2026-10-13 the rules
  were found in SchoolMan's booking scripts instead, and seed 0007 brings
  them (§Price lists).

---

## 5. What CASA has to decide

1. **The course price list.** The 2026 list is SchoolMan's own (§Price
   lists); Bildungszeit and exam preparation have no price there, and the
   operational ones (agency, corporate, group) are in the coordinator's
   workbook and need confirming.
2. **The accommodation price list.** SchoolMan prices every type alike and only
   a single room without meals; a different price for the CASA flat, a double
   room or meals would be rows of their own. The deposit: 580 € in the script
   and on the site, but 50 € key deposit plus 560 € in the flat contract.
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
