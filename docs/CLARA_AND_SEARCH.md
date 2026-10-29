# CLARA and the site search

Rahman, 2026-10-12: "improve CLARA, the chatbot training data and overall performance … as well
as the search, make it more dynamic and intelligent." Both now read one knowledge index of the
whole live site. CLARA answers from it, with today's prices and dates, and the search box finds
every page. Both run on CASA's own server; the privacy policy's promise (§17, „Assistent und
Suche": no external AI service, messages go to no third party) stays true. An AI mode exists and
is switched off; see below.

## How it works

```
the live site ──► knowledge index (src/lib/knowledge) ──► search  (/api/search/suggest, /search)
                     ▲            ▲                    └─► CLARA   (/api/assistant)
   rendered pages ───┘            └─── FAQ, catalogue, course facts, CLARA's passages
```

**The index** (`engine.ts`) holds every page section, course, exam, FAQ answer and news item as a
document and ranks with BM25 over title, heading, keywords and text. It forgives what people
type (`text.ts`):

- umlauts left out or written out: „Prüfung" = "prufung" = "pruefung"; ß = ss;
- endings: "Kurse", "Kursen" = "Kurs"; "courses" = "course";
- synonyms in both languages, as concepts: „Kosten" finds a „Preis", "fee" a „Gebühr",
  "host family" a „Gastfamilie" (`CONCEPTS` in `text.ts`; add a word there when a visitor's word
  finds nothing);
- typos (one in a word of 4–7 letters, two from 8): "untrekunft", "accomodation";
- German compounds split or joined: „Abendkurs" = "abend kurs", „Prüfungsvorbereitung" also
  finds "Prüfung" + "Vorbereitung";
- the other language: "evening course price" on the German site;
- half a word while typing in the header box.

**What goes in** (`index.server.ts`), both languages:

1. *Structured, at once:* the FAQ, the course and exam catalogue with their live values, the
   course pages' practical facts (fees, summary, conditions), the news, CLARA's hand-written
   passages (`curatedPassages()` in `src/lib/assistant/tools/search-public-kb.ts`), and one
   document per page from the website editor's catalogue (every text the page renders).
2. *The rendered pages, in the background (production only):* `crawl.server.ts` reads every page
   in the sitemap from the server itself (`http://127.0.0.1:$PORT`), and `html.ts` splits each
   page's `<main>` into sections by heading. What a visitor sees is what search finds: the
   editor's published texts, today's prices and dates.

Refreshed on a timer: the structured part every 10 minutes (with the live values), the pages
every 20, so a text published in the website editor is findable within 20 minutes. The first
read after a start takes about a minute (64 pages, ~930 sections); until then the structured
part answers. `CASA_KNOWLEDGE_CRAWL=on|off` overrides the default (on in production, off in
development, where every page read compiles the page).

**Quick answers** (`answers.ts`): a question about a price, a start date, an exam date or
deadline, the weekly lessons, the office hours, the address or how to reach CASA is answered
with the live value itself — the same value the page prints (`src/lib/cms/facts.server.ts`).
"Was kostet der Intensivkurs?" → the 4- and 8-week prices, the extra week and the enrolment fee.
The search page shows it as "Direkt beantwortet" above the results; CLARA says it.

## CLARA's turn (`src/lib/assistant/runtime.ts`)

1. A question asking for documents → the fixed safety answer.
2. Visa → the fixed, reviewed answer. A question about CASA's own rules (a refused visa, a
   postponement, the visa letter) also gets the passage that states them — never one naming a
   minimum course length or weekly load (`VISA_FIGURES`): the embassy decides those.
3. A price, a date, office hours → the quick answer.
4. Exams, accommodation, registration, careers, guides, contact → the site's answer
   (`grounded.ts`: the best FAQ answer or page section, quoted in a few sentences) with the
   canned flow's button, links and next steps. A login question keeps the fixed answer: there is
   no learner login.
5. "Help me find a course" → the course finder (level, then schedule, then course cards).
   A question about courses ("Was ist B1+?") is answered from the site instead.
6. Anything else → the site's answer, or "I could not find a reliable answer" with the contact
   options. CLARA never invents: what the site does not say, she does not say.

