'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { canAccess } from '@/lib/admin/access';
import { applyPlan, changeDay, generateDays, saveWeekPlan, type DayPatch, type WeekPlanRow } from '@/lib/admin/course-days';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * A course's lesson days (0045). Who teaches a day is Kursplanung's to decide: `kursplanung` at `edit`,
 * as on the board. The rest — making the days, the weekly plan, a day's room, hours, a day called off —
 * is the course's planning: `rooms` at `edit`, the right that schedules a start.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const id = (formData: FormData, field: string): string => {
  const value = String(formData.get(field) ?? '');
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
};
const optionalId = (formData: FormData, field: string): string | null => {
  const value = String(formData.get(field) ?? '');
  return UUID.test(value) ? value : null;
};
const text = (formData: FormData, field: string, max: number) => String(formData.get(field) ?? '').trim().slice(0, max) || null;

const page = (courseId: string, tab?: string, group?: number) =>
  `/admin/catalogue/courses/${courseId}${tab || group ? `?${[tab ? `tab=${tab}` : null, group && group > 1 ? `group=${group}` : null].filter(Boolean).join('&')}` : ''}`;

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}
function done(path: string): never {
  revalidatePath('/admin', 'layout');
  redirect(path);
}

/** The days a course is missing, made from its weekly plan. */
export async function generateDaysAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const courseId = id(formData, 'courseId');
  const result = await generateDays(courseId, actor);
  if (!result.ok) fail(page(courseId), pick((await getI18n()).lang, result.reason));
  done(page(courseId));
}

/** One group's weekly plan: the weekdays ticked, each with its hours, lessons, teacher and room. */
export async function saveWeekPlanAction(formData: FormData): Promise<void> {
  const actor = await requireModule('rooms', 'edit');
  const courseId = id(formData, 'courseId');
  const groupIndex = Number(formData.get('groupIndex'));
  if (!Number.isInteger(groupIndex) || groupIndex < 1 || groupIndex > 9) throw new Error('Invalid groupIndex');
  const back = page(courseId, 'plan', groupIndex);
  const { t, lang } = await getI18n();
  const rows: WeekPlanRow[] = [];
  for (let weekday = 1; weekday <= 7; weekday++) {
    if (formData.get(`on-${weekday}`) !== 'on') continue;
    const startsAt = String(formData.get(`from-${weekday}`) ?? '');
    const endsAt = String(formData.get(`to-${weekday}`) ?? '');
    if (!TIME.test(startsAt) || !TIME.test(endsAt)) fail(back, t('Bitte gib für jeden Tag Beginn und Ende an.', 'Give a start and an end for each day.'));
    const lessons = Number(String(formData.get(`lessons-${weekday}`) ?? '0').replace(',', '.'));
    rows.push({
      weekday,
      startsAt,
      endsAt,
      lessons: Number.isFinite(lessons) && lessons >= 0 && lessons <= 12 ? lessons : 0,
      // Who teaches is Kursplanung's: without that right the plan keeps its teacher.
      teacherId: canAccess(actor, 'kursplanung', 'edit') ? optionalId(formData, `teacher-${weekday}`) : optionalId(formData, `keepTeacher-${weekday}`),
      roomId: optionalId(formData, `room-${weekday}`),
    });
  }
  const result = await saveWeekPlan(courseId, groupIndex, rows, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}

/** The plan's teacher, or room, on every day still ahead. */
export async function applyPlanAction(formData: FormData): Promise<void> {
  const what = formData.get('what') === 'teacher' ? 'teacher' : 'room';
  const actor = await requireModule(what === 'teacher' ? 'kursplanung' : 'rooms', 'edit');
  const courseId = id(formData, 'courseId');
  const groupIndex = Number(formData.get('groupIndex'));
  if (!Number.isInteger(groupIndex) || groupIndex < 1 || groupIndex > 9) throw new Error('Invalid groupIndex');
  const back = page(courseId, 'plan', groupIndex);
  if (formData.get('confirmed') !== '1') redirect(back);
  const result = await applyPlan(courseId, groupIndex, what, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(page(courseId, undefined, groupIndex));
}

/** One day: its teacher (Kursplanung's right), its room, its hours, called off, a note. */
export async function changeDayAction(formData: FormData): Promise<void> {
  const actor = await requireModule('catalogue');
  const courseId = id(formData, 'courseId');
  const dayId = id(formData, 'dayId');
  const groupIndex = Number(formData.get('groupIndex')) || 1;
  const back = page(courseId, undefined, groupIndex);
  const { t, lang } = await getI18n();
  const mayTeach = canAccess(actor, 'kursplanung', 'edit');
  const mayPlan = canAccess(actor, 'rooms', 'edit');
  if (!mayTeach && !mayPlan) throw new Error('Not allowed');
  const patch: DayPatch = {};
  if (mayTeach && formData.has('teacherId')) patch.teacherId = optionalId(formData, 'teacherId');
  if (mayPlan) {
    if (formData.has('roomId')) patch.roomId = optionalId(formData, 'roomId');
    patch.cancelled = formData.get('cancelled') === 'on';
    patch.cancelReason = text(formData, 'cancelReason', 200);
    patch.note = text(formData, 'note', 500);
    const from = String(formData.get('startsAt') ?? '');
    const to = String(formData.get('endsAt') ?? '');
    if ((from && !TIME.test(from)) || (to && !TIME.test(to))) fail(back, t('Die Zeit ist keine Uhrzeit.', 'The time is not a time of day.'));
    // The form shows the day's hours as they are; only a change makes them the day's own.
    if (from !== String(formData.get('shownFrom') ?? '') || to !== String(formData.get('shownTo') ?? '')) {
      patch.startsAt = from || null;
      patch.endsAt = to || null;
    }
  }
  const result = await changeDay(dayId, patch, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}
