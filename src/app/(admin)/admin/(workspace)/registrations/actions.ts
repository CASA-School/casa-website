'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { isUuid } from '@/lib/admin/ids';
import { editCourseRegistration, type RegistrationEdit } from '@/lib/admin/registrations';

const SALUTATIONS = ['mr', 'ms', 'mx', 'neutral'] as const;
const text = (formData: FormData, key: string, max = 200) => String(formData.get(key) ?? '').trim().slice(0, max);

/**
 * „Daten bearbeiten" on a course registration (0076, 2026-10-21): a colleague completes or corrects
 * what was sent; the visitor's own values are kept beside it. A server action is a public endpoint, so
 * it asks for `registrations` at `edit` itself (CLAUDE.md hard rule 7).
 */
export async function editRegistrationAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const id = String(formData.get('id') ?? '');
  if (!isUuid(id)) throw new Error('Invalid id');
  const back = `/admin/registrations/course/${id}`;
  const { lang } = await getI18n();
  const salutation = text(formData, 'salutation');
  const birthDate = text(formData, 'birthDate', 10);
  const accommodationType = text(formData, 'accommodationType');
  const input: RegistrationEdit = {
    salutation: (SALUTATIONS as readonly string[]).includes(salutation) ? (salutation as RegistrationEdit['salutation']) : 'neutral',
    firstName: text(formData, 'firstName'),
    lastName: text(formData, 'lastName'),
    email: text(formData, 'email'),
    phone: text(formData, 'phone', 40),
    nationality: text(formData, 'nationality', 80),
    birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : null,
    visaRequired: formData.get('visaRequired') === 'on',
    accommodationRequired: formData.get('accommodationRequired') === 'on',
    accommodationType: accommodationType === 'flat' || accommodationType === 'host' ? accommodationType : null,
    allergies: text(formData, 'allergies', 500) || null,
    notes: text(formData, 'notes', 2000) || null,
  };
  if (!input.firstName || !input.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    redirect(`${back}?error=${encodeURIComponent(pick(lang, { de: 'Vorname, Nachname und eine gültige E-Mail-Adresse sind nötig.', en: 'First name, last name and a valid email address are needed.' }))}`);
  }
  const result = await editCourseRegistration(id, input, actor);
  revalidatePath('/admin/registrations', 'layout');
  redirect(result.ok ? back : `${back}?error=${encodeURIComponent(pick(lang, result.reason))}`);
}
