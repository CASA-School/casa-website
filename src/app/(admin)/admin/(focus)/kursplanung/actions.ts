'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { logActivity } from '@/lib/admin/activity';
import { requireModule } from '@/lib/admin/guard';
import { courseDays } from '@/lib/admin/kursplanung/fit';
import { fromFormData, parseGroupForm, parseTeacherForm } from '@/lib/admin/kursplanung/forms';
import { assignmentsFromPairs } from '@/lib/admin/kursplanung/pairs';
import {
  addGroup,
  insertMissingAssignments,
  listGroups,
  listTeachers,
  loadPlan,
  removeGroupIfEmpty,
  replaceTeacherAbsences,
  replaceWeekAssignments,
  updateGroup,
  updateTeacherRules,
} from '@/lib/admin/kursplanung/repo';
import { SHIFTS, isLevel, isShift } from '@/lib/admin/kursplanung/types';
import { validateWeekAssignments } from '@/lib/admin/kursplanung/week';
import { monthStart, nextMonth, planningWeeks } from '@/lib/admin/kursplanung/weeks';

/**
 * The board's one write.
 *
 * Every mutation on the board — place, remove, move, resize, flags, copy a
 * week, undo — is computed on the client with the same pure functions the
 * server has, and then the whole assignment set of that shift-week is sent
 * here. One shape to validate, one transaction, and undo is just "send the
 * previous set". Last write wins per week; a version check is a later step.
 *
 * `edit` is enough: laying and lifting pieces is the module's daily work.
 * There is nothing irreversible here — the previous week is one undo away and
 * the activity trail keeps the count.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

const Payload = z.object({
  month: z.string().regex(MONTH),
  shift: z.enum(SHIFTS),
  weekStart: z.string().regex(DATE),
  assignments: z
    .array(
      z.object({
        groupId: z.string().uuid(),
        onDate: z.string().regex(DATE),
        teacherId: z.string().uuid(),
        isSubstitute: z.boolean(),
        isTentative: z.boolean(),
      })
    )
    .max(200),
});

export type SaveWeekResult = { ok: true } | { ok: false; error: string };

export async function saveWeekAction(input: unknown): Promise<SaveWeekResult> {
  const user = await requireModule('kursplanung', 'edit');

  const parsed = Payload.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Ungültige Daten.' };
  const payload = parsed.data;

  const [groups, teachers] = await Promise.all([listGroups(payload.month), listTeachers()]);
  const weeks = planningWeeks(payload.month);
  const errors = validateWeekAssignments(payload, groups, teachers, weeks);
  if (errors.length > 0) return { ok: false, error: errors[0] };

  const week = weeks.find((w) => w.start === payload.weekStart)!;
  const shiftGroups = groups.filter((g) => g.shift === payload.shift);
  const days = courseDays({ shift: payload.shift }, week);

  await replaceWeekAssignments(
    shiftGroups.map((g) => g.id),
    days,
    payload.assignments,
    user.id
  );

  await logActivity({
    actor: user,
    entity: 'kursplanung',
    entityId: `${payload.month}|${payload.shift}|${payload.weekStart}`,
    action: 'week.saved',
    detail: {
      month: payload.month,
      shift: payload.shift,
      weekStart: payload.weekStart,
      assignments: payload.assignments.length,
      substitutes: payload.assignments.filter((a) => a.isSubstitute).length,
    },
  });

  revalidatePath('/admin/kursplanung');
  return { ok: true };
}

/* ------------------------------------------------------------------------
 * Rules, absences, groups — the forms of the Kurse and Lehrkräfte screens.
 * FormData in, redirect back out, like every other workspace form. Each one
 * re-checks the module: a server action is a public endpoint.
 * --------------------------------------------------------------------- */


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(formData: FormData, message: string, kind: 'error' | 'ok'): never {
  const raw = String(formData.get('returnTo') ?? '/admin/kursplanung');
  const path = raw.startsWith('/admin/kursplanung') ? raw.split('?')[0] : '/admin/kursplanung';
  const month = String(formData.get('month') ?? '');
  const params = new URLSearchParams();
  if (MONTH.test(month)) params.set('month', month);
  params.set(kind, message);
  redirect(`${path}?${params}`);
}

const revalidateAll = () => ['/admin/kursplanung', '/admin/kursplanung/kurse', '/admin/kursplanung/lehrkraefte'].forEach((p) => revalidatePath(p));

