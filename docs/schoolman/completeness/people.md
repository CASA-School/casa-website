# Completeness review: people, staff and organisations (2026-10-27)

Read-only. Sources: `gaps.txt` / `tables-not-covered.txt`, the profiles in `CASA-admin/output/filemaker/`, the schema
export and the 1,360 scripts in `casa-schoolman-scripts`, the readers and importers on `admin` (HEAD `fc78aed`, which
already has today's Person::_ID_StaffMember fix), the local `schoolman_records` copy and workspace tables. Where
the copy did not carry a field, I read SchoolMan itself through `fm_read.column()`: about 120 single-column reads,
with only counts and vocabulary labels printed. Nothing was written anywhere. This file contains no personal data.

"recent" means filled on records created since 2025, as in `gaps.txt`.

---

## 1. Summary

**The 98 gap fields in this area:** MAP 23 · ALREADY 3 · COPY 20 · PLUMBING 42 · ABANDONED 6 · DECIDE 4.

**The 51 not-covered tables or table groups in this area:** MAP 13 · ALREADY 8 · COPY 1 · PLUMBING 5 · ABANDONED 16 ·
DECIDE 7 · deliberately left out 1 (`DateStaffAtWork`, Rahman's decision of 2026-10-26, item 1: not proposed again).

### Most important missing facts, in priority order

1. **Passport numbers** (`Person.NumberPassport`, 414 recent, 1,262 in total). Rahman decided on 2026-10-16 that
   they come across. `people.passport_number` exists (0029) and the visa letter prints it
   (`src/lib/admin/letters/booking-context.ts`). No reader reads the field and it is not on `Sync_Person`, so every
   visa letter goes out with an empty passport number.
2. **Internship hosts.** SchoolMan keeps them as an `Internship` role: 56 rows, 46 active, 8 created since 2025.
   The organisation reader finds them only through `Management._ID_StatusManagementReference` containing 7, and only
   9 of the 56 parties carry that status. As a result, 13 internship organisations come across. `Internship` is
   not synced at all.
3. **Host bank accounts** (`BankAccount._ID_Accommodation`): 160 hosts have one, and 39 were created since 2025. No
   reader reads them, and rent payouts (`PaymentOut._ID_BankAccount`) are paid to them. `bank_accounts` can only
   belong to a person in `people`, and hosts are not in `people`.
4. **Who the main contact at an organisation is.** `Management._ID_ContactPerson` is set on 99 parties (62 since
   2025: 28 companies, 6 agencies, 33 hosts, 21 others). `Agency._ID_ContactAgent` is set on 34 agencies.
   `Corporate._ID_Contact_Person` (83) was replaced by the Management field in 2023. All the contacts come across,
   but nothing marks the main one.
5. **Mother tongue and country of birth, read from their ids instead of stale label copies.** The ids are
   `_ID_Mothertongue` (418 recent; the telc language code, where 14 means "andere") and `_ID_CountryBirth`
   (387 recent, a `Flag` id). The readers take `MotherTongue_1` and `CountryBirth_1`, auto-enter copies that keep
   old labels (36 distinct labels from 13 ids). Mapping review §4 already says this; it is still open.
6. **The levels a teacher teaches** (`StaffMember._ID_Level`, filled on about 30 active colleagues).
   `staff_members.levels` exists, but only planners fill it, by hand.
7. **How an enquiry came in** (`Contact._ID_TypeContactReference`, 537 recent): 1 Online Anmeldung, 2 Email
   Nachfrage, 3 Telefonische Anfrage, 4 Besuch im Büro, plus typed text. This is only on `Contact`, which is not
   synced.
8. **What a host offers** (type, meals and room). Since 2024 this is on `Management` (31/29/29 recent).
   `read_accommodation.py` still reads the abandoned `Accommodation._ID_AccommodationTypeOffer`. This is
   bridge-gaps item #5 and is still open; the fields are on Management, so they are listed here.
9. **Staff training records** (`TrainingStaffMember` 26, all from 2026; `SingleDateTraining`; `TrainingReference`:
   Didaktik, Prüferschulung, EDV, Ersthelfer, Datenschutz, Brandschutz, QM). This is a new area with no workspace
   table.
10. **Holiday requests with kind and approval** (`DateHoliday`, `SingleDateHoliday` with status 1 approved / 2
    requested, `HolidayReference` 1–7). Checked in the absence reader's window (90 days back to a year ahead), the
    day flags it reads agree with the approved requests: 646 of 646 days, plus 3 days flagged with no request. So
    this is a completeness item, not a live error. The kind of leave (Sonderurlaub, Elternzeit and so on) and the
    open requests come across nowhere.
11. **Smaller items:**
    - The year of birth for 940 people who have no birth date (`people.birth_year` exists).
    - 431 old learner bank accounts (2019–2022) whose `_ID_Person` points at a deleted person record while their
      `_ID_Student` points at the real learner.
    - Notes on e-mail addresses.
    - A host's district (`Address.Quarter`; 498 of 547 values are on host addresses).

### Reverse and other-route links (checked against SchoolMan and the copy)

| Link | Finding |
| --- | --- |
| Staff → person | Fixed today (`fc78aed`, `Person::_ID_StaffMember`). Checked again: 0 active colleagues are without a person either way, and 0 cases where `StaffMember._ID_Person` and the person's back-link disagree. A third route, `StaffMember._ID_Management` → `Person._ID_Management`, is needed by nobody (0). |
| Staff ↔ Management | `StaffMember._ID_Management` is on all 82 rows and agrees with the Management back-link on 80. `Management._ID_StaffMember` names **243 staff ids that are no longer in `StaffMember`**: colleagues moved to `Hades` (see Hades below). |
| Staff channels | E-mail, phone and address rows hang on `_ID_StaffMember` or `_ID_Person`. Only 1 e-mail of an active colleague is linked by `_ID_Management` alone. Negligible. |
| Organisation role ↔ party | `Agency`, `Corporate` and `Internship` → `_ID_Management` agree with the party's back-link on 122/122, 789/791 and 56/56. Management's own role fields are reverse copies (PLUMBING). |
| Organisation contacts | All 229 people linked to an agency's or company's Management also carry `_ID_Agency`/`_ID_Corporate`, so none are lost. The main-contact links (row 4 of the priority list) are not read. |
| Agency → name | `Agency._ID_Institution` has been abandoned since 2021 (0 of the 10 new agencies). The reader already falls back to `Institution._ID_Agency`. ✓ |
| Learner ↔ ID_Student | The link runs only from `Person._ID_Student` to `ID_Student`; `ID_Student._ID_Person` is never filled. **18 people have 25 bookings carrying a second learner number** (`Booking._ID_Student` ≠ the person's). That number is on receipts, so a search by receipt number misses these people. → add those numbers to `filemaker_links`. |
| Learner channels | `Email`/`Phone`/`Address._ID_Student` agree with `_ID_Person` on 7,152/7,153, 6,638/6,642 and 4,748/4,758 rows. They are copies. |
| Bank accounts | Learner accounts are owned through `_ID_Person`. In **431 accounts (2019–2022) `_ID_Person` names no Person row**, while `_ID_Student` names a real learner. Use `_ID_Student` as a fallback. Host accounts are owned through `_ID_Accommodation` (with `_ID_Person` = the host person), and party accounts through `_ID_Management`. |
| Enquiry ↔ organisation | An organisation named at intake (`NewInstitution_PreBooking`) is an `Institution` linked from `PreBooking`/`Contact._ID_Institution`, with `Institution._ID_Contact` back. It never has a Management record, so the organisation reader cannot see it (15–21 recent). |
| Enquiry ↔ person | `Person._ID_Contact` has been abandoned since 2023 (0 recent). The intake goes `PreBooking._ID_Person`, which is correct. `Contact` duplicates `PreBooking` field for field (same script steps). |
| Customer number | `ID_Student._ID_Client` equals `Person._ID_Client` on 3,247 of 3,256 rows. 8 learners have it only on `ID_Student`. |

### Security findings

These need a decision from Rahman. Nothing was changed.

- `StaffMember.Login` (78 rows) holds the generated SchoolMan account name **and an initial password** built from the
  first name and the day and month of birth (`WriteLogin_StaffMember.V10`).
- `MailAccount.PassWord` (6 rows) holds passwords.
- `CodeNumber` holds tax ID, pension numbers and licence numbers.

None of these may go on a sync layout. I suggest clearing `Login` and moving the mail passwords into the password
manager.

---

## 2. Gap fields, table by table

### Person (15,514 rows, 2,899 recent)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| EnumerateNationality | 784 | PLUMBING | A running counter for a nationality report | — | Written as `$_c` / 1 by `MakePDF_CurrentNationality_DateBooking` and `OneDaysGroup.Parameter_DateBooking` |
| _ID_Mothertongue | 418 | **MAP** | Mother tongue as a telc language code: 1 Deutsch, 2 Englisch, 3 Spanisch, 4 Französisch, 5 Italienisch, 6 Portugiesisch, 7 Ungarisch, 8 Polnisch, 9 Russisch, 10 Tschechisch, 11 Türkisch, 12 Arabisch, 13 Chinesisch, 14 andere (566 of 1,275), 15 Katalan, 16 Japanisch | `people.mother_tongue` (exists), filled from `LanguageReference`; 14 → null or „andere"; keep the telc code for exam registration | Relationship `Person._ID_Mothertongue = LanguageReference._ID_LanguageReference.telc`. The reader takes `MotherTongue_1`, an auto-enter (replace) label copy that is stale (36 labels for 13 ids) |
| NumberPassport | 414 | **MAP** | Passport number | `people.passport_number` (exists, 0029), shown under the restricted module as decided | Decided by Rahman 2026-10-16 (people.md decision 1). Read by 11 letter scripts. The workspace's visa letter reads the column, which is empty |
| _ID_CountryBirth | 387 | **MAP** | Country of birth (a `Flag` id) | `people.birth_country_code` (exists) through `countries.filemaker_flag_id` | The reader takes `CountryBirth_1` (German label copy). The button `CopyIDNationality.IDCountryBirth_Booking` copies the homeland in, which staff then confirm |
| _ID_Selected | 45 | PLUMBING | Selection mark | — | Only in relationships (`Person.IDSelected_*`) |
| _ID_Salutation | 30 | ABANDONED | Sie/Du (SalutationReference 1 Du, 2 Sie) | — | Superseded by the „du" rule. people.md: not carried |
| _ID_Internship | 6 | PLUMBING | The person's internship host, set with `_ID_Management` by `NewPerson_Management` | Contacts come through `_ID_Management` once internship hosts are mapped | Script sets every role id from context |
| YearOfBirth | 1 | **MAP** | Birth year where the date is unknown: 940 people have a year and no date | `people.birth_year` (exists, 0029) | Decided 2026-10-16. Few new values, many old ones |
| _ID_Editorial | 1 | PLUMBING | Person at a publisher | — | `NewPerson_Management` |
| ValueFind | 1 | PLUMBING | Search helper | — | Cleared by `PersonFind_*` |

### Phone (14,608 / 2,517)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| _ID_Student | 1,822 | COPY | The person's learner number | — | Set from `$_ID_Student` beside `_ID_Person` (`NewPhoneStudent_Booking`, `Go_PreBooking_Booking.Parameter`). Agrees on 6,638 of 6,642 |
| _ID_Client | 957 | COPY | Customer number | `people.customer_number` (from Person) | Same scripts |
| _ID_Selected | 18 | PLUMBING | Selection mark | — | Relationships only |
| _ID_Internship | 10 | PLUMBING | Party link; `_ID_Management` is set alongside | — | `NewPhone_Management` sets all role ids |
| CommentUse | 5 | ABANDONED | Note on a number | — | 1,458 undated old rows, 5 in 2025, none in 2026 |
| _ID_Contact | 3 | ABANDONED | Old link to a contact person | — | No script writes it; points at `Person.IDContact_Phone` |
| _ID_Contractor | 2 | PLUMBING | Party link | — | `NewPhone_Management` |
| _ID_Editorial | 1 | PLUMBING | Party link | — | same |
| _ID_Public | 1 | ABANDONED | "public number" flag | — | 415 old, 1 recent, no script |
| _ID_WhatsAppInUse | 1 | ABANDONED | WhatsApp flag | — | Superseded by `_ID_Use` = 8 WhatsApp |

### Email (13,983 / 2,881)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| _ID_Provider | 2,678 | PLUMBING | A second serial number under a link's name | — | Schema: SERIAL. organisations.md calls it "the trap" |
| _ID_Student | 1,975 | COPY | Learner number | — | `NewEmailStudent_Booking` and others. Agrees on 7,152 of 7,153 |
| _ID_Client | 960 | COPY | Customer number | — | `NewEmailStudent_Booking` |
| _ID_Selected | 69 | PLUMBING | Selection mark | — | Relationships only |
| CommentUseMail | 32 | **MAP** | Note on an address (21 recent on organisation addresses, 10 on people) | new `emails.note`; an organisation's address note goes into `organisations.note` | Typed on the layout; no script |
| _ID_Internship | 9 | PLUMBING | Party link | — | `NewEmail_Management` |
| _ID_Contractor | 2 | PLUMBING | Party link | — | same |

### Address (12,944 / 2,512)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| _ID_Provider | 2,363 | PLUMBING | Serial number | — | SERIAL |
| _ID_Student | 812 | COPY | Learner number | — | `NewAddressStudent_Booking`. Agrees on 4,748 of 4,758 |
| _ID_Client | 136 | COPY | Customer number | — | same |
| _ID_Selected | 33 | PLUMBING | Selection mark | — | — |
| Quarter | 15 | **MAP** | District (Stadtteil): 483 old + 15 recent on host addresses, 40 old on people | new `accommodations.district` (accommodation reader) | Typed; 85 distinct values |
| _ID_Internship | 6 | PLUMBING | Party link | — | `NewAddress_Management` |

Not in `gaps.txt` because it is auto-entered: `Address._ID_Country` is the real `Flag` link (the auto-enter only
defaults Bremen, Berlin, Hamburg and Köln to Germany). The readers take `ZCountry_1`, a German label copy. Read
the id, as for nationality.

### BankAccount (1,945 / 459)

Who owns the accounts created since 2025: learners 406, of which 139 carry the agency id copied from their booking;
hosts 39; staff 14; parties 3.

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| _ID_Provider | 403 | PLUMBING | Serial number | — | SERIAL |
| _ID_Student | 400 | **MAP** (as a fallback owner) | Learner number. Normally a copy, but on 431 accounts from 2019–2022 `_ID_Person` names no Person row while this names the learner | owner of the learner's `bank_accounts` row when `_ID_Person` is dangling | Measured 1,056 agree / 434 disagree; 431 of those have no Person row |
| _ID_Client | 290 | COPY | Customer number | — | `NewBankAccountStudent_Booking` |
| _ID_Agency | 138 | COPY | The booking's agency, copied onto the learner's own account | — | `NewBankAccountStudent_Booking` sets it from `Booking::_ID_Agency`. An agency's own accounts are identified by `_ID_Management` |
| AddressBank | 60 | **MAP** | The bank's address, for foreign transfers (37 + 22 on learners) | `bank_accounts.note`, or a new `bank_address` | Typed |
| _ID_Management | 57 | **MAP** | Owner of a non-learner account (host, organisation, staff) | owner resolution: organisation through `filemaker_links` (Management) | `NewBankAccount_Management`, `NewBankAccount_Accommodation` |
| AddressAccountOwner | 54 | **MAP** | Account holder's address (refunds abroad) | new `bank_accounts.holder_address`, or the note | Typed; 53 of 54 on learners |
| _ID_Accommodation | 38 | **MAP** | Host's bank account for rent payouts (160 hosts; 39 accounts since 2025, all with an IBAN) | `bank_accounts.accommodation_id` (new), under `private_data` | `NewBankAccount_Accommodation`. `PaymentOut._ID_BankAccount` points at these |
| Comment | 31 | **MAP** | Note on the account (refund remarks) | `bank_accounts.note` (exists) | Typed; 29 on learners |
| _ID_Country | 10 | ALREADY | The account's country | the IBAN's first two letters | `Copy.IDCountryBankAccount_Booking` copies the address country in |
| _ID_WrongPerson | 3 | PLUMBING | Correction trail: the person id the account was wrongly on | — | No script; 52 in total |
| _ID_Corporate | 2 | COPY | The booking's company | — | `NewBankAccountStudent_Booking` |

### StaffMember (82 / 18)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| _ID_Management | 18 | PLUMBING | The colleague's party | — | Set by `Go_Management_StaffMember`. Route not needed (0 colleagues depend on it) |
| _adjustDateStart / _adjustDateEnd | 16 / 16 | PLUMBING | Date range parameters for generating working time | — | Cleared by `StartScript`; read by `MakeWorkTime*.Once` |
| Login | 15 | PLUMBING (**never carry**) | SchoolMan account name and initial password | — | `WriteLogin_StaffMember(.V10)`: "UserName … PassWord: first name_DDMM". See security findings |
| _ID_Empty | 10 | PLUMBING | Constant 1 | — | `FillRowCalendarPresence…` |
| _ID_PurviewReference | 10 | COPY | List of the colleague's Purview roles | `staff_member_roles` (from `Purview`) | `NewPurview_StaffMember` := `List(PurviewReference::__ID…)` |
| _ID_Level | 9 | **MAP** | Levels taught: 1 A1, 2 A2, 3 B1, 3,5 B1+, 4 B2, 5 C1, 6 TD (TestDaF), 7 CH (C1 Hochschule), 8 SK, 9 ND | `staff_members.levels` (exists), only where `planning_set_at` is null | `LevelReferenceSchool`. Checkbox on the Intern section; filled on about 30 active colleagues |
| _ID_TimeSheet | 9 | **MAP** (small) | Keeps a time sheet: the nightly balance job runs only for 1 (47 yes, 2 no) | new `staff_members.keeps_time_sheet`, needed when the workspace computes time sheets | Find criterion in `SetBalanceRunning.Loop_SingleMonthStaff_OnServer` and `Go_SingleDayCalendar_SingleMonthStaff` |
| _ID_StatusSalaryReference | 5 | ALREADY | Employed / freelance / … | `staff_contracts.kind` from `DateTargetWorkTime` | No script; the per-period kind is the real fact |
| MonthNumber | 3 | **DECIDE** | A unique number of 1–3 digits per colleague (67), typed by hand | possibly `staff_members.personnel_number` (restricted) | No script. **Ask:** is this the payroll personnel number? |
| List_CourseNext / List_ID_CourseNext | 3 / 3 | COPY | Cached list of the next courses | — | `SetListCourse_Teacher` |
| _ID_SignatureActive | 2 | PLUMBING | Whether the letter signature is on | — | The workspace uses its own signature (Outlook add-in data) |

### Contact (5,072 / 1,850; not synced)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| Timestamp.Change | 1,850 | PLUMBING | Change field | the change field of a new `Sync_Contact` | — |
| Timestamp.Creation | 1,850 | COPY | Same moment as the pre-booking | — | `NewContact` creates both |
| _ID_PreBooking | 1,850 | PLUMBING | Twin key | join key on `Sync_Contact` | `NewContact`, `ExtensionContact` |
| _ID_Person | 1,836 | COPY | = `PreBooking._ID_Person` | — | `NewPerson_PreBooking` sets both in the same step |
| _ID_Student / _ID_Client | 1,082 / 845 | COPY | Keys copied at booking | — | `Go_PreBooking_Booking.Parameter`, `Go_Booking_Contact` |
| _ID_TypeContactReference | 537 | **MAP** | How they got in touch: 1 Online Anmeldung, 2 Email Nachfrage, 3 Telefonische Anfrage, 4 Besuch im Büro. Typed text is mixed in ("Email" 420, "Besuch im Büro" 133) | the SchoolMan intake note („Kontakt: E-Mail"), else `enquiries.source` | Only on Contact (`PreBooking._ID_TypeContactReference` is empty everywhere) |
| _ID_Booking | 29 | ALREADY | The existing booking an extension enquiry was made from | the person's bookings | `Go_Booking_Contact` |
| _ID_CourseLanguage | 28 | COPY | From the booking | — | `Go_Booking_Contact` |
| _ID_Email / _ID_Phone / _ID_Address | 28 / 26 / 25 | PLUMBING | Which of the person's channels | — | Copied from the booking |
| _ID_Institution | 15 | COPY | = `PreBooking._ID_Institution` | — | `NewInstitution_PreBooking` sets both. The fact is mapped through PreBooking (see notes) |

### ID_Student (7,055 / 2,020; not synced)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| _ID_Client | 889 | COPY | Customer number | `people.customer_number` (from Person) | Equal to `Person._ID_Client` on 3,247 of 3,256; 8 only here |

### Internship (56 / 6; not synced)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| _ID_Management | 6 | **MAP** | The internship host's party | `organisations` with relation `internship` | 56/56 agree with `Management._ID_Internship`. Only 9 carry status 7, the one the reader looks for |
| _ID_Active | 5 | **MAP** | Active host (46 yes, 5 no, 5 empty) | `organisations.is_active` | Typed |

`_ID_TypeInternshipReference` (Schule / Erasmus / Profi) and `DescriptionInternship_1` are empty on all 56 rows.

### Institution (1,914 / 133)

| Field | recent | Verdict | Meaning | Evidence |
| --- | ---: | --- | --- | --- |
| _ID_Provider | 133 | PLUMBING | Serial number | SERIAL |
| _ID_Contact | 21 | PLUMBING | Reverse link to the intake Contact | `NewInstitution_PreBooking`. The fact goes through `PreBooking._ID_Institution` |
| _ID_Internship | 6 | PLUMBING | Reverse link | The name is found through `Institution._ID_Management` |
| _ID_Accommodation | 5 | PLUMBING | Reverse link to a host that is an institution | `Go_Management_Accommodation` |
| _ID_Contractor | 1 | PLUMBING | Reverse link | `Go_Corporate_Contractor` |

### Corporate (788 / 85)

| Field | recent | Verdict | Meaning | Evidence |
| --- | ---: | --- | --- | --- |
| _ID_Provider | 85 | PLUMBING | Serial number | SERIAL |

### Agency (120 / 9)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| _ID_ContactAgent | 5 | **MAP** | Main contact at the agency (34 set; 33 are among its contacts) | new `organisation_contacts.is_main` | Relationship `Agency._ID_ContactAgent = Person.IDContactAgency_Management` |
| _ID_PaymentCommission | 2 | **DECIDE** | 1 School / 2 Agency (value list 7). With 2, creating a commission line also books a payout to the agency (PaymentOut kind 4, method 9). Set on 9 + 5 agencies | perhaps `organisations.commission_settlement` | `NewCommission.Parameter_Booking`. **Ask finance:** what do "School" and "Agency" mean (who collects the learner's money?), and should it decide how the workspace settles commission? |

### Management (3,771 / 161)

| Field | recent | Verdict | Meaning | Target | Evidence |
| --- | ---: | --- | --- | --- | --- |
| _ID_Provider | 161 | PLUMBING | Serial number | — | SERIAL |
| _ID_Active | 133 | **MAP** | Party active (1) or not (2) | `organisations.is_active` for the "other parties" (today hard-coded `true`). Agencies and companies keep their role's own flag | The two disagree: 65 agencies are inactive in `Agency` but active on Management |
| _ID_Corporate | 78 | PLUMBING | Reverse link | — | Agrees on 789 of 791 |
| _ID_ContactPerson | 62 | **MAP** | Main contact person (99 set, all among the party's people) | `organisation_contacts.is_main`; for hosts, the accommodation's contact | Relationship to `Person.IDContact_Management`; used for invoice addresses (`NewInvoice.IDInvoice.Break_Management`) |
| _ID_Accommodation | 31 | PLUMBING | Reverse link | — | `Go_Management_Accommodation` |
| _ID_AccommodationTypeOffer / CateringOffer / RoomOffer | 31 / 29 / 29 | **MAP** | What a host offers, since 2024 (lists of ids) | `accommodations` offer columns (accommodation reader) | bridge-gaps #5, still open: the reader reads the abandoned `Accommodation` field |
| _ID_StaffMember | 16 | PLUMBING | Reverse link | — | 243 point at staff moved to `Hades` |
| HeaderManagement.Text | 11 | COPY | Letter address block | — | Built from Institution, Person and Address by `SetHeaderManagement_Management` and the holiday-letter scripts |
| _ID_Agency / _ID_Internship / _ID_Contractor | 9 / 6 / 1 | PLUMBING | Reverse links | — | Agree 122/122 and 56/56 |
| _ID_StatementLandlord | 3 | **DECIDE** | Host flag 1/2 (17 hosts). A 2 keeps a host off the "CASA mailbox" statement list | — | Only find steps use it (`Restrain.MailboxCasa_DateAccommodation`). **Ask the accommodation colleague** what it means and whether it is still set |
| CommentManagement | 1 | **DECIDE** | Free comment on a party: 1 recent, 1,287 old, **contains credentials** | `organisations.note` after a credentials screen | Open decision 7 in bridge-gaps |
| _ID_Person | 1 | ABANDONED | Old person link | — | 2,653 old, 1 recent |

---

## 3. Not-covered tables of this area

| Table(s) | Rows | Verdict | What it is, and what to bring |
| --- | --- | --- | --- |
| Contact | 5,072 | MAP (part) | The twin of a pre-booking. Bring only how they got in touch (`_ID_TypeContactReference`). Everything else is a copy |
| TypeContactReference | 4 | MAP | Its vocabulary (above) |
| ID_Student | 7,055 | COPY | The learner-number register. Numbers come from `Person`/`Booking`. Add the 25 bookings with a second learner number to `filemaker_links` |
| Internship | 56 | MAP | The internship host role. Bring it as an organisation (relation `internship`, active flag). TypeInternshipReference is unused |
| Contractor | 3 (2024–25) | MAP | A company's role as **commissioning body / Auftraggeber**, with Projects. `Booking._ID_Contractor` (878 recent) is copied from `Corporate._ID_Contractor`. Bring it as an organisation relation. Careful: the workspace's `relation = 'contractor'` today means status 23 „Umbau" (a building contractor) — rename one of them |
| SingleDateHoliday | 8,978 (3,103 in 2026) | MAP | One row per leave day: status 1 approved / 2 requested (`AUTOENTER 2`, approved by hand), kind |
| DateHoliday | 1,094 | MAP | The leave request: colleague, from–to, kind, comment |
| HolidayReference | 7 | MAP | 1 Tarifurlaub, 2 Sonderurlaub, 3 Unbezahlter Urlaub, 4 Ausgleich Überstunden, 5 Schließzeit, 6 Mutterschaft, 7 Elternzeit |
| WeekDayWorkTime | 1,329 (369 in 2025) | MAP (working-time module) | Target hours per weekday within a contract period (`_ID_DateTargetWorkTime`). Start and end times are almost never set (4). This is where reception's real target week lives; the workspace currently guesses it from 10 weeks of `SingleDayStaff` hours |
| AdminWork | 14,483 (~3,400 a year) | MAP (working-time module) | Admin time per colleague and day. The kind is `_ID_TypeWorkReference` (2 Verwaltung 14,431, 9 Ausgleich 41; the list also has 1 Unterricht, 3 Korrektur, 4 Material, 5 Einstufung, 6 Prüfung, 7 KUG). Hours are in `AdminWork`/`AdminWork.Time`, plus start, end and break, a comment, and the exam (164 examiner entries). **`TypeWork_1` is free text holding personal notes, including health remarks — never use it as the kind; treat it as a restricted note** |
| TypeWorkReference | 9 | MAP | Its vocabulary |
| TrainingStaffMember, SingleDateTraining, TrainingReference | 26 / 4 / 7 (2024–26) | MAP | Staff trainings (first aid, fire safety, data protection, examiner training …): who, which session, when. A new table and a tab on the staff page |
| LanguageReference | 16 | MAP | Decodes `_ID_Mothertongue` (joined on `_ID_LanguageReference.telc`) |
| LevelReferenceSchool | 10 | MAP (as constants) | Decodes `StaffMember._ID_Level`. Extend the readers' `BAND` map with 6 TD, 7 CH, 8 SK, 9 ND. No layout needed |
| DateStaffAtWork | 1,869 | left out (decided) | Rahman, 2026-10-26, item 1: Kursplanung's pairs are the source; not proposed again |
| Hades | 171 (2007–2026, 2 in 2026) | DECIDE | The archive of **former colleagues**, moved out of `StaffMember` by `MakeShadow_StaffMember`, with person and party. This is bridge-gaps decision 8 ("add former colleagues as 'left'?"); Hades is where they are |
| StaffSchool | 14 | PLUMBING (decoder) | Maps a colleague's SchoolMan account to a staff member (`__ID_StaffSchool`/`_ID_Staff.manual` → `_ID_StaffMember`). `StartScript` sets `$$_ID_Account` from the account name; that value is written into `PaymentIn._ID_StaffSchool`, `Booking._ID_StaffMember`, `PreBooking._ID_Staff` and `Contact._ID_Staff`. **This answers bridge-gaps' open question: `PaymentIn._ID_StaffSchool` is the colleague who recorded the payment, not a cash box** (the top values 27, 74, 40, 20, 41, 12, 73 are StaffSchool ids). Authors already come from `UserName`, so only the money agent might want the 14-row map |
| OperationField | 553 (16–20 a year since 2024) | DECIDE | Per teacher: the course types (and language) they may teach, for 147 staff ids. A second source beside the Intern section's `StaffMember._ID_CourseTypeReference`, which is read into `course_kinds`. **Ask the planners which one they maintain.** If OperationField, read it into `course_kinds` |
| CodeNumber, CodeNumberReference | 48 / 8 | DECIDE | Numbers per colleague: 23 telc examiner licence numbers (14 for colleagues with no `DateValidity` licence, 9 that differ from it), 5 customer numbers, 1 tax ID, 1 pension number, 18 without a kind (12 from 2024). Only 3 rows since 2025. **Ask:** is `DateValidity` the single source for licence numbers? If not, bring the licence numbers of active colleagues into `staff_licences`; the tax and pension numbers belong in `person_private` |
| SpecialStudent (+ SpecialStudentReference, SpecialDetailStudentReference) | 53 (2022–26; 12 since 2025) | DECIDE | A learner's needs for host placement: diet (no pork, vegetarian, vegan, lactose), allergies (dog, cat, no animals, food), illness (diabetes, medication, anxiety), wishes (children, non-smoking, piano). **Health data, a special category.** Ask Rahman and the privacy owner: bring the placement wishes (diet, animals, children, smoke) to the stay, with the medical ones restricted — or leave them all in SchoolMan? |
| IllnessReference (+ `SingleDayStaff._ID_IllnessDetail`, 1,068) | 3 | DECIDE | Kind of sick note: 1 doctor's certificate, 2 self-reported, 3 child sick. HR data with a health dimension. Bring it only with the working-time module, restricted to finance and management, if wanted |
| TandemPartner, LanguageBoard, HobbyReference | 7 / 8 / 9 (all 2025) | DECIDE | A tandem board (language offered and wanted, hobby). **Ask** whether it continues. If yes, it needs a small table |
| Url, UrlReference | 103 / 5 | DECIDE | Links stored on records: party websites (about 55, old), links on contact people (13 since 2024), on bookings (8), on staff licences and trainings (4, 2026). Kinds Vertrag, Einstufung, Bescheinigung, **Krankmeldung**, Anderes (almost never set). **Ask** which links matter. Websites → a new `organisations.website`; staff document links go with trainings and licences |
| SingleWeekStaff | 7,452 (2024–26) | PLUMBING | A generated weekly grid per colleague; its fields are almost all empty |
| MailAccount | 6 | PLUMBING (**never carry**) | Mail accounts with passwords |
| JunkMall | 479 (last 2024) | PLUMBING | SchoolMan's bin for deleted companies and hosts |
| SelectionReference, SelectionDetail | 23 / 85 | PLUMBING (decoder) | Generic value lists. Useful for decoding, e.g. list 7 PaymentCommission, list 21 the missing-information items |
| Signature | 18 | ALREADY | Staff signature images. The workspace takes the CASA signature from the Outlook add-in |
| StatusManagementReference | 15 | ALREADY | Read into `organisations.relation`. Codes: 1 TandemSchule, 5 MitarbeiterCASA, 6 Lehrer, 7 Praktikum, 9 Freund, 10 Multiplikator, 11 CASA_Lehrer, 13 SchoolMan, 15 Activity, 18 MultFam, 19 Provider, 20 Krankenkasse, 21 Mieter, 22 Förderverein, 23 Umbau. People-like statuses stay out by design |
| PurviewReference, StatusSalaryReference, LicenseReference, StatusFamilyReference, GenderReference | — | ALREADY | Mapped in import-staff (ROLE, CONTRACT), staff_licences, accommodation_members and the salutation |
| UseReference | 8 | ALREADY | Read. One small gap: 6 Nottelefon (emergency phone) and 8 WhatsApp fall into `mobile` in `import-learners` |
| Source, SourceReference | 913 / 9 | ABANDONED | „Wie hast du von uns gehört" — none since 2023 (319 old rows have a kind) |
| SalaryDetail, SalaryDetailReference | 189 / 10 | ABANDONED | Salary items, 2017–2020 |
| Shift, ShiftReference, WeekDayShift | 59 / 3 / 6 | ABANDONED | Reception shift plan, all from 2020 |
| HealthTest, HealthTestReference | 44 / 5 | ABANDONED (never bring) | Covid tests and vaccination status, 2021–22. Health data |
| Provider | 17 | ABANDONED | 2018/2021. Suppliers come through Management status 19 |
| Department | 3 | ABANDONED | 2021 |
| Touch, TouchReference | 7 / 5 | ABANDONED | First-contact records, 2024 only |
| PersonalTalk | 1 | ABANDONED | 2024, one row |
| Device, DeviceReference | 11 / 3 | ABANDONED | Staff devices (phone, tablet, MacBook) with serial numbers, 2023 only. Ask only if an equipment register is wanted |
| DateAbsence | 5 | ABANDONED | 2019–20 |
| Medium, MediumReference | 129 / 3 | ABANDONED (for this area) | Files; only 13 old ones on people or staff. The rest belongs to the handbook (`Emanuel`) |
| SalutationReference, TypeInternshipReference, TypeCorporateReference, TypeAddressReference, WorkPlaceReference | — | ABANDONED | Unused, or nothing points at them |

### Also in this area, outside `gaps.txt`

Older profiles had no "recent" count, so these did not reach `gaps.txt`:

- `SingleYearStaff.OverhangWorkTime` (152): hours carried over into the year. **`read_time.py` reads
  `OverhangWorkDay`, which is empty on all 268 rows.**
- `SingleMonthStaff.CommentOnMonth` (672) and `DateApproval` (179).
- `SingleDayStaff.Adjustment` (4,603), `CommentAdjustment` (729) and `_ID_LegalHoliday` (980).

All of these belong to the working-time module. Mapping review §8 already lists the two comments.

---

## 4. add_to_layouts

```json
{
  "Person": ["_ID_Mothertongue", "NumberPassport", "_ID_CountryBirth", "YearOfBirth"],
  "Address": ["Quarter", "_ID_Country"],
  "Email": ["CommentUseMail"],
  "BankAccount": ["_ID_Student", "_ID_Management", "_ID_Accommodation", "AddressBank", "AddressAccountOwner", "Comment"],
  "StaffMember": ["_ID_Level", "_ID_TimeSheet"],
  "Management": ["_ID_Active", "_ID_ContactPerson", "_ID_AccommodationTypeOffer", "_ID_AccommodationCateringOffer", "_ID_AccommodationRoomOffer"],
  "Agency": ["_ID_ContactAgent"],
  "Corporate": ["_ID_Contact_Person"],
  "PreBooking": ["_ID_Institution"],
  "SingleYearStaff": ["OverhangWorkTime"],
  "SingleMonthStaff": ["CommentOnMonth", "DateApproval"],
  "SingleDayStaff": ["Adjustment", "CommentAdjustment", "_ID_LegalHoliday"],
  "Internship": ["__ID_Internship", "_ID_Management", "_ID_Active", "DateOfCreation"],
  "Contractor": ["__ID_Contractor", "_ID_Management", "_ID_Corporate", "_ID_Active", "DateOfChange"],
  "Contact": ["__ID_Contact", "_ID_PreBooking", "_ID_TypeContactReference", "Timestamp.Creation", "Timestamp.Change"],
  "TypeContactReference": ["__ID_TypeContactReference", "TypeContactReference_1", "TypeContactReference_2"],
  "LanguageReference": ["__ID_LanguageReference", "_ID_LanguageReference.telc", "Language_1", "Language_2"],
  "DateHoliday": ["__ID_DateHoliday", "_ID_StaffMember", "ZStartDate", "ZEndDate", "_ID_HolidayReference", "CommentOnHoliday", "DateOfCreation"],
  "SingleDateHoliday": ["__ID_SingleDateHoliday", "_ID_DateHoliday", "_ID_StaffMember", "ZSingleDateHoliday", "_ID_StatusHoliday", "_ID_HolidayReference", "DateOfChange"],
  "HolidayReference": ["__ID_HolidayReference", "HolidayReference_1", "HolidayReference_2"],
  "TrainingStaffMember": ["__ID_TrainingStaffMember", "_ID_StaffMember", "_ID_SingleDateTrainning", "_ID_TrainningReference", "ZSingleDateTraining", "TimeStampOfChange"],
  "SingleDateTraining": ["__ID_SingleDateTraining", "_ID_TrainningReference", "ZSingleDateTraining", "HourStart", "HourEnd", "TitleTraining", "TimeStampOfChange"],
  "TrainingReference": ["__ID_TrainingReference", "TrainingReference_1", "TrainingReference_2"],
  "WeekDayWorkTime": ["__ID_WeekDayWorkTime", "_ID_StaffMember", "_ID_DateTargetWorkTime", "_ID_DayNumberReference", "TargetWorkTime", "HourStartWorkTime", "HourEndWorkTime", "Break.Minute", "DateOfChange"],
  "AdminWork": ["__ID_AdminWork", "_ID_StaffMember", "ZSingleDay", "_ID_TypeWorkReference", "AdminWork", "AdminWork.Time", "HourStart", "HourEnd", "BreakStart", "BreakEnd", "CommentAdminWork", "_ID_Exam", "_ID_Course", "DateOfChange"],
  "TypeWorkReference": ["__ID_TypeWorkReference", "TypeWorkReference_1", "TypeWorkReference_2"]
}
```

Notes on the JSON:

- **No change field:** `Internship` and `DateHoliday` have none; read them whole (56 and 1,094 rows).
- **Change fields to confirm:** confirm that `Contractor.DateOfChange`, `WeekDayWorkTime.DateOfChange`,
  `AdminWork.DateOfChange`, `SingleDateHoliday.DateOfChange` and the two `TimeStampOfChange` fields are real
  modification stamps (the schema export does not show creation or modification auto-enters), as mapping review §2
  did for the others.
- **`Corporate._ID_Contact_Person`** is listed only as a fallback main contact for companies set before 2023.
- **`PreBooking._ID_Institution`** is the intake area's field. It is listed here because it names the
  organisation behind an enquiry.
- **DECIDE fields are left out** until decided: `Agency._ID_PaymentCommission`, `StaffMember.MonthNumber`,
  `Management.CommentManagement`, `Management._ID_StatementLandlord`, `OperationField`, `CodeNumber`, `SpecialStudent`,
  `Hades`.
- **Never put on a layout:** `StaffMember.Login`, `MailAccount`, `HealthTest`, and `AdminWork.TypeWork_1`.

---

## 5. Implementation notes

Ordered by priority. "Small" means it fits existing columns or needs one nullable column; "table/screen" means a
new table or a new tab.

**A. Learner facts — small, no migration.**
- `read_learners.py`:
  - Read `NumberPassport` and `YearOfBirth`.
  - Read `_ID_Mothertongue` and map it through `LanguageReference` (join on `_ID_LanguageReference.telc`; 14 andere
    → null) in place of `MotherTongue_1`.
  - Read `_ID_CountryBirth` → ISO through `countries.filemaker_flag_id` (in place of `CountryBirth_1`).
  - Read `Address._ID_Country` → ISO the same way (in place of `ZCountry_1`).
- `import-learners.mjs`: set `passport_number` and `birth_year` (only when there is no birth date) with the existing
  `coalesce` pattern. Passport stays behind the restricted view.
- learner-transfer.md and the reader's docstring say "not the passport number" — correct both (bridge-gaps decision
  6 is answered by people.md).

**B. Bank accounts — migration plus reader.**
- Migration: `bank_accounts.person_id` nullable, plus `accommodation_id` and `organisation_id`, with a check that
  exactly one owner is set. Optionally add `holder_address` and `bank_address`, or fold them into `note`.
- `read_learners.py`:
  - Owner = `_ID_Person`. If that names no Person row, use the person of `_ID_Student` (431 accounts).
  - Carry `Comment`, `AddressBank` and `AddressAccountOwner`.
- `read_accommodation.py`: host accounts by `_ID_Accommodation`.
- `read_organisations.py`: party accounts by `_ID_Management`.
- Shown under the `private_data` module on the person, accommodation and organisation pages. This lets payouts
  name the account (`PaymentOut._ID_BankAccount`, money area).

**C. Organisations — small migration.**
- `read_organisations.py`:
  - Add the `Internship` role (relation `internship`, active from `Internship._ID_Active`) beside the status-7
    route.
  - Take `active` for the other parties from `Management._ID_Active` (2 → false, empty → true).
  - Take the main contact from `Management._ID_ContactPerson`, else `Agency._ID_ContactAgent`, else
    `Corporate._ID_Contact_Person`.
  - Bring `Contractor` as a new relation, e.g. `commissioning_body` („Auftraggeber").
- Migration: `organisation_contacts.is_main boolean`, and extend `organisations_relation_check`. **Name clash:**
  today's `contractor` means status 23 „Umbau"; rename it (e.g. `builder`) or name the new one differently.
- Screen: a „Hauptkontakt" marker in the organisation's contacts. Linking `Booking._ID_Contractor` is the bookings
  agent's work.

**D. Teacher levels — small, no migration.**
- `read_staff.py`: read `StaffMember._ID_Level`.
- `import-staff.mjs`: map 1–5 and 3,5 to A1…C1/B1+, 6 to TestDaF, 7 to C1 Hochschule. Codes 8 SK and 9 ND are
  unknown — **ask** the planners. Write into `staff_members.levels` only where `planning_set_at` is null, the same
  rule as 0083.
- `_ID_TimeSheet`: a boolean `keeps_time_sheet`. Optional now; needed with module I.

**E. How an enquiry came in — small, no migration.**
- New layouts `Sync_Contact` and `Sync_TypeContactReference`.
- `read_intake.py`: add „Kontakt: Online-Anmeldung / E-Mail / Telefon / Besuch im Büro" to the pre-booking note,
  normalising the typed "Email" and "Besuch im Büro".
- With `PreBooking._ID_Institution` → `Institution.Institution`, add „für: <Organisation>" to the same note (intake
  agent).

**F. Hosts — small migration (accommodation agent).**
- Read the offer lists from `Management._ID_Accommodation*Offer` (type, catering, room) in place of
  `Accommodation._ID_AccommodationTypeOffer`.
- `Address.Quarter` of the host's address → new `accommodations.district`.
- `Management._ID_ContactPerson` for hosts → `accommodations.contact_name` when it differs from `Accommodation._ID_Person`.

**G. Leave requests — new table.**
- New layouts for `DateHoliday`, `SingleDateHoliday` and `HolidayReference`.
- New table `staff_leave_requests` (staff_member_id, kind 1–7, from, to, status approved/requested, note,
  filemaker_id), or a `status` and `kind` on `staff_absences`.
- `read_absences.py`: approved request days become `Urlaub` with their kind (Sonderurlaub, Elternzeit and so on
  instead of plain „Urlaub"); requested days are shown as „beantragt".
- `read_time.py`: `holidays_taken` counts approved request days as well as the day flags.
- Screen: the staff page's Abwesenheiten tab. Mutterschaft and Elternzeit are restricted (finance, management).

**H. Staff trainings — new table and tab.**
- New layouts for the three tables.
- New reader (or a section in `read_staff.py`).
- Table `staff_trainings` (staff_member_id, training_code, title, on_date, start, end, filemaker_id).
- A „Schulungen" tab on the staff page.

**I. Working time — tables and screen, the later module (staff.md); restricted to finance and management.**
- `WeekDayWorkTime` → `staff_contract_days` (contract, weekday, target hours). This also replaces the 10-week
  guess of reception shifts in `read_day.py`.
- `AdminWork` → `staff_work_entries` (date, kind from `_ID_TypeWorkReference`, hours, start, end, break, comment,
  exam).
- `SingleYearStaff.OverhangWorkTime` → `staff_time_years.carried_hours`. This is a cheap fix now: `read_time.py`
  reads the empty `OverhangWorkDay`.
- `SingleMonthStaff.CommentOnMonth` and `DateApproval` → `staff_time_months.note` and `approved_on`.
- `SingleDayStaff.Adjustment`, `CommentAdjustment` and `_ID_LegalHoliday` → a day table when the time sheet moves.

**J. E-mail notes — small migration.** `emails.note`, filled from `CommentUseMail` (learners and staff). An
organisation's own address note goes into `organisations.note`. Optional and tiny: phone kinds `emergency` (use 6)
and `whatsapp` (use 8) in `import-learners`.

**K. Second learner numbers — small.** `read_learners.py` passes each booking's `_ID_Student` when it differs from
the person's (25 bookings, 18 people). `import-learners.mjs` adds a `filemaker_links` row (`ID_Student`) for it,
so a receipt number finds the learner.

**Questions to ask, collected:**

| # | Field or table | Question |
| ---: | --- | --- |
| 1 | `StaffMember.MonthNumber` | Is it the payroll personnel number? |
| 2 | `Agency._ID_PaymentCommission` | What do „School" and „Agency" mean? |
| 3 | `Management._ID_StatementLandlord` | What does the host flag mean? |
| 4 | `Management.CommentManagement` | Screen for credentials, then import? (decision 7) |
| 5 | `Hades` | Bring former colleagues as „ausgeschieden"? (decision 8) |
| 6 | `OperationField` vs the Intern section | Which source for course types is maintained? |
| 7 | `CodeNumber` | Bring licence numbers missing from `DateValidity`? |
| 8 | `SpecialStudent` | Health data: bring, restricted, or leave? |
| 9 | Tandem board | Does it continue? |
| 10 | `Url` | Which document links matter? |
| 11 | `IllnessReference` | Bring the kind of sick note with working time? |
| 12 | Levels 8 SK and 9 ND | What are they? |
| 13 | `relation = 'contractor'` | Rename it, so the Contractor role can be brought? |
