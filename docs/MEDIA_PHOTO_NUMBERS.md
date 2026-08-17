# Photo numbers — what to name each replacement image

The site currently renders **colour placeholders instead of photographs**, and every
placeholder shows a number. That number is the filename of its replacement.

**To replace a photograph:** find its number on the page, name the new file `<number>.jpg`,
and hand it over. One number = one photograph = one file, however many places it appears.

Registry: [`src/config/content/photo-numbers.ts`](../src/config/content/photo-numbers.ts) ·
Renderer: [`src/components/ui/casa-image.tsx`](../src/components/ui/casa-image.tsx)

## How the swap works

Photographs can arrive **one at a time** — there is no flag day. For each delivered
photograph: save it to the `Path` below, then set `ready: true` on that registry entry.
That slot renders the real photograph everywhere it appears while every other slot stays
a numbered placeholder.

Setting `PLACEHOLDERS_ENABLED = false` in `casa-image.tsx` turns every placeholder off at
once, which is only right when all 36 are in.

## Two rules for this list

1. **Numbers never change.** Files are named against them.
2. **New photographs are appended** with the next free number, never inserted to keep a
   group tidy — that would renumber everything after it.

A test (`src/config/content/__tests__/photo-numbers.test.ts`) enforces both, and fails the
build if a photograph is used anywhere in `src/` without a number.

## The 36 photographs

`Seen on` is measured by crawling the running site, not read off the config.

