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
   **Never a colour per person.** The shift's own colour (green Vormittag, blue Nachmittag, the
   workspace's colours of the day, 2026-10-21; docs/ADMIN_WORKSPACE.md) is only a stroke beside the
   shift's name — on the switch and the Kurse headings — never on a socket or a piece.
3. **Little on screen; explanation where the action is.** A dark strip explains pick-up mode ("Alina in
   der Hand · noch 3 Tage · passt in B1+.2, B2.2 · Fach anklicken"). The piece menu is one line per
   action and nothing under it — the rows with a consequence sentence each were rejected on 2026-09-16
   ("too much information, keep only the main headings"); the header carries the state (`· Vertretung`,
   `· unbestätigt`). A menu is measured after it opens and pulled back inside the viewport; scrolling
   the page closes it — a page that has moved since it opened, not the scroll event that arrives a frame
   after the scroll which brought the piece into view (that one closed menus as they opened). No
   dashboards, no explanatory paragraphs.
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

The board opens on the planning month today falls in — its course block — and on today's week (a
weekend looks ahead to the coming one); `?month=` picks another. Until 2026-10-22 it opened on the last month with groups, which
became November 2027 once lesson days were made a year ahead.

Interactions, all of them: drag a piece from the tray onto a socket (it lays down as many consecutive
days as it has left, `Mo–Mi` in one move); or click the piece (pick-up mode) and click a socket; click an
open socket for a dropdown grouped by fit (Stamm/Vorschlag first, then free, other level, other shift as
substitute, unavailable with reason); click a placed piece for its actions (Vertretung, unbestätigt,
extend to the group's free days, open the teacher's page, remove, and `Ersatz finden` when the teacher has since become
absent); drag the handle to change a piece's days; drag a piece to another column to move it; drag it
into another week to copy it; ⌘Z / Rückgängig; "Woche übernehmen →" copies the active week forward.

## Data (migration 0014)

| Table | One row is | Notes |
| --- | --- | --- |
| `teachers` → `staff_members` (0039) | a colleague on the staff register; the board's teachers are those with the role Unterricht, or named in the plan | NOT `staff_users` (it may link one). Rules that shape the piece: `shifts`, `days_per_week`, `weekdays`, `levels`. The name is the person's (`people`), employed or freelance the contract that runs today (`staff_contracts`). `filemaker_staff_id`. |
| `course_groups` | one parallel group of a level in a planning month | its course (`course_id`, 0045: `link_course_groups()`), `phase` '1'/'2', `group_index`, `registrations`, the pair `teacher_first`/`teacher_second`, `room_id`, `filemaker_course_id` (bridge §7 item 6). |
| `course_days` (0045, was `plan_assignments`) | one lesson day of a course; on the board, a teacher on a group on a date | `is_substitute` (yellow), `is_tentative` (`?`), `changed_by`. Unique per (group, date) and per (course, group, date). The course page edits the same rows (docs/ADMIN_WORKSPACE.md §Lesson days). |
| `teacher_absences` → `staff_absences` (0039) | one colleague on one date | reason in Urlaub · Krank · Fortbildung · Freistellung · Elternzeit · Sonstiges. Entered here or on the colleague's page. |

Audit: `staff_activity` via `logActivity`, entity `kursplanung`.

