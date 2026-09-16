'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logActivity } from '@/lib/admin/activity';
import { requireModule } from '@/lib/admin/guard';
import { courseDays } from '@/lib/admin/kursplanung/fit';
import { listGroups, listTeachers, replaceWeekAssignments } from '@/lib/admin/kursplanung/repo';
import { SHIFTS } from '@/lib/admin/kursplanung/types';
import { validateWeekAssignments } from '@/lib/admin/kursplanung/week';
import { planningWeeks } from '@/lib/admin/kursplanung/weeks';

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
