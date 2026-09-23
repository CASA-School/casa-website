# Legacy redirects: the old casa-bremen.de URLs

**Built 2026-09-23.** When DNS moves to this site, every URL the old site served, that
search engines have indexed or that someone bookmarked or linked keeps working: it
answers one permanent redirect (308) to its page here. The map is
`src/i18n/legacy-redirects.ts`; `next.config.ts` loads it as `redirects()`.

## What was inventoried

Three independent sources, merged and de-duplicated (case-insensitive, trailing slash
ignored, only content-selecting query parameters kept):

| Source | What it found |
| --- | --- |
| Crawl of the live TYPO3 site (from `/` and `/en/`, every link, 76 requests) | 57 live pages (29 German, 28 English), 10 section roots that 307 to their first child, 4 dead links, no documents, 372 images |
| Internet Archive (Wayback CDX, 17,430 captures of 2,375 URLs, 2000–2026) | 929 pages and PDFs after dropping assets, a public 2009 staging copy (`/enttest`, `/ent`) and junk; 842 of them already 404 today |
| Search engines (`site:` queries in German and English) | 52 indexed URLs, all also found by the other two |

The archive shows five generations of the site: static HTML (2000–04), PHP (2004–11),
webEdition (about 2011–23, `/de/…php`, `/en/…php` and `/es`, `/ru`, `/tr`, `/jp`,
`/italiano`), TYPO3 (2023–26) and this one.

Every old URL was mapped by one reader and checked by a second, who compared the old page
(live, or its archived copy) with the target page here and confirmed the target answers 200
directly. 48 first mappings were corrected that way, and every correction that ships was checked
again.

## What the map does

- **511 redirects**: 60 for URLs live or indexed today, 104 for recently live ones, and 347 for
  URLs dead for years that still had a specific counterpart here (a course, an exam, a room
  type, registration, the placement test, contact, the legal pages). 113 are the old English
  tree, 322 end in `.php`, 15 are PDFs, 31 are old news articles.
- **40 old URLs need nothing**: the German paths this site kept (`/sprachkurse/deutsch-intensiv`,
  `/kontakt` and so on).
- **394 are left to 404 on purpose**: dead for years with only a generic equivalent, backend and
  form endpoints, and the staging copy. A mass of redirects to the homepage reads to search
  engines as soft 404s anyway, and gains nothing.
- **Images are not redirected.** The 372 `/fileadmin` images are page furniture, not landing pages.

Old TYPO3 news articles are chosen by the `tx_news_pi1[news]` query parameter, so those rules
match on it (also in its `amp;tx_news_pi1[news]` form, which search engines indexed from
HTML-escaped links). Without the parameter, `/aktuelles` and `/en/news` are the news pages here.

## How it works, and the rules

`next.config.ts` → `redirects()` → `legacyRedirectRules()`. Next applies these before
`src/proxy.ts` and to every path, dotted ones included, which the proxy matcher skips. Rules are
permanent, matched case-insensitively, and never applied on the admin host.

`src/i18n/__tests__/legacy-redirects.test.ts` enforces:

1. Every target is the canonical public URL of a page that exists (German at the root, `/en/…`
   otherwise), so it answers 200 with no second hop.
2. No old URL names a page that exists here, in any letter case — it would hide the page.
3. No duplicates, and no redirect whose target is another old URL.
4. A query in an old URL is the single parameter that chose the content.

`e2e/legacy-redirects.spec.ts` requests all 511 against the running app: one 308 to exactly the
mapped target, and every target a 200.

A trailing slash or the `www` host costs one extra hop (Next strips the slash; the proxy sends
`www` to the apex). Targets stay relative on purpose, so the Container Apps test URL redirects to
itself rather than to the domain, which still serves the old site until cutover.

## Judgement calls for CASA to confirm

These old pages have no true counterpart here; the map sends them to the closest page:

| Old | Now | Why |
| --- | --- | --- |
| `/gallerie`, `/en/gallery`, the old school galleries | About (`/ueber-uns/casa-leitbild`, `/en/about`) | No gallery on the new site |
| `/ueber-uns/tandem`, the Sprachtandem news item, the old tandem pages | `/ueber-uns/casa-leitbild#tandem` | The language-exchange section; the TANDEM school network is on the Gemeinnützigkeit page |
| `/sprachkurse/niveaustufen`, `/en/registration/language-levels` | Placement test | The old page explained the CEFR levels; the placement test is where a learner finds theirs |
| `/de/kulturprogramm/…` (2011–23 trip pages) | German for groups | The culture programme is now part of group courses |
| Superintensive courses (webEdition) | Bildungszeit | The closest current format |
| TestDaF pages | The exam centre | The new site has no TestDaF offer |
| Spanish, Russian, Turkish, Japanese, Italian and Portuguese pages | Their English equivalents | English is the only other language at launch |

CASA no longer offers English courses, one-to-one lessons or junior summer courses. Their recent
pages go to the course overview; older dead copies are dropped.

Old pages under `/es`, `/tr` and the other old language folders are `.php` files or German slugs,
so they cannot collide with a future Spanish or Turkish route. If one ever does, the "never names
a page that exists" test fails and that entry goes.

## Not covered here

- `relaunch.casa-bremen.de` — a staging host of the TYPO3 site, still linked from one old page.
  It is a different hostname and does not reach this app; it should be switched off at cutover.
- The published English terms still show `https://casa-bremen.de/en/registration/course-registration`
  as link text. The link now redirects correctly; the wording changes when CASA republishes the terms.

The per-URL inventory, every mapping with its reason and both review passes are kept locally in
`output/review/legacy-redirects/` (not in Git).