`grounded.ts` prefers the passage that fits the kind of question: an amount for a price question,
times for a "what time", dates for a "when". The widget sends the page it is open on, so "what
does this cost?" on a course page means that course.

## CLARA's panel (`src/components/assistant`, 2026-10-29)

- **She opens on two short lines and four starting points** (course, exams, accommodation,
  contact, with the site's 3D icons), not a paragraph about what she can do (Rahman: the
  introduction was too long).
- **Following a link closes her**, and so does going to another page or back: she was still open
  on the homepage when a visitor came back to it. She closes by playing her way out, not at once:
  taking the link out of the page in the same click made Next do a full reload.
- **The conversation outlives the panel.** The launcher holds it, so a visitor who follows a link
  and opens her again finds it there; „Neues Gespräch" starts over. Memory only, gone with the
  tab: nothing is written to the browser (privacy policy §5).
- **She speaks the page's language** until an answer comes back in another (the API reads the
  question's language). The language menu, with three languages marked „Bald", was removed.
- **While she looks, she says what she is doing** (reading the question, looking through the
  pages, putting the answer together), beside three breathing dots.
- **On a phone she is a sheet** the height of what is visible, so the keyboard never covers the
  field; from `sm` a panel above her button. Motion: UI_SYSTEM.md §Motion; off under reduced
  motion.

## The AI mode (switched off)

`src/lib/assistant/ai.server.ts`. With it on, a language model writes CLARA's answer as
conversation, from exactly what the deterministic turn found: the passages for the question, the
live values and the deterministic answer as a draft it must not contradict. It never decides
the button, the links or course cards, and visa, safety, login and course-card answers never
reach it. A German answer that says „Sie" to the reader is discarded, and any failure or a reply
slower than 8 seconds falls back to the deterministic answer.

**To switch it on (CASA's decision):**

1. Rewrite the privacy policy's §17 („Assistent und Suche", `src/lib/content/published-legal.json`
   and `docs/PRIVACY_POLICY.md`): the visitor's messages then go to the model provider, who must be
   named, with a data processing agreement in place.
2. Create an API key (Anthropic, or Claude through Microsoft Azure if CASA prefers its existing
   Microsoft contract) and set `ANTHROPIC_API_KEY` and `CLARA_AI=on` on the Container App.
   `CLARA_AI_MODEL` picks the model (default `claude-haiku-5-5`, a small fast model: about
   3,000 words of sources go in per answer, which at small-model prices is well under a euro per
   hundred answers; check the provider's current price list).
3. Run `npm run qa:clara` against the deployment and read `output/golden/live-clara.txt`.

## Measuring it

`src/lib/knowledge/__tests__/golden-questions.json` holds 124 questions visitors ask (72 German,
52 English; carefully and carelessly typed; five deliberately out of scope), each with the pages
that answer it and the facts a right answer contains.

- `npm run test` runs them against the structured half (`golden.test.ts`) and fails if search or
  CLARA get worse than the floors in that file. `GOLDEN_REPORT=1 npx vitest run golden` writes
  every miss to `output/golden/`.
- `npm run qa:clara` asks a running server through the public APIs, with every page read:
  `npm run build && PORT=3018 npx next start -p 3018`, wait for `[knowledge] pages read` in its
  log, then run it.

| 2026-10-12 | before | structured half | production |
| --- | --- | --- | --- |
| Search: the answering page first | 31% | 79% | 78% |
| Search: in the top three | 39% | 90% | 94% |
| CLARA: points to the answering page | 37% | 90% | 95% |
| CLARA: states the facts | 7% | 74% | (see qa:clara) |

When a visitor's question finds nothing useful: add it to the golden set with the page that
answers it, then fix the cause — usually a missing synonym in `CONCEPTS`, a missing FAQ entry, or
a page that does not say it.

## Rules

- **CLARA quotes the site; she does not compose facts.** A figure in an answer comes from a live
  value or a passage. Change a price in the database or the price list, not in a passage.
- **The curated passages can drift** (the medical course's price did, 2026-10-12). The rendered
  pages outrank them in production; when a passage and its page disagree, fix the passage.
- **German says du.** The golden test checks every German answer for „Sie".
- **Nothing personal is stored.** CLARA's messages and search queries are processed in memory and
  logged only as counts and timings, as §17 says.
