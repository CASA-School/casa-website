# Letters — every letter the workspace writes

Migration 0022 · `src/lib/admin/letters` · `src/components/admin/letters` · branch `admin` (2026-10-13)

Read this before adding a kind of letter — an enrolment confirmation, a visa invitation, a
certificate of attendance — or touching how an offer's letter is built, shown, printed or kept.

---

## Why a layer of its own

CASA writes many letters: offers, confirmations to learners, visa letters for the embassy,
attendance certificates, letters to the Jobcenter. In FileMaker they are all one `Letter` table with
82 `_ID_*` columns, and a letter's body is a text field a script writes once and the team edits by
hand — so the letter and the record it came from drift apart (offer 37602: 1,560 € in the offer,
1,370 € in its letter). The offers module was the first to need letters; they are built here so the
next kind is a function and a row, not a second module (Rahman, 2026-10-13: "letter will be a table
of its own as we will create letters for a lot of things … a good start to build that type of
architecture").

## The model

| Table | One row is | Notes |
| --- | --- | --- |
| `letters` | one letter as it was sent | `kind`; the record it is about — exactly one, by its own foreign key (`offer_id` today; `CHECK (kind = 'offer') = (offer_id IS NOT NULL)`); `version` (the record's count: an offer's second version is its second letter); `language`; to whom (`organisation_id`, `person_id`, `recipient_name`, `email`); `subject`; `document` (the letter, the shape below); `source` (what it was built from); sent by and when |
| `letter_texts` | a standard text | `(kind, language, part)` → `body`. No row means the kind's text written in code |

A letter is written **once**, when it is sent, inside the transaction that marks its record as sent:
the record never says "sent" without the letter that went out, and the letter is never changed after.
A letter is about one record through one required column — never a free uuid, never a row that has
to be inferred from which of many columns is filled (`docs/FILEMAKER_LESSONS.md` §3.2).

## The shape (`src/lib/admin/letters/types.ts`)

```
Letter = { schema: 1, kind, language, returnAddress, recipient[], placeDate,
           subject: { lead, title, tail }, salutation,
           body: LetterPart[], signOff, signature[], footer[] }
LetterPart = text (slot?, strong) | heading (detail) | table (heading, rows, total) | sum
```

A kind of letter is a pure function from its record to a `Letter` — `offerLetter()` in
`src/lib/admin/offers/document.ts` is the first. The letterhead, the footer, the sign-off, dates,
money, the salutation (du in German) and the address block come from `letters/format.ts`, so every
kind looks like CASA.

A `text` part with a `slot` (`intro`, `note`, `validity`, `closing`) is one the letter view can edit
where it stands; an empty one prints nothing. A table row's `ref` names what it was built from (an
offer line's `participant:course`), so its text can be changed on the page.

**Reading a stored letter.** `readLetter()` (`letters/read.ts`) checks a stored document against the
shape of its `schema` number and refuses one that does not fit; the sheet is never handed a letter
with a part missing. When the shape changes: bump `LETTER_SCHEMA`, and teach `readLetter` the old
one, so letters sent years ago still open. (The offers module's first copies, kept before this layer,
lacked a field the sheet had started to read, and opening one crashed the letter tab.)

## Showing, editing, printing (`src/components/admin/letters`)

- `letter-sheet.tsx` — `LetterSheet`: CASA's A4 letterhead in container units, so the screen is the
  page at any width; `variant` `screen` (the letter tab), `print`, `thumb` (the miniature beside an
  offer). `slots` make parts editable where they stand; print and sent letters pass none.
- `inline-edit.tsx` — `InlineText` (a text becomes the same text, editable, with a bar: *Standard
  text* / *Only this letter*, *Use the standard*, *Save as standard*) and `InlinePanel` (a part that
  opens a small panel: the recipient, the date, the signature).
- `print.tsx` — `PrintCopy` renders the letter a second time on `<body>` as `[data-letter-print]`;
  `globals.css` hides everything else on paper and sets `@page letter` (A4, the first page's margins
  inside the sheet). `printLetter(name)` names the PDF.

## Choosing the letter (2026-10-17)

Rahman: "there is a list of different types of letters so it should be more intuitive … the types
and the whole framing" (the sheet itself stays as it is). A booking writes up to fourteen kinds, so
the page around the sheet says which one is due, where each stands and what each is:

- **A mark per kind** (`letter-kind.tsx`, `LETTER_KIND_LOOK`): an icon for what it does, a colour for
  its stage — blue the registration, green money, sun before the course or the exam and the waiting
  list, ink the confirmations after it, red a cancellation. The same mark wherever a letter is
  listed: the switcher, a booking's „Briefe" card, a person's letters, a registration's, the sitting's
  letters to all, the sent letter's head.
- **Stages in the order a booking goes** (`BOOKING_LETTER_GROUPS`, `EXAM_LETTER_GROUPS`): Anmeldung ·
  Zahlung · Visum · Kursbeginn · Stornierung; for an exam Anmeldung · Zahlung · Prüfungstag · Nach der
  Prüfung · Stornierung.
- **What is due** (`letters/suggest.ts`, pure and tested): from the booking and the letters sent —
  the confirmation not yet sent; a payment after the last receipt; the letter for the embassy once a
  visa learner has paid in full; the show-up letter 40 to 9 days before the start; the course start
  in its last week; for an exam the invitation in the last fortnight and „Ergebnis ist da" once the
  result is entered; a reminder when money is open a week after the confirmation and no reminder
  went that week; missing details only when the essentials are missing (date of birth,
  nationality, a way to reach them, a passport number for a visa) — not every field on the list, which
  almost every record lacks; a cancelled booking only its cancellation. Most urgent first.
- **The switcher** beside the sheet: per stage, each kind with its mark and where it stands — *Vorschlag*
  when due, „✓ 12. Okt." when sent, a padlock with the reason on hover when it cannot go yet (it still
  opens, to read and print) — and „Als Nächstes" on top, the most urgent one not open. On a phone or
  a tablet the kinds are one row of chips above the sheet, scrolled to the one open.
