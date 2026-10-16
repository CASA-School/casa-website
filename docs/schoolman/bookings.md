# Bookings — `Booking`, the business lines, `DateBooking`, `ID_Student`

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only.

## The tables

| Table | Rows | New in 2026 | What a row is |
| --- | ---: | ---: | --- |
| `Booking` | 22,488 | 2,915 | One booking of one learner |
| `InternationalAirport` | 15,176 | 1,964 | The booking's record on the **intensive-course** line |
| `CentralStation` | 4,927 | 547 | … on the evening, special and company line |
| `NationalAirport` | 2,361 | 363 | … on the exam line |
| `BusStop` | 36 | 36 | … on the closed-group line (started 2026) |
| `DateBooking` | 20,206 | 2,539 | A booked period: start and end date, course, level, time of day |
| `ID_Student` | 7,055 | 835 | The learner number, made when a learner first books |
| `WeekOfCourse` | 10,392 | 1 | A course week — stopped in 2025 |
| `Group` | 52 | 11 | A group visit (title, number of students and teachers) |
| `Agreement` | 664 | 250 | A learning agreement on a booking (level, recommendation, text module) |

All but four business-line records point at a booking that exists. Those tables are **empty shells** —
`InternationalAirport` has 33 stored fields and holds nothing but its links back to the booking and
the person. "The platform" is a course line, not a kind of booking.

## How a booking is made

**`Go_PreBooking_Booking.Parameter`** (145 steps, button on `Contact`, `PreBooking`, `WaitingRoom`;
the parameter is the business line) does the conversion in six stages: refuse if already booked;
mark contact and pre-booking complete; read what the pre-booking holds; create the `ID_Student` and
the `Booking`; write the new ids back onto the enquiry's email, phone, work-log, test and letter
records; create the business-line record and, for intensive and evening courses, the `DateBooking`.

**It uses four variables it never sets** (`$_ID_Client`, `$_StartDateCourse`, `$_EndDateCourse`,
`$_ID_Local` — checked in the DDR). So the client id is written empty and a dialog asks staff to type
it, and the booked period gets its dates only later, when a course is chosen on the booking.

Other ways in: `NewBookingStudent.Parameter_Booking` (directly, no enquiry), `NewBookingStudent_Course`
(from a course), `ExtensionStudent.Duplicate_Booking` (another course for the same learner),
`ExtensionGroup.Parameter_Booking` (another learner like this one), `Go_Booking_<Line>` (the same
learner on another line).

The team works in `Booking` (13 screens on it), the business-line screens, and `DateBooking`.

## What the rows hold

`Booking` has 291 fields, 212 stored. What is a fact:

| Fact | Field | Filled |
| --- | --- | --- |
| Learner, person, business line | `_ID_Student`, `_ID_Person`, `_ID_Platform` | 100% |
| Course type, language, level, course | `_ID_CourseTypeReference`, `_ID_CourseLanguage`, `_ID_Level`, `_ID_Course` | 89–93% |
| Prolonged (a follow-on booking) | `_ID_Prolongation` | 84% |
| Time of day | `_ID_DayTimeReference` | 81% |
| Price set | `_ID_PriceCourseSet` | 73% |
| The dates | on `DateBooking`: `ZStartDate`, `ZEndDate` | 100% |

What is **not** a fact but stored as one:

- **Text summaries** written by scripts — `ScheduleBooking*` (six versions, 35–99%), the class-book
  line, the invoice line, the certificate text. `SetScheduleBooking_OnServer` rewrites them, so they
  go stale between runs.
- **Running balances** — `Balance.Gross/Net/Com.Number` on half the bookings.
- **Counts** — presence, absence, illness, excuse counts copied onto the booking.
- **Copies** of the learner on every booked period: `DateBooking` carries the first name, surname,
  gender and birth date of the person (100%, 98%) — a copy that goes stale when the person changes.
- 31 constant fields (`_3`, `_4` … holding a fixed number to draw a relationship).

**The status** (`_ID_EnrolmentDone`) — four values the team uses, each a colour on the screen
(Rahman, 2026-10-16):

| Value | Colour | Meaning | Bookings |
| --- | --- | --- | ---: |
| *ja* | green | Everything is good | 7,279 |
| *u.B.* — *unter Beobachtung* | yellow | Under observation — the learner may not have the level, and so on | 6,893 |
| *???* | grey | **Not paid** — and what every new booking starts with | 3,135 |
| *nein* | red | It did not work out — cancelled, no visa, not coming | 5,175 |

The rest of the list (*storno*, *Undefined*) is not used. Whoever has the learner, or works on them,
changes the status (Rahman, 2026-10-15): nobody owns it, and nothing records who changed it or why.
`_ID_StatusBooking` is never filled. The learner's `_ID_StatusStudent` is on 100% and not important (Rahman): *Rookie* has just started,
*Runner* is in a course now, *LastDance* is in their last course, *Unicorn* probably finished. The
workspace can work it out from the bookings' dates.

**The bookings at *???*, read against the money** *(live, 2026-10-16)* — 3,139, each compared with its
own charges (`CostDetail`) and payments (`PaymentIn`):

| Where the booking stands | At *???* | Paid in full | Partly paid | Nothing paid | Charges net to zero |
| --- | ---: | ---: | ---: | ---: | ---: |
| The course has ended | 1,703 | **758** | 74 | 37 | 834 |
| No course dates | 734 | 487 | 2 | 10 | 235 |
| Running now or starting later | 702 | **380** | 113 | 193 | 16 |

So *???* is meant to say "not paid", but most bookings that still carry it **have been paid in full** —
the money came in and nobody turned the status green. Of the ended ones that were charged, 87% are
paid. ("Charges net to zero" is a booking never charged, or one cancelled with reversing lines.) About
one booking in ten of every past year (2019–2025) never left *???*; all 36 closed-group bookings of
2026 are at it. For comparison, *ja* bookings that have ended are 92% paid in full.

**What it means for the workspace** *(a proposal)*. The one status answers two questions — *has the
money come in* and *is the learner all right* — and the first goes stale because a colleague has to
remember to change it. The workspace's booking already has a lifecycle (`reserved`, `confirmed`,
`completed`, `cancelled`, migration 0010) and already computes what is still owed. What it would add:

- **Paid follows from the money**, never typed: paid in full, or not yet — shown grey as **unklar**
  (Rahman's word for *???*) until the charges are covered.
- **The learner's standing** is the colleague's call, in the team's colours: green *in Ordnung*,
  yellow *unter Beobachtung* with its reason (level, visa, …), red *nein* (cancelled, no visa, not
  coming — which is the lifecycle's `cancelled`). Each change goes into the history with who and why.

The bridge reads a FileMaker booking's payment state from its charges and payments, never from *???*.

## In the workspace today

`bookings` and `booking_periods` (migration 0010) model a booking with periods; one local booking.
The business line belongs on the course type, not in a table per line.

## For the bridge

- Worth reading per learner: their bookings — course, level, the periods' dates, the status — when
  a colleague opens that person in the workspace. Not the text summaries, balances or copies.
- The booking that is running now is the one the team needs first; history can stay in SchoolMan
  until someone asks for it.

## Learning agreements

A learning agreement (`Agreement`) is made when a learner has trouble in a course — the level is below
the course's, they come late, they are often absent. Today the teacher writes it on paper, teacher and
learner sign it, and someone in the office types it into SchoolMan and sends it (Rahman, 2026-10-16).
**The plan:** the teacher creates it in the Klassenbuch and sends it to the learner; once the workspace
has a bridge to the Klassenbuch, it shows the agreement on the learner's page (`klassenbuch.md`).
