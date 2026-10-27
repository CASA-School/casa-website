import { canAccess, type WorkspaceModule } from './access';
import type { StaffUser } from './auth';

/**
 * Where each kind of record opens, and the module that opens it (2026-10-27).
 *
 * One map for every place that names a record — a search hit, a booking's teacher, a course's room,
 * the way back to where a colleague came from — so a record has one address and a link to it is
 * offered only to a colleague who may open it. Pure, no database: client components use it too.
 */

export type RecordKind =
  | 'person'
  | 'booking'
  | 'staff'
  | 'course'
  | 'start'
  | 'exam'
  | 'organisation'
  | 'group'
  | 'offer'
  | 'place'
  | 'room'
  | 'enquiry'
  | 'course_registration'
  | 'exam_registration'
  | 'application';

const PATHS: Record<RecordKind, string> = {
  person: '/admin/people',
  booking: '/admin/bookings',
  staff: '/admin/staff',
  course: '/admin/catalogue/courses',
  start: '/admin/catalogue',
  exam: '/admin/catalogue/exams',
  organisation: '/admin/organisations',
  group: '/admin/groups',
  offer: '/admin/offers',
  place: '/admin/accommodation',
  room: '/admin/settings/rooms',
  enquiry: '/admin/enquiries',
  course_registration: '/admin/registrations/course',
  exam_registration: '/admin/registrations/exam',
  application: '/admin/applications',
};

/** The module whose layout serves each kind's page (`requireModule` in its `layout.tsx`). */
export const RECORD_MODULE: Record<RecordKind, WorkspaceModule> = {
  person: 'people',
  booking: 'bookings',
  staff: 'staff',
  course: 'catalogue',
  start: 'catalogue',
  exam: 'catalogue',
  organisation: 'organisations',
  group: 'groups',
  offer: 'offers',
  place: 'accommodation',
  room: 'rooms',
  enquiry: 'enquiries',
  course_registration: 'registrations',
  exam_registration: 'registrations',
  application: 'applications',
};

/**
 * A record's page. A course's further groups have their own page at `/<n>` (catalogue/course-href.ts);
 * `query` adds a tab or a filter (`tab=teaching`).
 */
export function recordHref(kind: RecordKind, id: string, options: { group?: number; query?: string } = {}): string {
  const group = kind === 'course' && options.group && options.group > 1 ? `/${options.group}` : '';
  return `${PATHS[kind]}/${id}${group}${options.query ? `?${options.query}` : ''}`;
}

/** The record's page when this colleague may open it, else null — the name is then shown as text. */
export function recordHrefFor(
  user: Pick<StaffUser, 'access'>,
  kind: RecordKind,
  id: string | null | undefined,
  options?: { group?: number; query?: string }
): string | null {
  if (!id) return null;
  return canAccess(user as StaffUser, RECORD_MODULE[kind]) ? recordHref(kind, id, options) : null;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
/** Most specific first: `/admin/catalogue/courses/…` before `/admin/catalogue/…`. */
const ROUTES: [RecordKind, RegExp][] = (
  ['course', 'exam', 'course_registration', 'exam_registration', 'room', 'start', 'person', 'booking', 'staff', 'organisation', 'group', 'offer', 'place', 'enquiry', 'application'] as const
).map((kind) => [kind, new RegExp(`^${PATHS[kind]}/(${UUID})(?:/\\d+)?/?$`, 'i')]);

/** The record a workspace address shows, if it shows one: what „recently opened" remembers. */
export function recordFromPath(pathname: string): { kind: RecordKind; id: string } | null {
  for (const [kind, pattern] of ROUTES) {
    const match = pattern.exec(pathname);
    if (match) return { kind, id: match[1].toLowerCase() };
  }
  return null;
}
