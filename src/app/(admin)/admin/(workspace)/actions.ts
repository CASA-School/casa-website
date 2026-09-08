'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getStaffUser, type StaffUser } from '@/lib/admin/auth';
import { addNote, type NoteEntity } from '@/lib/admin/notes';
import { confirmPlacement, getPlacementAttempt } from '@/lib/admin/placement';
import {
  queuePath,
  setQueueAssignee,
  setQueueStatus,
  WORK_STATUSES,
  type QueueEntity,
  type WorkStatus,
} from '@/lib/admin/queues';

/**
 * Every mutation the workspace makes.
 *
 * All of them start with `requireStaff()`. A server action is a public HTTP
 * endpoint — the layout's auth gate does not protect it, because nothing about
 * a POST to an action goes through the layout that rendered the form. Treating
 * an action as "inside the app" is the single most common way an admin surface
 * ends up writable by anyone who can read the page source.
 *
 * They take `FormData` rather than typed arguments so the forms are plain
 * `<form action={...}>` and work without JavaScript, and every value that
 * arrives is re-validated here against the same allowlists the reads use.
 */

async function requireStaff(): Promise<StaffUser> {
  const user = await getStaffUser();

  if (!user) {
    redirect('/admin/sign-in');
  }

  return user;
}

const QUEUE_ENTITIES = new Set<string>([
  'enquiry',
  'course_registration',
  'exam_registration',
  'career_application',
]);

const NOTE_ENTITIES = new Set<string>([...QUEUE_ENTITIES, 'placement_attempt']);

/** A uuid, or nothing. Guards the id before it reaches a `uuid` column. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readId(formData: FormData, field = 'id'): string {
  const value = String(formData.get(field) ?? '');

  if (!UUID.test(value)) {
    throw new Error(`Invalid ${field}`);
  }

  return value;
}

function readQueueEntity(formData: FormData): QueueEntity {
  const value = String(formData.get('entity') ?? '');

  if (!QUEUE_ENTITIES.has(value)) {
    throw new Error('Invalid entity');
  }

  return value as QueueEntity;
}

export async function updateStatusAction(formData: FormData): Promise<void> {
  const actor = await requireStaff();
  const entity = readQueueEntity(formData);
  const id = readId(formData);
  const status = String(formData.get('status') ?? '');

  if (!(WORK_STATUSES as readonly string[]).includes(status)) {
    throw new Error('Invalid status');
  }

  await setQueueStatus({ entity, id, status: status as WorkStatus, actor });

  // Both the record and its list change, and so does the sidebar badge, which
  // is rendered by the workspace layout — so the queue root is revalidated too.
  revalidatePath(`${queuePath(entity)}/${id}`);
  revalidatePath(queuePath(entity));
  revalidatePath('/admin');
}

export async function assignAction(formData: FormData): Promise<void> {
  const actor = await requireStaff();
  const entity = readQueueEntity(formData);
  const id = readId(formData);
  const raw = String(formData.get('staffUserId') ?? '');

  // The empty option means "nobody", which is a legitimate choice and not a
  // validation failure.
  const staffUserId = raw === '' ? null : raw;

  if (staffUserId !== null && !UUID.test(staffUserId)) {
    throw new Error('Invalid staffUserId');
  }

  await setQueueAssignee({ entity, id, staffUserId, actor });

  revalidatePath(`${queuePath(entity)}/${id}`);
  revalidatePath(queuePath(entity));
}

export async function addNoteAction(formData: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = readId(formData, 'entityId');
  const entity = String(formData.get('entity') ?? '');
  const body = String(formData.get('body') ?? '');

  if (!NOTE_ENTITIES.has(entity)) {
    throw new Error('Invalid entity');
  }

  if (body.trim().length === 0) {
    return;
  }

  await addNote({ entity: entity as NoteEntity, entityId: id, body, actor });

  revalidatePath(
    entity === 'placement_attempt'
      ? `/admin/placement/${id}`
      : `${queuePath(entity as QueueEntity)}/${id}`
  );
}

/**
 * Records a teacher's decision on a placement recommendation.
 *
 * A note is REQUIRED when the confirmed level differs from what the engine
 * recommended. The schema cannot express that rule — a check constraint there
 * cannot see the recommendation — and it matters: a disagreement with the
 * instrument is the only evidence CASA will have for whether the pilot cut
 * scores in `src/config/placement/policy.ts` are right.
 */
export async function confirmPlacementAction(formData: FormData): Promise<void> {
  const actor = await requireStaff();
  const attemptId = readId(formData, 'attemptId');
  const confirmedLevel = String(formData.get('confirmedLevel') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const speakingCheckDone = formData.get('speakingCheckDone') === 'on';

  if (confirmedLevel.length === 0) {
    redirect(`/admin/placement/${attemptId}?error=level`);
  }

  const attempt = await getPlacementAttempt(attemptId);

  if (!attempt) {
    throw new Error('Attempt not found');
  }

  const recommended = attempt.decision?.band ?? null;

  if (recommended !== null && confirmedLevel !== recommended && note.length === 0) {
    redirect(`/admin/placement/${attemptId}?error=note`);
  }

  await confirmPlacement({
    attemptId,
    confirmedLevel,
    note: note.length > 0 ? note : null,
    speakingCheckDone,
    recommendedBand: recommended,
    policyVersion: attempt.decision?.policyVersion ?? null,
    actor,
  });

  revalidatePath(`/admin/placement/${attemptId}`);
  revalidatePath('/admin/placement');
  revalidatePath('/admin');
}
