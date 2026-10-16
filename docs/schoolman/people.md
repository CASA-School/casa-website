# People — `Person`, `Email`, `Phone`, `Address`

Part of the SchoolMan study (`README.md`). Live, read-only, 2026-10-15. Counts only.

## Who is in it

`Person` is every human SchoolMan knows, not the learner register. Its own role links are not kept
up: before 2021 almost no one has a student id, and a person created since 2024 who has not booked
carries no link to their enquiry. Roles have to be read from the tables that point at the person.

| Pointed at by | People |
| --- | --- |
| `Booking` (any platform) | 7,044 |
| `Contact` (enquiries) | 5,002 |
| `PreBooking` | 5,272 |
| `TestStudent` (placement) | 2,686 |
| `WaitingRoom` | 1,109 |
| **Any learner table** | **8,800** |
| `StaffMember` | 75 (324 people carry a staff id) |
| `Accommodation` (as the host) | 105 (1,286 people carry a host or landlord link; 589 are members of a host family, by `_ID_Status_Family`: Vater, Mutter, Tochter …) |
| Contacts at an organisation (agency, company, institution, provider) | about 1,400 |
| None of the tables above points at them | 1,674 |

New people per year: about 450–900 until 2020, **2,113 in 2022**, 1,821 in 2023, 1,683 in 2024,
1,631 in 2025, 1,263 so far in 2026.

## The fields — 131 stored, about twenty hold facts

| Kind | Fields (filled of 15,509) | Goes to |
| --- | --- | --- |
| **Identity** | `__ID_Person` (one duplicated key) | `filemaker_links` |
| | `ZFirstName` 15,159 · `ZSurName` 15,229 · `ZSurName2` 34 · `NickName` 286 | `first_name`, `last_name`; a second surname and a nickname are new columns or dropped |
| | `_ID_GenderReference` 15,327: Frau 8,091 · Herr 7,219 · Divers 14 · 3 typed values | `salutation` (`ms` / `mr` / `mx`) |
| | `DateOfBirth` 10,279 (66%) · `YearOfBirth` 956 | `birth_date`; a birth year alone has no column yet |
| | `_ID_Homeland` 10,899 (70%) — ids of `Flag`, whose short codes are German three-letter abbreviations (`Ägy`), not ISO; 94 people point at 72 deleted flags | `nationality_code` through a `Flag` → ISO table, matched on the German name |
| **Facts our table lacks** | `Occupation` 4,934 · `_ID_Mothertongue` 1,275 · `BirthPlace` 1,263 · `NumberPassport` 1,262 · `_ID_CountryBirth` 545 · `Function` 526 (job title at an organisation) · `_ID_Status_Family` 589 | new columns, another table, or not carried — decisions 3 and 4 |
| **Audit** | `DateOfCreation` / `TimestampCreation` 15,507 · `UserName` (62 names) | `created_at`, `created_by` |
| **Role links** | `_ID_Student` 7,051 · `_ID_Client` 6,341 · `_ID_Management` 4,427 · `_ID_Contact` 3,859 · `_ID_Accommodation` 1,296 · `_ID_Institution` 1,131 · `_ID_Corporate` 842 · `_ID_Landlord` 336 · `_ID_StaffMember` 324 · `_ID_WaitingRoom` 162 · `_ID_Agency` 150 · … | rebuilt from the tables that point at the person, when those are imported; `_ID_Student` also kept in `filemaker_links` |
| **Derived copies** (auto-entered) | `Gender_1/2`, `Gender_Neutral*`, `Homeland_1`, `Country_1/2`, `CountryLong_1`, `MotherTongue_1/2/Long`, `CountryBirth_1/2`, `Salutation.Formal/Informal_1/2`, `Lieber_D`, `Adjective_1`, six birthday fields, `DateOfBirth.1900`, `_MonthDay`, `ThisYear`, `EnumerateNationality` — and `DateOfDeath` (10,291), which is filled exactly where a birth date is: a misnamed calculation, not a fact | not carried |
| **Constants** | `_0`, `_1`, `_2`, `_3`, `_4`, `_23`, `_24` | not carried |
| **Search helpers** | six `Searchfield*`, `FirstCharakter.*`, `First2Charakters.WholeName`, `Token`, `ValueFind` | not carried |
| **Never used** (0 filled) | `Priority`, `Title`, `AcademicTitle`, `CommentOnPerson`, `NumberVAT`, `Homeland_2`, `StatusFamily`, `Adjective_2`, `ContactForm_2`, `filter_txt_f/s`, `_ID_Third`, `_ID_Import`, `_ID_Activity`, `_ID_Underground`, `_ID_Instrument`, `_ID_Chosen`, `_ID_Mentor`, `_ID_Department`, `_ID_Limbus`, `_adjust_ID_Platform` | not carried |
| **Form of address** | `_ID_Salutation`: Sie 10,064 · Du 101 | not carried — CASA says „du" to everyone now |
| **Sensitive (staff)** | `NumberTaxe` 86 · `NumberAgeInsurance` 86 · `NumberHealthInsurance` 41 · `AccountNumber` 41 — tax, pension and health-insurance numbers | **not into `people`** — decision 4 |
| **Unknown** | `Number1–4` (about 246 each) · `Salutation_1` 95 · `ContactForm_1` 87 · `_ID_Member` 34 · `_ID_Editorial` 8 · `_ID_Touch` 6 | ask the team |

