# Group visits — `Group`

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-18: counts only.

## What SchoolMan keeps

`Group` has 52 records, made from 2022 on (8 in 2022, 12 in 2023, 6 in 2024, 14 in 2025, 11 in 2026).
A record is a title („Viborg 26", „Bolzano 27"), the company or school (`_ID_Corporate`, 42) and the
agency (`_ID_Agency`, 8), how many learners and teachers come (`NumberStudent` 47, `NumberTeacher` 40),
their ages (`AgeStudent`, 26, typed as text: „16-18", „17 – 19"), the level (`_ID_Level`, 22), the
course type (`_ID_CourseTypeReference`, 45 — intensive on 39), the country (`_ID_Country`, 20, a `Flag`),
the stay (`ZStartDateAcco`–`ZEndDateAcco`, 33) and the lessons (`ZStartDateTuition`–`ZEndDateTuition`,
16), how they arrive (`CommentArrival_Departure_Short`, 19) and whether it is on.

| Field | Values |
| --- | --- |
| `_ID_StatusGroup` | `DecisionReference`: 1 *ja* (23), 2 *nein* (13), 4 *u.B.* (16) |
| `_ID_Platform` | 1 `InternationalAirport`, the intensive line (29, up to 2025); 6 `BusStop`, *Geschlossene Gruppen* (17, since 2026); 4 once |
| `_ID_Level` | SchoolMan's band number, as on courses: 1 A1, 2 A2, 3 B1, 3,5 B1+, 4 B2, 5 C1 |
| `_ID_Active` | 1 on 7, 2 on 45 — an old/new switch, not whether it takes place |
| `NumberStudent`, `NumberTeacher` | Number fields holding text: „4-6", „2-3" |

**What hangs off a group** (by `_ID_Group`): the participants' bookings (`Booking`, 712 — 578 on
groups that still exist), their periods and stays, the group's own courses (`Course`, 38), offers
(`Offer`, ~50, with `DateOffer` for the asked-for dates and `CostDetailSample` for the price lines),
bed reservations (`DateRent`, 338), comments (`Comment`, 61 on the group itself), its work log
(`WorkFlow`, 45), letters (`Letter`, 18), invoices (`Invoice`, 5), internship dates (`DatePlacement`, 4).
The participants are real people with names and birth dates (703 of 712), many of them minors; they
rarely have their own e-mail or address — the school is the contact.

A group's participants pay nothing on their own bookings: most bookings stand at *???* (498) or *u.B.*
(165), and the money is the group's — on its invoices and, for 2025's groups, on charges that sit on the
bookings (174).

## In the workspace (2026-10-18, migration 0058)

`group_visits`, with `bookings.group_visit_id` and `courses.group_visit_id`; „Gruppen" under Schule
(docs/ADMIN_WORKSPACE.md §Groups). `read_groups.py | import-groups.mjs` brings all 52: state, school or
company and agency (the organisations reader takes in every group's parties), course type, band,
country, people and ages, stay, lessons (else the span of the booked periods), travel, the comments and
the work log. The learner sample takes in the participants of this year's four groups (82 bookings,
`sample.py`), so their pages have their people. Since 0059 a group's offers come across too (47, on its
page's Angebote tab; offers.md).

## Not yet across

| SchoolMan | Why not |
| --- | --- |
| `DateRent` — bed reservations with hosts and hostels | Hosts are people: their own module and a privacy decision first |
| `Letter` with `_ID_Group` (18) | Letters come with the learners; a letter to a group has no place yet |
| `Invoice` (5), `PaymentIn` on a group | Invoices are finance's (with DATEV) |
| The participants of earlier years' groups | Beyond the sample |
| Group courses | All ended before the course import's twelve months; a new one links when it is imported |

## Found on the way

- „Viborg 26" stands at *nein* although 31 participants have bookings for its week in September 2026 —
  either it took place and the state was never changed, or the bookings were never called off.
- Five group numbers on bookings (341, 439, 442, 443, 736) name groups that no longer exist (134
  bookings).
- The level and the people are often left empty on the groups asked for; the schools of school groups
  are `Corporate` records, so they arrive as „Firma" (a colleague changes the kind).