| # | Name the file | What it must show | Path | Seen on |
| --: | --- | --- | --- | --- |
| **1** | `1.jpg` | Learners around a table mid-conversation, warm and unposed. Needs to survive a wide crop, so leave air at the sides. | `/media/casa/classroom-community-table.jpg` | `/resources/why-germany`, `/ueber-uns/gemeinnuetzigkeit` |
| **2** | `2.jpg` | One learner talking, caught genuinely smiling rather than posing. Reused very widely, so it must not be tied to one course or season. | `/media/casa/learner-conversation-smile.jpg` | `/`, `/about`, `/courses/bildungszeit`, `/courses/evening-course`, `/courses/german-for-medical`, `/courses/intensive-german` +3 more _(+2 review-only)_ |
| **3** | `3.jpg` | The CASA entrance with its signage legible — the arrival shot. | `/media/casa/school-entrance-sign.jpg` | _not currently rendered_ |
| **4** | `4.jpg` | Wide classroom in session, whole room visible. | `/media/casa/course-classroom-wide.jpg` | `/courses` |
| **5** | `5.jpg` | Class seated in a circle — discussion format, no front of room. | `/media/casa/course-classroom-circle.jpg` | `/`, `/courses/bildungszeit`, `/courses/evening-course`, `/courses/firmenunterricht`, `/courses/german-for-groups`, `/courses/german-for-medical` +2 more _(+3 review-only)_ |
| **6** | `6.jpg` | A row of learners in discussion, shot along the row. | `/media/casa/course-discussion-row.jpg` | `/courses/bildungszeit`, `/team` |
| **7** | `7.jpg` | Seminar-style room, wide, adult learners at tables. | `/media/casa/course-seminar-wide.jpg` | `/resources/study-in-germany` |
| **8** | `8.jpg` | A learner at the whiteboard working through something, teacher nearby. | `/media/casa/course-whiteboard-practice.jpg` | `/courses`, `/courses/evening-course`, `/courses/intensive-german`, `/courses/special-courses` |
| **9** | `9.jpg` | Two learners working as a pair, heads together over one task. | `/media/casa/classroom-pair-study.jpg` | _not currently rendered_ |
| **10** | `10.jpg` | Vocabulary work against a map — language tied to place. | `/media/casa/classroom-map-vocabulary.jpg` | `/courses` |
| **11** | `11.jpg` | Learners writing by hand in class, close on the work. | `/media/casa/learners-writing-class.jpg` | `/`, `/about`, `/courses/bildungszeit`, `/courses/evening-course`, `/courses/german-for-medical`, `/courses/intensive-german` +3 more _(+2 review-only)_ |
| **12** | `12.jpg` | Teacher running an activity with the group. This is the widest-travelling photograph on the site, including the homepage hero — it needs to read at full-bleed hero size and in a small card. | `/media/casa/group-classroom-teacher-activity.jpg` | `/`, `/about`, `/courses`, `/courses/bildungszeit`, `/courses/evening-course`, `/courses/firmenunterricht` +4 more _(+3 review-only)_ |
| **13** | `13.jpg` | One-to-one tutoring, teacher and single learner side by side. | `/media/casa/individual-tutoring.jpg` | `/`, `/faq` _(+3 review-only)_ |
| **14** | `14.jpg` | Coaching at the whiteboard, German visibly on the board. | `/media/casa/whiteboard-german-coaching.jpg` | `/` _(+3 review-only)_ |
| **15** | `15.jpg` | Professional adults in a workplace-German setting — business dress, meeting-room feel. | `/media/casa/business-german-group.jpg` | `/courses`, `/courses/firmenunterricht` _(+3 review-only)_ |
| **16** | `16.jpg` | Younger learners listening — the junior/teen cohort. | `/media/casa/junior-classroom-listening.jpg` | _not currently rendered_ |
| **17** | `17.jpg` | An advising conversation across a desk — two people, one clearly helping the other. | `/media/casa/advising-session-classroom.jpg` | `/courses/german-for-medical` _(+3 review-only)_ |
| **18** | `18.jpg` | Exam-condition writing — quiet, focused, papers out. | `/media/casa/exam-preparation-writing.jpg` | `/exams`, `/exams/b2`, `/exams/c1`, `/resources/study-in-germany` |
| **19** | `19.jpg` | Study materials laid out with a map. | `/media/casa/study-materials-map.jpg` | `/exams`, `/resources/study-in-germany` |
| **20** | `20.jpg` | Group at the Bremen Town Musicians statue. | `/media/casa/group-course-bremen-musicians.jpg` | `/about` |
| **21** | `21.jpg` | Group eating together, social rather than instructional. | `/media/casa/group-course-lunch-table.jpg` | `/`, `/courses`, `/courses/german-for-groups` _(+1 review-only)_ |
| **22** | `22.jpg` | Learners on a phone-based task out in the city. | `/media/casa/group-course-phone-task.jpg` | _not currently rendered_ |
| **23** | `23.jpg` | Group walking through Bremen together, city legible behind them. | `/media/casa/group-course-walking-bremen.jpg` | `/` _(+3 review-only)_ |
| **24** | `24.jpg` | Outdoor group activity, daylight, clearly not a classroom. | `/media/casa/student-group-activity-outdoor.jpg` | `/resources/why-germany` |
| **25** | `25.jpg` | The Schnoor quarter houses — Bremen as a place to live, no people needed. | `/media/casa/bremen-schnoor-houses.jpg` | `/resources/living-in-germany`, `/resources/why-germany` |
| **26** | `26.jpg` | Student room with a balcony, tidy and lit. | `/media/casa/student-room-balcony.jpg` | `/accommodation`, `/accommodation/become-host`, `/resources/living-in-germany` _(+1 review-only)_ |
| **27** | `27.jpg` | A host family living room — domestic, lived-in. | `/media/casa/host-family-room.jpg` | `/`, `/accommodation`, `/accommodation/flat`, `/accommodation/host` _(+2 review-only)_ |
| **28** | `28.jpg` | Shared-flat kitchen table, signs of shared use. | `/media/casa/shared-flat-kitchen-table.jpg` | `/accommodation/become-host` |
| **29** | `29.jpg` | A shared kitchen in use. | `/media/casa/student-shared-kitchen.jpg` | `/accommodation`, `/accommodation/flat`, `/resources/living-in-germany` |
| **30** | `30.jpg` | A second, different student room — read alongside 26, so vary the layout. | `/media/casa/student-room-alternative-1.jpg` | `/accommodation/become-host` |
| **31** | `31.jpg` | Staff portrait — Anna Keller. Square, head and shoulders, plain ground. Also used as the teacher-spotlight face on every course page, so it must work at 74px. | `/media/casa/team/team-anna-keller-portrait.jpg` | `/courses/bildungszeit`, `/courses/evening-course`, `/courses/firmenunterricht`, `/courses/german-for-groups`, `/courses/german-for-medical`, `/courses/intensive-german` +2 more |
| **32** | `32.jpg` | Staff portrait — David Stein. Match the framing of 31. | `/media/casa/team/team-david-stein-portrait.jpg` | `/team` |
| **33** | `33.jpg` | Staff portrait — Kareem Yilmaz. Match the framing of 31. | `/media/casa/team/team-kareem-yilmaz-portrait.jpg` | `/team` |
| **34** | `34.jpg` | Staff portrait — Lucas Brandt. Match the framing of 31. | `/media/casa/team/team-lucas-brandt-portrait.jpg` | `/team` |
| **35** | `35.jpg` | Staff portrait — Melanie Hoffmann. Match the framing of 31. | `/media/casa/team/team-melanie-hoffmann-portrait.jpg` | `/team` |
| **36** | `36.jpg` | Staff portrait — Sofia Martin. Match the framing of 31. | `/media/casa/team/team-sofia-martin-portrait.jpg` | `/team` |

