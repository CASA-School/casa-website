# SEO and GEO

How the public site is made findable by search engines (SEO) and by AI answer engines
(GEO: ChatGPT search, Perplexity, Google AI Overviews, Copilot, Claude). Audited and rebuilt
2026-10-10.

## Measured on 2026-10-10 (neu.casa-bremen.de, every page in the sitemap, both languages)

- 70 pages, all 200. One h1 each, no skipped heading levels, every image with alt text.
- Canonical, `hreflang` (de, en, x-default) and `<html lang>` correct on every page.
- No broken internal links. Two links inside the English terms (legal text, left as written)
  pass through a redirect.
- **The old site's URLs:** all 535 redirects in `src/i18n/legacy-redirects.ts` answer one 308 to
  a page that answers 200, and every page the old casa-bremen.de serves today resolves here
  (directly or by one redirect). See `docs/LEGACY_REDIRECTS.md` for how the map was built.
- Core Web Vitals in the lab (Pixel 7, 4× slower CPU, 1.6 Mbit/s): CLS 0 everywhere, server
  response 130–290 ms, LCP 2.1–3.0 s.

## What the site does

| Piece | Where | Notes |
| --- | --- | --- |
| Titles and descriptions | `createPublicMetadata` (`src/lib/seo.ts`), course and exam pages from `src/config/seo-pages.ts` | Titles named the way pages are searched ("Intensivkurs Deutsch in Bremen"), under about 60 characters with " \| CASA Bremen"; descriptions 110–160 characters, none duplicated, each saying what, for whom and where (2026-10-29: the homepage leads with „Sprachschule in Bremen", every course page has its own description with live lesson counts) |
| Icons | `scripts/media/build_icons.py` → `src/app/favicon.ico`, `icon.png`, `apple-icon.png`, `public/icons/`, `src/app/manifest.ts` | The logo's sail, sun and wave on a white tile, cut from the logo artwork (2026-10-29). Until then the PNG icons carried a grey checkerboard painted into their pixels |
| Canonical and hreflang | `createPublicMetadata`, `src/app/sitemap.ts` | German at the root, English under /en; x-default is German |
| Sitemap and robots | `src/app/sitemap.ts`, `src/app/robots.ts` | Every page and language with its alternates; robots allows everything except /api/, AI crawlers included |
| Structured data | `src/lib/structured-data.ts` | One organisation with an `@id` (address split into fields, coordinates from CASA's Google Maps entry, office hours, founding year, profiles), the website, a BreadcrumbList from the `Breadcrumbs` component, Course with its offer and dated, scheduled terms, each telc exam day as an Event with fee and registration deadline, a JobPosting for each vacancy, FAQPage on /faq |
| Share images | `src/app/og.png/route.tsx` | Each page's own image with its title, logo and stripe, in its language |
| llms.txt | `src/app/llms.txt`, `src/app/llms-full.txt`, `src/lib/llms.ts` | The site as plain text for AI assistants, built from the live data: the school in numbers, „When CASA is a good answer" (the questions it answers, each with its page), a German summary, courses with levels, prices and the next terms, exam days with deadlines, accommodation prices, contact; the full version adds every course's conditions and the FAQ. Facts only: an instruction to rank the school would be ignored by answer engines and read as manipulation |
| Statistics | `src/lib/site-views.ts` (called by `src/proxy.ts`), migration 0106, `/admin/statistics` (module `website`) | See §Statistics |
| IndexNow | `infra/azure/deploy.sh`, `public/<key>.txt` | After each release, sends the sitemap to Bing (which ChatGPT search and Copilot read). Inactive until casa-bremen.de serves this app, then on by itself |
| Old URLs | `src/i18n/legacy-redirects.ts` | One 308 per old URL; long-dead URLs with no specific counterpart 404 on purpose |

## Rules

- Facts in structured data and llms.txt come from the same data the pages show. Never type a
  price, a date or an opening hour into them by hand.
- A new course or exam page gets a search title in `src/config/seo-pages.ts`.
- A page that shows breadcrumbs gets the BreadcrumbList for free; pass the trail to `Breadcrumbs`.

## Statistics (2026-10-29)

The site counts its own visits, on the server, from the request a browser sends for a page: the
path, the Referer (its domain only) and the User-Agent (turned into phone, tablet or computer, then
dropped). No script, no cookie, nothing read from the device, no IP address: § 25 TDDDG is not
touched and the privacy policy (§5) says exactly this. What the server sees is a page LOAD — a
visit's first page, a page opened in a new tab, a reload. A click inside the site loads the next
page through Next's router, whose headers Next strips before the proxy sees the request, so it
cannot be told from a prefetch and is not counted. The screen therefore shows visits, their landing
pages and sources (search engines and AI assistants named), not every page read. A visit counts
only when the request carries what a browser sends when it opens a page (`Sec-Fetch-Dest: document`
and `Accept-Language`): on the first evening, 235 „direct" visits that walked the sitemap were
crawlers with a browser's name (PR #204; the table was cleared by 0107).

Since 0108 each page load also keeps the browser's preferred language (the first tag of
Accept-Language: which of the six prepared languages are worth routing) and, on a visit's first
page, the campaign its link carried (utm_source · utm_campaign, or „Google Ads" for a gclid click,
the Ad Grants clicks). The screen adds, from the workspace's own records, what came in through the
website in the period (registrations, enquiries by form, appointments booked online, applications),
separate registration counts, and the age groups and nationalities of those who registered
(counts from the registrations' parsed birth date and nationality code). It does not infer a
conversion rate from unrelated visit and submission totals.

Since 0109 a visit's first page also keeps its country (Rahman's go, 2026-10-29): the IP address is
looked up in DB-IP's free country database (IP to Country Lite, CC BY 4.0, credited on the screen)
on the server and dropped; only the two letters are stored. The image downloads the current
month's file on every build (Dockerfile stage `geo`, `scripts/geo/fetch-country-db.mjs`); a failed
download leaves visits without a country and never fails a release. Locally,
`npm run geo:fetch` puts it in `geo/` (gitignored). Age is not knowable from a
visit at all; the registrants' ages are the honest measure.

A script measuring every click and real readers' load times would read from the device and needs
the consent question settled first (privacy owner). Until then:

- **Real readers' load times:** Search Console → Core Web Vitals (Chrome's field data, CrUX), and
  PageSpeed Insights for one page.
