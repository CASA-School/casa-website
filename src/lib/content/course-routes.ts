const publicCourseSlugs: Record<string, string> = {
  'intensive-german': 'intensive-german',
  'evening-german': 'evening-course',
  'special-courses': 'special-courses',
  'german-for-groups': 'german-for-groups',
  'medical-german': 'german-for-medical',
  'in-company': 'firmenunterricht',
  bildungszeit: 'bildungszeit',
};

const contentCourseSlugs = Object.fromEntries(
  Object.entries(publicCourseSlugs).map(([contentSlug, publicSlug]) => [publicSlug, contentSlug])
);

export function getCourseContentSlug(routeSlug: string) {
  return contentCourseSlugs[routeSlug] ?? routeSlug;
}

export function getPublicCourseSlug(contentSlug: string) {
  return publicCourseSlugs[contentSlug] ?? contentSlug;
}

export function getCanonicalCourseRouteSlug(routeSlug: string) {
  return getPublicCourseSlug(getCourseContentSlug(routeSlug));
}

export function getCoursePath(contentSlug: string) {
  return `/courses/${getPublicCourseSlug(contentSlug)}`;
}
