# Accommodation — host families, rooms, stays, rent

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only.

## The tables

| Table | Rows | New in 2026 | What a row is |
| --- | ---: | ---: | --- |
| `Accommodation` | 142 | 18 | A host family, a CASA flat or another place to stay |
| `Room` | 416 | 7 | A room in it (name 59%, bed and room type on a third) |
| `DateAccommodation` | 2,465 | 510 | **A learner's stay**: dates, type, room, catering |
| `DateRent` | 543 | 102 | Beds held at a place for a period — **for a group visit, or for an intensive-course term** — with its min/max number of learners and whom the host takes |
| `StatementLandlord` | 752 | 136 | **The Wohnungsgeberbestätigung** for a learner's stay, sent to the learner (corrected 2026-10-27; it is not a letter to the host) |
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
a host is a `PaymentOut` (1,997 rows, see `money.md`); the learner gets a Wohnungsgeberbestätigung
(`StatementLandlord`, made by `NewStatementHost_DateAccommodation`, e-mailed by
`SendEmailAttachment_StatementLandlord`).

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

Since then also the rent paid to hosts (`payouts`, 0063 — the place's „Miete" tab) and the
Wohnungsgeberbestätigungen (`StatementLandlord`, 0067 — the place's „Briefe" tab, the booking's and the
learner's letters). The flats' cleaning plan (`CleaningDetail`,
`SingleWeekCleaning`, `CleaningJobReference`: Bad, Küche 1, Küche 2, Gäste WC, Flur / Müll) became
duties that rotate by themselves (0072, docs/ADMIN_WORKSPACE.md §WG-Belegung): SchoolMan's weekly rows
point at other flats' job numbers and are not carried on. The keys (`Key`) are CASA's building keys,
held by staff (Mitarbeitende → Schlüssel), not the flats'.

## For the bridge

- The current stays — who lives where until when — are what a colleague needs beside a booking.
- Host families hold personal data of people who are not learners: they come over with their own module
  (decided 2026-10-18), name and role only for the family.

## Decided from the data

**`DateRent` is beds held at a place** (2026-10-16, corrected 2026-10-27): each row is a host or flat for a
period, with a minimum and maximum number of learners and a project title; 73% point at a group and
37% at the group's offer; 247 were made since 2025, most by the accommodation colleague. It belongs
with group visits and accommodation, not with a host family's general availability.

**What the completeness review added (2026-10-27, migration 0095).** The bridge now reads every fact of
these tables that is in use (the review: every SchoolMan field in use that the bridge did not read):

| SchoolMan | Workspace | Count in the copy |
| --- | --- | ---: |
| `Accommodation._ID_FlatShare` = 1 (exactly CASA's eight flats) | `kind = 'casa_flat'`; `_ID_SchoolFlatShare` and the stays' type are only the fallback for a place without the flag | 8 |
| `Accommodation._ID_Animal` (1 ja / 2 nein, in use since 2024; `_ID_Pet` before) | `has_pets`; `pets` keeps which animals (`AnimalAtHome.Animal_1` with its `Comment_1`) | 31 yes, 64 no |
| `Accommodation.Landlord` (when `_ID_Landlord`), else `Header.Text` | `landlord`: the Wohnungsgeber printed on the confirmation | 17 places |
| `Management._ID_AccommodationTypeOffer / …CateringOffer / …RoomOffer` (since 2025; `Accommodation._ID_AccommodationTypeOffer` before) | `offered_types`, `offered_catering`, `offered_room_types`: codes of the vocabularies, by their `filemaker_id` | 121 / 121 / 95 places |
| `Person._ID_Accommodation` of a place whose `_ID_Person` is empty (non-learners without a family role) | the oldest is `contact_name`, the others household members with role „other" | 29 places, 7 more people |
| `Room._ID_InternalRoom` (the „Zimmernummer in der Wohngemeinschaft") | `accommodation_rooms.number`; a room shows „Zimmer 3 · klein" when its name does not say it | 76 rooms, all 32 of the flats |
| `DateRent._ID_Session` with `Session._ID_DayTimeReference` | `purpose = 'course_term'`, `course_session` (2 morning, 4 afternoon, 5 evening) | 147 (74 / 72 / 1) |
| `DateRent.Comment` (Mädchen/Frau, Jungs/Mann, egal, Betreuer) | `accepts` (female, male, any, group_leader); a comment that says more stays the note | 347 of 352 |
| `StatementLandlord._ID_DateAccommodation`, `ZStartDate`, `ZEndDate`, `_ID_StaffMember` | the letter's `booking_stay_id`, its learner (`person_id`), the Wohnungsgeber, dwelling, move-in and move-out in the letter, the signer's name and `sent_by` | 487 letters of the sample |

`DescriptionRent.Short` is no longer read: it is the group's title copied (119 of its 195 rows; empty
since 2024), and the group comes across with the reservation. The types 3, 4 and 5 of
`AccommodationTypeReference` lost their keys in SchoolMan; a host offering them shows the rest until the
vocabulary carries those ids (a decision for Natalia).

**The work lists.** The stays screen has buttons that filter the list — new start, very new start, end,
very end, staying after the end, CASA flats only, private only, only open ones. The workspace's stays
list starts with the same views in plain words: *arriving soon*, *staying now*, *leaving soon*,
*staying after their course*, *no place yet*, and a filter for CASA flats or host families. Natalia
adjusts them when she sees them.
