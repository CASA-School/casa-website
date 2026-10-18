# Accommodation — host families, rooms, stays, rent

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only.

## The tables

| Table | Rows | New in 2026 | What a row is |
| --- | ---: | ---: | --- |
| `Accommodation` | 142 | 18 | A host family, a CASA flat or another place to stay |
| `Room` | 416 | 7 | A room in it (name 59%, bed and room type on a third) |
| `DateAccommodation` | 2,465 | 510 | **A learner's stay**: dates, type, room, catering |
| `DateRent` | 543 | 102 | A place reserved **for a group visit** for a period, with its min/max number of learners |
| `StatementLandlord` | 752 | 136 | A letter to the host about a stay |
| `AnimalAtHome` | 29 | 10 | A pet in a host family |
| `SpecialAccommodation` | 36 | 0 | Special features — unused since 2011 |
| `Key`, `CleaningDetail`, `SingleWeekCleaning` | 118, 125, 781 | — | Keys and the cleaning plan of CASA's flats |

## What a stay holds

`DateAccommodation`: start and end date on every row; person, booking and line on every row;
accommodation 95%, room 95%, type 96%, catering 94%. The type is a **host family** ("bei Deutschen")
on 1,650 stays and a **CASA flat** on 708; catering is "without" on 1,697 and half board on 611. The
stay's status (`StatusAccommodation`) is on a quarter.

## How it is made

`NewDateAccommodation_Booking` from the booking; the rent price by `WriteAccommodationPrice`, which
prices only the standard room without meals and leaves the rest "to calculate by hand". Rent paid to
a host is a `PaymentOut` (1,997 rows, see `money.md`); the host gets a `StatementLandlord`.

A host family is a `Management` record turned into an `Accommodation` (`Go_Management_Accommodation`)
— its members are `Person` rows with a family role (Vater, Mutter, Tochter …, 589 people). The family's
description is stored twice, German and English (`DescriptionAccommodation_1/2`, on a quarter).

## Who works with it

**Natalia** does the accommodation placement (*Vermittlung*): she finds host families for learners and
manages the rest of the stay (Rahman, 2026-10-15). Payments to hosts are finance's (`money.md`). When
accommodation moves, it is built with her.

## In the workspace today

Since 2026-10-18 (migration 0060, Rahman: "we are fine with host family privacy"): `accommodations`,
`accommodation_members`, `accommodation_rooms`, `accommodation_reservations`, and the learners' stays
(`booking_stays`, 0056) placed at them — „Unterkünfte" and „Aufenthalte" (docs/ADMIN_WORKSPACE.md
§Accommodation). `read_accommodation.py | import-accommodation.mjs` brings all 142 places: 131 host
families, 8 CASA flats (three flagged, five WGs found by their stays), 3 others; 108 family members, 169
rooms, 542 group reservations, 99 comments. Members carry name and role only.

Not yet: rent paid to hosts (`PaymentOut`, finance), the letters to hosts (`StatementLandlord`), keys and
the flats' cleaning plan (`Key`, `CleaningDetail`, `SingleWeekCleaning`).

## For the bridge

- The current stays — who lives where until when — are what a colleague needs beside a booking.
- Host families hold personal data of people who are not learners: they come over with their own module
  (decided 2026-10-18), name and role only for the family.

## Decided from the data

**`DateRent` is accommodation reserved for group visits** (2026-10-16): each row is a host or flat for a
period, with a minimum and maximum number of learners and a project title; 73% point at a group and
37% at the group's offer; 247 were made since 2025, most by the accommodation colleague. It belongs
with group visits and accommodation, not with a host family's general availability.

**The work lists.** The stays screen has buttons that filter the list — new start, very new start, end,
very end, staying after the end, CASA flats only, private only, only open ones. The workspace's stays
list starts with the same views in plain words: *arriving soon*, *staying now*, *leaving soon*,
*staying after their course*, *no place yet*, and a filter for CASA flats or host families. Natalia
adjusts them when she sees them.
