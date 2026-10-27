# Organisations — `Management`, schools, companies, agencies

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only.

## How SchoolMan models an outside party

Every relationship starts as a **`Management`** record (3,771 rows, 73 new in 2026), made from the
first-contact screen (`Go_Touch_Management`). From there a button turns it into what it is:
`Go_Management_Agency`, `_Corporate`, `_Accommodation`, `_StaffMember`, `_Internship`, `_Editorial`.
So `Management` is the party, and the other tables are its roles.

| Table | Rows | New in 2026 | What a row is |
| --- | ---: | ---: | --- |
| `Management` | 3,771 | 73 | The party: who, which platform, its status, a comment (34%) |
| `Institution` | 1,914 | 50 | The name of an organisation (98%) |
| `Corporate` | 788 | 39 | A company as a client |
| `Agency` | 120 | 2 | A language-travel agency; agreement noted on 44% |
| `Internship` | 56 | 1 | An internship placement |
| `Provider` | 17 | 0 | Suppliers — nearly empty (one address) |
| `JunkMall` | 479 | 0 | A holding table records are moved into instead of being deleted (`Go_Accommodation_JunkMall`) |

## What the rows hold

- `Management._ID_StatusManagementReference` is on 12% — multiplier, teacher, CASA staff, friend,
  provider, internship, health insurance, tenant, the Förderverein. Ids and lists mixed (`11\r6`).
- `Management._ID_Platform` holds `11` on 1,759 rows, `-12` on 382 and `0` on 90 — values that are
  not in the platform list.
- `Institution` is mostly a name; `Corporate` mostly links. The people who work there are `Person`
  rows linked by `_ID_Corporate` (842), `_ID_Institution` (1,131) or `_ID_Agency` (150), with a job
  title (`Function`, 526).

**Credentials in comments.** The `Management` screen's free-text comments hold what looks like a
password, a SIM PUK and a customer account number in plain text (seen 2026-10-15, not copied). Anyone
who can open SchoolMan can read them. They should be moved to the password manager and changed; the
bridge never reads `Management` comments.

**A trap:** the `_ID_Provider` column on charges (99%), payments (96%), invoices and e-mails is
**not** a link to `Provider` — it holds a different number on every row, a second serial id under a
link's name. Read it as nothing.

## In the workspace today

`organisations` and `organisation_contacts`, made for offers, and since 2026-10-18 (migration 0057)
an organisation's own e-mail, phone, active state and an agency's agreement; a contact's phone and job
title; `agency_commissions` (a share of a kind of charge); `bookings.payer_organisation_id` (who pays).
One workspace organisation per SchoolMan party, linked in `filemaker_links` to its `Agency` or
`Corporate`, its `Management` and its `Institution`. „Organisationen" in the rail lists and opens
them (docs/ADMIN_WORKSPACE.md §Organisations).

**Brought across for the learner sample (2026-10-18):** `read_organisations.py | import-organisations.mjs`
reads the agencies and companies the sample's bookings name, and the companies of company courses
ahead: 12 agencies, 40 companies (one more has no name in SchoolMan and is left out), 66 contacts,
12 commission terms (all on the course price: 20 % for nine agencies, 7 % for two, 10 % for one),
1,164 bookings linked to who pays (591 through an agency, 573 a company), one company course, 2,311
letters to them. The learners themselves name no employer or school (`Person._ID_Corporate` and
`_ID_Institution` are empty on all 528); `Person._ID_Client` is a customer number per learner, copied
onto their bookings, not a party.

**Group visits (2026-10-18):** the reader also takes in the schools, companies and agencies of all 52
groups (17 agencies, 60 companies, 102 contacts in all); `read_groups.py` brings the groups
(groups.md).

**The other parties (2026-10-18, 0061):** a `Management` record with a relation to CASA
(`_ID_StatusManagementReference`: 1 TandemSchule, 7 Praktikum, 10 Multiplikator, 15 Activity, 19 Provider,
20 Krankenkasse, 22 Förderverein, 23 Umbau) and an organisation's name (`Institution`) comes across as an
organisation with that relation (`organisations.relation`): 20 suppliers, 19 tandem schools, 13 internship
hosts, 12 activity providers, 4 contractors, 2 multipliers, 1 health insurer — 71 in all, with their
contacts. A party already an agency, a company or a host is not taken twice. People stay out: colleagues and
teachers (the staff register), friends and tenants (private), the Förderverein's members (it has no
organisation record). The status list has six values without an id (3, 4, 8, 12, 16, 17 on 131 parties) —
reference rows SchoolMan lost (FILEMAKER_LESSONS).

Not yet: commission per booking (`Commission`, the money module), a booking's contact at the agency
(`Booking._ID_Contact`, 22).

## For the bridge

- Read an organisation when an offer or a booking needs it, by name match, and link it
  (`filemaker_links`) — no bulk copy of 3,771 parties.
- Agency commission terms (`CommissionDetail`, 51 rows) are small and matter for money; they come
  with that module.

## Open questions for the team

1. Is `Management` how the team thinks of "a contact" — or is it invisible to them?
2. Which agencies are active today?

## Completeness review (2026-10-27, migration 0092)

- **Internship hosts** by SchoolMan's `Internship` role (56 rows; only 9 of them carry status 7, which the reader
  looked for): 53 other parties and 6 companies with the relation „Praktikumsbetrieb" — 59 where there were 13 —
  each active by the role's own `_ID_Active`.
- **Commissioning bodies** (`Contractor`, 3: a university, a training provider): their companies with the relation
  „Auftraggeber" (`commissioning_body`). Linking a booking's `_ID_Contractor` is the bookings' work.
- Another party's **active flag** from `Management._ID_Active` (2 = no; it had been taken as active always).
- The **main contact**: `Management._ID_ContactPerson`, else `Agency._ID_ContactAgent`, else
  `Corporate._ID_Contact_Person` — 59 marked here; 7 of the 8 not marked name a person SchoolMan deleted.
- The **note on the party's own e-mail address** (`CommentUseMail`, 59) and the address's country by its `Flag` id.
- The party's **own bank accounts** (an account on its `Management` with no person, host or colleague): 6.

Still open (decisions): what an agency's `_ID_PaymentCommission` (School / Agency) means, `Management.CommentManagement`
(credentials inside), `_ID_StatementLandlord`. A host's offer, district and main contact are the accommodation's.
