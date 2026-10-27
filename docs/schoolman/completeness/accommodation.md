# Accommodation, landlords, transfers and the business-line tables: completeness review (2026-10-27)

Area: `DateAccommodation`, `Accommodation`, `Room`, `DateRent`, `DatePlacement`, `StatementLandlord`, plus the
"airport/station" tables, transfers, and the accommodation reference tables. Method: profiles, the DDR schema
and relationships, every script that writes these fields, the copy (`schoolman_records`), the local workspace DB, and
eleven small read-only column reads through `fm_read.column` (counts only; no person data printed or written).

## 1. Summary

| Verdict | Gap fields |
| --- | ---: |
| MAP | 9 |
| ALREADY | 3 |
| COPY | 26 |
| PLUMBING | 20 |
| ABANDONED | 2 |
| DECIDE | 2 |
| **Total (= the 62 gap fields of this area)** | **62** |

The review also turned up 6 MAP facts and 6 DECIDE points that the gap list cannot show. Some are on older place
records, others are stored in another table, or the link runs the other way round (§2.10, §3, §6).

### The missing facts, most important first

1. **`StatementLandlord` is the Wohnungsgeberbestätigung, not "a letter to the host".** `SendEmailAttachment_StatementLandlord`
   e-mails it to the **learner** as a PDF ("Wohnungsgeberbestätigung | StatementLandlord"). The row has **no text**:
   `FreeField` and `Subject` are empty on all 768 rows, so the printed layout is built from fields. The facts are the gap fields:
   move-in `ZStartDate`, move-out `ZEndDate`, the stay `_ID_DateAccommodation`, and the signer `_ID_StaffMember`.
   The workspace has 494 of these, all with an empty body, the generic subject „Brief an die Unterkunft" and no addressee.
   About 278 have been issued since 2025: 129 for CASA flats and 149 for other places.
2. **Hosts of new places are linked the other way round.** SchoolMan's own relationship is
   `Person::_ID_Accommodation = Accommodation::__ID_Accommodation`. `Accommodation::_ID_Person` is only the
   "Wohnungsgeber", set by `NewPerson_Accommodation`, and it is empty on 33 of the 38 places since 2025. The reader takes
   the host only from `Accommodation::_ID_Person`. As a result the 43 contact people (non-learners without a family role)
   of 33 places never come across, and `contact_name` is empty on 35 of the 69 newer places in the workspace. The places'
   e-mail, phone and address are not affected: all 37 places without a host link have them on `_ID_Accommodation`.
3. **`DateRent` is not only for group visits.** Of the 251 reservations made since 2025, 131 are beds held at 73 places for
   an **intensive-course term**: `_ID_Session`, made by `SetDateRent_Accommodation` with parameter 2 and titled "Intensiv".
   The workspace shows them as bare reservations with no group and no note (140 such rows since 2025).
   **`DateRent.Comment` says whom the host takes** for those beds: Mädchen / Jungs / Frau / Mann / egal / Betreuer(in), on 352 rows.
   The reader takes its note from `DescriptionRent.Short` instead, which has been empty since 2023.
4. **What a host offers moved to `Management`.** Since 2025 the accommodation types, catering and rooms a host offers are on
   `Management._ID_AccommodationTypeOffer / …CateringOffer / …RoomOffer` (29–31 new rows). The same fields on
   `Accommodation` were last filled in 2024. The workspace has no "offers" fact for a place.
5. **Pets:** `Accommodation._ID_Animal` (1 ja / 2 nein, on 90 places) replaced `_ID_Pet` (last filled 2024), which is the
   field the reader reads. 24 places say "pets: yes" only in `_ID_Animal`.
6. **Room number in the flat:** `Room._ID_InternalRoom` is on 198 rooms, including all 32 rooms of CASA's flats. It is the
   "Zimmernummer in der Wohngemeinschaft" printed in check-in and check-out letters. The room name contains it on only 52 rooms.
7. **The CASA-flat flag:** `Accommodation._ID_FlatShare = 1` marks exactly the 8 places the workspace infers as CASA flats
   (3 by `_ID_SchoolFlatShare`, 5 from their stays). It is the clean source for that inference.
8. **The Wohnungsgeber of a place:** `Accommodation.Header.Text`, or `Landlord` when `_ID_Landlord` is set, is copied into
   `StatementLandlord.HeaderLandlord`. It is on 16 places plus 3 flats. It is not in the gap list only because those places
   are older than 2025.
9. **Cross-area:** (a) rent payouts carry the **period they pay for**: `PaymentOut.ZStartDate/ZEndDate` on 1,153 of the
   1,159 rent payouts since 2025, and every one has `_ID_DateAccommodation`. The `payouts` table has neither the period
   nor the stay. (b) About 1,445 accommodation letters since 2025 are in `Letter`, not in `StatementLandlord`
   (to hosts: AnnouncementHost 302, EnquiryHost 118, StayOrLeaveHost 39, …; to learners: StudHostLetter 661,
   StayOrLeaveStudent 183, flat contracts 46, …). `Letter._ID_Accommodation` and `_ID_DateAccommodation` are not
   read, so a letter written to a host shows only on the learner, as if it were to the learner.
