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

`organisations` and `organisation_contacts`, made for offers: a name, a kind (school, agency,
company, authority), a country, a language, contacts. No commission terms, no client status, no link
from a learner to their school or employer.

## For the bridge

- Read an organisation when an offer or a booking needs it, by name match, and link it
  (`filemaker_links`) — no bulk copy of 3,771 parties.
- Agency commission terms (`CommissionDetail`, 51 rows) are small and matter for money; they come
  with that module.

## Open questions for the team

1. Is `Management` how the team thinks of "a contact" — or is it invisible to them?
2. Which agencies are active today?