- **Lab load times and image weights:** Lighthouse on the live site. Measured 2026-10-29, ten key
  pages pinned to Azure: desktop 95–100, mobile 86–100, SEO 100, accessibility 100; mobile LCP
  1.7–3.7 s on Lighthouse's simulated slow 4G (observed 0.3–2.6 s); photographs on phones 15–34 KB,
  the Leitbild painting 82 KB; server render 0.15–1.0 s, the homepage slowest. The heroes' photo
  had no `fetchpriority="high"`; it has since then.

## AI answers: where CASA stands (2026-10-31)

Rahman: asking Gemini for the best language school in Bremen, CASA came third or fourth. Asked on
2026-10-31 from his account in Bremen:

| Question | CASA |
| --- | --- |
| Gemini, German: „Was ist die beste Sprachschule in Bremen, um Deutsch zu lernen?" | First of six, with the right facts (non-profit, 1983, A1–C1, telc centre, accommodation) and one wrong one: „Unterstützung bei Visa-Angelegenheiten" |
| Gemini, English: „best language school in bremen" | **Not named.** Goethe-Institut (4.8), inlingua (4.8), VHS, then speakeasy, Campus German, Berlitz |
| Google, „beste Sprachschule Bremen" | Local pack: Sprachschule Aktiv 5.0 (463 reviews), **CASA 4.3 (211)**, Campus German 5.0 (45); CASA's site is in the web results |

What the answers are built from, in the order it matters for a „best" question: the Google rating and
the number of reviews (the Maps entry), lists on other sites (werkenntdenbesten.de, which averages
reviews; kennstdueinen.de; languagecourse.net; the University of Bremen's list of schools for
intensive German, which names CASA as „CASA gGmbH"), English-language mentions (for English
questions; few for CASA: studydestiny.com, an old Turkish forum thread), and only then the school's
own site. The site went live on casa-bremen.de on 2026-10-29, so the engines still mostly know the
old site.

