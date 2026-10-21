'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { assignEnquiryOrganisation, deleteEnquiries, spamEnquiryIds } from '@/lib/admin/enquiries';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { isUuid } from '@/lib/admin/ids';
import { ORGANISATION_KINDS, type OrganisationKind } from '@/lib/admin/offers/types';

/**
 * What a colleague does with an enquiry from „Weiter mit …" (0076, 2026-10-21). Each starts with
 * `requireModule()`: a server action is a public endpoint (CLAUDE.md hard rule 7).
 */

const enquiryId = (formData: FormData) => {
  const id = String(formData.get('id') ?? '');
  if (!isUuid(id)) throw new Error('Invalid id');
  return id;
};

/** „Organisation zuordnen": an existing organisation, or a new one by name and kind. */
export async function assignOrganisationAction(formData: FormData): Promise<void> {
  const actor = await requireModule('enquiries', 'edit');
  const id = enquiryId(formData);
  const organisationId = String(formData.get('organisationId') ?? '');
  const name = String(formData.get('name') ?? '').trim().slice(0, 200);
  const kindRaw = String(formData.get('kind') ?? 'other');
  const kind = ((ORGANISATION_KINDS as readonly string[]).includes(kindRaw) ? kindRaw : 'other') as OrganisationKind;
  // Making an organisation is the organisations module's to allow.
  if (!isUuid(organisationId) && name) await requireModule('organisations', 'edit');

  const result = await assignEnquiryOrganisation({
    enquiryId: id,
    organisationId: isUuid(organisationId) ? organisationId : null,
    create: !isUuid(organisationId) && name ? { name, kind } : null,
    actor,
  });
  revalidatePath('/admin/enquiries', 'layout');
  if (!result.ok) {
    const { lang } = await getI18n();
    redirect(`/admin/enquiries/${id}?error=${encodeURIComponent(pick(lang, result.reason))}`);
  }
  redirect(`/admin/enquiries/${id}`);
}

/** „Löschen": only after the dialog, whose hidden `confirmed` field must be set. */
export async function deleteEnquiryAction(formData: FormData): Promise<void> {
  const actor = await requireModule('enquiries', 'full');
  const id = enquiryId(formData);
  if (formData.get('confirmed') !== '1') redirect(`/admin/enquiries/${id}`);
  await deleteEnquiries({ ids: [id], actor });
  revalidatePath('/admin', 'layout');
  redirect('/admin/enquiries');
}

/** „Spam löschen": every enquiry marked spam, after the confirmation. */
export async function deleteSpamAction(formData: FormData): Promise<void> {
  const actor = await requireModule('enquiries', 'full');
  if (formData.get('confirmed') !== '1') redirect('/admin/enquiries');
  await deleteEnquiries({ ids: await spamEnquiryIds(), actor });
  revalidatePath('/admin', 'layout');
  redirect('/admin/enquiries');
}
