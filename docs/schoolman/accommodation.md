# Accommodation — host families, rooms, stays, rent

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only.

## The tables

| Table | Rows | New in 2026 | What a row is |
| --- | ---: | ---: | --- |
| `Accommodation` | 142 | 18 | A host family, a CASA flat or another place to stay |
| `Room` | 416 | 7 | A room in it (name 59%, bed and room type on a third) |
| `DateAccommodation` | 2,465 | 510 | **A learner's stay**: dates, type, room, catering |
| `DateRent` | 543 | 102 | A period a place is offered to CASA, with its min/max number of learners |
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

Only the vocabularies: `accommodation_types`, `accommodation_room_types`, `catering_options`. The
website's host-family pages are content, not data. There are no host families, rooms or stays.

## For the bridge

- The current stays — who lives where until when — are what a colleague needs beside a booking.
- Host families hold personal data of people who are not learners; they come over only with their
  own module and a privacy decision.

## Open questions for the team

1. Is `DateRent` still how a family's availability is recorded? (Natalia)
2. Which of the stay's work lists does she use every week? (Natalia)
