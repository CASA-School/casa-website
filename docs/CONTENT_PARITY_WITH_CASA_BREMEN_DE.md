# Content Parity with casa-bremen.de

**Date:** 2026-08-18 · **Source of truth:** the German pages of the live TYPO3 site
at `casa-bremen.de`. The `/en/` tree is a 1:1 translation and contributes no unique
content (verified by crawling both).

> **Status 2026-08-18, later the same day.** Sections 1–3 below are **resolved**, and
> the FAQ and the team/testimonial work are **done**. What remains is the four
> missing pages, the per-page detail in §4, and the registration-form fields —
> tracked at the bottom under "Remaining". Everything landed with
> `lint`/`typecheck`/`test`/`build`/`knip` green.

## Method

Crawled every internal German URL reachable from the homepage nav, depth 2, until the
frontier was empty: **26 pages**, all HTTP 200. Parent paths (`/sprachkurse`,
`/pruefungszentrum`, `/ueber-uns`, `/unterkunft`, `/anmeldung`) redirect to their first
child and are not separate pages. Probed for a contact, jobs and pricing page — all 404.
Then rendered our site from the local dev server and compared extracted text page by page.

Findings below are split four ways, because they need different fixes:

- **Missing** — CASA publishes it, we show it nowhere.
- **Wrong** — we show a different value than the source.
- **Invented** — we publish something CASA does not offer or does not say.
- **In code, not rendered** — the correct fact exists in the repo but never reaches a page.

---

## Route map

| casa-bremen.de | ours | verdict |
| --- | --- | --- |
| `/` | `/` | gaps |
| `/sprachkurse/deutsch-intensiv` | `/courses/intensive-german` | **large gaps** |
| `/sprachkurse/deutsch-am-abend` | `/courses/evening-course` | **large gaps + wrong price** |
| `/sprachkurse/deutsch-spezialkurse` | `/courses/special-courses` | closest match; per-module copy lost |
| `/sprachkurse/deutsch-fuer-gruppen` | `/courses/german-for-groups` | gaps |
| `/sprachkurse/deutsch-fuer-mediziner` | `/courses/german-for-medical` | gaps + invented figures |
| `/sprachkurse/firmenunterricht` | `/courses/firmenunterricht` | **wrong archetype** |
| `/sprachkurse/bildungszeit-deutsch` | `/courses/bildungszeit` | gaps |
| `/sprachkurse/niveaustufen` | — | **no page** |
| `/pruefungszentrum/telc-deutsch-b2` | `/exams/telc_b2` | gaps |
| `/pruefungszentrum/telc-deutsch-c1-hochschule` | `/exams/telc_c1_hochschule` | gaps |
| `/unterkunft/wohnen-in-einer-gastfamilie` | `/accommodation/host` | gaps |
| `/unterkunft/die-casa-wg` | `/accommodation/flat` | gaps |
| `/unterkunft/gastfamilie-werden` | `/accommodation/become-host` | gaps |
| `/ueber-uns/casa-leitbild` | `/about` | close; two load-bearing omissions |
| `/ueber-uns/casa-team` | `/team` | **entirely fabricated** |
| `/ueber-uns/tandem` | — | **no page** (short section on `/about`) |
| `/anmeldung/einstufungstest` | `/placement-test` | good; process rules missing |
| `/anmeldung/anmeldeformular` | `/registration/course` | gaps |
| `/anmeldung/anmeldung-zur-pruefung` | `/registration/exam` | missing required fields |
| `/anmeldung/geschaeftsbedingungen` | `/terms` | ✅ **complete** |
| `/datenschutz` | `/privacy` | condensed; needs legal review |
| `/impressum` | `/imprint` | ✅ **complete** |
| `/faq` | `/faq` | **zero overlap — 24 invented Q&As** |
| `/aktuelles` | `/news` | partial |
| `/gallerie` | — | **no page** |

---

## 1. Wrong — **RESOLVED**

