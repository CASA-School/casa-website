# Letters, the work log and notes

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only.

## The tables

| Table | Rows | Kept since | What a row is |
| --- | ---: | --- | --- |
| `Letter` | 33,213 | 2025 (18,229 that year, 14,985 in 2026) | A letter composed by a script: address header, subject, text, which script made it |
| `WorkFlowLetter` | 18,960 | 2025 | A letter sent or printed: e-mail through the colleague's mail program 13,779 · printed 3,123 · sent directly by SMTP 2,037 |
| `WorkFlow` | 109,870 | 2022 | **The history of a booking** — one line per thing done, with the process it belongs to |
| `SingleDateControl` | 7,539 | 2024 | A follow-up date set by a letter script (the reminder list) |
| `Comment` | 1,413 | 2022 | A note on a course (54%), a party (36%), a host (26%) or a person (21%) |
| `Complaint` | 23 | 2021 | A complaint |
| `LetterServices`, `Offer` | 252, 397 | — | Letters to publishers; offer letters (`intake.md`) |
| `AdminWork` | 14,483 | 2022 | A staff member's admin time on a day (`staff.md`) |

Letters only go back to 2025 in this file. `Letter.fmp12`, a separate file, was not in the backup
the DDR was made from — older letters may live there.

## How a letter is made

**187 scripts make a letter**, all from one template: read the booking's values in German or
English, write a `WorkFlow` line (e.g. "1. Reminder mit Zahlungsfrist bis … geschickt"), write a
`SingleDateControl` follow-up date, create the `Letter`. Sending is a separate button
(`SendEmail.Parameter_Letter`, `PrintOne.Long_Letter`) that logs a `WorkFlowLetter`. The main
letters: confirmation, first and second reminder, cancellation, right level, show-up, student card,
visa letter, payment receipt, overview of charges and payments, instalment plan, and the certificate
of participation (sent as PDF, also by WhatsApp).

## What the work log holds

`WorkFlow` has 184 stored fields; 86 were never filled. A line's text is one auto-entered field
(`Workflow_1`), its process `_ID_ProcessReference` on 88%: **accounting 53,363**, learning progress
25,296, accommodation 6,316, daily appointment 2,926, none 8,244 — and 531 rows with `De` or `En` in
the id field. It links to a person (96%), a booking (83%), a course (58%).

## What leaves SchoolMan

- E-mail: most letters open in the colleague's own mail program; six scripts send directly by SMTP,
  and **nine scripts store a mail password in the step** (six for the mail@ account). Their names are
  in `output/filemaker/ddr_scripts_layouts.md` §d; the password is not copied anywhere.
- 117 Excel/CSV exports into the colleague's Documents folder; PDFs saved before mailing.
- WhatsApp opened with a learner's or teacher's number and a prepared text.
- No script calls a web service. The Data API is opened by privilege sets, not scripts.

## In the workspace today

`letters` and `letter_texts` (offers only, migration 0022), `staff_notes` and `staff_activity` (one
line of time per record, notes beside changes), `day_tasks`. The workspace sends no e-mail itself.

## For the bridge

- A person's recent history — the last letters and work-log lines — is worth showing beside them,
  read on demand. The log's text is the colleague's shorthand; it is shown, not interpreted.
- The letter templates are worth reading as content when confirmations and visa letters are built.

## Open questions for the team

1. Are the stored mail passwords still valid, and who changes them? (Rahman owns this.)
2. Which letters does the team send every week — the ones to build first?
