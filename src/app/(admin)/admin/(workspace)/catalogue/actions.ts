'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLevelCode } from '@/lib/admin/bookings';
import { cancelCourseInstance, deleteCourseInstance, updateCourseInstance } from '@/lib/admin/catalogue';
import { readStartForm } from '@/lib/admin/course-starts';
import { cancelCourse, courseForEdit, createCourse, deleteCourse, openCourseGroup, updateCourse, type CourseInput } from '@/lib/admin/courses';
import { issueWaitlistLetter } from '@/lib/admin/letters/booking-issue';
import { readChoices } from '@/lib/admin/letters/choices';
import { WAITLIST_LETTER_KINDS, type WaitlistLetterKind } from '@/lib/admin/letters/types';
import { openPlanGroups } from '@/lib/admin/kursplanung/link';
import { canAccess } from '@/lib/admin/access';
import { findLearnersForCourse, type PersonMatch } from '@/lib/admin/course-list';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import {
  addToWaitlist,
  CLOSE_REASONS,
  courseGroup,
  closeEntry,
  moveEntry,
  moveToStart,
  offerPlace,
  takeBackOffer,
  type CloseReason,
} from '@/lib/admin/waitlist';

/**
 * The waiting list's mutations (docs/ADMIN_WORKSPACE.md §Waiting list). Putting someone in a queue,
 * offering a place, moving and closing an entry are bookings work: `bookings` at `edit`. A course of a
 * start (0041) — making one, its places, room and price, another group — is the course's own planning:
 * `rooms` at `edit`, the right that schedules a course start; cancelling and deleting one, `full`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** „Buchen" on a course in the list: learners by name or address, marked when already in it. */
export async function findCourseLearnersAction(courseId: string, text: string): Promise<PersonMatch[]> {
  const user = await requireModule('bookings', 'edit');
  if (!canAccess(user, 'people') || typeof courseId !== 'string' || !UUID.test(courseId) || typeof text !== 'string') return [];
  return findLearnersForCourse(courseId, text);
}

const id = (formData: FormData, field: string): string => {
  const value = String(formData.get(field) ?? '');
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
};
const text = (formData: FormData, field: string, max: number): string | null => {
  const value = String(formData.get(field) ?? '').trim();
  return value === '' ? null : value.slice(0, max);
};

/** Back to the page the form was on — a course start, the waiting-list screen, a person, a registration — nothing else. */
function backTo(formData: FormData, fallback: string): string {
  const raw = String(formData.get('returnTo') ?? '');
  return /^\/admin\/(catalogue|people|registrations)(\/[A-Za-z0-9\-_/]*)?(\?[A-Za-z0-9=&_.+-]*)?$/.test(raw) ? raw : fallback;
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}

async function level(formData: FormData, back: string): Promise<string> {
  const value = text(formData, 'levelCode', 8);
  if (!value || !(await isLevelCode(value))) fail(back, (await getI18n()).t('Bitte wähle ein Niveau.', 'Choose a level.'));
  return value;
}

function done(back: string): never {
  revalidatePath('/admin', 'layout');
  redirect(back);
}

