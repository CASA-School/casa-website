'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireModule } from '@/lib/admin/guard';
import { isUuid } from '@/lib/admin/ids';
import { settleUnconfirmedMail } from '@/lib/admin/mail-delivery';

/** „Geprüft" on a mail not confirmed as sent: a colleague followed it up by hand, without sending again. */
export async function settleMailAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const flagId = String(formData.get('flagId') ?? '');
  if (!isUuid(flagId)) throw new Error('Invalid flag id');
  await settleUnconfirmedMail(flagId, actor.id);
  revalidatePath('/admin/settings/system');
  redirect('/admin/settings/system');
}