| What | Source | Ours | Where |
| --- | --- | --- | --- |
| Evening course price | **476 €** per trimester (Herbst, current) | **from €378** | `db/seeds/0001_public_baseline.sql:28`. `src/config/calculator/pricing.ts:88-92` has both trimesters right (spring 378 / autumn 476) and defaults to 476 — the seed picked the wrong one. |
| Intensive afternoon days | **Mon–Thu** 13:00–17:30 | fixture is right; page shows no days at all | `public-fixtures.ts` `intensiveAfternoon` is correct |
| Klett series name | **Kontext** | "Context" | `src/config/courses/course-profiles.ts:104,114,128` — `klett-textbooks.ts` spells it correctly |

## 2. Invented — we publish it, CASA does not — **RESOLVED**

- **Two courses that don't exist:** "University preparation" and "Business German" render
  in the homepage "Also available" band (`src/app/page.tsx:61-62,102-107`). Neither is on
  casa-bremen.de. The fixture list also carries `summer-intensive` and — directly against
  the source — **`integration-german`**, while the German FAQ states plainly that CASA
  offers *no* Integrationskurse. These four don't currently render as detail pages in
  Neon mode, but they are one config change away from doing so.
- **The whole team page.** All six people on `/team` are fabricated: Anna Keller, David
  Stein, Melanie Hoffmann, Kareem Yilmaz, Sofia Martin, Lucas Brandt. CASA publishes
  **twelve real staff with real roles** (see §4). "Anna Keller, Senior German Teacher"
  also appears as a teacher spotlight on every course detail page.
- **Anonymous testimonials.** "Former intensive student – Brazil", "CASA community post –
  Spain", "Exam candidate – Turkey" are placeholders. CASA publishes **five real
  first-name testimonials**, each attached to the course it's about (see §4).
- **`/courses/firmenunterricht` uses the group-programme archetype**, so it tells companies
  "For groups coming to Bremen", "Included: lessons, culture programme, accommodation"
  and "Accommodation and culture programme arranged". None of that is on the
  Firmenunterricht page. It also asserts `4 lessons/week`; the source says by arrangement.
- **German for Medical** shows `Price €400`, `4 lessons/week`, and dates
  `26 Jun – 28 Aug 2026`. CASA publishes **no** price, weekly load or dates for this
  course. `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` already records this as "not published".
- **`/about` timeline** invents a "1990s — International expansion" milestone.
- **`/accommodation/*`** asserts "Utilities: usually included". The source says nothing
  about utilities.

## 3. In code, not rendered — **RESOLVED**

`src/app/courses/page.tsx:111-127` builds a correct `facts` array — €520 / 4 weeks,
€940 / 8 weeks, €117.50 per additional week, €50 one-time enrolment fee, textbooks
€23.99–26.99 — and passes it through as `facts: copy.facts` (line 355). The rendered
`/courses` tab panel shows only *Best for / Schedule rhythm / Learning load / Likely
outcomes*. **None of those figures appears on any page of our site.** The intensive
detail page instead shows "Duration: On request" and "Next start date: To be announced".

The intensive schedule is likewise in the database — `/registration/course` correctly
renders "Mon, Tue, Wed, Thu, Fri • 09:00-12:30" for the selected session — but the
course detail page shows no times.

## 4. Missing — by page

### Homepage
- **English evening courses.** The German h3 reads "für Deutsch als Fremdsprache **und
  Englisch am Abend**", and the Leitbild says "Wir haben uns auf DaF spezialisiert und
  unterrichten **außerdem Englisch**". We show German only, everywhere.
- **Funding cooperations: Here Ahead and Bildungsberatung Garantiefonds Hochschule**,
  with the prompt "Bitte prüfe, ob du für die Förderung infrage kommst." These sit high
  on the German homepage. In our repo they appear only on `/ueber-uns/gemeinnuetzigkeit`
  and in the assistant KB — not on the homepage, and not on the intensive course page
  where a study-preparation applicant would look. Directly relevant to the Ad Grants
  public-benefit narrative.
