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
| Titles and descriptions | `createPublicMetadata` (`src/lib/seo.ts`), course and exam pages from `src/config/seo-pages.ts` | Titles named the way pages are searched ("Intensivkurs Deutsch in Bremen"), descriptions 70–160 characters, none duplicated |
| Canonical and hreflang | `createPublicMetadata`, `src/app/sitemap.ts` | German at the root, English under /en; x-default is German |
| Sitemap and robots | `src/app/sitemap.ts`, `src/app/robots.ts` | Every page and language with its alternates; robots allows everything except /api/, AI crawlers included |
| Structured data | `src/lib/structured-data.ts` | One organisation with an `@id` (address split into fields, coordinates from CASA's Google Maps entry, office hours, founding year, profiles), the website, a BreadcrumbList from the `Breadcrumbs` component, Course with its offer and dated, scheduled terms, each telc exam day as an Event with fee and registration deadline, a JobPosting for each vacancy, FAQPage on /faq |
| Share images | `src/app/og.png/route.tsx` | Each page's own image with its title, logo and stripe, in its language |
| llms.txt | `src/app/llms.txt`, `src/app/llms-full.txt`, `src/lib/llms.ts` | The site as plain text for AI assistants, built from the live data: courses with levels, prices and the next terms, exam days with deadlines, accommodation prices, contact; the full version adds every course's conditions and the FAQ |
| IndexNow | `infra/azure/deploy.sh`, `public/<key>.txt` | After each release, sends the sitemap to Bing (which ChatGPT search and Copilot read). Inactive until casa-bremen.de serves this app, then on by itself |
| Old URLs | `src/i18n/legacy-redirects.ts` | One 308 per old URL; long-dead URLs with no specific counterpart 404 on purpose |

## Rules

- Facts in structured data and llms.txt come from the same data the pages show. Never type a
  price, a date or an opening hour into them by hand.
- A new course or exam page gets a search title in `src/config/seo-pages.ts`.
- A page that shows breadcrumbs gets the BreadcrumbList for free; pass the trail to `Breadcrumbs`.

## At go-live (with the domain)

1. Point casa-bremen.de and www at the app (see `docs/AZURE_DEPLOYMENT_PLAN.md`). The
   `x-robots-tag: noindex` on every other host (`next.config.ts`) lifts by itself on the apex.
2. **Google Search Console:** add the domain property (a DNS TXT record), submit
   `https://casa-bremen.de/sitemap.xml`, then watch Pages → Not found for old URLs we missed.
3. **Bing Webmaster Tools:** import the property from Search Console. IndexNow runs from the
   next release on.
4. **Google Business Profile:** make sure the website field says `https://casa-bremen.de/` and
   that name, address and phone match the site exactly.
5. Check one course, one exam and the job page in Google's Rich Results Test.
