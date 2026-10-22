# Einstufungstest Tag 1 — the day-one test

On the first day of an intensive course the new learners of the A2, B1 and B1+ classes write a short
test on their phone, in class, the morning classes and the afternoon classes each in their own
sitting. It ran on Google (an Apps Script web app, two Google Forms for paper, a results sheet that
mailed an Excel file to info@) until October 2026. Rahman decided on 2026-10-20 to move it into the
workspace and to build the other two tests there; results go to the learner's record and an Excel
download, and are no longer mailed. The Google project's handover is
`~/Tasks/10-active/work/CASA - Various Tasks/casa-einstufungstest-a2-form/HANDOVER.md`.

This is not CASA's own adaptive placement test (`src/lib/placement`, `/placement-test`, closed in
production). The two share nothing but the rule that answer keys never reach a browser.

**Not a website feature (Rahman, 2026-10-20).** The test belongs to the first course day in class, so it
stays closed: the phone page is reachable only by its address (no link on the site, noindex, not in the
sitemap, llms.txt or the knowledge index), and a learner can start only while the office has opened a
sitting that day. For that reason it needs no section in the website's privacy policy. Once the
dashboard version is live, the Google project is switched off (see Open).

## Which class writes which test

Each test checks the level below the course it opens, and is named after the course, as the corrected
booklets are („Kurs B1 · Geprüfte Kenntnisse: A2"). B2 classes write none for now.

| Class (first day) | Test | Checks | Source (corrected set, 24/25 Sep 2026) | Shape |
| --- | --- | --- | --- | --- |
| A2.1 | `a2` Einstufungstest A2 Tag 1 | A1 | `~/Downloads/CASA_Einstufungstests/A2` | 36 multiple choice + reading 37, 38 (2 statements each) |
| B1.1 | `b1` Einstufungstest B1 Tag 1 | A2 | `~/Downloads/CASA_Einstufungstests/B1` | 34 multiple choice + reading 17, 36 (3 statements each) |
| B1+.1 | `b1plus` Einstufungstest B1+ Tag 1 | B1 | `~/Downloads/CASA_Einstufungstests/B1plus` | 36 multiple choice + reading 37, 38 (2 statements each) |

Every test has 40 answers in Version A and Version B. The Google test ran the booklet named „A2" (the A2
class's test, checking A1) under the title „Einstufungstest B1 Tag 1"; here each class gets the
booklet named after it. `entryTestFor()` (`src/lib/entry-test/tests.ts`) maps a level to its test:
only the first part of a level (`A2.1`) or the bare level writes one.

## How it runs

1. **The office opens it.** The Tagesplan shows a card „Einstufungstest" on a day that is the first
   lesson of an intensive A2, B1 or B1+ course (`ty.slug = 'intensive-german'`, the course's earliest
   course day), one line per test and session. The line opens a side panel: the classes, „Test
   öffnen" (on the day or ahead of it; A2 25, B1 30, B1+ 35 minutes, `ENTRY_TESTS[…].minutes`), then the
   sitting's 4-digit code for the teachers.
2. **Learners write on their phone** at `casa-bremen.de/test` (public site, no site chrome, noindex,
   German only, „Sie" as in the booklets), usually by a course's QR code (below). Name, e-mail, the
   course when more than one test is open (the QR code's `?kurs=` chooses it), then one task per page,
   an overview, hand in. The version alternates A/B per start in a sitting;
   the options of every multiple-choice task are shuffled per attempt.
3. **Leaving the page pauses the attempt** — the page hidden for 2 s or more, or closed. Never blur or
   focus: on a phone focus goes by itself (keyboard, banners). The teacher's code lets it go on; three
   wrong codes wait a minute; the office can also release it from the panel. The same e-mail again
   (reload, other phone) continues the attempt, paused. Time keeps running while paused.
4. **Time is the server's.** At 0:00 the phone hands in; saves are still taken 90 s past the deadline;
   an attempt whose time is up is handed in by the next read (the phone's poll, the panel).
5. **Paper** for a learner without a working phone: the booklet printed from the dashboard
   (Einstufungstests → „Testheft A/B", from the same questions the phones show, so paper and phone never
   differ), typed in from the panel („Papierbogen eintragen": name, e-mail, version, each answer),
   marked at once. The teachers' PDFs of September are no longer the booklet: four items differ (below).
6. **Results.** Each attempt is marked when handed in: 2 points per right answer, no minus points, 80
   in all, split into the multiple-choice part and reading (as the Google test and its printed teacher
   key; the booklets count 1 per answer). The panel lists every learner with status, points, the
   answers marked and the log. A result whose e-mail belongs to a learner of that day's classes (or to
   exactly one person) is written to the learner's record (`person_tests`, tab „Tests"). „Excel" in the
   panel downloads „Auswertung" and „Antworten" (`src/lib/xlsx.ts`, no library).

7. **The archive.** Once its day is over, a test is archived (`archivePastSittings()`, run before the
   Tagesplan and the archive are read): the sitting is closed at the end of its day and a phone still
   writing or paused is handed in with what it saved. „Einstufungstests" beside the day's views in the
   Tagesplan opens the archive (`/admin/day/tests`): every test day, the latest first, each test opening
   the same panel — results, answers, log, the Excel and the PDF of the sitting or the day, a paper
   booklet typed in late. A deletion period comes later; days are the unit it will drop.
8. **Tests öffnen** (Rahman, 2026-10-22). A level begins once a month in the morning and once in the
   afternoon, so on a morning start only the morning's A2, B1 and B1+ courses write the test
   (`dayEntryTests()`: the course's first lesson day, the level's first part). The tests page offers
   „Tests öffnen · Mo., 26. Okt." for the next start (`nextEntryTestDay()`), the Tagesplan's card on that
   day: every course whose test is not open yet, or the ones ticked („Ausgewählte Kurse", „Alle
   auswählen"), and the minutes. `openEntryTests()` makes one sitting per test and session, shared by its
   courses. Opened ahead of its day a test is „Bereit" with its code, so the teachers can have it, and the
   phones see it only on that day (they read today's sittings). A test already open or ready is left as
   it is; the per-test „Test öffnen" in its panel stays. The old „Heute öffnen" for a later day is gone.
   The Tagesplan's link „Einstufungstests" (archive, booklets, QR codes, guide, mail) shows only on a
   start day, as its card does (Rahman, 2026-10-22); to prepare ahead, choose the start day there.
8a. **The teachers' guide and mail** (Rahman, 2026-10-22). „Leitfaden für Lehrkräfte" on the tests
   page (`day/tests/guide`) is the guide, one A4 page: each test's time, then preparing, starting,
   during, after, the results — replacing the Google version's „Leitfaden zur Durchführung", whose
   separate typing-in step the phones made unnecessary, and saying only what CASA does (no address
   beside the QR code; the office does not pass results on). The steps are one text
   (`src/lib/entry-test/guide.ts`) for the page and the mail. **Three pages, kept apart** (Rahman,
   2026-10-22: so the teachers are not confused): the guide alone; the QR code per test (`/qr`, for the
   board); the teachers' codes as cards to cut out, one per class with its teacher (`/codes?date=`,
   „Code-Karten" in a test's panel and on the mail page).
   **„E-Mail an Lehrkräfte"** (`day/tests/mail?date=`, from the tests page, the Tagesplan's card, a
   test's panel and the guide) is one mail for a start day, a few days ahead with the course start
   mails: the office's text, then three parts kept apart — 1 the teachers' codes per test and class,
   2 the QR codes for the board, 3 the guide. The page
   lists the next start days; who gets it (the test day's teachers of those classes, ticked; the
   classes' other teachers of that week, unticked; any further address; a teacher without an address
   on record is named); the subject and text; and on the right
   the mail as it will arrive, built by the same function as the mail sent (`teacherMailHtml`),
   at computer or phone width. „Senden" asks first, opens any test not opened yet (so every code goes
   out), and sends through Microsoft Graph from `FORM_MAIL_FROM` — the teachers as blind copies, since
   their addresses are often private, the mailbox itself in „An" — with the logo and each QR code as
   inline pictures (`qrPng`, `src/lib/qr-png.ts`); answers go to the colleague who sent it. It reaches
   the teachers while the form mails are still in test mode (Rahman, 2026-10-22: an internal mail, sent
   on purpose). Each mail as sent is kept in `entry_test_mails` (0084) and listed under „Gesendet". A
   laptop without the Container App's identity cannot send.
9. **The PDF** (`/admin/day/tests/results`, „PDF" in the panel, „PDF des Tages" on the card): one A4 page
   per test and session, the learners by points with the two parts, blanks, paper/time-up/left-the-page
   notes, and the average; the Excel keeps every answer.

No pass/fail and no level verdict: the points go to the teachers, who place the learner.

## QR codes and print

Above the archive, per test: „Testheft A", „Testheft B" and „QR-Code" (`/admin/day/tests/booklet`,
`/admin/day/tests/qr`, A4 through `@page entry-test`). A course's QR code opens
`<public site>/test?kurs=b1` (`entryTestLink()`); while a test is open its panel shows the code beside
the 4-digit code, for a projector. The code is drawn on the server (`src/lib/qr.ts`, `uqr`, no
dependencies of its own) and was checked with an independent decoder (OpenCV) on screen and from the
printed PDF. On paper it is a background picture: Chrome starts a new page before an `<svg>` or `<img>`
inside a named page.

The poster (2026-10-21, Rahman: „remove the links, use the real CASA logo … prepared for print") is
CASA's logo (`public/brand/casa-logo.png`, as a background picture), the test, the course and the code —
no address in letters — on one A4 sheet without page margins (`@page entry-test-poster`), so the
browser has nowhere to print its own URL, date and title. Checked from the printed PDF: one page, and
the code decodes to the phone page.

**One poster per course, for good.** The code holds no date, start or class: the day's 4-digit code
comes from the teacher. It holds the address, though — the public site's of the day
(`publicSiteAddress()`): `neu.casa-bremen.de` until the switch to casa-bremen.de (`CMS_PUBLIC_ORIGIN`),
`casa-bremen.de` after. Posters printed before the switch carry `neu.casa-bremen.de`, so that hostname
stays bound to the app after the switch (its DNS record and the Container App hostname), or every
poster is reprinted.

## Where it lives

| Part | File |
| --- | --- |
| Tables | `db/migrations/0075_entry_tests.sql` — `entry_test_sittings` (day, session, test, code, minutes, open/closed), `entry_test_attempts` (token hash, name, e-mail, version, status, answers, option order, log, score) |
| Questions | `src/lib/entry-test/content/{a2,b1,b1plus}.json` (questions only) |
| Keys | `src/lib/entry-test/keys.server.ts` (`server-only`; the containment test in `src/lib/placement/__tests__/answer-containment.test.ts` covers it) |
| Rules, scoring | `src/lib/entry-test/tests.ts` |
| Phone flow | `src/lib/entry-test/attempts.server.ts`, `src/app/api/entry-test/route.ts` (one POST, one body per action, `src/lib/entry-test/types.ts`) |
| Phone page | `src/app/(site)/[locale]/test`, `src/components/entry-test/` |
| Workspace | `src/lib/admin/entry-tests.ts`, `day/entry-test-panel.tsx`, actions in `day/actions.ts`, Excel at `day/entry-test/export/route.ts` (checks the session and module `day` itself) |
| Archive, print | `day/tests/page.tsx` (archive), `day/open-tests-dialog.tsx` („Tests öffnen"), `day/tests/results` (PDF), `day/tests/booklet`, `day/tests/qr`, `day/tests/print-sheet.tsx`; `src/components/admin/qr-code.tsx` |

Access: module `day` — `view` sees the card, the results and the Excel; `edit` opens, closes, releases,
hands in and types in paper; `full` deletes an attempt (with its result on the learner's record).

## Content changes against the teachers' PDFs

Ported 2026-10-20 from the corrected PDFs; the A2 test matches the Google version byte for byte. Two
kinds of change in the port: „uebt" → „übt" (b1 A 36), and the b1plus options printed „entweder ... oder"
written „entweder / oder" so the phone fills both gaps.

Four items let a second answer fit; fixed the same day at Rahman's request, each keeping its keyed
letter, so the key and every result stay valid:

| Item | Was | Now | Key |
| --- | --- | --- | --- |
| b1 B 22 | „Weißt du, ___ der Supermarkt am Feiertag geöffnet ist? – Nein, leider nicht." (wann, wo, wie lange fit too) | „Weißt du, ___ der Supermarkt am Feiertag überhaupt geöffnet ist? – Nein, am Feiertag ist er geschlossen." (a yes/no reply: only ob), as Version A's item 9 | B ob |
| b1 A 17, statement 3 | „Wer nicht mitfahren kann, soll sich bis Donnerstagabend melden." (the text says „bis 18 Uhr") | „… soll sich spätestens am Donnerstag im Kursbüro melden." | richtig |
| b1 A 25 (C), B 9 (D) | distractor „Weil" (a grammatical sentence) | „Denn" (cannot open a clause with the verb at the end) | Wenn |
| b1plus B 21 (C) | distractor „daran" („sich an etwas freuen", borderline) | „davon" | A darüber |

The teachers' second review (Rahman, „Final Corrections", 2026-10-20), keys unchanged:

| Item | Now |
| --- | --- |
| b1 A 7 | „Ich arbeite am liebsten morgens. Dann kann ich mich am besten konzentrieren." / „___ Ich arbeite lieber abends, weil ich dann mehr schaffe." (the gap takes no full stop: the options end with one) — key A „Das sehe ich anders." |
| b1 B 22 | the reply „Ja, ich habe nachgesehen: Am Feiertag ist er geschlossen." — key B ob |
| b1plus B 35 | „Wir akzeptieren ___ Bargeld ___ Kartenzahlung." — already two gaps here and in the PDF, unchanged — key D sowohl / als auch |
| b1 A 17 | „Die Fahrkarte ist schon bezahlt." (was „bereits", Jannik: more familiar) |
| b1 A 36, statement 3 | „Svitlana nutzt sowohl Serien als auch Bücher, um Deutsch zu lernen." — richtig |

The printed PDFs still carry the old wording; print the booklet from the dashboard instead.

## Open

- **Switching Google off** (Rahman: once the dashboard version is live, Google is not needed). Untick
  every group in the Google sheet, wait for `finalizeExpired`, run the month's archive (`rollover_`),
  remove the triggers, and change the web app's `doGet` to a short „Der Test ist umgezogen" page linking
  to the new address, so an old Google poster still leads somewhere; then replace the posters with the
  dashboard's QR codes. The September 2026 results (24 paper results) stay in the Google archive unless
  CASA wants them imported.
- **Deletion period.** Results are personal data; the archive keeps them until a period is set (Rahman,
  2026-10-20: later).
- **A real phone run** before the first class writes it.
