'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createCourseInstance } from '@/lib/admin/catalogue';
import { requireModule } from '@/lib/admin/guard';
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
  const name = text(formData, 'name', 80);
  if (!name)
    redirect(`/admin/settings/rooms/${roomId}?error=${encodeURIComponent('A room needs a name.')}`);

  const capacity = optionalInt(formData, 'capacity');
  const capacityMax = optionalInt(formData, 'capacityMax');
  if (capacity !== null && capacityMax !== null && capacityMax < capacity) {
    redirect(
      `/admin/settings/rooms/${roomId}?error=${encodeURIComponent('The maximum cannot be below the planning capacity.')}`
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
  const name = text(formData, 'name', 80);
  if (!name) redirect(`/admin/settings/rooms?error=${encodeURIComponent('A room needs a name.')}`);
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
  redirect(
    result.ok ? '/admin/catalogue' : `/admin/catalogue?error=${encodeURIComponent(result.reason)}`
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
  if (!result.ok)
    redirect(`/admin/settings/rooms/${roomId}?error=${encodeURIComponent(result.reason)}`);
  redirect('/admin/settings/rooms');
}

const DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const SESSIONS = new Set(['morning', 'afternoon', 'evening']);

/** Schedules a cohort from the catalogue. Planning `edit`. */
export async function createCohortAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const back = '/admin/catalogue';
  const courseTypeId = id(formData, 'courseTypeId');
  const startDate = String(formData.get('startDate') ?? '');
  const endDate = String(formData.get('endDate') ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    redirect(`${back}?error=${encodeURIComponent('Start and end dates are required.')}`);
  }
  if (endDate < startDate)
    redirect(`${back}?error=${encodeURIComponent('The end date is before the start.')}`);
  const capacity = optionalInt(formData, 'capacity') ?? 0;
  const session = String(formData.get('session') ?? '');
  const days = formData
    .getAll('days')
    .map(String)
    .filter((d) => DAYS.has(d));
  const time = text(formData, 'time', 40);
  const levelCode = text(formData, 'levelCode', 8);
  const roomRaw = String(formData.get('roomId') ?? '');
  if (roomRaw && !UUID.test(roomRaw)) throw new Error('Invalid roomId');

  const cohortId = await createCourseInstance(
    {
      courseTypeId,
      startDate,
      endDate,
      capacity,
      levelCode,
      session: SESSIONS.has(session) ? (session as 'morning' | 'afternoon' | 'evening') : null,
      days,
      time,
      roomId: roomRaw || null,
      title: text(formData, 'title', 120),
    },
    actor
  );
  revalidatePath('/admin/catalogue');
  revalidatePath('/admin/settings/rooms', 'layout');
  redirect(`${back}?created=${cohortId}`);
}
