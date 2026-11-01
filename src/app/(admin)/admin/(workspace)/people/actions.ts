'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isExamParts } from '@/lib/admin/exam-parts';
import { issueLearnerLetter } from '@/lib/admin/letters/booking-issue';
import { readChoices } from '@/lib/admin/letters/choices';
import { requireModule } from '@/lib/admin/guard';
import { countryCodeFromName } from '@/lib/admin/normalize';
import { canAccess } from '@/lib/admin/access';
import { PersonDetailsInput, type PersonDetailsResult } from '@/lib/admin/person-details-input';
import { savePersonDetails } from '@/lib/admin/person-details';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { readBankAccount, readEmail, readPerson, readPhone } from './person-input';
import { removeContact, saveEmail, savePhone } from '@/lib/admin/contacts';
import { staffIdForPerson } from '@/lib/admin/staff-members';
import {
  addBankAccount,
  createPersonByStaff,
  deletePerson,
  removeBankAccount,
  restorePerson,
  saveAddress,
  updateBankAccount,
  updatePerson,
  type AddressKind,
} from '@/lib/admin/people';

/**
 * People module mutations. Creating and editing need `edit`; deleting needs `full`. Bank accounts
 * have their own module, `private_data`, which the team holds: `edit` to add or correct one, `full`
 * to remove one.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const field = (formData: FormData, name: string, max: number) => String(formData.get(name) ?? '').trim().slice(0, max) || null;

const personIdFrom = (formData: FormData): string => {
  const id = String(formData.get('personId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid personId');
  return id;
};

/**
 * A person this module may change: not a colleague's. A person on the staff register (0039) is the
 * register's — their details, HR numbers and bank are changed on their staff page, under its rights.
 */
async function learnerId(formData: FormData): Promise<string> {
  const id = personIdFrom(formData);
  if (await staffIdForPerson(id)) {
    const { t } = await getI18n();
    redirect(
      `/admin/people?error=${encodeURIComponent(t('Diese Person gehört zu den Mitarbeitenden: ihre Daten stehen auf ihrer Personalseite.', 'This person is on the staff register: their details are on their staff page.'))}`
    );
  }
  return id;
}

/** An address on the contact card, new or labelled again; the one ticked becomes the main one. */
export async function saveEmailAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'edit');
  const id = await learnerId(formData);
  const back = `/admin/people/${id}?tab=details`;
  const { t, lang } = await getI18n();
  const input = readEmail(formData, t);
  if (typeof input === 'string') redirect(`${back}&error=${encodeURIComponent(input)}`);
  const result = await saveEmail(id, input.id, input, actor);
  if (!result.ok) redirect(`${back}&error=${encodeURIComponent(pick(lang, result.reason))}`);
  revalidatePath('/admin/people', 'layout');
  redirect(back);
}

/** A number on the contact card, new or labelled again. */
export async function savePhoneAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'edit');
  const id = await learnerId(formData);
  const back = `/admin/people/${id}?tab=details`;
  const { t, lang } = await getI18n();
  const input = readPhone(formData, t);
  if (typeof input === 'string') redirect(`${back}&error=${encodeURIComponent(input)}`);
  const result = await savePhone(id, input.id, input, actor);
  if (!result.ok) redirect(`${back}&error=${encodeURIComponent(pick(lang, result.reason))}`);
  revalidatePath('/admin/people', 'layout');
  redirect(back);
}

/** An address or a number removed, after the confirmation: `full`, as every removal. */
export async function removeContactAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'full');
  const id = await learnerId(formData);
  const back = `/admin/people/${id}?tab=details`;
  if (formData.get('confirmed') !== '1') redirect(back);
  const channel = formData.get('channel') === 'phone' ? 'phone' : 'email';
  const contactId = String(formData.get('contactId') ?? '');
  if (!UUID.test(contactId)) throw new Error('Invalid contactId');
  await removeContact(id, channel, contactId, actor);
  revalidatePath('/admin/people', 'layout');
  redirect(back);
}

