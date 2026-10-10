# The website editor

Staff change what the public site says at `/admin/website` (admin.casa-bremen.de/website):
the real page, full screen, where any connected text opens a popup beside it. Built
2026-10-10 on branch `claude/website-editor`, after Rahman asked for "the most modern
way to edit content", popups included, and a design that holds more than two languages.

## How it works

**The text in the repository is the default.** Nothing is moved out of the code. A
slot's live text is the latest published revision in the database, else what the code
says. With no database, no tables, or a failed read, the site renders exactly what is
committed (fallback parity).

**Every text has a key.** Two kinds:

- The course page's shared words (`coursePage.*`, `src/config/cms/course-page-copy.ts`):
  buttons, labels, section headings. Changing one changes every course page; the editor
  says so ("Every course page").
- Per-course trees (`course.<slug>.<tree>.<path>`, `src/lib/cms/catalog.ts`): the objects
  `config/courses/*` already returns for one course and one language. A tree names which
  string leaves are editable, by path, with a label, a kind and a length limit
  (`src/lib/cms/overlay.ts`). Level codes, textbook ids, prices and hrefs are never named,
  so never touched.

The catalog reads every tree in German and English, so each slot knows its defaults in
both and its limit: the kind's limit, or 15 % above its longest default, so no current
text starts out "too long".

**Content source maps.** In draft mode — only the editor's iframe has it — every value
carries its key after it in zero-width characters (`src/lib/cms/stega.ts`). The bridge in
the page (`src/components/cms/edit-bridge.tsx`) finds them, takes them out of the DOM,
and marks the element. That is how a click anywhere on the real page knows its slot
without a wrapper in a single component. Dates, prices and course facts are tagged
`data:<source>` instead: shown with a dashed outline and a card that opens the screen
where they are kept, never editable as text.

**The preview is the real page.** `/admin/website` signs a ten-minute token;
`/api/cms/preview` checks it, switches Next's draft mode on and redirects to the page.
Draft-mode requests may be framed by this site and the admin host (`next.config.ts`);
every other request keeps `frame-ancestors 'none'`. Editor and page talk by
`postMessage`, each checking the other's origin (`src/lib/cms/protocol.ts`).

## What staff can do

- **Edit in a popup** anchored to the text: one tab per language with its state (live,
  draft, waiting, needs update, not written), the German source shown above any other
  language, a meter against the slot's limit, a warning on „Sie" (docs/VOICE_AND_TONE.md).
  Typing updates the page live. Closing keeps it as a draft; nothing is live before a publish.
- **History and comments** per text: every published, scheduled and waiting version, the
  original, one click to use any of them; a comment thread with resolve.
- **Review & publish**: every draft across the site as a word diff, grouped by page,
  with the translations it leaves behind. Publish now, or **schedule** for a Bremen time.
- **Approval**: `edit` drafts and sends for approval; `full` publishes, approves, sends
  back (the texts return to drafts), undoes and withdraws.
- **Undo** any live release from the toast or the history; the texts before it are live again.
- **Presence and locking**: who has the editor open and on which page; a text a colleague
  has open is read-only for everyone else, with their name on it.
- **Search** every editable text in every language (⌘K), and jump to it on its page.
- **Languages**: every routed language, plus `CMS_EXTRA_LOCALES` (e.g. `tr,ar`) — languages
  written page by page before they are routed. Native names, right-to-left fields for
  Arabic, completion per page in the language menu.
- **Writing help** (with `ANTHROPIC_API_KEY`): shorten to fit, check the voice, translate
  from German, and **Ask**: a plain-language request ("the evening course now costs from
  378 €") becomes proposed edits across every language, shown as diffs, added as drafts.
  Only website copy is sent; every answer is a suggestion a colleague accepts.

## Who may use it

Module `website` in `src/lib/admin/access.ts`. Owner and admin: `full`. Staff: none by
default, opened per person on the Team screen — `view`, `edit` or `full`. Every action in
`(editor)/website/actions.ts` asks the module guard first, at its level
(`host-routing.test.ts` enforces it).

## Data (0019_website_editor.sql)

`website_drafts` (one per slot and language) · `website_releases` (pending, scheduled,
published, rejected, undone, cancelled; `publish_at` is the only thing the site compares,
so a scheduled release needs no job) · `website_revisions` (the texts of a release, with
what they replaced) · `website_stale` (translations the German moved past) ·
`website_comments` · `website_presence`.

The public site reads live values in one query, cached fifteen seconds per process or
until the next scheduled release, whichever is first; a publish clears the publishing
process's copy at once (`src/lib/cms/content.server.ts`).

## Adding a page

1. Move its inline `locale === 'de' ? … : …` pairs into a copy registry like
   `course-page-copy.ts`, and read them with `getPageContent(locale).t(key)`.
2. For copy that already lives in a config function, add a tree to the catalog and wrap
   the call with `cms.tree(slug, treeId, value)`.
3. Mark values from records with `cms.data(source, value)`.
4. Set `editable: true` for the page in `src/config/cms/editor-pages.ts`.

Connected so far: the course pages (Intensivkurse, Abendkurse, Spezialkurse, Medizin,
Bildungszeit, Firmenunterricht, Gruppen), in their shared words and every per-course tree.
Every other page opens in the preview, marked "View only".

## Before go-live

- `ANTHROPIC_API_KEY` on the Container App for the writing help (or leave it off).
- The admin host must exist; on another host pair set `CMS_PUBLIC_ORIGIN` and `CMS_EDITOR_ORIGIN`.
- Decide who gets `edit` and who gets `full`.
- Copy in the group and company variants of the course page (`isGroupQuote`,
  `isOrganisationQuote` branches) is still inline; the learner variant is connected.
- The meta description and the search titles (`src/config/seo-pages.ts`) are not slots yet.
