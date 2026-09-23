import { notFound } from 'next/navigation';

/**
 * Every path under a language that no route claims lands here and 404s inside
 * the locale layout, so it gets `[locale]/not-found.tsx` — the language on
 * <html>, the site chrome and links on — instead of Next's bare English page.
 * This is next-intl's catch-all pattern.
 *
 * Not a route: it renders nothing, has no metadata and no public URL, and is
 * the one page deliberately absent from src/i18n/pathnames.ts (the route-tree
 * test exempts exactly this path). Static and dynamic routes always match
 * before a catch-all, so it shadows no page.
 *
 * It does match a path the proxy leaves without a language — an unknown
 * `/api/…` route, a missing file under `/media` — as `[locale]=api` and so on.
 * The layout rejects that segment before this page runs, so those 404 with
 * Next's plain body under the site's head. Workspace misses never get here:
 * `(admin)/admin/(workspace)/[...rest]` claims them first.
 */
export default function UnmatchedPath(): never {
  notFound();
}
