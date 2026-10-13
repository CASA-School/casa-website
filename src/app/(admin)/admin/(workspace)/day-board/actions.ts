'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  createDayTask,
  deleteDayTask,
  setDayTaskDone,
  TASK_AREAS,
  updateDayTask,
  type TaskArea,
} from '@/lib/admin/day-board';
import { requireModule } from '@/lib/admin/guard';
import { todayInputValue } from '@/lib/dates';

/**
 * Day board mutations.
 *
 * The board is the team's shared surface, so writing to it needs only
 * `overview` at `edit` — the module everyone holds. Deleting someone else's
 * task is the one destructive act and goes through the confirmation.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Back to where the task was written: the control room's week (a form there
 * carries `from=week`), or the day it belongs to.
 */
type From = 'week' | 'day';
function back(date: string, from: From, error?: string): never {
  const params = new URLSearchParams();
  if (DATE.test(date) && date !== todayInputValue()) params.set(from === 'week' ? 'week' : 'date', date);
  if (error) params.set('error', error);
  const query = params.toString();
  redirect(`${from === 'week' ? '/admin' : '/admin/day'}${query ? `?${query}` : ''}`);
}

const readFrom = (formData: FormData): From => (formData.get('from') === 'week' ? 'week' : 'day');

function readDate(formData: FormData, field = 'onDate'): string {
  const value = String(formData.get(field) ?? '');
  return DATE.test(value) ? value : todayInputValue();
}

function readArea(formData: FormData): TaskArea {
  const value = String(formData.get('area') ?? 'other');
  return (TASK_AREAS as readonly string[]).includes(value) ? (value as TaskArea) : 'other';
}

function readAssignee(formData: FormData): string | null {
  const value = String(formData.get('assignedTo') ?? '');
  if (value === '') return null;
  if (!UUID.test(value)) throw new Error('Invalid assignedTo');
  return value;
}

function readTitle(formData: FormData): string {
  return String(formData.get('title') ?? '')
    .trim()
    .slice(0, 200);
}

function readDetail(formData: FormData): string | null {
  const value = String(formData.get('detail') ?? '').trim();
  return value === '' ? null : value.slice(0, 1000);
}

export async function createDayTaskAction(formData: FormData): Promise<void> {
  const actor = await requireModule('overview', 'edit');
  const from = readFrom(formData);
  const onDate = readDate(formData);
  const title = readTitle(formData);
  if (title.length === 0) back(onDate, from, 'Give the task a title.');

  await createDayTask(
    {
      onDate,
      title,
      detail: readDetail(formData),
      area: readArea(formData),
      assignedTo: readAssignee(formData),
    },
    actor
  );
  revalidatePath('/admin');
  revalidatePath('/admin/day');
  back(onDate, from);
}

export async function toggleDayTaskAction(formData: FormData): Promise<void> {
  const actor = await requireModule('overview', 'edit');
  const from = readFrom(formData);
  const id = String(formData.get('taskId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid taskId');
  await setDayTaskDone(id, formData.get('done') === 'true', actor);
  revalidatePath('/admin');
  revalidatePath('/admin/day');
  back(readDate(formData, 'date'), from);
}

export async function updateDayTaskAction(formData: FormData): Promise<void> {
  const actor = await requireModule('overview', 'edit');
  const from = readFrom(formData);
  const id = String(formData.get('taskId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid taskId');
  const onDate = readDate(formData);
  const title = readTitle(formData);
  if (title.length === 0) back(onDate, from, 'Give the task a title.');

  await updateDayTask(
    id,
    {
      onDate,
      title,
      detail: readDetail(formData),
      area: readArea(formData),
      assignedTo: readAssignee(formData),
    },
    actor
  );
  revalidatePath('/admin');
  revalidatePath('/admin/day');
  back(onDate, from);
}

export async function deleteDayTaskAction(formData: FormData): Promise<void> {
  const actor = await requireModule('overview', 'edit');
  const from = readFrom(formData);
  const id = String(formData.get('taskId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid taskId');
  const date = readDate(formData, 'date');
  if (formData.get('confirmed') !== '1') back(date, from);
  await deleteDayTask(id, actor);
  revalidatePath('/admin');
  revalidatePath('/admin/day');
  back(date, from);
}