- "Deutsch für Gruppen **und Schulklassen**" — school classes are named in the offer list.
- Office closure periods: **Ostern 30.03.26–06.04.26, Weihnachten 21.12.26–01.01.27**.
  Present in neither config nor footer (`grep` for `Schließzeit|closure|Ostern` in
  `src/config` returns nothing).
- Photo credit line: `© Isa Fischer, "Hausgezeichnet"`.
- Green-hosting statement ("Website gehostet mit Strom von …").
- Gallery entry point ("Visit our Gallery").

### Contact details
Three of CASA's four published addresses are absent site-wide:
`contact@casa-bremen.de` (suggestions and feedback), `bewerbungen@casa-bremen.de`
(job applications), `online@casa-bremen.de` (where placement-test results must be sent).
Only `info@` appears. The fax number is on `/imprint` but not `/contact`.

### `/sprachkurse/deutsch-intensiv`
- Class times: morning **Mo–Fr 09:00–12:30**, afternoon **Mo–Do 13:00–17:30**.
- The published term table — 4 morning and 4 afternoon runs, 31.08.26 through 30.04.27.
- 20 UE **à 45 minutes**; **8–9 weeks per complete level**; A1→C1 within one year.
- **International groups of 10–15 learners.**
- €940 for 8 weeks, €117.50 per additional week, €50 one-time enrolment fee,
  textbooks €23.99–26.99 varying by level (all present in code, none rendered).
- **"Die Vorbereitung auf eine Prüfung ist nicht Bestandteil der Intensivkurse."**
  Our `/courses` index does carry this; the intensive page itself does not.
- **On-site placement is mandatory and CASA may reassign your level regardless of
  certificates you already hold.** Absent entirely — this is expectation-setting that
  prevents arrival disputes.
- Regular correction of written work; teachers' own supplementary materials.

### `/sprachkurse/deutsch-am-abend`
- The autumn trimester table with **which levels run on which track**:
  Mo/Wed 24.08–16.12.26 → A2.1, A2.2, B1.2, B2.1, B2.2, C1.1;
  Tue/Thu 25.08–17.12.26 → A1.1, A1.2, B1.1, C1.2.
- **A1.1 beginners must start at term start**; with prior knowledge you can join a running
  course if seats are free; **waitlist available** if full.
- ~3.5 months = half a level; ~1.5 levels per year. (On `/courses`, not on the page.)
- Occasional leisure and culture activities for evening groups.

### `/sprachkurse/deutsch-spezialkurse`
Our module catalogue is the strongest page on the site — all 8 modules, correct weekday,
dates, level and €192. What's lost is **each module's copy**: a tagline plus a full
descriptive paragraph, 16 pieces in total. `src/config/courses/special-course-modules.ts`
has no field for them. Example, for the pronunciation module:
"Sprich flüssiger, verständlicher und mit mehr Selbstvertrauen – im Alltag, im Beruf und
in Prüfungen" + a paragraph on sounds, word stress, sentence melody and intonation.
The Grammatik-kompakt module even lists its syllabus (Satzbau, Zeiten, Konjunktiv II,
Passiv, Relativsätze, Präpositionen).

### `/sprachkurse/deutsch-fuer-gruppen`
- **Culture programme, named:** Stadt-Rallye, mini-golf, Rathaus and Weserstadion tours,
  Universum and Klimahaus Bremerhaven museum visits, trips to the North Sea, Hamburg,
  Lübeck.
- **Host families meet arriving students at the station or airport.**
- **Public-transport ticket for the whole stay.**
- Single or double rooms, meals optional; all hosts personally selected.
- **Accompanying adults** housed separately, usually a central hotel, single room + breakfast.
- Participation certificate for every learner. (We have this one.)
- Hours are negotiable, not fixed at 20.

### `/sprachkurse/deutsch-fuer-mediziner`
The published syllabus, which we replace with generic bullets:
- *Arzt-Patienten-Gespräch:* Anamnesegespräch (allgemein / speziell), körperliche
  Untersuchung, Diagnostik / Befund / Therapie, Kommunikation mit Angehörigen
