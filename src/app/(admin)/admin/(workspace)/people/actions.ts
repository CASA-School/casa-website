'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { todayInputValue } from '@/lib/dates';
import { requireModule } from '@/lib/admin/guard';
import { pick, type T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import {
  addBankAccount,
  createPersonByStaff,
  deletePerson,
  normalizeIban,
  removeBankAccount,
  saveAddress,
  savePersonPrivate,
  updatePerson,
  type AddressKind,
  type PersonInput,
} from '@/lib/admin/people';

/**
 * People module mutations. Creating and editing need `edit`; deleting needs `full`. The protected
 * details — tax, pension and health-insurance numbers, bank accounts — need the module
 * `private_data` instead: `edit` to change them, `full` to remove a bank account.
 */

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
  // The rest of what SchoolMan knows about a learner comes with the edit form only.
  let facts: PersonInput['facts'];
  if (formData.get('withFacts') === '1') {
    const year = text('birthYear', 4);
    const birthYear = year ? Number(year) : null;
    if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear()))
      return t('Das Geburtsjahr sieht nicht richtig aus.', 'That year of birth does not look right.');
    facts = {
      secondLastName: text('secondLastName', 80) || null,
      nickname: text('nickname', 60) || null,
      birthYear,
      birthPlace: text('birthPlace', 120) || null,
      birthCountry: text('birthCountry', 120) || null,
      motherTongue: text('motherTongue', 80) || null,
      occupation: text('occupation', 120) || null,
      passportNumber: text('passportNumber', 40) || null,
    };
  }
  return {
    salutation: salutation || null,
    firstName,
    lastName: text('lastName', 80) || null,
    birthDate: birthDate || null,
    nationality: text('nationality', 120) || null,
    email: email || null,
    phone: text('phone', 60) || null,
    facts,
  };
}

const field = (formData: FormData, name: string, max: number) => String(formData.get(name) ?? '').trim().slice(0, max) || null;

const personIdFrom = (formData: FormData): string => {
  const id = String(formData.get('personId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid personId');
  return id;
};

/** A home or a Bremen address; emptied, it is removed. */
export async function saveAddressAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'edit');
  const id = personIdFrom(formData);
  const kind = String(formData.get('kind') ?? '');
  if (kind !== 'home' && kind !== 'local') throw new Error('Invalid address kind');
  await saveAddress(
    id,
    kind as AddressKind,
    {
      street: field(formData, 'street', 160),
      postcode: field(formData, 'postcode', 20),
      city: field(formData, 'city', 120),
      country: field(formData, 'country', 120),
    },
    actor
  );
  revalidatePath(`/admin/people/${id}`);
  redirect(`/admin/people/${id}`);
}

/** Tax, pension and health-insurance numbers: protected. */
export async function savePrivateAction(formData: FormData): Promise<void> {
  const actor = await requireModule('private_data', 'edit');
  const id = personIdFrom(formData);
  await savePersonPrivate(
    id,
    {
      taxId: field(formData, 'taxId', 40),
      pensionInsuranceNumber: field(formData, 'pensionInsuranceNumber', 40),
      healthInsuranceNumber: field(formData, 'healthInsuranceNumber', 40),
    },
    actor
  );
  revalidatePath(`/admin/people/${id}`);
  redirect(`/admin/people/${id}`);
}

/** A bank account — for a refund, a host's rent, a salary. Protected. */
export async function addBankAccountAction(formData: FormData): Promise<void> {
  const actor = await requireModule('private_data', 'edit');
  const id = personIdFrom(formData);
  const iban = normalizeIban(String(formData.get('iban') ?? ''));
  // Two letters, two check digits, then 11–30 letters and digits: the shape of every IBAN.
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
    const { t } = await getI18n();
    redirect(`/admin/people/${id}?error=${encodeURIComponent(t('Diese IBAN sieht nicht richtig aus.', 'That IBAN does not look right.'))}`);
  }
  await addBankAccount(
    id,
    {
      holder: field(formData, 'holder', 120),
      iban,
      bic: field(formData, 'bic', 11)?.toUpperCase() ?? null,
      bankName: field(formData, 'bankName', 120),
      note: field(formData, 'note', 200),
    },
    actor
  );
  revalidatePath(`/admin/people/${id}`);
  redirect(`/admin/people/${id}`);
}

/** Only after the confirmation dialog. */
export async function removeBankAccountAction(formData: FormData): Promise<void> {
  const actor = await requireModule('private_data', 'full');
  const id = personIdFrom(formData);
  const accountId = String(formData.get('accountId') ?? '');
  if (!UUID.test(accountId)) throw new Error('Invalid accountId');
  if (formData.get('confirmed') !== '1') redirect(`/admin/people/${id}`);
  await removeBankAccount(id, accountId, actor);
  revalidatePath(`/admin/people/${id}`);
  redirect(`/admin/people/${id}`);
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
