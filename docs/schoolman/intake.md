# Intake — enquiries, pre-bookings, the waiting list, tests, offers

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only. Scripts and
screens come from the DDR (`output/filemaker/ddr_scripts_layouts.md`).

## The tables

| Table | Rows | New in 2026 | What a row is |
| --- | ---: | ---: | --- |
| `Contact` | 5,072 | 837 | Someone got in touch — always created together with a `PreBooking` |
| `PreBooking` | 6,081 | 1,209 | What they want: course type, level, time of day, course, visa |
| `WaitingRoom` | 1,958 | 575 | The pre-booking is on the waiting list |
| `TestStudent` | 5,940 | 911 | A test result — placement *and* progress tests |
| `Offer` | 397 | 74 | An offer letter (organisations, groups, some learners) |
| `DateOffer` | 5,026 | 728 | One offered item on it: a course (2,069), an accommodation (252), an internship (4) |
| `Source` | 913 | 0 | "How did you hear about us" — unused since 2023 |

## How records are made — every step is a button

- **`NewContact`** creates a `Contact` and its `PreBooking`, linked both ways. `ExtensionContact`
  does the same for someone already known.
- From the pre-booking screen, one button per detail: `NewPerson_PreBooking`, `NewEmail_…`,
  `NewPhone_…`, `NewAddress_…`, `NewInstitution_…`, `NewTest_PreBooking`.
- **`Go_Contact_WaitingRoom`** puts it on the waiting list.
- Offers: `NewOffer_PreBooking`, `NewDateOffer…`. Letters at this stage: the enrolment form and the
  down-payment letter.
- **No script reads the website.** An online enquiry reaches SchoolMan by hand, or through the
  Data API from an outside tool.

The team works in the `Contact`, `PreBooking`, `PreBooking_List` and `WaitingRoom` screens.

## What the rows actually hold

These are **link records**: almost every filled field is an id pointing somewhere else. `Contact`
has 68 stored fields; apart from links, the only text is a comment field, filled on almost none.

| Fact | Where | Filled |
| --- | --- | --- |
| Who | `PreBooking._ID_Person` | 100% |
| What kind of course | `_ID_CourseTypeReference` | 73% |
| Level | `_ID_Level` | 70% |
| Time of day | `_ID_DayTimeReference` | 63% |
| A specific course | `_ID_Course` | 52% |
| Visa needed | `_ID_VisaRequired`: yes 1,136 · no 1,301 | 40% |
| Business line | `_ID_Platform`: intensive 1,238 · evening 516 · exam 20 | 29% |
| How they got in touch | `Contact._ID_TypeContactReference` — ids and typed labels mixed (`Email` 420, `1` 365, `Besuch im Büro` 133, `1\r3` …) | 20% |

**Status is the default.** `PreBooking._ID_StatusPreBooking`: 4 (*u.B.*, the auto-entered default)
on 4,896 of 6,081; *nein* 620; *ja* 561. `Contact._ID_StatusContact`: 4 on 3,600 of 5,072. Nobody
maintains it — LESSONS §4.6.

## Tests

`TestStudent` holds every test, not only placement. `_ID_LevelSchool` (the level reached) is on 95%;
`Result` on 92%, mostly as free text with the percentage in the comment (LESSONS §5). The kind of
test (`_ID_TestReference`) is on only 21%: of those, 1,065 are the *Netzwerk neu* online test; the
rest are *Kontext*, *Aspekte*, telc B2, grammar tests. The list also names level-end, half-level and
lesson-end tests, so the same table records progress. 29% have no test date.

## In the workspace today

`enquiries`, `course_registrations`, `exam_registrations` and the placement tables receive new
intake from the website, with a status and an owner — the part FileMaker never maintained. There is
no waiting list yet, and offers have their own module.

## For the bridge

- The intake history is mostly links and default statuses. Reading it across would bring little
  that is true; what is worth having is **the person and what they last asked for**, read when the
  same person enquires again.
- A test result is worth reading per learner (the level reached and the date), not the table.

## Open questions for the team

1. Is the waiting list still used the way the screen suggests (575 new this year)?
2. Which test results matter later — the placement level only, or the progress tests too?
