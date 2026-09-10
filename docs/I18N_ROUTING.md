# Languages and URLs

**Decided 2026-09-10 with the product owner.** One domain. German is the language of
`casa-bremen.de` and lives at the root under the paths the old site has used for years.
Every other language carries its own prefix: `/en/…` now, `/ar/…`, `/tr/…`, `/es/…` later.
German and English are the two languages at launch.

| Page | German (root) | English |
| --- | --- | --- |
| Home | `/` | `/en` |
| Courses | `/sprachkurse` | `/en/courses` |
| Intensive German | `/sprachkurse/deutsch-intensiv` | `/en/courses/intensive-german` |
| telc B2 | `/pruefungszentrum/telc-deutsch-b2` | `/en/exams/b2` |
| Shared flat | `/unterkunft/die-casa-wg` | `/en/accommodation/flat` |
| Placement test | `/anmeldung/einstufungstest` | `/en/placement-test` |
| Contact | `/kontakt` | `/en/contact` |

The complete map is `src/i18n/pathnames.ts`. `/de/…` is never a URL: it redirects to the
root form. So does an English path typed at the root (`/courses` → `/sprachkurse`) and an
English slug under a German segment (`/sprachkurse/intensive-german` →
`/sprachkurse/deutsch-intensiv`). One page, one URL per language.

## Why this shape

- **German at the root** because the domain is `.de`, the Ad Grants account is a German
  nonprofit, and the old site's German URLs are at the root. Keeping them means every link
  on the web and every ranking on Google.de carries over without a redirect. German
  universities with an international audience do the same (`uni-bremen.de/en/`).
- **Prefixes, not subdomains or country domains**, so there is one deployment, one
  authority and one Ad Grants domain, and hreflang ties the versions together.
- **No detection.** A request is answered in the language of its URL, never redirected by
  cookie or `Accept-Language`. A crawler that sent `Accept-Language: en` would otherwise be
  bounced off every German page and never index them. Search results already land visitors
  on the right language through hreflang; the switcher covers the rest.
- **Language is not location.** A visitor in Bremen with an English browser reads English,
  a visitor in Dubai reads Arabic once it exists. hreflang tells Google which version to
  show where.

## How it works

- `src/i18n/routing.ts` — the languages, the default, text direction, hreflang and Open
  Graph tags.
- `src/i18n/pathnames.ts` — the URL map: one internal (English) path per route, its German
  form, and per-segment aliases for course slugs, exam codes and accommodation types.
  `toPublicPath`, `toInternalPath`, `localizeHref`. Pure functions, unit-tested.
- `src/proxy.ts` — on the public host, resolves the incoming path to a language and an
  internal path, redirects non-canonical forms with 308, and hands next-intl the internal
  path so the language reaches every server component and `generateMetadata`. Host routing
  for the staff workspace runs first and is unchanged.
- `src/app/(site)/[locale]/layout.tsx` — validates the segment, `setRequestLocale`, sets
  `lang` and `dir` on `<html>`, hands the language to the shell as a prop.
- `src/i18n/navigation.tsx` — `Link`, `useRouter`, `usePathname` for the site. They take
  internal paths and localise them from the current URL, so they need no provider and work
  in every tree. `usePathname` returns the internal path, so `pathname === '/courses'` keeps
  meaning what it says on a German URL.
- `src/i18n/redirect.ts` — `redirectLocalized` for server-side redirects.
- `src/lib/seo.ts` — `createPublicMetadata` takes `locale` and emits the canonical URL of
  that language, hreflang for every language, `x-default` on the German root, and
  `og:locale`.
- `src/app/sitemap.ts`, `src/app/robots.ts` — every page in every language, with alternates.
- `src/lib/content/locale.server.ts` — `getContentLocale()` reads the request language from
  next-intl; every existing caller kept working unchanged. The `casa_locale` cookie is gone.
- `/api/search/suggest` takes `locale` as a query parameter, because a route handler's URL
  carries no language.

## Rules

1. **Write internal paths.** `href="/courses/intensive-german"` is correct in every
   language. Never write `/en/…` or a German path in code.
2. **In the site, import `Link`, `useRouter`, `usePathname` from `@/i18n/navigation`**,
   never from `next/link` or `next/navigation`. No raw `<a href="/…">` to a site path.
3. **A new route is one entry in `src/i18n/pathnames.ts`.** A test walks the route tree and
   fails when a page has no entry, so an unmapped URL cannot ship.
4. **Every page uses `generateMetadata`**, resolves `getContentLocale()` and passes
   `locale` to `createPublicMetadata`. Static `export const metadata` cannot know the
   language and produces a wrong canonical.
5. **Fetch content in the request language.** `getCourseDetail(slug, locale)`, not `'en'`.

## Adding a language

1. Add it to `locales` in `src/i18n/routing.ts`, with its tags. Add it to `RTL_LOCALES` if
   it reads right to left.
2. Add `src/messages/<locale>.json`.
3. Translate the content: rows with a `locale` column in the database and the fixtures, the
   inline copy (until the message catalogs exist, see below), and the FAQ.
4. Fonts: Plus Jakarta Sans covers Latin including Turkish. Arabic and Chinese need a
   fallback face loaded for that language only.
5. Right-to-left: convert the remaining directional utilities (`ml-`, `pl-`, `left-`…) to
   logical ones (`ms-`, `ps-`, `start-`), mirror directional icons, check every hero.
6. Launch the language when its core set is translated: home, courses and prices,
   registration, accommodation, placement test, contact, FAQ. Legal pages stay German as
   the binding version.
7. Extend the e2e test in `e2e/smoke.spec.ts` that covers the root and `/en`.

Nothing in `pathnames.ts` needs to change unless the language gets its own slugs; the
English internal paths are served under the new prefix.

## Not done yet

- **Interface strings are still inline ternaries** (`locale === 'de' ? … : …`, about a
  thousand of them). They work for two languages because the locale now comes from the URL.
  Before a third language they move into per-language message catalogs; that is the next
  i18n step and the largest.
- News and career slugs pass through untranslated, so a German article has a German slug
  only if its content row does.
- Redirects from the old site's English paths (`/en/language-courses/…`) are not mapped yet.
  The German paths need none.
