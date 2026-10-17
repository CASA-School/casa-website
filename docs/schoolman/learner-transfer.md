# Learners from SchoolMan — what comes across, what cannot yet

Rahman, 2026-10-17: transfer all the data related to students, including the comments about them —
first a sample, to see what the workspace is missing. Live and read-only; counts only.

**The sample:** 528 learners — everyone in a course this week or starting one in the next four weeks,
on a booking that is not „nein"/„storno". SchoolMan has 15,514 people (about 22,500 bookings), so this
is about 3% of them. Nothing beyond the sample is imported. The run is
`python3 -I scripts/filemaker/read_learners.py | node scripts/filemaker/import-learners.mjs`
(docs/ADMIN_WORKSPACE.md §Learners from SchoolMan); a second run changes nothing.

## Comes across

| SchoolMan | For the sample | In the workspace |
| --- | ---: | --- |
| `Person`, `Email`, `Phone`, `Address` | 528 people · 543 e-mails · 494 phones · 523 addresses | `people` and their channels (no passport number) |
| `Booking` + `DateBooking` | 2,146 bookings · 2,151 periods | `bookings`, `booking_periods` (course, group, step, status, under observation) |
| `CostDetail`, `PaymentIn`, `PaymentOut` (refunds to the learner) | 8,554 charges · 6,779 payments · 95 refunds | `booking_charges`, `payments`, with their comments |
| `Booking.FinalNote`, `DateBooking.CommentBooking`, `Comment` | 302 · 130 · 2 | notes on the booking or the person, under their SchoolMan author |
| `TestStudent` (online placement tests, certificates) | 537 | notes: test, day, result, level, score, comment |
| `Agreement` (learning agreements, teacher's recommendation) | 154 | notes with the full text |
| `WorkFlow` (the work log — where most comments about a learner are) | 10,977 lines | the record's history, „in SchoolMan" |
| `Letter` with its text | 9,500 (2,805 of a kind the workspace does not write) | `letters`, on the booking; the next letter is worked out from them |
| `BankAccount` | 62 | `bank_accounts` |

## Cannot come across yet — the workspace has no place for it

| SchoolMan | For the sample | What is missing |
| --- | ---: | --- |
| `SingleDateStudent` — attendance: present, absent, why, minutes late | 34,112 rows | No attendance at all. It is the Klassenbuch's; whether the workspace shows it (read-only) is a decision |
| `DateAccommodation` + `Accommodation` — the stay, its status, the host | 362 stays | A booking holds one wished-for stay; no host, no placement, no stay status, no second stay (open item: placing learners) |
| `PaymentOut` — rent paid to hosts, agency commission | 392 · 463 | No payouts and no commission (finance, with DATEV) |
| `Commission` | 890 lines | No agency commission |
| `Instalment` — payment plans | 412 lines | No instalment plans |
| `Invoice` | 124 | No invoices (mostly companies and groups) |
| Exam bookings (`Booking._ID_Exam`) | 95 | The exam module exists; SchoolMan's `Exam` dates are not matched to our sittings yet — the next step |
| `PreBooking`, `Contact`, `WaitingRoom` — how they came in | 449 · 311 | Intake before the booking; the workspace's own intake is the website's. Whether the old ones come across is a decision |
| `SingleDateControl` — follow-up dates set by letters | 1,687 | No follow-up list |
| `WorkFlowLetter` — how a letter was sent (e-mail, print, SMTP) | 8,620 | Letters come with their date, not how they went |
| Test results as a level | 537 | They arrive as notes; „Niveau" stays „nicht bestätigt" — a confirmed level needs our own placement review. A level history from SchoolMan's tests would need its own record |
| Learning agreements as records | 154 | Notes only; no agreement module |
| `Booking.CertificateText` — the certificate's wording | 2,160 | No certificate of participation yet |
| `Complaint` | 2 | No complaints |
| `Offer` | 19 | The offers module exists; SchoolMan's offers are not mapped |
| Letters before 2025 | — | They live in `Letter.fmp12`, a separate file not in reach |
| Periods on courses before our twelve months | 1,069 | They keep their dates without a course (open item: past courses) |

## Found on the way

- SchoolMan's per-booking totals (`cal_CostGross`, `cal_PaymentIn`, `Balance.*`) are written once, not
  live, and are stale on about one booking in twenty; the workspace sums the lines.
- The learner counts per course counted „nein"/„storno" bookings; corrected (12,959 → 11,166
  learner-weeks).
- `TestStudent` holds placement tests and exam certificates alike.
- Five imported learners look like people already here; they are flagged for a colleague to link.
