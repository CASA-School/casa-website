'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireModule } from '@/lib/admin/guard';
import { copyShiftsFromWeekBefore, deleteAbsence, removeShift, saveAbsence, saveShift } from '@/lib/admin/rota';
import { ABSENCE_REASONS, SHIFT_TIMES } from '@/lib/admin/rota-rules';

/**
 * The rota's writes. Planning needs the module at `edit`; deleting an
 * absence is `full` and goes through the confirmation. Each action is a
 * public endpoint, so each checks first (docs/ADMIN_WORKSPACE.md §Security).
 */

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const TIME = z.string().refine((t) => SHIFT_TIMES.includes(t));
const NOTE = z
  .string()
  .trim()
  .max(200)
  .transform((v) => (v === '' ? null : v));

const fields = (formData: FormData) => Object.fromEntries(formData.entries());

/** Back to the week that was being planned. */
function back(week: unknown, message?: { ok?: string; error?: string }): never {
  const params = new URLSearchParams();
  if (typeof week === 'string' && DATE.safeParse(week).success) params.set('week', week);
  if (message?.ok) params.set('ok', message.ok);
  if (message?.error) params.set('error', message.error);
  const query = params.toString();
  redirect(`/admin/rota${query ? `?${query}` : ''}`);
}

const done = (week: unknown, message?: { ok?: string; error?: string }): never => {
  revalidatePath('/admin/rota');
  revalidatePath('/admin');
  back(week, message);
};

const SHIFT = z
  .object({ staffUserId: z.uuid(), onDate: DATE, startsAt: TIME, endsAt: TIME, note: NOTE.optional().default('') })
  .refine((s) => s.startsAt < s.endsAt, { message: 'A shift ends after it starts.' });

export async function saveShiftAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rota', 'edit');
  const parsed = SHIFT.safeParse(fields(formData));
  if (!parsed.success) back(formData.get('week'), { error: parsed.error.issues[0]?.message ?? 'That shift could not be saved.' });
  await saveShift({ ...parsed.data, note: parsed.data.note ?? null }, actor);
  done(formData.get('week'));
}

/** A cell of the plan emptied, like a cohort's room cleared — planning, so `edit`. */
export async function clearShiftAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rota', 'edit');
  const parsed = z.object({ staffUserId: z.uuid(), onDate: DATE }).safeParse(fields(formData));
  if (!parsed.success) back(formData.get('week'));
  await removeShift(parsed.data.staffUserId, parsed.data.onDate, actor);
  done(formData.get('week'));
}

export async function copyLastWeekAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rota', 'edit');
  const parsed = z.object({ week: DATE }).safeParse(fields(formData));
  if (!parsed.success) back(undefined);
  const count = await copyShiftsFromWeekBefore(parsed.data.week, actor);
  done(parsed.data.week, { ok: `copied-${count}` });
}

const ABSENCE = z
  .object({
    id: z.union([z.uuid(), z.literal('')]).optional(),
    staffUserId: z.uuid(),
    fromDate: DATE,
    toDate: DATE,
    reason: z.enum(ABSENCE_REASONS),
    note: NOTE.optional().default(''),
  })
  .refine((a) => a.fromDate <= a.toDate, { message: 'An absence ends on or after its first day.' });

export async function saveAbsenceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rota', 'edit');
  const parsed = ABSENCE.safeParse(fields(formData));
  if (!parsed.success) back(formData.get('week'), { error: parsed.error.issues[0]?.message ?? 'That absence could not be saved.' });
  const { id, note, ...rest } = parsed.data;
  await saveAbsence({ ...rest, id: id || null, note: note ?? null }, actor);
  done(formData.get('week'));
}

export async function deleteAbsenceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rota', 'full');
  const parsed = z.object({ id: z.uuid() }).safeParse(fields(formData));
  if (!parsed.success || formData.get('confirmed') !== '1') back(formData.get('week'));
  await deleteAbsence(parsed.data.id, actor);
  done(formData.get('week'));
}
