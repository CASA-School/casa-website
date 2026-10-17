'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLevelCode } from '@/lib/admin/bookings';
import { issueWaitlistLetter } from '@/lib/admin/letters/booking-issue';
import { readChoices } from '@/lib/admin/letters/choices';
import { WAITLIST_LETTER_KINDS, type WaitlistLetterKind } from '@/lib/admin/letters/types';
import { openPlanGroups } from '@/lib/admin/kursplanung/link';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import {
  addToWaitlist,
  CLOSE_REASONS,
  closeEntry,
  moveEntry,
  moveToStart,
  offerPlace,
  openGroup,
  setPlaces,
  takeBackOffer,
  type CloseReason,
} from '@/lib/admin/waitlist';

/**
 * The waiting list's mutations (docs/ADMIN_WORKSPACE.md §Waiting list). Putting someone in a queue,
 * offering a place, moving and closing an entry are bookings work: `bookings` at `edit`. How many
 * places a level has, and opening another group, is the course's own planning: `rooms` at `edit`,
 * the right that schedules a course start.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** How many groups a level has and how many learners a group takes. */
export async function setPlacesAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const courseInstanceId = id(formData, 'courseInstanceId');
  const back = backTo(formData, `/admin/catalogue/${courseInstanceId}`);
  const levelCode = await level(formData, back);
  const groups = Number(formData.get('groups'));
  const placesPerGroup = Number(formData.get('placesPerGroup'));
  const { t } = await getI18n();
  if (!Number.isInteger(groups) || groups < 0 || groups > 9) fail(back, t('Gruppen: 0 bis 9.', 'Groups: 0 to 9.'));
  if (!Number.isInteger(placesPerGroup) || placesPerGroup < 1 || placesPerGroup > 40) fail(back, t('Plätze pro Gruppe: 1 bis 40.', 'Places per group: 1 to 40.'));
  await setPlaces(courseInstanceId, levelCode, groups, placesPerGroup, actor);
  done(back);
}

/** A second group of the same level: more places, and the queue can be booked in order. */
export async function openGroupAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const courseInstanceId = id(formData, 'courseInstanceId');
  const back = backTo(formData, `/admin/catalogue/${courseInstanceId}`);
  const levelCode = await level(formData, back);
  if (formData.get('confirmed') !== '1') redirect(back);
  const result = await openGroup(courseInstanceId, levelCode, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  // The same group on the Kursplanung board, when the board has the month.
  await openPlanGroups(courseInstanceId, levelCode, actor);
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
