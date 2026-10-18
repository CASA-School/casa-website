'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { logActivity } from '@/lib/admin/activity';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { findRecipients, matchRecipients, RecipientGoneError, wizardStart } from '@/lib/admin/offers/recipients';
import { createOffer, decideOffer, deleteOffer, duplicateOffer, markSent, reviseOffer, saveOffer, saveOfferText } from '@/lib/admin/offers/repo';
import { issueText, parseOfferDraft } from '@/lib/admin/offers/schema';
import { ORGANISATION_KINDS } from '@/lib/admin/offers/types';
import { NewOfferSchema } from '@/lib/admin/offers/wizard';

/**
 * The offers module's writes. Every one asks `requireModule('offers', …)`
 * first: an action is a public endpoint and never passes through the layout
 * that rendered its form (CLAUDE.md rule 7). Writing and sending is `edit`;
 * deleting is `full`.
 */

const uuid = z.string().uuid();
export type CreateOfferResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * The wizard's one write: the recipient found or created, the offer made and
 * filled (docs/OFFERS.md §New offer). The client opens the offer it returns.
 */
export async function createOfferAction(input: unknown): Promise<CreateOfferResult> {
  const actor = await requireModule('offers', 'edit');
  const { t, lang } = await getI18n();
  const failed = t('Das Angebot konnte nicht angelegt werden.', 'The offer could not be created.');
  const parsed = NewOfferSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    return { ok: false, error: message ? pick(lang, issueText(message)) : failed };
  }
  try {
    const id = await createOffer(parsed.data, actor);
    await logActivity({ actor, entity: 'offer', entityId: id, action: 'offer_created' });
    revalidatePath('/admin/offers');
    return { ok: true, id };
  } catch (error) {
    if (error instanceof RecipientGoneError) return { ok: false, error: pick(lang, error.text) };
    return { ok: false, error: error instanceof Error && error.message.endsWith('.') ? error.message : failed };
  }
}

export type SaveOfferResult = { ok: true; revision: number } | { ok: false; error: string; stale?: boolean };

/**
 * The autosave: the whole draft, conditional on the revision it was edited
 * from. The server recomputes the lines with the same pure engine the page
 * uses, so what is stored is what was on screen.
 */
export async function saveOfferAction(id: string, baseRevision: number, draft: unknown): Promise<SaveOfferResult> {
  const actor = await requireModule('offers', 'edit');
  const { t, lang } = await getI18n();
  if (!uuid.safeParse(id).success || !Number.isInteger(baseRevision)) return { ok: false, error: t('Ungültige Anfrage', 'Invalid request') };
  const parsed = parseOfferDraft(draft);
  if (!parsed.ok) return { ok: false, error: pick(lang, parsed.error) };
  const result = await saveOffer(id, parsed.draft, baseRevision, actor);
  if (!result.ok) return { ok: false, error: pick(lang, result.error), stale: result.stale };
  return { ok: true, revision: result.revision };
}

function offerId(formData: FormData): string {
  const parsed = uuid.safeParse(formData.get('id'));
  if (!parsed.success) redirect('/admin/offers');
  return parsed.data;
}

export async function sendOfferAction(formData: FormData) {
  const actor = await requireModule('offers', 'edit');
  const { lang } = await getI18n();
  const id = offerId(formData);
  const result = await markSent(id, actor);
  if (!result.ok) redirect(`/admin/offers/${id}/letter?error=${encodeURIComponent(pick(lang, result.error))}`);
  await logActivity({ actor, entity: 'offer', entityId: id, action: 'offer_sent' });
  revalidatePath(`/admin/offers/${id}`);
  redirect(`/admin/offers/${id}?ok=sent`);
}

const DecisionSchema = z.object({
  decision: z.enum(['accepted', 'declined', 'withdrawn', 'lapsed']),
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
  const { t } = await getI18n();
  const parsed = StandardTextSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t('Der Text konnte nicht gespeichert werden.', 'The text could not be saved.') };
  await saveOfferText(parsed.data.language, parsed.data.part, parsed.data.body, actor);
  await logActivity({ actor, entity: 'letter_text', entityId: null, action: 'letter_standard_text_changed', detail: { kind: 'offer', language: parsed.data.language, part: parsed.data.part } });
  return { ok: true };
}

const FILTERS = ['all', 'person', ...ORGANISATION_KINDS] as const;

/** The wizard's search: enquiries waiting, organisations and their contacts, learners. */
export async function findRecipientsAction(q: unknown, filter: unknown) {
  await requireModule('offers', 'edit');
  const { lang } = await getI18n();
  const f = z.enum(FILTERS).catch('all').parse(filter);
  return findRecipients(typeof q === 'string' ? q.slice(0, 80) : '', f, lang);
}

/**
 * A recipient picked in the wizard — an enquiry, an organisation, a learner —
 * with what the next steps can use: the contacts, the last offer, the brief.
 */
export async function pickRecipientAction(input: unknown) {
  await requireModule('offers', 'edit');
  const { lang } = await getI18n();
  const parsed = z
    .object({ enquiryId: uuid.optional(), personId: uuid.optional(), organisationId: uuid.optional() })
    .refine((v) => [v.enquiryId, v.personId, v.organisationId].filter(Boolean).length === 1)
    .safeParse(input);
  return parsed.success ? wizardStart(parsed.data, lang) : null;
}

/** Before a new recipient is made: who CASA already has that it may be. */
export async function matchRecipientsAction(input: unknown) {
  await requireModule('offers', 'edit');
  const { lang } = await getI18n();
  const parsed = z.object({ name: z.string().max(200), email: z.string().max(200) }).safeParse(input);
  return parsed.success ? matchRecipients(parsed.data, lang) : [];
}