**A planning month is CASA's course block (2026-10-22, migration 0079).** It starts with the intensive
start that opens it — the start whose third week falls in the month, 26 October for November 2026 — and
runs to the next start: four weeks, five at Easter (March 2027) and in summer, with weeks after the
fourth in which nothing is taught (the Christmas break at the end of December's block) left off. That is
how the planners' sheets run it („Vormittag November", „Nachmittag November 2026": 26.10.–20.11.).
`planning_month_start()` and `planning_month_of()` in SQL, `planWeeks()` in `repo.ts`. For a month no
intensive start opens yet, the old calendar rule stands in: the Monday of the week the 1st falls in, or
the following Monday when the 1st is a weekend day (`weeks.ts`, tested). The calendar rule had put
26–30 October into October, where no group of the new start existed, and 23–27 November into November,
after the morning had moved on to `.2`.

## The staff register (2026-10-17, migration 0039)

The board's teacher list is no longer its own table: a teacher is a colleague on the staff register
(`/admin/staff`, docs/ADMIN_WORKSPACE.md §Staff) with the role Unterricht. **Their planning rules —
shifts, days, weekdays, levels — and their absences are changed only there** (the register's view
Lehrkräfte, `?view=teaching`, and their page's tab Unterricht), with their name, contact and contract
(Rahman, 2026-10-22: less on the board). Kursplanung's own Lehrkräfte tab and teacher dialog are gone;
an old link to it lands on the register (`/admin/kursplanung/lehrkraefte` redirects). On the board,
„Lehrkraft öffnen" in a piece's menu opens the colleague's page for those who hold `staff`.

**The tray (Teile)** is one line per teacher: the name, V+N, and the shift's days — dark free, grey
planned in either shift, red away, outlined not a day they work (`dayStates`), as the planners' sheet
names the days someone is „verfügbar" rather than counting them; „noch 3" only when the contract allows
fewer days than are free. Only the shift's own days count, so a V+N teacher's free Friday is no
afternoon. „Im Plan" is who teaches in this shift this month or the last (`planRegulars`, read once with
the page, so the list does not reshuffle while a month is planned); everyone else with days free folds
under „Weitere", the other shift under „Andere Schicht", the fully planned under „Verplant", each two
lines of names until opened. The tray scrolls on its own beside the board. Levels are not shown: which
columns fit shows when a piece is picked up. What it says is as true as the rules and absences on the
staff register: a teacher still on the default rules (five days, Mo–Fr) shows days free they may not
work, and an absence SchoolMan does not record shows a teacher free. SchoolMan's staff import brings a
teacher the register does not know, with the weekdays and times of day of SchoolMan's internal section
(§A teacher's planning).

## Lesson days (2026-10-17, migrations 0045–0046)

The board plans lesson days. Each of its groups belongs to a course — the intensive start opening that
month for phase 1, the one before for phase 2, in the group's shift, at the level's `.1` — and its cells
are that course's `course_days`. Placing a piece writes a day (upsert on group and date); a course's own
page (`/admin/catalogue/courses/[id]`) shows the same days with their room, hours and any day called
off, changes one day, or generates the days ahead from the course's weekly plan. Generating an intensive
course's days makes its two groups here, so the board shows them. `linkGroupsAndDays()` runs after
`addGroup` and `createContinuationMonth`; `removeGroupIfEmpty` deletes only days of no course. The board
offers no slot outside a group's course (0049): its groups carry the course's first and last day,
`validateWeekAssignments` and `setDayTeacher` refuse a date outside it, and `link_course_days()` joins a
board day to its course only inside it.

## What SchoolMan's days teach (2026-10-22, migration 0078)

The teachers' rules were derived from the September sheet; SchoolMan's lesson days since then showed
44 teacher-and-level pairs the rules did not list, so the October board carried 36 „… nicht hinterlegt"
warnings about classes CASA had long decided, and 107 of 117 groups had no pair. `learn_kursplanung()`
closes both and **only ever adds**:

- a teacher's levels gain every level SchoolMan has them teaching (cover days too) — until 0083 their
  weekdays and shifts too, which the planners now set (§A teacher's planning);
- a group without a pair gets the teacher who holds most of each half of its weeks that month, two
  different people (Kurse refuses one person in both halves).

Only SchoolMan's days count (`filemaker_id`): a planner who lays someone on a level not listed keeps the
warning they accepted. The bridge runs it after every lesson-day import (`import-lesson-days.mjs`), so a
rule a planner removes comes back only if SchoolMan keeps showing the person teaching it.

A **Zusammenlegung** (docs/ADMIN_WORKSPACE.md, 0074) is one teacher for two parallel groups on purpose:
the board reads `course_days.merged`, does not call it a double booking, and shows the day as its own
piece marked „Zusammengelegt". It is set and lifted in the Tagesplan, not here.

On Kurse a group of a course shows SchoolMan's number for it and opens the course's page; the typed
„Kurs-ID" remains only for a group of no course. A colleague with no level listed (SchoolMan lists some
teachers who never teach an intensive class) comes last in the tray.

## Contract hours, the class's earlier levels, every day off (2026-10-22, migration 0080)

Rahman: „make the system more intelligent" — the hours each teacher is contracted for, the holidays, a
class kept by one teacher for at most three full courses.

- **Contract units.** SchoolMan's `DateTargetWorkTime` came across with the staff register (0039):
  `staff_contracts.weekly_units`, the teaching units (UE, 45 minutes) a week, for every employed teacher.
  A day counts its own units, else its shift's (morning 4, afternoon 5, `SHIFT_INFO.units`), and what a
  teacher teaches outside the board — evening, special and company courses — counts too (`listOtherUnits`,
  `unitsUsed`). The tray shows the week's units against the contract („12/20", red when over), the hover
  the week's and the month's; more than the contract in a week is a warning on the tiles („22 von 21 UE").
  It never hides a teacher: Claudia G's contract holds 12 units and the sheet still lists her as
  „verfügbar" beyond them.
- **Employed before Honorar.** In every list of the tray the employed come first, those with most units
  still to plan at the top (CASA pays for them either way), then the freelancers, marked „Honorar" in a
  colour of their own.
- **Three levels with one class at most.** A class is followed by its learners: the class before is the
  one most of its learners came from (three at least), ended within three weeks of its start
  (`classHistory`, recursive, three levels back). A teacher who held a quarter of a class's days or more,
  covers left out, taught it. Placing someone on the class they taught in the three levels before is a
  warning on the tile, „4. Niveau in Folge", and the hover names the levels. For this the bridge reads
  courses and lesson days of the last eight months too (`read_courses.py`, `read_lesson_days.py`); an
  intensive course that ended before the website's starts (August 2026) gets its start made, off the
  website, and keeps its own shift.
- **Every day off.** SchoolMan marks a day ill, on holiday, or absent with a kind (`_ID_Absence`,
  `_ID_AbsenceDetail`: Tarifurlaub, unbezahlter Urlaub, Sonderurlaub → Urlaub; Abbau Überstunden →
  Überstunden, a reason of its own; Krank, off sick → Krank; Anderes → Sonstiges). The absent days were
  not read, so Jana Öz and Claus Schmidt showed free on 26–30 October and Christian Hetzner on 19–20
  November, which the planners' sheet had right.
- **Levels in their order.** Lists sorted by the level code's text put „B1+.1" before „B1.1"; every
  list now sorts by `level_rank()` (A1, A2, B1, B1+, B2, C1, C1H) — the board, the Tagesplan, the entry
  tests, the waiting lists, the materials.
- **Who teaches a group.** Kurse lists under each group everyone planned on it that month, most days
  first, a cover in yellow — not only the pair.

## Besetzung, names, dates, the rail (2026-10-22)

- **Besetzung** (the tab was „Kurse"): the month's groups per shift — the regular pair („Stamm Mo–Mi",
  „Stamm Do–Fr"), everyone planned on the group that month, what the board warns about (conflicts, a
  fourth level), the SchoolMan course. A pair is chosen from the shift's teachers only: who teaches the
  level first, then the others, employed before Honorar; the other shift covers on the board. No „?".
- **Teachers are „Vorname N."** everywhere a teacher is named by the board's name — the board, Besetzung,
  the Tagesplan, its class panel, the course pages (0081 rewrote every teacher's `short_name`; new ones
  are named the same way). Office colleagues keep their full names.
- **The week's dates** stand above the columns: „KW 43 · Montag, 19. – Freitag, 23. Oktober 2026 · Woche
  4 von 4 · Oktober 28.09.–23.10.2026" (`rangeLabel`, built by hand: Intl's ranges differ between server
  and browser by a space, which broke hydration).
- **The rail opens in place.** Focus mode starts with the rail folded; its toggle opens it there, with a
  preference of its own (`data-focus-nav`), and the columns rearrange to the width left. Before, the only
  control left was „CASA", which went to the Overview.
- **The Tagesplan's class panel** names everyone who teaches the group that week, with their days and
  covers marked, not only the day's teacher.

## A teacher's planning (2026-10-22, migration 0083)

Rahman named who is on the board and when: „Ayse is planned Monday and Tuesday in the morning and
Wednesday and Thursday in the afternoon; Bettina W. and Connie teach evenings; Fatma, Kathrin and Ulrich
are inactive; Julia teaches online courses; Martin only examines; Meike and Milena are substitutes;
Claudia F. Monday to Wednesday mornings, Helga Thursday and Friday mornings, Helmut Wednesday and Thursday
afternoons; Nilar is employed but not active until February 2027." One list of weekdays for every shift
could not say Ayse's week, and nothing said who belongs on the board at all.

- **Weekdays per time of day.** `morning_days`, `afternoon_days` (no Friday), `evening_days` replace
  `shifts` and `weekdays`; a shift is taught where its days are not empty (`worksOn(teacher, dow, shift)`).
  A day in the other shift is a cover, as before; a day in neither is „arbeitet nicht am …".
- **What a colleague teaches.** `course_kinds`, SchoolMan's course types (Intensivkurs, Abendkurs, Online
  Kurs, …). The board plans who teaches intensive courses, or whose kinds nobody has set yet.
- **Active, and from when.** `teaching_active` takes someone off the board while they stay on the staff
  register; `teaching_from` keeps an employed colleague off it until a date (Nilar: 1 February 2027), shown
  absent („Freistellung") before it.
- **Cover only.** `cover_only`: in the tray under „Vertretungskräfte", never in a group's pair and never
  learnt into one.
- **Who sets them.** The colleague's tab Unterricht (Mitarbeitende) has every field. A rule set there, or
  by this migration, records `planning_set_at`, and the bridge leaves that colleague's rules alone from
  then on. For the others SchoolMan's internal section („Intern" on the staff record: `_ID_ActiveTeacher`,
  `_ID_CourseTypeReference`, `_ID_WeekDay`, `_ID_DayTimeReference`) brings the course kinds, active and
  the evening days on every bridge run, and the morning and afternoon days only for someone new — the
  planners' days are not overwritten by SchoolMan's coarser list. Martin is an examiner, not a teacher.
- **The tray.** „Abwesend" and „Verplant" list only the shift's own teachers; someone who covered the
  shift last month and does not teach it is not listed there.
- **Days already held stay.** A day held by someone now off the board (SchoolMan's, or planned before
  they left it) is kept when the week is saved; placing them anew is refused (`validateWeekAssignments`
  with the week as read). Before, such a day made the whole week unsaveable.

## Course starts (2026-10-17)

A course start's level group and a Kursplanung group are the same class. Nothing is stored to say
so; the rule (`course-link.ts`, tested) is:

- An **intensive** start (course type format `intensive`) opens the planning month two weeks after its
  first day — 31 Aug → September, 26 Oct → November, 4 Jan → January — and that month's block starts
  on its first day.
- A level code names the board's level and phase: `B1.1` → B1 phase 1, `B1+.2` → B1+ phase 2.
- **C1H** is SchoolMan's „telc Deutsch C1 Hochschule – Prüfungsvorbereitung" (format `exam preparation`,
  no level code, `is_c1h_course()`): one block long, one group, in the course's shift and the phase that
  shift has that month. The sheet plans it beside the intensive classes, so the board does too (0079);
  it is named „C1H", without a half (`levelName`).
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
  start at `.1`; phase 2: its `.2` joiners and the previous start's learners whose booking runs into
  the month, Bildungszeit learners in its second half among them) — and „Kursstart 3. Aug." linking
  to the start. The typed „Anmeldungen" stays: while
  FileMaker is where CASA books, the bridge's number is the real one, and replacing it with the
  workspace's bookings would show zeros.

