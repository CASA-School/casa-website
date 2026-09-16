# Kursplanung — the course-planning board

`/admin/kursplanung` · management-only module · served in the shell's focus mode

Read this before touching `src/app/(admin)/admin/(focus)/kursplanung`, `src/lib/admin/kursplanung` or
migration 0014. It is the handover from the standalone prototype to this repository (2026-09-16); the
prototype stays the design lab at https://claude.ai/artifact/6bXcwpNJZxPhQH8Cwqj8G7 and its folder
`~/Tasks/10-active/work/CASA - Various Tasks/casa-kursplanung-puzzle/` (notes on the Excel, the feedback
history, the port plan).

---

## The job

CASA plans its intensive courses month by month. Course starts alternate between the morning shift
(Mo–Fr, 09:00–12:30) and the afternoon shift (Mo–Do, 13:00–17:30): in one month the morning carries
the new `.1` courses while the afternoon continues its `.2` courses, in the next month it is the other
way round. A full-time teacher is split across two courses like a puzzle piece — Mo–Mi in one, Do–Fr in
the other — and a course should keep its pair from `.1` into `.2`. The daily problem is the change:
someone falls ill or is on leave, and the cover must not already be teaching in that shift, must not
exceed their weekly days, and should not scatter a course over many faces.

Until now this lived in a spreadsheet (`Kursplanung`, one column per course group, one row per
weekday, a first name per cell, yellow for a substitute). The board keeps that mental model and adds
the rules the planners kept in their heads.

## The board (product rules — these came from five rejected versions, keep them)

1. **It is a puzzle, not a form.** Teachers are *pieces*; a piece's blocks are the days the person still
   has in the week. Course groups are *columns* of day sockets coloured by level; a piece fits where its
   level matches the column. A used-up piece leaves the tray.
2. **Colour has meaning only.** Level colour on sockets and placed pieces · **yellow = Vertretung**
   (someone from the other shift, or marked by hand) · red ring + reason on the piece = conflict · orange
   dashed = level not listed but allowed · dashed socket = open · italic with `?` = not yet confirmed.
   **Never a colour per person.**
