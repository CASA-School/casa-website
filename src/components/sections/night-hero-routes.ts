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
