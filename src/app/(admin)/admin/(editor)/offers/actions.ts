'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { logActivity } from '@/lib/admin/activity';
import { todayInputValue } from '@/lib/dates';
import { requireModule } from '@/lib/admin/guard';
import { buildLetter } from '@/lib/admin/offers/document';
import {
  createOffer,
  decideOffer,
  findRecipients,
  deleteOffer,
  duplicateOffer,
  markSent,
  reviseOffer,
  saveOffer,
  saveStandardText,
  standardTexts,
} from '@/lib/admin/offers/repo';
import { parseOfferDraft } from '@/lib/admin/offers/schema';
import { ORGANISATION_KINDS } from '@/lib/admin/offers/types';

/**
 * The offers module's writes. Every one asks `requireModule('offers', …)`
 * first: an action is a public endpoint and never passes through the layout
 * that rendered its form (CLAUDE.md rule 7). Writing and sending is `edit`;
 * deleting is `full`.
 */

const uuid = z.string().uuid();
const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .pipe(uuid.nullable());

const NewOfferSchema = z.object({
  kind: z.enum(['group', 'individual']),
  language: z.enum(['de', 'en']),
  recipientName: z.string().max(200).default(''),
  organisationId: optionalUuid,
  organisationKind: z.enum(ORGANISATION_KINDS).optional().nullable(),
  enquiryId: optionalUuid,
  personId: optionalUuid,
});

export async function createOfferAction(formData: FormData) {
  const actor = await requireModule('offers', 'edit');
  const parsed = NewOfferSchema.safeParse({
    kind: formData.get('kind'),
    language: formData.get('language') ?? 'de',
    recipientName: formData.get('recipientName') ?? '',
    organisationId: formData.get('organisationId') ?? '',
    organisationKind: formData.get('organisationKind') || null,
    enquiryId: formData.get('enquiryId') ?? '',
    personId: formData.get('personId') ?? '',
  });
  if (!parsed.success) redirect('/admin/offers?error=The+offer+could+not+be+created');
  const id = await createOffer({ ...parsed.data, organisationKind: parsed.data.organisationKind ?? null }, actor);
  await logActivity({ actor, entity: 'offer', entityId: id, action: 'offer_created' });
  redirect(`/admin/offers/${id}`);
}

export type SaveOfferResult = { ok: true; revision: number } | { ok: false; error: string; stale?: boolean };

/**
 * The autosave: the whole draft, conditional on the revision it was edited
 * from. The server recomputes the lines with the same pure engine the page
 * uses, so what is stored is what was on screen.
 */
export async function saveOfferAction(id: string, baseRevision: number, draft: unknown): Promise<SaveOfferResult> {
  const actor = await requireModule('offers', 'edit');
  if (!uuid.safeParse(id).success || !Number.isInteger(baseRevision)) return { ok: false, error: 'Invalid request' };
  const parsed = parseOfferDraft(draft);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const result = await saveOffer(id, parsed.draft, baseRevision, actor);
  if (!result.ok) return result;
  return { ok: true, revision: result.revision };
}

function offerId(formData: FormData): string {
  const parsed = uuid.safeParse(formData.get('id'));
  if (!parsed.success) redirect('/admin/offers');
  return parsed.data;
}

export async function sendOfferAction(formData: FormData) {
  const actor = await requireModule('offers', 'edit');
  const id = offerId(formData);
  const texts = await standardTexts();
  const result = await markSent(id, actor, (draft, lines, totals, number, version, countryName, signatureName) =>
    buildLetter(draft, lines, totals, {
      number,
      version,
      date: todayInputValue(),
      countryName,
      signatureName,
      standard: texts[draft.language],
    })
  );
  if (!result.ok) redirect(`/admin/offers/${id}/letter?error=${encodeURIComponent(result.error)}`);
  await logActivity({ actor, entity: 'offer', entityId: id, action: 'offer_sent' });
  revalidatePath(`/admin/offers/${id}`);
  redirect(`/admin/offers/${id}?ok=sent`);
}

const DecisionSchema = z.object({
  decision: z.enum(['accepted', 'declined', 'withdrawn']),
  note: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export async function decideOfferAction(formData: FormData) {
  const actor = await requireModule('offers', 'edit');
  const id = offerId(formData);
  const parsed = DecisionSchema.safeParse({ decision: formData.get('decision'), note: formData.get('note') ?? undefined });
  if (!parsed.success) redirect(`/admin/offers/${id}`);
  const done = await decideOffer(id, parsed.data.decision, parsed.data.note, actor);
  if (done) await logActivity({ actor, entity: 'offer', entityId: id, action: `offer_${parsed.data.decision}` });
  revalidatePath(`/admin/offers/${id}`);
  redirect(`/admin/offers/${id}`);
}

export async function reviseOfferAction(formData: FormData) {
  const actor = await requireModule('offers', 'edit');
  const id = offerId(formData);
  if (await reviseOffer(id, actor)) await logActivity({ actor, entity: 'offer', entityId: id, action: 'offer_revised' });
  revalidatePath(`/admin/offers/${id}`);
  redirect(`/admin/offers/${id}`);
}

export async function duplicateOfferAction(formData: FormData) {
  const actor = await requireModule('offers', 'edit');
  const id = offerId(formData);
  const copy = await duplicateOffer(id, actor);
  if (!copy) redirect('/admin/offers');
  await logActivity({ actor, entity: 'offer', entityId: copy, action: 'offer_duplicated', detail: { from: id } });
  redirect(`/admin/offers/${copy}`);
}

export async function deleteOfferAction(formData: FormData) {
  const actor = await requireModule('offers', 'full');
  const id = offerId(formData);
  if (formData.get('confirmed') !== '1') redirect(`/admin/offers/${id}`);
  if (await deleteOffer(id, actor)) await logActivity({ actor, entity: 'offer', entityId: id, action: 'offer_deleted' });
  revalidatePath('/admin/offers');
  redirect('/admin/offers?ok=deleted');
}

const StandardTextSchema = z.object({
  language: z.enum(['de', 'en']),
  part: z.enum(['intro', 'closing']),
  body: z.string().trim().min(1).max(3000),
});

/**
 * "Save as standard": the opening or closing every offer in that language
 * uses from now on, unless it has its own. `full`, because it changes what
 * every colleague's next offer says. Sent offers keep what they said.
 */
export async function saveStandardTextAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireModule('offers', 'full');
  const parsed = StandardTextSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'The text could not be saved.' };
  await saveStandardText(parsed.data.language, parsed.data.part, parsed.data.body, actor);
  await logActivity({ actor, entity: 'offer_text', entityId: null, action: 'offer_standard_text_changed', detail: { language: parsed.data.language, part: parsed.data.part } });
  return { ok: true };
}

/** Who a new offer is for: earlier recipients, students, group enquiries. */
export async function findRecipientsAction(q: unknown) {
  await requireModule('offers', 'edit');
  return findRecipients(typeof q === 'string' ? q.slice(0, 80) : '');
}
