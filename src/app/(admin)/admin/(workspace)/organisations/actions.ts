'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireModule } from '@/lib/admin/guard';
import { pick, type T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { CONTACT_SALUTATIONS, ORGANISATION_KINDS } from '@/lib/admin/organisation-labels';
import {
  createOrganisation,
  deleteOrganisation,
  removeCommission,
  removeContact,
  saveCommission,
  saveContact,
  setOrganisationActive,
  updateOrganisation,
} from '@/lib/admin/organisations';

/**
 * The organisations module's writes (2026-10-18). Every one asks `requireModule('organisations', …)`
 * first: an action is a public endpoint and never passes through the layout that rendered its form
 * (CLAUDE.md rule 7). Creating and changing — an organisation, a contact, a commission term, active or
 * not — is `edit`; deleting one of them is `full`, after the confirmation.
 */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const uuid = z.string().uuid();

/** A free text: trimmed, and nothing when empty. */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'long')
    .transform((v) => v || null);
const email = z
  .string()
  .trim()
  .max(200, 'email')
  .refine((v) => !v || EMAIL.test(v), 'email')
  .transform((v) => v || null);

const OrganisationSchema = z.object({
  name: z.string().trim().min(1, 'name').max(200, 'long'),
  kind: z.enum(ORGANISATION_KINDS),
  address: text(500),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => !v || /^[A-Z]{2}$/.test(v), 'country')
    .transform((v) => v || null),
  language: z.enum(['de', 'en']),
  email,
  phone: text(60),
  agreement: text(2000),
  note: text(2000),
});

const ContactSchema = z
  .object({
    salutation: z.enum(CONTACT_SALUTATIONS),
    firstName: text(80),
    lastName: text(80),
    email,
    phone: text(60),
    role: text(120),
  })
  .refine((c) => c.firstName || c.lastName || c.email, { message: 'contact', path: ['firstName'] });

const CommissionSchema = z.object({
  chargeTypeCode: z.string().trim().min(1, 'chargeType').max(60),
  percentage: z
    .string()
    .trim()
    .min(1, 'percentage')
    .transform((v) => Number(v.replace('%', '').replace(',', '.').trim()))
    .refine((n) => Number.isFinite(n) && n >= 0 && n <= 100, 'percentage')
    .transform((n) => Math.round(n * 100) / 100),
  note: text(300),
});

/** The named fields of a form, each as a string (a missing one as empty). */
const fields = (formData: FormData, names: readonly string[]) =>
  Object.fromEntries(names.map((name) => [name, typeof formData.get(name) === 'string' ? String(formData.get(name)) : '']));

/** The first problem of a form, in the colleague's words. */
function problem(error: z.ZodError, t: T): string {
  const code = error.issues[0]?.message;
  switch (code) {
    case 'name':
      return t('Ein Name ist nötig.', 'A name is required.');
    case 'email':
      return t('Diese E-Mail-Adresse sieht nicht richtig aus.', 'That email address does not look right.');
    case 'country':
      return t('Bitte wähle das Land aus der Liste.', 'Choose the country from the list.');
    case 'contact':
      return t('Ein Name oder eine E-Mail-Adresse ist nötig.', 'A name or an email address is required.');
    case 'chargeType':
      return t('Bitte wähle, worauf die Provision gilt.', 'Choose what the commission is on.');
    case 'percentage':
      return t('Die Provision ist ein Wert von 0 bis 100 %.', 'The commission is a value from 0 to 100 %.');
    case 'long':
      return t('Ein Eintrag ist zu lang.', 'An entry is too long.');
    default:
      return t('Bitte prüf die Angaben.', 'Please check the details.');
  }
}

const page = (id: string) => `/admin/organisations/${id}`;

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}

function done(path: string): never {
  revalidatePath('/admin', 'layout');
  redirect(path);
}

function organisationId(formData: FormData): string {
  const parsed = uuid.safeParse(formData.get('organisationId'));
  if (!parsed.success) redirect('/admin/organisations');
  return parsed.data;
}

const ORGANISATION_FIELDS = ['name', 'kind', 'address', 'countryCode', 'language', 'email', 'phone', 'agreement', 'note'] as const;

