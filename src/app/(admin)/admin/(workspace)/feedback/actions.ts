'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { deleteFeedback, setFeedbackAnswer } from '@/lib/admin/feedback';
import { requireModule } from '@/lib/admin/guard';
import { isUuid } from '@/lib/admin/ids';

/**
 * What the holder of the Feedback module does with one (0112). Each starts with `requireModule()`: a
 * server action is a public endpoint (CLAUDE.md hard rule 7). The state and the owner go through the
 * inboxes' shared actions (`updateStatusAction`, `assignAction`).
 */

const feedbackId = (formData: FormData) => {
  const id = String(formData.get('id') ?? '');
  if (!isUuid(id)) throw new Error('Invalid id');
  return id;
};

/** „Antwort senden": what the sender reads under „Mein Feedback"; an empty answer takes it back. */
export async function answerFeedbackAction(formData: FormData): Promise<void> {
  const actor = await requireModule('feedback', 'edit');
  const id = feedbackId(formData);
  await setFeedbackAnswer(id, String(formData.get('answer') ?? ''), actor);
  revalidatePath(`/admin/feedback/${id}`);
  redirect(`/admin/feedback/${id}`);
}

/** „Löschen": only after the dialog, whose hidden `confirmed` field must be set. */
export async function deleteFeedbackAction(formData: FormData): Promise<void> {
  const actor = await requireModule('feedback', 'full');
  const id = feedbackId(formData);
  if (formData.get('confirmed') !== '1') redirect(`/admin/feedback/${id}`);
  await deleteFeedback(id, actor);
  revalidatePath('/admin', 'layout');
  redirect('/admin/feedback');
}