10. **The airport/station tables hold nothing the workspace lacks** (§3.1). **Transfers were abandoned in 2023** (§3.2).

**Repo documents to correct** (read-only here, not edited):
- `docs/schoolman/accommodation.md` and the comment in migration 0067 call `StatementLandlord` "a letter to the host".
- The same document says "DateRent is accommodation reserved for group visits".
- `read_accommodation.py` describes `DateRent` as "beds held for groups", and `placeReservations` does the same.

**Population (outside the field scope):** stays (`read_learners.py`) and Wohnungsgeberbestätigungen
(`read_letters_extra.py`) come across only for the sample's bookings. That is 1,544 of 2,482 stays locally, so a
place's occupancy history and its letters are incomplete until the whole-population decision is made.

## 2. Gap fields per table

Numbers are records created since 2025 that hold the field (from the gap list; live counts where stated).

### 2.1 DateAccommodation (a learner's stay; 2,465 rows, 1,052 since 2025)

`NewDateAccommodation_Booking` copies the booking's ids onto the stay when it is created (steps 29–44).
Comparing with the booking (copy vs live read) shows `_ID_Person` 1,068/1,068 equal and `_ID_Group` 232 equal / 1 differ / 1 stay-only.
`_ID_Agency` is 451 equal / 16 booking-only / 2 stay-only, and `_ID_Corporate` is 56 equal / 19 booking-only. The differences are stale copies.

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Platform` | 1051 | COPY | the booking's business line | via `booking_stays.booking_id` | step 36 ← `Booking::_ID_Platform` |
| `_ID_Person` | 1051 | COPY | the learner | `bookings.person_id` | step 34; equal on all recent rows |
| `_ID_InternationalAirport` | 1015 | PLUMBING | copied business-line key | — | step 39; no relationship uses it (§3.1) |
| `_ID_Course` | 994 | COPY | the booking's course | via booking | step 43 ← `Booking::_ID_Course` |
| `StatusAccommodation` | 638 | PLUMBING | text label of the next field (Rookie / Runner / LastDance / Unicorn) | derive | `ActualizeStatusAccommodation`, `ActualizeIDEnrolmentDone_Booking` |
| `_ID_StatusAccommodation` | 583 | PLUMBING | the stay's position among the learner's stays: 1 first, 2 middle, 3 only, 4 last | derive from `booking_stays` dates | recomputed by `Replace Field Contents` from `cal_min_StartDate.x2` / `cal_max_EndDate.x2` |
| `_ID_Client` | 458 | COPY | customer number | `people` (0061) | step 33 |
| `_ID_Agency` | 442 | COPY | the booking's agency | via booking | step 30; see comparison |
| `_ID_Group` | 234 | COPY | the booking's group | `bookings.group_visit_id` | step 32 |
| `_ID_AccommodationEnquiry` | 75 | PLUMBING | the host the next host letter is addressed to (an addressee switch) | — (the asking survives as the letter: `Letter._ID_Accommodation`, §2.10) | read as `$_ID_Accommodation` by `EnquiryHost.*`, `CheckInHost`, `CheckOutHost`, `StayOrLeaveHost`. Live: 118 stays carry it; 89 = the final place, 29 = a family asked first that did not take the learner; none is a stay still waiting for an answer |
| `_ID_Corporate` | 56 | COPY | the booking's company | via booking | steps 31/42 |
| `_ID_BusStop` | 36 | PLUMBING | copied business-line key | — | step 37 |
| `_ID_DepartureStatement` | 8 | DECIDE | a hand-set tick (value 1) on 8 stays (2025: 4, 2026: 4; 4 host family, 4 CASA flat) | possibly `booking_stays.deregistered boolean` | no script reads or writes it. See question 1 in §6 |

### 2.2 Accommodation (a place; 142 rows, 38 since 2025)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Shown` | 38 | PLUMBING | 1/2: whether the place appears in the stay's place drop-down and the WG shortcuts | `accommodations.is_active` | relationship `Accommodation.IDActive.IDShown_DateAccommodation` (`_ID_Shown = DateAccommodation::_1`); agrees with `_ID_Active` on 132/142 |
| `_ID_Animal` | 31 | **MAP** | pets in the household: 1 ja, 2 nein (90 places: 31 yes, 59 no) | new `accommodations.has_pets boolean`. Keep `pets` text for the kinds from `AnimalAtHome` | supersedes `_ID_Pet` (26 places, last 2024). 24 places are "yes" only here; 5 places conflict between the two fields (the newer field wins) |
| `_ID_PermanentOffer` | 13 | DECIDE | 1/2 hand-set on 38 places (34 ja, 4 nein; the ja places are almost all active) | maybe `accommodations.year_round boolean` | no script. See question 2 in §6 |
| `_ID_FlatShare` | 3 | **MAP** (source) | 1 = one of CASA's flats (WG) | `accommodations.kind = 'casa_flat'` | used by `ShowSharedFlatWG.*` finds; = exactly the workspace's 8 flats. Replaces the "most stays are type 7" inference |

