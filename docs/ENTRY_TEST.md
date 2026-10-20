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
   öffnen" (on the day itself; minutes default 40), then the sitting's 4-digit code for the teachers.
2. **Learners write on their phone** at `casa-bremen.de/test` (public site, no site chrome, noindex,
   German only, „Sie" as in the booklets). Name, e-mail, the course when more than one test is open,
   then one task per page, an overview, hand in. The version alternates A/B per start in a sitting;
   the options of every multiple-choice task are shuffled per attempt.
3. **Leaving the page pauses the attempt** — the page hidden for 2 s or more, or closed. Never blur or
   focus: on a phone focus goes by itself (keyboard, banners). The teacher's code lets it go on; three
   wrong codes wait a minute; the office can also release it from the panel. The same e-mail again
   (reload, other phone) continues the attempt, paused. Time keeps running while paused.
4. **Time is the server's.** At 0:00 the phone hands in; saves are still taken 90 s past the deadline;
   an attempt whose time is up is handed in by the next read (the phone's poll, the panel).
5. **Paper** for a learner without a working phone: the printed booklet, typed in from the panel
   („Papierbogen eintragen": name, e-mail, version, each answer), marked at once.
6. **Results.** Each attempt is marked when handed in: 2 points per right answer, no minus points, 80
   in all, split into the multiple-choice part and reading (as the Google test and its printed teacher
   key; the booklets count 1 per answer). The panel lists every learner with status, points, the
   answers marked and the log. A result whose e-mail belongs to a learner of that day's classes (or to
   exactly one person) is written to the learner's record (`person_tests`, tab „Tests"). „Excel" in the
   panel downloads „Auswertung" and „Antworten" (`src/lib/xlsx.ts`, no library).

No pass/fail and no level verdict: the points go to the teachers, who place the learner.

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

Access: module `day` — `view` sees the card, the results and the Excel; `edit` opens, closes, releases,
hands in and types in paper; `full` deletes an attempt (with its result on the learner's record).

## Content notes for the teachers' next review

Ported 2026-10-20 from the corrected PDFs; the A2 test matches the Google version byte for byte. Two
kinds of change: „uebt" → „übt" (b1 A 36), and the b1plus options printed „entweder ... oder" written
„entweder / oder" so the phone fills both gaps. Doubtful, left unchanged:

- b1 B 22 „Weißt du, ___ der Supermarkt am Feiertag geöffnet ist? – Nein, leider nicht.": key ob, but
  wann / wo / wie lange fit the reply too (Version A's item rules them out, B's does not).
- b1 A 17, statement 3: „bis Donnerstagabend" keyed richtig; the text says „bis 18 Uhr".
- b1 A 25, B 9: key Wenn; Weil also gives a grammatical sentence.
- b1plus B 21: key darüber; daran is borderline.

## Open

- **Switch-over from Google.** Close the Google groups, point the Google web app's link and the QR
  posters to `casa-bremen.de/test`, archive October's sheet. The September 2026 results (24 paper
  results) stay in the Google archive unless CASA wants them imported.
- **QR code** for the board: none yet (no library); the address is short enough to type.
- **Retention.** Results are personal data; no deletion period is set (the same open item as
  enquiries and CVs, CLAUDE.md).
- **Privacy text.** The privacy policy has no section for this test yet (docs/PRIVACY_POLICY.md).