- *Arzt-Arzt-Gespräch:* Fallvorstellung, interdisziplinärer Austausch
- *Schriftliche Dokumentation:* fachärztliche Dokumentation, Arztbriefe

Also missing: the course serves doctors **before *and after*** the Fachsprachprüfung, and
it explicitly guides participants toward structured self-study.

### `/sprachkurse/firmenunterricht`
- Non-binding consultation → written training plan → non-binding quote.
- **Requirement: participating employees must be at roughly the same level.**
- Long-standing cooperation with Bremen-based companies; intercultural as well as
  linguistic qualification.

### `/sprachkurse/bildungszeit-deutsch`
- The legal basis: **Bremisches Bildungszeitgesetz**, ten days over two years for
  employees working in Bremen.
- Recognition requires **30–40 hours of instruction per week**; CASA's superintensive
  format meets it by running **two intensive courses in parallel** (morning + afternoon).
- **Entry from B1.**
- **You can join any Monday**, with the recommendation to start when a new intensive
  course begins.
- Published term table, including the two 9-week runs.
- €520 for 2 weeks; textbooks €46–54 (two books); €50 first-registration fee.

### `/sprachkurse/niveaustufen` — no page on our side
CASA publishes a full CEFR page: levels A1, A2, B1, **B1+**, B2, C1 with a
descriptor paragraph each — including a **CASA-authored B1+ descriptor** that exists
nowhere else and explains why the bridge level is offered at all. Our footer links
"Levels & placement" to `/placement-test`, which carries a one-line summary per level.
The English site has this as `/en/registration/language-levels`.

### `/pruefungszentrum/telc-deutsch-b2` and `…-c1-hochschule`
- **Published exam dates**, with waitlist status: B2 — 21.08.26 (Warteliste), 16.10.26,
  13.11.26. C1 — 03.07.26 (Warteliste), 04.09.26, 02.10.26, 30.10.26. Both pages show
  "Next date: TBD". The sessions are in the fixtures; the waitlist flag is not.
- **Exam day timing:** B2 runs ~09:00–17:00; C1 is **always a Friday**, ~08:30–17:00.
- **Results and certificate arrive about 6 weeks later; CASA notifies every candidate.**
- **Prep course structure.** B2: 07.09–07.10.26, Mon/Wed 18:30–20:00, €260. C1: a 4-week
  block with three published start dates, €520, **plus the €50 enrolment fee for
  first-time registrants**. We show the two prices with no dates, schedule or structure.
- **The C1 disclaimer, verbatim in spirit:** C1 vocabulary, Redemittel and grammar are
  *assumed* from a completed C1 course and are **not** taught in the prep course; an
  on-site placement test is the alternative proof; and the course offers **no guarantee
  of passing**. This is the single most important disclosure on either exam page.
- Who telc C1 Hochschule is for (prospective and current students at German-language
  universities, academic professionals) and the link to the telc Institut.
- The FAQ mentions **TestDaF** alongside the two telc exams. Our fixtures have a TestDaF
  row; no page or nav entry. Worth confirming with the office whether it's still offered —
  the German site's own nav and FAQ disagree.

### `/unterkunft/*`
- **Eligibility, stated twice on the German side and absent on ours:** CASA accommodation
  is available **exclusively to intensive-course students**, and the WG additionally
  **only to learners of legal age**.
- WG specifics: **three flats on the 2nd and 3rd floor of the school building itself**,
  five rooms each, **14–18 m²**; **three further WGs** elsewhere in Bremen, all on public
  transport; fully equipped kitchen, bathroom, **WLAN**; pillow, duvet and bed linen
  provided — **bring your own towels**; **no smoking**; self-catering and self-cleaning.
- **If no WG room is free on your arrival date you are placed with a host family instead.**
  (In our FAQ, not on the page.)