## Code map

```
src/lib/admin/kursplanung/
  types.ts    vocabulary: shifts, levels, weekdays, reasons, Teacher / CourseGroup / Assignment / Absence
  weeks.ts    weeks between two Mondays, the calendar fallback, ISO week, weekday helpers, month label
  fit.ts      remainingDays · fit (may this piece land here?) · span (how many days from here)
  rules.ts    analysePlan → every violation, per tile and per week
  pairs.ts    assignmentsFromPairs → fill a month from the groups' pairs
  week.ts     validateWeekAssignments → what the server accepts for one shift-week
  forms.ts    parseTeacherForm / parseGroupForm → what the dialogs may write (tested)
  repo.ts     reads (server-only): the month's weeks from its course block (planWeeks), the plan;
              replaceWeekAssignments
  course-link.ts  a course start's planning month, a level code's board level and phase (pure, tested)
  link.ts     startClasses (a start's teachers) · monthBookings (Gebucht per level) · openPlanGroups
src/app/(admin)/admin/(focus)/
  layout.tsx            the gate in focus mode (same requireStaff as the workspace)
  kursplanung/layout.tsx   requireModule('kursplanung')
  kursplanung/page.tsx     loads the month, renders the board
  kursplanung/actions.ts   saveWeekAction — the one write, whole shift-week at a time
  kursplanung/board.tsx    the board ('use client'), board.module.css its look; it renders the title row itself
  kursplanung/header.tsx   the title row: Kursplanung · month dropdown (month-picker.tsx) · Puzzle / Kurse
  kursplanung/ui.module.css   the module's chrome — title row, tabs, .sel dropdowns, pills, tables, rows, dialog form
  kursplanung/kurse/       groups per shift; the pair, TN and Kurs-ID are edited in the row and save themselves
                           (auto-save-row.tsx: a dropdown on change, a field when left; one form per row, named via form=)
  kursplanung/lehrkraefte/ an old link's redirect to the staff register (the tab was removed 2026-10-22)
  lib/admin/kursplanung/colours.ts   the level tints, shared by board and Kurse
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
on the board, writes nothing, and goes through after `Neu laden`; Kurse renders and an old link to the teacher list
lands on the colleague's page. Open sockets carry `data-group`, `data-week`, `data-date` and `data-row`, pieces `data-group`, `data-week`
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
- The derived rule table per teacher (shift, days, weekdays, levels) needs their confirmation; it is
  editable in the tool. FileMaker's `sessions`/`levels` fields were not used because they contradict the sheet.
  Since 2026-10-22 it also holds what SchoolMan's lesson days show each person teaching (0078); days per
  week are not learnt, and nothing is ever taken away.
