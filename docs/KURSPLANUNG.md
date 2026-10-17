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
   der Hand · noch 3 Tage · passt in B1+.2, B2.2 · Fach anklicken"). The piece menu is one line per
   action and nothing under it — the rows with a consequence sentence each were rejected on 2026-09-16
   ("too much information, keep only the main headings"); the header carries the state (`· Vertretung`,
   `· unbestätigt`). A menu is measured after it opens and pulled back inside the viewport; scrolling
   closes it. No dashboards, no explanatory paragraphs.
4. **Real people, real problems.** No fabricated absences or conflicts about real teachers. The demo gap
   is a real one (a teacher released from duty).
5. **Its own look, not the workspace's density — the prototype's, 1:1.** Manrope for everything
   including headings (the workspace's Playfair titles, eyebrow and bordered tabs inside the module were
   rejected on 2026-09-16): a 19px title row with the month dropdown, soft pill tabs and the undo / copy
   buttons; `.sel` dropdowns; pill toggles in the dialog; small uppercase labels on tables and sections —
   that last one is a deliberate exception to the workspace's "labels, not eyebrows" standard, confined to
   this module. Mechanics: `.casa-workspace-focus :is(h1,h2,h3)` in globals.css overrides the workspace
   heading face; the module's `--pz-*` tokens sit on `.casa-workspace` (the body) because the dialog is
   portalled there; the dialog title gets its face through FormDialog's `titleClassName`; everything else
   is `ui.module.css`. Served in the shell's focus mode — icon rail, no 1180px measure — because thirteen
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
| `teachers` → `staff_members` (0039) | a colleague on the staff register; the board's teachers are those with the role Unterricht, or named in the plan | NOT `staff_users` (it may link one). Rules that shape the piece: `shifts`, `days_per_week`, `weekdays`, `levels`. The name is the person's (`people`), employed or freelance the contract that runs today (`staff_contracts`). `filemaker_staff_id`. |
| `course_groups` | one parallel group of a level in a planning month | `phase` '1'/'2', `group_index`, `registrations`, the pair `teacher_first`/`teacher_second`, `room_id`, `filemaker_course_id` (bridge §7 item 6). |
| `plan_assignments` | one teacher on one group on one date | `is_substitute` (yellow), `is_tentative` (`?`), `changed_by`. Unique per (group, date). |
| `teacher_absences` → `staff_absences` (0039) | one colleague on one date | reason in Urlaub · Krank · Fortbildung · Freistellung · Elternzeit · Sonstiges. Entered here or on the colleague's page. |

Audit: `staff_activity` via `logActivity`, entity `kursplanung`.

A planning month starts on the Monday of the week the 1st falls in, or the following Monday when the
1st is a weekend day, and runs until the next month starts — four weeks, sometimes five (July 2026;
October 2026, because 1 November is a Sunday). `src/lib/admin/kursplanung/weeks.ts`, tested.

## The staff register (2026-10-17, migration 0039)

The board's teacher list is no longer its own table: a teacher is a colleague on the staff register
(`/admin/staff`, docs/ADMIN_WORKSPACE.md §Staff) with the role Unterricht. Their planning rules are
edited here (Details) or on their page (Unterricht); their name, contact, contract and absences live
on the register. „Lehrkraft anlegen" on Lehrkräfte creates the colleague with the role ticked and
comes back with their Details open (needs `staff` at `edit` as well). A name on Lehrkräfte opens the
colleague's page for those who hold `staff`. `scripts/kursplanung/import-bridge.mjs` writes a person,
a staff row, the role and the contract for a teacher it does not know.

## Course starts (2026-10-17)

A course start's level group and a Kursplanung group are the same class. Nothing is stored to say
so; the rule (`course-link.ts`, tested) is:

- An **intensive** start (course type format `intensive`) opens the planning month two weeks after its
  first day — 31 Aug → September, 26 Oct → November (October runs five weeks), 4 Jan → January.
- A level code names the board's level and phase: `B1.1` → B1 phase 1, `B1+.2` → B1+ phase 2. C1H has
  no level code and is not linked.
- A `.1` level is the start's own class: phase 1 in its first month, in the start's shift (its session,
  or its hours), and the same group (shift, level, index) as phase 2 in the next month. A `.2` level
  on a start is a joiner: they sit in that month's phase-2 class, the previous start's.

What follows from it (`link.ts`):

- **The course start's page** has „Unterricht": per class, who teaches it in each of its two months —
  the teachers on the board, most days first, a substitute marked; the pair when nothing is laid down
  yet. Read only: who teaches is changed on the board.
- **Groups count in both places.** A start's places for a level are its groups × places per group, and
  its groups are the larger of the start's own number and the board's (`waitlist.ts`, `PLANNED`).
  „Weitere Gruppe eröffnen" on a start adds the group on the board too, in the start's shift, and in
  the next month when the board already has it; a month the board has not set up is left alone.
- **Kurse** shows per level „Gebucht" — the learners booked in the workspace (phase 1: the month's
  start at `.1`; phase 2: its `.2` joiners and the previous start's `.1` learners whose booking runs
  into the month) — and „Kursstart 3. Aug." linking to the start. The typed „Anmeldungen" stays: while
  FileMaker is where CASA books, the bridge's number is the real one, and replacing it with the
  workspace's bookings would show zeros.

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
  course-link.ts  a course start's planning month, a level code's board level and phase (pure, tested)
  link.ts     startClasses (a start's teachers) · monthBookings (Gebucht per level) · openPlanGroups
src/app/(admin)/admin/(focus)/
  layout.tsx            the gate in focus mode (same requireStaff as the workspace)
  kursplanung/layout.tsx   requireModule('kursplanung')
  kursplanung/page.tsx     loads the month, renders the board
  kursplanung/actions.ts   saveWeekAction — the one write, whole shift-week at a time
  kursplanung/board.tsx    the board ('use client'), board.module.css its look; it renders the title row itself
  kursplanung/header.tsx   the title row: Kursplanung · month dropdown (month-picker.tsx) · Puzzle / Kurse / Lehrkräfte
  kursplanung/ui.module.css   the module's chrome — title row, tabs, .sel dropdowns, pills, tables, rows, dialog form
  kursplanung/kurse/       groups per shift; the pair, TN and Kurs-ID are edited in the row and save themselves
                           (auto-save-row.tsx: a dropdown on change, a field when left; one form per row, named via form=)
  kursplanung/lehrkraefte/ the teaching staff in rows per shift; Details opens the dialog (?teacher=<id> opens it on arrival)
  kursplanung/teacher-form.tsx   the dialog form (pills, absence rows); parsed by lib/admin/kursplanung/forms.ts
  lib/admin/kursplanung/colours.ts   the level tints, shared by board, Kurse, Lehrkräfte and the dialog
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
| 1 | module, focus-mode shell, migration 0014, domain + tests, landing page, import script, Manrope | merged 2026-09-16 (#29) |
| 2 | the board: week view, tray, pick-up mode, drag & drop, handle, menus, undo, copy week, save action | merged 2026-09-16 (#30) |
| 3 | teacher dialog (rules + absences), Kurse (pairs, group count, registrations), Lehrkräfte list | merged 2026-09-16 (#31) |
| 4 | Monat view (all weeks stacked), `Ersatz finden`, month selection and the next month from this one, stale-write check, e2e with a real session | merged 2026-09-16 (#32) |

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