- Host family: own furnished room, kitchen and bathroom normally shared, self-catering.
- The **€580 deposit is refunded** if flat and keys are returned as received.
- The €145 holiday week is specifically the **Christmas and Easter closure weeks**.
- Become-host: groups arrive regularly **from Italy, Mexico, Denmark and Japan**; stays of
  **1–4 weeks** include **breakfast and dinner (Halbpension)** and **airport / Hauptbahnhof
  transfer**; students should **eat with the family and share in family life**; hosts
  receive an Aufwandsentschädigung. The German enquiry form asks room type, bathroom
  shared/separate, catering level, and available-from date.

### `/ueber-uns/casa-leitbild` → `/about`
Two omissions that matter more than their length:
- **The statutory grounds for the nonprofit status:** CASA is recognised as gemeinnützig
  "aufgrund ihrer Arbeit in der **Volksbildung** und der **Völkerverständigung**". This is
  the strongest public-benefit evidence CASA has, and it is the exact thing the Google Ad
  Grants review was asking for. `Völkerverständigung` currently appears only in an
  unrendered German-locale string (`src/app/ueber-uns/gemeinnuetzigkeit/page.tsx:51`);
  `Volksbildung` appears nowhere in the repo.
- **CASA also teaches English.** We render only the first half of the sentence.

Also missing: the explicit gloss "CASA – zu Deutsch **Haus**" behind our "house of
encounter" framing, and the founding detail "by a group of young educators".

### `/ueber-uns/casa-team` → `/team`
The twelve real, publicly published staff and their roles:

| Role | Name |
| --- | --- |
| Geschäftsführerin | Bettina Rick |
| Studienleitung | Claudia Gröne |
| Abendkursleitung | Mariella Baier |
| Buchhaltung | Manuela Meerhoff · Ina Eismann |
| Bundesfreiwilligendienst | Lara Nobmann · Ilona Sher |
| Verwaltung/Beratung | Meike Große Hundrup |
| Intensivkurse, Kooperationen, Firmenunterricht | Tanja Langenickel |
| Intensivkurse, telc Prüfungen | Natàlia Sostres |
| Intensivkurse, CASA Unterkunft, Agenturen | Mareike Thomeczek |
| Intensivkurse, Medizin- und Pflegekurse, Qualitätsmanagement | Alissa Trouillet |

Plus the page's own claim, which we water down: **teachers are native speakers with
university degrees**, many speak several foreign languages, and most have lived or
worked abroad themselves.

Note the interaction with CLAUDE.md hard rule 3: the *portraits* in
`public/media/casa/team/` are synthetic and must not ship as real staff. The *names and
roles* above are public information CASA publishes itself — using them is not the same
decision as using the placeholder photographs. Ina Eismann is already named on our
`/courses/german-for-groups` page as the group-programme contact.

### `/ueber-uns/tandem` — no page on our side
- **CASA is one of only six language schools in Germany in the TANDEM Germany network.**
  A concrete third-party credential; absent from our site.
- The tandem sign-up form (target language, offered language, level, interests).
- The four-step process: form → we search → first meeting at the school → you exchange
  contacts and continue, at CASA if you like.
- From `/aktuelles`: CASA is **actively looking for German-speaking tandem partners** for
  Russian, Italian, Turkish, Arabic, Chinese and Persian. This is a live recruitment need
  with no landing surface on our site.

### `/anmeldung/einstufungstest` → `/placement-test`
Our page has the six Klett tests including B1+. The process rules are missing:
- **Always start with the A1 test.**
- **No test needed with zero German** — you start at A1.
- Sit the test **alone, without dictionaries or aids**, and give yourself time.
- **Email your result to `online@casa-bremen.de`**, and put your name and email in the
  Klett form so it can be matched. Without this the test result never reaches CASA.
- On-site placement and advice needs **no appointment**; **bring at least one hour**.
- The tests are hosted by Klett and you leave the CASA site to take them.

