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

## Which letters go out *(live, by the script that wrote them)*

| Letter | All | 2026 |
| --- | ---: | ---: |
| Payment receipt (`ReceiptPaymentIn_Booking`) | 7,349 | 3,122 |
| First confirmation of a booking (`Confirmation.First_Booking`) | 3,657 | 1,534 |
| Confirmation for an individual learner (`ConfirmationStudentIndividual_IDStudent_Booking`) | 2,135 | 934 |
| Missing information (`MissingItem.Platform.V10`) | 1,507 | 757 |
| Visa letter (`VisaLetterSelected_Booking_De`, `VisaLetter.FirstBooking_Booking`) | 1,609 | 733 |
| Show-up, first and last call (`ShowUp.FirstCall_Booking`, `ShowUp.LastCall_Booking`) | 1,361 | 630 |
| Exam confirmation (`Confirmation.Exam_Booking`) | 902 | 401 |
| Room change (`RoomChange_SingleDateCourse`) | 900 | 468 |
| Instalment plan (`Instalment_Booking.V10`) | 823 | 377 |
| "Wish you were here" (`WishYouWereHere.Student`) | 818 | 334 |
| Confirmation through an agency (`ConfirmationAgency_IDStudent_Booking`) | 670 | 266 |
| Second reminder, course and accommodation (`2.Reminder_Booking*`) | 1,059 | 427 |
| Waiting-list confirmations, exam and course | 822 | 443 |
| Student card, course-start mail, invoice, host letters, certificates … | | |

128 kinds in all; 21,000 written in German, 2,300 in English, the rest without a language noted.

**How one is made — the receipt.** The script reads the booking, the person, the course, the
selected payments and the balance; composes the text in German or English with `Case()` on the
parameter; makes the booking number from line | booking | year; writes the `Letter` (address header,
e-mail, subject "Empfangsbestätigung für … | Buchungsnummer …", the text). **It also does something
else:** when the learner needs a visa and has paid more than 200 €, it marks the visa payment done on
the booking and e-mails intensiv@ that the visa payment has arrived. A letter that changes a booking
is the kind of side effect the workspace keeps out of letters.

**Confirmations and reminders** write a work-log line ("Bestätigung mit Zahlungsfrist bis … geschickt")
and a follow-up date. **The show-up letter** refuses to be written too early or after the deadline for
moving a course. **Letters mix du and Sie** — a confirmation seen on screen says "danke für deine
Anmeldung" and then "bitten wir Sie"; the website and the workspace say du throughout.

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

Decided (Rahman, 2026-10-16): the stored passwords stay as they are for now — SchoolMan is live, and
nobody else has access to them.

1. Receipts, confirmations (first, individual, exam, agency) and the missing-information letter are
   about half of all letters (16,220 of 33,218) — the ones to build first?
