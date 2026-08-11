# Copy Review & Course Page Archetypes

Date: 2026-08-11
Author: Claude Code review pass
Status: recommendations — no code changed by this pass

## Method and limits

- Reviewed from source, not from a rendered site. `node_modules/lucide-react` does not exist
  and `lucide-react` is absent from `package.json`, so `npm run dev` cannot resolve ~47 imports.
  This is the known open item in `CLAUDE.md`; it blocked a rendered walkthrough.
- Compared repo content against the live TYPO3 site at `casa-bremen.de` (homepage, language
  courses index, special courses, German for groups, exam centre).
- Deep-read: homepage, `/courses`, `/courses/[slug]`, `/exams`, `/about`, `/accommodation`,
  `/ueber-uns/gemeinnuetzigkeit`, `/careers`, `/team`, `/faq`, `/calculator`, nav and footer
  config, and the course/hero content modules. Sampled: news, resources, registration, legal.
- Another agent is active on this repo. Nothing here was applied.
- **Amended 2026-08-12.** Every course figure was re-checked against the live site and the
  results are tabulated in `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md`, which supersedes the numbers
  in this document. Two suspicions raised below were disproved: Bildungszeit at 40 hours/week is
  correct, and Evening German at 4 UE / €476 is correct. Use the factbase, not this file, when
  changing data.

---

# Part A — Cross-cutting copy problems

These repeat across many pages, so fixing them at the source file fixes every page at once.
They are ordered by risk, not by effort.

## A1. Fabricated testimonials are flagged as verified

`src/config/content/course-narratives.ts` defines twelve `studentStory` entries through a
`makeStory` helper that hardcodes `verificationStatus: 'verified'` (line 15) and attaches a
`sourceUrl` pointing at a real CASA page or the CASA Instagram account.

The quotes are invented, and the named people — "Sara K." (Jordan), "Mateo R." (Colombia),
"Nour A." (Egypt), "HR Manager, Logistics SME" — do not correspond to verified individuals.
The `sourceUrl` makes them look sourced. These render publicly through `TestimonialGrid` on
every course detail page and on the homepage social-proof block.