### `/anmeldung/anmeldeformular` → `/registration/course`
Our wizard covers salutation, course, start, level, contact, visa, accommodation +
type, smoker, allergies, notes and terms. Missing:
- **Course end date** (the German form asks for start *and* end).
- "Einstufungstest bei CASA gemacht: ja / nein".
- Level list including **"nicht bekannt"** and the split **B1+1 / B1+2**.
- **The visa warning shown at the point of decision:** "Dieser Vertrag ist an ein Visum
  gebunden und kann nicht durch den Kunden/die Kundin gekündigt werden", plus the
  instruction to contact the German embassy.
- **The "we cannot guarantee a CASA WG room" note** next to the accommodation choice.
- "Deutsch Prüfungsvorbereitung" as a selectable course type.

### `/anmeldung/anmeldung-zur-pruefung` → `/registration/exam`
telc registration needs identity data our form does not collect:
**address, postcode, city, place of birth, country of birth, mother tongue, and ID
document number (Ausweisnummer)**. A telc certificate cannot be issued without them.
The German form also takes acceptance of the Datenschutzerklärung as its own checkbox.

### `/faq` → `/faq`
**Zero overlap.** Our 24 EN + 24 DE entries (`public-fixtures.ts:316-707`) are invented
and generic. CASA's FAQ is operational, and every answer below is currently unpublished
on our site:

*Allgemeines*
- Which courses exist — and explicitly **no Integrationskurse, no berufsbezogene
  Sprachkurse**.
- **Courses cannot be funded by BAMF or Jobcenter — self-payers only.**
- How to register: online form or in the office, **placement test first, result sent in**.
- Office hours, and that you can simply walk in during them.
- Why the placement test is required (a too-hard or too-easy group hurts everyone).
- **If you fall ill: tell the office and your teacher. There is no online make-up lesson.**
- Which exams: telc B2, telc C1 Hochschule, TestDaF — and **none at A1–B1**.

*Sprachvisum*
- **Requirements: 20 lessons per week for at least three months.** Intensive qualifies.
- **The visa letter is sent by email once the first course fee is received.**
- Delay: **one free postponement up to 21 days before the start; €100 each time after**.
  A booking can be **deactivated indefinitely** until the visa arrives.
- **Rejection: full refund minus €100, if CASA is told at least two weeks before the start.**
  Later than that, the 4-week cancellation terms apply.

*Unterkunft*
- WG or host family, no WG guarantee, fallback to host family.
- **CASA cannot help you find a flat** but will send useful links on request.

*Kündigungsbedingungen*
- **4 weeks' notice, counted in full weeks. Cancel more than 4 weeks out → refund minus
  €100. Later → you owe everything falling inside the 4-week window.**
- **Cancellation in writing only** — email or letter. Verbal cancellations are not accepted.

The underlying rules are all in `/terms` §6 and §7, which we translate faithfully. The
FAQ is where a prospective student actually reads them.

### `/aktuelles` → `/news`
Our NewsFlash carries the changed August office hours. Missing: the **Sprachtandem
partner appeal** (Russian, Italian, Turkish, Arabic, Chinese, Persian) — CASA's only
other current post.

### `/gallerie` — no page on our side
A small page, but the German homepage links it prominently as "Visit our Gallery", and
we have a numbered photo-placeholder system (`src/config/content/photo-numbers.ts`) that
a gallery route would fit naturally.

### `/datenschutz` → `/privacy`
Not a copy task — a legal one, and it should not be "improved" by an agent. For the record:
the German policy is a full DSGVO text (~38k characters, 11 numbered sections: definitions,
controller, cookies, log data, site registration, contact form, data-subject rights a–i,
**Facebook plugins**, legal bases, retention). Ours is a 7-section summary (~2.5k). Two
concrete notes: (1) the German policy's Facebook-plugin section describes an embed — worth
checking whether our build has any equivalent third-party embed that needs disclosing;
(2) the German homepage carries Oracle Eloqua tracking parameters (`elqaid`, `elqak`,
`elqat`) that the policy does not appear to cover. Route both to whoever owns legal review.

---

## What was fixed, and where

