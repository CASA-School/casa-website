'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  createPlace,
  deletePlace,
  placeStay,
  removeMember,
  removeRoom,
  saveMember,
  saveRoom,
  setPlaceActive,
  updatePlace,
} from '@/lib/admin/accommodation';
import { ACCOMMODATION_KINDS, MEMBER_ROLES } from '@/lib/admin/accommodation-labels';
import { copyDuties, deleteDuty, moveDuty, restartCleaning, saveDuty } from '@/lib/admin/cleaning';
import { roomHasBed, stayDates } from '@/lib/admin/occupancy';
import { requireModule } from '@/lib/admin/guard';
import { pick, type T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * The accommodation module's writes (2026-10-18). Every one asks `requireModule('accommodation', …)`
 * first: an action is a public endpoint and never passes through the layout that rendered its form
 * (CLAUDE.md rule 7). Adding and changing a place, its family and rooms, and placing a stay is `edit`;
 * deleting is `full`, after the confirmation.
 */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const uuid = z.string().uuid();

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'long')
    .transform((v) => v || null);
const email = z
  .string()
  .trim()
  .max(200, 'email')
  .refine((v) => !v || EMAIL.test(v), 'email')
  .transform((v) => v || null);
/** Ja, nein, or not known. */
const yesNo = z.enum(['', 'yes', 'no']).transform((v) => (v === 'yes' ? true : v === 'no' ? false : null));

const PlaceSchema = z.object({
  name: z.string().trim().min(1, 'name').max(200, 'long'),
  kind: z.enum(ACCOMMODATION_KINDS),
  contactName: text(200),
  email,
  phone: text(60),
  address: text(500),
  descriptionDe: text(4000),
  descriptionEn: text(4000),
  smoker: yesNo,
  pets: text(200),
  washingMachine: yesNo,
  note: text(2000),
});

const RoomSchema = z.object({
  name: text(80),
  roomTypeCode: text(40),
  beds: z
    .string()
    .trim()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) <= 20), 'beds')
    .transform((v) => (v ? Number(v) : null)),
  note: text(500),
  isActive: z.enum(['1', '0']).transform((v) => v === '1'),
});

const MemberSchema = z
  .object({ firstName: text(80), lastName: text(80), role: z.enum(MEMBER_ROLES) })
  .refine((m) => m.firstName || m.lastName, { message: 'name', path: ['firstName'] });

const fields = (formData: FormData, names: readonly string[]) =>
  Object.fromEntries(names.map((name) => [name, typeof formData.get(name) === 'string' ? String(formData.get(name)) : '']));

function problem(error: z.ZodError, t: T): string {
  switch (error.issues[0]?.message) {
    case 'name':
      return t('Ein Name ist nötig.', 'A name is required.');
    case 'email':
      return t('Diese E-Mail-Adresse sieht nicht richtig aus.', 'That email address does not look right.');
    case 'beds':
      return t('Die Zahl der Betten ist eine ganze Zahl bis 20.', 'The number of beds is a whole number up to 20.');
    case 'long':
      return t('Ein Eintrag ist zu lang.', 'An entry is too long.');
    default:
      return t('Bitte prüf die Angaben.', 'Please check the details.');
  }
}

const page = (id: string) => `/admin/accommodation/${id}`;

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}

function done(path: string): never {
  revalidatePath('/admin', 'layout');
  redirect(path);
}

function placeId(formData: FormData): string {
  const parsed = uuid.safeParse(formData.get('placeId'));
  if (!parsed.success) redirect('/admin/accommodation');
  return parsed.data;
}

const PLACE_FIELDS = ['name', 'kind', 'contactName', 'email', 'phone', 'address', 'descriptionDe', 'descriptionEn', 'smoker', 'pets', 'washingMachine', 'note'] as const;

export async function createPlaceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const { t } = await getI18n();
  const parsed = PlaceSchema.safeParse(fields(formData, PLACE_FIELDS));
  if (!parsed.success) fail('/admin/accommodation', problem(parsed.error, t));
  done(page(await createPlace(parsed.data, actor)));
}

