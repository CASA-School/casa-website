# The Klassenbuch — the teachers' app that writes into SchoolMan

Part of the SchoolMan study (`README.md`). Read from the Klassenbuch repository
(`CASA-School/casa-klassenbuch`, local `~/Code/local/casa-klassenbuch`, branch `next-migration`):
its FileMaker contract (`web/docs/filemaker-contract.md`) and migration plan (`MIGRATION-PLAN.md`),
2026-10-15. Nothing in that repository was changed.

## What it is

The teachers' dashboard at `klassenbuch.casa-bremen.de`: the class book (lesson content, homework,
attendance), the course and student pages, test results, and the monthly time sheet. A Symfony/PHP
app on the office's Proxmox server (CT 103, `10.0.60.11`), rebuilt in Next.js on the same server
(planned switch 2026-10-10, the Symfony app kept as the fallback). It is a separate
product from the workspace and from the student app.

## How it talks to SchoolMan

Through the **FileMaker Data API**, signed in as **the teacher's own FileMaker account** — no shared
account. It finds and updates records on ten layouts; it never creates or deletes a FileMaker record.

| Layout | Reads | Writes |
| --- | ---: | --- |
| `SingleDateCourse_API` — one class-book day | 12 | lesson content, next steps, homework, comment, a flag |
| `SingleDateStudent_API` / `_Malte` — one attendance row | 10 | present 1 / absent 2, excuse (ill, excused, unexcused), minutes late, comment, a flag |
| `Course_API` | 14 | the course note (`CommentOnCourse`) |
| `Booking_API` | 21 | level confirmed and level approved (yes / no / unsure), the booking note, the **final note** (weighted average of the marks) |
| `Student_API` | 8 | the learner's nickname |
| `SingleMonthStaff_Form_Malte` / `SingleDayStaff_Malte` — the time sheet | 25 | the month approved, by whom, when; per day an adjustment and its comment |
| `Agreement` (learning agreements), `StaffMember_API` | 11 | — |

In all, 101 fields read and 21 written. **The test marks themselves are not in FileMaker** — they live
in the Klassenbuch's own database (MariaDB, moving to Postgres), and only the average goes back as
the final note.

## What it explains about SchoolMan

- **Attendance in 2026.** `SingleDateStudent` holds 67,524 rows for 2026 against about 800 a year
  before: the class book is used daily since the Klassenbuch went live. A FileMaker server schedule
  (`MakeSingleDateStudent`) creates each day's attendance rows early in the morning, at "present";
  the teacher changes them.
- **Lesson content** on `SingleDateCourse` is written by teachers through it.
- **Levels on bookings.** `_ID_LevelConfirmed` / `_ID_LevelApproved` are set by teachers here; their
  emptiness on older bookings (67% / 80%, LESSONS §4.6) predates the app.
- **Staff time** — the monthly approval and the daily adjustments are entered here; the days
  themselves are generated in SchoolMan.

## Plans already made there

- *The class book's history outside FileMaker* (Rahman, 2026-10-14, to take up again): FileMaker's
  backups off the Mac mini; a nightly copy of courses, class days and attendance into the
  Klassenbuch's Postgres through a **read-only FileMaker account** for the server; and a journal of
  every save at the moment it is made.
- The app's own database moves to Postgres last, after the switch.

## A bridge to the Klassenbuch (planned)

Rahman, 2026-10-16: a direct bridge between the workspace and the Klassenbuch comes "at some point".
It brings the progress tests and the learning agreements (which teachers will create in the
Klassenbuch instead of on paper) onto the learner's page in the workspace.

## What it means for the workspace

- Attendance, lesson content, marks and time sheets are **the Klassenbuch's job**. The workspace
  does not rebuild them; when "everything moves", their data leaves SchoolMan together with the
  Klassenbuch, which then reads and writes its own store instead.
- The **read-only server account** the Klassenbuch plan needs is the same kind of account the
  workspace's bridge needs (`docs/FILEMAKER_BRIDGE.md`). One account per system, each with only the
  layouts it reads, is the clean shape — not one shared account.
- A learner's level confirmed by a teacher, and their attendance rate, are facts a colleague in the
  workspace would want beside a booking — read from wherever the Klassenbuch keeps them.
