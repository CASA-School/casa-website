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

**The status** (`_ID_EnrolmentDone`), as the team uses it (Rahman, 2026-10-15):

| Value | Meaning | Bookings |
| --- | --- | ---: |
| *ja* (green) | Right for the course and paid | 7,279 |
| *u.B.* — *unter Beobachtung* | Something is open: a visa needed and not paid yet, the level not right, something missing | 6,893 |
| *nein* | Cancelled or to be deleted — in practice the storno | 5,175 |
| *???* | What a new booking starts with (LESSONS §4.2) | 3,135 |
| *storno* | The official cancel value, hardly used | 5 |

So the status mixes three questions — is the learner placed right, has money arrived, is anything
missing — into one value, and *nein* does the work of *storno*. `_ID_StatusBooking` is never filled.
The learner's `_ID_StatusStudent` (Runner, Unicorn, LastDance, Rookie) is on 100%.

## In the workspace today

`bookings` and `booking_periods` (migration 0010) model a booking with periods; one local booking.
The business line belongs on the course type, not in a table per line.

## For the bridge

- Worth reading per learner: their bookings — course, level, the periods' dates, the status — when
  a colleague opens that person in the workspace. Not the text summaries, balances or copies.
- The booking that is running now is the one the team needs first; history can stay in SchoolMan
  until someone asks for it.

## Open questions for the team

1. When does a booking leave *???* — who sets it, and is *u.B.* ever resolved without a colleague?
2. What do Runner, Unicorn, LastDance and Rookie mean?
3. When is `Agreement` written (250 this year), and who reads it?
