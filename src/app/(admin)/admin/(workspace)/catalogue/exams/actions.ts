'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { canAccess } from '@/lib/admin/access';
import { isExamParts } from '@/lib/admin/exam-parts';
import { assignExaminer, unassignExaminer } from '@/lib/admin/examiners';
import { cancelSitting, createSitting, deleteSitting, findCandidates, markCollected, saveResults, setFiled, updateSitting, type CandidateMatch, type SittingInput } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { issueSittingLetters, SITTING_LETTER_KINDS, type SittingLetterKind } from '@/lib/admin/letters/exam-bulk';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * An exam sitting's own mutations (0036, 0038). Reporting candidates to telc, their results and the
 * handover are bookings work: `bookings` at `edit`. The sitting itself — creating, editing, its
 * places, who examines it — is the catalogue's: `catalogue` at `edit`; cancelling and deleting one,
 * at `full`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const id = (formData: FormData, field: string): string => {
  const value = String(formData.get(field) ?? '');
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
};

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}

/**
 * „Buchen" on a sitting, its first step: who. A name or an address finds the learners to book (not
 * colleagues); booking is `bookings` at `edit`, and the people found are the `people` module's.
 */
export async function findCandidatesAction(sittingId: string, text: string): Promise<CandidateMatch[]> {
  const user = await requireModule('bookings', 'edit');
  if (!canAccess(user, 'people') || typeof sittingId !== 'string' || !UUID.test(sittingId) || typeof text !== 'string') return [];
  return findCandidates(sittingId, text);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The sitting form: the exam, the day, the hours, the deadline, the places, on the website or not. */
async function sittingInput(formData: FormData, back: string): Promise<SittingInput> {
  const { t } = await getI18n();
  const day = String(formData.get('day') ?? '');
  const startTime = String(formData.get('startTime') ?? '');
  const endTime = String(formData.get('endTime') ?? '');
  const deadline = String(formData.get('deadline') ?? '');
  const capacity = Number(formData.get('capacity'));
  if (!DATE.test(day)) fail(back, t('Bitte gib den Prüfungstag an.', 'Give the exam day.'));
  if (!TIME.test(startTime) || !TIME.test(endTime)) fail(back, t('Bitte gib Beginn und Ende an.', 'Give the start and the end.'));
  if (deadline && !DATE.test(deadline)) fail(back, t('Der Anmeldeschluss ist kein Datum.', 'The deadline is not a date.'));
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) fail(back, t('Bitte gib eine Zahl der Plätze an.', 'Give the number of places.'));
  return { examTypeId: id(formData, 'examTypeId'), day, startTime, endTime, deadline: deadline || null, capacity, published: formData.get('published') === 'on' };
}

/** A new sitting, from the Prüfungen list. */
export async function createSittingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('catalogue', 'edit');
  const back = '/admin/catalogue/exams';
  const result = await createSitting(await sittingInput(formData, back), actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(`/admin/catalogue/exams/${result.id}`);
}

