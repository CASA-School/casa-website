# The screens the team works in

Part of the SchoolMan study (`README.md`). Gone through on 2026-10-15 in FileMaker Pro on the office
Mac, read-only: the layout was switched from the outside, no field or button was touched, and the
window was returned to its home screen. Screens that run a script when they open were checked first —
only the file's start script writes; every other trigger fires on editing a field. The screenshots
show personal data and stay out of the repository; this page describes structure only.

## The frame on every screen

- **A navigation bar of twenty destinations** across the top — Booking, IntAirport, CentralStation,
  BusStop, NationalAirport, Exam, Contact, WaitingRoom, DateAcco, DateBooking; Management,
  Accommodation, Agency, Corporate, Internship, Offer, Letter, Group, Staff, Course. This is the
  team's map of the work.
- **A left column of action buttons** for the screen (convert, write a letter, add a book, split a
  cost) and a **row of buttons above the form** for the screen's variants and lists.
- **A right column** naming who created and who last changed the record, and when.
- **Lists of everyone beside the record** — a sorted portal of all contacts, all bookings, all stays —
  used to spot the same person twice by eye (buttons `SamePerson`, `SameStudent`, `SameCourse`).
- **Work lists are buttons that change the found set**: `NewStart`, `VeryNewStart`, `End`, `VeryEnd`,
  `StayAfterEnd`, `AllIn`, `Group`, `OnlyCasaFlat`, `OnlyPrivate`, `ShowOnlyOpen`.

## The screens

**Contact — an enquiry.** Left: the organisation, the person (name, address, birth date, occupation,
homeland), e-mail and phone each with a "use", inland or abroad, visa applied, an exam to pick, the
test results (typed as "36/40" with the percentage in the comment, the date and who tested). Right:
language, level, sub-level, course type and time of day as **tick boxes** — several can be ticked,
which is how a field ends up holding `1\r3` — the wanted start and end, a course, the accommodation,
the work log. Buttons convert it: `Go_International`, `Go_Central`, `Go_National`, `Go_Waiting`,
`NewOffer`; `MissingItem` and `Letter` write letters.

**Booking — everything on one page.** The learner, their address and contacts; visa, agency,
company and **who pays** ("1 = institution pays | 2 = self-payer"); the charges (enrolment fee,
course price, books, cancellations as negative lines) with brutto, commission, total and the stored
balances; the course chosen as one line of text (type, level, dates, teacher, room nickname); the
period's start, end, weeks, lessons and a status bar with `SetCoursePrice` and `ResetSchedule`; the
learning-progress comment; the accommodation; the work log; the payments (amount, method, purpose,
date, colleague) with `Receipt_De` / `Receipt_En`. This is FileMaker's all-fields-on-one-layout habit
the workspace deliberately does not copy (`docs/ADMIN_WORKSPACE.md`).

**InternationalAirport — the intensive-course working screen.** The booking shown through its
relationships, plus what the intensive team decides: level confirmed (yes/no), success (with/without),
next level, the year's status (done / not done), *under observation*, the visa payment; a cost log
whose lines read "1. Verschiebung auf …", "'Shown up' bis … geschickt", "Bestätigung mit Zahlungsfrist
bis … geschickt", each with a colleague and a **Kontrolle** tick; and the learner's attendance by
lesson day on the right. The other business lines have their own such screen — that is what the
empty one-to-one tables are for.

**DateBooking — a booked period.** Its tabs are daily work lists on the same table: `Presence`,
`FirstWeek`, `ShownUp`, `Approved`, `SA`, `Success`. The person (copied: name, birth date, homeland,
mother tongue), the course, begin, end, weeks and lessons, the learning-progress log, the learning
agreement, a money summary (brutto, paid, balance, commission, net, credit) and a calendar of every
day of the period.

**Course.** Line, course type, language, location, level and sub-level, teacher, title, the company,
agency or group, the exam; dates and weeks, capacity, time of day and hours, the show-up limit, the
room and its nickname, lessons and price; the weekday plan (`Set_5Days`, `Set_4Days`, teacher and
room per weekday) and its holidays; buttons that generate or erase the lesson days and set teacher
and room on all of them; a list of all courses; the course log; a calendar with public holidays.
`DuplicateCourse`, `ExtendCourse`, `NewBookingStudent`.

**PaymentIn.** A list of all 51,523 payments — name, charge type, amount, method, date, booking
number, level, period — with the sum of everything ever paid at the foot. Next to it `CostDetail`,
`PaymentOut`, `Commission`.

**Letter.** The letter itself, editable on screen (address, date, subject, text, costs, bank details,
signature), with buttons for bold and colours, a choice of which colleague signs and where, today's
letters with their kind (Confirm, Receipt …), and the log of how each was sent (Print, Email_Client).

**DateAccommodation — a stay.** The person, the agency, the period, the type in shorthand
("WG | EZ | ohne" = shared flat, single room, no meals), nights, weeks and days, the deposit; the
proposed and the chosen place — CASA's flats have names — and room; payouts to the host; the
stay's charges and payments; a list of all stays with the host; work lists for starts and ends;
`StatementLandlord`, `EmailStudent`, `EmailHost`.

**Management — a party.** The organisation and contact person, name, address, phones and e-mails
with their use, the status ticks (teacher, internship, activity, Förderverein …), a comment log, all
parties in a list, and buttons that turn the party into an agency, company, host, staff member,
internship or provider. **Its free-text comments hold credentials** — what looks like a password, a
SIM PUK and a customer account number, in plain text, readable by everyone who can open SchoolMan.
They are not copied here; they should be moved out of FileMaker and changed.

**TimeSheet — a colleague's month.** One row per day (public holidays named), adjustment and its
comment, teaching, administration, the whole and the target; the month's and the running balance;
all colleagues' months in a list; e-mail and print the sheet; approvals (also made in the
Klassenbuch).

## What the screens teach the workspace

1. **Work lists are what the team lives in.** "New this week", "ending", "staying after the course",
   "only CASA flats" are buttons that change what a screen shows. The workspace's lists need the same
   views, named in the team's words.
2. **The log with a tick.** A dated line, a colleague, and a "Kontrolle" box another colleague ticks —
   notes with an acknowledgement. The workspace's notes and history do the first half.
3. **Spotting the same person** is done by eye in a sorted list beside every record. The workspace
   asks at intake instead (`findDuplicateCandidates`).
4. **Tick boxes that allow several values** are the source of multi-value fields. A choice that is one
   thing is one value.
5. **One giant form** per record is the habit to leave behind: a record page with sections, each
   change in a dialog, as the workspace already does.
