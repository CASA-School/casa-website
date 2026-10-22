'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isMergeReason, isTaskStatus } from '@/lib/admin/day-plan-labels';
import { canAccess } from '@/lib/admin/access';
import { changeDay } from '@/lib/admin/course-days';
import { berlinDay } from '@/lib/admin/days';
import { closeEntryTest, deleteAttempt, enterPaper, handInAttempt, openEntryTest, openEntryTests, releaseAttempt } from '@/lib/admin/entry-tests';
import { createTask, deleteTask, markPresence, mergeLesson, replaceFromDay, setTaskStatus, unmergeLesson, updateTask, type TaskInput } from '@/lib/admin/day-plan';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { pick } from '@/lib/admin/i18n';
import { isAbsenceReason } from '@/lib/admin/kursplanung/types';
import { addAbsence } from '@/lib/admin/staff-members';
import { isEntryTestId } from '@/lib/entry-test/tests';

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

/**
 * A lesson's teacher or room changed from the Tagesplan's class panel (2026-10-19, Rahman: "a shortcut
 * … with a warning popup"): on its day only — another teacher than the plan's is then a substitute —
 * or from that day to the end of the course. The same rights as on the course's page: the teacher is
 * Kursplanung's, the room the rooms'. Nothing changes without the confirmation.
 */
export async function changeLessonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const raw = String(formData.get('back') ?? '');
  const back = raw.startsWith('/admin/day') ? raw : '/admin/day/courses';
  if (formData.get('confirmed') !== '1') redirect(back);
  const dayId = String(formData.get('dayId') ?? '');
  const what = formData.get('what') === 'room' ? 'room' : 'teacher';
  const value = String(formData.get('value') ?? '');
  if (!UUID.test(dayId) || (value && !UUID.test(value))) throw new Error('Invalid lesson change');
  if (!canAccess(actor, what === 'teacher' ? 'kursplanung' : 'rooms', 'edit')) throw new Error('Not allowed');
  const result =
    formData.get('scope') === 'rest'
      ? await replaceFromDay(dayId, what, value || null, actor)
      : await changeDay(dayId, what === 'teacher' ? { teacherId: value || null } : { roomId: value || null }, actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  revalidatePath('/admin', 'layout');
  redirect(back);
}

/**
 * A group taught with others (0074), from the class panel: on its day or up to a date, with one or more
 * parallel groups — Kursplanung's right, as the teacher's change is.
 */
export async function mergeLessonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const raw = String(formData.get('back') ?? '');
  const back = raw.startsWith('/admin/day') ? raw : '/admin/day/courses';
  if (!canAccess(actor, 'kursplanung', 'edit')) throw new Error('Not allowed');
  const dayId = String(formData.get('dayId') ?? '');
  const hosts = formData.getAll('host').map(String);
  const day = String(formData.get('day') ?? '');
  const until = formData.get('scope') === 'until' ? String(formData.get('until') ?? '') : day;
  const reason = formData.get('reason');
  const note = String(formData.get('note') ?? '').trim().slice(0, 300) || null;
  if (!UUID.test(dayId) || !DAY.test(day) || !DAY.test(until) || !isMergeReason(reason) || hosts.some((h) => !UUID.test(h))) throw new Error('Invalid merge');
  const { lang } = await getI18n();
  if (!hosts.length) fail(back, pick(lang, { de: 'Wähle mindestens eine Gruppe.', en: 'Choose at least one group.' }));
  if (until < day) fail(back, pick(lang, { de: 'Das Ende liegt vor dem Tag.', en: 'The end is before the day.' }));
  const result = await mergeLesson({ guestDayId: dayId, hostDayIds: hosts, until, reason, note }, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  revalidatePath('/admin', 'layout');
  redirect(back);
}

/** A merge lifted, on its day or from it on: the group has its room and teacher back. */
export async function unmergeLessonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const raw = String(formData.get('back') ?? '');
  const back = raw.startsWith('/admin/day') ? raw : '/admin/day/courses';
  if (formData.get('confirmed') !== '1') redirect(back);
  if (!canAccess(actor, 'kursplanung', 'edit')) throw new Error('Not allowed');
  const dayId = String(formData.get('dayId') ?? '');
  if (!UUID.test(dayId)) throw new Error('Invalid lesson');
  const result = await unmergeLesson(dayId, formData.get('scope') === 'rest' ? 'rest' : 'day', actor);
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  revalidatePath('/admin', 'layout');
  redirect(back);
}

// ---------------------------------------------------------------- the day-one test (0075)

