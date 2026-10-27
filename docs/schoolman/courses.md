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

## Levels on a course (2026-10-17)

`LevelStepReference` is a stale text copy and does not say the level: of the courses running or
ahead, an evening B2 course reads `B2.1` or `A1.1` alike, an intensive start's six courses `A1.1`
six times. The level is the band (`_ID_Level`, `LevelReferenceSchool`: an intensive course runs it from
the first half) and, for an evening term, the step `_ID_LevelStepReference` points at (`A2.2`, matched on
`levels.filemaker_level_step_id`). `LevelShort` and `LevelShown` are their text copies; since 2026-10-27
the reader takes the numbers (the same level on every course of the copy).
A level with parallel groups appears as two or three courses, or as one with 28 or 42 places.

## Also brought across (2026-10-27, migration 0093)

- **Where it runs** (`_ID_Location`: Dobben, in-house, in-house online, an online group, one-to-one online):
  `courses.location_id` → `locations` (184 courses), on the course's head.
- **The sitting an exam preparation leads to** (`_ID_Exam`, on the preparation courses only):
  `courses.exam_session_id` (22), set by the exams step; the course names the sitting, the sitting its
  preparation.
- **The teacher's note** (`CommentOnCourse`, written by the Klassenbuch): a note on the course (63), in the
  course page's „Notizen".
- **An older title** (`Supplement`, a module's name or a company's, on a one-to-one course a person's) where
  `CourseTitle` is empty — on the workspace's course only, never on the website (3).
- **Every exam sitting ahead** (20), not only those a learner of the sample booked: linked to the same exam
  that day here (4) or made as a draft with SchoolMan's places (2).
- **CASA's closures** as SchoolMan's calendar keeps them (`SingleDayCalendar._ID_Holiday` without the legal
  holidays): `school_closures`, 15 ranges from Easter 2022 to the turn of 2030, weekends and legal holidays
  inside them included. 2026's two match `src/config/school-closures.ts` exactly; SchoolMan also has Easter
  2027 (22.–29.03.; 30.03.–02.04. are marked „nein"), Christmas 2027 and Easter 2028. The website and the
  workspace still read the config: who keeps the closures is Rahman's decision.

## In the workspace today

`course_instances`, `courses` (one per level of a start, 0041), `course_groups`, `course_types`,
`levels`, `day_times`, `exam_sessions`, `exam_types`, `materials`, `rooms`. Course terms and exam
dates are read from SchoolMan into seeds (`db/seeds/0006`). Since 2026-10-17 lesson days too:
`course_week_plans` is `WeekDay`, `course_days` is `SingleDateCourse` with the room it replaced
from `SingleDateOccupancy`, and Kursplanung's board plans the same rows
(`read_lesson_days.py` + `import-lesson-days.mjs`, docs/ADMIN_WORKSPACE.md §Lesson days).
No attendance: that stays the Klassenbuch's.

**Lesson-day facts (read 2026-10-17).** Weekdays are numbered 1 Sunday … 7 Saturday
(`DayNameReference`). A day's `_ID_Particularity` is 20 Vertretung, 21 Zusammenlegung, 22
Verschiebung or 23 Ausfall (`SelectionDetail`); since August 2026: 120, 42, 0 and 1.
`_ID_PersonSubstituted` is a staff number (1,954 of 2,007). A day's room is on the day for a third
of days and otherwise only on its room-calendar row; `_ID_ClassroomSubstituted` names the same room
in 93 of 102 cases. `_ID_Holiday` marks the 21 days generated inside the Easter 2027 closure.

## For the bridge

- Courses and exam dates for the next twelve months are already read (the seeds); the bridge could
  do the same on a schedule instead of by hand.
- Attendance is the class book. Whether the workspace ever shows it — and whether it should come
  from SchoolMan or from where teachers record it — is a decision, not a bridge task.

## Open questions for the team

Answered: teachers record attendance in the Klassenbuch, which writes it into `SingleDateStudent`
(`klassenbuch.md`).

1. Which capacity is the real one on a course?