**Wrong values.** Evening German was rendering **€378** (the spring trimester) where
CASA publishes **€476** for the autumn term currently on sale — corrected in
`db/migrations/0003_correct_published_course_facts.sql` and in the seed, with
`pricing_mode: 'fixed'` because a per-trimester fee does not scale down. "Context"
is now **Kontext** everywhere, including the type literal. Bildungszeit entry
corrected from A2 to **B1**.

**The database was nearly empty.** Neon held **two** course types and two
placeholder instances written relative to `now()` — everything else came from
fixtures via a top-up, which is why so much of the site read as provisional. The
seed now carries all seven real formats and CASA's published term table:
eight intensive terms across two cohorts, both evening tracks, three Bildungszeit
blocks. `0004_seeded_course_pricing_modes.sql` sets `pricing_mode` on the rows the
seed created, which it could not do before because the seed predated the column.

**A latent crash, surfaced by real data.** `startDate.localeCompare` threw a 500 on
the homepage and `/courses` the moment a course had more than one instance — Neon
hydrates a `date` column into a JS `Date`, the row type says `string`, and
`Array.sort` never calls its comparator on a one-element array, so the bug sat
dormant behind the sparse data. Fixed with a boundary normaliser
(`toIsoDateString` in `src/lib/content/repository.ts`).

**Four courses CASA does not offer** are gone from the fixtures, the homepage, the
narratives, the route map, the archetype registry, the registration validation and
the assistant's prompt: `university-prep`, `business-german`, `summer-intensive`
and `integration-german` — the last of which contradicted CASA's own FAQ.

**Firmenunterricht** no longer promises HR an accommodation and culture programme.
`package-inquiry` gained a `quoteAudience` (`'group' | 'organisation'`) so a
visiting school group and a Bremen employer get their own copy, journey and
inclusions. **German for Medical** lost its invented €400 price, 4 lessons/week and
fixed dates; `lessons_per_week: 0` is now the "not published" sentinel and the rail
renders it as "On request".

**The facts that existed but never rendered.** `buildSelectorCopy` was building the
real fee set and handing it to a component that accepted the prop and dropped it.
Fees and conditions now live in `src/config/courses/course-practical-facts.ts`
(bilingual, sourced) and render in two new sections — `CoursePracticalDetails` and
`CourseTermTable` — added to the archetype section lists. `/courses` renders them
too, from the same registry rather than a second copy of the numbers. The heading
that said "Six routes" is now spelled from the array, having gone stale the moment
a seventh format existed.

**Twelve real colleagues** replaced six invented ones. Anna Keller, David Stein,
Melanie Hoffmann, Kareem Yilmaz, Sofia Martin and Lucas Brandt are gone, along with
their bios, their "focus" areas and their LinkedIn links pointing at
linkedin.com. `/team` lists the people CASA publishes, with the responsibilities
CASA publishes beside them, and renders a **monogram** — the six synthetic portrait
files are deleted, because a generated face beside a real colleague's name is a
worse misrepresentation than an invented colleague was. `TeamSpotlight`'s invented
fields are optional now; a required field is an instruction to make something up.

**The teacher spotlight** on every course page named Anna Keller. CASA deliberately
does not name individual classroom teachers, so there is no honest named
replacement — the rail now carries what CASA says about all of them (native
speakers with university degrees, most having lived abroad).

**Seven real testimonials** replaced twelve invented ones that carried
`verificationStatus: 'verified'` and `sourceUrl`s pointing at CASA's real Google
Maps listing and real Instagram. Narges, Fatameh, Sulaiman, Laura, Majd, Ahmed and
Elena now appear on the courses they were written about, in the language they were
written in, with **no portraits** — CLAUDE.md hard rule 2. `package-inquiry` and
`module-catalogue` gained a testimonials section, because the old rationale for
excluding them ("learner voices, organiser reader") stopped being true once the
quotes were Elena's and Majd's.

