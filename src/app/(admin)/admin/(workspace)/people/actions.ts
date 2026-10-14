'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { todayInputValue } from '@/lib/dates';
import { requireModule } from '@/lib/admin/guard';
import { pick, type T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import {
  createPersonByStaff,
  deletePerson,
  updatePerson,
  type PersonInput,
} from '@/lib/admin/people';

/** People module mutations. Creating and editing need `edit`; deleting needs `full`. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SALUTATIONS = new Set(['mr', 'ms', 'mx', 'neutral']);

function readPerson(formData: FormData, t: T): PersonInput | string {
  const text = (field: string, max: number) =>
    String(formData.get(field) ?? '')
      .trim()
      .slice(0, max);
  const firstName = text('firstName', 80);
  if (firstName.length < 1) return t('Ein Vorname ist nötig.', 'A first name is required.');
  const salutation = text('salutation', 10);
  if (salutation && !SALUTATIONS.has(salutation)) return t('Ungültige Anrede.', 'Invalid salutation.');
  const email = text('email', 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return t('Diese E-Mail-Adresse sieht nicht richtig aus.', 'That email address does not look right.');
  const birthDate = text('birthDate', 10);
  if (birthDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return t('Das Geburtsdatum muss ein Datum sein.', 'Date of birth must be a date.');
    // A date in the future is a typo, and a picker makes it easy to make.
    if (birthDate >= todayInputValue()) return t('Dieses Geburtsdatum liegt in der Zukunft.', 'That date of birth is in the future.');
    if (birthDate < '1900-01-01') return t('Dieses Geburtsdatum liegt zu weit zurück.', 'That date of birth is too long ago.');
  }
  return {
    salutation: salutation || null,
    firstName,
    lastName: text('lastName', 80) || null,
    birthDate: birthDate || null,
    nationality: text('nationality', 120) || null,
    email: email || null,
    phone: text('phone', 60) || null,
  };
}

export async function createPersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'edit');
  const { t } = await getI18n();
  const input = readPerson(formData, t);
  if (typeof input === 'string') redirect(`/admin/people?error=${encodeURIComponent(input)}`);
  const id = await createPersonByStaff(input, actor);
  revalidatePath('/admin/people', 'layout');
  redirect(`/admin/people/${id}`);
}

export async function updatePersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'edit');
  const id = String(formData.get('personId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid personId');
  const { t } = await getI18n();
  const input = readPerson(formData, t);
  if (typeof input === 'string') redirect(`/admin/people/${id}?error=${encodeURIComponent(input)}`);
  await updatePerson(id, input, actor);
  revalidatePath('/admin/people', 'layout');
  redirect(`/admin/people/${id}`);
}

/** Only after the confirmation dialog: the hidden `confirmed` field must be set. */
export async function deletePersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'full');
  const id = String(formData.get('personId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid personId');
  if (formData.get('confirmed') !== '1') redirect(`/admin/people/${id}`);
  const result = await deletePerson(id, actor);
  revalidatePath('/admin/people', 'layout');
  if (!result.ok) {
    const { lang } = await getI18n();
    redirect(`/admin/people/${id}?error=${encodeURIComponent(pick(lang, result.reason))}`);
  }
  redirect('/admin/people');
}