## Four numbers you will not find on the site

These are referenced in `src/config/public-page-config.ts` but do not reach a rendered
surface today, so they carry a number without appearing anywhere. They are numbered
because the config entry can be switched on at any time — but do not go hunting for them
in a browser.

- **3** — `/media/casa/school-entrance-sign.jpg` — The CASA entrance with its signage legible — the arrival shot.
- **9** — `/media/casa/classroom-pair-study.jpg` — Two learners working as a pair, heads together over one task.
- **16** — `/media/casa/junior-classroom-listening.jpg` — Younger learners listening — the junior/teen cohort.
- **22** — `/media/casa/group-course-phone-task.jpg` — Learners on a phone-based task out in the city.

## The six that cannot ship

**31–36 are the team portraits.** The files at those paths today are *synthetic*
placeholders standing in for layout only (CLAUDE.md hard rule 3). They must be replaced
with verified portraits of real staff before launch, and must never be presented as real
staff before then.

Shoot all six the same way or the grid reads as six unrelated sittings: head and
shoulders, consistent eyeline, square crop, plain background. **31** also appears as the
teacher-spotlight face at 74px on every course page, so it must survive a small crop.

## Not numbered, on purpose

| What | Why |
| --- | --- |
| Logos and accreditation marks (`proof-band.tsx`, `partner-strip.tsx`) | Claims, not decoration — never placeholdered. |
| The two NewsFlash photographs (Lisa Dao, Kicktipp winners) | Real, verified images that already bypass the placeholder wrapper. |
| Klett textbook covers (`klett-textbooks.ts`) | Licensing unresolved, `coverSrc` unset, so no slot renders. |

## Spare images already on disk

Eleven files sit in `public/media/casa/` unreferenced by any page. They are not slots and
have no numbers, but they are available if one suits a slot better than what is there:

- `bremen-musicians-reflection-glasses.jpg`
- `bremen-phone-photo-program.jpg`
- `bremen-town-musicians-square.jpg`
- `bremen-town-musicians-tall.jpg`
- `classroom-workbook-pair.jpg`
- `group-course-stairs-bremen.jpg`
- `junior-vocabulary-notes.jpg`
- `school-building-illustration-header.jpg`
- `student-group-excursion.jpg`
- `student-room-alternative-2.jpg`
- `student-room-alternative-3.jpg`