## Contact channels

| | Rows | People with one | One per person | Kind recorded |
| --- | --- | --- | --- | --- |
| `Email` | 13,979 | 12,047 | 11,374 | 39% (privat 4,146 · Arbeit 933 · Agentur 143 · alternativ 103) |
| `Phone` | 14,605 | 12,095 | 10,773 | 47% (privat 2,768 · Handy 2,633 · Arbeit 792 · Fax 73) |
| `Address` | 12,940 | 11,501 | 11,130 | almost none |

Of the 8,800 learners, 8,312 have an email, 7,635 a phone and 7,535 an address. `Email.Priority`
is never set, so nothing says which address is the main one — the newest is the best guess. Some
channel rows belong to an agency or a company rather than a person (about 1,200 emails have no
person).

## For the bridge

Nobody is copied across in bulk. A person comes into the workspace when there is a reason — they
enquire again, a colleague opens them, a booking needs them — and the bridge reads that one person:

- their names, gender, birth date, nationality and mother tongue (the facts above);
- their e-mail addresses, phone numbers and address (the newest first, since nothing marks a main one);
- the link to their `__ID_Person` and `_ID_Student` (`filemaker_links`), so the same person is never
  read twice.

What our side lacks for that: an **`addresses`** table (we have none), the **`Flag` → ISO** country
mapping (matched on the German name; 72 deleted ids flagged), and whichever extra facts are decided.

## Decided (Rahman, 2026-10-16)

1. **All learner information comes along** — mother tongue, place and country of birth, occupation,
   passport number, a birth year where the date is unknown — because some of it is required for telc
   exam registration. The workspace's `people` gains the columns for it.
2. **Staff tax, pension and health-insurance numbers, and bank accounts, come along too — with
   restricted access**: only the people whose work needs them (finance, management) see them, not the
   whole team. They live apart from the learner's everyday fields, under their own module right.

*Built 2026-10-16 (migration 0029, `docs/ADMIN_WORKSPACE.md` §Lists 21): the learner facts and two
addresses on the person's page, and bank accounts under the module `private_data` — which the whole
team holds (Rahman, the same day: staff must be able to enter a learner's bank details). The tax,
pension and health-insurance numbers belong to the 86 employee records; their table exists and they
come back on the staff pages, restricted to finance and management.*

## Duplicates *(live, 2026-10-16)*

A **duplicate** here is two `Person` records for the same human — not an extension. An extension is
another booking on the **same** person record, which is the normal case: 4,170 learners have two or
more bookings that way. Matched on the same first name, surname and birth date (accents and spaces
ignored), there are **275 groups with 562 person records**:

| What the records hold | Groups |
| --- | ---: |
| One has bookings; the person enquired again and got a new record | 96 |
| Two or more each have bookings — a later booking was made on a new record instead of extending the old one | 74 |
| One has bookings, the other has nothing | 41 |
| Enquiries only, or nothing at all | 64 |

And one person id is used by two records. (`docs/FILEMAKER_LESSONS.md` counted 501 with a looser
match.) *Proposal:* when the bridge brings a person across and finds a second record for the same
human, a colleague confirms that they are one; both FileMaker records are then linked to the one
workspace person (`filemaker_links`), and both histories are kept.
