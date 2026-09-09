'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { WorkspaceModule } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { resolveFlag } from '@/lib/admin/flags';
import { addNote, type NoteEntity } from '@/lib/admin/notes';
import { linkPerson, unlinkPerson } from '@/lib/admin/people';
import { attachReviewToPerson, confirmPlacement, getPlacementAttempt } from '@/lib/admin/placement';
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
 * All of them start with `requireModule()`. A server action is a public HTTP
 * endpoint — the layout's auth gate does not protect it, because nothing about
 * a POST to an action goes through the layout that rendered the form. Treating
 * an action as "inside the app" is the single most common way an admin surface
 * ends up writable by anyone who can read the page source.
 *
 * They take `FormData` rather than typed arguments so the forms are plain
 * `<form action={...}>` and work without JavaScript, and every value that
 * arrives is re-validated here against the same allowlists the reads use.
 */

const QUEUE_ENTITIES = new Set<string>([
  'enquiry',
  'course_registration',
  'exam_registration',
  'career_application',
]);

const NOTE_ENTITIES = new Set<string>([...QUEUE_ENTITIES, 'placement_attempt']);

/** Which module owns a record type — the module the actor must hold. */
const MODULE_FOR: Record<string, WorkspaceModule> = {
  enquiry: 'enquiries',
  course_registration: 'registrations',
  exam_registration: 'registrations',
  career_application: 'applications',
  placement_attempt: 'placement',
};

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
  const entity = readQueueEntity(formData);
  const actor = await requireModule(MODULE_FOR[entity]);
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
  const entity = readQueueEntity(formData);
  const actor = await requireModule(MODULE_FOR[entity]);
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
  const id = readId(formData, 'entityId');
  const entity = String(formData.get('entity') ?? '');
  const body = String(formData.get('body') ?? '');

  if (!NOTE_ENTITIES.has(entity)) {
    throw new Error('Invalid entity');
  }

  const actor = await requireModule(MODULE_FOR[entity]);

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
  const actor = await requireModule('placement');
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

/**
 * `returnTo` is where the form lives. Only workspace paths are accepted, so a
 * crafted form cannot turn a staff action into an open redirect.
 */
function readReturnTo(formData: FormData, fallback: string): string {
  const value = String(formData.get('returnTo') ?? '');
  return /^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(value) ? value : fallback;
}

/**
 * A staff member says two person rows are one human.
 *
 * This is the only way two rows become one: never a script, never intake
 * (docs/FILEMAKER_LESSONS.md §1.2). `linkPerson` refuses a cycle and rewrites
 * no foreign key — reads follow `merged_into` — so it is reversible.
 */
export async function linkPersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people');
  const duplicateId = readId(formData, 'duplicateId');
  const survivorId = readId(formData, 'survivorId');
  const returnTo = readReturnTo(formData, '/admin/people');

  const result = await linkPerson({ duplicateId, survivorId, actor });
  revalidatePath('/admin', 'layout');
  redirect(result.ok ? returnTo : `${returnTo}?error=${encodeURIComponent(result.reason)}`);
}

export async function unlinkPersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people');
  const personId = readId(formData, 'personId');
  await unlinkPerson({ personId, actor });
  revalidatePath('/admin', 'layout');
  redirect(readReturnTo(formData, `/admin/people/${personId}`));
}

export async function resolveFlagAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people');
  const flagId = readId(formData, 'flagId');
  await resolveFlag(flagId, actor);
  revalidatePath('/admin', 'layout');
  redirect(readReturnTo(formData, '/admin'));
}

/**
 * Attaches a placement review to a person. The ATTEMPT stays anonymous — the
 * learner gave no name and 0005 keeps it that way. Naming the person is the
 * reviewer's decision, on the review, against their name.
 */
export async function attachReviewPersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('placement');
  const attemptId = readId(formData, 'attemptId');
  const raw = String(formData.get('personId') ?? '');
  const personId = raw === '' ? null : raw;
  if (personId !== null && !UUID.test(personId)) throw new Error('Invalid personId');

  await attachReviewToPerson({ attemptId, personId, actor });
  revalidatePath(`/admin/placement/${attemptId}`);
  revalidatePath('/admin/people', 'layout');
  redirect(`/admin/placement/${attemptId}`);
}
