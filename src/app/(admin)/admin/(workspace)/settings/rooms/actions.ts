'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLevelCode } from '@/lib/admin/bookings';
import { createCourseInstance } from '@/lib/admin/catalogue';
import { readStartForm } from '@/lib/admin/course-starts';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { assignRoom, createRoom, deleteRoom, updateRoom, type RoomKind } from '@/lib/admin/rooms';

/** Planning module mutations. Creating and editing need `edit`; deleting needs `full`. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set<string>(['classroom', 'office', 'meeting', 'other']);

function id(formData: FormData, field: string): string {
  const value = String(formData.get(field) ?? '');
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}

function optionalInt(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 500) throw new Error(`Invalid ${field}`);
  return n;
}

function text(formData: FormData, field: string, max: number): string | null {
  const value = String(formData.get(field) ?? '').trim();
  return value === '' ? null : value.slice(0, max);
}

export async function updateRoomAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const roomId = id(formData, 'roomId');
  const kind = String(formData.get('kind') ?? '');
  if (!KINDS.has(kind)) throw new Error('Invalid kind');
  const { t } = await getI18n();
  const name = text(formData, 'name', 80);
  if (!name)
    redirect(
      `/admin/settings/rooms/${roomId}?error=${encodeURIComponent(t('Ein Raum braucht einen Namen.', 'A room needs a name.'))}`
    );

  const capacity = optionalInt(formData, 'capacity');
  const capacityMax = optionalInt(formData, 'capacityMax');
  if (capacity !== null && capacityMax !== null && capacityMax < capacity) {
    redirect(
      `/admin/settings/rooms/${roomId}?error=${encodeURIComponent(
        t('Das Maximum darf nicht unter der geplanten Kapazität liegen.', 'The maximum cannot be below the planning capacity.')
      )}`
    );
  }

  await updateRoom(
    roomId,
    {
      name,
      nickname: text(formData, 'nickname', 40),
      kind: kind as RoomKind,
      capacity,
      capacityMax: capacityMax ?? capacity,
      isBookable: formData.get('isBookable') === 'on',
      isActive: formData.get('isActive') === 'on',
      notes: text(formData, 'notes', 500),
    },
    actor
  );
  revalidatePath('/admin/settings/rooms', 'layout');
  revalidatePath('/admin/catalogue');
  redirect(`/admin/settings/rooms/${roomId}?ok=1`);
}

export async function createRoomAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const locationId = id(formData, 'locationId');
  const { t } = await getI18n();
  const name = text(formData, 'name', 80);
  if (!name)
    redirect(`/admin/settings/rooms?error=${encodeURIComponent(t('Ein Raum braucht einen Namen.', 'A room needs a name.'))}`);
  const kind = String(formData.get('kind') ?? 'classroom');
  if (!KINDS.has(kind)) throw new Error('Invalid kind');
  const floorRaw = String(formData.get('floor') ?? '').trim();
  const floor = floorRaw === '' ? null : Number(floorRaw);
  if (floor !== null && (!Number.isInteger(floor) || floor < -3 || floor > 30)) {
    throw new Error('Invalid floor');
  }
  const capacity = optionalInt(formData, 'capacity');

  const roomId = await createRoom(
    {
      locationId,
      name,
      nickname: text(formData, 'nickname', 40),
      floor,
      kind: kind as RoomKind,
      capacity,
      capacityMax: optionalInt(formData, 'capacityMax') ?? capacity,
    },
    actor
  );
  revalidatePath('/admin/settings/rooms', 'layout');
  redirect(`/admin/settings/rooms/${roomId}`);
}

/** From the catalogue: put a cohort in a room. An empty value clears it. */
export async function assignRoomAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const courseInstanceId = id(formData, 'courseInstanceId');
  const raw = String(formData.get('roomId') ?? '');
  const roomId = raw === '' ? null : raw;
  if (roomId !== null && !UUID.test(roomId)) throw new Error('Invalid roomId');

  const result = await assignRoom(courseInstanceId, roomId, actor);
  revalidatePath('/admin/catalogue');
  revalidatePath('/admin/settings/rooms', 'layout');
  const { lang } = await getI18n();
  redirect(
    result.ok ? '/admin/catalogue' : `/admin/catalogue?error=${encodeURIComponent(pick(lang, result.reason))}`
  );
}

/** Only after the confirmation dialog: the hidden `confirmed` field must be set. */
export async function deleteRoomAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'full');
  const roomId = id(formData, 'roomId');
  if (formData.get('confirmed') !== '1') redirect(`/admin/settings/rooms/${roomId}`);

  const result = await deleteRoom(roomId, actor);
  revalidatePath('/admin/settings/rooms', 'layout');
  revalidatePath('/admin/catalogue');
  if (!result.ok) {
    const { lang } = await getI18n();
    redirect(`/admin/settings/rooms/${roomId}?error=${encodeURIComponent(pick(lang, result.reason))}`);
  }
  redirect('/admin/settings/rooms');
}

/** What „Termin planen" shows when it is sent back: the reason, in the reader's language. */
export type CohortFormState = { error: string | null };

/**
 * Schedules a course start from the catalogue (planning `edit`), and opens it. The form's dates,
 * schedule, room and website go through `readStartForm`: an en dash or spaces in the hours are read,
 * empty hours take the time of day's, and anything else unreadable comes back to the form with the
 * reason instead of failing on the database's check.
 */
export async function createCohortAction(_previous: CohortFormState, formData: FormData): Promise<CohortFormState> {
  const actor = await requireModule('rooms', 'edit');
  const { t, lang } = await getI18n();
  const courseTypeId = String(formData.get('courseTypeId') ?? '');
  if (!UUID.test(courseTypeId)) return { error: t('Bitte wähle einen Kurs.', 'Choose a course.') };
  const read = readStartForm(formData);
  if (!read.ok) return { error: pick(lang, read.error) };
  const levelCode = text(formData, 'levelCode', 8);
  if (levelCode && !(await isLevelCode(levelCode))) return { error: t('Bitte wähle ein Niveau.', 'Choose a level.') };
  const places = Number(String(formData.get('placesPerGroup') ?? '14').trim() || '14');
  if (!Number.isInteger(places) || places < 1 || places > 40) return { error: t('Plätze pro Gruppe: 1 bis 40.', 'Places per group: 1 to 40.') };

  const result = await createCourseInstance({ courseTypeId, capacity: places, levelCode, ...read.value }, actor);
  if (!result.ok) return { error: pick(lang, result.reason) };
  revalidatePath('/admin/catalogue');
  revalidatePath('/admin/settings/rooms', 'layout');
  redirect(`/admin/catalogue/${result.id}`);
}
