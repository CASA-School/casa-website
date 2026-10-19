'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isTaskStatus } from '@/lib/admin/day-plan-labels';
import { createTask, deleteTask, markPresence, setTaskStatus, updateTask, type TaskInput } from '@/lib/admin/day-plan';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { pick } from '@/lib/admin/i18n';
import { isAbsenceReason } from '@/lib/admin/kursplanung/types';
import { addAbsence } from '@/lib/admin/staff-members';

/**
 * The Tagesplan's actions (2026-10-19). Each asks for the right it uses — the page's layout is not in
 * the path of a server action (CLAUDE.md, rule 7) — and goes back to the day it came from.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const back = (day: string | null) => (day ? `/admin/day?date=${day}` : '/admin/day');
const dayOf = (formData: FormData, name = 'day'): string | null => {
  const value = String(formData.get(name) ?? '');
  return DAY.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) ? value : null;
};
const timeOf = (formData: FormData, name: string): string | null => {
  const value = String(formData.get(name) ?? '').trim();
  return TIME.test(value) ? value : null;
};

function fail(to: string, message: string): never {
  redirect(`${to}${to.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}

function done(to: string): never {
  revalidatePath('/admin/day');
  redirect(to);
}

async function taskInput(formData: FormData, from: string): Promise<TaskInput> {
  const { t } = await getI18n();
  const body = String(formData.get('body') ?? '').trim().slice(0, 2000);
  const date = dayOf(formData, 'date') ?? dayOf(formData);
  if (!body) fail(from, t('Schreib, was zu tun ist.', 'Write what needs doing.'));
  if (!date) fail(from, t('Bitte wähle einen Tag.', 'Choose a day.'));
  const startsAt = timeOf(formData, 'startsAt');
  const endsAt = timeOf(formData, 'endsAt');
  if (startsAt && endsAt && endsAt < startsAt) fail(from, t('Das Ende liegt vor dem Beginn.', 'The end is before the start.'));
  const assignee = String(formData.get('assigneeId') ?? '');
  return { date, startsAt, endsAt: startsAt ? endsAt : null, body, assigneeId: UUID.test(assignee) ? assignee : null };
}

export async function createTaskAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const from = back(dayOf(formData));
  const input = await taskInput(formData, from);
  const result = await createTask(input, actor);
  if (!result.ok) fail(from, pick((await getI18n()).lang, result.reason));
  done(from);
}

export async function updateTaskAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const from = back(dayOf(formData));
  const id = String(formData.get('taskId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid task');
  const input = await taskInput(formData, from);
  const result = await updateTask(id, input, actor);
  if (!result.ok) fail(from, pick((await getI18n()).lang, result.reason));
  done(from);
}

/** Chosen from the task's menu: posted without a redirect, the page revalidates where it stands. */
export async function setTaskStatusAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const id = String(formData.get('taskId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!UUID.test(id) || !isTaskStatus(status)) throw new Error('Invalid status');
  await setTaskStatus(id, status, actor);
  revalidatePath('/admin/day');
}

export async function deleteTaskAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'full');
  const from = back(dayOf(formData));
  if (formData.get('confirmed') !== '1') redirect(from);
  const id = String(formData.get('taskId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid task');
  const result = await deleteTask(id, actor);
  if (!result.ok) fail(from, pick((await getI18n()).lang, result.reason));
  done(from);
}

/** „Ich bin da" / „Ich gehe" — today only, for the colleague behind the account. */
export async function presenceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const what = formData.get('what') === 'went' ? 'went' : 'came';
  const result = await markPresence(actor, what);
  if (!result.ok) fail(back(null), pick((await getI18n()).lang, result.reason));
  done(back(null));
}

/**
 * A colleague reported ill or on holiday from the Tagesplan: the team does it where it sees the day
 * (Rahman, 2026-10-19), so the day's right is enough — the rest of the staff register stays
 * management's. The same days as on the colleague's page (`addAbsence`).
 */
export async function reportAbsenceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const from = back(dayOf(formData));
  const { t, lang } = await getI18n();
  const staffId = String(formData.get('staffId') ?? '');
  const start = dayOf(formData, 'from');
  const end = dayOf(formData, 'to') ?? start;
  const reason = String(formData.get('reason') ?? '');
  if (!UUID.test(staffId)) fail(from, t('Bitte wähle, wer fehlt.', 'Choose who is away.'));
  if (!start || !end) fail(from, t('Bitte gib die Tage an.', 'Give the days.'));
  if (!isAbsenceReason(reason)) fail(from, t('Bitte wähle einen Grund.', 'Choose a reason.'));
  const result = await addAbsence(staffId, start, end, reason, actor);
  if (!result.ok) fail(from, pick(lang, result.reason));
  done(from);
}