/** A home or a Bremen address; emptied, it is removed. */
export async function saveAddressAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'edit');
  const id = await learnerId(formData);
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

/** A bank account — for a refund, a host's rent, a salary. */
export async function addBankAccountAction(formData: FormData): Promise<void> {
  const actor = await requireModule('private_data', 'edit');
  const id = await learnerId(formData);
  const input = await readBankAccount(formData);
  if (typeof input === 'string') redirect(`/admin/people/${id}?error=${encodeURIComponent(input)}`);
  await addBankAccount(id, input, actor);
  revalidatePath(`/admin/people/${id}`);
  redirect(`/admin/people/${id}`);
}

/** A correction to an account already there. */
export async function updateBankAccountAction(formData: FormData): Promise<void> {
  const actor = await requireModule('private_data', 'edit');
  const id = await learnerId(formData);
  const accountId = String(formData.get('accountId') ?? '');
  if (!UUID.test(accountId)) throw new Error('Invalid accountId');
  const input = await readBankAccount(formData);
  if (typeof input === 'string') redirect(`/admin/people/${id}?error=${encodeURIComponent(input)}`);
  await updateBankAccount(id, accountId, input, actor);
  revalidatePath(`/admin/people/${id}`);
  redirect(`/admin/people/${id}`);
}

/** Only after the confirmation dialog. */
export async function removeBankAccountAction(formData: FormData): Promise<void> {
  const actor = await requireModule('private_data', 'full');
  const id = await learnerId(formData);
  const accountId = String(formData.get('accountId') ?? '');
  if (!UUID.test(accountId)) throw new Error('Invalid accountId');
  if (formData.get('confirmed') !== '1') redirect(`/admin/people/${id}`);
  await removeBankAccount(id, accountId, actor);
  revalidatePath(`/admin/people/${id}`);
  redirect(`/admin/people/${id}`);
}

/** A deleted person back in the register: whoever may delete may undo it. Not destructive, so no confirmation. */
export async function restorePersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'full');
  const id = String(formData.get('personId') ?? '');
  if (!UUID.test(id)) throw new Error('Invalid personId');
  await restorePerson(id, actor);
  revalidatePath('/admin/people', 'layout');
  redirect(`/admin/people/${id}`);
}

export async function createPersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'edit');
  const { t } = await getI18n();
  const input = readPerson(formData, t);
  if (typeof input === 'string') redirect(`/admin/people?error=${encodeURIComponent(input)}`);
  const id = await createPersonByStaff(input, actor);
  revalidatePath('/admin/people', 'layout');
  // „Neu → Buchung" (a walk-in, or a new candidate from an exam sitting's or a course's „Buchen"):
  // straight on into the booking wizard, at the sitting — or at the course start, its level and the
  // Monday a learner joins a course under way from — when one came with it.
  if (formData.get('then') !== 'book') redirect(`/admin/people/${id}`);
  const sitting = String(formData.get('sitting') ?? '');
  const parts = String(formData.get('parts') ?? '');
  const cohort = String(formData.get('cohort') ?? '');
  const level = String(formData.get('level') ?? '').trim();
  const from = String(formData.get('from') ?? '');
  const at = new URLSearchParams({
    book: '1',
    ...(UUID.test(sitting) ? { sitting } : {}),
    ...(isExamParts(parts) && parts !== 'full' ? { parts } : {}),
    ...(UUID.test(cohort) ? { cohort } : {}),
    ...(UUID.test(cohort) && /^[A-C][12]\+?(\.[12])?$/i.test(level) ? { level } : {}),
    ...(UUID.test(cohort) && /^\d{4}-\d{2}-\d{2}$/.test(from) ? { from } : {}),
  });
  redirect(`/admin/people/${id}?${at.toString()}`);
}

