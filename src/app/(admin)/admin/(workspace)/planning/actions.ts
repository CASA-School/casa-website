'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireModule } from '@/lib/admin/guard';
import { assignRoom, createRoom, updateRoom, type RoomKind } from '@/lib/admin/rooms';

/** Planning module mutations. Every one starts with the module guard. */

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
  const actor = await requireModule('planning');
  const roomId = id(formData, 'roomId');
  const kind = String(formData.get('kind') ?? '');
  if (!KINDS.has(kind)) throw new Error('Invalid kind');
  const name = text(formData, 'name', 80);
  if (!name)
    redirect(`/admin/planning/rooms/${roomId}?error=${encodeURIComponent('A room needs a name.')}`);

  const capacity = optionalInt(formData, 'capacity');
  const capacityMax = optionalInt(formData, 'capacityMax');
  if (capacity !== null && capacityMax !== null && capacityMax < capacity) {
    redirect(
      `/admin/planning/rooms/${roomId}?error=${encodeURIComponent('The maximum cannot be below the planning capacity.')}`
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
  revalidatePath('/admin/planning', 'layout');
  revalidatePath('/admin/catalogue');
  redirect(`/admin/planning/rooms/${roomId}?ok=1`);
}

export async function createRoomAction(formData: FormData): Promise<void> {
  const actor = await requireModule('planning');
  const locationId = id(formData, 'locationId');
  const name = text(formData, 'name', 80);
  if (!name) redirect(`/admin/planning?error=${encodeURIComponent('A room needs a name.')}`);
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
  revalidatePath('/admin/planning', 'layout');
  redirect(`/admin/planning/rooms/${roomId}`);
}

/** From the catalogue: put a cohort in a room. An empty value clears it. */
export async function assignRoomAction(formData: FormData): Promise<void> {
  const actor = await requireModule('planning');
  const courseInstanceId = id(formData, 'courseInstanceId');
  const raw = String(formData.get('roomId') ?? '');
  const roomId = raw === '' ? null : raw;
  if (roomId !== null && !UUID.test(roomId)) throw new Error('Invalid roomId');

  const result = await assignRoom(courseInstanceId, roomId, actor);
  revalidatePath('/admin/catalogue');
  revalidatePath('/admin/planning', 'layout');
  redirect(
    result.ok ? '/admin/catalogue' : `/admin/catalogue?error=${encodeURIComponent(result.reason)}`
  );
}
