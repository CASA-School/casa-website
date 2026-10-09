/**
 * The pages whose hero is a night hero (night-hero.module.css): their navbar
 * takes the same ink ground, so header and hero read as one dark band.
 * Internal paths, as usePathname() from '@/i18n/navigation' returns them.
 * Add a page here when its hero becomes a night hero.
 */
export const NIGHT_HERO_PATHS: ReadonlySet<string> = new Set([
  '/ueber-uns/gemeinnuetzigkeit',
  '/accommodation',
  '/courses',
  '/exams',
]);

/**
 * Course pages with a night hero, by their [slug] in either language: the group
 * page's Stadtmusikanten (2026-10-09). usePathname() returns the route template
 * '/courses/[slug]' for every course page, so the slug has to decide.
 */
const NIGHT_HERO_COURSE_SLUGS: ReadonlySet<string> = new Set(['german-for-groups', 'deutsch-fuer-gruppen']);

export function isNightHeroPage(pathname: string | null, slug?: string | string[]) {
  if (!pathname) return false;
  if (NIGHT_HERO_PATHS.has(pathname)) return true;
  if (pathname === '/courses/[slug]') return typeof slug === 'string' && NIGHT_HERO_COURSE_SLUGS.has(slug);
  return pathname.startsWith('/courses/') && NIGHT_HERO_COURSE_SLUGS.has(pathname.slice('/courses/'.length));
}