export async function updatePersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'edit');
  const id = await learnerId(formData);
  const { t } = await getI18n();
  const input = readPerson(formData, t);
  if (typeof input === 'string') redirect(`/admin/people/${id}?error=${encodeURIComponent(input)}`);
  await updatePerson(id, input, actor);
  revalidatePath('/admin/people', 'layout');
  redirect(`/admin/people/${id}`);
}

/** The approved unified editor: no redirects on failure, so its draft stays open. */
export async function savePersonDetailsAction(payload: unknown): Promise<PersonDetailsResult> {
  const actor = await requireModule('people', 'edit');
  const { t } = await getI18n();
  const parsed = PersonDetailsInput.safeParse(payload);
  if (!parsed.success) return { ok: false, error: t('Bitte prüfe die Angaben und ergänze unvollständige Kontakte.', 'Please check the details and complete any unfinished contacts.') };
  const values = parsed.data;
  if ([values.person.birthCountry, values.addresses.local.country, values.addresses.home.country].some(value => value && !countryCodeFromName(value))) {
    return { ok: false, error: t('Bitte wähle ein Land aus der Vorschlagsliste.', 'Please choose a country from the suggestions.') };
  }
  const form = new FormData();
  form.set('personId', values.personId);
  const id = await learnerId(form);
  if ((values.emails.some(e => e.id && e.remove) || values.phones.some(p => p.id && p.remove)) && !canAccess(actor, 'people', 'full')) {
    return { ok: false, error: t('Du darfst Kontaktdaten ändern, aber nicht entfernen.', 'You may edit contact details, but cannot remove them.') };
  }
  for (const [key, value] of Object.entries(values.person)) form.set(key, value);
  form.set('withFacts', '1');
  const input = readPerson(form, t);
  if (typeof input === 'string') return { ok: false, error: input };
  try {
    const result = await savePersonDetails({ ...values, personId: id }, input, actor);
    if (result === 'changed') return { ok: false, error: t('Der Datensatz wurde inzwischen geändert. Deine Eingaben bleiben erhalten. Schließe den Editor und lade die Seite neu, bevor du sie überträgst.', 'This record has changed since you opened it. Your draft is preserved. Close the editor and reload the page before applying it.') };
    if (result === 'invalid') return { ok: false, error: t('Ein Kontakt wurde inzwischen geändert. Bitte lade den Datensatz neu.', 'A contact has changed. Please reload the record.') };
  } catch {
    return { ok: false, error: t('Speichern war nicht möglich. Es wurden keine Änderungen übernommen. Bitte versuche es erneut.', 'Unable to save. No changes were applied. Please try again.') };
  }
  revalidatePath('/admin/people', 'layout');
  return { ok: true };
}

/** Only after the confirmation dialog: the hidden `confirmed` field must be set. */
export async function deletePersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('people', 'full');
  const id = await learnerId(formData);
  if (formData.get('confirmed') !== '1') redirect(`/admin/people/${id}`);
  const result = await deletePerson(id, actor);
  revalidatePath('/admin/people', 'layout');
  if (!result.ok) {
    const { lang } = await getI18n();
    redirect(`/admin/people/${id}?error=${encodeURIComponent(pick(lang, result.reason))}`);
  }
  redirect('/admin/people');
}

/** One letter confirming several of a learner's bookings, built on the server and kept as sent (docs/LETTERS.md). */
export async function issueLearnerLetterAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const id = await learnerId(formData);
  const back = `/admin/people/${id}/letter`;
  const choices = readChoices(formData);
  const { t, lang } = await getI18n();
  if (!choices) redirect(`${back}?error=${encodeURIComponent(t('Der Brief konnte nicht gelesen werden.', 'The letter could not be read.'))}`);
  const result = await issueLearnerLetter(id, choices, actor);
  if (!result.ok) redirect(`${back}?error=${encodeURIComponent(pick(lang, result.reason))}`);
  revalidatePath('/admin', 'layout');
  redirect(`/admin/letters/mail?ids=${result.letterId}&saved=1`);
}