export async function updateSittingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('catalogue', 'edit');
  const sittingId = id(formData, 'sittingId');
  const back = `/admin/catalogue/exams/${sittingId}`;
  const result = await updateSitting(sittingId, await sittingInput(formData, back), actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** Called off, with the confirmation: not while anyone is booked or waits. */
export async function cancelSittingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('catalogue', 'full');
  const sittingId = id(formData, 'sittingId');
  const back = `/admin/catalogue/exams/${sittingId}`;
  if (formData.get('confirmed') !== '1') fail(back, (await getI18n()).t('Bitte bestätige das Absagen.', 'Please confirm the cancellation.'));
  const result = await cancelSitting(sittingId, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** A sitting made here by mistake, unused, with the confirmation. */
export async function deleteSittingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('catalogue', 'full');
  const sittingId = id(formData, 'sittingId');
  const back = `/admin/catalogue/exams/${sittingId}`;
  if (formData.get('confirmed') !== '1') fail(back, (await getI18n()).t('Bitte bestätige das Löschen.', 'Please confirm the deletion.'));
  const result = await deleteSitting(sittingId, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done('/admin/catalogue/exams');
}

/** telc's results, as entered on the results page: one select per part sat. */
export async function saveResultsAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const sittingId = id(formData, 'sittingId');
  const bookingIds = formData
    .getAll('bookingIds')
    .map(String)
    .filter((value) => UUID.test(value));
  await saveResults(
    sittingId,
    bookingIds.map((bookingId) => ({ bookingId, written: formData.get(`written-${bookingId}`), oral: formData.get(`oral-${bookingId}`) })),
    actor
  );
  done(`/admin/catalogue/exams/${sittingId}`);
}

/** The result handed over at the office; the note says to whom when it was not the candidate. */
export async function markCollectedAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const sittingId = id(formData, 'sittingId');
  const back = `/admin/catalogue/exams/${sittingId}`;
  const note = String(formData.get('note') ?? '').trim().slice(0, 300) || null;
  const result = await markCollected(id(formData, 'bookingId'), note, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

function done(back: string): never {
  revalidatePath('/admin', 'layout');
  redirect(back);
}

/** The ticked candidates were reported to telc for the sitting. */
export async function fileCandidatesAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const sittingId = id(formData, 'sittingId');
  const back = `/admin/catalogue/exams/${sittingId}`;
  const bookingIds = formData
    .getAll('bookingIds')
    .map(String)
    .filter((value) => UUID.test(value));
  if (bookingIds.length === 0) fail(back, (await getI18n()).t('Bitte wähle mindestens eine Person.', 'Choose at least one person.'));
  await setFiled(sittingId, bookingIds, true, actor);
  done(back);
}

/** A report marked by mistake is taken back. */
export async function unfileCandidateAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const sittingId = id(formData, 'sittingId');
  await setFiled(sittingId, [id(formData, 'bookingId')], false, actor);
  done(`/admin/catalogue/exams/${sittingId}`);
}

/** One letter to each ticked candidate of the sitting, kept on their bookings; then all of them, to print or send. */
export async function issueSittingLettersAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const sittingId = id(formData, 'sittingId');
  const kind = String(formData.get('kind') ?? '');
  if (!(SITTING_LETTER_KINDS as readonly string[]).includes(kind)) throw new Error('Invalid kind');
  const back = `/admin/catalogue/exams/${sittingId}/letters?kind=${kind}`;
  const bookingIds = formData
    .getAll('bookingIds')
    .map(String)
    .filter((value) => UUID.test(value));
  const { t } = await getI18n();
  if (bookingIds.length === 0) fail(back, t('Bitte wähle mindestens eine Person.', 'Choose at least one person.'));
  const signature = String(formData.get('signatureId') ?? '');
  const { letterIds } = await issueSittingLetters(sittingId, kind as SittingLetterKind, bookingIds, UUID.test(signature) ? signature : null, actor);
  if (letterIds.length === 0) fail(back, t('Kein Brief konnte gesendet werden.', 'No letter could be sent.'));
  revalidatePath('/admin', 'layout');
  redirect(`/admin/catalogue/exams/${sittingId}/letters/print?ids=${letterIds.join(',')}`);
}

/** Puts a colleague on the sitting for the written supervision, the oral part or both (0039). */
export async function assignExaminerAction(formData: FormData): Promise<void> {
  const actor = await requireModule('catalogue', 'edit');
  const sittingId = id(formData, 'sittingId');
  const back = `/admin/catalogue/exams/${sittingId}`;
  const { t, lang } = await getI18n();
  const part = String(formData.get('part') ?? '');
  if (!isExamParts(part)) fail(back, t('Bitte wähle, was die Person übernimmt.', 'Choose what they do.'));
  const result = await assignExaminer(sittingId, id(formData, 'staffId'), part, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}

/** Takes a colleague off the sitting; nothing is lost, they can be put on again. */
export async function unassignExaminerAction(formData: FormData): Promise<void> {
  const actor = await requireModule('catalogue', 'edit');
  const sittingId = id(formData, 'sittingId');
  await unassignExaminer(sittingId, id(formData, 'staffId'), actor);
  done(`/admin/catalogue/exams/${sittingId}`);
}
