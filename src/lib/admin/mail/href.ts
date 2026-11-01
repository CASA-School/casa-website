import type { WorkspaceModule } from '../access';

/**
 * „E-Mail" anywhere in the workspace opens the mail screen (Rahman, 2026-10-23: „we should have such an
 * interface always when we send letters or emails through the platform directly"): `/admin/mail?to=…`,
 * the record the mail is about. Letters have their own (`/admin/letters/mail`), the teachers' test mail
 * too (`/admin/day/tests/mail`). Safe for the browser.
 */

export type MailAbout =
  | 'person'
  | 'staff'
  | 'organisation'
  | 'contact'
  | 'accommodation'
  | 'enquiry'
  | 'registration'
  | 'course_registration'
  | 'exam_registration'
  | 'application'
  | 'class'
  | 'teacher_list'
  /** Everyone booked into an exam sitting, in Bcc (2026-10-27). */
  | 'exam_sitting'
  /** Who examines or supervises a sitting. */
  | 'exam_examiners'
  /** A group of learners or of the team, by its key (`audience-keys.ts`, 2026-11-01): a „Rundmail". */
  | 'learners'
  | 'team';

/**
 * The rights a mail about each kind of record is written with: the first one the colleague has. A learner
 * is written to from the learners, a booking, a flat or the waiting list alike.
 */
export const MAIL_MODULES: Record<MailAbout, readonly WorkspaceModule[]> = {
  person: ['people', 'bookings', 'accommodation', 'catalogue'],
  staff: ['staff'],
  organisation: ['organisations'],
  contact: ['organisations'],
  accommodation: ['accommodation'],
  enquiry: ['enquiries'],
  registration: ['registrations'],
  course_registration: ['registrations'],
  exam_registration: ['registrations'],
  application: ['applications'],
  class: ['day'],
  teacher_list: ['day'],
  exam_sitting: ['bookings'],
  exam_examiners: ['catalogue', 'staff'],
  learners: ['people'],
  team: ['staff'],
};

/** Mail to a group: about no one record, by the group's key. */
export const isGroupMail = (about: MailAbout): about is 'learners' | 'team' => about === 'learners' || about === 'team';

export const isMailAbout = (value: string): value is MailAbout => value in MAIL_MODULES;

export function mailHref(about: MailAbout, id: string, options: { subject?: string; address?: string; back?: string } = {}): string {
  const query = new URLSearchParams({ to: `${about}:${id}` });
  if (options.subject) query.set('subject', options.subject);
  if (options.address) query.set('address', options.address);
  if (options.back) query.set('back', options.back);
  return `/admin/mail?${query.toString()}`;
}
