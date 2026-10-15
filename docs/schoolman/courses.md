# Courses, exams, teaching and attendance

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only. "Per year"
counts the table's own date (the lesson, the week, the period), not the creation date — several of
these tables are generated ahead, so their creation dates mislead.

## The tables

| Table | Rows | Per year (own date) | What a row is |
| --- | ---: | --- | --- |
| `Course` | 1,331 | about 190–260 new a year | One run of a course: type, line, level, time of day, weekdays, place, teacher, room, dates |
| `DateCourse` | 1,338 | with the course | The course's period and its weekday pattern |
| `DayTime` | 1,338 | with the course | The course's hours and lessons a day |
| `Session`, `LevelStep` | 116, 200 | 28 / 48 new in 2026 | The term plan: terms and the level steps (A1.1 … C1.3) run in each |
| `WeekOfCourse` | 10,392 | 1,811 in 2026; planned into 2028 | A course week (teacher and room shown per week) |
| `SingleDateCourse` | 34,016 | about 6,000 lessons a year; 3,054 already planned for 2027 | **One lesson**: date, hours, teacher, room, content |
| `WeekDay` | 11,807 | — | A teacher's weekday on a course (who teaches which day) |
| `SingleDateStudent` | 70,732 | 67,524 in 2026, about 800 a year before | **One learner at one lesson**: present or absent, why, minutes late |
| `Exam` | 134 | 17 new in 2026 | An exam date: TestDaF, telc B2, C1 Hochschule, TestAS; places 94% |
| `SingleDateExam` | 270 | 34 new in 2026 | A part of an exam (oral, written) on its day |
| `SingleDateOccupancy` | 10,133 | grew from 2024 | A room taken on a day: teaching, exam, event, rent, tandem |
| `Classroom` | 29 | — | The rooms — already ported (`rooms`, migration 0008) |

## How they are made

- A course is made by **copying the last one** (`DuplicateCourse_Course`, `NewCourseGroup_Group`),
  then its lessons, weeks and room days are generated from its calendar
  (`SetSingleDateCourse.Week.ImportCalendar_Course`, `NewCourseDate.NewOccupancy_Course`).
- A learner's lesson rows are **imported from the course** into `SingleDateStudent` when they are
  booked onto it (`ImportSingleDateStudent_DateBooking`); a presumed nightly job
  (`MakeSingleDateStudent`) makes today's rows for every course.
- Exams are typed in by hand (no creating script); the learner's exam day is a `SingleDateStudent`
  row made from the exam (`NewSingleDateExamStudent_Booking_NationalAirport`).

## What the rows hold

**Course** — the facts are the links (type, line, level, time of day, location 98%, teacher 83%,
room 77%) and the dates (99%). Capacity is three fields that disagree (`CapStudent` 73%, `CapGroup`
42%, `MaxStudent` 7%). The price is on 30% of courses (`CoursePrice`); the rest is priced by the
scripts (`docs/FILEMAKER_LESSONS.md` §11.7). Six stored schedule texts (`ScheduleCourse*`) repeat what
the links say.

**Attendance** — since 2026 the class book lives here: present 59,144, absent 9,287; a reason on
639 absences (ill 470, excused 156, unexcused 13); minutes late on 71% of rows. Each row also
carries copies of the teacher's name and the learner's gender.

## In the workspace today

`course_instances`, `course_groups`, `course_types`, `levels`, `day_times`, `exam_sessions`,
`exam_types`, `materials`, `rooms`, `plan_assignments` (Kursplanung). Course terms and exam dates
are read from SchoolMan into seeds (`db/seeds/0006`). There are no lesson rows, no attendance and no
room-by-day records — Kursplanung plans cohorts, not days.

## For the bridge

- Courses and exam dates for the next twelve months are already read (the seeds); the bridge could
  do the same on a schedule instead of by hand.
- Attendance is the class book. Whether the workspace ever shows it — and whether it should come
  from SchoolMan or from where teachers record it — is a decision, not a bridge task.

## Open questions for the team

1. Where do teachers record attendance in 2026 — on the `SingleDateStudent` screens, or somewhere
   that writes into them?
2. Which capacity is the real one on a course?