export async function offerPlaceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const entryId = id(formData, 'entryId');
  const back = backTo(formData, '/admin/catalogue/waitlist');
  const result = await offerPlace(entryId, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

export async function takeBackOfferAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const entryId = id(formData, 'entryId');
  const back = backTo(formData, '/admin/catalogue/waitlist');
  const result = await takeBackOffer(entryId, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** Declined or taken off the list, with the reason. Closing is a change of state, not a delete: `edit`. */
export async function closeEntryAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const entryId = id(formData, 'entryId');
  const back = backTo(formData, '/admin/catalogue/waitlist');
  const status = String(formData.get('status') ?? '') === 'declined' ? 'declined' : 'withdrawn';
  const reason = String(formData.get('reason') ?? '');
  const { t, lang } = await getI18n();
  if (!(CLOSE_REASONS as readonly string[]).includes(reason)) fail(back, t('Bitte wähle einen Grund.', 'Choose a reason.'));
  const note = text(formData, 'note', 300);
  if (reason === 'other' && !note) fail(back, t('Bei „Sonstiges" sag kurz, worum es geht.', 'For “Other”, say briefly what it is.'));
  const result = await closeEntry(entryId, status, reason as CloseReason, note, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}

/** Another place in the queue, always with the reason: the order is the learners' fairness. */
export async function moveEntryAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const entryId = id(formData, 'entryId');
  const back = backTo(formData, '/admin/catalogue/waitlist');
  const { t, lang } = await getI18n();
  const position = Number(formData.get('position'));
  if (!Number.isInteger(position) || position < 1) fail(back, t('Bitte gib einen Platz an.', 'Give a position.'));
  const reason = text(formData, 'reason', 300);
  if (!reason) fail(back, t('Schreib dazu, warum die Reihenfolge sich ändert.', 'Say why the order changes.'));
  const result = await moveEntry(entryId, position, reason, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}

/** The same wish for another course start or level; the learner keeps the day they joined. */
export async function moveToStartAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const entryId = id(formData, 'entryId');
  const back = backTo(formData, '/admin/catalogue/waitlist');
  const courseInstanceId = id(formData, 'courseInstanceId');
  const levelCode = await level(formData, back);
  const result = await moveToStart(entryId, courseInstanceId, levelCode, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** From a course start's page: a learner the office already knows, into a level's queue. */
export async function addToWaitlistAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const personId = id(formData, 'personId');
  const courseInstanceId = id(formData, 'courseInstanceId');
  const back = backTo(formData, `/admin/catalogue/${courseInstanceId}`);
  const levelCode = await level(formData, back);
  const registrationId = String(formData.get('registrationId') ?? '');
  const result = await addToWaitlist(
    {
      personId,
      courseInstanceId,
      levelCode,
      source: UUID.test(registrationId) ? 'registration' : formData.get('source') === 'booking' ? 'booking' : 'office',
      registrationId: UUID.test(registrationId) ? registrationId : null,
      note: text(formData, 'note', 300),
    },
    actor
  );
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** The course form's fields: places, room, whether it is offered, and a module's name, price and lessons. */
async function courseInput(formData: FormData, back: string): Promise<CourseInput> {
  const { t } = await getI18n();
  const groups = Number(formData.get('groups'));
  const placesPerGroup = Number(formData.get('placesPerGroup'));
  if (!Number.isInteger(groups) || groups < 0 || groups > 9) fail(back, t('Gruppen: 0 bis 9.', 'Groups: 0 to 9.'));
  if (!Number.isInteger(placesPerGroup) || placesPerGroup < 1 || placesPerGroup > 40) fail(back, t('Plätze pro Gruppe: 1 bis 40.', 'Places per group: 1 to 40.'));
  const money = text(formData, 'price', 12);
  const price = money === null ? null : Number(money.replace(',', '.'));
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 100000)) fail(back, t('Der Preis ist keine Zahl.', 'The price is not a number.'));
  const count = text(formData, 'lessons', 6);
  const lessons = count === null ? null : Number(count);
  if (lessons !== null && (!Number.isInteger(lessons) || lessons < 0 || lessons > 2000)) fail(back, t('Unterrichtseinheiten: eine ganze Zahl.', 'Lessons: a whole number.'));
  const room = String(formData.get('roomId') ?? '');
  return {
    roomId: UUID.test(room) ? room : null,
    groups,
    placesPerGroup,
    bookable: formData.get('bookable') === 'on',
    title: text(formData, 'title', 120),
    price: price === null ? null : Math.round(price * 100) / 100,
    lessons,
    note: text(formData, 'note', 500),
  };
}

/** A new course of a start: a level, or a module's (a group's, a company's) own name. */
export async function createCourseAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const courseInstanceId = id(formData, 'courseInstanceId');
  const back = backTo(formData, `/admin/catalogue/${courseInstanceId}`);
  const raw = text(formData, 'levelCode', 8);
  if (raw && !(await isLevelCode(raw))) fail(back, (await getI18n()).t('Bitte wähle ein Niveau.', 'Choose a level.'));
  const result = await createCourse(courseInstanceId, { levelCode: raw, ...(await courseInput(formData, back)) }, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** A course's places, room, whether it is offered, and a module's name, price and lessons. */
export async function updateCourseAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const courseId = id(formData, 'courseId');
  const course = await courseForEdit(courseId);
  const back = backTo(formData, course ? `/admin/catalogue/${course.courseInstanceId}` : '/admin/catalogue');
  const result = await updateCourse(courseId, await courseInput(formData, back), actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** Called off: kept, no longer offered — not while anyone is booked or waits. */
export async function cancelCourseAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'full');
  const courseId = id(formData, 'courseId');
  const course = await courseForEdit(courseId);
  const back = backTo(formData, course ? `/admin/catalogue/${course.courseInstanceId}` : '/admin/catalogue');
  if (formData.get('confirmed') !== '1') redirect(back);
  const result = await cancelCourse(courseId, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** Gone, for a course made by mistake. */
export async function deleteCourseAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'full');
  const courseId = id(formData, 'courseId');
  const course = await courseForEdit(courseId);
  const back = backTo(formData, course ? `/admin/catalogue/${course.courseInstanceId}` : '/admin/catalogue');
  if (formData.get('confirmed') !== '1') redirect(back);
  const result = await deleteCourse(courseId, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** A second group of the course: more places, and the queue can be booked in order. */
export async function openGroupAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const courseId = id(formData, 'courseId');
  const course = await courseForEdit(courseId);
  const back = backTo(formData, course ? `/admin/catalogue/${course.courseInstanceId}` : '/admin/catalogue');
  if (formData.get('confirmed') !== '1' || !course) redirect(back);
  const shown = await courseGroup(courseId);
  const result = await openCourseGroup(courseId, (shown?.groups ?? course.groups) + 1, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  // The same group on the Kursplanung board, when the board has the month.
  if (course.levelCode) await openPlanGroups(course.courseInstanceId, course.levelCode, actor);
  done(back);
}

/** A waiting-list letter, sent — and what it says, done: a free place held, or the learner off the list. */
export async function issueWaitlistLetterAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const entryId = id(formData, 'entryId');
  const kind = String(formData.get('kind') ?? '');
  if (!(WAITLIST_LETTER_KINDS as readonly string[]).includes(kind)) throw new Error('Invalid kind');
  const back = `/admin/catalogue/waitlist/${entryId}/letter?kind=${kind.replace('waitlist_', '')}`;
  const choices = readChoices(formData);
  const { t, lang } = await getI18n();
  if (!choices) fail(back, t('Der Brief konnte nicht gelesen werden.', 'The letter could not be read.'));
  const result = await issueWaitlistLetter(entryId, kind as WaitlistLetterKind, choices, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  revalidatePath('/admin', 'layout');
  redirect(`/admin/letters/${result.letterId}?sent=1`);
}

// ------------------------------------------------------------------ a course start

/**
 * A start's dates, schedule, title, room and website, from its page („Bearbeiten"): the course
 * planners' (`rooms` at `edit`), as „Termin planen" is. Sent back to the form with the reason when it
 * cannot be saved, so nothing typed is lost.
 */
export async function updateStartAction(_previous: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  const actor = await requireModule('rooms', 'edit');
  const startId = id(formData, 'startId');
  const { lang } = await getI18n();
  const read = readStartForm(formData);
  if (!read.ok) return { error: pick(lang, read.error) };
  const result = await updateCourseInstance(startId, read.value, actor);
  if (!result.ok) return { error: pick(lang, result.reason) };
  done(`/admin/catalogue/${startId}`);
}

/** Called off, with the confirmation: off the website, kept with its courses — not while anyone is booked or waits. */
export async function cancelStartAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'full');
  const startId = id(formData, 'startId');
  const back = `/admin/catalogue/${startId}`;
  if (formData.get('confirmed') !== '1') fail(back, (await getI18n()).t('Bitte bestätige das Absagen.', 'Please confirm the cancellation.'));
  const result = await cancelCourseInstance(startId, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** A start planned here by mistake, never used, with the confirmation. */
export async function deleteStartAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'full');
  const startId = id(formData, 'startId');
  const back = `/admin/catalogue/${startId}`;
  if (formData.get('confirmed') !== '1') fail(back, (await getI18n()).t('Bitte bestätige das Löschen.', 'Please confirm the deletion.'));
  const result = await deleteCourseInstance(startId, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done('/admin/catalogue');
}