This breaks hard rule 2 in `CLAUDE.md` ("no person-specific portraits with named testimonials
unless the identity and the quote-to-person relationship are explicitly verified"). The portrait
half of that rule was already cleaned up in pass 8; the quote half was not.

**Fix, in order of preference:**

1. Collect three to five real, consented student quotes and drop the rest. Consent needs to
   cover the quote, the display name form, and the country.
2. Until then, change `verificationStatus` to `'draft'` and have the rendering components skip
   anything that is not `'verified'`. This is a small change and it makes the rule enforceable
   rather than advisory.
3. Replace the section with non-attributed, honest framing that does not fabricate a person —
   for example a "What learners tell us most often" list written by the teaching team and
   labelled as a summary rather than a quote.

Do not simply remove the names and keep the quotes. An unattributed invented quote is still an
invented quote.

## A2. German copy has systematically stripped diacritics

The German half of `course-narratives.ts` has lost its umlauts, and in one case gained a space
inside a word. Routing is EN-only today, but German is the actual market language in Bremen and
this content is what ships when DE routing turns on.

| Line | Current | Should be |
| --- | --- | --- |
| 205 | `taglicher Sprechpraxis` | täglicher |
| 206 | `Verlasslicher Lernrhythmus` | Verlässlicher |
| 207 | `Wochentliche Lernchecks` | Wöchentliche |
| 218, 271 | `Berufstatige` | Berufstätige |
| 224 | `spurbare Fortschritte` | spürbare |
| 235 | `Ubung vor Theorie` | Übung |
| 315 | `Bessere Horverarbeitung` | Hörverarbeitung |
| 318 | `aufgehort im Kopf zu ubersetzen` | aufgehört … übersetzen |
| 341 | `Fach- und F uhrungskrafte` | Fach- und Führungskräfte |
| 342 | `Kundengesprache` | Kundengespräche |
| 346 | `Lieferantengesprache … fuhren` | Lieferantengespräche … führen |
| 358 | `Intensivunterricht tagsuber`, `Aktivitatsbezogene` | tagsüber, Aktivitätsbezogene |
| 370 | `Behorden`, `Behordenvokabular` | Behörden, Behördenvokabular |

Line 341 (`F uhrungskrafte`) has a literal space mid-word, which suggests these were damaged by
an encoding round-trip rather than typed this way. Worth grepping the whole content layer for
the same pattern, not just this file.

Separately, German dash usage is inconsistent: `src/app/page.tsx:349` uses a hyphen
(`Deutsch lernen in Bremen - mit klarem Weg`) while the English sibling on the same page and the
About page's English variant (`src/app/about/page.tsx:104`) use an en dash. Pick one and apply it.

## A3. Published facts do not match the real CASA offer

This is the highest-impact copy problem, because every other improvement sits on top of it.
`src/config/content/public-fixtures.ts` supplies prices and weekly hours that are treated as
real by the UI — the course detail page renders `Price from {default_price} EUR` at
`src/app/courses/[slug]/page.tsx:248` with no draft marker.

| Product | This repo says | casa-bremen.de says |
| --- | --- | --- |
| Intensive German | `Price from 940 EUR`, 20 lessons/wk | €520 for 4 weeks, €940 for 8 weeks. "From" should be €520. |
| Special Courses | 8 lessons/wk, €460 | One 90-minute session per week, 12 weeks, €192, 18:30–20:00 |
| German for Groups | 6 lessons/wk, €360, described as a conversation lab | 20 hours/week, host-family accommodation, culture programme, transit pass, participation certificate, individual quote by email |
| Bildungszeit | 40 lessons/week, €640 | 40 hours/week is **correct** — educational-leave recognition requires 30–40 hrs/week and CASA's superintensive courses meet it. The **price** is wrong: €280 for 1 week, €520 for 2 weeks |
| Firmenunterricht | `Price from 1200 EUR` | Quote-based; publishing a number here is a commitment CASA may not want |
| TestDaF | Active exam type, €215 fee, listed beside telc | Appears only as a logo/affiliation. No dates or fees published. Likely not an administered exam at CASA. |
| university-prep, business-german, summer-intensive, integration-german, exam-preparation | Full narratives, prices, level ranges | Not in the live course menu at all |

**The worst single item** is `src/lib/content/course-routes.ts:5`:

```ts
'conversation-lab': 'german-for-groups',
```

The route, the nav label, and the page title say "German for Groups". Every word of copy on that
page — audience, promise, outcomes, teaching style, testimonial — describes a conversation club
for learners with speaking anxiety. On the real site, "Deutsch für Gruppen" is a school-class
travel package sold to group organisers. A teacher planning a class trip to Bremen lands on that
URL and reads a product that does not exist. Two different products have been merged into one
slug.

**Action:** treat prices and hours as unverified until a staff sync confirms each one. Until
then either mark them `TODO`/`ASSUMPTION` per the repo convention, or gate them behind
`NEXT_PUBLIC_SHOW_DRAFT_CLAIMS`, which already exists for exactly this purpose. Split
`conversation-lab` and `german-for-groups` into two products before anything else on that page
is rewritten.

## A4. Template filler reads as filler

The course detail template hardcodes body copy that is identical across all nine course pages:

- `src/app/courses/[slug]/page.tsx:361` — "This course fits learners who want structure and human support"
- `:368–372` — "Clear weekly learning goals / Practice tasks with direct feedback / Next-step orientation for exams or daily life"
- `:411` — "How learners describe this course", above the same three testimonials every time
- `:350–353` — the fallback outcomes list, used whenever a narrative has none

None of it distinguishes a doctor preparing for the Fachsprachprüfung from a warehouse team
doing on-site German. It is the copy equivalent of the template problem in Part C, and it will
resolve as a side effect of fixing that — but if the archetype work is deferred, this specific
copy should still be moved into per-course content.

## A5. Three outright string bugs

Small, but user-visible and quick:

- `src/app/courses/[slug]/page.tsx:220` — `locale === 'de' ? 'Next start date' : 'Next start date'`. German branch is English.
- `:231` — same pattern for `'Duration'`.
- `:360` — same pattern for the `'For whom'` eyebrow.
- `:467` — `infoTitle={locale === 'de' ? 'Ihre Entscheidung' : 'Your decision rail'}`. "Decision rail" is the internal name of the component. It is printed as a heading to the public.

## A6. Eyebrows label the CMS, not the reader

"Course detail", "Course information", "Exam information", "Accommodation Detail", "Article",
"Legal" (`src/config/content/heroes.ts`). These tell a visitor what kind of page they are on,
which they already know. The eyebrow slot is prime real estate above an H1; spend it on the
thing that makes the page worth reading — level range, next start, who it is for, or the
certificate it leads to.

## A7. Nonprofit framing is a page, not a thread

`docs/GOOGLE_AD_GRANTS_COMPLIANCE.md` records that the Ad Grants review flagged the site as too
commercial. The remediation added one strong page (`/ueber-uns/gemeinnuetzigkeit`), a nav entry,
a footer mention, and structured data. That is the right foundation, but the public-benefit
reason-to-exist is still absent from the surfaces a reviewer actually samples first.

The homepage hero (`src/app/page.tsx:348–356`) and the "Why CASA" block (`:445–460`) are both
purely transactional: choose a course, add an exam, get support. Neither says CASA is a
gemeinnützige GmbH or what that changes for the learner.

**Concrete suggestion for the hero proof line** (`:356`), replacing
"Course advice, telc preparation, and arrival support in Bremen":

> Non-profit language school in Bremen since 1983 — fees fund teaching, integration projects, and learner support, not shareholders.

That claim is defensible from the existing gemeinnuetzigkeit page and is the kind of sentence an
Ad Grants reviewer is looking for. Confirm the 1983 founding year with staff first — it appears
in `heroes.ts:105` and `src/app/about/page.tsx:220` but is not verifiable from the live site.

---

# Part B — Page-by-page notes

Only the pages with page-specific issues beyond Part A are listed. Everything in Part A applies
throughout.

### `/` — Homepage
Strong bones. The four dashboard metrics are correctly limited to approved aggregates. Two
issues: the hero promises "a clear path from course to everyday life" but the first interactive
element below is a format picker, which is a catalogue, not a path — the `GuidedPicker` heading
"Find the course format that matches your goal" is more honest than the hero. And "Additional
programs / Bildungszeit and special routes" is a leftovers bucket; those are real products with
real buyers and should not be framed as extras.

### `/courses` — Course index
The comparison rail labels (Schedule, Best for, Typical outcome, Weekly load, Pace, Fees,
Additional costs) are genuinely good and worth keeping. But they assume every course has a
weekly load and a fee, which is exactly the assumption Part C breaks. Group and company courses
will render blanks or misleading numbers in that table.

### `/courses/[slug]` — Course detail
See Part C. This is the main structural finding.

### `/exams`
Clean. Fix the TestDaF entry. If CASA prepares candidates for TestDaF but does not administer
it, say that explicitly — "preparation available, exam sat externally" — because the current
presentation puts it in the same list as the two telc exams CASA actually runs.

### `/about`
The Leitbild quote "Miteinander reden – aufeinander zugehen" is the best line of copy on the
site and it is buried below a timeline. It should be the About hero, and arguably it belongs on
the homepage. The 1983 / 1990s / Today timeline needs date verification.

### `/accommodation`
"2026 planning basis" is honest framing for provisional costs — this pattern should be reused
for course prices in Part A3 rather than inventing a new one.

### `/ueber-uns/gemeinnuetzigkeit`
Content is right. The three pillars (Keine Gewinnausschüttung / Bildung und Integration /
Transparente Mittelverwendung) are abstract. Each needs one concrete proof point — a named
integration project, a number, a year. The compliance doc lists Here Ahead, Garantiefonds
Hochschule, and Tandem as the proof; make sure those are stated as facts with dates, not as
card titles.

### `/team`
Blocked on hard rule 3 — the portraits are synthetic placeholders. The page should not go live
in this state. Consider shipping a team page without individual portraits rather than with
fake ones.

### `/calculator`, `/placement-test`, `/faq`, `/careers`
No page-specific copy problems found. The FAQ's three-step "Pick topic / Review answers /
Contact team" process block is unnecessary — a visitor on an FAQ page does not need to be
taught how to read an FAQ.

---

# Part C — The single course template, and how to fix it

## What is actually wrong

`src/app/courses/[slug]/page.tsx` renders one fixed composition for all nine courses:

```
HeroCUtilityRail  →  summary strip  →  CourseLevelGoals  →  EditorialSplit "For whom"
→  ProcessSteps "After choosing this course"  →  TestimonialGrid  →  related courses
→  DecisionRail
```

Variation is faked by two hardcoded slug lookup maps inside the route file itself:
`getCoursePhotoKey` (lines 25–39) and `getCourseLevelGoals` (lines 47–126). Four of the nine
routed courses — `special-courses`, `bildungszeit`, `university-prep`, `business-german` — are
not in the second map at all, so they fall through to a generic two-row A1–B1 / B2–C1 fallback.

This is the ad-hoc branching that `MEMORY.md` already warns against. But the more useful framing
is that the template fails in three separate ways, which need three separate fixes:

**1. It shows facts that do not exist.** The info rail (lines 218–250) always renders Next start
date, Duration, Lessons/week, Level range, and Price from. Firmenunterricht has no public start
date and no fixed price — it has a needs analysis and a quote. German for Groups has no price at
all. The template invents `'8 weeks (example)'` as a duration fallback (line 236) and prints it
to the public.

**2. It ends in the wrong action.** Every course routes to `/registration/course` or
`/placement-test`, chosen by whether `level_min` starts with "A" (lines 194–204). An HR lead
evaluating team training and a teacher organising a school trip both get a learner registration
wizard. Neither will complete it. On the live site, group enquiries go to a named person by
email precisely because the product needs a conversation.

**3. It answers the wrong questions.** A doctor wants to know about FSP, Anerkennung, and
whether the course counts toward licensing. An HR lead wants delivery model, on-site vs hybrid,
scheduling around shifts, and who gets invoiced. A school organiser wants age bands,
supervision, host families, transport, and insurance. The template asks none of these, because
it was designed around one buyer: an individual adult picking a start date.

## The fix: course page archetypes

Do not build nine bespoke pages. Define four **archetypes** — each a fixed, designed section
order with its own facts rail and its own CTA policy — and have each course declare which one it
uses.

| Archetype | Courses | The question the buyer is asking | Facts rail shows | Primary CTA |
| --- | --- | --- | --- | --- |
| `scheduled-cohort` | intensive, evening, bildungszeit, university-prep | "Which start date, which level, how much?" | Next start, duration, lessons/week, level, price | Register / placement test |
| `module-catalogue` | special-courses | "Which module, and does the slot fit my week?" | Module list, weekday + time, weeks, price per module, level prerequisite | Reserve a module seat |
| `professional-track` | medical, business | "Does this get me to my licence or my role?" | Target qualification, level entry requirement, duration, price | Book an advisory call |
| `package-inquiry` | german-for-groups, firmenunterricht | "Can you build this for my group, and what will it cost?" | Group size range, typical duration, what is included, lead time — **never a price** | Structured request for quote |

Why four and not nine: the archetype is defined by the *buying decision*, not by the subject
matter. Medical German and Business German are different content but the same decision. Group
travel and corporate training are wildly different content but the identical decision — a
non-learner buying on behalf of others, needing a quote.

## Implementation shape

Matches existing repo patterns (config-driven composition, slot-based, fallback-safe):

```
src/config/courses/archetypes.ts       archetype id → ordered section keys, rail spec, CTA policy
src/config/courses/course-profiles.ts  slug → { archetype, levelGoals, photoKey, facts, faq }
src/components/courses/sections/       one component per section key
src/app/courses/[slug]/page.tsx        resolve profile → archetype → render the section list
```

Four rules that make this work:

1. **The facts rail is archetype-driven, not a fixed five-row list.** A `package-inquiry` page
   physically cannot render a price, because the archetype does not define that row.
2. **The CTA is a policy on the archetype**, not a ternary on `level_min` inside the route file.
3. **`getCourseLevelGoals` and `getCoursePhotoKey` move out of the route** into
   `course-profiles.ts`. The route file stops knowing course slugs entirely.
4. **A course with no declared archetype defaults to `scheduled-cohort`.** That makes the first
   migration step a no-op at the pixel level and therefore safe to verify by diffing rendered
   output.

## Migration order

1. **Registry + `scheduled-cohort`.** Renders identically to today. Pure refactor, verifiable by
   comparing rendered HTML before and after. No copy decisions needed, no staff input needed.
2. **`package-inquiry`.** Highest business value. Groups and Firmenunterricht are quote-driven
   revenue currently being served a learner registration form. Needs a real quote-request flow
   capturing group size, age band, dates, weekly hours, focus, meals, accommodation, transport,
   and invoicing party — the same information Ina Eismann collects by email today. Route it to a
   `GROUP_INQUIRY_WEBHOOK_URL` following the existing optional-webhook pattern in
   `src/lib/db/env.ts`.
3. **`professional-track`.** Needs staff input on FSP and Anerkennung claims, which are
   regulated statements and must not be improvised.
4. **`module-catalogue`.** Needs the real special-course schedule (five course families,
   90 minutes weekly, 12 weeks, €192) — the data exists on the live site and can be lifted.

Note that `src/app/design-system/course-format-variants/page.tsx` already exists but reviews
*homepage section* variants, which is a different and shallower problem. Once the archetype
registry exists, that page becomes the natural place to preview all four detail archetypes side
by side.

---

# Part D — Positioning with the student app and the dashboard

## The student app is the differentiator, with one caveat

`lernen.casa-bremen.de` — invite-only structured daily German practice, 448 activity sets, 1,486
items, deterministic scoring, teacher feedback, streaks, an opt-in class league. No other
language school in Bremen has anything comparable, and it is the strongest argument the website
has for choosing CASA over a cheaper competitor.

The caveat: its own README describes it as a **controlled production pilot** where broader
student onboarding still requires named pilot setup. The website must not promise it as a
guaranteed included feature. Overselling it is the same category of mistake as the fabricated
testimonials.

**Three honest ways to use it:**

1. **As a course-page section, not a homepage banner.** One paragraph plus a screenshot on
   `scheduled-cohort` pages: what it is, that practice is reviewed by CASA teachers, and that it
   is rolling out to CASA course students. Present availability accurately.
2. **In the "Why CASA" block** as the third bullet, alongside course advice and telc preparation
   — "practice between classes, with feedback from your own teacher."
3. **As Ad Grants evidence.** This is the underrated one. The app is CASA reinvesting fee income
   into free learning infrastructure for its own students. That is a far more concrete
   public-benefit proof than the current abstract "Keine Gewinnausschüttung" card, and it is
   exactly the kind of thing the Ad Grants review was asking the site to demonstrate. It belongs
   on `/ueber-uns/gemeinnuetzigkeit` as a named proof point.

## On the brand mismatch

The app and the website are currently two different design systems. The app uses Playpen Sans
for display, Manrope for interface, and a semantic skill palette — blue for listening and
information, teal for progress and writing, gold for speaking and milestones, coral for errors
and reading, violet for grammar. The website uses the `--casa-*` tokens with heavy `font-black`
weights throughout.

Decide this deliberately rather than letting it drift. My recommendation: keep the website's
typographic identity — it is more appropriate for a page that also has to speak to HR leads and
Ad Grants reviewers — but **adopt the app's skill colour semantics** for level badges and skill
labelling on course pages. Then A1–C1, listening, speaking, reading, and writing read the same
way in the marketing site and in the product a student uses daily. That is a cheap change with a
disproportionate effect on feeling like one organisation.

## On the dashboard

Keep it invisible. Its only public role is as the source of reviewed aggregate metrics — the
30,000+ / 150+ / 7–80+ / 45,000+ figures already in use — and eventually the
`website_metrics.json` feed noted in `MEMORY.md`. Hard rule 1 exists for good reason; do not
weaken it to make the site look more impressive. "We are replacing our internal systems" is not
a student-facing benefit.

---

# Part E — Sequenced plan

**P0 — credibility. Nothing should go live before these.**

1. Fix or suppress the fabricated testimonials (A1).
2. Reconcile every price and weekly-hours figure against the live site and staff (A3).
3. Split `conversation-lab` from `german-for-groups` (A3).
4. Confirm or reclassify TestDaF (A3).
5. Fix the German diacritics, the three untranslated labels, and "Your decision rail" (A2, A5).
6. Confirm or remove the 1983 founding year and the `40+ staff` draft claim.

**P1 — structure.**

7. Course archetype registry plus the `scheduled-cohort` parity refactor (C).
8. `package-inquiry` archetype and the group/company quote flow (C).

**P2 — differentiation.**

9. `professional-track` and `module-catalogue` archetypes (C).
10. Student-app section on course pages, and the reinvestment story on the gemeinnuetzigkeit
    page (D).
11. Nonprofit thread through the homepage hero and Why-CASA block (A7).

**Unblock first:** `lucide-react` is missing from the dependency tree. Until that is restored, no
rendered verification of any of this is possible.