**The FAQ** is CASA's, in `src/config/courses/../content/faq.ts`: 22 entries per
locale, each carrying its source. The 48 invented ones are gone. It now answers
that courses cannot be funded by the BAMF or the Jobcenter, that a language visa
needs 20 lessons a week for three months, what a delayed or refused visa costs,
that a visa-bound contract cannot be cancelled by the participant, and the
four-weeks-in-writing cancellation terms. **Cancellation** is its own filter topic
because it is a whole section of CASA's FAQ and the question people are most
anxious about.

**CLARA's knowledge** was going to describe Business German and University
Preparation to visitors, quote €520 for the telc B2 preparation course (it is
€260), and state that utilities are included in the shared flats. Corrected, along
with the accommodation eligibility rule it was omitting entirely.

**One correction to this report.** The green-hosting statement is *not* missing —
`src/config/accreditations.ts` already carries Green Planet Energy with the
"Hosted with green energy from" preface. And CASA publishes **seven** testimonials,
not five as first counted.

## Remaining

1. **The four missing pages.** `/levels` (CEFR descriptors including the
   CASA-authored B1+ text, which exists nowhere else), `/tandem` (the TANDEM
   Germany network membership — one of six schools in Germany — plus the form and
   the partner appeal), `/gallery`, and a contact page carrying all four email
   addresses, the fax, office hours and the closure dates.
2. **Per-page detail** from §4: accommodation eligibility and house rules, the
   medical syllabus, the group culture programme, the exam disclaimers and result
   timing, the placement-test process rules, the eight special-course module
   descriptions, the Volksbildung/Völkerverständigung grounds, the English evening
   courses, and Here Ahead / Garantiefonds on the homepage.
3. **Registration forms:** the telc identity fields (address, postcode, city,
   place and country of birth, mother tongue, ID number), course end date, the
   placement-test flag, and surfacing the visa-bound-contract and
   no-WG-guarantee warnings at the point of choice.
4. **Two questions for the office** (unchanged): is TestDaF still offered, and are
   the English evening courses still running?

## Suggested order of work

1. **Fix what is wrong before adding anything.** Evening price 378 → 476 in the seed;
   "Context" → "Kontext"; strip the four non-existent courses from `src/app/page.tsx` and
   the fixtures; move `/courses/firmenunterricht` off the group archetype; remove the
   invented Medical price, weekly load and dates.
2. **Render the facts we already have.** `buildSelectorCopy`'s `facts` array, the intensive
   morning/afternoon schedule, and the published term tables for intensive, Bildungszeit
   and evening. This is the largest visible gain for the smallest diff.
3. **Replace fabricated people and quotes** with the twelve published staff (names and
   roles only — the portrait rule stands) and the five real testimonials, each on the
   course it belongs to.
4. **Rewrite `/faq` from the source.** 15 real answers instead of 48 invented ones.
   Highest-value single page on the list: it is where visa, funding and cancellation
   questions actually get answered.
5. **Add the four missing pages:** `/levels` (CEFR + the B1+ descriptor), `/tandem`
   (network membership, form, partner appeal), `/gallery`, and a real contact page
   carrying all four email addresses, fax, office hours and closure dates.
6. **Fill in the per-page detail** in §4 — accommodation eligibility and house rules, the
   medical syllabus, the group culture programme, the exam disclaimers and result timing,
   the placement-test process rules, the special-course module copy.
7. **Registration forms:** add the telc identity fields, course end date, placement-test
   flag, and surface the visa and WG-availability warnings at the point of choice.
8. **Two things to raise with the office rather than guess at:** whether TestDaF is still
   offered (the German site's nav and FAQ disagree), and whether the English evening
   courses are still running — they are advertised on the homepage and in the Leitbild but
   have no page, no dates and no price anywhere on the German site.

## Where the source text lives

The scrape is in this session's scratchpad, not in the repo:
`/private/tmp/claude-501/-Users-rahmanshafiee-Downloads-CASA/3bdb1db5-d215-4267-9064-5fb64ab3f633/scratchpad/`
— `de/*.html` raw, `txt/*.txt` extracted, `core/*.txt` with nav and footer stripped.
Worth committing under `docs/source-snapshots/` if we want to diff future terms against
this baseline instead of re-crawling.
