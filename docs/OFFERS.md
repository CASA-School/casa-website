# Offers — the offers module

`/admin/offers` · module `offers` · full screen, like the website editor · branch `admin` (2026-10-13)

Read this before touching `src/app/(admin)/admin/(editor)/offers`, `src/components/admin/offers`,
`src/lib/admin/offers`, migration 0021 or the group packages in `src/config/gruppen/packages.ts`.
The letter an offer is sent as is a CASA letter like any other: `docs/LETTERS.md`.

---

## The job

CASA makes offers (Angebote) to groups — Ina is the group coordinator and writes most of them — and
to everyone else who asks what something would cost: a learner who needs a figure for a visa or the
Jobcenter, a company, an agency. The offer is a letter with prices; the answer decides whether a
group comes. Until now this lived in FileMaker. The module replaces it, does the arithmetic FileMaker
left to people, and records what happened to every offer.

**Who may use it:** owners and admins by role; everyone else per person on the Team screen
(`staff` has `none` by default). `edit` writes, sends and records answers; `full` also deletes.

## Design (Rahman, 2026-10-13)

Two attempts were rejected the same day — a form of stacked cards, then a builder of switches and
steppers with a summary rail — as cluttered, "messy", "not a good experience for staff". The
direction Rahman chose, and the rules that follow from it:

1. **A focused tool, not a dashboard page.** Offers run full screen like the website editor
   (`(editor)` route group): one slim white toolbar — the way back, the offer's name and number, the
   two tabs **Offer | Letter**, the save state, "⋯" and the one primary action. No workspace sidebar.
2. **Plain values; a click changes one.** The offer page shows text — "11–24 April 2027 · 13 nights",
   "18 participants · 2 escorts, shared by the group", "Host family · double room · half board ·
   450 €". A click opens a small panel beside it with the few controls for that one thing; Escape or a
   click elsewhere closes it, and the change is already saved. Only what the offer includes is listed;
   everything else is behind **+ Add**.
3. **The letter is its own tab and is written on the page.** Opening, closing, title, line texts, the
   validity date, the signature and the recipient are changed where they stand (the website editor's
   click-to-edit). The opening and closing are **standard texts** (`letter_texts`, kind `offer`): a
   letter shows "Standard text" until somebody changes it for this offer ("Only this letter"), and
   **Save as standard** makes the change the text every new offer starts with (`full`).
