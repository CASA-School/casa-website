/**
 * A course number's own page (2026-10-17, Rahman: „each course its own page, even of the same level"):
 * a course's first group at the course's address, each further group — its own SchoolMan number, room
 * and teachers — at `/<n>`.
 */
export const courseHref = (courseId: string, group = 1) => `/admin/catalogue/courses/${courseId}${group > 1 ? `/${group}` : ''}`;
