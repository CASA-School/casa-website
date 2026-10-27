# Sync_ layouts in SchoolMan — the tools

The sync service reads SchoolMan only through the `Sync_<Table>` layouts listed in `../sync-layouts.json`
(docs/schoolman/MIGRATION.md). These tools make and extend those layouts in FileMaker Pro on Rahman's Mac by
UI scripting and the clipboard — the only way to change a layout without a hosted test file. They change
layout design only; no record is ever read into a file or written.

**Before you start:** Rahman's go for the change (every SchoolMan design change needs it); FileMaker Pro open
with SchoolMan, signed in with an account that may edit layouts; nobody using FileMaker, the mouse or the
clipboard on that Mac while it runs (a copied password once landed on a layout as text); the screen kept
awake (`caffeinate -dimsu -t 3600 &`). The scripts check FileMaker is in front before every menu click and
stop at the first failed check, leaving FileMaker as it is.

| File | What it does |
| --- | --- |
| `make_layout.sh <Table>` | New layout `Sync_<Table>` on the table's base occurrence (Computer, Form), every field of the table in sync-layouts.json pasted as XML2, copied back and compared binding by binding, „Include in layout menus" off, saved. FileMaker must be in Layout mode. `--from-copy` resumes after the paste. |
| `add_fields.sh <Table> <field> …` | The fields added to the existing `Sync_<Table>` (switches with FileMaker's own `go to layout`), placed below its fields, all bindings compared before and after, saved. Add the fields to sync-layouts.json first. |
| `gen_xml2.py <Table> [<field> …]` | The XML2 snippet: the plain field of `field-template.xml2.xml`, renamed and bound by the field's id. |
| `ddr-fields.json`, `ddr_fields.py` | Every table's field ids, types and kinds from the July 2026 DDR. Ids never change; a field made since then is missing — export a new DDR and run `ddr_fields.py` on it. |
| `pbxml2.js` | The clipboard in FileMaker's layout-object flavour (XML2): read, write, a sentinel. |
| `fmmenu.sh` | Clicks a FileMaker menu item, only if FileMaker is in front. |
| `verify_layouts.mjs` | Every layout read once as WorkspaceSync over the Data API: all fields there? Prints the certificate fingerprint to pin. |

Afterwards: `node scripts/filemaker/layouts/verify_layouts.mjs`, merge the sync-layouts.json change and
release (the endpoint only accepts listed tables), then restart the service so it sends the changed tables
whole. Snippets and copies-back land in `output/filemaker-layouts/` (gitignored). The routine follows the
FileMaker session's handover (`casa-microsoft-platform/notes/handover-filemaker-for-website-session-2026-10-26.md` §4).
