# Google Business Profile

CASA's listing in Google Search and Maps, „CASA - Internationale Sprachschule", Bremen. What is
on it, how an agent edits it, and what is left. Checked 2026-10-30.

Managed at business.google.com by r.shafiee@casa-bremen.de, through Claude in Chrome
(„Browser 1"). The location id in edit URLs is `688067393313456448`. Nothing is published there
without Rahman's go for that text; Google reviews most edits before they show.

## What is on the profile (2026-10-30)

| Part | State |
| --- | --- |
| Website | `https://casa-bremen.de/?utm_source=google&utm_medium=organic&utm_campaign=gbp` (Statistik: „google · gbp") |
| Booking button | The registration form: `/anmeldung/anmeldeformular?utm_source=google&utm_campaign=gbp-buchung` |
| Products | Six, no prices (they would go stale), each linking to its page with `utm_campaign=gbp-produkte`. „Deutschkurse": Intensivkurs Deutsch (A1–C1), Abendkurs Deutsch (A1–C1), Bildungszeit: Deutsch- und Englischkurse, Deutsch für Pflege und Medizin (B2–C1). „Prüfungen": telc Deutsch B2, telc Deutsch C1 Hochschule. Images: `output/gbp-products/` (1200×900, from cleared site photos) |
| Photos | The building at Am Dobben, lessons, a course group, welcome, community, a shared-flat room, a group in Bremen, the logo: `output/gbp-photos/` |
| Posts | One „Neuigkeit": the new website and the next intensive start (23 November 2026), button „Mehr erfahren" to `/sprachkurse/deutsch-intensiv?…utm_campaign=gbp-post`. Text in `output/gbp-reviews/post-1-text.txt` |
| Reviews | A4 poster with a QR code to the review form for the office: `output/gbp-reviews/casa-google-bewertung-poster-a4.pdf` |
| Profile strength | Shows „incomplete" although every field is filled: the only remaining suggestions are Google's own upsells (Ads, Workspace). Nothing to do |
| Attributes | Google changed some (e.g. accessibility) by itself on 2026-10-30; the office team should confirm them on site |

All `output/` paths are in `~/Downloads/CASA-site/output/` and not in git.

## Rules for content

- **Photos:** only photos marked `ready: true` in `src/config/content/photo-numbers.ts`, i.e.
  consented and source-faithful (CLAUDE.md hard rules 2–4). `casa-building-golden` and
  `casa-building-daylight` are AI-processed and marked „DO NOT USE". No named person beside a
  photo unless verified.
- **Texts:** du, the site's voice (docs/VOICE_AND_TONE.md), non-profit first. Dates and prices
  only where they will be refreshed (posts), never in products.
- **Links:** always with a `utm_campaign` tag (docs/OPERATIONS.md, statistics table).

## How an agent edits it

- The dashboard opens edit dialogs in iframes; they also work as top-level pages, which is easier
  to drive: `https://www.google.com/local/business/688067393313456448/editprofile/<section>?hl=de`
  (e.g. `products/add`, `info`).
- File upload: the dialog's `input[type=file]` is hidden. Unhide it with JavaScript and give it an
  aria-label, `find` it, then `file_upload` the image. **Wait for the preview to appear** before
  pressing „Veröffentlichen"; otherwise the item saves without a photo (it happened once with the
  B2 product).
- Products are reviewed by Google for up to 30 minutes („AUSSTEHEND").
- Never accept terms, link an Ads account, start a trial or change the owner without Rahman.

## Open

- A post every month: the next intensive start, exam dates, the language café. Same tag pattern
  (`gbp-post`). Each needs Rahman's OK for its text.
- Reply to reviews (the office team, or drafts for them).
- The office team confirms the attributes Google changed.
- A second booking link for the placement appointment needs a deep link that opens the
  appointment popup on the placement page (e.g. `/anmeldung/einstufungstest#termin`): a small code
  change, then the link in the profile.