### 2.3 Room (416 rows, 15 since 2025)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Management` | 15 | COPY | the place's Management | — | `NewRoom_Accommodation` step 10 ← `Accommodation::_ID_Management` |
| `_ID_InternalRoom` | 15 | **MAP** | room number inside the place (1–8) | new `accommodation_rooms.number smallint` | printed as "Zimmernummer (in der Wohngemeinschaft)" by `CheckInStudent`, `CheckOutStudent.FlatShare`, `AgentHostLetter.*`, rental-contract text. Also the cleaning plan's self-join (`SingleWeekCleaning._ID_InternalRoom`). On 198 rooms, including all 32 flat rooms; the name holds the number on 52, the name is empty on 28 |
| `_ID_Empty` | 15 | PLUMBING | mark that drives the occupancy lookup | — | `Replace Field Contents` → 1 in `ShowSharedFlatWG.Detailed_ShortCut`; relationship `Room::_ID_Empty = GlobalValue::_1`; set on exactly the 32 flat rooms |
| `_adjustOneDay.In` | 1 | PLUMBING | UI date | — | `StartScript` step 126 ← `$$_Today` |

### 2.4 DateRent (beds held at a place; 543 rows, 247 since 2025; live 547 / 251)

`SetDateRent_Accommodation` makes the rows. With parameter 1 the reservation is for a **group's offer line**
(`DateOffer` dates, `_ID_Group`, `_ID_DateOffer`, title = the group's). With parameter 2 it is for an **intensive-course
term** (`Session::ZStartSession/ZEndSession`, `_ID_Session`, title "Intensiv").
Live: since 2025, 120 rows are group+offer and 131 are session. Before 2025, 279 were group rows and 16 session rows.

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Management` | 247 | COPY | the place's Management | — | step 2/25 ← `Accommodation::_ID_Management` |
| `Comment` | 188 | **MAP** | whom the host takes for these beds. One word on 339 of 352 rows: Mädchen/Mädels/Frau/Frauen → **female**; Jungs/Junge/Mann → **male**; egal, "Mädchen/Junge" → **any**; Betreuer/Betreuerin → **group leader** | new `accommodation_reservations.accepts text` (female/male/any/group_leader); anything else → `note` | no script writes it. On group rows (251) and session rows (101). 1 row holds a person's name (it goes to `note`) |
| `_ID_Session` | 127 | **MAP** | the reservation is an allotment for an intensive term, not for a group (73 places; term starts 2024–2027) | new `accommodation_reservations.purpose` ('group_visit'/'course_term') + `course_session` (morning/afternoon/evening from `Session::_ID_DayTimeReference`: 2 vormittags, 4 nachmittags, 5 abends) | `SetDateRent_Accommodation` steps 14–18, 30 |
| `_ID_DateOffer` | 120 | PLUMBING | the group offer line the dates were taken from | — (the group link `_ID_Group` is read and is on every such row) | step 22 |
| `_ID_Selection` | 3 | PLUMBING | selection mark | — | — |

### 2.5 DatePlacement (internship places for a group; 10 rows, 5 since 2025)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Internship` | 5 | COPY | the company's internship record | `_ID_Management` + `Institution` are read | `SetDatePlacement_Internship` steps 1–2, 16–20 take both from the `Internship` row |
| `Comment` | 5 | COPY | = the group's title | — | step 19 ← `Group_DateOffer::TitleGroup` |
| `_ID_DateOffer` | 5 | PLUMBING | offer line the dates came from | — | step 15 |
| `_ID_BusStop` | 1 | PLUMBING | holds a DateOffer id by mistake (671 on 6 rows = `_ID_DateOffer`) | — | the BusStop ids are 3582+ |
| `_ID_Selected` | 1 | PLUMBING | selection mark | — | — |

### 2.6 StatementLandlord (the Wohnungsgeberbestätigung; 752 rows, 262 since 2025; live 768 / 278)

Made by `NewStatementHost_DateAccommodation` from the stay, then printed (`PrintOne.Long_Letter`) or e-mailed to the
learner (`SendEmailAttachment_StatementLandlord`, subject "Wohnungsgeberbestätigung"). `FreeField` and `Subject` (both
read today) are empty on every row, so these fields *are* the document.

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Student` | 262 | COPY | learner number | — | step 48 ← `DateAccommodation::_ID_Student` |
| `Location_Emission` | 262 | COPY | place of issue (the school's city) | constant | step 51 ← `$$_LocationEmission` |
| `_ID_Person` | 262 | COPY | the learner it is for and sent to | set `letters.person_id` from the booking (the importer leaves it empty today) | step 47 ← `DateAccommodation::_ID_Person` |
| `_ID_DateAccommodation` | 262 | **MAP** | the stay it certifies | new `letters.booking_stay_id` | step 46. Booking + place does not identify the stay for 85 booking/place pairs that have 2+ stays |
| `ZStartDate` | 262 | **MAP** | move-in date as certified | into the letter's `document` (body) | step 52, the stay's start when issued |
| `ZEndDate` | 262 | **MAP** | move-out date as certified (on all recent rows) | into the letter's `document` | step 53 |
| `_ID_StaffMember` | 232 | **MAP** | who issued/signed it | `letters.sent_by` via `staff_members.filemaker_staff_id → staff_user_id`; name into `document.signature` | step 57 ← `$$_ID_StaffMember`. The reader's author (`UserName`) has been empty since 2024 |
| `_ID_Client` | 150 | COPY | customer number | — | step 45 |
| `_ID_Signature` | 37 | PLUMBING | which printed signature block | — | the signer is `_ID_StaffMember` |

### 2.7 InternationalAirport (business line 1, intensive courses; 15,176 rows, 4,743 since 2025; not synced)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `Today` | 4743 | PLUMBING | "changes every day" (schema comment) | — | — |
| `TimeStampCreation` | 4743 | PLUMBING | audit stamp of the shell | the booking has its own | — |
| `TimeStampChange` | 4743 | PLUMBING | audit stamp | — | — |
| `_ID_Booking` | 4741 | PLUMBING | the 1:1 link back to the booking | — | the only relationship on the table |
| `_ID_Person` | 4737 | COPY | learner | via booking | `Go_PreBooking_Booking` step 98; = the booking's on 4,825 recent rows |
| `_ID_Student` | 4735 | COPY | learner number | — | step 99 |
| `_ID_Client` | 2812 | COPY | customer number | — | `Go_Booking_InternationalAirport` step 17 |
| `_ID_CourseType` | 89 | COPY | the booking's course type when made | `bookings.course_type_id` | = `Booking._ID_CourseTypeReference` on 5,362 of 5,585 (the differences are stale); 89 of 4,743 recent rows |
| `_ID_Contact` | 17 | ALREADY | the enquiry the booking was converted from | intake link `PreBooking._ID_Booking` (`read_intake.py`) | step 97 ← `$_ID_Contact` (= `Contact::__ID_Contact`, empty unless converted from the Contact screen) |
| `_ID_Gender` | 3 | ABANDONED | — | — | 5 rows ever, value 2 |

### 2.8 CentralStation (business line 4, evening/special/company; 4,927 rows, 1,266 since 2025; not synced)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Student` | 1266 | COPY | learner number | — | `Go_PreBooking_Booking` step 120 |
| `_ID_Booking` | 1266 | PLUMBING | 1:1 link back | — | — |
| `_ID_Person` | 1266 | COPY | learner | — | step 119; equal to the booking on all rows |
| `_ID_Client` | 1010 | COPY | customer number | — | `Go_Booking_CentralStation` step 17 |
| `_ID_CourseType` | 96 | COPY | course type when made | `bookings.course_type_id` | = booking's on 2,989 of 3,039 |
| `_ID_Contact` | 11 | ALREADY | converting enquiry | intake | as above |
| `_ID_Course` | 10 | ABANDONED | — | the booking's course is `Booking._ID_Course` (bookings area) | no script; 158 rows ever |
| `_ID_WaitingRoom` | 5 | ALREADY | the waiting-list entry it came from | `WaitingRoom._ID_Booking` (`read_intake.py`) | — |

### 2.9 NationalAirport (business line 2, exams; 2,361 rows, 801 since 2025; not synced)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Booking` | 801 | PLUMBING | 1:1 link back | — | — |
| `_ID_Person` | 801 | COPY | learner | — | `Go_PreBooking_Booking` step 110; equal to the booking on all rows |
| `_ID_Student` | 796 | COPY | learner number | — | step 111 |
| `_ID_Client` | 508 | COPY | customer number | — | `Go_Booking_NationalAirport` step 17 |

### 2.10 Facts outside the gap list (older records, other tables, or links the other way round)

| Table.Field | Count | Verdict | Meaning | Target | Evidence |
| --- | --- | --- | --- | --- | --- |
| `Person._ID_Accommodation` (the reverse link) | 43 non-learner persons without a family role at 33 places (24 places: exactly one; 3: two; 1: five; 4 places: only family members) | **MAP** | the host / contact of a place whose `Accommodation::_ID_Person` is empty | `accommodations.contact_name` (one person, or the oldest); further contacts → `accommodation_members` role `other` | SchoolMan's relationship `Person_Accommodation` joins on `Person::_ID_Accommodation`. `NewPerson_Accommodation` sets `Accommodation::_ID_Person` only for the "Wohnungsgeber". Fields already on `Sync_Person` (`_ID_Accommodation`, `_ID_Status_Family`, `_ID_Student`) |
| `Accommodation.Header.Text`, `Landlord`, `_ID_Landlord` | Header.Text 16 places (13 other, 3 flats), Landlord 3 flats | **MAP** | the Wohnungsgeber printed on the confirmation | new `accommodations.landlord text` = `Case(_ID_Landlord; Landlord; Header.Text)` | `NewStatementHost` step 33. `StatementLandlord.HeaderLandlord` (87 recent) is the copy |
| `Management._ID_AccommodationTypeOffer` / `…CateringOffer` / `…RoomOffer` | 128 / 122 / 95 (31 / 29 / 29 since 2025) | **MAP** | what the host offers: types (2 bD, 7 CASA – WG, 3/4/5 see question 5 in §6), catering (1 Küchenbenutzung, 2 Frühstück, 3 HP, 4 VP, 6 ohne), rooms (1 EZ, 2 DZ, 3 3er, 5 Bad extra) | new `accommodations.offered_types / offered_catering / offered_room_types text[]` of vocabulary codes | moved from `Accommodation` (last 2024); place → `Accommodation._ID_Management` |
| `Management._ID_StatementLandlord` | 17 (3 since 2025): 1 on all 8 flats + 2 others, 2 on 7 others | DECIDE | which places get a Wohnungsgeberbestätigung from CASA | maybe `accommodations.landlord_confirmation_by` | used only in `FindStudent.In.StatementLandlord` (finds learners in flats OR at places with 2). See question 3 in §6 |
| `Accommodation._ID_HousingNumber` | 4 flats, one value | DECIDE | the flats' broadcasting-fee (Rundfunkbeitrag) number | a setting, or a note on the flat | `Rundfunkbefreiung_Booking` (1 letter since 2025). See question 4 in §6 |
| `Letter._ID_Accommodation` / `_ID_DateAccommodation` | 1,369 / 1,385 since 2025 | **MAP** (Letter area) | the place / stay an accommodation letter is about or addressed to | `letters.accommodation_id` (exists, 0067) + new `letters.booking_stay_id` | about 1,445 letters from 21 accommodation scripts since 2025 (§1, item 9) |
| `Letter._ID_EnquiryHost` | 73 | PLUMBING | holds the booking id to mark an enquiry to a host | — | `EnquiryHost.Parameter_DateAccommodation` step 95; `ScriptName` says the same |
| `PaymentOut.ZStartDate` / `ZEndDate` | 1,112 since 2025 (gap list) | **MAP** (money area) | the period a rent payout covers. Live: on 1,153 of 1,159 rent payouts (`_ID_PaymentOutReference` 1), all with `_ID_DateAccommodation` | new `payouts.period_start`, `period_end`, `booking_stay_id` | no script writes them (typed). `read_money.py` reads the stay only to find the place |
| `BankAccount._ID_Accommodation` | 38 since 2025 | DECIDE (money/privacy) | a host's bank account for rent | — | not read. See question 6 in §6 |
| `WorkFlow._ID_DateAccommodation` / `_ID_Accommodation` | 443 / 147 | ALREADY | work-log entries about a stay (e.g. "Einwohnermeldeamt … informiert") | they come with the learner's work log | `InformAuthority*` scripts |
| `Comment._ID_Management` on a host's Management | 6 rows without a place (2 since 2025) | ALREADY / negligible | — | the rest carry `_ID_Accommodation` and are read | live read |
| `AnimalAtHome.Comment_1` | 8 | MAP (tiny, optional) | detail on a pet | append to `accommodations.pets` | not read |
| `Booking.StatusInternationalAirport`, `InternationalAirport.StatusKlaerung2026` | 7 rows (Erledigt 4, Nicht Erledigt 3) / 0 rows | DECIDE | fields added recently, not in the DDR scripts, not in the profiles | — | live read. See question 8 in §6 |

## 3. Not-covered tables of this area

### 3.1 What InternationalAirport, CentralStation, NationalAirport and BusStop are

They are SchoolMan's **business lines** ("platforms"). `PlatformReference` names them, and the table names are metaphors:

| Platform | Table | Label in `PlatformReference` | Active | Rows |
| ---: | --- | --- | --- | ---: |
| 1 | `InternationalAirport` | Sommerkurse, Juniorkurse, Schulklassen (in practice the intensive courses) | yes | 15,268 |
| 2 | `NationalAirport` | TestDaF und Prüfungen | yes | 2,361 |
| 4 | `CentralStation` | Englisch und Spanischkurse Abend (evening, special, company) | yes | 4,927 |
| 6 | `BusStop` | Geschlossene Gruppen (since 2026) | yes | 36 |
| 8 | `TransitHall` | Wohnungsvermittlung | no | 0 |
| — | `Harbour` (no table, only `_ID_Harbour` fields) | Verschickung zu Partnerschulen | no | 0 |
| — | `Underground` (no table) | Firmenunterricht | no | 0 |
| 7 / 9 | AuPair / CyberSpace | — | no | — |

- **How they are made.** `Go_PreBooking_Booking.Parameter` (steps 93–134), `NewBookingStudent*`, `ExtensionStudent.Duplicate_Booking`,
  `ExtensionGroup.Parameter_Booking`, `Go_Booking_<Line>` and `Go_Person_Platform` create one empty record per booking.
  They set `_ID_Booking`, `_ID_Person`, `_ID_Student` (sometimes `_ID_Client` and `_ID_Contact`) and write its key back to
  `Booking::_ID_<Line>`. Each table is joined only by `_ID_Booking = Booking::__ID_Booking`.
- **The `_ID_InternationalAirport` on other tables.** It and its siblings `_ID_CentralStation`, `_ID_NationalAirport`,
  `_ID_BusStop`, `_ID_TransitHall` and `_ID_Harbour` are fields on 46–72 tables. 118 / 72 / 64 / 63 / 21 / 0 scripts copy
  them, nearly always from `Booking::_ID_InternationalAirport` (90 scripts) or `DateAccommodation::_ID_InternationalAirport` (24).
  **None of the 2,561 relationships in the file uses any of them.** They are dead copied keys, and their only use is
  emptiness tests such as `CheckIDPlatform.Loop_Booking`.
- **Facts the workspace lacks: none.** The tables hold links, audit stamps, a stale copy of the course type, and a new
  unused text field. The one fact behind them is the booking's business line, `Booking._ID_Platform` (bookings area). The
  workspace can derive it: `exam_session_id` → 2, `group_visit_id` (closed group) → 6, the course type → 1 or 4.
  Verdict for all four tables: **PLUMBING**; bring nothing.

### 3.2 Transfers

| Table | Rows | Verdict | What it is | What to bring |
| --- | ---: | --- | --- | --- |
| `SingleDateTransfer` | 978 | ABANDONED | a pick-up or drop-off for a booking (`NewTransfer_Booking`, a button). Live read: created 2011–2023, **none since 2024**. Transfer kind on 355 rows (Pick-up 286, Drop-down 66, nein 3), last in 2021. Pick-up required on 146 (last 2014). Arrival time on 25, flight on 11 (last 2015). Cost, address, comments and destination never filled. (`NewTransfer_Booking` also writes a `$_ID_DateAccommodation` it never sets.) | nothing. If CASA offers transfers again, it is a new feature, not a bridge |
| `TransferReference` | 3 | ABANDONED | 1 Pick-up, 2 nein, 3 Drop-down | nothing |
| `TransitHall` | 0 | ABANDONED | platform 8 "Wohnungsvermittlung" | nothing |
| Harbour | — | ABANDONED | no table; `_ID_Harbour` is empty everywhere | nothing |

### 3.3 Accommodation reference and side tables

| Table | Rows | Verdict | What it is | What to bring |
| --- | ---: | --- | --- | --- |
| `AccommodationTypeReference` | 6 | ALREADY | `accommodation_types` (`filemaker_id` 2 = bD, 7 = CASA – WG) | **Only 2 and 7 still carry a key.** The other four rows (Wohngemeinschaft, Familie mit Kindern, Apartment, Hotel) have an empty `__ID` and `.Manual`, but Management offers and 1 stay use 3, 4 and 5. See question 5 in §6 |
| `AccommodationRoomReference` | 4 | ALREADY | `accommodation_room_types` (1, 2, 3, 5) | — |
| `AccommodationCateringReference` | 5 | ALREADY | `catering_options` (1, 2, 3, 4, 6) | — |
| `TypeRoomReference` | 3 | ALREADY | Room `_ID_TypeRoom`: 1 Einzel, 2 Doppel, 3 Dreier. It maps through `accommodation_room_types.filemaker_id` because the ids happen to coincide | — |
| `TypeBedReference` | 4 | ABANDONED | `Room._ID_TypeBed`, last 2018 | — |
| `AnimalReference` | 5 | ALREADY | the animal kinds behind `AnimalAtHome.Animal_1` (read) | — |
| `SpecialAccommodation` / `SpecialAccommoReference` | 36 / 10 | ABANDONED | special features, unused since 2011 | — |
| `CleaningJobReference` | 17 | ALREADY | cleaning duties (0072) | — |
| `Session` | 115 | needed in part (courses area owns it) | a course term: start, end, time of day, line, parity | for `DateRent._ID_Session`: key, start, end, time of day, line |
| `Internship` | 56 | out of area (organisations/groups) | a company's internship offer | nothing for `DatePlacement`: it copies `_ID_Management` and the name |
| `Floor`, `OccupancyReference` | 5 / 5 | out of area | classrooms (`Classroom._ID_Floor`, `SingleDateOccupancy`) | — |

## 4. add_to_layouts

MAP fields and the new table's key and change field. The DECIDE fields, which would be added only if the answer is yes,
follow the block.

```json
{
  "Accommodation": ["_ID_Animal", "_ID_FlatShare", "Header.Text", "Landlord", "_ID_Landlord"],
  "Room": ["_ID_InternalRoom"],
  "DateRent": ["Comment", "_ID_Session"],
  "StatementLandlord": ["_ID_DateAccommodation", "ZStartDate", "ZEndDate", "_ID_StaffMember"],
  "Management": ["_ID_AccommodationTypeOffer", "_ID_AccommodationCateringOffer", "_ID_AccommodationRoomOffer"],
  "Session": ["__ID_Session", "DateOfChange", "ZStartSession", "ZEndSession", "_ID_DayTimeReference", "_ID_PlatformReference"],
  "Letter": ["_ID_Accommodation", "_ID_DateAccommodation"],
  "PaymentOut": ["ZStartDate", "ZEndDate"],
  "AnimalAtHome": ["Comment_1"]
}
```

- **The new `Sync_Session` layout:** key `__ID_Session`, change field `DateOfChange` (`changeKind` date). The courses
  agent may want more of `Session` on it.
- **If the questions in §6 are answered yes:**
  - `DateAccommodation._ID_DepartureStatement`
  - `Accommodation._ID_PermanentOffer`, `_ID_HousingNumber`
  - `Management._ID_StatementLandlord`
  - `BankAccount._ID_Accommodation` (with the bank fields the money agent decides on)
  - `Person._ID_Selected`. Only to choose the contact at the 4 places with several contacts. It is a generic
    selection mark elsewhere, so taking the oldest person is the safer default.
- **No change for the four business-line tables, transfers, or `DatePlacement`.**

## 5. Implementation notes

Proposed migration (one file, e.g. `0091_accommodation_facts.sql`). Everything fits existing tables. No new table and
no new screen; each item below says whether it is small or needs new columns.

```sql
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS has_pets boolean,
  ADD COLUMN IF NOT EXISTS landlord text,
  ADD COLUMN IF NOT EXISTS offered_types text[], ADD COLUMN IF NOT EXISTS offered_catering text[],
  ADD COLUMN IF NOT EXISTS offered_room_types text[];
ALTER TABLE accommodation_rooms ADD COLUMN IF NOT EXISTS number smallint;
ALTER TABLE accommodation_reservations ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'group_visit'
    CHECK (purpose IN ('group_visit','course_term')),
  ADD COLUMN IF NOT EXISTS course_session text CHECK (course_session IN ('morning','afternoon','evening')),
  ADD COLUMN IF NOT EXISTS accepts text CHECK (accepts IN ('female','male','any','group_leader'));
ALTER TABLE letters ADD COLUMN IF NOT EXISTS booking_stay_id uuid REFERENCES booking_stays (id) ON DELETE SET NULL;
-- money area, if its owner agrees:
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS booking_stay_id uuid REFERENCES booking_stays (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS period_start date, ADD COLUMN IF NOT EXISTS period_end date;
```

**A. Host contact through the reverse link (small, reader only).**
- `read_accommodation.py` already reads `Person` (`__ID_Person`, `_ID_Accommodation`, `_ID_Status_Family`). Add
  `_ID_Student` (to leave learners out) and `TimestampCreation` (for ordering).
- When `Accommodation::_ID_Person` is empty, the non-learner persons pointing at the place without a family role become
  `contactName`: one person, or the oldest. Any others are added as members with role `other`.
- No migration. Shows on the place page (contact).
- Keep the meaning: `Accommodation::_ID_Person` is the "Wohnungsgeber" (`NewPerson_Accommodation`'s own dialog).

**B. Wohnungsgeberbestätigung (`StatementLandlord`) (small; one new column).**
- `read_letters_extra.py`: add `ZStartDate`, `ZEndDate`, `_ID_DateAccommodation`, `_ID_StaffMember`.
- `import-letters-extra.mjs`: build the document from fields, since `FreeField` is empty:
  - the subject „Wohnungsgeberbestätigung", not „Brief an die Unterkunft"
  - the Wohnungsgeber (`HeaderLandlord`, else the place's `landlord`, from D)
  - the dwelling (`HeaderAccommodation`), the learner (from the booking), move-in and move-out
  - place and date (`DateOfEmission`), and the signer (`_ID_StaffMember` → `staff_members.filemaker_staff_id` → `sent_by`
    and the name in `document.signature`)
- Set `person_id` = the booking's learner (the addressee) and `booking_stay_id`. Re-running updates the 494 rows.
- Shows in the place's Briefe tab and on the booking.
- Whether the workspace issues these itself, as a letter kind under docs/LETTERS.md, is question 7 in §6.

**C. Reservations: purpose, term, who is accepted (new columns).**
- `read_accommodation.py`: add `DateRent.Comment` and `_ID_Session`, plus `Session` (key, start, end,
  `_ID_DayTimeReference` 2/4/5 → morning/afternoon/evening).
- `import-accommodation.mjs`:
  - `purpose` = `course_term` when `_ID_Session` is set
  - `course_session` from the session
  - `accepts` from the comment word (female: mädchen/mädels/frau/frauen; male: jungs/junge/mann; any: egal or
    "mädchen/junge"; group_leader: betreuer/betreuerin); the full comment otherwise goes to `note`
- Stop reading `DescriptionRent.Short` (empty since 2023).
- `src/lib/admin/accommodation.ts`:
  - `Reservation` gains `purpose`, `courseSession`, `accepts`
  - the place's reservation list says "Intensivkurs vormittags" or the group
  - `groupReservations` is unchanged
  - fix the "for groups" wording in the comments
- A link to `course_instances` can be resolved by rule (start date + `session`), so no foreign key is needed now.

**D. Place facts (small; new columns).**
- `read_accommodation.py`:
  - `_ID_Animal` → `hasPets` (1 true, 2 false), ahead of `_ID_Pet`
  - `_ID_FlatShare = 1` → `kind = 'casa_flat'`; keep `_ID_SchoolFlatShare` and the stay inference only as fallback
  - `landlord = _ID_Landlord ? Landlord : Header.Text`
  - Room `_ID_InternalRoom` → `number`. Leave `name` as typed; the UI shows "Zimmer {number}" when the name is empty
  - Management offers through `Accommodation._ID_Management`, falling back to the place's own 2024 fields, mapped by
    the vocabularies' `filemaker_id`; unknown ids (3/4/5 of the types) wait for question 5 in §6
  - `AnimalAtHome.Comment_1` appended to `pets`
- `import-accommodation.mjs` and the place form (`accommodation-forms.tsx`, `PlaceInput`) gain the new fields.
- The rooms tab and the WG occupancy plan show the room number.

**E. Cross-area items, for the Letter and money owners (small).**
- `read_learners.py` adds `Letter._ID_Accommodation` and `_ID_DateAccommodation`. `import-learners.mjs` sets
  `letters.accommodation_id` (the letter then also shows on the place) and `booking_stay_id`.
- `read_money.py` adds `PaymentOut.ZStartDate` and `ZEndDate`. `import-money.mjs` stores `period_start`, `period_end` and
  the `booking_stay_id` it already reads (`p.stay`). The place's Miete tab shows the period per payment.

**F. Nothing to build:** the business-line tables, transfers, the `DateAccommodation` copies, the stay status words
(derive Rookie/LastDance from the stays' dates if a list ever needs it), and `DatePlacement`'s gap fields.

## 6. Questions for Rahman (DECIDE)

1. **`DateAccommodation._ID_DepartureStatement`**: a hand-set tick on 8 stays (2025–26). Ask the accommodation colleague
   whether it means "Abmeldung (deregistration) received/confirmed". If yes, add `booking_stays.deregistered`; if not, drop it.
2. **`Accommodation._ID_PermanentOffer`** (34 ja / 4 nein): does it mean "takes learners all year (Daueranbieter)"? If yes,
   add `accommodations.year_round`.
3. **`Management._ID_StatementLandlord`**: for which places does CASA issue the Wohnungsgeberbestätigung? All 8 flats are
   1, 7 other places are 2 and 2 others are 1. The find `FindStudent.In.StatementLandlord` treats "flat OR 2" as one list.
   Should the workspace keep a per-place "who confirms" fact?
4. **`Accommodation._ID_HousingNumber`**: one broadcasting-fee number on 4 flats, used by one letter since 2025. Keep it as
   a setting or a flat note, or drop it?
5. **Accommodation types 3/4/5**: SchoolMan's vocabulary has lost the keys of Wohngemeinschaft, Familie mit Kindern,
   Apartment and Hotel. The Management offers still use 3, 4 and 5. Confirm the mapping, likely 3 = Familie mit Kindern
   and 4 = Apartment, with 5 unclear.
6. **Hosts' bank accounts** (`BankAccount._ID_Accommodation`, 38 since 2025): bring them for rent payouts? It is
   finance/privacy data of people who are not learners.
7. **Issue Wohnungsgeberbestätigungen in the workspace** (about 278 since 2025, both flats and host families) as a letter
   kind built from the stay? Until then, B carries SchoolMan's history.
8. **`Booking.StatusInternationalAirport`** (7 rows: Erledigt / Nicht Erledigt) and **`InternationalAirport.StatusKlaerung2026`**
   (empty) are new fields with no script. Who added them, and are they part of a new process?