4. **A new offer is a wizard** (third pass: "the new offer creation should be more like an elegant
   wizard … it should become more smart"): four steps in one framed card — *Who it is for*, *What it
   is*, *The group*, *The letter* — with the steps and what was chosen in a rail on the left, and
   nothing written until **Create offer**. See §New offer.

5. **Colour that says something** (second pass, the same day: "it is a white page now… add a bit
   colour so it distinguishes"). A tinted head holds the facts as chips with coloured icons; the four
   packages are cards in the four CASA colours (Hahn yellow, Katze blue, Hund red, Esel ink); every
   included row has an icon in its meaning colour — red the course and materials, blue the host
   family and lunch, ink the transport, yellow the programme, whose activities are chips coloured by
   kind; the price sits on a dark card with the tricolour edge. Panels have a head (icon, name, one
   line), filled fields with € inside price inputs, choice cards instead of radio rows, and a foot
   with *Done*. "Not like FileMaker" — keep improving this direction.

6. **Framed, not floating** (third pass: "we need more framing of the interface, cleaner framing, we
   have so much white space"). The offer stands on the workspace's cool canvas in white cards — the
   head, *Built on*, *Included*, *Extras* — in a main column, and beside it a sticky column of what
   the offer comes to: the price on its dark card, the checks (*Ready to send* or *Before it can go*),
   a live miniature of the letter that opens the Letter tab, and the history. The letter tab puts the
   page on the canvas with a column beside it (language, prices, which texts are standard, the
   versions sent). The list is one framed table. Below 1,120 px the column goes under the cards.
7. **A package is a start, not a limit** ("the offer is also not only the four packages … what if a
   group wants something extra"). The package price can be typed over; *Extras* holds more afternoons
   from the sixteen activities, often-asked extras (airport transfer, single room supplement, extra
   night, extra lessons), lines from the price list, typed lines and reductions; taking a block out
   of a fixed package rebuilds it as Esel; and *Own offer* is a group offer with no package at all.

8. **The workspace's own scale, and a real date picker** (fourth pass: "the datepicker fields — and
   also improve the border radius and the framing further"). Radii follow UI_SYSTEM.md's three tiers
   — 4px controls, 6px tiles and panels, 8px cards — where the first passes had drifted to 10–20px,
   and the colours are the workspace's `--ws-*` tokens, so Offers sits beside the website editor. The
   head's facts are a framed bar of five cells (dates, group, language, valid until, signed by), each
   with its label, value and a line under it. A check names what to fix and opens its panel. The
   price card has no logo stripe (content cards never carry it). Dates are typed or picked in
   `date-picker.tsx` — "11.4.27", "11 April", "+14" work; the field shows the weekday, because
   groups arrive on a Sunday; a stay is one two-month calendar where the arrival proposes the
   departure from the package's length, with 1–4 weeks to pick from.

The rest of the workspace is to follow this style once Offers is accepted (Rahman, 2026-10-13).

## What FileMaker does (read live, read-only, 2026-10-13)

Sources: the live `SchoolMan.fmp12` through AppleScript (396 offers, 1,771 lines, 214 letters) and the
SchoolMan DDR of 2026-07-06. The full analysis — every field, formula, relationship, script listing and
the verbatim letter texts — is
`~/Tasks/10-active/work/casa-google-business-audit/output/filemaker_offers_analysis_2026-10-13.md`.

**The shape.** One `Offer` row; its prices are lines in `CostDetailSample` (fee type from the
34-row `CostDetailReference`, a German label typed over it, `Unit × CostGrossUnit`); the button
`MakeOffer_De/_En` runs `WriteOfferLetter.Parameter_Offer`, which writes the lines as **text** into a
new `Letter` record. The team then edits that text by hand and emails it as `Bremen.pdf`. `Offer` has
53 optional `_ID_*` links and no field saying who the offer is for; it has no status, no validity,
no version and no owner. `DateOffer` is not offer lines: it is a generic "requested period" table
shared with pre-bookings and groups.

**Who makes them** (since 2022): Alissa 108, Meike 79, **Ina 57**, Werner 56, Natàlia 53. By kind:
187 for individual learners (from the pre-booking), 96 for companies and the Jobcenter, 54 for groups
(45 by Ina, median 6 lines), 21 for agencies, 17 from bookings.

**Measured defects, each of which the module removes:**

| FileMaker | Evidence | Here |
| --- | --- | --- |
| The letter is a copy, edited by hand | Offer 37602: lines total 1,560 €, the letter sent says 1,370 € with lines the offer lacks | The letter is computed from the offer; only opening, note and closing are free text |
| German and English disagree | "Verwaltungsgebühr" typed over fee type *Transfer* prints "Transfer" in English; "Vermittlungsgebühr Praktikum" prints "Placement fee accommodation" | One description per line, written in the offer's language; the fee type is accounting, not text |
| Every price typed | 431 (label, price, unit) combinations; "Kurspreis" per week at 140, 145, 150, 160, 300 | Group prices come from the packages the groups page sells; a typed price is kept and shown as a change |
| No group | Escorts get a second offer ("1 Woche Lehrkraft Begleitung"), their costs are spread by hand ("Umlage begleitende Lehrkraft 2 × 60"), the group size never enters the offer | Participants and escorts are on the offer; escorts pay, are free, or are shared — computed |
| Header checkboxes drive nothing | 37629: "Halbpension" and "Vollpension" both ticked, the line says "Hotel with breakfast" | The stay's choices *are* the lines |
| No total stored | `TotalAmount` empty on 396 of 396 | Lines store their amount; the sent version stores the whole document |
| Number = record id + **print** year | Reprinting a 2025 offer prints "\| 2026" | `2026-014`, fixed at creation, per-year sequence |
| Wrong signature | Ina's group offers are signed "– Buchhaltung –" (`$$_Account_Function` set without its parameter) | Signed by the offer's owner, with the school's name |
| Wrong level | Group and company offers print "Niveau: " and nothing (read via the pre-booking's course) | No level field on the letter; the title says what it is |
| Empty offers go out | 37622 was sent three times with no lines | A check stops sending: no lines, a line without a price, no participants, no title, validity passed |
| No status, no follow-up | Whether an offer was accepted is recorded nowhere; 10 of 396 led to an invoice | Draft → Sent → Accepted / Declined / Withdrawn; "Follow up" after 10 days, "Expired" past validity |
| Deleting lines can delete offers | `EraseCostDetailSample_Offer` runs *Delete All Records* after an unchecked GTRR (not reproduced live) | Lines are rows of their offer, replaced in one transaction |
| VAT | Offers never mention VAT; the footer cites "§ 5 Abs. 1 Nr. 9 KStG und § 3 Nr. 6" as VAT exemption — corporate and trade tax provisions | No tax wording until CASA's tax adviser gives it (open question 1) |

The group price model existed only outside FileMaker: first Ina's workbook
`Preiskalkulation_Gruppen.xlsx` (2026-08-12), then — the current product — her
`Gruppenpakete_Stadtmusikanten.docx` and `Gruppenreise Esel_Auswahl.xlsx` (2026-08-26), which the
groups page sells as four packages (`src/config/gruppen/packages.ts`). FileMaker received the numbers
she typed.

## The model (migration 0021)

| Table | One row is | Notes |
| --- | --- | --- |
| `organisations` | a school, agency, company or public body CASA makes offers to | name, kind, address, country, language. Created by the wizard for a name CASA does not have; its address is updated from the offer each time one is sent |
| `organisation_contacts` | a person CASA writes to there | salutation, names, email (unique per organisation), `last_written_at`. A school's organiser changes from year to year and an agency has several, so they are rows, not columns; they are contacts of an organisation, not learners, so not rows of `people`. The one sent to is added or brought up to date when an offer goes out |
| `offers` | one offer | `year`+`seq` (the number), `kind` group/individual, `status`, `language`, `presentation` itemised/package, the recipient as addressed (a copy), the group (dates, participants, escorts), `stay` jsonb (the builder's choices, prices typed over computed lines, typed lines), opening/note/closing, `valid_until`, `owner_id`, `revision` (for conflict checks), `version` (times sent), sent/decided by and when, `copied_from`, soft delete |
| `offer_lines` | one priced line | `audience` participant/escort, `key` (`tuition`, `accommodation`… or `manual:…`), `charge_type_code` (FK), `description`, `quantity`, `unit`, `unit_amount`, `amount`, `list_unit_amount` (what the price list said), `rate_id` |

What was sent is not an offers table: every version of the letter is a row of `letters` (migration
0022, `docs/LETTERS.md`) with the draft, lines and totals it was built from, and the standard texts
are `letter_texts` rows of kind `offer`. Editing an offer later never changes what the recipient has.

Lines carry `included` (0021): a part of a package, printed as "inklusive" / "included" without an
amount. Two charge types were added: `group_package` and `escort_share`.

## How an offer is computed (`src/lib/admin/offers`, pure, tested)

Group offers price from the groups page's own figures, so an offer and the website never disagree
(`engine.test.ts` checks Esel against `calculateEselQuote` from `src/lib/gruppen/quote.ts`).

- **The package.** *Hahn* (1 week, 595 €), *Katze* (2 weeks, 1,130 €), *Hund* (2 weeks plus Hamburg,
  1,300 €) are fixed: one line with the package price per person, then what it includes — course
  (20 lessons a week), host family with breakfast and dinner, canteen lunch, the transport ticket,
  materials and the package's afternoons by name — as included lines without amounts. *Esel* is
  built: each block (course, materials, host family, lunch, transport) at the Esel sheet's price for
  the stay's weeks (1–4; beyond four nothing is priced and sending is stopped), and the afternoons
  chosen from the sixteen activities, five a week at most (a hint beyond that). Choosing Esel after a
  fixed package starts from that package's blocks and afternoons — "Leave something out: build it
  from blocks (Esel)" — because the sheet has no price for "Katze without the host family".
- **Own offer.** A group offer with no package: nothing is computed, the offer is what is put on it
  in *Extras* (a group that wants the course alone, a programme the packages do not have). Its weeks
  come from the dates, or are typed.
- **Extras.** *More afternoons* — activities the package does not include, priced per person from the
  same list, for participants and escorts (`extras` in the stay; Esel chooses all its afternoons
  itself, so it has none). Anything the sheets have no price for is a typed line: the presets
  (`extras.ts`: airport transfer, single room supplement, extra night, extra lessons) arrive without
  a price, and the offer cannot be sent until one is typed. A *reduction* (`discount`) is typed as a
  positive amount and stored as a negative one; it shows in green with a minus.
- **Length.** Dates give nights and weeks (`ceil(nights / 7)`: 13 nights are two weeks). A fixed
  package is priced for its own weeks; when the dates disagree, a hint says so. Without dates, a fixed
  package takes its own length and Esel the weeks typed.
- **Escorts.** No course, no materials; host family, lunch, transport and the afternoons at the same
  block prices. *Pay their own* — a second block on the letter, in the group total. *Free of charge* —
  a sentence on the letter; what they cost CASA shows on the page. *Shared by the group* — a line
  "Share of the escorts' costs" per participant, rounded up to the euro.
- **Typed prices.** A price typed over a computed line is kept by the line's key and survives every
  change to the stay; it is marked and the list price shown, a check lists it as a hint, and *Use it*
  returns to the list price.
- **Individual offers** are lines from the price list (courses at their cohort's rate, the enrolment
  fee, books, exams) or typed lines.
- **Totals.** Per participant, per escort, and the group: participants × per person (+ paying escorts).

## The letter (`document.ts` → `docs/LETTERS.md`)

`offerLetter()` builds the letter in the shape every CASA letter has (`src/lib/admin/letters`); the
letter tab, the miniature beside the offer, the print and the copy kept in `letters` are its output.
German addresses the reader with **du** (`docs/VOICE_AND_TONE.md`); opening and closing have defaults
in both languages and are editable per offer; the note has a *Jobcenter note* snippet (FileMaker's
Jobcenter letter, rewritten in du). Subject: `Angebot Nr. 2026-014 · Titel` (`· 2. Fassung` from the
second version on). Then the group and its facts (dates, nights, participants, escorts), the price
blocks, the escort sentence, the group total, the validity, the closing, the owner's name and the
school. *One price per person* lists what is included without amounts (FileMaker's unused Pauschal).

The letterhead is the Impressum's facts plus the bank line every FileMaker letter carries. The page is
A4 in container units, so the preview is the print; **Print / PDF** prints only the letter (a second
render on `<body>`, `[data-letter-print]`, hidden on screen; `@page letter` in `globals.css`). A full
group offer with escorts and the group total fits one page.

## New offer (the wizard)

`/admin/offers/new`, and `?enquiry=` / `?person=` / `?organisation=` when **Make an offer** is pressed
on a record — the wizard then starts at step 2 with the recipient filled in.

1. **Who it is for.** One search over the group and company enquiries still waiting for an offer,
   organisations (by name, or a contact's name or address) and learners (by name or address), with
   chips for Schools · Agencies · Companies · Public bodies · Learners; arrow keys and Enter work.
   An organisation shows its contacts to choose from, or *Someone else*. Nobody found → **Add "…" as
   new**, and the wizard reads what was typed (`recipient-guess.ts`): the kind from the name
   ("Liceo …" a school, "… Viaggi srl" an agency, "Jobcenter …" a public body, two plain words a
   learner), from an address the person's name and the country (`.it` → Italy; open mail services
   say nothing). While the new one is typed, **CASA may have them already** lists organisations with
   the same name written another way ("Vivimondo S.r.l." = "vivimondo srl"), the same mail domain or
   address, and learners with the same address or name — *Use this* takes the existing one. A new
   learner whose address CASA has is that learner, checked again on the server.
2. **What it is.** For an organisation: *A group stay* or *Courses*. A group picks one of the five
   tiles (the four packages and *Own offer*); a school that came before gets **Like last time** — its
   last offer's package, group, extras and prices, with new dates. Courses are picked from the price
   list (upcoming courses at their rate, the enrolment fee, books, exams).
3. **The group.** Arrival and departure (the departure follows from the arrival and the package's
   length, Sunday to Saturday), participants, escorts; an enquiry's preferred dates are shown.
4. **The letter.** The language (from the enquiry, else the country: German for DE/AT/CH/LI, English
   for the rest; English to an organisation without a country, German to a learner), the offer's
   name ("Vivimondo 2027"), the title, valid until (4 weeks; 2/6 weeks; 6 weeks before arrival), who
   signs — and a summary. **Create offer** finds or creates the recipient and makes the offer in one
   transaction (`createOffer`), then opens it.

## Working with it

- **Where offers start.** **New offer**, or **Make an offer** on an enquiry or a learner's page (both
  open the wizard); **Duplicate** (⋯) for a variant or next year's offer.
- **Saving.** Both tabs save themselves 0.7 s after the last change. A save names the revision it
  started from; a colleague's save in between is refused and the page offers a reload (Kursplanung's
  rule). Moving between the tabs saves first.
- **Sending.** *Send …* is enabled when no check reports a problem (the problems are listed under the
  totals). The workspace sends no email of its own, so the dialog is the three steps: save the PDF,
  write the email (a `mailto:` with subject and greeting), mark as sent — which keeps the letter in
  `letters`, updates the organisation's address and adds or refreshes the contact it went to.
- **Answers.** *Accepted* (primary once sent) and *Not accepted …* (⋯: declined by them, or withdrawn
  by us) with a note. *Revise* (⋯) reopens any offer as a draft; the versions already sent stay.
- **The list.** Open (drafts and sent) first; per person and group totals; *Follow up* on an offer
  sent ten days ago without an answer, *Expired* past its validity.

## Code map

```
src/app/(admin)/admin/(editor)/offers/
  layout.tsx            requireModule('offers') — the (editor) gate is the session
  actions.ts            every write and every wizard lookup; each asks requireModule first
                        (edit; delete and standard texts full)
  page.tsx              the list
  new/page.tsx          the wizard (?enquiry= · ?person= · ?organisation=)
  [id]/page.tsx         the offer
  [id]/letter/page.tsx  the letter (?version=N: a version as sent)
src/components/admin/offers/
  frame.tsx             the toolbar and the Offer | Letter tabs
  offer-page.tsx        the offer: head, built on, included, extras; price, checks, letter, history
  letter-view.tsx       the letter tab: in-place editing, standard texts, versions, send
  new-offer.tsx         the wizard
  date-picker.tsx       DateInput, Calendar, DateField, InlineDatePicker, DateRange — no browser
                        date inputs anywhere in Offers (arithmetic in src/lib/admin/calendar.ts)
  panel.tsx · fields.tsx · icons.tsx · offer-actions.tsx · use-offer-draft.ts
src/components/admin/letters/   the sheet, printing and in-place editing every letter uses
src/lib/admin/offers/
  types · stay · engine · extras · checks · document · schema · draft-ops · from-enquiry
  recipient-guess       what the wizard reads from what is typed (pure)
  wizard                the wizard's input schema and shapes (pure)
  recipients            search, matches, the start from a record, finding or creating the recipient
  repo                  offers: list, read, create, save, send, answer
```

Audit: `staff_activity`, entity `offer` — created, duplicated, sent, accepted, declined, withdrawn,
revised, deleted (not every autosave).

## Testing

`src/lib/admin/offers/__tests__/` — the engine (Ina's offer 37630 reproduced to the euro once her
course price is typed; the workbook example with its missing materials fee; tickets; escorts three
ways), the letter (du, numbering, facts, package, languages, no "Buchhaltung", no tax line), the
checks, the enquiry hand-over, the write schema (strict) and the read-back (lenient).
`recipient-guess.test.ts` covers the kind, name, country and language guesses and the name matching;
the engine tests cover extras, reductions and the own offer; `document.test.ts` checks that a sent
letter is read back whole and that a copy in another shape is refused.
`e2e/offers.spec.ts` (needs `DATABASE_URL` and an owner; `E2E_PORT=3017 npx playwright test
e2e/offers.spec.ts`): an offer made through the wizard for a new school prices itself, saves, survives
a reload, keeps a typed price, has its title changed on the letter and is kept in `letters` when sent;
a package takes an extra afternoon, a transfer and a reduction, and the letter shows them; an opening
changed on the letter becomes the standard; a colleague's save in between is not overwritten.
`npm run admin:check` loads the list, the wizard, an offer and its letter.

## Open questions for CASA

1. **VAT wording.** Offers print no tax line. FileMaker's footer cites corporate- and trade-tax
   provisions as a VAT exemption, and its invoices back-calculate 7 % / 19 % on accommodation and
   catering. The tax adviser should say what an offer must state. (`charge_types.vat_rate` for
   accommodation, catering and books also looks swapped against FileMaker's own fee table — 19/7/19
   in seed 0003 against 7/19/7 — to be settled in the same conversation.)
2. **The package premium.** Rebuilt from Esel's blocks, Katze costs 1,044 € against its 1,130 €
   package price (Hahn 542 / 595, Hund 1,117 / 1,300), and the margin is not the same for the three
   (`src/config/gruppen/packages.ts` has the open note). The offer shows both — the package price,
   and Esel when someone switches.
3. **Escorts.** Is there a free-place rule (one free escort per 10 or 15 participants)? Do escorts of a
   fixed package pay the block prices (as built) or something else? Is rounding the shared amount up
   to the euro right? Single rooms for escorts have no price in the sheet.
4. **Payment and cancellation terms** on the letter — a standard paragraph, or a link to the AGB?
5. **du for public bodies.** The Jobcenter and companies get du like everyone (the house rule); the
   opening and closing can be rewritten per offer.
6. **Prices for the usual extras.** Airport transfer, single room supplement, extra night and extra
   lessons have no price in the groups sheets, so each is typed per offer. If they are standard
   prices, they belong in `rates` and the preset can carry them.
7. **Next:** an accepted group offer becoming the group's bookings; sending from the workspace through
   Microsoft Graph from the owner's mailbox; optional lines; agency commission.