**On the site (done 2026-10-31):** llms.txt states what CASA does for a visa (the letter, not the
visa; the old answer said „help with visa matters") and the names CASA is listed under; the
organisation's `alternateName` adds „CASA gGmbH", „CASA - Internationale Sprachschule gemeinnützige
GmbH" and „CASA International Language School", so search and answer engines join the listings into
one school. No ranking instruction, no review markup of our own (Google ignores self-serving
ratings and an instruction would read as manipulation).

**Off the site (the levers that move a „best" answer):**

1. **Reviews.** Ask every learner, at the end of each level or trimester, with the profile's review
   link (Business Profile → „Um Rezensionen bitten"), the QR poster in every classroom and the link
   in the end-of-course mail. Everyone, not only the happy ones: Google forbids selecting or rewarding
   reviewers. Answer every review, the critical ones first. Target: above 4.6 with more reviews than
   the schools above CASA.
2. **English mentions.** A correct, current entry on the English listings people and engines read
   (languagecourse.net, studydestiny.com, expat and student guides for Bremen); ask the University of
   Bremen to list CASA under its full name with the website.
3. **Business Profile.** Add „Deutsch-Sprachschule" (German language school) as a second category,
   the category the English answer's newer schools carry; a short English sentence in the
   description; the monthly post (docs/GOOGLE_BUSINESS_PROFILE.md).
4. **An English page „Learn German in Bremen"** (docs/GOOGLE_ADS.md §Learners abroad, decision 5):
   the page an English question can be answered from.

**Check it monthly:** the three questions above, plus the same in ChatGPT and Perplexity, from a
Bremen location; note CASA's place and what the answer says about it.

## At go-live (with the domain)

1. Point casa-bremen.de and www at the app (see `docs/AZURE_DEPLOYMENT_PLAN.md`). The
   `x-robots-tag: noindex` on every other host (`next.config.ts`) lifts by itself on the apex.
2. **Google Search Console:** add the domain property (a DNS TXT record), submit
   `https://casa-bremen.de/sitemap.xml`, then watch Pages → Not found for old URLs we missed.
   Done 2026-10-29 (domain property `sc-domain:casa-bremen.de`, owner r.shafiee@, TXT
   `google-site-verification=…` in the Plesk zone; sitemap submitted the same evening).
3. **Bing Webmaster Tools:** import the property from Search Console. IndexNow runs from the
   next release on.
4. **Google Business Profile:** make sure the website field says `https://casa-bremen.de/` and
   that name, address and phone match the site exactly. Done 2026-10-29/30 with a tagged link,
   products and a booking link: `docs/GOOGLE_BUSINESS_PROFILE.md`.
5. Check one course, one exam and the job page in Google's Rich Results Test.

### Registration measurement (prepared, disabled by default)

The registration dashboard shows accepted records and unresolved mail review flags from the
workspace. Optional browser events are **not linked** to one another or to records, and are not
conversion rates. They use a closed vocabulary and are aggregated by Bremen day, form, displayed
language and broad device type; no form values, URLs or visitor IDs are retained. Validation
counts describe attempts, so one person can generate more than one error. Records use the selected
rolling period while browser aggregates use calendar days; they are not a cohort.

Before activation, the privacy owner must review the exact processing, legal basis, retention,
consent requirements and privacy notice. Collection is off by default. After review, both the
build-time `NEXT_PUBLIC_REGISTRATION_METRICS=enabled` and server runtime
`REGISTRATION_METRICS=enabled` are required. The migration creates only an empty table. A daily
aggregate older than 13 months is removed opportunistically during collection; implement a
scheduled retention job if a firm deletion deadline is required. The endpoint uses the existing
in-memory request limiter, which temporarily holds the client address. Browser events are best
effort, can be blocked, and cannot reconstruct a journey. Small displayed language/device groups
under ten starts are suppressed. No retroactive event history exists.
