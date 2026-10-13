# Letters — every letter the workspace writes

Migration 0022 · `src/lib/admin/letters` · `src/components/admin/letters` · branch `admin` (2026-10-13)

Read this before adding a kind of letter — an enrolment confirmation, a visa invitation, a
certificate of attendance — or touching how an offer's letter is built, shown, printed or kept.

---

## Why a layer of its own

CASA writes many letters: offers, confirmations to learners, visa letters for the embassy,
attendance certificates, letters to the Jobcenter. In FileMaker they are all one `Letter` table with
82 `_ID_*` columns, and a letter's body is a text field a script writes once and the team edits by
hand — so the letter and the record it came from drift apart (offer 37602: 1,560 € in the offer,
1,370 € in its letter). The offers module was the first to need letters; they are built here so the
next kind is a function and a row, not a second module (Rahman, 2026-10-13: "letter will be a table
of its own as we will create letters for a lot of things … a good start to build that type of
architecture").

## The model

| Table | One row is | Notes |
| --- | --- | --- |
| `letters` | one letter as it was sent | `kind`; the record it is about — exactly one, by its own foreign key (`offer_id` today; `CHECK (kind = 'offer') = (offer_id IS NOT NULL)`); `version` (the record's count: an offer's second version is its second letter); `language`; to whom (`organisation_id`, `person_id`, `recipient_name`, `email`); `subject`; `document` (the letter, the shape below); `source` (what it was built from); sent by and when |
| `letter_texts` | a standard text | `(kind, language, part)` → `body`. No row means the kind's text written in code |

A letter is written **once**, when it is sent, inside the transaction that marks its record as sent:
the record never says "sent" without the letter that went out, and the letter is never changed after.
A letter is about one record through one required column — never a free uuid, never a row that has
to be inferred from which of many columns is filled (`docs/FILEMAKER_LESSONS.md` §3.2).

## The shape (`src/lib/admin/letters/types.ts`)

```
Letter = { schema: 1, kind, language, returnAddress, recipient[], placeDate,
           subject: { lead, title, tail }, salutation,
           body: LetterPart[], signOff, signature[], footer[] }
LetterPart = text (slot?, strong) | heading (detail) | table (heading, rows, total) | sum
```

A kind of letter is a pure function from its record to a `Letter` — `offerLetter()` in
`src/lib/admin/offers/document.ts` is the first. The letterhead, the footer, the sign-off, dates,
money, the salutation (du in German) and the address block come from `letters/format.ts`, so every
kind looks like CASA.

A `text` part with a `slot` (`intro`, `note`, `validity`, `closing`) is one the letter view can edit
where it stands; an empty one prints nothing. A table row's `ref` names what it was built from (an
offer line's `participant:course`), so its text can be changed on the page.

**Reading a stored letter.** `readLetter()` (`letters/read.ts`) checks a stored document against the
shape of its `schema` number and refuses one that does not fit; the sheet is never handed a letter
with a part missing. When the shape changes: bump `LETTER_SCHEMA`, and teach `readLetter` the old
one, so letters sent years ago still open. (The offers module's first copies, kept before this layer,
lacked a field the sheet had started to read, and opening one crashed the letter tab.)

## Showing, editing, printing (`src/components/admin/letters`)

- `letter-sheet.tsx` — `LetterSheet`: CASA's A4 letterhead in container units, so the screen is the
  page at any width; `variant` `screen` (the letter tab), `print`, `thumb` (the miniature beside an
  offer). `slots` make parts editable where they stand; print and sent letters pass none.
- `inline-edit.tsx` — `InlineText` (a text becomes the same text, editable, with a bar: *Standard
  text* / *Only this letter*, *Use the standard*, *Save as standard*) and `InlinePanel` (a part that
  opens a small panel: the recipient, the date, the signature).
- `print.tsx` — `PrintCopy` renders the letter a second time on `<body>` as `[data-letter-print]`;
  `globals.css` hides everything else on paper and sets `@page letter` (A4, the first page's margins
  inside the sheet). `printLetter(name)` names the PDF.

## Adding a kind of letter

1. Migration: add the kind to both `CHECK`s, its record's column to `letters` (a foreign key) and to
   `letters_subject_check`, and a unique index on `(that_id, version)` if it has versions.
2. `LETTER_KINDS` in `types.ts`; `IssueLetter.about` in `repo.ts`.
3. A pure builder `xLetter(record, ctx): Letter` using `letters/format.ts`, with a test.
4. Its standard texts as defaults in code, read through `standardTexts(kind, defaults)`.
5. A view that renders `LetterSheet` with slots, and a send that calls `issueLetter()` in the
   transaction that marks the record as sent.

## Open

- Letters are emailed by hand (`mailto:` and the PDF). Sending through Microsoft Graph from the
  workspace would let `letters` record that it went, not only that it was marked.
- A list of every letter to an organisation or a learner (`letters_organisation_idx`,
  `letters_person_idx` are there for it) belongs on their records once those pages are redesigned.
