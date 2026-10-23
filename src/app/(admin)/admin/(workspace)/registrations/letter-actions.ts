'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { issueRegistrationLetter } from '@/lib/admin/letters/booking-issue';
import { readChoices } from '@/lib/admin/letters/choices';
import { REGISTRATION_LETTER_KINDS, type RegistrationLetterKind } from '@/lib/admin/letters/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A website registration's letter — please send the test result, the down payment — sent: built on
 * the server from the registration and kept as it went out (docs/LETTERS.md). Registrations work:
 * `registrations` at `edit`.
 */
export async function issueRegistrationLetterAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const registrationId = String(formData.get('registrationId') ?? '');
  if (!UUID.test(registrationId)) throw new Error('Invalid registrationId');
  const kind = String(formData.get('kind') ?? '');
  if (!(REGISTRATION_LETTER_KINDS as readonly string[]).includes(kind)) throw new Error('Invalid kind');
  const back = `/admin/registrations/course/${registrationId}/letter?kind=${kind === 'registration_test_request' ? 'test' : kind === 'registration_later_course' ? 'later' : 'deposit'}`;
  const choices = readChoices(formData);
  const { t, lang } = await getI18n();
  if (!choices) redirect(`${back}&error=${encodeURIComponent(t('Der Brief konnte nicht gelesen werden.', 'The letter could not be read.'))}`);
  const result = await issueRegistrationLetter(registrationId, kind as RegistrationLetterKind, choices, actor);
  if (!result.ok) redirect(`${back}&error=${encodeURIComponent(pick(lang, result.reason))}`);
  revalidatePath('/admin', 'layout');
  redirect(`/admin/letters/mail?ids=${result.letterId}&saved=1`);
}