/*
 * The test's actions stay where they were done: the panel stays open and the page revalidates. A refusal
 * goes back to the day with its message.
 */

/** Opens a session's test for the phones, on the day itself (the phones see only today's). */
export async function openEntryTestAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const day = dayOf(formData);
  const session = formData.get('session');
  const test = formData.get('test');
  if (!day || (session !== 'morning' && session !== 'afternoon') || !isEntryTestId(test)) throw new Error('Invalid test');
  const { lang } = await getI18n();
  if (day !== berlinDay(new Date())) fail(back(day), pick(lang, { de: 'Ein Test öffnet nur an seinem Tag.', en: 'A test opens on its own day only.' }));
  const result = await openEntryTest({ day, session, test, minutes: Number(formData.get('minutes') ?? 0) }, actor);
  if (!result.ok) fail(back(day), pick(lang, result.reason));
  revalidatePath('/admin/day');
}

/**
 * „Tests öffnen" on the Tagesplan's card and the tests page: on the first day of an intensive start, every
 * course's test at once or the chosen courses' (Rahman, 2026-10-22).
 */
export async function openEntryTestsAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const to = formData.get('from') === 'tests' ? '/admin/day/tests' : back(berlinDay(new Date()));
  const chosen = formData.get('scope') === 'chosen';
  const dayIds = formData.getAll('dayId').map(String).filter((id) => UUID.test(id));
  const { lang } = await getI18n();
  if (chosen && !dayIds.length) fail(to, pick(lang, { de: 'Bitte wähle mindestens einen Kurs.', en: 'Please choose at least one course.' }));
  const result = await openEntryTests(chosen ? dayIds : 'all', Number(formData.get('minutes') ?? 0), actor);
  if (!result.ok) fail(to, pick(lang, result.reason));
  revalidatePath('/admin/day');
  redirect(to);
}

export async function closeEntryTestAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const id = String(formData.get('sittingId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid test');
  const result = await closeEntryTest(id, actor);
  if (!result.ok) fail(back(dayOf(formData)), pick((await getI18n()).lang, result.reason));
  revalidatePath('/admin/day');
}

/** A paused phone goes on without the teacher's code. */
export async function releaseAttemptAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const id = String(formData.get('attemptId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid attempt');
  const result = await releaseAttempt(id, actor);
  if (!result.ok) fail(back(dayOf(formData)), pick((await getI18n()).lang, result.reason));
  revalidatePath('/admin/day');
}

/** Handed in from the office with what the phone saved. */
export async function handInAttemptAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  if (formData.get('confirmed') !== '1') return;
  const id = String(formData.get('attemptId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid attempt');
  const result = await handInAttempt(id, actor);
  if (!result.ok) fail(back(dayOf(formData)), pick((await getI18n()).lang, result.reason));
  revalidatePath('/admin/day');
}

/** A test run or a mistake, with its result on the learner's record. */
export async function deleteAttemptAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'full');
  if (formData.get('confirmed') !== '1') return;
  const id = String(formData.get('attemptId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid attempt');
  const result = await deleteAttempt(id, actor);
  if (!result.ok) fail(back(dayOf(formData)), pick((await getI18n()).lang, result.reason));
  revalidatePath('/admin/day');
}

/** A paper booklet typed in. */
export async function enterPaperAction(formData: FormData): Promise<void> {
  const actor = await requireModule('day', 'edit');
  const day = dayOf(formData);
  const sittingId = String(formData.get('sittingId') ?? '');
  const version = formData.get('version');
  if (!UUID.test(sittingId) || (version !== 'A' && version !== 'B')) throw new Error('Invalid paper');
  const { lang } = await getI18n();
  const name = String(formData.get('name') ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const email = String(formData.get('email') ?? '').trim().slice(0, 120);
  if (name.length < 3) fail(back(day), pick(lang, { de: 'Bitte Vor- und Nachnamen eintragen.', en: 'Enter the first and last name.' }));
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail(back(day), pick(lang, { de: 'Diese E-Mail-Adresse stimmt nicht.', en: 'This e-mail address is not right.' }));
  const slots = Number(formData.get('slots') ?? 0);
  const answers = Array.from({ length: Math.max(0, Math.min(80, slots)) }, (_, i) => String(formData.get(`a${i}`) ?? ''));
  const result = await enterPaper({ sittingId, name, email: email || null, version, answers }, actor);
  if (!result.ok) fail(back(day), pick(lang, result.reason));
  revalidatePath('/admin/day');
}