export async function createOrganisationAction(formData: FormData): Promise<void> {
  const actor = await requireModule('organisations', 'edit');
  const { t } = await getI18n();
  const parsed = OrganisationSchema.safeParse(fields(formData, ORGANISATION_FIELDS));
  if (!parsed.success) fail('/admin/organisations', problem(parsed.error, t));
  const id = await createOrganisation(parsed.data, actor);
  done(page(id));
}

export async function updateOrganisationAction(formData: FormData): Promise<void> {
  const actor = await requireModule('organisations', 'edit');
  const id = organisationId(formData);
  const { t, lang } = await getI18n();
  const parsed = OrganisationSchema.safeParse(fields(formData, ORGANISATION_FIELDS));
  if (!parsed.success) fail(page(id), problem(parsed.error, t));
  const result = await updateOrganisation(id, parsed.data, actor);
  if (!result.ok) fail('/admin/organisations', pick(lang, result.reason));
  done(page(id));
}

/** No longer worked with — or again. Nothing is deleted. */
export async function setOrganisationActiveAction(formData: FormData): Promise<void> {
  const actor = await requireModule('organisations', 'edit');
  const id = organisationId(formData);
  if (formData.get('confirmed') !== '1') redirect(page(id));
  const result = await setOrganisationActive(id, formData.get('active') === '1', actor);
  if (!result.ok) fail('/admin/organisations', pick((await getI18n()).lang, result.reason));
  done(page(id));
}

/** Gone, for an organisation entered by mistake, with the confirmation. */
export async function deleteOrganisationAction(formData: FormData): Promise<void> {
  const actor = await requireModule('organisations', 'full');
  const id = organisationId(formData);
  if (formData.get('confirmed') !== '1') redirect(page(id));
  const result = await deleteOrganisation(id, actor);
  if (!result.ok) fail(page(id), pick((await getI18n()).lang, result.reason));
  done('/admin/organisations');
}

// ------------------------------------------------------------------ contacts

export async function saveContactAction(formData: FormData): Promise<void> {
  const actor = await requireModule('organisations', 'edit');
  const id = organisationId(formData);
  const { t, lang } = await getI18n();
  const raw = formData.get('contactId');
  const contactId = raw ? uuid.safeParse(raw) : null;
  if (contactId && !contactId.success) redirect(page(id));
  const parsed = ContactSchema.safeParse(fields(formData, ['salutation', 'firstName', 'lastName', 'email', 'phone', 'role']));
  if (!parsed.success) fail(page(id), problem(parsed.error, t));
  const result = await saveContact(id, contactId?.data ?? null, parsed.data, actor);
  if (!result.ok) fail(page(id), pick(lang, result.reason));
  done(page(id));
}

export async function removeContactAction(formData: FormData): Promise<void> {
  const actor = await requireModule('organisations', 'full');
  const id = organisationId(formData);
  const contactId = uuid.safeParse(formData.get('contactId'));
  if (formData.get('confirmed') !== '1' || !contactId.success) redirect(page(id));
  await removeContact(id, contactId.data, actor);
  done(page(id));
}

// ---------------------------------------------------------------- commission

export async function saveCommissionAction(formData: FormData): Promise<void> {
  const actor = await requireModule('organisations', 'edit');
  const id = organisationId(formData);
  const { t, lang } = await getI18n();
  const raw = formData.get('termId');
  const termId = raw ? uuid.safeParse(raw) : null;
  if (termId && !termId.success) redirect(page(id));
  const parsed = CommissionSchema.safeParse(fields(formData, ['chargeTypeCode', 'percentage', 'note']));
  if (!parsed.success) fail(page(id), problem(parsed.error, t));
  const result = await saveCommission(id, termId?.data ?? null, parsed.data, actor);
  if (!result.ok) fail(page(id), pick(lang, result.reason));
  done(page(id));
}

export async function removeCommissionAction(formData: FormData): Promise<void> {
  const actor = await requireModule('organisations', 'full');
  const id = organisationId(formData);
  const termId = uuid.safeParse(formData.get('termId'));
  if (formData.get('confirmed') !== '1' || !termId.success) redirect(page(id));
  await removeCommission(id, termId.data, actor);
  done(page(id));
}
