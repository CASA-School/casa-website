'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getSitting, setCapacity, setFiled } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * An exam sitting's own mutations (0036). Reporting candidates to telc is bookings work: `bookings`
 * at `edit`. How many places a sitting has is the catalogue's: `catalogue` at `edit`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const id = (formData: FormData, field: string): string => {
  const value = String(formData.get(field) ?? '');
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
};

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
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

/** How many candidates the sitting takes; never fewer than are booked. */
export async function setSittingPlacesAction(formData: FormData): Promise<void> {
  const actor = await requireModule('catalogue', 'edit');
  const sittingId = id(formData, 'sittingId');
  const back = `/admin/catalogue/exams/${sittingId}`;
  const { t } = await getI18n();
  const capacity = Number(formData.get('capacity'));
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) fail(back, t('Bitte gib eine Zahl der Plätze an.', 'Give the number of places.'));
  const sitting = await getSitting(sittingId);
  if (!sitting) fail(back, t('Diesen Termin gibt es nicht mehr.', 'That sitting no longer exists.'));
  if (capacity < sitting.booked) fail(back, t(`Es sind schon ${sitting.booked} gebucht.`, `${sitting.booked} are already booked.`));
  await setCapacity(sittingId, capacity, actor);
  done(back);
}