3. **Little on screen; explanation where the action is.** A dark strip explains pick-up mode ("Alina in
   der Hand · noch 3 Tage · passt in B1+.2, B2.2 · Fach anklicken"); the piece menu is rows of *action +
   consequence* ("Als Vertretung markieren — Teil wird gelb: Janek springt hier nur ein"). No dashboards,
   no explanatory paragraphs.
4. **Real people, real problems.** No fabricated absences or conflicts about real teachers. The demo gap
   is a real one (a teacher released from duty).
5. **Its own look, not the workspace's density.** Manrope (now the workspace typeface too), soft cards,
   level tints. It is served in the shell's focus mode — icon rail, no 1180px measure — because thirteen
   columns plus the tray need the width. Same gate, same tokens, same way back.

Interactions, all of them: drag a piece from the tray onto a socket (it lays down as many consecutive
days as it has left, `Mo–Mi` in one move); or click the piece (pick-up mode) and click a socket; click an
open socket for a dropdown grouped by fit (Stamm/Vorschlag first, then free, other level, other shift as
substitute, unavailable with reason); click a placed piece for its actions (Vertretung, unbestätigt,
extend to the group's free days, details, remove, and `Ersatz finden` when the teacher has since become
absent); drag the handle to change a piece's days; drag a piece to another column to move it; drag it
into another week to copy it; ⌘Z / Rückgängig; "Woche übernehmen →" copies the active week forward.

## Data (migration 0014)

| Table | One row is | Notes |
| --- | --- | --- |
| `teachers` | a member of the teaching staff | NOT `staff_users`. Rules that shape the piece: `shifts`, `days_per_week`, `weekdays`, `levels`. `filemaker_staff_id`. |
| `course_groups` | one parallel group of a level in a planning month | `phase` '1'/'2', `group_index`, `registrations`, the pair `teacher_first`/`teacher_second`, `room_id`, `filemaker_course_id` (bridge §7 item 6). |
| `plan_assignments` | one teacher on one group on one date | `is_substitute` (yellow), `is_tentative` (`?`), `changed_by`. Unique per (group, date). |
| `teacher_absences` | one teacher on one date | reason in Urlaub · Krank · Fortbildung · Freistellung · Elternzeit · Sonstiges. |

Audit: `staff_activity` via `logActivity`, entity `kursplanung`.

A planning month starts on the Monday of the week the 1st falls in, or the following Monday when the
1st is a weekend day, and runs until the next month starts — four weeks, sometimes five (July 2026;
October 2026, because 1 November is a Sunday). `src/lib/admin/kursplanung/weeks.ts`, tested.

## Code map

```
src/lib/admin/kursplanung/
  types.ts    vocabulary: shifts, levels, weekdays, reasons, Teacher / CourseGroup / Assignment / Absence
  weeks.ts    planning weeks, ISO week, weekday helpers, German month label
  fit.ts      remainingDays · fit (may this piece land here?) · span (how many days from here)
  rules.ts    analysePlan → every violation, per tile and per week
  pairs.ts    assignmentsFromPairs → fill a month from the groups' pairs
  week.ts     validateWeekAssignments → what the server accepts for one shift-week
  forms.ts    parseTeacherForm / parseGroupForm → what the dialogs may write (tested)
  repo.ts     reads (server-only) and replaceWeekAssignments
src/app/(admin)/admin/(focus)/
  layout.tsx            the gate in focus mode (same requireStaff as the workspace)
  kursplanung/layout.tsx   requireModule('kursplanung')
  kursplanung/page.tsx     loads the month, renders the board
  kursplanung/actions.ts   saveWeekAction — the one write, whole shift-week at a time
  kursplanung/board.tsx    the board ('use client'), board.module.css its look
  kursplanung/tabs.tsx     Puzzle · Kurse · Lehrkräfte, month travels along; month-picker.tsx chooses the month
  kursplanung/kurse/       groups per shift with their pairs; add / remove (empty only) / fill from pairs
  kursplanung/lehrkraefte/ the teaching staff; Details opens the dialog (?teacher=<id> opens it on arrival)
  kursplanung/teacher-form.tsx, group-form.tsx   the forms inside FormDialog; parsed by lib/admin/kursplanung/forms.ts
scripts/kursplanung/import-bridge.mjs   loads the tables from the analytics bridge's JSON
```

**One write.** Every board mutation (place, remove, move, resize, flags, copy week, undo) is computed
on the client with the same pure functions the server uses, then the whole assignment set of that
shift-week is sent to `saveWeekAction`, which validates it (module `edit`, zod, groups of that
month/shift, course days of that week, active teachers) and replaces the week in one transaction. Undo
is therefore just "save the previous set". The client also sends the week as it last saw it (`base`); when the
database no longer matches, the save is refused as stale and the board offers a reload instead of overwriting a
colleague's change.

## Plan of record

| PR | Content | Status |
| --- | --- | --- |
| 1 | module, focus-mode shell, migration 0014, domain + tests, landing page, import script, Manrope | open (#29) |
| 2 | the board: week view, tray, pick-up mode, drag & drop, handle, menus, undo, copy week, save action | open (#30) |
| 3 | teacher dialog (rules + absences), Kurse (pairs, group count, registrations), Lehrkräfte list | open (#31) |
| 4 | Monat view (all weeks stacked), `Ersatz finden`, month selection and the next month from this one, stale-write check, e2e with a real session | open (#32) |

Then the FileMaker side, in the order `docs/FILEMAKER_BRIDGE.md` §7 sets: read the four layouts the
analytics bridge already exports (`Course_API`, `SingleDateCourse_API`, `SingleDayStaff`, `StaffMember`)
into these tables; write back only after a `WebIntake` account exists.

## Testing

`e2e/kursplanung.spec.ts` runs only with `DATABASE_URL` and an owner account: it opens a session the way
`scripts/admin/check-routes.mjs` does — a session row plus the cookie, no password — and drives the board and the
two screens. Three tests: a placed piece survives a reload and is taken back through the piece menu; a save against a
week a colleague changed meanwhile (a row inserted straight into the database after the page loaded) is refused, undone
on the board, writes nothing, and goes through after `Neu laden`; Kurse renders and the teacher dialog opens from
`?teacher=`. Open sockets carry `data-group`, `data-week`, `data-date` and `data-row`, pieces `data-group`, `data-week`
and `data-row` — those are the test hooks, and the resize handle uses the same attributes. Every test removes what it
wrote (anything in the touched groups newer than its start), so the plan is left as found. Run it with its own port:
`E2E_PORT=3017 npx playwright test e2e/kursplanung.spec.ts`. `npm run admin:check` covers the three routes.

The first run of that spec found a defect the unit tests could not: `staff_activity.entity_id` is a uuid column, and
the week save logged `month|shift|weekStart` as the entity id — the transaction had already committed, the action then
threw, and the board sat on "speichert …" while the database had the change. Activity rows for a shift-week or a month
now carry `null` there and the identifiers in `detail`; a save that throws is treated on the board like a stale one
(reverted locally, reload offered) because the database may hold it.

## Open questions for the planners

- Is a teacher's weekly quota in **days** (as built) or in Unterrichtseinheiten?
- Does a Doppelschicht (morning and afternoon on one day) count as one day or two?
- At which registration count is a level split into two groups? (The board suggests one group per 16.)
- Does October 2026 really run five weeks (to 30.10.), with November starting on the 2nd?
- The derived rule table per teacher (shift, days, weekdays, levels) needs their confirmation; it is
  editable in the tool. FileMaker's `sessions`/`levels` fields were not used because they contradict the sheet.
