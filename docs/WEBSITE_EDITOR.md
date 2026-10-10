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

**Every text resolves through `say`, `pick` or `pickTree`** (`src/lib/cms/copy.ts`):

- `say(locale, 'Deutsch', 'English', vars?)` where a `locale === 'de' ? … : …` stood;
- `pick(locale, { de, en })` for a pair in a config;
- `pickTree(locale, { de: …, en: … })` for a per-language object or list (items pair by
  `slug`/`id`/`code`/`key`, never by position).

Server components import them; client components take them from `useSiteCopy()`
(`src/components/cms/site-copy-provider.tsx`). The server's store lives for one request
(React `cache`), filled by `prepareCopy()`, which `getContentLocale()` and the site layout
await; the client's comes from the layout through context. Outside a request they return
exactly what the old ternary returned.

**A text's key is made from the text** (`src/lib/cms/copy-key.ts`): a slug of the German
and a hash of both defaults. One wording used in three places is one slot. If a developer
rewrites the default, the key changes and an old edit stops applying, which is right: the
code now says something else on purpose. `{name}` is a placeholder the page fills in; an
edit must keep it (checked in the popup and on the server).

**The catalog is generated.** `npm run cms:extract` (`scripts/cms/extract-copy.mjs`) reads
the source — `say` calls, `{ de, en }` literals, per-language objects followed through
imports — and writes `src/config/cms/copy-catalog.json` with each text's files and the
pages that render them. A unit test fails when it is out of date. The menu and the footer
(dictionaries keyed by English) and the course page's hand-named words
(`config/cms/course-page-copy.ts`) are added in `src/lib/cms/catalog.ts`.

Not offered: a text identical in both languages inside a data structure (a name, a brand),
an identifier-like value, fields such as `href`, `slug`, `amount`, and anything in the legal
pages, the closed placement test, emails, search-engine metadata or the data layer.
A tagged text the catalog does not know (a few strings assembled in code) stays inert in
the preview, so nothing looks clickable that is not.

**Content source maps.** In draft mode — only the editor's iframe has it — every value
carries its key after it in zero-width characters (`src/lib/cms/stega.ts`). The bridge in
the page (`src/components/cms/edit-bridge.tsx`) finds them, takes them out of the DOM, and
marks the element. Dates, prices and course facts are tagged `data:<source>` instead: a
dashed outline and a card that opens the screen where they are kept.

**The preview is the real page.** `/admin/website` signs a ten-minute token;
`/api/cms/preview` checks it, switches Next's draft mode on and redirects to the page.
Draft-mode requests may be framed by this site and the admin host (`next.config.ts`);
every other request keeps `frame-ancestors 'none'`. Editor and page talk by
`postMessage`, each checking the other's origin (`src/lib/cms/protocol.ts`).

**Verified when every page was connected (2026-10-10):** the text of all 70 pages in both
languages was identical before and after, in public and in preview mode; over 99 % of
tagged texts on those pages are in the catalog.

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

## Writing new copy

Write `say(locale, 'Deutsch', 'English')` (or `pick` / `pickTree` for config) instead of a
`locale === 'de'` ternary, in a client component through `useSiteCopy()`, then run
`npm run cms:extract`. That is all it takes for the text to be editable. Values from records
are marked with `getPageContent(locale).data(source, value)` (course page) and never go
through `say`.

## Before go-live

- `ANTHROPIC_API_KEY` on the Container App for the writing help (or leave it off).
- The admin host must exist; on another host pair set `CMS_PUBLIC_ORIGIN` and `CMS_EDITOR_ORIGIN`.
- Decide who gets `edit` and who gets `full`.
- The meta description and the search titles (`src/config/seo-pages.ts`) are not slots yet.
- Five strings assembled in code (two on the groups page, one each on the placement and
  special courses pages, one in a level timeline) and the registration forms' helper labels
  stay inert.
