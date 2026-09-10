import type { MetadataRoute } from 'next';

import { ACCOMMODATION_TYPES_DE, toPublicPath } from '@/i18n/pathnames';
import { localeTags, locales } from '@/i18n/routing';
import { getCoursePath } from '@/lib/content/course-routes';
import { getCareerPositions, getCourses, getExamCatalog, getNewsList } from '@/lib/content/repository';
import type { ContentLocale } from '@/lib/content/types';
import { toAbsoluteUrl } from '@/lib/seo';

/**
 * One entry per page and language, each listing every language version, so a
 * search engine sees /sprachkurse and /en/courses as one page in two languages.
 *
 * Internal review surfaces, the search page and the placement runner and result
 * pages are left out: they are noindex or per-visitor.
 */
const STATIC_ROUTES: Array<{ path: string; priority: number; lastModified?: Date }> = [
  { path: '/', priority: 1 },
  { path: '/courses', priority: 0.9 },
  { path: '/exams', priority: 0.8 },
  { path: '/accommodation', priority: 0.8 },
  { path: '/accommodation/become-host', priority: 0.5 },
  { path: '/registration/course', priority: 0.7 },
  { path: '/registration/exam', priority: 0.6 },
  { path: '/placement-test', priority: 0.7 },
  { path: '/about', priority: 0.6 },
  { path: '/ueber-uns/gemeinnuetzigkeit', priority: 0.6 },
  { path: '/team', priority: 0.5 },
  { path: '/contact', priority: 0.6 },
  { path: '/faq', priority: 0.6 },
  { path: '/news', priority: 0.5 },
  { path: '/careers', priority: 0.4 },
  { path: '/calculator', priority: 0.5 },
  { path: '/resources/study-in-germany', priority: 0.5 },
  { path: '/resources/living-in-germany', priority: 0.4 },
  { path: '/resources/why-germany', priority: 0.4 },
  { path: '/imprint', priority: 0.2 },
  { path: '/privacy', priority: 0.2 },
  { path: '/terms', priority: 0.2 },
];

function entriesFor(path: string, priority: number, lastModified?: Date): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    locales.map((locale) => [localeTags[locale].hreflang, toAbsoluteUrl(toPublicPath(path, locale))])
  );

  return locales.map((locale) => ({
    url: toAbsoluteUrl(toPublicPath(path, locale)),
    lastModified,
    priority,
    alternates: { languages },
  }));
}

async function dynamicPaths(): Promise<Array<{ path: string; priority: number; lastModified?: Date }>> {
  // Content is the same set of pages in every language; read it once.
  const locale: ContentLocale = 'de';
  const found: Array<{ path: string; priority: number; lastModified?: Date }> = [];

  try {
    const [courses, exams, news, careers] = await Promise.all([
      getCourses(locale),
      getExamCatalog(locale),
      getNewsList(locale),
      getCareerPositions(locale),
    ]);

    for (const course of courses) {
      found.push({ path: getCoursePath(course.slug), priority: 0.8 });
    }
    for (const item of exams.items) {
      found.push({ path: `/exams/${item.anchorId}`, priority: 0.7 });
    }
    for (const type of Object.keys(ACCOMMODATION_TYPES_DE)) {
      found.push({ path: `/accommodation/${type}`, priority: 0.7 });
    }
    for (const post of news) {
      found.push({ path: `/news/${post.slug}`, priority: 0.4 });
    }
    for (const position of careers) {
      found.push({ path: `/careers/${position.slug}`, priority: 0.3 });
    }
  } catch {
    // A content read failing must not take the sitemap down with it; the
    // static routes still describe the site.
  }

  return found;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamic = await dynamicPaths();
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of [...STATIC_ROUTES, ...dynamic]) {
    if (seen.has(route.path)) continue;
    seen.add(route.path);
    entries.push(...entriesFor(route.path, route.priority, route.lastModified));
  }

  return entries;
}