export async function updatePlaceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const id = placeId(formData);
  const { t, lang } = await getI18n();
  const parsed = PlaceSchema.safeParse(fields(formData, PLACE_FIELDS));
  if (!parsed.success) fail(page(id), problem(parsed.error, t));
  const result = await updatePlace(id, parsed.data, actor);
  if (!result.ok) fail('/admin/accommodation', pick(lang, result.reason));
  done(page(id));
}

export async function setPlaceActiveAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const id = placeId(formData);
  if (formData.get('confirmed') !== '1') redirect(page(id));
  const result = await setPlaceActive(id, formData.get('active') === '1', actor);
  if (!result.ok) fail('/admin/accommodation', pick((await getI18n()).lang, result.reason));
  done(page(id));
}

export async function deletePlaceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'full');
  const id = placeId(formData);
  if (formData.get('confirmed') !== '1') redirect(page(id));
  const result = await deletePlace(id, actor);
  if (!result.ok) fail(page(id), pick((await getI18n()).lang, result.reason));
  done('/admin/accommodation');
}

export async function saveRoomAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const id = placeId(formData);
  const { t, lang } = await getI18n();
  const raw = formData.get('roomId');
  const roomId = raw ? uuid.safeParse(raw) : null;
  if (roomId && !roomId.success) redirect(page(id));
  const parsed = RoomSchema.safeParse(fields(formData, ['name', 'roomTypeCode', 'beds', 'note', 'isActive']));
  if (!parsed.success) fail(`${page(id)}?tab=rooms`, problem(parsed.error, t));
  const result = await saveRoom(id, roomId?.data ?? null, parsed.data, actor);
  if (!result.ok) fail(`${page(id)}?tab=rooms`, pick(lang, result.reason));
  done(`${page(id)}?tab=rooms`);
}

export async function removeRoomAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'full');
  const id = placeId(formData);
  const roomId = uuid.safeParse(formData.get('roomId'));
  if (formData.get('confirmed') !== '1' || !roomId.success) redirect(page(id));
  const result = await removeRoom(id, roomId.data, actor);
  if (!result.ok) fail(`${page(id)}?tab=rooms`, pick((await getI18n()).lang, result.reason));
  done(`${page(id)}?tab=rooms`);
}

export async function saveMemberAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const id = placeId(formData);
  const { t, lang } = await getI18n();
  const raw = formData.get('memberId');
  const memberId = raw ? uuid.safeParse(raw) : null;
  if (memberId && !memberId.success) redirect(page(id));
  const parsed = MemberSchema.safeParse(fields(formData, ['firstName', 'lastName', 'role']));
  if (!parsed.success) fail(page(id), problem(parsed.error, t));
  const result = await saveMember(id, memberId?.data ?? null, parsed.data, actor);
  if (!result.ok) fail(page(id), pick(lang, result.reason));
  done(page(id));
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'full');
  const id = placeId(formData);
  const memberId = uuid.safeParse(formData.get('memberId'));
  if (formData.get('confirmed') !== '1' || !memberId.success) redirect(page(id));
  await removeMember(id, memberId.data, actor);
  done(page(id));
}

/** A stay placed at a place and room, from the stays list; back to the list it came from. */
export async function placeStayAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const back = String(formData.get('back') ?? '');
  const to = back.startsWith('/admin/accommodation/stays') ? back : '/admin/accommodation/stays';
  const stayId = uuid.safeParse(formData.get('stayId'));
  if (!stayId.success) redirect(to);
  const rawPlace = String(formData.get('accommodationId') ?? '');
  const rawRoom = String(formData.get('roomId') ?? '');
  const place = rawPlace ? uuid.safeParse(rawPlace) : null;
  const room = rawRoom ? uuid.safeParse(rawRoom) : null;
  if ((place && !place.success) || (room && !room.success)) redirect(to);
  const result = await placeStay(stayId.data, place?.data ?? null, room?.data ?? null, actor);
  if (!result.ok) fail(to, pick((await getI18n()).lang, result.reason));
  done(to);
}

// ------------------------------------------------------------------ the flats' plan (2026-10-19)