- **The head**: the kind's mark and name, whom and which booking it is for, and whether and when it
  went („Gesendet am 12. Okt.", „3× gesendet, zuletzt am …", or „Noch nicht gesendet").
- **„Brief schreiben" opens the letter due** (`/letter` without a kind), and a booking's „Briefe" card
  offers it first — „Als Nächstes: Empfangsbestätigung" — above the letters sent.

## A booking's letters and the waiting list's (2026-10-16, migration 0032)

Rahman: "start with the letters". SchoolMan's most written letters after offers, read from its DDR
(`docs/schoolman/letters-and-history.md`), each a kind here, about one record by one foreign key
(`letters.booking_id`, `letters.waitlist_entry_id`):

| Kind | About | SchoolMan's | What it says |
| --- | --- | --- | --- |
| `booking_confirmation` | booking | `Confirmation.First_Booking` (3,657) | the course with its days, times and lessons a week, the stay, the costs and total, what came in and what is open, what to transfer by when, the payment reference, a PS that it is no visa confirmation |
| `payment_receipt` | booking | `ReceiptPaymentIn_Booking` (7,349) | the payments chosen (the latest by default), their sum and the sum in words — in the letter's language, where SchoolMan spelled German on English receipts — the booking's total, paid and open |
| `waitlist_confirmation` | waiting-list entry | `ConfirmationWaitingList.Course` | the course is full, the learner is on the list, their place in it |
| `waitlist_place_free` | waiting-list entry | `FreePlaceWaitingList.Course` | a place is free and held; please answer soon |
| `waitlist_no_place` | waiting-list entry | `Maybenexttime_Course` | no place this time; the next start of the same course |

The builders are `src/lib/admin/letters/booking-letters.ts` (pure, tested), fed by
`booking-context.ts` (one read of the record). **What to pay and by when follows the terms**
(AGB §5.2–5.3): a learner abroad (visa) pays the whole first course within a week; anyone else a down
payment (`course_types.down_payment`) within a week and the rest four weeks before the start, or by
the first day of a follow-up booking; within a week of the start, by the start. SchoolMan used a
seven-day deadline and, in one variant, left the amount blank.

**What the letter says, the record does** (`booking-issue.ts`): sending "a place is free" marks the
entry offered (the place is held); sending "no place this time" takes the learner off the list
(reason `no_place`). The confirmation and the receipt change nothing on the booking — SchoolMan's
receipt script set a visa flag and opened a mail while writing.

**Where.** A booking's „Briefe" card (confirmation, receipt, everything sent) →
`/admin/bookings/[id]/letter?kind=confirmation|receipt`. A waiting-list row's „Brief", and its line
saying what was sent last → `/admin/catalogue/waitlist/[entryId]/letter?kind=confirmation|place_free|no_place`.
The learner's „Briefe" tab lists every letter to them, offers included. `/admin/letters/[id]` shows
one as it went out, to print, save as PDF and email (`mailto:` with the subject). The composer
(`letter-composer.tsx`) is the offer letter's way of editing: the opening, closing and PS are
standard texts (save as standard: `bookings` at `full`); the sentences built from figures — what to
pay, a place in the queue, the next start — are changed for one letter; a note can be added; the
language follows the learner's website registration, else German.

**Booking numbers (0033).** A booking's number — „B-2026-0042", the year it was made and a running
number — is in the confirmation's subject and the receipt's, and is the payment reference
(„Verwendungszweck: B-2026-0042, Lucía Fernández").

**Open:** the terms (§5.2) name a 100 € down payment for the course; the catalogue's
`down_payment` says 200 € for intensive courses: the letters use the catalogue's figure, and one of
the two needs correcting.

## More of a booking's letters (2026-10-16, migration 0034)

Rahman: "check the types of letters. there are more types". SchoolMan writes **128 kinds**
(`Letter.ScriptName`, 33,000 letters since 2025). Read from its DDR and counts, the ones the
workspace has the data for are built, each about one booking, on the same letter page
(`/admin/bookings/[id]/letter?kind=…`, a grouped list beside the letter):

| Kind (`?kind=`) | SchoolMan's | 2026 | What it says, and its rule |
| --- | --- | ---: | --- |
| `visa_letter` (visa) | `VisaLetterSelected_Booking_De`, `VisaLetter.FirstBooking` | 715 | Sie, to the embassy: enrolled for the course, its lessons a week and in total, in person, the programme A1–C1, the contract clause, the stay, the full payment received; asks for the visa papers. **Only once paid in full and with a date of birth** — SchoolMan stated full payment whatever was paid, and its two versions disagree on 5 or 6 levels (CASA has six: A1, A2, B1, B1+, B2, C1) |
| `missing_items` (missing) | `MissingItem.Platform.V10` | 710 | the details still needed, ticked from SchoolMan's list; those the record lacks are ticked when the letter opens |
| `showup_first_call` (showup) | `ShowUp.FirstCall_Booking` | 463 | visa proof and confirmation of attendance 19 days before the start (never a day already past), or the booking is deactivated; postponement rules. **Only 40 to 9 days before the start**, as SchoolMan |
| `showup_last_call` (lastcall) | `ShowUp.LastCall_Booking` | 167 | reply by tomorrow, with the date. **Only after the first call** |
| `payment_reminder` (reminder) | `1.`/`2.Reminder_Booking` | 290 | what is open, by when, how to pay (office or transfer), the reference — SchoolMan's first reminder gave no bank details. A second one says „2. Erinnerung". Only with something open. No status change: the booking's colour follows its money |
| `payments_overview` (overview) | `Overview.Parameter_PaymentIn_Booking` | 322 | the costs (SchoolMan computed them and left them out), the payments, what is open, settled or credit |
| `course_start` (start) | `CourseStartMail.Individual_Booking` | 211 | the day, the time, the school, the room and floor; come 15 minutes early; the book. SchoolMan's ended "see you on " with the date missing. Not after the start |
| `enrolment_certificate` (certificate) | `StudentCard_Booking` | 191 | third person, no salutation: enrolled from–to in the course and level, lessons a week and in total. **Not "attends regularly"** — SchoolMan certified attendance nothing recorded; that waits for the Klassenbuch |
| `cancellation_confirmation` (cancellation) | `CancelStudent.Definite`, `Cancel.Definite`, `Deactivate` | 169 | the cancellation, and what it leaves from the booking's own lines — a fee to pay, or a credit to refund or carry over. SchoolMan wrote a fixed 100 € fee into the text. Only for a cancelled booking |

The rules are `bookingLetterBlock()` — the letter page shows the reason and keeps the preview; the
server checks them again. A course's weeks and lessons are **teaching weeks** (`teachingWeeks`, the
school's closures left out), so a level over Christmas is 8 weeks and 160 lessons, not 10 and 200 —
on the letters, the booking page, the course start page and the learner's „Woche 3 von 8".

**The rest of the 128, and what each waits for** (2026 counts):

- *Instalment agreement* (370) — waits for instalment plans.
- *Agency confirmation with commission* (262), *free letters to organisations* — wait for agency pages.
- *Invoices* (214 + cancellations) — wait for invoices (and the DATEV link).
- *Attendance* — "Dein Kurs vermisst dich" (331 + 74), certificates of participation (139 letters,
  ~2,000 PDFs), learning agreements (258): wait for the Klassenbuch bridge.
- *Rooms* — room change (461), course start to a whole course (194), course restart (109): wait for
  rooms per day from Kursplanung.
- *Accommodation and hosts* (about 700 in all): wait for the accommodation module.
- *Staff circulars, teacher logins* — not letters to learners. SchoolMan writes teachers' Klassenbuch
  logins into stored letter text; the workspace will not.
- *Dead*: about 25 kinds unused in 2026 or used fewer than ten times.

## A learner's and a registration's letters (2026-10-17, migration 0035)

Two letters are about something other than one booking, so `letters` gains a subject for each:

- **Confirmation of several bookings** (`learner_confirmation`; SchoolMan's
  `ConfirmationStudentIndividual`, 915 in 2026) is about **the learner** (`person_id`, versioned per
  person). It opens from the learner's „Briefe" tab, or from a booking's letter list with that
  booking ticked (`/admin/people/[id]/letter?bookings=…`). The colleague ticks the bookings; by
  default those neither cancelled nor ended are ticked. Each booking is shown with its number,
  dates, lines and subtotal, in the order of the courses. Then come the total, what has been paid
  and what is open. The payment sentence covers everything: by 7 days from today or the first
  course start, whichever is earlier, or, for a visa, the whole amount. The reference carries every
  booking number. A cancelled booking cannot be confirmed (`learnerLetterBlock`). Which bookings
  the letter covered is in its `source`, and each of them logs it.
- **Registration letters** are about **a website registration** (`registration_id`, `ON DELETE
  RESTRICT`), before there is a booking, at `/admin/registrations/course/[id]/letter`:
  `registration_deposit_request` („Bitte um Anzahlung"; `NewLetterDownPayment`, 260) asks for the
  course type's down payment, falling back to 100 € (the AGB's figure) when none is set, and adds
  the visa paragraph when the learner asked for a visa. `registration_test_request`
  („Bitte um Testergebnis"; `NewLetter.SendTest`, 180) asks for the placement-test result, with the
  link to the public placement page in the letter's language. The letter is in the registration's
  language. **Sending one sets a new registration to „In Arbeit"** (it was „Wartet auf Antwort" until
  the three states of 2026-10-21). SchoolMan wrote these and its list never knew. Both texts are
  standard texts, editable with `registrations` at `full`. A third, `registration_later_course`
  („Späterer Kurs", 0076, 2026-10-21), answers a registration for a full or closed course with the
  next start of the same course (`laterStart`), from „Späteren Kurs anbieten" on the registration.

## An exam booking's letters (2026-10-17, migration 0037)

An exam booking (`docs/ADMIN_WORKSPACE.md` §Exams) writes its own letters, from its letter page
like any booking's, and not the course's (`lettersFor`, checked again on the server):

| Kind (`?kind=`) | SchoolMan's | What it says, and its rule |
| --- | --- | --- |
| `exam_confirmation` (exam, the default) | `Confirmation.Exam_Booking` (401 in 2026) | the exam and the parts, the day and hours, the school; the costs; pay within a week, but before telc's deadline and the day before the exam, to reserve the place for good; the reference. Then what SchoolMan's never said: the name must be as in the ID (telc prints the certificate with it), bring the ID; the registration is binding and a no-show is not refunded (AGB 6.2) |
| `exam_invitation` (invitation) | `InvitationExam.Student_Booking_telcB2`/`_telcC1` — circulars with every candidate's address on one letter | be at the school a quarter of an hour before the start (SchoolMan's 08:15 for 08:30) for the check of everyone's details; the ID; for the oral part only, its time (12:45, a standard text); for one part, bring the earlier telc result; water bottle and watches. Not after the exam day |
| `exam_results` (results) | `ErgebnisseDa_Exam` | the result can be collected at the office with an ID, never given by phone or email; someone else needs a written authorisation. Only once the result is entered (0038) |
| `exam_participation` (participation, 0038) | `Confirmation.ParticiptionExam_Booking` | third person, no salutation: took part in the exam on the day, in the parts the candidate came to. SchoolMan certified participation nothing recorded; here only once the result is entered, never for a candidate who did not come |

The invitation, the result and the participation also go to every candidate of a sitting at once
(„Briefe an alle", `letters/exam-bulk.ts`): one letter each, in their language, kept on their booking,
printed together a page each.

The receipt, the reminder, the overview and the cancellation are the booking letters there are; they
show the exam where a course's would be, and the reminder's deadline is the exam's. An exam's queue
writes the three waiting-list letters with the sitting; „no place this time" names the next sitting
of the same exam. The confirmation of several bookings lists an exam booking with its day.

## Sending (2026-10-23, migration 0085)

Rahman: every letter the workspace makes goes out through the workspace's mail screen, the letter as a PDF
(docs/ADMIN_WORKSPACE.md §Mail). „Als gesendet speichern" on a booking's, a learner's, the waiting
list's or a registration's letter, „Senden" on an offer, and a sitting's letters to all now lead to
`/admin/letters/mail?ids=…`; a saved letter's page offers „Per E-Mail an …". The `mailto:` buttons are
gone.

- **The PDF** is the letter exactly as „Drucken / PDF" prints it: the server's own headless Chromium
  (`playwright-core`, installed in the image with its system libraries) opens `/admin/letters/[id]` on
  `admin.localhost` inside the container with a three-minute session of the colleague who sends, and
  prints it with the page's print styles (`src/lib/admin/letter-pdf.ts`). `/admin/letters/[id]/pdf`
  serves it to look at and to attach in Outlook — a route handler, so it checks sign-in and the letter's
  right itself.
- **The mail** (`letters/cover-mail.ts`): the letter's title as heading, the letter's own salutation, a
  short text in the letter's language („im Anhang findest du unser Schreiben „…" als PDF."), the PDF
  named, the sender's signature. Several letters: one mail each, to that letter's recipient, with their
  own letter; a language switch when they are in German and English.
- **The right** is the letter's (`letters/module.ts`: offers, registrations, else bookings) at `edit`,
  checked on the page, first in the action, and again for every letter sent.
- **Kept**: each mail sent directly in `letter_mails` (recipients, subject, text, signature, who, when),
  and the letter's `sent_via = 'email'`. At most 60 letters in one sending (`MAX_LETTERS`).

## Adding a kind of letter

1. Migration: add the kind to both `CHECK`s, its record's column to `letters` (a foreign key) and to
   `letters_subject_check`, and a unique index on `(that_id, version)` if it has versions.
2. `LETTER_KINDS` in `types.ts`; `IssueLetter.about` in `repo.ts`.
3. A pure builder `xLetter(record, ctx): Letter` using `letters/format.ts`, with a test.
4. Its standard texts as defaults in code, read through `standardTexts(kind, defaults)`.
5. A view that renders `LetterSheet` with slots, and a send that calls `issueLetter()` in the
   transaction that marks the record as sent.

## Open

- A list of every letter to an organisation (`letters_organisation_idx`) belongs on its page once
  organisations have one; a learner's is their „Briefe" tab.