export async function saveTeacherAction(formData: FormData): Promise<void> {
  const user = await requireModule('kursplanung', 'edit');
  const teacherId = String(formData.get('teacherId') ?? '');
  const month = String(formData.get('month') ?? '');
  if (!UUID.test(teacherId) || !MONTH.test(month)) back(formData, 'Ungültige Anfrage.', 'error');

  const weeks = planningWeeks(month);
  const parsed = parseTeacherForm(fromFormData(formData), teacherId, weeks);
  if (!parsed.ok) back(formData, parsed.error, 'error');

  await updateTeacherRules(teacherId, parsed.rules);
  await replaceTeacherAbsences(teacherId, monthStart(month), monthStart(nextMonth(month)), parsed.absences, user.id);
  await logActivity({ actor: user, entity: 'kursplanung.teacher', entityId: teacherId, action: 'rules.saved', detail: { month, absences: parsed.absences.length, daysPerWeek: parsed.rules.daysPerWeek } });
  revalidateAll();
  back(formData, `${parsed.rules.shortName} gespeichert.`, 'ok');
}

export async function saveGroupAction(formData: FormData): Promise<void> {
  const user = await requireModule('kursplanung', 'edit');
  const groupId = String(formData.get('groupId') ?? '');
  if (!UUID.test(groupId)) back(formData, 'Ungültige Anfrage.', 'error');
  const parsed = parseGroupForm(fromFormData(formData));
  if (!parsed.ok) back(formData, parsed.error, 'error');

  await updateGroup(groupId, parsed);
  await logActivity({ actor: user, entity: 'kursplanung.group', entityId: groupId, action: 'group.saved', detail: { registrations: parsed.registrations } });
  revalidateAll();
  back(formData, 'Gruppe gespeichert.', 'ok');
}

export async function addGroupAction(formData: FormData): Promise<void> {
  const user = await requireModule('kursplanung', 'edit');
  const month = String(formData.get('month') ?? ''), shift = String(formData.get('shift') ?? ''), level = String(formData.get('level') ?? ''), phase = String(formData.get('phase') ?? '');
  if (!MONTH.test(month) || !isShift(shift) || !isLevel(level) || !(phase === '1' || phase === '2')) back(formData, 'Ungültige Anfrage.', 'error');
  await addGroup(month, shift, level, phase);
  await logActivity({ actor: user, entity: 'kursplanung.group', entityId: null, action: 'group.added', detail: { month, shift, level, phase } });
  revalidateAll();
  back(formData, `${level}.${phase}: weitere Gruppe angelegt.`, 'ok');
}

export async function removeGroupAction(formData: FormData): Promise<void> {
  const user = await requireModule('kursplanung', 'full');
  if (String(formData.get('confirmed') ?? '') !== '1') back(formData, 'Bitte bestätigen.', 'error');
  const groupId = String(formData.get('groupId') ?? '');
  if (!UUID.test(groupId)) back(formData, 'Ungültige Anfrage.', 'error');
  const removed = await removeGroupIfEmpty(groupId);
  if (!removed) back(formData, 'Die Gruppe ist im Plan belegt – erst leeren.', 'error');
  await logActivity({ actor: user, entity: 'kursplanung.group', entityId: groupId, action: 'group.removed' });
  revalidateAll();
  back(formData, 'Gruppe entfernt.', 'ok');
}

/** Lays every group's pair on its halves for all weeks of the month where the cell is free and the teacher fits. */
export async function fillFromPairsAction(formData: FormData): Promise<void> {
  const user = await requireModule('kursplanung', 'edit');
  const month = String(formData.get('month') ?? ''), shift = String(formData.get('shift') ?? ''), groupId = String(formData.get('groupId') ?? '');
  if (!MONTH.test(month) || !isShift(shift)) back(formData, 'Ungültige Anfrage.', 'error');
  const plan = await loadPlan(month);
  const targets = plan.groups.filter((g) => g.shift === shift && (!groupId || g.id === groupId));
  const added = await insertMissingAssignments(assignmentsFromPairs(plan, targets), user.id);
  await logActivity({ actor: user, entity: 'kursplanung', entityId: `${month}|${shift}`, action: 'pairs.filled', detail: { groups: targets.length, added } });
  revalidateAll();
  back(formData, `${added} Kurstage aus den Paaren belegt.`, 'ok');
}