const OCCUPANCY = '/admin/accommodation/occupancy';
const backTo = (formData: FormData, base: string) => {
  const back = String(formData.get('back') ?? '');
  return back.startsWith(base) ? back : base;
};

/**
 * A stay given a bed from the WG-Belegung — a free bed clicked, or a learner moved to another room — once
 * the room has a bed for the whole stay; the same placing as on Aufenthalte (`placeStay`).
 */
export async function placeFromPlanAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const to = backTo(formData, OCCUPANCY);
  const stayId = uuid.safeParse(formData.get('stayId'));
  const flatId = uuid.safeParse(formData.get('accommodationId'));
  const roomId = uuid.safeParse(formData.get('roomId'));
  if (!stayId.success || !flatId.success || !roomId.success) redirect(to);
  const { t, lang } = await getI18n();
  const stay = await stayDates(stayId.data);
  if (!stay) fail(to, t('Diesen Aufenthalt gibt es nicht mehr.', 'This stay no longer exists.'));
  const bed = await roomHasBed(roomId.data, stayId.data, stay.from, stay.to);
  if (!bed.ok) {
    fail(
      to,
      bed.beds === 1
        ? t('Das Zimmer ist in dieser Zeit schon belegt.', 'The room is taken for some of that time.')
        : t(`Alle ${bed.beds} Betten sind in dieser Zeit schon belegt.`, `All ${bed.beds} beds are taken for some of that time.`)
    );
  }
  const result = await placeStay(stayId.data, flatId.data, roomId.data, actor);
  if (!result.ok) fail(to, pick(lang, result.reason));
  done(to);
}

const DUTY_TASKS = (formData: FormData) =>
  String(formData.get('tasks') ?? '')
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line) => line.slice(0, 160));

/** A duty of a flat's Putzplan added or changed: its name and its tasks, one a line. */
export async function saveDutyAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const placeId = uuid.parse(formData.get('placeId'));
  const back = `/admin/accommodation/${placeId}?tab=cleaning`;
  const raw = String(formData.get('dutyId') ?? '');
  const dutyId = raw ? uuid.parse(raw) : null;
  const { t, lang } = await getI18n();
  const nameDe = String(formData.get('nameDe') ?? '').trim().slice(0, 80);
  if (!nameDe) fail(back, t('Bitte gib dem Dienst einen Namen.', 'Give the duty a name.'));
  const nameEn = String(formData.get('nameEn') ?? '').trim().slice(0, 80) || null;
  const result = await saveDuty(placeId, dutyId, { nameDe, nameEn, tasks: DUTY_TASKS(formData) }, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}

export async function deleteDutyAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'full');
  const placeId = uuid.parse(formData.get('placeId'));
  const back = `/admin/accommodation/${placeId}?tab=cleaning`;
  if (formData.get('confirmed') !== '1') redirect(back);
  const result = await deleteDuty(placeId, uuid.parse(formData.get('dutyId')), actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

/** A duty one place up or down: the rotation follows the order. */
export async function moveDutyAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const placeId = uuid.parse(formData.get('placeId'));
  await moveDuty(placeId, uuid.parse(formData.get('dutyId')), formData.get('direction') === 'up' ? 'up' : 'down', actor);
  done(`/admin/accommodation/${placeId}?tab=cleaning`);
}

/** Another flat's duties as this flat's Putzplan, starting this week. */
export async function copyDutiesAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const placeId = uuid.parse(formData.get('placeId'));
  const back = `/admin/accommodation/${placeId}?tab=cleaning`;
  const from = uuid.safeParse(formData.get('fromPlaceId'));
  const { t, lang } = await getI18n();
  if (!from.success) fail(back, t('Bitte wähle eine WG.', 'Choose a flat.'));
  const result = await copyDuties(placeId, from.data, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}

/** The rotation begins again this week. */
export async function restartCleaningAction(formData: FormData): Promise<void> {
  const actor = await requireModule('accommodation', 'edit');
  const placeId = uuid.parse(formData.get('placeId'));
  await restartCleaning(placeId, actor);
  done(`/admin/accommodation/${placeId}?tab=cleaning`);
}
